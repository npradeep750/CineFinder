'use client';

import { useState, useEffect } from 'react';

interface Recommendation {
  movie: string;
  score: number;
}

interface UserHistory {
  name: string;
  watched: string[];
  unwatched: string[];
  // Linked to your new Python taste profile list
  personalized_recommendations?: Recommendation[]; 
}

export default function MovieRecommender() {
  const [movies, setMovies] = useState<string[]>([]);
  const [users, setUsers] = useState<string[]>([]); 
  const [selectedMovie, setSelectedMovie] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>(''); 
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Individual dashboard profiles
  const [userData, setUserData] = useState<UserHistory | null>(null);
  const [checkingName, setCheckingName] = useState<boolean>(false);

  const API_URL = 'http://localhost:8000/api';

  useEffect(() => {
    // 1. Fetch movie list
    fetch(`${API_URL}/movies`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch movie list');
        return res.json();
      })
      .then((data: { movies: string[] }) => {
        setMovies(data.movies);
        if (data.movies.length > 0) setSelectedMovie(data.movies[0]);
      })
      .catch((err) => {
        setError('❌ Could not connect to the Python ML server.');
        console.error(err);
      });

    // 2. Fetch user list for the welcome dropdown
    fetch(`${API_URL}/users`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch user list');
        return res.json();
      })
      .then((data: { users: string[] }) => {
        setUsers(data.users);
        if (data.users.length > 0) setSelectedUser(data.users[0]);
      })
      .catch((err) => console.error("Error loading user names:", err));
  }, []);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setCheckingName(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/user-history/${encodeURIComponent(selectedUser)}`);
      const data = await response.json();

      if (response.ok) {
        setUserData(data);
        // Clear previous manual search results when changing users
        setRecommendations([]); 
      } else {
        setError(data.detail || 'Name profile not found.');
      }
    } catch (err) {
      setError('Could not reach the database server.');
    } finally {
      setCheckingName(false);
    }
  };

  const handleRecommend = async () => {
    if (!selectedMovie) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie: selectedMovie }),
      });
      const data = await response.json();
      if (response.ok) {
        setRecommendations(data.recommendations);
      } else {
        setError(data.detail || 'Failed to get recommendations.');
      }
    } catch (err) {
      setError('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 font-sans flex flex-col justify-center items-center">
      <div className="max-w-xl w-full mx-auto">
        
        {/* STEP 1: LOGIN SELECT DROPDOWN SCREEN */}
        {!userData ? (
          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-8 text-center space-y-6">
            <div className="text-5xl">📊</div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight mb-2">
                Analyze Watch Stats
              </h1>
              <p className="text-sm text-slate-500">
                Select your name from the spreadsheet listing below to sync profiles
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-900/50 text-red-200 text-sm rounded-lg border border-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleNameSubmit} className="space-y-4">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                required
              >
                {users.length === 0 ? (
                  <option disabled>Loading user list...</option>
                ) : (
                  users.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))
                )}
              </select>
              
              <button
                type="submit"
                disabled={checkingName || users.length === 0}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl py-3 px-4 transition-all shadow-sm disabled:opacity-50"
              >
                {checkingName ? 'Syncing...' : 'Sync My Data'}
              </button>
            </form>
          </div>
        ) : (
          /* STEP 2: INDIVIDUAL DASHBOARD */
          <div className="space-y-6">
            
            {/* User Details Header */}
            <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-100">
                  👋 Welcome, {userData.name}!
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  You have watched <strong>{userData.watched.length}</strong> out of{' '}
                  {userData.watched.length + userData.unwatched.length} tracking titles.
                </p>
              </div>
              <button 
                onClick={() => setUserData(null)}
                className="text-xs font-semibold text-slate-300 hover:bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 transition-colors"
              >
                Switch Account
              </button>
            </div>

            {/* AUTOMATIC TASTE PROFILE RECS (Based on their total watch history) */}
            {userData.personalized_recommendations && userData.personalized_recommendations.length > 0 ? (
              <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6">
                <h2 className="text-md font-bold text-slate-100 mb-1">
                  ✨ Tailored Specially For You
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  Based on your watch history trends, you should watch these unwatched titles:
                </p>
                
                <div className="space-y-3">
                  {userData.personalized_recommendations.map((item) => (
                    <div key={item.movie} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="font-semibold text-slate-200">🎬 {item.movie}</span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-900">
                        {Math.round(item.score * 100)}% Match
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 text-center text-sm text-slate-400">
                Check off some movies on Google Sheets first so the AI can build your taste vector profile!
              </div>
            )}

            {/* MANUAL COMPARISON BLOCK */}
            <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="movie" className="block text-sm font-semibold text-slate-200 mb-2">
                    Or compare against a single specific movie:
                  </label>
                  <select
                    id="movie"
                    value={selectedMovie}
                    onChange={(e) => setSelectedMovie(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {movies.map((movie) => (
                      <option key={movie} value={movie}>{movie}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleRecommend}
                  disabled={loading || movies.length === 0}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl py-3 px-4 transition-all shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Crunching Scores...' : 'Find Recommendations'}
                </button>
              </div>
            </div>

            {/* MANUAL SIMILARITY RESULTS */}
            {recommendations.length > 0 && (
              <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6">
                <h2 className="text-md font-bold text-slate-100 mb-3 pb-2 border-b border-slate-800">
                  Top Similarities to {selectedMovie}:
                </h2>
                <div className="space-y-2">
                  {recommendations.map((item) => (
                    <div key={item.movie} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="font-medium text-slate-200">🍿 {item.movie}</span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-900">
                        {Math.round(item.score * 100)}% Similarity
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}