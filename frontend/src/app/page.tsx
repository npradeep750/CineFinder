'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// 🔑 SUPABASE CLIENT INITIALIZATION FOR FRONTEND AUTH
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
}

export default function MovieRecommender() {
  const [movies, setMovies] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Authentication & Private Registration states
  const [session, setSession] = useState<any>(null);
  const [identifier, setIdentifier] = useState<string>(''); // Holds Email OR Username on Login
  const [email, setEmail] = useState<string>('');           // Used specifically on SignUp
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');      // Raw username on SignUp
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Profile Update Settings States
  const [newUsername, setNewUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [updateMessage, setUpdateMessage] = useState<string>('');
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);

  // 🚀 EXPANSION NUMERIC LIMIT STATES (Supports clicking "Show More" over and over!)
  const [visiblePersonalizedCount, setVisiblePersonalizedCount] = useState<number>(5);
  const [visibleComboCount, setVisibleComboCount] = useState<number>(5);

  const [userData, setUserData] = useState<UserHistory | null>(null);
  
  // Active navigation states (Added 'settings' tab option)
  const [activeTab, setActiveTab] = useState<'recommendations' | 'combo' | 'watchlist' | 'settings'>('recommendations');
  const [gridSearch, setGridSearch] = useState<string>('');
  
  // Set-based loading states for multi-click snappy optimistic updates
  const [updatingMovies, setUpdatingMovies] = useState<Set<string>>(new Set());
  const [selectedMoviesList, setSelectedMoviesList] = useState<string[]>([]);

  const [comboDropdownSearch, setComboDropdownSearch] = useState<string>('');
  const [isComboDropdownOpen, setIsComboDropdownOpen] = useState<boolean>(false);

  const API_URL = 'http://localhost:8000/api';

  // 1. Fetch Master Movie Library List on component mount
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
        setError('❌ Could not connect to the Python ML backend.');
        console.error(err);
      });
  }, []);

  // 2. Track Supabase Cloud Authentication session state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3. Whenever user logs in, logs out, or switches accounts, reset session-specific states
useEffect(() => {
  // Clear any existing search recommendations and selections immediately upon session changes
  setRecommendations([]);
  setSelectedMoviesList([]);
  setComboDropdownSearch('');
  setIsComboDropdownOpen(false);
  setError('');

  if (session?.access_token) {
    fetchLatestUserHistory(session.access_token);
  } else {
    setUserData(null);
  }
  }, [session]);

  const fetchLatestUserHistory = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/user-history`, {
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      });
      const data = await response.json();
      if (response.ok) {
        setUserData(data);
      } else {
        setError(data.detail || 'Failed to fetch user configuration profiles.');
      }
    } catch (err) {
      console.error("Failed refreshing dashboard metrics:", err);
    }
  };

  // 4. Secure Authentication Form Handler (Supports Dual Login)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAuthLoading(true);

    try {
      if (isRegistering) {
        // --- REGISTRATION ---
        const rawUsername = username.trim();
        if (!rawUsername) {
          throw new Error('Please enter a valid unique username.');
        }

        // Case-insensitive uniqueness check
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('username')
          .ilike('username', rawUsername)
          .maybeSingle();

        if (existingUser) {
          throw new Error('This username is already taken. Please choose another one.');
        }

        // Step A: Register with Supabase Auth
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        // Step B: Insert raw username into profiles table
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({ 
              id: data.user.id, 
              username: rawUsername,
              email: email.trim().toLowerCase()
            });
          
          if (profileError) console.error("Error creating profile:", profileError);
        }

        alert("🎉 Registration successful! You can now log in.");
        setIsRegistering(false);
        setPassword('');
      } else {
        // --- LOGIN (Supports either Email or Username) ---
        const typedInput = identifier.trim();
        if (!typedInput) {
          throw new Error('Please enter your email or username.');
        }

        let loginEmail = typedInput.toLowerCase();

        // If the input doesn't look like an email (no '@'), treat it as a username and look up the email
        if (!typedInput.includes('@')) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .ilike('username', typedInput)
            .maybeSingle();

          if (profileError || !profile || !profile.email) {
            throw new Error('No account found associated with that username.');
          }
          
          loginEmail = profile.email;
        }

        // Step C: Regular account login using the resolved email
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });

        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || 'Authentication sequence failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  // 5. Account Settings Update Handler (Updates profiles & user_watches tables)
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateMessage('');
    setError('');
    setUpdateLoading(true);

    try {
      const rawNewUsername = newUsername.trim();

      // A. UPDATE USERNAME (Only executes if the input is not empty!)
      if (rawNewUsername !== '') {
        // Check if username is already taken by someone else
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('username')
          .ilike('username', rawNewUsername)
          .maybeSingle();

        if (existingUser) {
          throw new Error('This username is already taken. Please choose another one.');
        }

        // 1. Update profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ username: rawNewUsername })
          .eq('id', session.user.id);

        if (profileError) throw profileError;

        // 2. Update user_watches table logs so older watch entries sync up
        const { error: watchesError } = await supabase
          .from('user_watches')
          .update({ username: rawNewUsername })
          .eq('user_id', session.user.id);

        if (watchesError) console.error("Could not sync user watch logs:", watchesError);

        setUpdateMessage('Username updated successfully! ');
        setNewUsername('');
        // Refresh display name on welcome banner
        fetchLatestUserHistory(session.access_token);
      }

      // B. UPDATE PASSWORD
      if (newPassword) {
        if (newPassword.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (passwordError) throw passwordError;

        setUpdateMessage((prev) => prev + 'Password updated successfully!');
        setNewPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile details.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Snappy optimistic watchlist updates
  const handleToggleMovieWatch = async (movieTitle: string, isCurrentlyWatched: boolean) => {
    if (!userData || !session?.access_token) return;

    setUpdatingMovies((prev) => {
      const next = new Set(prev);
      next.add(movieTitle);
      return next;
    });

    const previousUnwatched = [...userData.unwatched];
    let updatedUnwatched = [...userData.unwatched];

    if (isCurrentlyWatched) {
      updatedUnwatched.push(movieTitle);
    } else {
      updatedUnwatched = updatedUnwatched.filter((m) => m !== movieTitle);
    }

    setUserData({
      ...userData,
      unwatched: updatedUnwatched,
    });

    const endpoint = isCurrentlyWatched ? 'unwatch' : 'watch';
    try {
      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ movie: movieTitle }),
      });
      
      if (!response.ok) throw new Error('Database transaction failed.');
      await fetchLatestUserHistory(session.access_token);
    } catch (err) {
      setError(`Failed updating watch status for: "${movieTitle}". Reverting state.`);
      setUserData({
        ...userData,
        unwatched: previousUnwatched,
      });
    } finally {
      setUpdatingMovies((prev) => {
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
    // 🚀 Reset visible count to start back at 3 for a new query
    setVisibleComboCount(5);

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
        setError(data.detail || 'Failed to get vector blending recommendations.');
      }
    } catch (err) {
      setError('An error occurred while computing neural similarity vectors.');
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

  const filteredComboMovies = movies.filter(movie =>
    movie.toLowerCase().includes(comboDropdownSearch.toLowerCase())
  );

  // 🚀 Slice the lists using the new numeric count states
  const displayedPersonalizedList = userData?.personalized_recommendations 
    ? userData.personalized_recommendations.slice(0, visiblePersonalizedCount)
    : [];

  const displayedComboList = recommendations.slice(0, visibleComboCount);

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 font-sans flex flex-col justify-center items-center">
      <div className="max-w-xl w-full mx-auto">
        
        {/* --- SCREEN STATE 1: SECURED ACCOUNT PRIVACY LOCKSCREEN --- */}
        {!session ? (
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-8 space-y-6">
            <div className="text-center">
              <div className="text-5xl mb-3">🔐</div>
              <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
                {isRegistering ? 'Create Private Account' : 'Sign In Required'}
              </h1>
              <p className="text-sm text-slate-400 mt-2">
                {isRegistering 
                  ? 'Sign up to build personal recommendations records securely.' 
                  : 'Access your private watchlist and analytics profiles.'}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-900/50 text-red-200 text-sm rounded-lg border border-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {isRegistering ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Choose Unique Username
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Naithik"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="yourname@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Email or Username
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Naithik OR user@domain.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl py-3 px-4 transition-all shadow-md disabled:opacity-50"
              >
                {authLoading ? 'Verifying Credentials...' : isRegistering ? 'Register & Account Setup' : 'Login Securely'}
              </button>
            </form>

            <div className="text-center border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                }}
                className="text-xs text-rose-400 hover:underline hover:text-rose-300 transition-colors font-medium"
              >
                {isRegistering 
                  ? 'Already have an encrypted account? Sign In' 
                  : "Don't have a private account? Sign Up Here"}
              </button>
            </div>
          </div>
        ) : (
          /* --- SCREEN STATE 2: AUTHENTICATED SYSTEM PORTAL INTERFACE --- */
          <div className="space-y-6">
            
            <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-100">
                  👋 Welcome Back, {userData?.name || 'User'}!
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Session protected by Supabase Row-Level Security Policies.
                </p>
              </div>
              <button 
                onClick={handleLogout}
                className="text-xs font-bold text-slate-300 hover:bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 transition-colors"
              >
                Sign Out
              </button>
            </div>

            {/* NAVIGATION TAB CONTROLLER */}
            <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('recommendations')}
                className={`py-2.5 px-4 text-sm font-bold border-b-2 transition-all shrink-0 ${
                  activeTab === 'recommendations'
                    ? 'border-rose-500 text-slate-100'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                ✨ Recommendations
              </button>
              <button
                onClick={() => setActiveTab('combo')}
                className={`py-2.5 px-4 text-sm font-bold border-b-2 transition-all shrink-0 ${
                  activeTab === 'combo'
                    ? 'border-rose-500 text-slate-100'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                🧪 Similar Movies
              </button>
              <button
                onClick={() => setActiveTab('watchlist')}
                className={`py-2.5 px-4 text-sm font-bold border-b-2 transition-all shrink-0 ${
                  activeTab === 'watchlist'
                    ? 'border-rose-500 text-slate-100'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                📋 Watchlist ({movies.length - (userData?.unwatched?.length || 0)} Watched)
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2.5 px-4 text-sm font-bold border-b-2 transition-all shrink-0 ${
                  activeTab === 'settings'
                    ? 'border-rose-500 text-slate-100'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                ⚙️ Settings
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-900/50 text-red-200 text-sm rounded-lg border border-red-800">
                {error}
              </div>
            )}

            {/* TAB SECTION A: CORE SYSTEM PERSONALIZED RECOMMENDATIONS */}
            {activeTab === 'recommendations' && (
              <div className="space-y-6">
                {userData?.personalized_recommendations && userData.personalized_recommendations.length > 0 ? (
                  <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6">
                    <h2 className="text-md font-bold text-slate-100 mb-1">
                      ✨ Tailored Specially For You
                    </h2>
                    <p className="text-xs text-slate-400 mb-4">
                      Based on your live profile tracking history vectors:
                    </p>
                    
                    {/* Displayed List Sliced Dynamically */}
                    <div className="space-y-3">
                      {displayedPersonalizedList.map((item) => (
                        <div key={item.movie} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="font-semibold text-slate-200">🎬 {item.movie}</span>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-900">
                            {Math.round(item.score * 100)}% Match
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* 🚀 PAGINATION BUTTON: Keep adding 5 more movies on every press */}
                    {userData.personalized_recommendations.length > visiblePersonalizedCount && (
                      <div className="mt-4 flex gap-2 justify-center">
                        <button
                          onClick={() => setVisiblePersonalizedCount((prev) => prev + 5)}
                          className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors border border-rose-900/50 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900"
                        >
                          ▼ Show 5 More Related Films
                        </button>
                        {visiblePersonalizedCount > 5 && (
                          <button
                            onClick={() => setVisiblePersonalizedCount(5)}
                            className="text-xs font-bold text-slate-400 hover:text-slate-300 transition-colors border border-slate-800/50 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900"
                          >
                            ▲ Reset to Top 5
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 text-center text-sm text-slate-400">
                    Switch to the Manage Watchlist tab and mark some films as Watched to generate your matches!
                  </div>
                )}
              </div>
            )}

            {/* TAB SECTION B: CUSTOM ARBITRARY COMBO MIXER MODULE */}
            {activeTab === 'combo' && (
              <div className="space-y-6">
                <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 space-y-4">
                  <div>
                    <h2 className="text-md font-bold text-slate-100 mb-1">🧪 Movie Similarity Engine</h2>
                    <p className="text-xs text-slate-400">Select multiple films by searching the system catalog indexes to generate predictions:</p>
                  </div>

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
                            <div className="text-xs text-slate-500 text-center py-2">No matching titles found in database.</div>
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
                    {loading ? 'Blending Keyword Vectors...' : 'Find Recommendations'}
                  </button>
                </div>

                {recommendations.length > 0 && (
                  <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6">
                    <h2 className="text-md font-bold text-slate-100 mb-3 pb-2 border-b border-slate-800">
                      Top Results for Selected Movies:
                    </h2>
                    
                    {/* Displayed List Sliced Dynamically */}
                    <div className="space-y-2">
                      {displayedComboList.map((item) => (
                        <div key={item.movie} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="font-medium text-slate-200">🍿 {item.movie}</span>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-900">
                            {Math.round(item.score * 100)}% Similarity
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* 🚀 PAGINATION BUTTON: Keep adding 5 more movies on every press */}
                    {recommendations.length > visibleComboCount && (
                      <div className="mt-4 flex gap-2 justify-center">
                        <button
                          onClick={() => setVisibleComboCount((prev) => prev + 5)}
                          className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors border border-rose-900/50 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900"
                        >
                          ▼ Show 5 More Related Films
                        </button>
                        {visibleComboCount > 3 && (
                          <button
                            onClick={() => setVisibleComboCount(3)}
                            className="text-xs font-bold text-slate-400 hover:text-slate-300 transition-colors border border-slate-800/50 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900"
                          >
                            ▲ Reset to Top 5
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB SECTION C: MANAGED OPTIMISTIC WATCHLIST ACTIONS */}
            {activeTab === 'watchlist' && (
              <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 space-y-4">
                <div>
                  <h2 className="text-md font-bold text-slate-100 mb-1">📋 Private Selection Library</h2>
                  <p className="text-xs text-slate-400">Click title cards rapidly to toggle watch logs:</p>
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
                    const isThisMovieUpdating = updatingMovies.has(movieName);

                    return (
                      <button
                        key={movieName}
                        onClick={() => handleToggleMovieWatch(movieName, isWatched)}
                        disabled={isThisMovieUpdating}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                          isWatched
                            ? 'bg-rose-500/10 border-rose-500 text-rose-200 hover:bg-rose-500/20'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                        } ${isThisMovieUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <span className="text-sm font-semibold truncate max-w-[75%]">
                          {isWatched ? '✅' : '🎬'} {movieName}
                        </span>
                        
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                          isWatched 
                            ? 'bg-rose-500 text-white' 
                            : 'bg-slate-800 text-slate-500'
                        }`}>
                          {isThisMovieUpdating ? 'Updating...' : isWatched ? 'Watched' : 'Unwatched'}
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

            {/* TAB SECTION D: SECURED ACCOUNT PROFILE SETTINGS */}
            {activeTab === 'settings' && (
              <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 space-y-4">
                <div>
                  <h2 className="text-md font-bold text-slate-100 mb-1">⚙️ Account Profiles & Credentials</h2>
                  <p className="text-xs text-slate-400">Modify your secure credentials or adjust your display name representation:</p>
                </div>

                {updateMessage && (
                  <div className="p-3 bg-emerald-950/60 text-emerald-300 text-xs rounded-xl border border-emerald-900">
                    {updateMessage}
                  </div>
                )}

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      New Username
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. NaithikPro"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={updateLoading || (!newUsername.trim() && !newPassword)}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl py-3 px-4 transition-all shadow-sm disabled:opacity-50"
                  >
                    {updateLoading ? 'Applying updates...' : 'Commit Changes'}
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