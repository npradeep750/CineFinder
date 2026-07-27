import os
from typing import List, Dict
from contextlib import asynccontextmanager
import numpy as np
from fastapi import FastAPI, Depends, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from supabase import create_client

SUPABASE_URL = "https://kxqiovrdimaproigfeyc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cWlvdnJkaW1hcHJvaWdmZXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5OTgwNTMsImV4cCI6MjA5OTU3NDA1M30.CMu84XvMMjVLeN_mWtzFbDni-oZGNmrBDRCDJ7L-Clo"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 🚀 IN-MEMORY CATALOG CACHE
CATALOG_CACHE = {
    "master_movies": [],            # List of exact movie titles
    "movie_descriptions": {},       # Map: title -> keywords/description
    "movie_lower_map": {},          # Map: lower_case_title -> original_title
    "tfidf_vectorizer": None,       # Pre-fitted TfidfVectorizer
    "tfidf_matrix": None            # Pre-computed matrix
}

# 🚀 RATING WEIGHT MULTIPLIERS
RATING_WEIGHTS = {
    5.0: 8.0,    # Heavy positive push towards favorite themes
    4.5: 4.0,    # Strong positive boost
    4.0: 2.0,    # Moderate positive boost
    3.5: 1.2,    # Slight positive boost
    3.0: 0.8,    # Neutral baseline
    2.5: 0.0,    # Cutoff
    2.0: -0.5,   # Mild negative push away
    1.5: -1.0,   # Moderate negative penalty
    1.0: -2.0,   # Heavy negative penalty
    0.5: -4.0,   # Maximum negative penalty
}

def load_catalog_into_memory():
    """Pre-loads 10,000 movies into RAM once when FastAPI boots up."""
    print("🔄 Loading movie catalog from Supabase into RAM...")
    all_data = []
    limit = 1000
    offset = 0
    
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

    master_movies = [row["title"] for row in all_data if row.get("title")]
    movie_descriptions = {
        row["title"]: (row.get("keywords") or "") for row in all_data if row.get("title")
    }
    movie_lower_map = {title.lower(): title for title in master_movies}

    # Pre-compute TF-IDF Matrix across all movie descriptions
    print("⚡ Pre-building TF-IDF Matrix...")
    descriptions = [movie_descriptions.get(m, "") for m in master_movies]
    tfidf = TfidfVectorizer(stop_words='english')
    tfidf_matrix = tfidf.fit_transform(descriptions)

    CATALOG_CACHE["master_movies"] = master_movies
    CATALOG_CACHE["movie_descriptions"] = movie_descriptions
    CATALOG_CACHE["movie_lower_map"] = movie_lower_map
    CATALOG_CACHE["tfidf_vectorizer"] = tfidf
    CATALOG_CACHE["tfidf_matrix"] = tfidf_matrix
    print(f"✅ Loaded {len(master_movies)} movies into memory!")

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_catalog_into_memory()
    yield
    CATALOG_CACHE.clear()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_current_user_id(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Secure session token missing or malformed.")
    
    token = authorization.split(" ")[1]
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid session token.")
        return user_response.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")

def find_matched_title(raw_title: str) -> str:
    if not raw_title:
        return None
    return CATALOG_CACHE["movie_lower_map"].get(raw_title.strip().lower(), raw_title.strip())

class RatingRequest(BaseModel):
    movie: str
    rating: float

class WatchRequest(BaseModel):
    movie: str

class RecommendRequest(BaseModel):
    movies: List[str]

class SearchLogRequest(BaseModel):
    query: str

class SearchDeleteRequest(BaseModel):
    query: str

@app.get("/api/movies")
def get_movies():
    return {"movies": CATALOG_CACHE["master_movies"]}

@app.get("/api/recent-searches")
def get_recent_searches(user_id: str = Depends(get_current_user_id)):
    res = (
        supabase.table("user_searches")
        .select("query")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    raw_searches = [r["query"] for r in (res.data or []) if r.get("query")]
    
    seen = set()
    unique_searches = []
    for q in raw_searches:
        if q.lower() not in seen:
            seen.add(q.lower())
            unique_searches.append(q)
            if len(unique_searches) == 10:
                break
                
    return {"recent_searches": unique_searches}

@app.post("/api/recent-searches")
def add_recent_search(body: SearchLogRequest, user_id: str = Depends(get_current_user_id)):
    query = body.query.strip()
    if not query:
        return {"status": "ignored"}
    
    supabase.table("user_searches").insert({
        "user_id": user_id,
        "query": query
    }).execute()
    return {"status": "success"}

@app.delete("/api/recent-searches")
def delete_recent_search(body: SearchDeleteRequest, user_id: str = Depends(get_current_user_id)):
    query = body.query.strip()
    if not query:
        return {"status": "ignored"}
    
    try:
        supabase.table("user_searches").delete().eq("user_id", user_id).ilike("query", query).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete search: {str(e)}")

@app.get("/api/user-history")
def get_user_history(
    mode: str = Query("ratings", enum=["ratings", "watches"]),
    user_id: str = Depends(get_current_user_id)
):
    master_movies = CATALOG_CACHE["master_movies"]
    tfidf_matrix = CATALOG_CACHE["tfidf_matrix"]
    movie_lower_map = CATALOG_CACHE["movie_lower_map"]

    if not master_movies or tfidf_matrix is None:
        raise HTTPException(status_code=503, detail="Catalog memory cache unavailable.")

    # 1. Fetch User Profile
    profile_res = supabase.table("profiles").select("username").eq("id", user_id).execute()
    username = profile_res.data[0].get("username") if profile_res.data else "User"

    # 2. Fetch User Watches
    watches_res = supabase.table("user_watches").select("movie").eq("user_id", user_id).execute()
    raw_watched_titles = [r["movie"] for r in (watches_res.data or []) if r.get("movie")]
    
    watched_set = set()
    for t in raw_watched_titles:
        matched = movie_lower_map.get(t.lower())
        if matched:
            watched_set.add(matched)

    unwatched_list = [m for m in master_movies if m not in watched_set]

    # 3. Fetch User Ratings
    ratings_res = supabase.table("user_ratings").select("movie, rating").eq("user_id", user_id).execute()
    user_ratings = {}
    for r in (ratings_res.data or []):
        if r.get("movie"):
            matched = movie_lower_map.get(r["movie"].lower())
            if matched:
                user_ratings[matched] = float(r["rating"])

    # 🚀 MAP ALL WATCHLIST MOVIES TO RATINGS & SORT UNRATED (0.0) TO THE TOP
    temp_ratings = []
    for movie in watched_set:
        rating_score = user_ratings.get(movie, 0.0)
        temp_ratings.append((movie, rating_score))

    # Sort: unrated (0.0) first, then higher ratings descending
    sorted_ratings_tuples = sorted(
        temp_ratings, 
        key=lambda x: (0 if x[1] == 0.0 else 1, -x[1], x[0].lower())
    )
    ratings_display = {movie: score for movie, score in sorted_ratings_tuples}

    # 4. Generate Personalized Recommendations
    personalized_recommendations = []
    movie_to_idx = {title: i for i, title in enumerate(master_movies)}

    if mode == "ratings" and user_ratings:
        weighted_vectors = []
        for movie_title, rating_val in user_ratings.items():
            if movie_title in movie_to_idx and rating_val > 0:
                m_idx = movie_to_idx[movie_title]
                weight = RATING_WEIGHTS.get(rating_val, 1.0)
                movie_vec = tfidf_matrix[m_idx].toarray()[0]
                weighted_vectors.append(movie_vec * weight)
        
        if weighted_vectors:
            user_profile_vec = np.mean(weighted_vectors, axis=0).reshape(1, -1)
            unwatched_indices = [movie_to_idx[m] for m in unwatched_list if m in movie_to_idx]
            
            if unwatched_indices:
                unwatched_matrix = tfidf_matrix[unwatched_indices]
                sim_scores = cosine_similarity(user_profile_vec, unwatched_matrix)[0]
                scored = sorted(zip(unwatched_list, sim_scores), key=lambda x: x[1], reverse=True)
                personalized_recommendations = [{"movie": m, "score": float(s)} for m, s in scored[:100]]

    elif mode == "watches" and watched_set:
        watched_indices = [movie_to_idx[m] for m in watched_set if m in movie_to_idx]
        if watched_indices:
            watched_matrix = tfidf_matrix[watched_indices]
            user_profile_vec = np.asarray(watched_matrix.mean(axis=0))
            unwatched_indices = [movie_to_idx[m] for m in unwatched_list if m in movie_to_idx]
            
            if unwatched_indices:
                unwatched_matrix = tfidf_matrix[unwatched_indices]
                sim_scores = cosine_similarity(user_profile_vec, unwatched_matrix)[0]
                scored = sorted(zip(unwatched_list, sim_scores), key=lambda x: x[1], reverse=True)
                personalized_recommendations = [{"movie": m, "score": float(s)} for m, s in scored[:100]]

    return {
        "name": username,
        "unwatched": unwatched_list,
        "personalized_recommendations": personalized_recommendations,
        "ratings": ratings_display
    }

@app.post("/api/watch")
def mark_movie_as_watched(body: WatchRequest, user_id: str = Depends(get_current_user_id)):
    matched_title = find_matched_title(body.movie)
    profile_res = supabase.table("profiles").select("username").eq("id", user_id).execute()
    username = profile_res.data[0].get("username", "user") if profile_res.data else "user"

    try:
        supabase.table("user_watches").upsert(
            {"user_id": user_id, "username": username, "movie": matched_title},
            on_conflict="user_id, movie"
        ).execute()
        return {"message": f"Marked '{matched_title}' as watched.", "movie": matched_title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")

@app.post("/api/unwatch")
def mark_movie_as_unwatched(body: WatchRequest, user_id: str = Depends(get_current_user_id)):
    matched_title = find_matched_title(body.movie)

    try:
        # 1. Delete from watchlist
        supabase.table("user_watches").delete().eq("user_id", user_id).eq("movie", matched_title).execute()
        
        # 2. Auto-delete corresponding rating
        supabase.table("user_ratings").delete().eq("user_id", user_id).eq("movie", matched_title).execute()
        
        return {"message": f"Removed '{matched_title}' from watchlist and deleted rating.", "movie": matched_title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")

@app.post("/api/rate")
def rate_movie(body: RatingRequest, user_id: str = Depends(get_current_user_id)):
    matched_title = find_matched_title(body.movie)
    rating_value = body.rating

    if rating_value < 0 or rating_value > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 0.5 and 5.0 (or 0 to remove).")

    try:
        if rating_value == 0:
            supabase.table("user_ratings").delete().eq("user_id", user_id).eq("movie", matched_title).execute()
        else:
            supabase.table("user_ratings").upsert(
                {"user_id": user_id, "movie": matched_title, "rating": rating_value},
                on_conflict="user_id, movie"
            ).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database failed updating rating record: {str(e)}")

    return {"message": f"Rating saved for '{matched_title}'", "movie": matched_title, "rating": rating_value}

@app.post("/api/recommend")
def get_recommendations(body: RecommendRequest):
    input_titles = body.movies
    if not input_titles:
        raise HTTPException(status_code=400, detail="No titles selected.")

    master_movies = CATALOG_CACHE["master_movies"]
    tfidf_matrix = CATALOG_CACHE["tfidf_matrix"]
    movie_to_idx = {title: i for i, title in enumerate(master_movies)}

    matched_titles = [find_matched_title(t) for t in input_titles if find_matched_title(t)]
    if not matched_titles:
        raise HTTPException(status_code=404, detail="No matching titles found.")

    matched_indices = [movie_to_idx[m] for m in matched_titles if m in movie_to_idx]
    matched_matrix = tfidf_matrix[matched_indices]
    blended_input_vector = np.asarray(matched_matrix.mean(axis=0))
    sim_scores = cosine_similarity(blended_input_vector, tfidf_matrix)[0]
    
    scored = sorted(zip(master_movies, sim_scores), key=lambda x: x[1], reverse=True)
    results = [{"movie": m, "score": float(s)} for m, s in scored if m not in matched_titles][:20]
    
    return {"recommendations": results}