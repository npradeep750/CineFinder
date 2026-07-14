import os
import time
import json
import urllib.request
import urllib.parse
from supabase import create_client

# 🔑 SUPABASE CONFIGURATION
# Set these as environment variables or paste your keys directly here
SUPABASE_URL = "https://kxqiovrdimaproigfeyc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cWlvdnJkaW1hcHJvaWdmZXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5OTgwNTMsImV4cCI6MjA5OTU3NDA1M30.CMu84XvMMjVLeN_mWtzFbDni-oZGNmrBDRCDJ7L-Clo"
# 🔑 YOUR TMDB API KEY
TMDB_API_KEY = "901696f09bee18449863e03f2da050e0"

GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
}

def build_all_time_massive_dataset_to_supabase(total_pages_to_fetch=50):
    """
    Discovers the most heavily-voted/watched movies of all time on TMDB.
    Extracts genres and explicit thematic tags, then saves them directly to Supabase.
    """
    if SUPABASE_URL == "YOUR_SUPABASE_URL" or SUPABASE_KEY == "YOUR_SUPABASE_ANON_KEY":
        print("❌ CRITICAL: Please set your real Supabase URL and Anon Key first!")
        return

    # Initialize Supabase Client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    seen_movies = set()
    
    # 📂 1. Pre-scan Supabase table to skip entries you already scraped
    print("📂 Scanning Supabase database table to prevent duplicate entries...")
    try:
        # Fetch existing movie titles to build a deduplication cache
        response = supabase.table("movies").select("title").execute()
        seen_movies = {row["title"].lower().strip() for row in (response.data or [])}
        print(f"ℹ️ Found {len(seen_movies)} unique movies already stored in Supabase.")
    except Exception as e:
        print(f"⚠️ Failed to scan existing movies table (might be empty or missing table): {e}")

    print(f"🎬 Initializing All-Time Greatest Scrape. Target: {total_pages_to_fetch} pages...")
    movies_saved_count = 0

    for page in range(1, total_pages_to_fetch + 1):
        print(f"🚀 Fetching All-Time Hits Page {page}/{total_pages_to_fetch}...")
        
        # 🎯 DISCOVER ENDPOINT FILTERED BY ALL-TIME VOTE COUNT
        discover_url = (
            f"https://api.themoviedb.org/3/discover/movie"
            f"?api_key={TMDB_API_KEY}"
            f"&language=en-US"
            f"&sort_by=vote_count.desc"
            f"&include_adult=false"
            f"&page={page}"
        )
        
        try:
            req = urllib.request.Request(discover_url, headers={'User-Agent': 'MovieRecsApp/1.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode('utf-8'))
                movies_list = data.get("results", [])
                
                # We can batch insert the movies found on this page to speed things up
                movies_batch = []
                
                for movie in movies_list:
                    title = movie.get("title", "").strip()
                    movie_id = movie.get("id")
                    
                    if not title or not movie_id:
                        continue
                        
                    # Avoid duplicate requests
                    if title.lower().strip() in seen_movies:
                        continue
                        
                    # Extract basic genre strings
                    genre_ids = movie.get("genre_ids", [])
                    genres = [GENRE_MAP.get(gid) for gid in genre_ids if gid in GENRE_MAP]
                    
                    # Grab keyword tags
                    keywords_url = f"https://api.themoviedb.org/3/movie/{movie_id}/keywords?api_key={TMDB_API_KEY}"
                    kw_req = urllib.request.Request(keywords_url, headers={'User-Agent': 'MovieRecsApp/1.0'})
                    
                    plot_keywords = []
                    try:
                        with urllib.request.urlopen(kw_req) as kw_response:
                            kw_res = json.loads(kw_response.read().decode('utf-8'))
                            keywords_items = kw_res.get("keywords", [])
                            plot_keywords = [kw.get("name") for kw in keywords_items]
                    except:
                        pass

                    # Clean and format keyword strings
                    combined_elements = genres + plot_keywords
                    combined_keywords = " ".join(combined_elements).lower()
                    
                    for char in [".", ",", "-", "(", ")", '"', "'", ":", ";", "!"]:
                        combined_keywords = combined_keywords.replace(char, " ")
                    combined_keywords = " ".join(combined_keywords.split())
                    
                    # Prepare for cloud insertion
                    movies_batch.append({
                        "title": title,
                        "keywords": combined_keywords
                    })
                    seen_movies.add(title.lower().strip())

                # 🚨 DIRECT CLOUD INSERTION FOR THE CURRENT PAGE BATCH
                if movies_batch:
                    try:
                        supabase.table("movies").upsert(movies_batch).execute()
                        movies_saved_count += len(movies_batch)
                        print(f"✅ Successfully cloud-saved {len(movies_batch)} movies from Page {page}.")
                    except Exception as upload_err:
                        print(f"❌ Database error uploading page {page} batch: {upload_err}")

            # Throttling to respect TMDB API limits
            time.sleep(0.2)
            
        except Exception as e:
            print(f"❌ Error fetching page {page}: {e}")
            time.sleep(1.0)

    print(f"\n🎉 Finished! Added {movies_saved_count} new cinematic staples directly to Supabase.")

if __name__ == "__main__":
    # Feel free to change the number of target pages to fetch
    build_all_time_massive_dataset_to_supabase(total_pages_to_fetch=500)