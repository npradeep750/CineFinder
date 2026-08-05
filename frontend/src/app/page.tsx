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
  const [focusedWatchlistId, setFocusedWatchlistId] = useState<number | null>(null);
  
  const [updatingMovies, setUpdatingMovies] = useState<Set<number>>(new Set());
  const [selectedMoviesList, setSelectedMoviesList] = useState<Movie[]>([]);

  const [comboSearch, setComboSearch] = useState<string>('');
  const [comboSearchResults, setComboSearchResults] = useState<Movie[]>([]);
  const [isComboDropdownOpen, setIsComboDropdownOpen] = useState<boolean>(false);

  const [ratingsSearch, setRatingsSearch] = useState<string>('');
  const [ratingsSearchResults, setRatingsSearchResults] = useState<Movie[]>([]);
  const [isRatingsDropdownOpen, setIsRatingsDropdownOpen] = useState<boolean>(false);

  const [recentSearches, setRecentSearches] = useState<Movie[]>([]);

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
        if (data.recent_searches) {
          const parsedMovies: Movie[] = data.recent_searches
            .map((str: string) => {
              try { return JSON.parse(str); } 
              catch { return null; }
            })
            .filter(Boolean);
          setRecentSearches(parsedMovies);
        }
      }
    } catch (err) {
      console.error('Failed fetching recent searches:', err);
    }
  };

  const logRecentSearch = async (selectedMovie: Movie) => {
    if (!session || !selectedMovie) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.tmdb_id !== selectedMovie.tmdb_id);
      return [selectedMovie, ...filtered].slice(0, 10);
    });

    try {
      await fetch(`${API_URL}/recent-searches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ query: JSON.stringify(selectedMovie) })
      });
    } catch (err) {
      console.error('Failed logging search:', err);
    }
  };

  const handleDeleteRecentSearch = async (movieToDelete: Movie, e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (!session) return;

    setRecentSearches((prev) => prev.filter((item) => item.tmdb_id !== movieToDelete.tmdb_id));

    try {
      await fetch(`${API_URL}/recent-searches`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ query: JSON.stringify(movieToDelete) })
      });
    } catch (err) {
      console.error('Failed deleting search:', err);
    }
  };

  const handleMovieSelect = (movie: Movie) => {
    const existingEntry = userData?.ratings?.find((r) => r.tmdb_id === movie.tmdb_id);

    if (existingEntry) {
      setActiveTab('ratings');
      setFocusedWatchlistId(movie.tmdb_id);
      setRatingsSearch('');
    } else {
      handleAddWatch(movie.tmdb_id, movie.title, movie.poster_path);
    }
    
    logRecentSearch(movie);
    setIsComboDropdownOpen(false);
    setComboSearch('');
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
    const targetMovie = userData?.ratings?.find((r) => r.tmdb_id === tmdb_id);
    setUserData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        ratings: prev.ratings?.map((r) =>
          r.tmdb_id === tmdb_id ? { ...r, rating: ratingValue } : r
        ),
      };
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
      console.error('Rating failed:', err);
    } finally {
      setUpdatingMovies((prev) => {
        const next = new Set(prev);
        next.delete(tmdb_id);
        return next;
      });
    }
  };

  const getRecommendations = async () => {
    if (selectedMoviesList.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdb_ids: selectedMoviesList.map(m => m.tmdb_id) }),
      });
      if (!res.ok) throw new Error('Recommendation failed');
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-900 rounded-2xl shadow-2xl p-8 border border-slate-800">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-indigo-500 mb-6 text-center">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h1>
          {error && <div className="mb-4 p-3 bg-rose-950/50 text-rose-300 text-sm rounded-xl text-center border border-rose-500/30">{error}</div>}
          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering ? (
              <>
                <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
              </>
            ) : (
              <input type="text" placeholder="Username or Email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
            )}
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
            <button type="submit" disabled={authLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl py-3 px-4 transition-colors disabled:opacity-50">
              {authLoading ? 'Please wait...' : (isRegistering ? 'Sign Up' : 'Log In')}
            </button>
          </form>
          <button onClick={() => { setIsRegistering(!isRegistering); setError(''); }} className="w-full mt-4 text-slate-400 hover:text-slate-300 text-sm font-medium transition-colors">
            {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-indigo-500">
            CineFinder
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-400">Hi, {userData?.name || 'User'}</span>
            <button onClick={handleLogout} className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full transition-colors">
              Logout
            </button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 flex gap-6 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('recommendations')} className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'recommendations' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>For You</button>
          <button onClick={() => setActiveTab('combo')} className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'combo' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Combo Search</button>
          <button onClick={() => { setActiveTab('ratings'); setFocusedWatchlistId(null); }} className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ratings' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Watchlist & Ratings</button>
          <button onClick={() => setActiveTab('settings')} className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Settings</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {activeTab === 'recommendations' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-slate-100">Personalized for You</h2>
            <p className="text-sm text-slate-400">Based on your highly rated movies.</p>
            {userData?.personalized_recommendations && userData.personalized_recommendations.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {userData.personalized_recommendations.map((m, idx) => (
                  <div key={idx} className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-indigo-500/50 transition-all group relative cursor-pointer" onClick={() => handleAddWatch(m.tmdb_id, m.title, m.poster_path)}>
                    <div className="aspect-[2/3] bg-slate-800 relative">
                      {m.poster_path ? (
                        <img src={`${TMDB_CDN_BASE}${m.poster_path}`} alt={m.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-4xl">🎬</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                      <div className="absolute top-2 right-2 bg-indigo-600/90 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                        {(m.score! * 100).toFixed(0)}% Match
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-bold text-slate-200 line-clamp-2 leading-snug">{m.title}</h3>
                    </div>
                    <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all">
                        + Add to Watchlist
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 text-center text-slate-400">
                <p>Rate some movies to get personalized recommendations!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'combo' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-2">Combo Search</h2>
              <p className="text-sm text-slate-400 mb-6">Select up to 5 movies to blend their vibes.</p>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search to add movies..."
                  value={comboSearch}
                  onChange={(e) => {
                    setComboSearch(e.target.value);
                    setIsComboDropdownOpen(true);
                  }}
                  onFocus={() => setIsComboDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsComboDropdownOpen(false), 200)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500 transition-colors shadow-lg"
                />
                
                {isComboDropdownOpen && comboSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto z-50">
                    {comboSearchResults.map((m) => (
                      <div 
                        key={m.tmdb_id} 
                        className="flex items-center gap-3 p-3 hover:bg-slate-800 cursor-pointer transition-colors"
                        onClick={() => {
                          if (selectedMoviesList.length < 5 && !selectedMoviesList.some((sm) => sm.tmdb_id === m.tmdb_id)) {
                            setSelectedMoviesList([...selectedMoviesList, m]);
                          }
                          setIsComboDropdownOpen(false);
                          setComboSearch('');
                        }}
                      >
                        {m.poster_path ? (
                          <img src={`${TMDB_CDN_BASE}${m.poster_path}`} alt={m.title} className="w-8 h-12 object-cover rounded bg-slate-800" />
                        ) : (
                          <div className="w-8 h-12 bg-slate-800 rounded flex items-center justify-center text-[10px]">🎬</div>
                        )}
                        <span className="text-sm font-medium text-slate-200">{m.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedMoviesList.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedMoviesList.map((m) => (
                    <div key={m.tmdb_id} className="bg-indigo-900/50 text-indigo-200 border border-indigo-500/30 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-2">
                      {m.title}
                      <button onClick={() => setSelectedMoviesList(selectedMoviesList.filter((sm) => sm.tmdb_id !== m.tmdb_id))} className="text-indigo-400 hover:text-indigo-200">✕</button>
                    </div>
                  ))}
                </div>
              )}

              <button 
                onClick={getRecommendations} 
                disabled={selectedMoviesList.length === 0 || loading} 
                className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/20"
              >
                {loading ? 'Analyzing Vibe...' : 'Blend & Recommend'}
              </button>
            </div>

            {error && <div className="p-4 bg-rose-950/50 border border-rose-500/30 text-rose-300 rounded-xl text-sm">{error}</div>}

            {recommendations.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                  <span className="text-xl">✨</span> Hybrid Results
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {recommendations.map((m, idx) => (
                    <div key={idx} className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-indigo-500/50 transition-all group relative cursor-pointer" onClick={() => handleAddWatch(m.tmdb_id, m.title, m.poster_path)}>
                      <div className="aspect-[2/3] bg-slate-800 relative">
                        {m.poster_path ? (
                          <img src={`${TMDB_CDN_BASE}${m.poster_path}`} alt={m.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-4xl">🎬</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                        <div className="absolute top-2 right-2 bg-indigo-600/90 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                          {(m.score! * 100).toFixed(0)}% Match
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-bold text-slate-200 line-clamp-2 leading-snug">{m.title}</h3>
                      </div>
                      <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all">
                          + Add to Watchlist
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ratings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-slate-100">Watchlist & Ratings</h2>
            </div>
            
            <div className="relative z-40">
              <input
                type="text"
                placeholder="Search movies to add..."
                value={ratingsSearch}
                onChange={(e) => {
                  setRatingsSearch(e.target.value);
                  setIsRatingsDropdownOpen(true);
                }}
                onFocus={() => setIsRatingsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsRatingsDropdownOpen(false), 200)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500 transition-colors shadow-lg"
              />
              
              {isRatingsDropdownOpen && (ratingsSearchResults.length > 0 || recentSearches.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[400px]">
                  
                  {ratingsSearchResults.length > 0 && (
                    <div className="overflow-y-auto flex-1 p-2">
                      {ratingsSearchResults.map((m) => (
                        <div 
                          key={m.tmdb_id} 
                          className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                          onClick={() => handleMovieSelect(m)}
                        >
                          {m.poster_path ? (
                            <img src={`${TMDB_CDN_BASE}${m.poster_path}`} alt={m.title} className="w-8 h-12 object-cover rounded-md bg-slate-800" />
                          ) : (
                            <div className="w-8 h-12 bg-slate-800 rounded-md flex items-center justify-center text-[10px]">🎬</div>
                          )}
                          <span className="text-sm font-medium text-slate-200">{m.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!ratingsSearch.trim() && recentSearches.length > 0 && (
                    <div className="p-2 border-t border-slate-800">
                      <div className="text-xs font-bold text-slate-500 uppercase px-2 mb-2">Recent Searches</div>
                      {recentSearches.map((movie, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => handleMovieSelect(movie)}
                          className="flex items-center justify-between p-2 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {movie.poster_path ? (
                              <img 
                                src={`${TMDB_CDN_BASE}${movie.poster_path}`} 
                                alt={movie.title} 
                                className="w-8 h-12 object-cover rounded-md bg-slate-800" 
                              />
                            ) : (
                              <div className="w-8 h-12 bg-slate-800 rounded-md flex items-center justify-center text-xs">🎬</div>
                            )}
                            <span className="text-sm text-slate-300">{movie.title}</span>
                          </div>
                          
                          <button
                            onMouseDown={(e) => e.preventDefault()} 
                            onClick={(e) => handleDeleteRecentSearch(movie, e)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="Remove from history"
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

            <div>
              {focusedWatchlistId && (
                <div className="mb-4 p-3 bg-indigo-950/50 border border-indigo-500/30 rounded-xl flex justify-between items-center text-sm">
                  <span className="text-indigo-200">Showing specific search result.</span>
                  <button 
                    onClick={() => setFocusedWatchlistId(null)}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Clear Filter
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {userData?.ratings
                  ?.filter((item) => focusedWatchlistId ? item.tmdb_id === focusedWatchlistId : true)
                  .filter((item) => item.title.toLowerCase().includes(ratingsSearch.toLowerCase()))
                  .map((item) => (
                    <MovieRatingRow
                      key={item.tmdb_id}
                      item={item}
                      isUpdating={updatingMovies.has(item.tmdb_id)}
                      onRate={(val) => handleRateMovie(item.tmdb_id, val)}
                      onUnwatch={() => handleUnwatch(item.tmdb_id)}
                    />
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl max-w-md mx-auto mt-8">
                <h2 className="text-md font-bold text-slate-100 mb-4">⚙️ Settings</h2>
                {updateMessage && <div className="mb-4 p-3 bg-emerald-950/60 text-emerald-300 text-xs rounded-xl border border-emerald-500/30">{updateMessage}</div>}
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">New Username</label>
                    <input type="text" placeholder="New Username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">New Password</label>
                    <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                  <button type="submit" disabled={updateLoading || (!newUsername.trim() && !newPassword)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl py-3 px-4 disabled:opacity-50 transition-colors mt-2">
                    {updateLoading ? 'Saving...' : 'Commit Changes'}
                  </button>
                </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}