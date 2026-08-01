import os
from typing import List, Dict, Optional
from contextlib import asynccontextmanager
import numpy as np
import requests
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, Depends, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from supabase import create_client

SUPABASE_URL = "https://kxqiovrdimaproigfeyc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cWlvdnJkaW1hcHJvaWdmZXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5OTgwNTMsImV4cCI6MjA5OTU3NDA1M30.CMu84XvMMjVLeN_mWtzFbDni-oZGNmrBDRCDJ7L-Clo"

TMDB_API_KEY = "901696f09bee18449863e03f2da050e0"
TMDB_BASE_URL = "https://api.themoviedb.org/3"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 🚀 IN-MEMORY CATALOG & VECTOR CACHE
CATALOG_CACHE = {
    "movies_list": [],
    "id_to_movie": {},
    "id_to_idx": {},
    "tfidf_vectorizer": None,
    "tfidf_matrix": None
}

RATING_WEIGHTS = {
    5.0: 3.0, 4.5: 2.5, 4.0: 2.0, 3.5: 1.5, 3.0: 1.0,
    2.5: 0.2, 2.0: -0.5, 1.5: -1.0, 1.0: -2.0, 0.5: -3.0,
}

def fetch_movie_keywords(tmdb_id: int) -> str:
    """Fetches specific keywords from TMDB and joins them into a single string."""
    url = f"{TMDB_BASE_URL}/movie/{tmdb_id}/keywords?api_key={TMDB_API_KEY}"
    try:
        res = requests.get(url, timeout=3)
        if res.status_code == 200:
            # Get the 'name' from each keyword object.
            # Replace spaces so multi-word tags act as single TF-IDF tokens (e.g. "marvelcomic")
            keywords = [k["name"].replace(" ", "") for k in res.json().get("keywords", [])]
            return " ".join(keywords)
    except Exception:
        pass
    return ""

def load_catalog_and_build_vectors():
    print("🔄 Fetching popular movies from TMDB...")
    all_data = []
    
    # Fetch top ~200 movies
    for page in range(1, 11):
        try:
            res = requests.get(f"{TMDB_BASE_URL}/movie/popular?api_key={TMDB_API_KEY}&page={page}", timeout=5)
            if res.status_code == 200:
                for m in res.json().get("results", []):
                    all_data.append({
                        "tmdb_id": m["id"],
                        "title": m["title"],
                        "poster_path": m.get("poster_path") or ""
                    })
        except Exception:
            continue

    print("🚀 Fetching specific TMDB Keywords for all movies in parallel...")
    # Fetch keywords concurrently so startup is fast
    with ThreadPoolExecutor(max_workers=15) as executor:
        keyword_results = list(executor.map(fetch_movie_keywords, [m["tmdb_id"] for m in all_data]))

    movies_list = []
    id_to_movie = {}
    id_to_idx = {}
    feature_texts = []

    for idx, row in enumerate(all_data):
        tmdb_id = row["tmdb_id"]
        title = row["title"]
        poster_path = row["poster_path"]
        keywords_str = keyword_results[idx]

        # 🚀 THE NEW FORMULA: Title repeated 2x + Specific TMDB Keywords repeated 5x
        rich_feature_string = f"{(title.replace(' ', '') + ' ') * 2} {(keywords_str + ' ') * 5}"

        movie_obj = {
            "tmdb_id": tmdb_id,
            "title": title,
            "poster_path": poster_path
        }

        movies_list.append(movie_obj)
        id_to_movie[tmdb_id] = movie_obj
        id_to_idx[tmdb_id] = len(movies_list) - 1
        feature_texts.append(rich_feature_string)

    print("⚡ Building TF-IDF Matrix based on Keywords...")
    tfidf = TfidfVectorizer(stop_words='english', sublinear_tf=True)
    tfidf_matrix = tfidf.fit_transform(feature_texts)

    CATALOG_CACHE["movies_list"] = movies_list
    CATALOG_CACHE["id_to_movie"] = id_to_movie
    CATALOG_CACHE["id_to_idx"] = id_to_idx
    CATALOG_CACHE["tfidf_vectorizer"] = tfidf
    CATALOG_CACHE["tfidf_matrix"] = tfidf_matrix
    print(f"✅ Successfully indexed {len(movies_list)} movies using strict TMDB Keywords!")

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_catalog_and_build_vectors()
    yield
    CATALOG_CACHE.clear()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_current_user_id(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Session token missing.")
    
    token = authorization.split(" ")[1]
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid session token.")
        return user_response.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth error: {str(e)}")

class RatingRequest(BaseModel):
    tmdb_id: int
    rating: float
    title: Optional[str] = ""
    poster_path: Optional[str] = ""

class WatchRequest(BaseModel):
    tmdb_id: int
    title: Optional[str] = ""
    poster_path: Optional[str] = ""

class RecommendRequest(BaseModel):
    tmdb_ids: List[int]

class SearchLogRequest(BaseModel):
    query: str

class SearchDeleteRequest(BaseModel):
    query: str

@app.get("/api/search")
def search_tmdb_live(q: str = Query("", min_length=1)):
    url = f"{TMDB_BASE_URL}/search/movie?api_key={TMDB_API_KEY}&query={requests.utils.quote(q)}"
    try:
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            results = res.json().get("results", [])
            movies = [
                {
                    "tmdb_id": m["id"],
                    "title": m["title"],
                    "poster_path": m.get("poster_path") or ""
                }
                for m in results[:20]
            ]
            return {"movies": movies}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TMDB search error: {str(e)}")
    return {"movies": []}

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
    
    supabase.table("user_searches").insert({"user_id": user_id, "query": query}).execute()
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
def get_user_history(user_id: str = Depends(get_current_user_id)):
    profile_res = supabase.table("profiles").select("username").eq("id", user_id).execute()
    username = profile_res.data[0].get("username") if profile_res.data else "User"

    # 1. Fetch User Watches
    watches_res = supabase.table("user_watches").select("tmdb_id, movie, poster_path").eq("user_id", user_id).execute()
    watched_map = {}

    for r in (watches_res.data or []):
        t_id = r.get("tmdb_id")
        if t_id:
            watched_map[t_id] = {
                "tmdb_id": t_id,
                "title": r.get("movie") or f"Movie #{t_id}",
                "poster_path": r.get("poster_path") or ""
            }

    # 2. Fetch User Ratings
    ratings_res = supabase.table("user_ratings").select("tmdb_id, rating, movie, poster_path").eq("user_id", user_id).execute()
    user_ratings = {}
    
    for r in (ratings_res.data or []):
        t_id = r.get("tmdb_id")
        if t_id:
            user_ratings[t_id] = float(r["rating"])
            # If movie was rated but missing in watches map, add it dynamically
            if t_id not in watched_map:
                watched_map[t_id] = {
                    "tmdb_id": t_id,
                    "title": r.get("movie") or f"Movie #{t_id}",
                    "poster_path": r.get("poster_path") or ""
                }

    # 3. Build Watchlist Display Output
    ratings_display = []
    for t_id, m_info in watched_map.items():
        m_copy = dict(m_info)
        m_copy["rating"] = user_ratings.get(t_id, 0.0)
        ratings_display.append(m_copy)

    sorted_ratings = sorted(
        ratings_display,
        key=lambda x: (0 if x["rating"] == 0.0 else 1, -x["rating"], x["title"].lower())
    )

    # 🚀 4. KEYWORD COSINE SIMILARITY VECTOR CALCULATIONS
    personalized_recommendations = []
    movies_list = CATALOG_CACHE["movies_list"]
    tfidf_matrix = CATALOG_CACHE["tfidf_matrix"]
    id_to_idx = CATALOG_CACHE["id_to_idx"]

    if tfidf_matrix is not None and user_ratings:
        weighted_vectors = []
        for t_id, rating_val in user_ratings.items():
            if t_id in id_to_idx and rating_val > 0:
                m_idx = id_to_idx[t_id]
                weight = RATING_WEIGHTS.get(rating_val, 1.0)
                movie_vec = tfidf_matrix[m_idx].toarray()[0]
                weighted_vectors.append(movie_vec * weight)

        if weighted_vectors:
            user_profile_vec = np.mean(weighted_vectors, axis=0).reshape(1, -1)
            watched_ids = set(watched_map.keys())
            unwatched_movies = [m for m in movies_list if m["tmdb_id"] not in watched_ids]
            unwatched_indices = [id_to_idx[m["tmdb_id"]] for m in unwatched_movies if m["tmdb_id"] in id_to_idx]

            if unwatched_indices:
                unwatched_matrix = tfidf_matrix[unwatched_indices]
                sim_scores = cosine_similarity(user_profile_vec, unwatched_matrix)[0]
                scored = sorted(zip(unwatched_movies, sim_scores), key=lambda x: x[1], reverse=True)
                
                personalized_recommendations = [
                    {
                        "tmdb_id": m["tmdb_id"],
                        "title": m["title"],
                        "poster_path": m.get("poster_path") or "",
                        "score": round(float(s), 4)
                    }
                    for m, s in scored if s > 0.05
                ][:50]

    return {
        "name": username,
        "personalized_recommendations": personalized_recommendations,
        "ratings": sorted_ratings
    }

@app.post("/api/rate")
def rate_movie(body: RatingRequest, user_id: str = Depends(get_current_user_id)):
    try:
        if body.rating == 0:
            supabase.table("user_ratings").delete().eq("user_id", user_id).eq("tmdb_id", body.tmdb_id).execute()
        else:
            payload = {"user_id": user_id, "tmdb_id": body.tmdb_id, "rating": body.rating}
            if body.title:
                payload["movie"] = body.title
            if body.poster_path:
                payload["poster_path"] = body.poster_path

            # Save to user_ratings
            supabase.table("user_ratings").upsert(
                payload,
                on_conflict="user_id, tmdb_id"
            ).execute()

            # Ensure movie is also present in user_watches
            watch_payload = {"user_id": user_id, "tmdb_id": body.tmdb_id}
            if body.title:
                watch_payload["movie"] = body.title
            if body.poster_path:
                watch_payload["poster_path"] = body.poster_path

            supabase.table("user_watches").upsert(
                watch_payload,
                on_conflict="user_id, tmdb_id"
            ).execute()

        return {"message": "Rating saved.", "tmdb_id": body.tmdb_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rating failed: {str(e)}")

@app.post("/api/watch")
def mark_movie_as_watched(body: WatchRequest, user_id: str = Depends(get_current_user_id)):
    try:
        payload = {"user_id": user_id, "tmdb_id": body.tmdb_id}
        if body.title:
            payload["movie"] = body.title
        if body.poster_path:
            payload["poster_path"] = body.poster_path

        supabase.table("user_watches").upsert(
            payload,
            on_conflict="user_id, tmdb_id"
        ).execute()
        return {"message": "Marked as watched.", "tmdb_id": body.tmdb_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Watch insert failed: {str(e)}")

@app.post("/api/unwatch")
def mark_movie_as_unwatched(body: WatchRequest, user_id: str = Depends(get_current_user_id)):
    try:
        supabase.table("user_watches").delete().eq("user_id", user_id).eq("tmdb_id", body.tmdb_id).execute()
        supabase.table("user_ratings").delete().eq("user_id", user_id).eq("tmdb_id", body.tmdb_id).execute()
        return {"message": "Unwatched and rating deleted.", "tmdb_id": body.tmdb_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unwatch failed: {str(e)}")

@app.post("/api/recommend")
def get_hybrid_recommendations(body: RecommendRequest):
    if not body.tmdb_ids:
        raise HTTPException(status_code=400, detail="No movies selected.")

    movies_list = CATALOG_CACHE["movies_list"]
    tfidf_matrix = CATALOG_CACHE["tfidf_matrix"]
    id_to_idx = CATALOG_CACHE["id_to_idx"]

    matched_indices = [id_to_idx[t_id] for t_id in body.tmdb_ids if t_id in id_to_idx]
    if not matched_indices:
        raise HTTPException(status_code=404, detail="Selected movies not found in index.")

    # 📐 Compute Blended Vector and Cosine Similarity
    matched_matrix = tfidf_matrix[matched_indices]
    blended_vector = np.asarray(matched_matrix.mean(axis=0))
    sim_scores = cosine_similarity(blended_vector, tfidf_matrix)[0]

    scored = sorted(zip(movies_list, sim_scores), key=lambda x: x[1], reverse=True)
    results = [
        {
            "tmdb_id": m["tmdb_id"],
            "title": m["title"],
            "poster_path": m.get("poster_path") or "",
            "score": round(float(s), 4)
        }
        for m, s in scored if m["tmdb_id"] not in body.tmdb_ids
    ][:20]

    return {"recommendations": results}