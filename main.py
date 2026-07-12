import os
import json
from typing import List
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global master database tracking structures
master_movies = []       # Clean list of all unique titles in keywords-tmdb_database.txt
movie_descriptions = {}  # Map: Movie Title -> Keyword String
USER_PROFILES_FILE = "user_profiles.json"

GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS-D3fSi-o-CfO_aPIk9A-kjHfo_il-6Sl4T68RWyuYFcGMHQCDVQgkoXmdJrHtd2SKymOzYEaK3Elt/pub?gid=0&single=true&output=csv"

def load_master_tmdb_file():
    global master_movies, movie_descriptions
    tmdb_path = "keywords-tmdb_database.txt"
    
    if not os.path.exists(tmdb_path):
        raise FileNotFoundError(f"CRITICAL: Base file '{tmdb_path}' not found!")

    master_movies = []
    movie_descriptions = {}
    
    with open(tmdb_path, "r", encoding="utf-8") as f:
        current_movie = None
        for line in f:
            line = line.strip()
            if not line:
                continue
            if line.startswith("Movie:"):
                current_movie = line.replace("Movie:", "").strip()
            elif line.startswith("Keywords:"):
                keywords = line.replace("Keywords:", "").strip()
                if current_movie and current_movie not in movie_descriptions:
                    master_movies.append(current_movie)
                    movie_descriptions[current_movie] = keywords
                current_movie = None

def load_local_profiles() -> dict:
    if not os.path.exists(USER_PROFILES_FILE):
        return {}
    try:
        with open(USER_PROFILES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return {k: set(v) for k, v in data.items()}
    except Exception as e:
        print(f"⚠️ Error reading local profile file storage: {e}")
        return {}

def save_local_profiles(profiles: dict):
    try:
        serializable_data = {k: list(v) for k, v in profiles.items()}
        with open(USER_PROFILES_FILE, "w", encoding="utf-8") as f:
            json.dump(serializable_data, f, indent=4)
    except Exception as e:
        print(f"❌ Failed to save user history update to storage file: {e}")

def compile_current_user_profile(username: str) -> tuple:
    username_key = username.strip().lower()
    watched_set = set()

    try:
        df_csv = pd.read_csv(GOOGLE_SHEET_CSV_URL, encoding='utf-8')
        df_csv.columns = [col.strip() for col in df_csv.columns]
        movie_col_name = 'Movies' if 'Movies' in df_csv.columns else 'Movie'
        
        shows_indices = df_csv[df_csv[movie_col_name].astype(str).str.lower().str.strip() == "shows"].index.tolist()
        if shows_indices:
            df_csv = df_csv.iloc[:shows_indices[0]]
            
        matched_col = next((col for col in df_csv.columns if col.strip().lower() == username_key), None)
        
        if matched_col:
            series_str = df_csv[matched_col].fillna(False).astype(str).str.strip().str.upper()
            watched_rows = df_csv[series_str.isin(["TRUE", "1", "1.0", "CHECKED", "✔"])]
            
            for sheet_title in watched_rows[movie_col_name].tolist():
                for master_title in master_movies:
                    if sheet_title.strip().lower() == master_title.lower():
                        watched_set.add(master_title)
                        break
    except Exception as e:
        print(f"⚠️ Live Google Sheet fetch failed: {e}")

    local_profiles = load_local_profiles()
    if username_key in local_profiles:
        watched_set.update(local_profiles[username_key])

    unwatched_list = [m for m in master_movies if m not in watched_set]
    return watched_set, unwatched_list

load_master_tmdb_file()

class WatchMovieRequest(BaseModel):
    username: str
    movie: str

class RecommendRequest(BaseModel):
    movies: List[str]

class UnwatchMovieRequest(BaseModel):
    username: str
    movie: str

@app.get("/api/movies")
def get_movies():
    return {"movies": master_movies}

@app.get("/api/users")
def get_users():
    active_users = set()
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

    local_profiles = load_local_profiles()
    for user in local_profiles.keys():
        active_users.add(user.capitalize())

    if not active_users:
        return {"users": ["Naithik", "Guest"]}

    return {"users": sorted(list(active_users))}

@app.post("/api/watch")
def watch_movie(body: WatchMovieRequest):
    username = body.username.strip().lower()
    movie_title = body.movie.strip()

    matched_title = next((m for m in master_movies if m.lower() == movie_title.lower()), None)
    if not matched_title:
        raise HTTPException(status_code=404, detail=f"Movie '{movie_title}' not found in database.")

    profiles = load_local_profiles()
    if username not in profiles:
        profiles[username] = set()
        
    profiles[username].add(matched_title)
    save_local_profiles(profiles)
    
    return {"message": f"Successfully updated permanent watch status for '{matched_title}'"}

@app.post("/api/unwatch")
def unwatch_movie(body: UnwatchMovieRequest):
    """Removes a watched entry from local data and updates the persistent storage JSON file."""
    username = body.username.strip().lower()
    movie_title = body.movie.strip()

    # Match against master database titles case-insensitively
    matched_title = next((m for m in master_movies if m.lower() == movie_title.lower()), None)
    if not matched_title:
        raise HTTPException(status_code=404, detail=f"Movie '{movie_title}' not found in database.")

    profiles = load_local_profiles()
    if username in profiles and matched_title in profiles[username]:
        profiles[username].remove(matched_title)
        save_local_profiles(profiles)
        
    return {"message": f"Successfully removed watch status for '{matched_title}'"}

@app.get("/api/user-history/{name}")
def get_user_history(name: str):
    username = name.strip().lower()
    watched_set, unwatched_list = compile_current_user_profile(username)

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
        "unwatched": unwatched_list, # Passed cleanly to drive frontend search queries
        "personalized_recommendations": personalized_recs
    }

@app.post("/api/recommend")
def get_recommendations(body: RecommendRequest):
    """
    Takes a list of multiple specific movies, blends their keyword vectors, 
    and returns the top 3 overall closest movie recommendations.
    """
    input_titles = body.movies
    if not input_titles:
        raise HTTPException(status_code=400, detail="No movies provided for comparison.")

    # Match input titles against master database titles case-insensitively
    matched_titles = []
    for title in input_titles:
        matched = next((m for m in master_movies if m.lower() == title.strip().lower()), None)
        if matched:
            matched_titles.append(matched)

    if not matched_titles:
        raise HTTPException(status_code=404, detail="None of the requested titles were found in the database.")

    # Generate TF-IDF descriptions array
    all_descriptions = [movie_descriptions[m] for m in master_movies]
    tfidf = TfidfVectorizer(stop_words='english')
    tfidf_matrix = tfidf.fit_transform(all_descriptions)
    
    # Get the index positions of our matched input movies
    matched_indices = [master_movies.index(m) for m in matched_titles]
    
    # Average the vectors of the selected input movies together
    blended_input_vector = np.asarray(tfidf_matrix[matched_indices].mean(axis=0))
    
    # Compute similarity scores against the entire library matrix
    sim_scores = cosine_similarity(blended_input_vector, tfidf_matrix)[0]
    
    # Sort and filter out the movies that were part of the input selection
    scored = sorted(zip(master_movies, sim_scores), key=lambda x: x[1], reverse=True)
    filtered = [item for item in scored if item[0] not in matched_titles][:3]
    
    return {"recommendations": [{"movie": m, "score": float(s)} for m, s in filtered]}