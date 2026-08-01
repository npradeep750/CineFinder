'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kxqiovrdimaproigfeyc.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cWlvdnJkaW1hcHJvaWdmZXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5OTgwNTMsImV4cCI6MjA5OTU3NDA1M30.CMu84XvMMjVLeN_mWtzFbDni-oZGNmrBDRCDJ7L-Clo";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TMDB_CDN_BASE = "https://image.tmdb.org/t/p/w500";

interface Movie {
  tmdb_id: number;
  title: string;
  poster_path?: string;
  score?: number;
}

interface RatingItem {
  tmdb_id: number;
  title: string;
  poster_path?: string;
  rating: number;
}

interface UserHistory {
  name: string;
  personalized_recommendations?: Movie[]; 
  ratings?: RatingItem[];
}

function MovieRatingRow({
  item,
  onRate,
  onUnwatch,
  isUpdating
}: {
  item: RatingItem;
  onRate: (rating: number) => void;
  onUnwatch: () => void;
  isUpdating: boolean;
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const effectiveRating = hoverValue !== null ? hoverValue : item.rating;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 rounded-xl bg-slate-950 border border-slate-800 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {item.poster_path ? (
          <img 
            src={`${TMDB_CDN_BASE}${item.poster_path}`} 
            alt={item.title} 
            className="w-10 h-14 object-cover rounded-md bg-slate-800 shrink-0" 
          />
        ) : (
          <div className="w-10 h-14 bg-slate-800 rounded-md flex items-center justify-center text-xs shrink-0">🎬</div>
        )}
        <span title={item.title} className="font-semibold text-slate-200 leading-snug truncate">
          {item.title}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <span className="text-xs font-bold text-amber-400 w-8 text-right">
          {effectiveRating > 0 ? `${effectiveRating}★` : '—'}
        </span>

        <div className="flex items-center gap-1" onMouseLeave={() => setHoverValue(null)}>
          {[1, 2, 3, 4, 5].map((starIndex) => {
            const fillAmount = Math.max(0, Math.min(1, effectiveRating - (starIndex - 1)));
            return (
              <div key={starIndex} className="relative w-5 h-5 cursor-pointer">
                <button
                  disabled={isUpdating}
                  onClick={() => onRate(starIndex - 0.5)}
                  onMouseEnter={() => setHoverValue(starIndex - 0.5)}
                  className="absolute left-0 top-0 w-1/2 h-full z-10 focus:outline-none"
                />
                <button
                  disabled={isUpdating}
                  onClick={() => onRate(starIndex)}
                  onMouseEnter={() => setHoverValue(starIndex)}
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
          onClick={onUnwatch}
          disabled={isUpdating}
          className="text-xs text-rose-400 hover:underline cursor-pointer ml-2"
        >
          Remove Watch
        </button>
      </div>
    </div>
  );
}

export default function MovieRecommender() {
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
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

  const [userData, setUserData] = useState<UserHistory | null>(null);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'combo' | 'ratings' | 'settings'>('recommendations');
  
  const [updatingMovies, setUpdatingMovies] = useState<Set<number>>(new Set());
  const [selectedMoviesList, setSelectedMoviesList] = useState<Movie[]>([]);

  const [comboSearch, setComboSearch] = useState<string>('');
  const [comboSearchResults, setComboSearchResults] = useState<Movie[]>([]);
  const [isComboDropdownOpen, setIsComboDropdownOpen] = useState<boolean>(false);

  const [ratingsSearch, setRatingsSearch] = useState<string>('');
  const [ratingsSearchResults, setRatingsSearchResults] = useState<Movie[]>([]);
  const [isRatingsDropdownOpen, setIsRatingsDropdownOpen] = useState<boolean>(false);

  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const API_URL = 'http://localhost:8000/api';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserData(session.access_token);
        fetchRecentSearches(session.access_token);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserData(session.access_token);
        fetchRecentSearches(session.access_token);
      } else {
        setUserData(null);
        setRecentSearches([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!comboSearch.trim()) {
      setComboSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`${API_URL}/search?q=${encodeURIComponent(comboSearch)}`)
        .then((res) => res.json())
        .then((data) => setComboSearchResults(data.movies || []))
        .catch((err) => console.error(err));
    }, 300);

    return () => clearTimeout(timer);
  }, [comboSearch]);

  useEffect(() => {
    if (!ratingsSearch.trim()) {
      setRatingsSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`${API_URL}/search?q=${encodeURIComponent(ratingsSearch)}`)
        .then((res) => res.json())
        .then((data) => setRatingsSearchResults(data.movies || []))
        .catch((err) => console.error(err));
    }, 300);

    return () => clearTimeout(timer);
  }, [ratingsSearch]);

  const fetchUserData = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/user-history`, {
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
      if (session) fetchUserData(session.access_token);
    } catch (err: any) {
      setUpdateMessage(err.message || 'Update failed.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleAddWatch = async (tmdb_id: number, title: string = '', poster_path: string = '') => {
    if (!session) return;

    // 🚀 Optimistic UI Update: Instantly add movie to local state so UI updates immediately
    setUserData((prev) => {
      if (!prev) return null;
      const existing = prev.ratings || [];
      if (existing.some((item) => item.tmdb_id === tmdb_id)) return prev;

      return {
        ...prev,
        ratings: [
          { tmdb_id, title: title || `Movie #${tmdb_id}`, poster_path: poster_path || '', rating: 0 },
          ...existing,
        ],
      };
    });

    setUpdatingMovies((prev) => new Set(prev).add(tmdb_id));

    try {
      const res = await fetch(`${API_URL}/watch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tmdb_id, title, poster_path }),
      });

      if (res.ok) {
        await fetchUserData(session.access_token);
      }
    } catch (err) {
      console.error('Watch toggle failed:', err);
    } finally {
      setUpdatingMovies((prev) => {
        const next = new Set(prev);
        next.delete(tmdb_id);
        return next;
      });
    }
  };

  const handleUnwatch = async (tmdb_id: number) => {
    if (!session) return;
    setUpdatingMovies((prev) => new Set(prev).add(tmdb_id));

    try {
      const res = await fetch(`${API_URL}/unwatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ tmdb_id })
      });
      if (res.ok) {
        await fetchUserData(session.access_token);
      }
    } catch (err) {
      console.error('Unwatch failed:', err);
    } finally {
      setUpdatingMovies((prev) => {
        const next = new Set(prev);
        next.delete(tmdb_id);
        return next;
      });
    }
  };

  const handleRateMovie = async (tmdb_id: number, ratingValue: number) => {
    if (!session) return;
    
    // Find item in existing list to retain title and poster path
    const targetMovie = userData?.ratings?.find((r) => r.tmdb_id === tmdb_id);

    // Optimistic UI Update: update state immediately so the star rating changes instantly
    setUserData((prev) => {
      if (!prev) return null;
      const updatedRatings = (prev.ratings || []).map((item) =>
        item.tmdb_id === tmdb_id ? { ...item, rating: ratingValue } : item
      );
      return { ...prev, ratings: updatedRatings };
    });

    setUpdatingMovies((prev) => new Set(prev).add(tmdb_id));

    try {
      const res = await fetch(`${API_URL}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          tmdb_id,
          rating: ratingValue,
          title: targetMovie?.title || '',
          poster_path: targetMovie?.poster_path || ''
        })
      });

      if (res.ok) {
        await fetchUserData(session.access_token);
      }
    } catch (err) {
      console.error('Rating update failed:', err);
    } finally {
      setUpdatingMovies((prev) => {
        const next = new Set(prev);
        next.delete(tmdb_id);
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
        body: JSON.stringify({ tmdb_ids: selectedMoviesList.map((m) => m.tmdb_id) })
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

  const ratingMoviesList = Array.from(
    new Map((userData?.ratings || []).map(item => [item.tmdb_id, item])).values()
  );
  const selectedIds = new Set(selectedMoviesList.map((m) => m.tmdb_id));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div>
            <h1 className="text-2xl font-black text-rose-500 tracking-tight">🎬 Movie Recommender</h1>
            <p className="text-xs text-slate-400 mt-1">TF-IDF Vectorization & Cosine Similarity Engine</p>
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
            <nav className="flex gap-2 bg-slate-900 border border-slate-800 p-2 rounded-2xl overflow-x-auto">
              {[
                { id: 'recommendations', label: '🎯 Picks' },
                { id: 'combo', label: '🔀 Mix & Match' },
                { id: 'ratings', label: '⭐ Watchlist & Ratings' },
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

            {/* TAB: RECOMMENDATIONS (PICKS) */}
            {activeTab === 'recommendations' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-md font-bold">Recommended For You</h2>

                {userData?.personalized_recommendations && userData.personalized_recommendations.length > 0 ? (
                  <div className="space-y-2">
                    {Array.from(
                      new Map(userData.personalized_recommendations.map(rec => [rec.tmdb_id, rec])).values()
                    ).map((rec) => (
                      <div key={rec.tmdb_id} className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-xl">
                        <div className="flex items-center gap-3">
                          {rec.poster_path ? (
                            <img src={`${TMDB_CDN_BASE}${rec.poster_path}`} alt="" className="w-8 h-12 object-cover rounded-md" />
                          ) : (
                            <div className="w-8 h-12 bg-slate-800 rounded-md flex items-center justify-center">🎬</div>
                          )}
                          <span className="text-sm font-medium">{rec.title}</span>
                        </div>

                        {/* 📐 Cosine Similarity percentage display */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-emerald-400">
                            {((rec.score || 0) * 100).toFixed(0)}% Match
                          </span>
                          <button
                            onClick={() => handleAddWatch(rec.tmdb_id, rec.title, rec.poster_path || '')}
                            className="text-xs font-bold bg-slate-800 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg transition"
                          >
                            + Watchlist
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-4">Rate movies on your Watchlist to calculate TF-IDF & Cosine Similarity picks!</p>
                )}
              </div>
            )}

            {/* TAB: MIX & MATCH */}
            {activeTab === 'combo' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-md font-bold">Combine Movies for Custom Recommendations</h2>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type to search TMDB live..."
                    value={comboSearch}
                    onFocus={() => setIsComboDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsComboDropdownOpen(false), 200)}
                    onChange={(e) => {
                      setComboSearch(e.target.value);
                      setIsComboDropdownOpen(true);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm"
                  />

                  {isComboDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-800 max-h-56 overflow-y-auto rounded-xl z-20 shadow-2xl">
                      {comboSearch.trim() !== '' && comboSearchResults.length > 0 && (
                        comboSearchResults.filter((m) => !selectedIds.has(m.tmdb_id)).map((m) => (
                          <button
                            key={m.tmdb_id}
                            onMouseDown={() => {
                              setSelectedMoviesList((prev) => [...prev, m]);
                              logRecentSearch(m.title);
                              setComboSearch('');
                              setIsComboDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-800 text-slate-200 border-b border-slate-800/50 last:border-none flex items-center justify-between"
                          >
                            <span className="flex items-center gap-2">
                              {m.poster_path && <img src={`${TMDB_CDN_BASE}${m.poster_path}`} alt="" className="w-5 h-7 object-cover rounded" />}
                              {m.title}
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">Select</span>
                          </button>
                        ))
                      )}

                      {comboSearch.trim() === '' && recentSearches.length > 0 && (
                        <div className="p-2">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">🕒 Recent Searches</div>
                          {recentSearches.map((term, idx) => (
                            <div
                              key={idx}
                              onMouseDown={() => setComboSearch(term)}
                              className="group w-full text-left px-3 py-2 text-xs hover:bg-slate-800 text-slate-300 rounded-lg flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span className="text-slate-500">🔍</span>
                                <span className="truncate">{term}</span>
                              </div>
                              <button
                                onMouseDown={(e) => handleDeleteRecentSearch(term, e)}
                                className="text-slate-500 hover:text-rose-400 p-1 rounded-md"
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
                      <span key={m.tmdb_id} className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs px-3 py-1.5 rounded-xl flex items-center gap-2">
                        {m.title}
                        <button onClick={() => setSelectedMoviesList((prev) => prev.filter((i) => i.tmdb_id !== m.tmdb_id))} className="hover:text-white font-bold">✕</button>
                      </span>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleComboRecommend}
                  disabled={loading || selectedMoviesList.length === 0}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-50"
                >
                  {loading ? 'Analyzing Vector Similarity...' : 'Generate Cosine Similarity Recommendations'}
                </button>

                {recommendations.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {Array.from(
                      new Map(recommendations.map(rec => [rec.tmdb_id, rec])).values()
                    ).map((rec) => (
                      <div key={rec.tmdb_id} className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-xl">
                        <div className="flex items-center gap-3">
                          {rec.poster_path ? (
                            <img src={`${TMDB_CDN_BASE}${rec.poster_path}`} alt="" className="w-8 h-12 object-cover rounded-md" />
                          ) : (
                            <div className="w-8 h-12 bg-slate-800 rounded-md flex items-center justify-center">🎬</div>
                          )}
                          <span className="text-sm font-medium">{rec.title}</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-emerald-400">
                            {((rec.score || 0) * 100).toFixed(0)}% Cosine Similarity
                          </span>
                          <button
                            onClick={() => handleAddWatch(rec.tmdb_id, rec.title, rec.poster_path || '')}
                            className="text-xs font-bold bg-slate-800 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg transition"
                          >
                            + Watchlist
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: WATCHLIST & RATINGS */}
            {activeTab === 'ratings' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-md font-bold">Search & Add to Watchlist</h2>
                  <span className="text-xs text-slate-500">{ratingMoviesList.length} in Watchlist</span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search TMDB to add movies..."
                    value={ratingsSearch}
                    onFocus={() => setIsRatingsDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsRatingsDropdownOpen(false), 200)}
                    onChange={(e) => {
                      setRatingsSearch(e.target.value);
                      setIsRatingsDropdownOpen(true);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm"
                  />

                  {isRatingsDropdownOpen && (
  <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-800 max-h-56 overflow-y-auto rounded-xl z-20 shadow-2xl">
    {ratingsSearch.trim() !== '' && ratingsSearchResults.length > 0 && (
      ratingsSearchResults.map((m) => (
        <button
          key={m.tmdb_id}
          onMouseDown={(e) => {
            e.preventDefault(); // 👈 Prevents input blur from cancelling the action
            handleAddWatch(m.tmdb_id, m.title, m.poster_path || '');
            logRecentSearch(m.title);
            setRatingsSearch('');
            setIsRatingsDropdownOpen(false);
          }}
          className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-800 text-slate-200 border-b border-slate-800/50 last:border-none flex items-center justify-between cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {m.poster_path && (
              <img src={`${TMDB_CDN_BASE}${m.poster_path}`} alt="" className="w-5 h-7 object-cover rounded" />
            )}
            {m.title}
          </span>
          <span className="text-[10px] text-rose-400 uppercase font-bold">+ Watchlist</span>
        </button>
      ))
    )}

    {ratingsSearch.trim() === '' && recentSearches.length > 0 && (
      <div className="p-2">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">🕒 Recent Searches</div>
        {recentSearches.map((term, idx) => (
          <div
            key={idx}
            onMouseDown={(e) => {
              e.preventDefault();
              setRatingsSearch(term);
            }}
            className="group w-full text-left px-3 py-2 text-xs hover:bg-slate-800 text-slate-300 rounded-lg flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate pr-2">
              <span className="text-slate-500">🔍</span>
              <span className="truncate">{term}</span>
            </div>
            <button
              onMouseDown={(e) => handleDeleteRecentSearch(term, e)}
              className="text-slate-500 hover:text-rose-400 p-1 rounded-md"
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

                {ratingMoviesList.length > 0 ? (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {ratingMoviesList.map((item) => (
                      <MovieRatingRow
                        key={item.tmdb_id}
                        item={item}
                        onRate={(newRating) => handleRateMovie(item.tmdb_id, newRating)}
                        onUnwatch={() => handleUnwatch(item.tmdb_id)}
                        isUpdating={updatingMovies.has(item.tmdb_id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-4">Your watchlist is empty. Use the search bar above to search and add movies!</p>
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