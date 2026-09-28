# MovieRecs

An accessible, cinematic movie-recommendation app with a Next.js frontend and
FastAPI backend.

## Configure locally

Copy `.env.example` to `.env` for the backend, and copy
`frontend/.env.example` to `frontend/.env.local` for the frontend. Replace every
placeholder before starting the app. The backend requires
`SUPABASE_SERVICE_ROLE_KEY` and `TMDB_API_KEY`. Never place either value in
`frontend/` or in a `NEXT_PUBLIC_*` variable.

The Supabase anonymous key is the only key intended for the browser; protect
its data with Supabase Row Level Security policies. Set `CORS_ORIGINS` to the
exact deployed frontend origin(s) in production.
