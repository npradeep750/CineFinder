'use client';

import { useState, useEffect } from 'react';

interface Recommendation {
  movie: string;
  score: number;
}

interface UserHistory {
  name: string;
  unwatched: string[]; 
  personalized_recommendations?: Recommendation[]; 
}

export default function MovieRecommender() {
  const [movies, setMovies] = useState<string[]>([]);
  const [users, setUsers] = useState<string[]>([]); 
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const [userData, setUserData] = useState<UserHistory | null>(null);
  const [checkingName, setCheckingName] = useState<boolean>(false);
  
  const [activeTab, setActiveTab] = useState<'recommendations' | 'watchlist'>('recommendations');
  const [gridSearch, setGridSearch] = useState<string>('');
  const [updatingMovie, setUpdatingMovie] = useState<string | null>(null);
  const [selectedMoviesList, setSelectedMoviesList] = useState<string[]>([]);

  // 🚨 SEARCHABLE DROPDOWNS DISCOVERY STATES
  const [userDropdownSearch, setUserDropdownSearch] = useState<string>('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<string>('');

  const [comboDropdownSearch, setComboDropdownSearch] = useState<string>('');
  const [isComboDropdownOpen, setIsComboDropdownOpen] = useState<boolean>(false);

  const API_URL = 'http://localhost:8000/api';

  const fetchLatestUserHistory = async (username: string) => {
    try {
      const response = await fetch(`${API_URL}/user-history/${encodeURIComponent(username)}`);
      const data = await response.json();
      if (response.ok) {
        setUserData(data);
      }
    } catch (err) {
      console.error("Failed refreshing dashboard metrics:", err);
    }
  };

  useEffect(() => {
    fetch(`${API_URL}/movies`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch movie list');
        return res.json();
      })
      .then((data: { movies: string[] }) => {
        setMovies(data.movies);
      })
      .catch((err) => {
        setError('❌ Could not connect to the Python TMDB ML server.');
        console.error(err);
      });

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

  const handleToggleMovieWatch = async (movieTitle: string, isCurrentlyWatched: boolean) => {
    if (!userData) return;
    setUpdatingMovie(movieTitle);
    const endpoint = isCurrentlyWatched ? 'unwatch' : 'watch';
    
    try {
      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userData.name, movie: movieTitle }),
      });
      if (!response.ok) throw new Error('Failed updating historical data.');
      await fetchLatestUserHistory(userData.name);
    } catch (err) {
      setError('Failed synchronization update callback.');
    } finally {
      setUpdatingMovie(null);
    }
  };

  const handleAddMovieToSelection = (movieTitle: string) => {
    if (!movieTitle || selectedMoviesList.includes(movieTitle)) return;
    setSelectedMoviesList([...selectedMoviesList, movieTitle]);
    setComboDropdownSearch('');
    setIsComboDropdownOpen(false);
  };

  const handleRemoveMovieFromSelection = (movieTitle: string) => {
    setSelectedMoviesList(selectedMoviesList.filter((m) => m !== movieTitle));
  };

  const handleRecommend = async () => {
    if (selectedMoviesList.length === 0) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movies: selectedMoviesList }), 
      });
      const data = await response.json();
      if (response.ok) {
        setRecommendations(data.recommendations);
      } else {
        setError(data.detail || 'Failed to get recommendations.');
      }
    } catch (err) {
      setError('An error occurred while blending vectors.');
    } finally {
      setLoading(false);
    }
  };

  const checkIsMovieWatched = (movieName: string) => {
    if (!userData?.unwatched) return false;
    return !userData.unwatched.includes(movieName);
  };

  const filteredGridDisplay = movies.filter((m) =>
    m.toLowerCase().includes(gridSearch.toLowerCase())
  );

  // Filter lists for searchable dropdown panels
  const filteredUsers = users.filter(user => 
    user.toLowerCase().includes(userDropdownSearch.toLowerCase())
  );

  const filteredComboMovies = movies.filter(movie =>
    movie.toLowerCase().includes(comboDropdownSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 font-sans flex flex-col justify-center items-center">
      <div className="max-w-xl w-full mx-auto">
        
        {/* STEP 1: SEARCHABLE USER SIGN IN */}
        {!userData ? (
          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-8 text-center space-y-6">
            <div className="text-5xl">📊</div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight mb-2">
                Analyze Watch Stats
              </h1>
              <p className="text-sm text-slate-500">
                Search and select your name to sync your profile variables
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-900/50 text-red-200 text-sm rounded-lg border border-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleNameSubmit} className="space-y-4 text-left relative">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Select Profile:</label>
              
              {/* Custom Searchable Select UI */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-base text-left focus:outline-none focus:ring-2 focus:ring-rose-500 flex justify-between items-center"
                >
                  <span>{selectedUser || 'Choose a user profile...'}</span>
                  <span className="text-xs text-slate-500">▼</span>
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-slate-950 border border-slate-800 rounded-xl p-2 shadow-2xl space-y-2">
                    <input
                      type="text"
                      placeholder="Type to search user names..."
                      value={userDropdownSearch}
                      onChange={(e) => setUserDropdownSearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                      autoFocus
                    />
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {filteredUsers.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setSelectedUser(name);
                            setIsUserDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                            selectedUser === name ? 'bg-rose-500 text-white' : 'text-slate-300 hover:bg-slate-900'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                      {filteredUsers.length === 0 && (
                        <div className="text-xs text-slate-500 text-center py-2">No matching profiles found.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <button
                type="submit"
                disabled={checkingName || !selectedUser}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl py-3 px-4 transition-all shadow-sm disabled:opacity-50"
              >
                {checkingName ? 'Syncing...' : 'Sync My Data'}
              </button>
            </form>
          </div>
        ) : (
          /* STEP 2: APP DASHBOARD VIEWPORTS */
          <div className="space-y-6">
            
            <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-100">
                  👋 Welcome, {userData.name}!
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Active tracking calculations synced with live sheet vectors.
                </p>
              </div>
              <button 
                onClick={() => {
                  setUserData(null);
                  setSelectedUser('');
                  setUserDropdownSearch('');
                }}
                className="text-xs font-semibold text-slate-300 hover:bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 transition-colors"
              >
                Switch Account
              </button>
            </div>

            <div className="flex border-b border-slate-800 gap-2">
              <button
                onClick={() => setActiveTab('recommendations')}
                className={`py-2.5 px-4 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'recommendations'
                    ? 'border-rose-500 text-slate-100'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                ✨ Recommendations
              </button>
              <button
                onClick={() => setActiveTab('watchlist')}
                className={`py-2.5 px-4 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'watchlist'
                    ? 'border-rose-500 text-slate-100'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                ⚙️ Manage Watchlist ({movies.length - (userData.unwatched?.length || 0)} Watched)
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-900/50 text-red-200 text-sm rounded-lg border border-red-800">
                {error}
              </div>
            )}

            {/* TAB PANEL PART A: AUTOMATIC SIMILARITY VECTORS */}
            {activeTab === 'recommendations' && (
              <div className="space-y-6">
                {userData.personalized_recommendations && userData.personalized_recommendations.length > 0 ? (
                  <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6">
                    <h2 className="text-md font-bold text-slate-100 mb-1">
                      ✨ Tailored Specially For You
                    </h2>
                    <p className="text-xs text-slate-400 mb-4">
                      Based on your tracking trends, you should watch these next:
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
                    Switch to the Watchlist tab and check off some favorites to generate vector profiles!
                  </div>
                )}

                {/* 🚨 REWORKED SECTION: BOTH MULTI-SELECT WITH SEARCH BAR POP-OUT FILTER */}
                <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-1">
                      Compare against a custom combo of movies:
                    </label>
                    <p className="text-xs text-slate-400">Select multiple films by searching the system catalog indexes:</p>
                  </div>

                  {/* Searchable Movie Combobox Picker Component */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsComboDropdownOpen(!isComboDropdownOpen)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-400 rounded-xl px-4 py-3 text-base text-left focus:outline-none focus:ring-2 focus:ring-rose-500 flex justify-between items-center"
                    >
                      <span>Search and select a movie to add...</span>
                      <span className="text-xs text-slate-500">▼</span>
                    </button>

                    {isComboDropdownOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-slate-950 border border-slate-800 rounded-xl p-2 shadow-2xl space-y-2">
                        <input
                          type="text"
                          placeholder="Type movie title to search dynamic indices..."
                          value={comboDropdownSearch}
                          onChange={(e) => setComboDropdownSearch(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                          autoFocus
                        />
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {filteredComboMovies.map((movieName) => (
                            <button
                              key={movieName}
                              type="button"
                              onClick={() => handleAddMovieToSelection(movieName)}
                              className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-900 rounded-lg transition-colors"
                            >
                              🎬 {movieName}
                            </button>
                          ))}
                          {filteredComboMovies.length === 0 && (
                            <div className="text-xs text-slate-500 text-center py-2">No matching titles found in catalog file.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedMoviesList.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                      {selectedMoviesList.map((movie) => (
                        <div key={movie} className="flex items-center gap-1.5 bg-rose-500/10 text-rose-300 border border-rose-500/30 text-xs px-2.5 py-1.5 rounded-lg font-medium">
                          <span>🎬 {movie}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMovieFromSelection(movie)}
                            className="text-rose-400 hover:text-rose-200 text-sm font-bold ml-1 focus:outline-none"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handleRecommend}
                    disabled={loading || selectedMoviesList.length === 0}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl py-3 px-4 transition-all shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Blending Keyword Vectors...' : 'Find Recommendations For Combo'}
                  </button>
                </div>

                {recommendations.length > 0 && (
                  <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6">
                    <h2 className="text-md font-bold text-slate-100 mb-3 pb-2 border-b border-slate-800">
                      Top Results for Selected Combo:
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

            {/* TAB PANELS PORT B: INTERACTIVE GRID CONFIG */}
            {activeTab === 'watchlist' && (
              <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 space-y-4">
                <div>
                  <h2 className="text-md font-bold text-slate-100 mb-1">📋 Live Selection Library</h2>
                  <p className="text-xs text-slate-400">Click on any title card to toggle its watched classification state instantly:</p>
                </div>

                <input
                  type="text"
                  placeholder="Filter grid directory by name..."
                  value={gridSearch}
                  onChange={(e) => setGridSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />

                <div className="max-h-[500px] overflow-y-auto grid grid-cols-1 gap-2 pr-1 custom-scrollbar">
                  {filteredGridDisplay.map((movieName) => {
                    const isWatched = checkIsMovieWatched(movieName);
                    return (
                      <button
                        key={movieName}
                        onClick={() => handleToggleMovieWatch(movieName, isWatched)}
                        disabled={updatingMovie !== null}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                          isWatched
                            ? 'bg-rose-500/10 border-rose-500 text-rose-200 hover:bg-rose-500/20'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="text-sm font-semibold truncate max-w-[75%]">
                          {isWatched ? '✅' : '🎬'} {movieName}
                        </span>
                        
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                          isWatched 
                            ? 'bg-rose-500 text-white' 
                            : 'bg-slate-800 text-slate-500'
                        }`}>
                          {updatingMovie === movieName ? 'Updating...' : isWatched ? 'Watched' : 'Unwatched'}
                        </span>
                      </button>
                    );
                  })}
                  {filteredGridDisplay.length === 0 && (
                    <div className="text-xs text-slate-500 text-center py-6">No matching movie catalog listings.</div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}