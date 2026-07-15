import pandas as pd
import time
from supabase import create_client

SUPABASE_URL = "https://kxqiovrdimaproigfeyc.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "sb_secret_bsO4p4AOV_U4MUzwZs4stA_K7IDb6R9"
GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS-D3fSi-o-CfO_aPIk9A-kjHfo_il-6Sl4T68RWyuYFcGMHQCDVQgkoXmdJrHtd2SKymOzYEaK3Elt/pub?gid=0&single=true&output=csv"

def force_link_case_insensitive():
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    # 1. Fetch profiles and enforce lowercase on the username key string
    print("📂 Loading secure profile links from Supabase...")
    try:
        profile_response = supabase.table("profiles").select("id, username").execute()
        # 🔑 Lowercasing the database username here ensures matching works!
        profile_map = {str(row["username"]).strip().lower(): row["id"] for row in (profile_response.data or [])}
        print(f"ℹ️ Map loaded. Registered names (lowercased): {list(profile_map.keys())}")
    except Exception as e:
        print(f"❌ Error fetching profiles: {e}")
        return

    # 2. Download Sheet Data
    print("🔄 Downloading historical data from Google Sheets...")
    try:
        df_csv = pd.read_csv(GOOGLE_SHEET_CSV_URL, encoding='utf-8')
        df_csv.columns = [col.strip() for col in df_csv.columns]
        movie_col_name = 'Movies' if 'Movies' in df_csv.columns else 'Movie'
        
        shows_indices = df_csv[df_csv[movie_col_name].astype(str).str.lower().str.strip() == "shows"].index.tolist()
        if shows_indices:
            df_csv = df_csv.iloc[:shows_indices[0]]
    except Exception as e:
        print(f"❌ Failed to parse Google Sheet: {e}")
        return

    # 3. Filter valid user columns
    user_cols = []
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
        user_cols.append(col)

    watches_to_upsert = []
    
    # 4. Process matches
    for user in user_cols:
        sheet_username_clean = user.lower().strip()
        user_id = profile_map.get(sheet_username_clean)
        
        if not user_id:
            print(f"⚠️ Warning: Column '{user}' skipped. No profile matches '{sheet_username_clean}'.")
            continue
            
        series_str = df_csv[user].fillna(False).astype(str).str.strip().str.upper()
        watched_rows = df_csv[series_str.isin(["TRUE", "1", "1.0", "CHECKED", "✔"])]
        
        for sheet_title in watched_rows[movie_col_name].tolist():
            if sheet_title.strip():
                watches_to_upsert.append({
                    "user_id": user_id,
                    "username": sheet_username_clean,  # Kept lowercase to match user_watches
                    "movie": sheet_title.strip()
                })

    # 5. Execute explicit batch write
    if watches_to_upsert:
        print(f"🚀 Writing {len(watches_to_upsert)} populated history rows to Supabase...")
        try:
            supabase.table("user_watches").upsert(
                watches_to_upsert,
                on_conflict="user_id,movie"
            ).execute()
            print("✅ Migration complete! Capitalization issues bypassed and user_ids linked.")
        except Exception as e:
            print(f"❌ Database error during batch insert: {e}")
    else:
        print("❌ Map mismatch: Collected 0 entries to write.")

if __name__ == "__main__":
    force_link_case_insensitive()