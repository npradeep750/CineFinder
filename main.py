import os
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI()

# Enable CORS so your JavaScript app can talk to this Python API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your JS app's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables to hold the processed data
df = None
cosine_sim_matrix = None

def init_data():
    global df, cosine_sim_matrix
    file_path = "keywords-wiki.txt"
    if not os.path.exists(file_path):
        raise FileNotFoundError("keywords-wiki.txt not found!")
        
    movies, descriptions = [], []
    with open(file_path, "r", encoding="utf-8") as f:
        current_movie = None
        for line in f:
            if line.startswith("Movie:"):
                current_movie = line.replace("Movie:", "").strip()
            elif line.startswith("Keywords:"):
                keywords = line.replace("Keywords:", "").strip()
                if current_movie:
                    movies.append(current_movie)
                    descriptions.append(keywords)
                    current_movie = None
                    
    df = pd.DataFrame({'Movie': movies, 'Descriptions': descriptions})
    
    tfidf = TfidfVectorizer(stop_words='english')
    tfidf_matrix = tfidf.fit_transform(df['Descriptions'])
    cosine_sim_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix)

# Initialize ML data on startup
init_data()

class RecommendRequest(BaseModel):
    movie: str

@app.get("/api/movies")
def get_movies():
    """Returns the list of movies for your dropdown menu"""
    return {"movies": df['Movie'].tolist()}

@app.post("/api/recommend")
def get_recommendations(body: RecommendRequest):
    """Returns top 3 recommendations based on the selected movie"""
    title = body.movie
    if title not in df['Movie'].values:
        raise HTTPException(status_code=404, detail="Movie not found")
        
    idx = df[df['Movie'] == title].index[0]
    similarity_scores = list(enumerate(cosine_sim_matrix[idx]))
    similarity_scores = sorted(similarity_scores, key=lambda x: x[1], reverse=True)
    
    # Top 3 recommendations (ignoring itself)
    similarity_scores = [score for score in similarity_scores if score[0] != idx][:3]
    
    results = []
    for score in similarity_scores:
        row = df.iloc[score[0]]
        results.append({
            "movie": row['Movie'],
            "score": float(score[1]) # JSON requires standard float types
        })
        
    return {"recommendations": results}