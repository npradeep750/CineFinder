import os
import json
import time
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
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cWlvdnJkaW1hcHJvaWdmZXljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzk5ODA1MywiZXhwIjoyMDk5NTc0MDUzfQ.RCopEBM1wxByqsh3GoJ6b-OQEk2eHeD0zA5T3vLNyfY"

TMDB_API_KEY = "901696f09bee18449863e03f2da050e0"
TMDB_BASE_URL = "https://api.themoviedb.org/3"

# Catalog + recommendation configuration
CATALOG_PAGES = 150         # ~3,000 movies; niche films like Paprika need ~110 pages
TMDB_FETCH_THREADS = 8
RECOMMENDATION_LIMIT = 100  # results returned per recommendation mode (frontend pages 20 at a time)
CATALOG_CACHE_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "catalog_cache.json"
)
CATALOG_CACHE_DAYS = 7      # rebuild the on-disk catalog when older than this

TMDB_GENRES = {
    28: "action", 12: "adventure", 16: "animation", 35: "comedy",
    80: "crime", 99: "documentary", 18: "drama", 10751: "family",
    14: "fantasy", 36: "history", 27: "horror", 10402: "music",
    9648: "mystery", 10749: "romance", 878: "scifi", 10770: "tvmovie",
    53: "thriller", 10752: "war", 37: "western",
}

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

CATALOG_CACHE = {
    "movies_list": [],
    "id_to_movie": {},
    "id_to_idx": {},
    "hybrid_vectorizer": None,
    "hybrid_matrix": None,
}

RATING_WEIGHTS = {
    5.0: 12.0, 4.5: 6.0, 4.0: 2.0, 3.5: 1.5, 3.0: 1.0,
    2.5: 0.5, 2.0: -1.0, 1.5: -2.0, 1.0: -4.0, 0.5: -8.0,
}

def fetch_movie_keywords(tmdb_id: int) -> str:
    """Fetches TMDB keywords for one movie and joins them into a single string."""
    url = f"{TMDB_BASE_URL}/movie/{tmdb_id}/keywords?api_key={TMDB_API_KEY}"
    for attempt in range(3):
        try:
            res = requests.get(url, timeout=3)
            if res.status_code == 200:
                keywords = [k["name"].replace(" ", "") for k in res.json().get("keywords", [])]
                return " ".join(keywords)
            if res.status_code == 429:  # rate limited -> back off and retry
                time.sleep(1.5 * (attempt + 1))
                continue
            return ""
        except Exception:
            time.sleep(0.3 * (attempt + 1))
    return ""


def fetch_discover_page(page: int) -> List[dict]:
    """Fetch one page of TMDB's discover endpoint (popularity-sorted)."""
    url = (
        f"{TMDB_BASE_URL}/discover/movie"
        f"?api_key={TMDB_API_KEY}"
        f"&sort_by=popularity.desc"
        f"&include_adult=false"
        f"&language=en-US"
        f"&vote_count.gte=50"
        f"&page={page}"
    )
    for attempt in range(3):
        try:
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                return res.json().get("results", [])
            if res.status_code == 429:  # rate limited -> back off and retry
                time.sleep(1.5 * (attempt + 1))
                continue
            return []
        except Exception:
            time.sleep(0.3 * (attempt + 1))
    return []


def rating_token(vote_average) -> str:
    """Bucket a 0-10 TMDB rating into a comparable token (r0..r9)."""
    try:
        v = float(vote_average)
        if v <= 0:
            return ""
        return f"r{min(9, max(0, int(round(v))))}"
    except (TypeError, ValueError):
        return ""


def popularity_token(popularity) -> str:
    """Bucket TMDB popularity into a comparable token (pop0..pop5)."""
    try:
        p = float(popularity)
        if p >= 1000: return "pop5"
        if p >= 300: return "pop4"
        if p >= 100: return "pop3"
        if p >= 30: return "pop2"
        if p >= 10: return "pop1"
        return "pop0"
    except (TypeError, ValueError):
        return ""


def build_hybrid_feature(
    keywords: str, genres: str, rating_tok: str, popularity_tok: str
) -> str:
    parts: List[str] = []
    if keywords:
        parts.append((keywords + " ") * 3)
    if genres:
        parts.append((genres + " ") * 2)
    if rating_tok:
        parts.append(rating_tok)
    if popularity_tok:
        parts.append(popularity_tok)
    return " ".join(parts)


def get_username(user_id: str) -> str:
    """Resolve a user's display name from the profiles table."""
    try:
        profile_res = supabase.table("profiles").select("username").eq("id", user_id).execute()
        if profile_res.data and profile_res.data[0].get("username"):
            return profile_res.data[0]["username"]
    except Exception:
        pass
    return "User"


def resolve_movie_metadata(tmdb_id: int, title: str = "", poster_path: str = "") -> tuple:
    """Ensure a non-empty title + poster for a movie, falling back to the catalog or TMDB."""
    if not title or not poster_path:
        info = CATALOG_CACHE.get("id_to_movie", {}).get(tmdb_id)
        if info:
            title = title or info.get("title") or ""
            poster_path = poster_path or info.get("poster_path") or ""
    if not title or not poster_path:
        try:
            res = requests.get(
                f"{TMDB_BASE_URL}/movie/{tmdb_id}?api_key={TMDB_API_KEY}",
                timeout=3,
            )
            if res.status_code == 200:
                d = res.json()
                title = title or d.get("title") or ""
                poster_path = poster_path or d.get("poster_path") or ""
        except Exception:
            pass
    return title or f"Movie #{tmdb_id}", poster_path


def _fetch_catalog_rows() -> List[dict]:
    print(f"🔄 Fetching up to {CATALOG_PAGES * 20:,} movies from TMDB discover...")
    pages = list(range(1, CATALOG_PAGES + 1))
    with ThreadPoolExecutor(max_workers=TMDB_FETCH_THREADS) as executor:
        page_results = list(executor.map(fetch_discover_page, pages))

    seen_ids: set = set()
    seen_titles: set = set()
    rows: List[dict] = []

    for results in page_results:
        for m in results:
            tmdb_id = m.get("id")
            title = (m.get("title") or "").strip()
            if not tmdb_id or not title or tmdb_id in seen_ids:
                continue
            seen_ids.add(tmdb_id)
            if title.lower() in seen_titles:
                continue
            seen_titles.add(title.lower())

            genres = " ".join(
                TMDB_GENRES.get(gid, "") for gid in m.get("genre_ids", [])
            )
            rows.append({
                "tmdb_id": tmdb_id,
                "title": title,
                "poster_path": m.get("poster_path") or "",
                "genres": genres,
                "vote_average": m.get("vote_average") or 0,
                "popularity": m.get("popularity") or 0,
            })

    print(f"🚀 Fetching TMDB keywords for {len(rows)} movies...")
    with ThreadPoolExecutor(max_workers=TMDB_FETCH_THREADS) as executor:
        keyword_results = list(
            executor.map(fetch_movie_keywords, [r["tmdb_id"] for r in rows])
        )
    for row, kw in zip(rows, keyword_results):
        row["keywords"] = kw

    return rows


def _save_catalog_rows(rows: List[dict]) -> None:
    try:
        with open(CATALOG_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(rows, f)
        print(f"💾 Cached {len(rows):,} movies to disk.")
    except OSError as e:
        print(f"⚠️ Could not cache catalog: {e}")


def load_catalog_and_build_vectors():
    force_rebuild = os.environ.get("FORCE_REBUILD_CATALOG") == "1"
    rows = None

    if not force_rebuild and os.path.exists(CATALOG_CACHE_FILE):
        age_seconds = time.time() - os.path.getmtime(CATALOG_CACHE_FILE)
        if age_seconds < CATALOG_CACHE_DAYS * 86400:
            try:
                with open(CATALOG_CACHE_FILE, "r", encoding="utf-8") as f:
                    rows = json.load(f)
                print(f"📦 Loaded {len(rows):,} movies from catalog cache.")
            except (OSError, json.JSONDecodeError):
                rows = None

    if rows is None:
        rows = _fetch_catalog_rows()
        _save_catalog_rows(rows)

    movies_list = []
    id_to_movie = {}
    id_to_idx = {}
    hybrid_texts = []

    for row in rows:
        movie_obj = {
            "tmdb_id": row["tmdb_id"],
            "title": row["title"],
            "poster_path": row["poster_path"],
        }
        movies_list.append(movie_obj)
        id_to_movie[row["tmdb_id"]] = movie_obj
        id_to_idx[row["tmdb_id"]] = len(movies_list) - 1

        hybrid_texts.append(
            build_hybrid_feature(
                row["keywords"],
                row["genres"],
                rating_token(row["vote_average"]),
                popularity_token(row["popularity"]),
            )
        )

    print("⚡ Building hybrid TF-IDF matrix...")
    hybrid_vectorizer = TfidfVectorizer(stop_words="english", sublinear_tf=True)
    hybrid_matrix = hybrid_vectorizer.fit_transform(hybrid_texts)

    CATALOG_CACHE["movies_list"] = movies_list
    CATALOG_CACHE["id_to_movie"] = id_to_movie
    CATALOG_CACHE["id_to_idx"] = id_to_idx
    CATALOG_CACHE["hybrid_vectorizer"] = hybrid_vectorizer
    CATALOG_CACHE["hybrid_matrix"] = hybrid_matrix
    print(f"✅ Indexed {len(movies_list):,} movies for hybrid recommendations.")

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

def get_current_user(authorization: str = Header(None)):
    """Resolve the full Supabase auth user from the bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Session token missing.")

    token = authorization.split(" ")[1]
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid session token.")
        return user_response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth error: {str(e)}")


def get_current_user_id(authorization: str = Header(None)) -> str:
    return get_current_user(authorization).id


def ensure_profile(user) -> str:
    """Return the user's display name, creating a profile row if missing (e.g. OAuth sign-ins)."""
    user_id = user.id
    try:
        profile_res = supabase.table("profiles").select("username").eq("id", user_id).execute()
        if profile_res.data and profile_res.data[0].get("username"):
            return profile_res.data[0]["username"]
    except Exception:
        pass

    # No profile row yet (Google / OAuth user) — derive a username from metadata or email.
    meta = getattr(user, "user_metadata", None) or {}
    email = getattr(user, "email", "") or ""
    fallback = (
        meta.get("full_name")
        or meta.get("name")
        or meta.get("user_name")
        or (email.split("@")[0] if email else "")
        or "Movie Fan"
    )
    try:
        supabase.table("profiles").upsert(
            {"id": user_id, "username": fallback}, on_conflict="id"
        ).execute()
    except Exception:
        pass
    return fallback

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
        if q not in seen:
            seen.add(q)
            unique_searches.append(q)
            if len(unique_searches) == 10:
                break
    return {"recent_searches": unique_searches}

@app.post("/api/recent-searches")
def add_recent_search(body: SearchLogRequest, user_id: str = Depends(get_current_user_id)):
    try:
        supabase.table("user_searches").insert({"user_id": user_id, "query": body.query}).execute()
        return {"message": "Logged"}
    except Exception:
        return {"message": "Failed to log"}

@app.delete("/api/recent-searches")
def delete_recent_search(body: SearchDeleteRequest, user_id: str = Depends(get_current_user_id)):
    try:
        supabase.table("user_searches").delete().eq("user_id", user_id).eq("query", body.query).execute()
        return {"message": "Deleted"}
    except Exception:
        return {"message": "Failed to delete"}

@app.get("/api/user-history")
def get_user_history(user=Depends(get_current_user)):
    user_id = user.id
    username = ensure_profile(user)

    # Select created_at timestamptz from user_watches to support sorting by recently added
    watches_res = supabase.table("user_watches").select("tmdb_id, movie, poster_path, created_at").eq("user_id", user_id).execute()
    watched_map = {}

    for r in (watches_res.data or []):
        t_id = r.get("tmdb_id")
        if t_id:
            watched_map[t_id] = {
                "tmdb_id": t_id,
                "title": r.get("movie") or f"Movie #{t_id}",
                "poster_path": r.get("poster_path") or "",
                "created_at": r.get("created_at")
            }

    ratings_res = supabase.table("user_ratings").select("tmdb_id, rating, movie, poster_path").eq("user_id", user_id).execute()
    user_ratings = {}
    
    for r in (ratings_res.data or []):
        t_id = r.get("tmdb_id")
        if t_id:
            user_ratings[t_id] = float(r["rating"])
            if t_id not in watched_map:
                watched_map[t_id] = {
                    "tmdb_id": t_id,
                    "title": r.get("movie") or f"Movie #{t_id}",
                    "poster_path": r.get("poster_path") or "",
                    "created_at": None
                }

    ratings_display = []
    for t_id, m_info in watched_map.items():
        m_copy = dict(m_info)
        m_copy["rating"] = user_ratings.get(t_id, 0.0)
        ratings_display.append(m_copy)

    sorted_ratings = sorted(
        ratings_display,
        key=lambda x: (0 if x["rating"] == 0.0 else 1, -x["rating"], x["title"].lower())
    )

    personalized_recommendations = []
    movies_list = CATALOG_CACHE["movies_list"]
    tfidf_matrix = CATALOG_CACHE["hybrid_matrix"]
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

            watched_titles = {
                m_info["title"].strip().lower() 
                for m_info in watched_map.values() 
                if m_info.get("title")
            }

            unwatched_movies = [
                m for m in movies_list 
                if m["tmdb_id"] not in watched_ids and m["title"].strip().lower() not in watched_titles
            ]
            unwatched_indices = [id_to_idx[m["tmdb_id"]] for m in unwatched_movies if m["tmdb_id"] in id_to_idx]

            if unwatched_indices:
                unwatched_matrix = tfidf_matrix[unwatched_indices]
                sim_scores = cosine_similarity(user_profile_vec, unwatched_matrix)[0]
                scored = sorted(zip(unwatched_movies, sim_scores), key=lambda x: x[1], reverse=True)
                
                seen_rec_titles = set(watched_titles)
                
                for m, s in scored:
                    title_clean = m["title"].strip().lower()
                    if s > 0.05 and title_clean not in seen_rec_titles:
                        seen_rec_titles.add(title_clean)
                        personalized_recommendations.append({
                            "tmdb_id": m["tmdb_id"],
                            "title": m["title"],
                            "poster_path": m.get("poster_path") or "",
                            "score": round(float(s), 4)
                        })
                        if len(personalized_recommendations) == 50:
                            break

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
            title, poster_path = resolve_movie_metadata(
                body.tmdb_id, body.title or "", body.poster_path or ""
            )

            payload = {
                "user_id": user_id,
                "tmdb_id": body.tmdb_id,
                "rating": body.rating,
                "movie": title,
            }
            if poster_path:
                payload["poster_path"] = poster_path

            existing_rating = supabase.table("user_ratings").select("id").eq("user_id", user_id).eq("tmdb_id", body.tmdb_id).execute()
            if existing_rating.data:
                supabase.table("user_ratings").update(payload).eq("user_id", user_id).eq("tmdb_id", body.tmdb_id).execute()
            else:
                supabase.table("user_ratings").insert(payload).execute()

            watch_payload = {
                "user_id": user_id,
                "tmdb_id": body.tmdb_id,
                "movie": title,
                "username": get_username(user_id),
            }
            if poster_path:
                watch_payload["poster_path"] = poster_path

            existing_watch = supabase.table("user_watches").select("id").eq("user_id", user_id).eq("tmdb_id", body.tmdb_id).execute()
            if existing_watch.data:
                supabase.table("user_watches").update(watch_payload).eq("user_id", user_id).eq("tmdb_id", body.tmdb_id).execute()
            else:
                supabase.table("user_watches").insert(watch_payload).execute()

        return {"message": "Rating saved.", "tmdb_id": body.tmdb_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rating failed: {str(e)}")

@app.post("/api/watch")
def mark_movie_as_watched(body: WatchRequest, user_id: str = Depends(get_current_user_id)):
    try:
        title, poster_path = resolve_movie_metadata(
            body.tmdb_id, body.title or "", body.poster_path or ""
        )
        payload = {
            "user_id": user_id,
            "tmdb_id": body.tmdb_id,
            "movie": title,
            "username": get_username(user_id),
        }
        if poster_path:
            payload["poster_path"] = poster_path

        existing_watch = supabase.table("user_watches").select("id").eq("user_id", user_id).eq("tmdb_id", body.tmdb_id).execute()
        if existing_watch.data:
            supabase.table("user_watches").update(payload).eq("user_id", user_id).eq("tmdb_id", body.tmdb_id).execute()
        else:
            supabase.table("user_watches").insert(payload).execute()

        return {"message": "Marked as watched.", "tmdb_id": body.tmdb_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Watch insert failed: {str(e)}")

@app.post("/api/unwatch")
def unwatch_movie(body: WatchRequest, user_id: str = Depends(get_current_user_id)):
    try:
        supabase.table("user_watches").delete().eq("user_id", user_id).eq("tmdb_id", body.tmdb_id).execute()
        supabase.table("user_ratings").delete().eq("user_id", user_id).eq("tmdb_id", body.tmdb_id).execute()
        return {"message": "Unwatched and rating deleted.", "tmdb_id": body.tmdb_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unwatch failed: {str(e)}")

@app.post("/api/recommend")
def get_recommendations(body: RecommendRequest):
    if not body.tmdb_ids:
        raise HTTPException(status_code=400, detail="No movies selected.")

    movies_list = CATALOG_CACHE["movies_list"]
    id_to_movie = CATALOG_CACHE["id_to_movie"]
    id_to_idx = CATALOG_CACHE["id_to_idx"]
    hybrid_vectorizer = CATALOG_CACHE["hybrid_vectorizer"]
    hybrid_matrix = CATALOG_CACHE["hybrid_matrix"]

    hybrid_vectors = []
    selected_titles = set()

    for t_id in body.tmdb_ids:
        if t_id in id_to_idx:
            idx = id_to_idx[t_id]
            hybrid_vectors.append(hybrid_matrix[idx].toarray()[0])
            selected_titles.add(id_to_movie[t_id]["title"].strip().lower())
        else:
            try:
                details_res = requests.get(
                    f"{TMDB_BASE_URL}/movie/{t_id}?api_key={TMDB_API_KEY}",
                    timeout=3,
                )
                if details_res.status_code == 200:
                    details = details_res.json()
                    title = details.get("title", "")
                    keywords_str = fetch_movie_keywords(t_id)
                    genres = " ".join(
                        TMDB_GENRES.get(g.get("id"), "")
                        for g in details.get("genres", [])
                    )
                    rtok = rating_token(details.get("vote_average"))
                    ptok = popularity_token(details.get("popularity"))

                    hybrid_vectors.append(
                        hybrid_vectorizer.transform(
                            [build_hybrid_feature(keywords_str, genres, rtok, ptok)]
                        ).toarray()[0]
                    )
                    if title:
                        selected_titles.add(title.strip().lower())
            except Exception as e:
                print(f"Failed to fetch missing movie {t_id}: {e}")
                continue

    if not hybrid_vectors:
        raise HTTPException(status_code=404, detail="Could not process any of the selected movies.")

    def rank(vectors, matrix):
        if not vectors or matrix is None:
            return []
        blended = np.mean(vectors, axis=0).reshape(1, -1)
        sims = cosine_similarity(blended, matrix)[0]
        scored = sorted(zip(movies_list, sims), key=lambda x: x[1], reverse=True)
        results = []
        seen = set(selected_titles)
        for m, s in scored:
            norm_title = m["title"].strip().lower()
            if m["tmdb_id"] not in body.tmdb_ids and norm_title not in seen:
                seen.add(norm_title)
                results.append({
                    "tmdb_id": m["tmdb_id"],
                    "title": m["title"],
                    "poster_path": m.get("poster_path") or "",
                    "score": round(float(s), 4),
                })
                if len(results) == RECOMMENDATION_LIMIT:
                    break
        return results

    return {
        "recommendations": rank(hybrid_vectors, hybrid_matrix),
    }