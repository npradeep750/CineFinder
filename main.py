import os
from typing import List
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# 1. Initialize FastAPI instance
app = FastAPI()

# 2. Enable CORS sharing mechanics
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global runtime datasets
df = None
cosine_sim_matrix = None

# Google Sheet CSV target address
GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS-D3fSi-o-CfO_aPIk9A-kjHfo_il-6Sl4T68RWyuYFcGMHQCDVQgkoXmdJrHtd2SKymOzYEaK3Elt/pub?gid=0&single=true&output=csv"

def init_data():
    """
    Downloads live sheet matrices from the cloud, sanitizes rows,
    and constructs the ML token representations for textual vector matching.
    """
    global df, cosine_sim_matrix
    wiki_path = "keywords-wiki.txt"
    
    if not os.path.exists(wiki_path):
        raise FileNotFoundError(f"CRITICAL: {wiki_path} was not found inside directory workspace.")
        
    # Fetch live spreadsheet dataset state
    try:
        df_csv = pd.read_csv(GOOGLE_SHEET_CSV_URL, encoding='utf-8')
    except Exception as e:
        print(f"⚠️ Live Sheet fetch failed, falling back to local file backup. Error: {e}")
        if os.path.exists("user_watches.csv"):
            df_csv = pd.read_csv("user_watches.csv")
        else:
            raise RuntimeError("Could not establish cloud dataset sync and no local fallback exists.")

    # Parse local text definitions file
    movies, descriptions = [], []
    with open(wiki_path, "r", encoding="utf-8") as f:
        current_movie = None
        for line in f:
            line = line.strip()
            if not line:
                continue
            if line.startswith("Movie:"):
                current_movie = line.replace("Movie:", "").strip()
            elif line.startswith("Keywords:"):
                keywords = line.replace("Keywords:", "").strip()
                if current_movie:
                    movies.append(current_movie)
                    descriptions.append(keywords)
                    current_movie = None
                    
    df_wiki = pd.DataFrame({'Movie': movies, 'Descriptions': descriptions})
    
    # Standardize spaces and target merge alignments
    df_csv.columns = [col.strip() for col in df_csv.columns]
    movie_col_name = 'Movies' if 'Movies' in df_csv.columns else 'Movie'
    
    df_wiki['Movie_Clean'] = df_wiki['Movie'].str.strip().str.lower()
    df_csv['Movie_Clean'] = df_csv[movie_col_name].str.strip().str.lower()
    df_csv = df_csv[df_csv['Movie_Clean'].notna()]
    
    # Merge matrices on sanitized title parameters
    df = pd.merge(df_wiki, df_csv.drop(columns=[movie_col_name]), on='Movie_Clean', how='left')
    df = df.drop(columns=['Movie_Clean'])
    
    # Clean checkmark booleans into reliable upper strings
    for col in df.columns:
        if col in ['Movie', 'Descriptions'] or col.startswith('Unnamed:'):
            continue
        df[col] = df[col].fillna(False).astype(str).str.strip().str.upper()
        df[col] = df[col].map(lambda x: "TRUE" if x in ["TRUE", "1", "1.0", "CHECKED", "✔"] else "FALSE")
        
    # Build text embeddings array
    tfidf = TfidfVectorizer(stop_words='english')
    tfidf_matrix = tfidf.fit_transform(df['Descriptions'])
    cosine_sim_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix)

# Boot up the processing framework array immediately on execution
init_data()

class RecommendRequest(BaseModel):
    movie: str

@app.get("/api/movies")
def get_movies():
    """Forces an upstream sync and serves the selector array lists."""
    init_data()
    if df is None or df.empty:
        return {"movies": []}
    return {"movies": df['Movie'].tolist()}

@app.get("/api/users")
def get_users():
    """Forces an upstream sync and grabs account identifiers up to summary boundaries."""
    init_data()
    if df is None or df.empty:
        return {"users": []}
    
    users = []
    for col in df.columns:
        if col in ['Movie', 'Descriptions'] or col.startswith('Unnamed:'):
            continue
            
        if "watch" in col.lower() or "total" in col.lower():
            break
            
        users.append(col)
        
    return {"users": users}

@app.get("/api/user-history/{name}")
def get_user_history(name: str):
    """Calculates custom taste models using averaged history matrices."""
    init_data()
    
    matched_column = None
    for col in df.columns:
        if col.lower() == name.lower():
            matched_column = col
            break
            
    if not matched_column:
        raise HTTPException(status_code=404, detail=f"User identity '{name}' couldn't be located.")
        
    series_str = df[matched_column].astype(str).str.upper()
    watched_titles = df[series_str == "TRUE"]['Movie'].tolist()
    unwatched_titles = df[series_str == "FALSE"]['Movie'].tolist()
    
    watched_indices = df[series_str == "TRUE"].index.tolist()
    unwatched_indices = df[series_str == "FALSE"].index.tolist()
    
    personalized_recs = []
    
    if watched_indices and unwatched_indices:
        tfidf = TfidfVectorizer(stop_words='english')
        tfidf_matrix = tfidf.fit_transform(df['Descriptions'])
        
        # Mathematical compilation modeling personal user interest coordinates
        user_profile_vector = np.asarray(tfidf_matrix[watched_indices].mean(axis=0))
        
        unwatched_vectors = tfidf_matrix[unwatched_indices]
        scores = cosine_similarity(user_profile_vector, unwatched_vectors)[0]
        
        scored_unwatched = sorted(
            zip(unwatched_indices, scores), 
            key=lambda x: x[1], 
            reverse=True
        )
        
        for idx, score in scored_unwatched[:3]:
            personalized_recs.append({
                "movie": df.iloc[idx]['Movie'],
                "score": float(score)
            })
            
    return {
        "name": matched_column,
        "watched": watched_titles,
        "unwatched": unwatched_titles,
        "personalized_recommendations": personalized_recs
    }

@app.post("/api/recommend")
def get_recommendations(body: RecommendRequest):
    """Fallback manual single-title vector checking."""
    title = body.movie
    if title not in df['Movie'].values:
        raise HTTPException(status_code=404, detail="Requested title out of scope.")
        
    idx = df[df['Movie'] == title].index[0]
    similarity_scores = list(enumerate(cosine_sim_matrix[idx]))
    similarity_scores = sorted(similarity_scores, key=lambda x: x[1], reverse=True)
    
    similarity_scores = [score for score in similarity_scores if score[0] != idx][:3]
    
    results = []
    for score in similarity_scores:
        row = df.iloc[score[0]]
        results.append({
            "movie": row['Movie'],
            "score": float(score[1])
        })
        
    return {"recommendations": results}