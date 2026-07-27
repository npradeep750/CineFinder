'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kxqiovrdimaproigfeyc.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cWlvdnJkaW1hcHJvaWdmZXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5OTgwNTMsImV4cCI6MjA5OTU3NDA1M30.CMu84XvMMjVLeN_mWtzFbDni-oZGNmrBDRCDJ7L-Clo";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Recommendation {
  movie: string;
  score: number;
}

interface UserHistory {
  name: string;
  unwatched: string[]; 
  personalized_recommendations?: Recommendation[]; 
  ratings?: { [movie: string]: number };
}

function MovieRatingRow({
  movieName,
  savedRating,
  onRate,
  isUpdating
}: {
  movieName: string;
  savedRating: number;
  onRate: (rating: number) => void;
  isUpdating: boolean;
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const effectiveRating = hoverValue !== null ? hoverValue : savedRating;
  const hasRating = savedRating > 0;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 rounded-xl bg-slate-950 border border-slate-800 transition-colors">
      <span title={movieName} className="font-semibold text-slate-200 leading-snug break-words flex-1 pr-2">
        🎬 {movieName}
      </span>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <span className="text-xs font-bold text-amber-400 w-8 text-right">
          {effectiveRating > 0 ? `${effectiveRating}★` : '—'}
        </span>

        <div
          className="flex items-center gap-1"
          onMouseLeave={() => setHoverValue(null)}
        >
          {[1, 2, 3, 4, 5].map((starIndex) => {
            const fillAmount = Math.max(0, Math.min(1, effectiveRating - (starIndex - 1)));

            return (
              <div key={starIndex} className="relative w-5 h-5 cursor-pointer">
                <button
                  disabled={isUpdating}
                  onClick={() => onRate(starIndex - 0.5)}
                  onMouseEnter={() => setHoverValue(starIndex - 0.5)}
                  title={`Rate ${starIndex - 0.5} stars`}
                  className="absolute left-0 top-0 w-1/2 h-full z-10 focus:outline-none"
                />
                <button
                  disabled={isUpdating}
                  onClick={() => onRate(starIndex)}
                  onMouseEnter={() => setHoverValue(starIndex)}
                  title={`Rate ${starIndex} stars`}
                  className="absolute right-0 top-0 w-1/2 h-full z-10 focus:outline-none"
                />

                <svg className="w-5 h-5 text-slate-700 fill-slate-800" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.116.488-.42.88-.838.627L12 17.805l-4.743 2.753c-.418.253-.954-.139-.838-.627l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>

                <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ width: `${fillAmount * 100}%` }}>
                  <svg className={`w-5 h-5 ${hoverValue !== null ? 'text-amber-300 fill-amber-300' : 'text-amber-400 fill-amber-400'}`} viewBox="0 0 24 24">
                    <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.116.488-.42.88-.838.627L12 17.805l-4.743 2.753c-.418.253-.954-.139-.838-.627l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => onRate(0)}
          disabled={!hasRating || isUpdating}
          className={`text-xs ml-1 ${hasRating ? 'text-rose-400 hover:underline cursor-pointer' : 'text-slate-600 cursor-not-allowed'}`}
        >
          Remove rating
        </button>
      </div>
    </div>
  );
}

export default function MovieRecommender() {
  const [movies, setMovies] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const [session, setSession] = useState<any>(null);
  const [identifier, setIdentifier] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  const [newUsername, setNewUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [updateMessage, setUpdateMessage] = useState<string>('');
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);

  const [visiblePersonalizedCount, setVisiblePersonalizedCount] = useState<number>(5);
  const [visibleComboCount, setVisibleComboCount] = useState<number>(5);

  const [userData, setUserData] = useState<UserHistory | null>(null);
  const [recommendationMode, setRecommendationMode] = useState<'ratings' | 'watches'>('ratings');
  const [activeTab, setActiveTab] = useState<'recommendations' | 'combo' | 'watchlist' | 'ratings' | 'settings'>('recommendations');
  
  const [gridSearch, setGridSearch] = useState<string>('');
  const [updatingMovies, setUpdatingMovies] = useState<Set<string>>(new Set());
  const [selectedMoviesList, setSelectedMoviesList] = useState<string[]>([]);
  const [ratingUpdating, setRatingUpdating] = useState<Set<string>>(new Set());

  // Search Bar States for Mix & Match
  const [comboDropdownSearch, setComboDropdownSearch] = useState<string>('');
  const [isComboDropdownOpen, setIsComboDropdownOpen] = useState<boolean>(false);

  // 🚀 Search Bar States for Ratings Tab
  const [ratingsSearch, setRatingsSearch] = useState<string>('');
  const [isRatingsDropdownOpen, setIsRatingsDropdownOpen] = useState<boolean>(false);

  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const API_URL = 'http://localhost:8000/api';

  useEffect(() => {
    fetch(`${API_URL}/movies`)
      .then((res) => res.json())
      .then((data) => {
        if (data.movies) setMovies(data.movies);
      })
      .catch((err) => console.error('Failed fetching master movies:', err));

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserData(session.access_token, recommendationMode);
        fetchRecentSearches(session.access_token);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserData(session.access_token, recommendationMode);
        fetchRecentSearches(session.access_token);
      } else {
        setUserData(null);
        setRecentSearches([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (token: string, mode: 'ratings' | 'watches') => {
    try {
      const res = await fetch(`${API_URL}/user-history?mode=${mode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      }
    } catch (err) {
      console.error('Failed fetching user history:', err);
    }
  };

  const fetchRecentSearches = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/recent-searches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.recent_searches) setRecentSearches(data.recent_searches);
      }
    } catch (err) {
      console.error('Failed fetching recent searches:', err);
    }
  };

  const logRecentSearch = async (selectedMovieTitle: string) => {
    if (!session || !selectedMovieTitle.trim()) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== selectedMovieTitle.toLowerCase());
      return [selectedMovieTitle.trim(), ...filtered].slice(0, 10);
    });

    try {
      await fetch(`${API_URL}/recent-searches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ query: selectedMovieTitle.trim() })
      });
    } catch (err) {
      console.error('Failed logging search:', err);
    }
  };

  const handleDeleteRecentSearch = async (termToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) return;

    setRecentSearches((prev) => prev.filter((item) => item.toLowerCase() !== termToDelete.toLowerCase()));

    try {
      await fetch(`${API_URL}/recent-searches`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ query: termToDelete })
      });
    } catch (err) {
      console.error('Failed deleting search:', err);
    }
  };

  const handleModeToggle = (newMode: 'ratings' | 'watches') => {
    setRecommendationMode(newMode);
    if (session) fetchUserData(session.access_token, newMode);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError('');

    try {
      if (isRegistering) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } }
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          await supabase.from('profiles').insert([{ id: data.user.id, username }]);
        }
      } else {
        const loginEmail = identifier.includes('@') ? identifier : `${identifier.trim().toLowerCase()}@placeholder.com`;
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);
    setUpdateMessage('');

    try {
      if (newUsername.trim()) {
        await supabase.from('profiles').update({ username: newUsername }).eq('id', session.user.id);
      }
      if (newPassword) {
        await supabase.auth.updateUser({ password: newPassword });
      }
      setUpdateMessage('Profile updated successfully!');
      if (session) fetchUserData(session.access_token, recommendationMode);
    } catch (err: any) {
      setUpdateMessage(err.message || 'Update failed.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleToggleMovieWatch = async (movieName: string, isWatched: boolean) => {
    if (!session) return;
    setUpdatingMovies((prev) => new Set(prev).add(movieName));

    const endpoint = isWatched ? '/unwatch' : '/watch';
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ movie: movieName })
      });
      if (res.ok) {
        await fetchUserData(session.access_token, recommendationMode);
      }
    } catch (err) {
      console.error('Watch toggle failed:', err);
    } finally {
      setUpdatingMovies((prev) => {
        const next = new Set(prev);
        next.delete(movieName);
        return next;
      });
    }
  };

  const handleRateMovie = async (movieName: string, ratingValue: number) => {
    if (!session) return;
    setRatingUpdating((prev) => new Set(prev).add(movieName));

    try {
      const res = await fetch(`${API_URL}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ movie: movieName, rating: ratingValue })
      });
      if (res.ok) {
        await fetchUserData(session.access_token, recommendationMode);
      }
    } catch (err) {
      console.error('Rating update failed:', err);
    } finally {
      setRatingUpdating((prev) => {
        const next = new Set(prev);
        next.delete(movieName);
        return next;
      });
    }
  };

  const handleComboRecommend = async () => {
    if (selectedMoviesList.length === 0) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movies: selectedMoviesList })
      });
      const data = await res.json();
      if (res.ok) setRecommendations(data.recommendations);
      else setError(data.detail || 'Recommendation calculation failed.');
    } catch (err) {
      setError('Server request failed.');
    } finally {
      setLoading(false);
    }
  };

  const checkIsMovieWatched = (m: string) => {
    if (!userData || !userData.unwatched) return false;
    return !userData.unwatched.includes(m);
  };

  const filteredGridDisplay = movies.filter((m) =>
    m.toLowerCase().includes(gridSearch.toLowerCase())
  );

  const comboDropdownMatches = comboDropdownSearch.trim() === '' 
    ? [] 
    : movies.filter((m) =>
        m.toLowerCase().includes(comboDropdownSearch.toLowerCase()) && !selectedMoviesList.includes(m)
      );

  // 🚀 RATINGS SEARCH MATCHES FROM USER'S WATCHLIST
  // 🚀 Explicitly sort in JS to prevent integer titles (like "21") from jumping to the top
const ratingMoviesList = userData?.ratings 
  ? Object.entries(userData.ratings).sort((a, b) => {
      const scoreA = a[1];
      const scoreB = b[1];

      // 1. Unrated films (0.0 stars) shot to the very top
      if (scoreA === 0 && scoreB !== 0) return -1;
      if (scoreA !== 0 && scoreB === 0) return 1;

      // 2. Rated films sorted highest stars first
      if (scoreB !== scoreA) return scoreB - scoreA;

      // 3. Alphabetical tie-breaker
      return a[0].localeCompare(b[0]);
    })
  : [];
  
  const ratingsDropdownMatches = ratingsSearch.trim() === ''
    ? []
    : ratingMoviesList.filter(([movieName]) =>
        movieName.toLowerCase().includes(ratingsSearch.toLowerCase())
      );

  const filteredRatingMovies = ratingMoviesList.filter(([movieName]) =>
    movieName.toLowerCase().includes(ratingsSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div>
            <h1 className="text-2xl font-black text-rose-500 tracking-tight">🎬 CineFinder</h1>
            <p className="text-xs text-slate-400 mt-1">High-performance catalog recommendations engine</p>
          </div>
          {session && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-300">👋 {userData?.name || 'User'}</span>
              <button onClick={handleLogout} className="text-xs bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 px-3 py-2 rounded-xl transition">
                Logout
              </button>
            </div>
          )}
        </header>

        {!session ? (
          /* AUTH FORM */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md mx-auto">
            <h2 className="text-lg font-bold mb-4">{isRegistering ? 'Create Account' : 'Sign In'}</h2>
            {error && <div className="p-3 mb-4 bg-rose-500/10 text-rose-400 text-xs rounded-xl">{error}</div>}
            <form onSubmit={handleAuth} className="space-y-4">
              {isRegistering ? (
                <>
                  <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm" />
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm" />
                </>
              ) : (
                <input type="text" placeholder="Username or Email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm" />
              )}
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm" />
              <button type="submit" disabled={authLoading} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-50">
                {authLoading ? 'Authenticating...' : isRegistering ? 'Register' : 'Login'}
              </button>
            </form>
            <button onClick={() => setIsRegistering(!isRegistering)} className="w-full text-center text-xs text-slate-400 mt-4 hover:underline">
              {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Register'}
            </button>
          </div>
        ) : (
          /* MAIN DASHBOARD */
          <div className="space-y-6">
            {/* TABS NAVIGATION */}
            <nav className="flex gap-2 bg-slate-900 border border-slate-800 p-2 rounded-2xl overflow-x-auto">
              {[
                { id: 'recommendations', label: '🎯 Picks' },
                { id: 'combo', label: '🔀 Mix & Match' },
                { id: 'watchlist', label: '📚 Watchlist' },
                { id: 'ratings', label: '⭐ Ratings' },
                { id: 'settings', label: '⚙️ Settings' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
                    activeTab === tab.id ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* TAB: PERSONALIZED RECOMMENDATIONS */}
            {activeTab === 'recommendations' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <h2 className="text-md font-bold">Recommended For You</h2>
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                    <button
                      onClick={() => handleModeToggle('ratings')}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg ${recommendationMode === 'ratings' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}
                    >
                      By Ratings
                    </button>
                    <button
                      onClick={() => handleModeToggle('watches')}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg ${recommendationMode === 'watches' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}
                    >
                      By Watches
                    </button>
                  </div>
                </div>

                {userData?.personalized_recommendations && userData.personalized_recommendations.length > 0 ? (
                  <div className="space-y-2">
                    {userData.personalized_recommendations.slice(0, visiblePersonalizedCount).map((rec, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-xl">
                        <span className="text-sm font-medium">🎬 {rec.movie}</span>
                        <span className="text-xs font-bold text-emerald-400">{(rec.score * 100).toFixed(0)}% Match</span>
                      </div>
                    ))}
                    {visiblePersonalizedCount < userData.personalized_recommendations.length && (
                      <button
                        onClick={() => setVisiblePersonalizedCount((prev) => prev + 5)}
                        className="w-full py-2 bg-slate-950 border border-slate-800 text-xs font-semibold rounded-xl text-slate-400 hover:text-slate-200"
                      >
                        Show More
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-4">Rate or mark movies as watched to generate custom recommendations!</p>
                )}
              </div>
            )}

            {/* TAB: MIX & MATCH WITH RECENT SEARCHES */}
            {activeTab === 'combo' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-md font-bold">Combine Movies for Custom Recommendations</h2>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type to search movies..."
                    value={comboDropdownSearch}
                    onFocus={() => setIsComboDropdownOpen(true)}
                    onBlur={() => {
                      setTimeout(() => setIsComboDropdownOpen(false), 200);
                    }}
                    onChange={(e) => {
                      setComboDropdownSearch(e.target.value);
                      setIsComboDropdownOpen(true);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm"
                  />

                  {isComboDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-800 max-h-56 overflow-y-auto rounded-xl z-20 shadow-2xl">
                      {/* ACTIVE SEARCH MATCHES */}
                      {comboDropdownSearch.trim() !== '' && comboDropdownMatches.length > 0 && (
                        comboDropdownMatches.slice(0, 20).map((m) => (
                          <button
                            key={m}
                            onMouseDown={() => {
                              setSelectedMoviesList((prev) => [...prev, m]);
                              logRecentSearch(m);
                              setComboDropdownSearch('');
                              setIsComboDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-800 text-slate-200 border-b border-slate-800/50 last:border-none flex items-center justify-between"
                          >
                            <span>🎬 {m}</span>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">Select</span>
                          </button>
                        ))
                      )}

                      {/* NO MATCHES RESULT */}
                      {comboDropdownSearch.trim() !== '' && comboDropdownMatches.length === 0 && (
                        <div className="p-4 text-xs text-slate-500 text-center">No movies found matching "{comboDropdownSearch}"</div>
                      )}

                      {/* 10 MOST RECENT SEARCHES */}
                      {comboDropdownSearch.trim() === '' && recentSearches.length > 0 && (
                        <div className="p-2">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
                            🕒 Recent Searches
                          </div>
                          {recentSearches.map((term, idx) => (
                            <div
                              key={idx}
                              onMouseDown={() => setComboDropdownSearch(term)}
                              className="group w-full text-left px-3 py-2 text-xs hover:bg-slate-800 text-slate-300 rounded-lg flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span className="text-slate-500">🔍</span>
                                <span className="truncate">{term}</span>
                              </div>
                              <button
                                onMouseDown={(e) => handleDeleteRecentSearch(term, e)}
                                title="Remove search item"
                                className="text-slate-500 hover:text-rose-400 p-1 rounded-md transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedMoviesList.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedMoviesList.map((m) => (
                      <span key={m} className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs px-3 py-1.5 rounded-xl flex items-center gap-2">
                        {m}
                        <button onClick={() => setSelectedMoviesList((prev) => prev.filter((i) => i !== m))} className="hover:text-white font-bold">✕</button>
                      </span>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleComboRecommend}
                  disabled={loading || selectedMoviesList.length === 0}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-50"
                >
                  {loading ? 'Analyzing...' : 'Generate Hybrid Recommendations'}
                </button>

                {recommendations.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {recommendations.slice(0, visibleComboCount).map((rec, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-xl">
                        <span className="text-sm font-medium">🎬 {rec.movie}</span>
                        <span className="text-xs font-bold text-emerald-400">{(rec.score * 100).toFixed(0)}% Similarity</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: WATCHLIST */}
            {activeTab === 'watchlist' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-md font-bold">Movie Catalog Watchlist</h2>
                  <span className="text-xs text-slate-500">{filteredGridDisplay.length} matched</span>
                </div>
                <input
                  type="text"
                  placeholder="Filter catalog..."
                  value={gridSearch}
                  onChange={(e) => setGridSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm"
                />

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {filteredGridDisplay.slice(0, 100).map((movieName) => {
                    const isWatched = checkIsMovieWatched(movieName);
                    const isUpdating = updatingMovies.has(movieName);
                    return (
                      <button
                        key={movieName}
                        onClick={() => handleToggleMovieWatch(movieName, isWatched)}
                        disabled={isUpdating}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${
                          isWatched ? 'bg-rose-500/10 border-rose-500/40 text-rose-200' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-sm font-semibold truncate max-w-[75%]">
                          {isWatched ? '✅' : '🎬'} {movieName}
                        </span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
                          isWatched ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isUpdating ? 'Updating...' : isWatched ? 'Watched' : 'Unwatched'}
                        </span>
                      </button>
                    );
                  })}
                  {filteredGridDisplay.length > 100 && (
                    <p className="text-center text-xs text-slate-500 py-2">
                      Showing top 100 matches. Refine your search query to view specific titles.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 🚀 TAB: RATINGS WITH SEARCH BAR & UNRATED FILMS AT TOP */}
            {activeTab === 'ratings' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-md font-bold">Your Rated Movies</h2>
                  <span className="text-xs text-slate-500">{filteredRatingMovies.length} movies</span>
                </div>

                {/* RATINGS SEARCH BAR */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search watchlist ratings..."
                    value={ratingsSearch}
                    onFocus={() => setIsRatingsDropdownOpen(true)}
                    onBlur={() => {
                      setTimeout(() => setIsRatingsDropdownOpen(false), 200);
                    }}
                    onChange={(e) => {
                      setRatingsSearch(e.target.value);
                      setIsRatingsDropdownOpen(true);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm"
                  />

                  {isRatingsDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-800 max-h-56 overflow-y-auto rounded-xl z-20 shadow-2xl">
                      {/* ACTIVE SEARCH MATCHES */}
                      {ratingsSearch.trim() !== '' && ratingsDropdownMatches.length > 0 && (
                        ratingsDropdownMatches.slice(0, 20).map(([movieName]) => (
                          <button
                            key={movieName}
                            onMouseDown={() => {
                              setRatingsSearch(movieName);
                              logRecentSearch(movieName);
                              setIsRatingsDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-800 text-slate-200 border-b border-slate-800/50 last:border-none flex items-center justify-between"
                          >
                            <span>🎬 {movieName}</span>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">Focus</span>
                          </button>
                        ))
                      )}

                      {/* NO MATCHES RESULT */}
                      {ratingsSearch.trim() !== '' && ratingsDropdownMatches.length === 0 && (
                        <div className="p-4 text-xs text-slate-500 text-center">No movies found matching "{ratingsSearch}"</div>
                      )}

                      {/* 10 MOST RECENT SEARCHES */}
                      {ratingsSearch.trim() === '' && recentSearches.length > 0 && (
                        <div className="p-2">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
                            🕒 Recent Searches
                          </div>
                          {recentSearches.map((term, idx) => (
                            <div
                              key={idx}
                              onMouseDown={() => setRatingsSearch(term)}
                              className="group w-full text-left px-3 py-2 text-xs hover:bg-slate-800 text-slate-300 rounded-lg flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span className="text-slate-500">🔍</span>
                                <span className="truncate">{term}</span>
                              </div>
                              <button
                                onMouseDown={(e) => handleDeleteRecentSearch(term, e)}
                                title="Remove search item"
                                className="text-slate-500 hover:text-rose-400 p-1 rounded-md transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {filteredRatingMovies.length > 0 ? (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {filteredRatingMovies.map(([movieName, rating]) => (
                      <MovieRatingRow
                        key={movieName}
                        movieName={movieName}
                        savedRating={rating}
                        onRate={(newRating) => handleRateMovie(movieName, newRating)}
                        isUpdating={ratingUpdating.has(movieName)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-4">
                    {ratingsSearch.trim() !== '' 
                      ? 'No movies match your search term.' 
                      : 'No watchlist movies available to rate. Add movies to your watchlist first!'}
                  </p>
                )}
              </div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-md font-bold text-slate-100">⚙️ Settings</h2>
                {updateMessage && <div className="p-3 bg-emerald-950/60 text-emerald-300 text-xs rounded-xl">{updateMessage}</div>}
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">New Username</label>
                    <input type="text" placeholder="New Username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">New Password</label>
                    <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm" />
                  </div>
                  <button type="submit" disabled={updateLoading || (!newUsername.trim() && !newPassword)} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl py-3 px-4 disabled:opacity-50">
                    {updateLoading ? 'Saving...' : 'Commit Changes'}
                  </button>
                </form>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}