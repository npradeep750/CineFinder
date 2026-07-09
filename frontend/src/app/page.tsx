'use client';

import { useState, useEffect } from 'react';

interface Recommendation {
  movie: string;
  score: number;
}

export default function MovieRecommender() {
  const [movies, setMovies] = useState<string[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<string>('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // New State for Name Entry Screen
  const [nameInput, setNameInput] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  const API_URL = 'http://localhost:8000/api';

  useEffect(() => {
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
  }, []);

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

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      setUserName(nameInput.trim());
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans flex flex-col justify-center items-center">
      <div className="max-w-xl w-full mx-auto">
        
        {/* STEP 1: WELCOME SCREEN (Displays if userName is empty) */}
        {!userName ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center space-y-6">
            <div className="text-5xl">🍿</div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                Welcome to Movie Recommender
              </h1>
              <p className="text-sm text-slate-500">
                Let's customize your experience. What should we call you?
              </p>
            </div>

            <form onSubmit={handleNameSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Enter your name..."
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={30}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-base text-center focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                required
              />
              <button
                type="submit"
                className="w-full bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-medium rounded-xl py-3 px-4 transition-all shadow-sm"
              >
                Get Started
              </button>
            </form>
          </div>
        ) : (
          /* STEP 2: MAIN RECOMMENDER SCREEN (Displays after name submission) */
          <div>
            {/* Header Section */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
                🎬 Hey, {userName}!
              </h1>
              <p className="text-sm text-slate-500">
                Select a movie to crunch vector scores using your local dataset
              </p>
            </div>

            {/* Main Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="movie" className="block text-sm font-semibold text-slate-700 mb-2">
                    What's your favorite movie?
                  </label>
                  <select
                    id="movie"
                    value={selectedMovie}
                    onChange={(e) => setSelectedMovie(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                  >
                    {movies.map((movie) => (
                      <option key={movie} value={movie}>{movie}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleRecommend}
                  disabled={loading || movies.length === 0}
                  className="w-full bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-medium rounded-xl py-3 px-4 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Analyzing Keywords...' : 'Find Matches'}
                </button>
              </div>
            </div>

            {/* Results Section */}
            {recommendations.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                  {userName}, because you liked <span className="text-rose-500">{selectedMovie}</span>:
                </h2>
                
                <div className="space-y-3">
                  {recommendations.map((item) => (
                    <div 
                      key={item.movie} 
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100"
                    >
                      <span className="font-medium text-slate-700">🍿 {item.movie}</span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                        {Math.round(item.score * 100)}% Match
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