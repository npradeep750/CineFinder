import os
import time
import json
import urllib.request
import urllib.parse

OUTPUT_FILE = "keywords-tmdb_database.txt"

# 🔑 PASTE YOUR TMDB API KEY HERE
TMDB_API_KEY = "901696f09bee18449863e03f2da050e0"

GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
}

def build_all_time_massive_dataset(total_pages_to_fetch=50):
    """
    Discovers the most heavily-voted/watched movies of all time on TMDB.
    Extracts only genres and explicit thematic keyword tags (no plots).
    """
    if TMDB_API_KEY == "YOUR_PASTED_TMDB_API_KEY":
        print("❌ CRITICAL: Please paste your real TMDB API key into the script first!")
        return

    seen_movies = set()
    
    # Pre-scan file to skip entries you already scraped
    if os.path.exists(OUTPUT_FILE):
        print("📂 Scanning existing database file to prevent duplicate rows...")
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("Movie:"):
                    seen_movies.add(line.replace("Movie:", "").strip().lower())
        print(f"ℹ️ Found {len(seen_movies)} unique movies already tracked.")

    print(f"🎬 Initializing All-Time Greatest Scrape. Target: {total_pages_to_fetch} pages...")
    movies_saved_count = 0

    with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
        for page in range(1, total_pages_to_fetch + 1):
            print(f"🚀 Fetching All-Time Hits Page {page}/{total_pages_to_fetch}...")
            
            # 🎯 DISCOVER ENDPOINT FILTERED BY ALL-TIME VOTE COUNT
            discover_url = (
                f"https://api.themoviedb.org/3/discover/movie"
                f"?api_key={TMDB_API_KEY}"
                f"&language=en-US"
                f"&sort_by=vote_count.desc"  # <-- Changes from temporary trending to all-time clout!
                f"&include_adult=false"
                f"&page={page}"
            )
            
            try:
                req = urllib.request.Request(discover_url, headers={'User-Agent': 'MovieRecsApp/1.0'})
                with urllib.request.urlopen(req) as response:
                    data = json.loads(response.read().decode('utf-8'))
                    movies_list = data.get("results", [])
                    
                    for movie in movies_list:
                        title = movie.get("title", "").strip()
                        movie_id = movie.get("id")
                        
                        if not title or not movie_id:
                            continue
                            
                        # Avoid duplicates
                        if title.lower() in seen_movies:
                            continue
                            
                        # Extract basic genre strings
                        genre_ids = movie.get("genre_ids", [])
                        genres = [GENRE_MAP.get(gid) for gid in genre_ids if gid in GENRE_MAP]
                        
                        # Grab tag keywords
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

                        # Plot text is completely omitted here
                        combined_elements = genres + plot_keywords
                        combined_keywords = " ".join(combined_elements).lower()
                        
                        for char in [".", ",", "-", "(", ")", '"', "'", ":", ";", "!"]:
                            combined_keywords = combined_keywords.replace(char, " ")
                        combined_keywords = " ".join(combined_keywords.split())
                        
                        f.write(f"Movie: {title}\n")
                        f.write(f"Keywords: {combined_keywords}\n\n")
                        
                        seen_movies.add(title.lower())
                        movies_saved_count += 1
                        
                time.sleep(0.2)
            except Exception as e:
                print(f"❌ Error fetching page {page}: {e}")
                time.sleep(1.0)

    print(f"\n🎉 Finished! Added {movies_saved_count} cinematic staples to your database context.")

if __name__ == "__main__":
    # 50 pages will get you the top 1,000 most watched movies of all time!
    build_all_time_massive_dataset(total_pages_to_fetch=50)