import pandas as pd
import requests

def generate_local_keywords():
    sheet_url = "https://docs.google.com/spreadsheets/d/1CRTgtEYzdxI8D3XOyeR5CUwwIsbzmENVMAmfEnS4DHU/export?format=csv"
    
    print("Reading spreadsheet...")
    raw_df = pd.read_csv(sheet_url, skiprows=[0], header=None)
    raw_df = raw_df.iloc[:, [0]] 
    raw_df.columns = ['Movie']
    
    valid_movies = []
    for title in raw_df['Movie']:
        if pd.isna(title) or str(title).strip() == "":
            break
        valid_movies.append(str(title).strip())
        
    headers = {'User-Agent': 'MovieRecommenderScript/1.0 (contact@example.com)'}
    wiki_api_url = "https://en.wikipedia.org/w/api.php"
    
    output_path = "keywords-wiki.txt"
    print(f"Starting deterministic fetch for {len(valid_movies)} movies...")
    
    with open(output_path, "w", encoding="utf-8") as f:
        for i, title in enumerate(valid_movies):
            categories_found = []
            candidates = []
            title_low = title.lower().strip()
            
            try:
                # Search queries
                search_queries = [f"{title} film", title]
                for query in search_queries:
                    search_params = {"action": "query", "format": "json", "list": "search", "srsearch": query, "srlimit": "5"}
                    resp = requests.get(wiki_api_url, headers=headers, params=search_params, timeout=5)
                    if resp.status_code == 200:
                        for res in resp.json().get("query", {}).get("search", []):
                            c_title = res.get("title")
                            if c_title not in candidates:
                                candidates.append(c_title)

                scored_candidates = []
                for candidate_title in candidates:
                    cat_params = {"action": "query", "format": "json", "titles": candidate_title, "prop": "categories", "cllimit": "50"}
                    cat_resp = requests.get(wiki_api_url, headers=headers, params=cat_params, timeout=5)
                    
                    if cat_resp.status_code == 200:
                        pages = cat_resp.json().get("query", {}).get("pages", {})
                        for page_id, page_data in pages.items():
                            if page_id != "-1" and "categories" in page_data:
                                candidate_cats = [cat.get("title", "").lower() for cat in page_data["categories"]]
                                combined_cats_str = " ".join(candidate_cats)
                                
                                is_film = any(x in combined_cats_str for x in ["films", "cinema", "motion picture"])
                                is_wrong_medium = any(x in combined_cats_str for x in [
                                    "soundtrack", "novels", "short films", "television films", 
                                    "franchises", "lists", "video games", "albums", "disambiguation"
                                ])
                                
                                cand_low = candidate_title.lower()
                                if "speed" in title_low and "racer" in cand_low: is_wrong_medium = True
                                if "star wars" in title_low and "clone wars" in cand_low: is_wrong_medium = True
                                if "the mask of zorro" in title_low and "mark" in cand_low: is_wrong_medium = True
                                if "rango" in title_low and "2017" in combined_cats_str: is_wrong_medium = True

                                if is_film and not is_wrong_medium:
                                    score = 0
                                    if f"{title_low} (film)" == cand_low or f"({title_low} film)" in cand_low:
                                        score += 100
                                    elif "(film)" in cand_low or "film)" in cand_low:
                                        score += 50
                                        
                                    scored_candidates.append({
                                        "title": candidate_title,
                                        "score": score,
                                        "categories": page_data["categories"]
                                    })

                if scored_candidates:
                    scored_candidates = sorted(scored_candidates, key=lambda x: (-x["score"], x["title"]))
                    winning_match = scored_candidates[0]
                    for cat in winning_match["categories"]:
                        cat_name = cat.get("title", "").replace("Category:", "")
                        is_junk = any(x in cat_name.lower() for x in [
                            "articles", "all", "cs1", "wikidata", "mdy", "tracking", 
                            "redirects", "printworthy", "template", "pages", "use ", 
                            "rotten tomatoes", "accuracy disputes", "isbns", "short description"
                        ])
                        if not is_junk:
                            categories_found.append(cat_name.lower())
                elif candidates:
                    candidates = sorted(candidates)
                    cat_params = {"action": "query", "format": "json", "titles": candidates[0], "prop": "categories", "cllimit": "50"}
                    cat_resp = requests.get(wiki_api_url, headers=headers, params=cat_params, timeout=5)
                    if cat_resp.status_code == 200:
                        pages = cat_resp.json().get("query", {}).get("pages", {})
                        for page_id, page_data in pages.items():
                            if page_id != "-1" and "categories" in page_data:
                                for cat in page_data["categories"]:
                                    cat_name = cat.get("title", "").replace("Category:", "")
                                    is_junk = any(x in cat_name.lower() for x in [
                                        "articles", "all", "cs1", "wikidata", "mdy", "tracking", 
                                        "redirects", "printworthy", "template", "pages", "use ", 
                                        "rotten tomatoes", "accuracy disputes", "isbns", "short description"
                                    ])
                                    if not is_junk:
                                        categories_found.append(cat_name.lower())
            except Exception:
                pass

            combined_tags = " ".join(categories_found)
            final_keywords = combined_tags if combined_tags.strip() else "unknown"
            
            f.write(f"Movie: {title}\nKeywords: {final_keywords}\n\n")
            print(f"[{i+1}/{len(valid_movies)}] Processed: {title}")
            
    print("\nInitialization Complete! 'keywords-wiki.txt' is written locally.")

if __name__ == "__main__":
    generate_local_keywords()