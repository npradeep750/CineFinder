import pandas as pd
import streamlit as st
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

@st.cache_data(show_spinner=False)
def load_data_from_local_file():
    file_path = "keywords-wiki.txt"
    
    if not os.path.exists(file_path):
        st.error("❌ 'keywords-wiki.txt' not found! Please run 'python generate_keywords.py' first to build it.")
        st.stop()
        
    movies = []
    descriptions = []
    
    # Read the text file line-by-line from folder
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
    return df

# Load static localized matrix
df = load_data_from_local_file()

# ML Logic
tfidf = TfidfVectorizer(stop_words='english')
tfidf_matrix = tfidf.fit_transform(df['Descriptions'])
cosine_sim_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix)

def get_recommendations(title, cosine_similarity=cosine_sim_matrix):
    idx = df[df['Movie'] == title].index[0]
    similarity_scores = list(enumerate(cosine_similarity[idx]))
    similarity_scores = sorted(similarity_scores, key=lambda x: x[1], reverse=True)
    
    # Top 3 recommendations (ignoring itself)
    similarity_scores = [score for score in similarity_scores if score[0] != idx][:3]
    movie_indices = [i[0] for i in similarity_scores]

    return df.iloc[movie_indices][['Movie', 'Descriptions']], similarity_scores

# Streamlit UI
st.title('🎬 Movie Recommender')
st.write("Select a movie you like, and we'll recommend others based on your custom local keywords file!")

selected_movie = st.selectbox('Choose a movie:', df['Movie'].values)

if st.button('Recommend'):
    recommendations, scores = get_recommendations(selected_movie)
    st.subheader(f"If you liked **{selected_movie}**, you might also like:")

    for idx, row in recommendations.iterrows():
        score_val = next(score[1] for score in scores if score[0] == idx)

        st.markdown(f"### 🍿 {row['Movie']}")
        st.caption(f"**Similarity Score:** {score_val:.2f}")
        st.write("---")