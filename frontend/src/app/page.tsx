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

// 🚀 ISOLATED SUB-COMPONENT: Prevents rating hovers/clicks from causing page-wide UI lag
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
      {/* FULL UNTRUNCATED MOVIE TITLE */}
      <span title={movieName} className="font-semibold text-slate-200 leading-snug break-words flex-1 pr-2">
        🎬 {movieName}
      </span>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <span className="text-xs font-bold text-amber-400 w-8 text-right">
          {effectiveRating > 0 ? `${effectiveRating}★` : '—'}
        </span>

        {/* STAR RATING CONTROLS WITH HALF-STAR HOVER */}
        <div
          className="flex items-center gap-1"
          onMouseLeave={() => setHoverValue(null)}
        >
          {[1, 2, 3, 4, 5].map((starIndex) => {
            const fillAmount = Math.max(0, Math.min(1, effectiveRating - (starIndex - 1)));

            return (
              <div key={starIndex} className="relative w-5 h-5 cursor-pointer">
                {/* Left Half Click/Hover Trigger */}
                <button
                  disabled={isUpdating}
                  onClick={() => onRate(starIndex - 0.5)}
                  onMouseEnter={() => setHoverValue(starIndex - 0.5)}
                  title={`Rate ${starIndex - 0.5} stars`}
                  className="absolute left-0 top-0 w-1/2 h-full z-10 focus:outline-none"
                />
                {/* Right Half Click/Hover Trigger */}
                <button
                  disabled={isUpdating}
                  onClick={() => onRate(starIndex)}
                  onMouseEnter={() => setHoverValue(starIndex)}
                  title={`Rate ${starIndex} stars`}
                  className="absolute right-0 top-0 w-1/2 h-full z-10 focus:outline-none"
                />

                {/* Base Unfilled Star */}
                <svg className="w-5 h-5 text-slate-700 fill-slate-800" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.116.488-.42.88-.838.627L12 17.805l-4.743 2.753c-.418.253-.954-.139-.838-.627l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>

                {/* Golden Fill Overlay */}
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

  const [comboDropdownSearch, setComboDropdownSearch] = useState<string>('');
  const [isComboDropdownOpen, setIsComboDropdownOpen] = useState<boolean>(false);

  const API_URL = 'http://localhost:8000/api';

  useEffect(() => {
    fetch(`${API_URL}/movies`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch movie list');
        return res.json();
      })
      .then((data: { movies: string[] }) => setMovies(data.movies))
      .catch((err) => setError('❌ Could not connect to the Python ML backend.'));
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setRecommendations([]);
    setSelectedMoviesList([]);
    setError('');

    if (session?.access_token) {
      fetchLatestUserHistory(session.access_token, recommendationMode);
    } else {
      setUserData(null);
    }
  }, [session, recommendationMode]);

  const fetchLatestUserHistory = async (token: string, mode: 'ratings' | 'watches' = recommendationMode) => {
    try {
      const response = await fetch(`${API_URL}/user-history?mode=${mode}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setUserData(data);
      } else {
        setError(data.detail || 'Failed to fetch recommendations.');
      }
    } catch (err) {
      console.error("Failed refreshing dashboard metrics:", err);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAuthLoading(true);

    try {
      if (isRegistering) {
        const rawUsername = username.trim();
        if (!rawUsername) throw new Error('Please enter a valid unique username.');

        const { data: existingUser } = await supabase.from('profiles').select('username').ilike('username', rawUsername).maybeSingle();
        if (existingUser) throw new Error('This username is already taken.');

        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;

        if (data.user) {
          await supabase.from('profiles').insert({ id: data.user.id, username: rawUsername, email: email.trim().toLowerCase() });
        }
        alert("🎉 Registration successful!");
        setIsRegistering(false);
        setPassword('');
      } else {
        const typedInput = identifier.trim();
        let loginEmail = typedInput.toLowerCase();

        if (!typedInput.includes('@')) {
          const { data: profile } = await supabase.from('profiles').select('email').ilike('username', typedInput).maybeSingle();
          if (!profile || !profile.email) throw new Error('No account found for that username.');
          loginEmail = profile.email;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || 'Authentication sequence failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateMessage('');
    setError('');
    setUpdateLoading(true);

    try {
      const rawNewUsername = newUsername.trim();
      if (rawNewUsername !== '') {
        const { data: existingUser } = await supabase.from('profiles').select('username').ilike('username', rawNewUsername).maybeSingle();
        if (existingUser) throw new Error('Username already taken.');

        await supabase.from('profiles').update({ username: rawNewUsername }).eq('id', session.user.id);
        await supabase.from('user_watches').update({ username: rawNewUsername }).eq('user_id', session.user.id);

        setUpdateMessage('Username updated!');
        setNewUsername('');
        fetchLatestUserHistory(session.access_token);
      }

      if (newPassword) {
        if (newPassword.length < 6) throw new Error('Password must be at least 6 characters long.');
        await supabase.auth.updateUser({ password: newPassword });
        setUpdateMessage((prev) => prev + ' Password updated!');
        setNewPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleLogout = async () => await supabase.auth.signOut();

  const handleToggleMovieWatch = async (movieTitle: string, isCurrentlyWatched: boolean) => {
    if (!userData || !session?.access_token) return;

    setUpdatingMovies((prev) => new Set(prev).add(movieTitle));
    const previousUnwatched = [...userData.unwatched];
    let updatedUnwatched = [...userData.unwatched];

    if (isCurrentlyWatched) {
      updatedUnwatched.push(movieTitle);
    } else {
      updatedUnwatched = updatedUnwatched.filter((m) => m !== movieTitle);
    }

    setUserData({ ...userData, unwatched: updatedUnwatched });

    try {
      const endpoint = isCurrentlyWatched ? 'unwatch' : 'watch';
      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ movie: movieTitle }),
      });
      if (!response.ok) throw new Error('Database transaction failed.');
      await fetchLatestUserHistory(session.access_token);
    } catch (err) {
      setError(`Failed updating watch status for "${movieTitle}".`);
      setUserData({ ...userData, unwatched: previousUnwatched });
    } finally {
      setUpdatingMovies((prev) => {
        const next = new Set(prev);
        next.delete(movieTitle);
        return next;
      });
    }
  };

  const handleRateMovie = async (movieTitle: string, rating: number) => {
    if (!userData || !session?.access_token) return;

    setRatingUpdating((prev) => new Set(prev).add(movieTitle));
    const previousRatings = { ...(userData.ratings || {}) };
    const nextRatings = { ...previousRatings };

    if (rating === 0) {
      delete nextRatings[movieTitle];
    } else {
      nextRatings[movieTitle] = rating;
    }

    setUserData({ ...userData, ratings: nextRatings });

    try {
      const response = await fetch(`${API_URL}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ movie: movieTitle, rating }),
      });
      if (!response.ok) throw new Error('Failed saving rating.');
      await fetchLatestUserHistory(session.access_token);
    } catch (err) {
      setError(`Failed updating rating for "${movieTitle}".`);
      setUserData({ ...userData, ratings: previousRatings });
    } finally {
      setRatingUpdating((prev) => {
        const next = new Set(prev);
        next.delete(movieTitle);
        return next;
      });
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
    setVisibleComboCount(5);

    try {
      const response = await fetch(`${API_URL}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movies: selectedMoviesList }), 
      });
      const data = await response.json();
      if (response.ok) setRecommendations(data.recommendations);
      else setError(data.detail || 'Failed recommendations.');
    } catch (err) {
      setError('Vector calculation error.');
    } finally {
      setLoading(false);
    }
  };

  const checkIsMovieWatched = (movieName: string) => !userData?.unwatched?.includes(movieName);

  const filteredGridDisplay = movies.filter((m) => m.toLowerCase().includes(gridSearch.toLowerCase()));
  const filteredComboMovies = movies.filter((m) => m.toLowerCase().includes(comboDropdownSearch.toLowerCase()));

  const displayedPersonalizedList = userData?.personalized_recommendations 
    ? userData.personalized_recommendations.slice(0, visiblePersonalizedCount)
    : [];

  const displayedComboList = recommendations.slice(0, visibleComboCount);

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 font-sans flex flex-col justify-center items-center">
      <div className="max-w-xl w-full mx-auto">
        
        {!session ? (
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-8 space-y-6">
            <div className="text-center">
              <div className="text-5xl mb-3">🔐</div>
              <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
                {isRegistering ? 'Create Private Account' : 'Sign In Required'}
              </h1>
            </div>

            {error && <div className="p-3 bg-red-900/50 text-red-200 text-sm rounded-lg border border-red-800">{error}</div>}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {isRegistering ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Username</label>
                    <input type="text" required placeholder="e.g. Naithik" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email</label>
                    <input type="email" required placeholder="yourname@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500" />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email or Username</label>
                  <input type="text" required placeholder="Email or Username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500" />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Password</label>
                <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500" />
              </div>

              <button type="submit" disabled={authLoading} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl py-3 px-4 transition-all shadow-md disabled:opacity-50">
                {authLoading ? 'Verifying...' : isRegistering ? 'Register Account' : 'Login Securely'}
              </button>
            </form>

            <div className="text-center border-t border-slate-800 pt-4">
              <button type="button" onClick={() => { setIsRegistering(!isRegistering); setError(''); }} className="text-xs text-rose-400 hover:underline font-medium">
                {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Sign Up Here"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-100">👋 Welcome, {userData?.name || 'User'}!</h1>
                <p className="text-xs text-slate-400 mt-1">Session active.</p>
              </div>
              <button onClick={handleLogout} className="text-xs font-bold text-slate-300 hover:bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">Sign Out</button>
            </div>

            <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
              <button onClick={() => setActiveTab('recommendations')} className={`py-2.5 px-4 text-sm font-bold border-b-2 shrink-0 ${activeTab === 'recommendations' ? 'border-rose-500 text-slate-100' : 'border-transparent text-slate-500'}`}>✨ Recommendations</button>
              <button onClick={() => setActiveTab('combo')} className={`py-2.5 px-4 text-sm font-bold border-b-2 shrink-0 ${activeTab === 'combo' ? 'border-rose-500 text-slate-100' : 'border-transparent text-slate-500'}`}>🧪 Similar Movies</button>
              <button onClick={() => setActiveTab('watchlist')} className={`py-2.5 px-4 text-sm font-bold border-b-2 shrink-0 ${activeTab === 'watchlist' ? 'border-rose-500 text-slate-100' : 'border-transparent text-slate-500'}`}>📋 Watchlist</button>
              <button onClick={() => setActiveTab('ratings')} className={`py-2.5 px-4 text-sm font-bold border-b-2 shrink-0 ${activeTab === 'ratings' ? 'border-rose-500 text-slate-100' : 'border-transparent text-slate-500'}`}>⭐ Ratings</button>
              <button onClick={() => setActiveTab('settings')} className={`py-2.5 px-4 text-sm font-bold border-b-2 shrink-0 ${activeTab === 'settings' ? 'border-rose-500 text-slate-100' : 'border-transparent text-slate-500'}`}>⚙️ Settings</button>
            </div>

            {error && <div className="p-3 bg-red-900/50 text-red-200 text-sm rounded-lg border border-red-800">{error}</div>}

            {/* TAB SECTION A: RECOMMENDATIONS WITH TOGGLE */}
            {activeTab === 'recommendations' && (
              <div className="space-y-6">
                <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-800">
                    <div>
                      <h2 className="text-md font-bold text-slate-100 mb-0.5">✨ Tailored Recommendations</h2>
                      <p className="text-xs text-slate-400">Choose how recommendations are calculated:</p>
                    </div>

                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                      <button
                        onClick={() => setRecommendationMode('ratings')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          recommendationMode === 'ratings'
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        ⭐ By Star Ratings
                      </button>
                      <button
                        onClick={() => setRecommendationMode('watches')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          recommendationMode === 'watches'
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        🎬 By All Watched
                      </button>
                    </div>
                  </div>

                  {userData?.personalized_recommendations && userData.personalized_recommendations.length > 0 ? (
                    <div className="space-y-3">
                      {displayedPersonalizedList.map((item) => (
                        <div key={item.movie} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="font-semibold text-slate-200">🎬 {item.movie}</span>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-900">
                            {Math.round(item.score * 100)}% Match
                          </span>
                        </div>
                      ))}

                      {userData.personalized_recommendations.length > visiblePersonalizedCount && (
                        <div className="mt-4 flex gap-2 justify-center">
                          <button onClick={() => setVisiblePersonalizedCount((prev) => prev + 5)} className="text-xs font-bold text-rose-400 border border-rose-900/50 px-4 py-2 rounded-xl bg-slate-950">
                            ▼ Show 5 More
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-sm text-slate-400 py-4">
                      Mark movies as Watched in the Watchlist tab to generate recommendations!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB SECTION B: SIMILAR MOVIES */}
            {activeTab === 'combo' && (
              <div className="space-y-6">
                <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 space-y-4">
                  <h2 className="text-md font-bold text-slate-100">🧪 Movie Similarity Engine</h2>
                  <div className="relative">
                    <button onClick={() => setIsComboDropdownOpen(!isComboDropdownOpen)} className="w-full bg-slate-950 border border-slate-800 text-slate-400 rounded-xl px-4 py-3 text-left">
                      Search and select a movie...
                    </button>
                    {isComboDropdownOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-slate-950 border border-slate-800 rounded-xl p-2 shadow-2xl space-y-2">
                        <input type="text" placeholder="Type title..." value={comboDropdownSearch} onChange={(e) => setComboDropdownSearch(e.target.value)} className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm" autoFocus />
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {filteredComboMovies.map((movieName) => (
                            <button key={movieName} onClick={() => handleAddMovieToSelection(movieName)} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-900 rounded-lg">
                              🎬 {movieName}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedMoviesList.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                      {selectedMoviesList.map((movie) => (
                        <div key={movie} className="flex items-center gap-1.5 bg-rose-500/10 text-rose-300 border border-rose-500/30 text-xs px-2.5 py-1.5 rounded-lg font-medium">
                          <span>🎬 {movie}</span>
                          <button onClick={() => handleRemoveMovieFromSelection(movie)} className="text-rose-400 font-bold ml-1">×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={handleRecommend} disabled={loading || selectedMoviesList.length === 0} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl py-3 px-4 disabled:opacity-50">
                    {loading ? 'Calculating...' : 'Find Recommendations'}
                  </button>
                </div>

                {recommendations.length > 0 && (
                  <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 space-y-2">
                    {displayedComboList.map((item) => (
                      <div key={item.movie} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="font-medium text-slate-200">🍿 {item.movie}</span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-900">{Math.round(item.score * 100)}% Similarity</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB SECTION C: WATCHLIST */}
            {activeTab === 'watchlist' && (
              <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 space-y-4">
                <h2 className="text-md font-bold text-slate-100">📋 Watchlist</h2>
                <input type="text" placeholder="Filter movies..." value={gridSearch} onChange={(e) => setGridSearch(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2 text-sm" />
                <div className="max-h-[500px] overflow-y-auto space-y-2">
                  {filteredGridDisplay.map((movieName) => {
                    const isWatched = checkIsMovieWatched(movieName);
                    const isUpdating = updatingMovies.has(movieName);
                    return (
                      <button key={movieName} onClick={() => handleToggleMovieWatch(movieName, isWatched)} disabled={isUpdating} className={`w-full flex items-center justify-between p-3 rounded-xl border text-left ${isWatched ? 'bg-rose-500/10 border-rose-500 text-rose-200' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>
                        <span className="text-sm font-semibold truncate max-w-[75%]">{isWatched ? '✅' : '🎬'} {movieName}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${isWatched ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-500'}`}>{isUpdating ? 'Updating...' : isWatched ? 'Watched' : 'Unwatched'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB SECTION D: OPTIMIZED RATINGS LIST */}
            {activeTab === 'ratings' && (
              <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-md font-bold text-slate-100">⭐ Rate Watched Movies</h2>
                    <p className="text-xs text-slate-400">Hover and click stars to rate.</p>
                  </div>
                </div>

                <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
                  {movies.filter((m) => checkIsMovieWatched(m)).map((movieName) => (
                    <MovieRatingRow
                      key={movieName}
                      movieName={movieName}
                      savedRating={userData?.ratings ? userData.ratings[movieName] ?? 0 : 0}
                      onRate={(rating) => handleRateMovie(movieName, rating)}
                      isUpdating={ratingUpdating.has(movieName)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* TAB SECTION E: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 space-y-4">
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