import os
import time
import json
import urllib.request
import urllib.parse
import pandas as pd

GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS-D3fSi-o-CfO_aPIk9A-kjHfo_il-6Sl4T68RWyuYFcGMHQCDVQgkoXmdJrHtd2SKymOzYEaK3Elt/pub?gid=0&single=true&output=csv"
OUTPUT_FILE = "keywords-tmdb.txt"

# 🔑 PASTE YOUR TMDB API KEY HERE
TMDB_API_KEY = "901696f09bee18449863e03f2da050e0"

GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
}

def fetch_tmdb_keywords_only():
    if TMDB_API_KEY == "YOUR_PASTED_TMDB_API_KEY":
        print("❌ CRITICAL: Please paste your real TMDB API key into the script first!")
        return

    print("🔄 Pulling movie titles from your live Google Sheet...")
    try:
        df_csv = pd.read_csv(GOOGLE_SHEET_CSV_URL)
        df_csv.columns = [col.strip() for col in df_csv.columns]
        movie_col_name = 'Movies' if 'Movies' in df_csv.columns else 'Movie'
        titles = df_csv[movie_col_name].dropna().str.strip().tolist()
    except Exception as e:
        print(f"❌ Failed to fetch Google Sheet data: {e}")
        return

    print(f"🎬 Found {len(titles)} titles. Extracting genres and keyword tags only...\n")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for title in titles:
            # 🛑 BREAK IMMEDIATELY if we hit the "Shows" section divider
            if "shows" in title.lower() or title.lower() == "shows":
                print("🛑 Reached 'Shows' section divider. Stopping processing!")
                break
                
            if "total" in title.lower() or "watch" in title.lower() or "unnamed" in title.lower():
                continue
                
            print(f"🍿 Fetching metadata tags for: '{title}'...")
            
            # Clean up title formatting and handle broad franchise names
            clean_title = title.split('(')[0].strip()
            
            # 🚨 FRANCHISE ROUTING LOGIC: Map the folder names to the anchor movie
            if "star wars franchise" in clean_title.lower():
                clean_title = "Star Wars"  # Will pull A New Hope keywords
            elif "harry potter franchise" in clean_title.lower():
                clean_title = "Harry Potter and the Philosopher's Stone"
            elif "franchise" in clean_title.lower() or "series" in clean_title.lower():
                clean_title = clean_title.lower().replace("franchise", "").replace("series", "").strip()

            encoded_title = urllib.parse.quote(clean_title)
            
            # Step 1: Search for the movie to get its unique TMDB Movie ID
            search_url = f"https://api.themoviedb.org/3/search/movie?api_key={TMDB_API_KEY}&query={encoded_title}"
            
            try:
                req = urllib.request.Request(search_url, headers={'User-Agent': 'MovieRecsApp/1.0'})
                with urllib.request.urlopen(req) as response:
                    search_res = json.loads(response.read().decode('utf-8'))
                    results = search_res.get("results", [])
                    
                    if results:
                        top_match = results[0]
                        movie_id = top_match.get("id")
                        
                        # Grab standard genre chips
                        genre_ids = top_match.get("genre_ids", [])
                        genres = [GENRE_MAP.get(gid) for gid in genre_ids if gid in GENRE_MAP]
                        
                        # Step 2: Query the explicit /keywords sub-endpoint for this movie ID
                        keywords_url = f"https://api.themoviedb.org/3/movie/{movie_id}/keywords?api_key={TMDB_API_KEY}"
                        kw_req = urllib.request.Request(keywords_url, headers={'User-Agent': 'MovieRecsApp/1.0'})
                        
                        plot_keywords = []
                        with urllib.request.urlopen(kw_req) as kw_response:
                            kw_res = json.loads(kw_response.read().decode('utf-8'))
                            keywords_list = kw_res.get("keywords", [])
                            plot_keywords = [kw.get("name") for kw in keywords_list]
                        
                        # 🎯 BLEND ONLY GENRES + KEYWORDS (PLOT SUMMARY REMOVED)
                        combined_elements = genres + plot_keywords
                        combined_keywords = " ".join(combined_elements).lower()
                        
                        # Clean up punctuation formatting
                        for char in [".", ",", "-", "(", ")", '"', "'", ":", ";", "!"]:
                            combined_keywords = combined_keywords.replace(char, " ")
                        combined_keywords = " ".join(combined_keywords.split())
                        
                        f.write(f"Movie: {title}\n")
                        f.write(f"Keywords: {combined_keywords}\n\n")
                        print(f"✅ Saved tags and genres for '{title}'")
                    else:
                        f.write(f"Movie: {title}\n")
                        f.write(f"Keywords: cinema classic feature\n\n")
                        print(f"⚠️ Title '{title}' not found. Applied baseline tags.")
            except Exception as e:
                print(f"❌ API failure or skip for '{title}': {e}")
                
            time.sleep(0.2)

    print(f"\n🎉 Finished! Refined text database written to: {OUTPUT_FILE}")

if __name__ == "__main__":
    fetch_tmdb_explicit_keywords = fetch_tmdb_keywords_only # Alias for execution safety
    fetch_tmdb_keywords_only()