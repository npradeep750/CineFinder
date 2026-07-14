import os
from typing import List
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
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

# 🔑 SUPABASE CONFIGURATION
SUPABASE_URL = "https://kxqiovrdimaproigfeyc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cWlvdnJkaW1hcHJvaWdmZXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5OTgwNTMsImV4cCI6MjA5OTU3NDA1M30.CMu84XvMMjVLeN_mWtzFbDni-oZGNmrBDRCDJ7L-Clo"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS-D3fSi-o-CfO_aPIk9A-kjHfo_il-6Sl4T68RWyuYFcGMHQCDVQgkoXmdJrHtd2SKymOzYEaK3Elt/pub?gid=0&single=true&output=csv"

# --- HELPER DATABASE UTILITIES ---

def get_all_movies_from_db() -> tuple:
    """
    Fetches the complete movie library dynamically from Supabase 'movies',
    handling pagination to retrieve all 10k+ rows safely and fast.
    """
    try:
        all_data = []
        limit = 1000
        offset = 0
        
        # Loop to bypass Supabase's default 1,000-row API limit
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
                break  # Stop querying when we've grabbed the final page
            offset += limit

        master_movies = [row["title"] for row in all_data]
        movie_descriptions = {row["title"]: row["keywords"] for row in all_data}
        return master_movies, movie_descriptions
    except Exception as e:
        print(f"❌ Error fetching master list from Supabase: {e}")
        return [], {}

def sync_google_sheets_to_user_watches(master_movies: list):
    """
    Scans the Google Sheet and writes checked movies to Supabase 'user_watches'.
    Runs seamlessly in the background to ensure your cloud records are up to date.
    """
    if not master_movies:
        return
        
    print("🔄 Syncing Google Sheet checkmarks to Supabase 'user_watches' table...")
    try:
        df_csv = pd.read_csv(GOOGLE_SHEET_CSV_URL, encoding='utf-8')
        df_csv.columns = [col.strip() for col in df_csv.columns]
        movie_col_name = 'Movies' if 'Movies' in df_csv.columns else 'Movie'
        
        # Stop processing at "Shows"
        shows_indices = df_csv[df_csv[movie_col_name].astype(str).str.lower().str.strip() == "shows"].index.tolist()
        if shows_indices:
            df_csv = df_csv.iloc[:shows_indices[0]]
            
        # Get user columns
        user_cols = []
        for col in df_csv.columns:
            col_lower = col.lower()
            if (
                col in [movie_col_name] or 
                "total" in col_lower or 
                "watch" in col_lower or 
                "?" in col_lower or 
                "#" in col_lower or
                col.startswith('Unnamed:')
            ):
                continue
            user_cols.append(col)

        # Batch upsert watches to minimize API traffic
        watches_to_upsert = []
        
        for user in user_cols:
            username_key = user.strip().lower()
            series_str = df_csv[user].fillna(False).astype(str).str.strip().str.upper()
            watched_rows = df_csv[series_str.isin(["TRUE", "1", "1.0", "CHECKED", "✔"])]
            
            for sheet_title in watched_rows[movie_col_name].tolist():
                # Match title case with our master db movies
                matched_title = next((m for m in master_movies if sheet_title.strip().lower() == m.lower()), None)
                if matched_title:
                    watches_to_upsert.append({
                        "username": username_key,
                        "movie": matched_title
                    })

        if watches_to_upsert:
            # 🔑 Updated with on_conflict resolution!
            supabase.table("user_watches").upsert(
                watches_to_upsert, 
                on_conflict="username,movie"
            ).execute()
            print(f"✅ Successfully synchronized {len(watches_to_upsert)} watch records from Sheet to Supabase.")
            
    except Exception as e:
        print(f"⚠️ Google Sheet to Supabase user watches sync failed: {e}")

# --- FastAPIs Startup Event handler ---
@app.on_event("startup")
def on_startup():
    """Sync records directly when the server spins up."""
    master_movies, _ = get_all_movies_from_db()
    sync_google_sheets_to_user_watches(master_movies)

# --- REQUEST SCHEMAS ---

class WatchMovieRequest(BaseModel):
    username: str
    movie: str

class RecommendRequest(BaseModel):
    movies: List[str]

class UnwatchMovieRequest(BaseModel):
    username: str
    movie: str

# --- ENDPOINTS ---

@app.get("/api/movies")
def get_movies():
    master_movies, _ = get_all_movies_from_db()
    return {"movies": master_movies}

@app.get("/api/users")
def get_users():
    active_users = set()
    
    # 1. Pull user profiles from the Google Sheet
    try:
        df_csv = pd.read_csv(GOOGLE_SHEET_CSV_URL, encoding='utf-8')
        df_csv.columns = [col.strip() for col in df_csv.columns]
        movie_col_name = 'Movies' if 'Movies' in df_csv.columns else 'Movie'
        
        for col in df_csv.columns:
            col_lower = col.lower()
            if (
                col in [movie_col_name] or 
                "total" in col_lower or 
                "watch" in col_lower or 
                "?" in col_lower or 
                "#" in col_lower or
                col.startswith('Unnamed:')
            ):
                continue
            active_users.add(col.strip())
    except:
        pass

    # 2. Layer in any usernames registered inside your Supabase DB watches
    try:
        response = supabase.table("user_watches").select("username").execute()
        for row in (response.data or []):
            active_users.add(row["username"].capitalize())
    except:
        pass

    if not active_users:
        return {"users": ["Naithik", "Guest"]}

    return {"users": sorted(list(active_users))}

@app.post("/api/watch")
def watch_movie(body: WatchMovieRequest):
    username = body.username.strip().lower()
    movie_title = body.movie.strip()

    master_movies, _ = get_all_movies_from_db()
    matched_title = next((m for m in master_movies if m.lower() == movie_title.lower()), None)
    if not matched_title:
        raise HTTPException(status_code=404, detail=f"Movie '{movie_title}' not found in database.")

    try:
        supabase.table("user_watches").upsert({
            "username": username,
            "movie": matched_title
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase failed to log watch: {e}")
    
    return {"message": f"Successfully updated permanent watch status for '{matched_title}'"}

@app.post("/api/unwatch")
def unwatch_movie(body: UnwatchMovieRequest):
    username = body.username.strip().lower()
    movie_title = body.movie.strip()

    master_movies, _ = get_all_movies_from_db()
    matched_title = next((m for m in master_movies if m.lower() == movie_title.lower()), None)
    if not matched_title:
        raise HTTPException(status_code=404, detail=f"Movie '{movie_title}' not found in database.")

    try:
        supabase.table("user_watches").delete().eq("username", username).eq("movie", matched_title).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase failed to remove watch: {e}")
        
    return {"message": f"Successfully removed watch status for '{matched_title}'"}

@app.get("/api/user-history/{name}")
def get_user_history(name: str):
    username = name.strip().lower()
    master_movies, movie_descriptions = get_all_movies_from_db()
    
    if not master_movies:
        return {"name": name, "unwatched": [], "personalized_recommendations": []}

    # Trigger a soft sync dynamically on name sync requests
    sync_google_sheets_to_user_watches(master_movies)

    # Compile unwatched and watched based strictly on Supabase 'user_watches'
    watched_set = set()
    try:
        response = supabase.table("user_watches").select("movie").eq("username", username).execute()
        for row in (response.data or []):
            matched_title = next((m for m in master_movies if m.lower() == row["movie"].lower()), None)
            if matched_title:
                watched_set.add(matched_title)
    except Exception as e:
        print(f"⚠️ Supabase fetch watches failed: {e}")

    unwatched_list = [m for m in master_movies if m not in watched_set]
    personalized_recs = []

    if watched_set and unwatched_list:
        all_active_movies = list(watched_set) + unwatched_list
        descriptions = [movie_descriptions[m] for m in all_active_movies]

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

        for movie_name, score in scored_unwatched[:3]:
            personalized_recs.append({
                "movie": movie_name,
                "score": round(float(score), 4)
            })

    return {
        "name": name,
        "unwatched": unwatched_list,
        "personalized_recommendations": personalized_recs
    }

@app.post("/api/recommend")
def get_recommendations(body: RecommendRequest):
    input_titles = body.movies
    if not input_titles:
        raise HTTPException(status_code=400, detail="No movies provided for comparison.")

    master_movies, movie_descriptions = get_all_movies_from_db()
    if not master_movies:
         raise HTTPException(status_code=503, detail="Database empty or unavailable.")

    matched_titles = []
    for title in input_titles:
        matched = next((m for m in master_movies if m.lower() == title.strip().lower()), None)
        if matched:
            matched_titles.append(matched)

    if not matched_titles:
        raise HTTPException(status_code=404, detail="None of the requested titles were found in the database.")

    all_descriptions = [movie_descriptions[m] for m in master_movies]
    tfidf = TfidfVectorizer(stop_words='english')
    tfidf_matrix = tfidf.fit_transform(all_descriptions)
    
    matched_indices = [master_movies.index(m) for m in matched_titles]
    blended_input_vector = np.asarray(tfidf_matrix[matched_indices].mean(axis=0))
    sim_scores = cosine_similarity(blended_input_vector, tfidf_matrix)[0]
    
    scored = sorted(zip(master_movies, sim_scores), key=lambda x: x[1], reverse=True)
    filtered = [item for item in scored if item[0] not in matched_titles][:3]
    
    return {"recommendations": [{"movie": m, "score": float(s)} for m, s in filtered]}