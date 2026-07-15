import os
from typing import List
import numpy as np
import pandas as pd
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from supabase import create_client

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔑 SUPABASE PRODUCTION ENGINE CONFIGURATION
SUPABASE_URL = "https://kxqiovrdimaproigfeyc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cWlvdnJkaW1hcHJvaWdmZXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5OTgwNTMsImV4cCI6MjA5OTU3NDA1M30.CMu84XvMMjVLeN_mWtzFbDni-oZGNmrBDRCDJ7L-Clo"

# Base public client initialization
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- SECURE JWT TOKEN VERIFICATION DEPENDENCY ---
def get_current_user_id(authorization: str = Header(None)) -> str:
    """
    Intercepts frontend incoming request headers, passes the Bearer Token to Supabase 
    to verify authentication, and returns the unique secure user UID.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Secure session token missing or malformed.")
    
    token = authorization.split(" ")[1]
    try:
        # Ask Supabase directly if this specific access token is active and valid
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired access token session.")
        return user_response.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication gateway rejected session: {str(e)}")

# --- PAGINATED DATABASE FETCHER (OPTIMIZED FOR 10K+ ENTRIES) ---
def get_all_movies_from_db() -> tuple:
    """
    Fetches the complete movie library dynamically from Supabase 'movies',
    handling database pagination bounds to retrieve all 10k+ records safely.
    """
    try:
        all_data = []
        limit = 1000
        offset = 0
        
        # Paginated retrieval cursor loop
        while True:
            response = (
                supabase.table("movies")
                .select("title, keywords")
                .range(offset, offset + limit - 1)
                .execute()
            )
            batch = response.data or []
            all_data.extend(batch)
            
            if len(batch) < limit:
                break
            offset += limit

        master_movies = [row["title"] for row in all_data]
        movie_descriptions = {row["title"]: row["keywords"] for row in all_data}
        return master_movies, movie_descriptions
    except Exception as e:
        print(f"❌ Error fetching master lists from cloud tables: {e}")
        return [], {}

# --- SCHEMAS ---
class WatchMovieRequest(BaseModel):
    movie: str

class RecommendRequest(BaseModel):
    movies: List[str]

# --- PRIVATE SECURED API ENDPOINTS ---

@app.get("/api/movies")
def get_movies():
    """Returns the full master list of movie titles to the client."""
    master_movies, _ = get_all_movies_from_db()
    return {"movies": master_movies}

@app.post("/api/watch")
def watch_movie(body: WatchMovieRequest, user_id: str = Depends(get_current_user_id)):
    """Logs a private watch record, retaining original username capitalization."""
    movie_title = body.movie.strip()

    master_movies, _ = get_all_movies_from_db()
    matched_title = next((m for m in master_movies if m.lower() == movie_title.lower()), movie_title)

    # 🚀 RAW: Safely grab username without changing it to lowercase
    try:
        profile_res = supabase.table("profiles").select("username").eq("id", user_id).execute()
        if profile_res.data and len(profile_res.data) > 0:
            username = profile_res.data[0]["username"].strip()
        else:
            username = "user"
    except Exception:
        username = "user"

    try:
        # Upsert using the secure user_id
        supabase.table("user_watches").upsert({
            "user_id": user_id,
            "username": username, # Raw username
            "movie": matched_title
        }, on_conflict="user_id,movie").execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database failed logging watch record: {e}")
    
    return {"message": f"Successfully updated permanent watchlist state for '{matched_title}'"}

@app.post("/api/unwatch")
def unwatch_movie(body: WatchMovieRequest, user_id: str = Depends(get_current_user_id)):
    """Removes a private watch record belonging to the authenticated user."""
    movie_title = body.movie.strip()

    master_movies, _ = get_all_movies_from_db()
    matched_title = next((m for m in master_movies if m.lower() == movie_title.lower()), movie_title)

    try:
        # Delete strictly using the secure user_id mapping
        supabase.table("user_watches").delete().eq("user_id", user_id).eq("movie", matched_title).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database failed removing watch record: {e}")
        
    return {"message": f"Successfully removed watchlist log state for '{matched_title}'"}

@app.get("/api/user-history")
def get_user_history(user_id: str = Depends(get_current_user_id)):
    """Generates personalized ML recommendations utilizing the full 10k database catalog."""
    
    # 1. Resolve username string from profiles (preserving raw capitalization)
    profile_res = supabase.table("profiles").select("username").eq("id", user_id).single().execute()
    username = profile_res.data.get("username", "Profile User") if profile_res.data else "Profile User"

    # 🔑 CRITICAL: Fetch ALL 10,000+ movies from the master production table
    master_movies, movie_descriptions = get_all_movies_from_db()
    if not master_movies:
        return {"name": username, "unwatched": [], "personalized_recommendations": []}

    # 2. Extract watch states secured under the user's private UID
    watched_set = set()
    try:
        response = supabase.table("user_watches").select("movie").eq("user_id", user_id).execute()
        
        # Standardize matching to catch minor string format differences
        db_watched_titles = [row["movie"].strip().lower() for row in (response.data or [])]
        
        for m in master_movies:
            if m.strip().lower() in db_watched_titles:
                watched_set.add(m)
    except Exception as e:
        print(f"⚠️ Supabase user watch extraction failure: {e}")

    # 3. Build the unwatched list from the full 10k catalog
    # Anything not explicitly in the user's watch history is treated as unwatched!
    unwatched_list = [m for m in master_movies if m not in watched_set]
    
    # 4. Generate ML Content Similarity recommendation vectors
    personalized_recs = []
    if watched_set and unwatched_list:
        all_active_movies = list(watched_set) + unwatched_list
        descriptions = [movie_descriptions[m] for m in all_active_movies if m in movie_descriptions]

        if descriptions:
            tfidf = TfidfVectorizer(stop_words='english')
            tfidf_matrix = tfidf.fit_transform(descriptions)

            watched_count = len(watched_set)
            watched_vectors = tfidf_matrix[:watched_count]
            unwatched_vectors = tfidf_matrix[watched_count:]

            user_profile_vector = np.asarray(watched_vectors.mean(axis=0))
            similarity_scores = cosine_similarity(user_profile_vector, unwatched_vectors)[0]

            scored_unwatched = sorted(
                zip(unwatched_list, similarity_scores),
                key=lambda x: x[1],
                reverse=True
            )

            # Return top matching titles from the database
            for movie_name, score in scored_unwatched[:5]:
                personalized_recs.append({
                    "movie": movie_name,
                    "score": round(float(score), 4)
                })

    return {
        "name": username, # Raw username to frontend
        "unwatched": unwatched_list,
        "personalized_recommendations": personalized_recs
    }

@app.post("/api/recommend")
def get_recommendations(body: RecommendRequest):
    """Blends an arbitrary collection of movies to return similarities (Open non-authed utility)."""
    input_titles = body.movies
    if not input_titles:
        raise HTTPException(status_code=400, detail="No reference target titles selected.")

    master_movies, movie_descriptions = get_all_movies_from_db()
    if not master_movies:
         raise HTTPException(status_code=503, detail="Dynamic movie catalog cache unavailable.")

    matched_titles = []
    for title in input_titles:
        matched = next((m for m in master_movies if m.lower() == title.strip().lower()), None)
        if matched:
            matched_titles.append(matched)

    if not matched_titles:
        raise HTTPException(status_code=404, detail="None of the matched title entries live in systems registry.")

    all_descriptions = [movie_descriptions[m] for m in master_movies if m in movie_descriptions]
    tfidf = TfidfVectorizer(stop_words='english')
    tfidf_matrix = tfidf.fit_transform(all_descriptions)
    
    matched_indices = [master_movies.index(m) for m in matched_titles]
    blended_input_vector = np.asarray(tfidf_matrix[matched_indices].mean(axis=0))
    sim_scores = cosine_similarity(blended_input_vector, tfidf_matrix)[0]
    
    scored = sorted(zip(master_movies, sim_scores), key=lambda x: x[1], reverse=True)
    filtered = [item for item in scored if item[0] not in matched_titles][:3]
    
    return {"recommendations": [{"movie": m, "score": float(s)} for m, s in filtered]}