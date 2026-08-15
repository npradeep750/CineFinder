"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  FormEvent,
} from "react";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Search,
  Star,
  LogOut,
  Settings,
  Film,
  X,
  PlaySquare,
  CheckCircle2,
  Trash2,
  Sparkles,
  Loader2,
  Activity,
  Calendar,
  Info,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  Plus,
} from "lucide-react";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// --- Configuration & Types ---
const supabaseUrl = "https://kxqiovrdimaproigfeyc.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cWlvdnJkaW1hcHJvaWdmZXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5OTgwNTMsImV4cCI6MjA5OTU3NDA1M30.CMu84XvMMjVLeN_mWtzFbDni-oZGNmrBDRCDJ7L-Clo";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TMDB_CDN_BASE = "https://image.tmdb.org/t/p/w500";
const API_URL = "http://localhost:8000/api";
const TMDB_API_KEY = "901696f09bee18449863e03f2da050e0";

interface Movie {
  tmdb_id: number;
  title: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  score?: number;
  release_date?: string;
  keywords?: string[];
}

interface RatingItem extends Movie {
  rating: number; // 0.5 to 5.0 in increments of 0.5
  created_at?: string; // Timestamptz from the backend database
}

interface UserHistory {
  name: string;
  personalized_recommendations?: Movie[];
  ratings?: RatingItem[];
}

const LoadingSpinner = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex justify-center items-center p-12"
  >
    <div className="relative w-10 h-10">
      <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
      <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
    </div>
  </motion.div>
);

// Staggered entrance orchestration for recommendation grids
const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.03 },
  },
};

const cardItem: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

// Ambient animated background shared by the auth and app screens
const AnimatedBackground = () => (
  <div
    aria-hidden="true"
    className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
  >
    <div className="absolute inset-0 animated-grid" />
    <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-indigo-600/20 blur-[120px] animate-float-slow" />
    <div className="absolute -bottom-40 -right-32 w-[520px] h-[520px] rounded-full bg-fuchsia-600/15 blur-[130px] animate-float-slower" />
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[380px] h-[380px] rounded-full bg-cyan-500/10 blur-[120px] animate-float-slow" />
  </div>
);

// Animated number that eases toward its target
function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    const to = value;
    if (from === to) return;

    let frame = 0;
    const start = performance.now();
    const duration = 500;

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      } else {
        previous.current = to;
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{display}</>;
}

// Shimmering placeholder cards shown while user data loads
function SkeletonGrid({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-[2/3] rounded-2xl skeleton" />
      ))}
    </div>
  );
}

function MovieCard({
  movie,
  onAction,
  actionLabel,
  actionIcon: ActionIcon,
  matchScore,
  onCardClick,
}: {
  movie: Movie;
  onAction: () => void;
  actionLabel: string;
  actionIcon: any;
  matchScore?: number;
  onCardClick?: () => void;
}) {
  const matchPct =
    matchScore !== undefined ? Math.min(1, Math.max(0, matchScore)) : 0;

  return (
    <motion.div
      layout
      variants={cardItem}
      whileHover={{ y: -8, transition: { duration: 0.2, ease: "easeOut" } }}
      whileTap={{ scale: 0.98 }}
      onClick={onCardClick}
      className="group relative bg-[#090D16] rounded-2xl overflow-hidden border border-white/[0.06] hover:border-indigo-500/45 transition-all duration-300 cursor-pointer shadow-2xl flex flex-col h-full"
    >
      <div className="aspect-[2/3] bg-slate-900 relative overflow-hidden">
        {movie.poster_path ? (
          <img
            src={`${TMDB_CDN_BASE}${movie.poster_path}`}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-700">
            <Film size={40} strokeWidth={1.5} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
        <div className="shine" />

        {matchScore !== undefined && (
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.15,
            }}
            className="absolute top-3 right-3 bg-[#030712]/80 backdrop-blur-md rounded-full p-1.5 shadow-lg border border-emerald-500/20"
            title={`${(matchPct * 100).toFixed(0)}% match`}
          >
            <div className="relative w-9 h-9">
              <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="2.5"
                />
                <motion.circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={97.4}
                  initial={{ strokeDashoffset: 97.4 }}
                  animate={{ strokeDashoffset: 97.4 * (1 - matchPct) }}
                  transition={{ duration: 0.9, ease: "easeOut", delay: 0.25 }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-emerald-400">
                {(matchPct * 100).toFixed(0)}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#030712] via-[#030712]/90 to-transparent pt-8">
        <h3 className="text-sm font-semibold text-white line-clamp-1 tracking-tight mb-2">
          {movie.title}
        </h3>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 transform translate-y-1 group-hover:translate-y-0"
        >
          <ActionIcon size={13} /> {actionLabel}
        </div>
      </div>
    </motion.div>
  );
}

function RecommendationSection({
  title,
  subtitle,
  results,
  onAction,
  onCardClick,
}: {
  title: string;
  subtitle: string;
  results: Movie[];
  onAction: (id: number) => void;
  onCardClick: (id: number) => void;
}) {
  if (results.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
          {results.length}
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-4">{subtitle}</p>
      <motion.div
        layout
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      >
        {results.map((m) => (
          <MovieCard
            key={m.tmdb_id}
            movie={m}
            actionLabel="Add to Watchlist"
            actionIcon={CheckCircle2}
            matchScore={m.score}
            onAction={() => onAction(m.tmdb_id)}
            onCardClick={() => onCardClick(m.tmdb_id)}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}

function WatchlistCard({
  item,
  onRate,
  onUnwatch,
  onOpenDetails,
  isUpdating,
}: {
  item: RatingItem;
  onRate: (id: number, r: number) => void;
  onUnwatch: (id: number) => void;
  onOpenDetails: () => void;
  isUpdating: boolean;
}) {
  return (
    <motion.div
      layout
      layoutId={`watchlist-item-${item.tmdb_id}`}
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 12 }}
      transition={{ type: "spring", stiffness: 350, damping: 26 }}
      onClick={onOpenDetails}
      className="group relative p-[1px] rounded-2xl overflow-hidden transition-all duration-500 cursor-pointer"
    >
      <div
        className="absolute -inset-full bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,transparent_270deg,#6366f1_360deg)] opacity-0 group-hover:opacity-100 group-hover:animate-spin transition-opacity duration-500 pointer-events-none"
        style={{
          animationDuration: "3s",
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
        }}
      />

      <div className="relative flex flex-col bg-slate-900 rounded-[15px] border border-white/[0.08] group-hover:border-transparent transition-colors z-10 overflow-hidden h-full">
        <div className="relative aspect-[2/3] w-full bg-slate-950 overflow-hidden">
          {item.poster_path ? (
            <img
              src={`${TMDB_CDN_BASE}${item.poster_path}`}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-700">
              <Film size={32} />
            </div>
          )}

          <div className="shine" />

          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/20 to-transparent p-4">
            <h4 className="text-sm font-bold text-white line-clamp-1 drop-shadow-md">
              {item.title}
            </h4>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onUnwatch(item.tmdb_id);
            }}
            disabled={isUpdating}
            className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md text-slate-300 hover:text-rose-400 rounded-full transition-colors disabled:opacity-50 z-20 shadow-lg"
          >
            <Trash2 size={14} />
          </motion.button>
        </div>

        <div
          className="p-3.5 bg-slate-900/90 backdrop-blur-md flex items-center justify-between border-t border-white/[0.06]"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.span
            key={item.rating}
            initial={{ scale: 0.7, opacity: 0.4 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
          >
            Your Rating ({item.rating})
          </motion.span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => {
              return (
                <div key={star} className="relative flex items-center">
                  <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    disabled={isUpdating}
                    onClick={() => onRate(item.tmdb_id, star - 0.5)}
                    className={`w-2 h-4 overflow-hidden z-20 p-0 disabled:opacity-50 ${
                      item.rating >= star - 0.5
                        ? "text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                        : "text-slate-700 hover:text-amber-400/40"
                    }`}
                    title={`${star - 0.5} stars`}
                  >
                    <div className="w-4 h-4 -ml-0 flex items-center justify-center">
                      <Star
                        size={14}
                        fill={
                          item.rating >= star - 0.5 ? "currentColor" : "none"
                        }
                      />
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    disabled={isUpdating}
                    onClick={() => onRate(item.tmdb_id, star)}
                    className={`w-2 h-4 overflow-hidden z-20 p-0 disabled:opacity-50 ${
                      item.rating >= star
                        ? "text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                        : "text-slate-700 hover:text-amber-400/40"
                    }`}
                    title={`${star} stars`}
                  >
                    <div className="w-4 h-4 -ml-2 flex items-center justify-center">
                      <Star
                        size={14}
                        fill={item.rating >= star ? "currentColor" : "none"}
                      />
                    </div>
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function CineFinder() {
  const [session, setSession] = useState<any>(null);
  const [userData, setUserData] = useState<UserHistory | null>(null);
  const [activeTab, setActiveTab] = useState<
    "foryou" | "combo" | "watchlist" | "settings"
  >("watchlist");
  const [isUpdating, setIsUpdating] = useState(false);

  // Watchlist Search & Filter State
  const [watchlistSearchQuery, setWatchlistSearchQuery] = useState("");
  const [watchlistSuggestions, setWatchlistSuggestions] = useState<Movie[]>([]);
  const [isWatchlistDropdownOpen, setIsWatchlistDropdownOpen] = useState(false);
  const [isSearchingWatchlistApi, setIsSearchingWatchlistApi] = useState(false);

  // Expanded Advanced Filter Drawer State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<
    "recent" | "rating-desc" | "rating-asc" | "title"
  >("rating-desc"); // <-- Set default filter to highest rated

  // Selected Movie Modal State
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // Auth state
  const [isRegistering, setIsRegistering] = useState(false);
  const [authForm, setAuthForm] = useState({
    identifier: "",
    email: "",
    password: "",
    username: "",
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState("");

  // Combo Search State
  const [comboSearchQuery, setComboSearchQuery] = useState("");
  const [comboSuggestions, setComboSuggestions] = useState<Movie[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchingCombo, setIsSearchingCombo] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState<Movie[]>([]);
  const [keywordResults, setKeywordResults] = useState<Movie[]>([]);
  const [hybridResults, setHybridResults] = useState<Movie[]>([]);
  const [isBlending, setIsBlending] = useState(false);

  // Settings state
  const [newUsername, setNewUsername] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");

  // Toast notifications (visual feedback cues)
  const [toasts, setToasts] = useState<
    { id: number; message: string; tone: "success" | "info" }[]
  >([]);
  const toastCounter = useRef(0);

  const pushToast = useCallback(
    (message: string, tone: "success" | "info" = "success") => {
      const id = ++toastCounter.current;
      setToasts((prev) => [...prev, { id, message, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2800);
    },
    [],
  );

  // Filtered & Sorted Watchlist logic (sorting 'recent' via created_at timestamptz)
  const allRatings = userData?.ratings || [];

  // Check if a movie is already in watchlist
  const isInWatchlist = (tmdbId: number) => {
    return allRatings.some((item) => item.tmdb_id === tmdbId);
  };

  // Current rating for the open movie details modal
  const selectedRating = selectedMovie
    ? allRatings.find((item) => item.tmdb_id === selectedMovie.tmdb_id)
        ?.rating ?? 0
    : 0;

  const filteredAndSortedRatings = allRatings
    .filter((item) => {
      // Rating filter
      if (item.rating < minRatingFilter) return false;
      // Search text filter
      if (watchlistSearchQuery.trim()) {
        return item.title
          .toLowerCase()
          .includes(watchlistSearchQuery.toLowerCase().trim());
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "rating-desc") return b.rating - a.rating;
      if (sortBy === "rating-asc") return a.rating - b.rating;
      if (sortBy === "title") return a.title.localeCompare(b.title);

      // 'recent' sorting using created_at timestamptz (newest first)
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

  // TMDB API Search for Watchlist (to find new movies to add directly)
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!watchlistSearchQuery.trim()) {
        setWatchlistSuggestions([]);
        return;
      }
      setIsSearchingWatchlistApi(true);
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(watchlistSearchQuery)}&include_adult=false`,
        );
        const data = await res.json();
        const movies = data.results.slice(0, 5).map((m: any) => ({
          tmdb_id: m.id,
          title: m.title,
          poster_path: m.poster_path,
          backdrop_path: m.backdrop_path,
          overview: m.overview,
          release_date: m.release_date,
          score: m.vote_average,
        }));
        setWatchlistSuggestions(movies);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingWatchlistApi(false);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [watchlistSearchQuery]);

  const getMetadataRadarChartData = () => {
    if (selectedCombo.length === 0) return [];

    let totalScore = 0;
    let totalRecency = 0;
    let totalKeywords = 0;
    let totalTitleLength = 0;
    const currentYear = new Date().getFullYear();

    selectedCombo.forEach((movie) => {
      const scoreVal = movie.score !== undefined ? movie.score : 0.5;
      totalScore += scoreVal <= 1 ? scoreVal * 100 : (scoreVal / 10) * 100;

      let year = currentYear;
      if (movie.release_date) {
        const parsedYear = parseInt(movie.release_date.split("-")[0]);
        if (!isNaN(parsedYear)) year = parsedYear;
      }
      const minYear = 1950;
      const recencyNormalized = Math.max(
        0,
        Math.min(100, ((year - minYear) / (currentYear - minYear)) * 100),
      );
      totalRecency += recencyNormalized;

      const kwCount = movie.keywords ? movie.keywords.length : 0;
      totalKeywords += Math.min(100, (kwCount / 20) * 100);

      const titleLen = movie.title ? movie.title.length : 0;
      totalTitleLength += Math.min(100, (titleLen / 30) * 100);
    });

    const count = selectedCombo.length;
    return [
      { genre: "Score Index", value: Math.round(totalScore / count) },
      { genre: "Release Recency", value: Math.round(totalRecency / count) },
      { genre: "Keyword Richness", value: Math.round(totalKeywords / count) },
      { genre: "Title Length", value: Math.round(totalTitleLength / count) },
    ];
  };

  const genreRadarData = getMetadataRadarChartData();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#090D16] border border-white/10 px-3 py-2 rounded-xl shadow-2xl text-xs font-medium text-slate-200">
          {`${payload[0].payload.genre}: ${payload[0].value}%`}
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.access_token) fetchUserData(session.access_token);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.access_token) fetchUserData(session.access_token);
      else setUserData(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/user-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      }
    } catch (err) {
      console.error("Failed fetching user history:", err);
    }
  };

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError("");
    try {
      if (isRegistering) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: { data: { username: authForm.username } },
        });
        if (signUpError) throw signUpError;
        if (data.user)
          await supabase
            .from("profiles")
            .insert([{ id: data.user.id, username: authForm.username }]);
      } else {
        const loginEmail = authForm.identifier.includes("@")
          ? authForm.identifier
          : `${authForm.identifier.trim().toLowerCase()}@placeholder.com`;
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: authForm.password,
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const openMovieDetails = async (tmdb_id: number) => {
    setIsModalLoading(true);
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${tmdb_id}?api_key=${TMDB_API_KEY}`,
      );
      if (res.ok) {
        const data = await res.json();
        setSelectedMovie({
          tmdb_id: data.id,
          title: data.title,
          poster_path: data.poster_path,
          backdrop_path: data.backdrop_path,
          overview: data.overview,
          score: data.vote_average,
          release_date: data.release_date,
        });
      }
    } catch (err) {
      console.error("Failed to fetch movie details:", err);
    } finally {
      setIsModalLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!comboSearchQuery.trim()) {
        setComboSuggestions([]);
        return;
      }
      setIsSearchingCombo(true);
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(comboSearchQuery)}&include_adult=false`,
        );
        const data = await res.json();
        const movies = data.results.slice(0, 5);

        const mapped = await Promise.all(
          movies.map(async (m: any) => {
            let kwList: string[] = [];
            try {
              const kwRes = await fetch(
                `https://api.themoviedb.org/3/movie/${m.id}/keywords?api_key=${TMDB_API_KEY}`,
              );
              const kwData = await kwRes.json();
              if (kwData && kwData.keywords) {
                kwList = kwData.keywords.map((k: any) => k.name);
              }
            } catch (e) {}

            return {
              tmdb_id: m.id,
              title: m.title,
              poster_path: m.poster_path,
              backdrop_path: m.backdrop_path,
              overview: m.overview,
              release_date: m.release_date,
              score: m.vote_average,
              keywords: kwList,
            };
          }),
        );
        setComboSuggestions(mapped);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingCombo(false);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [comboSearchQuery]);

  const addToCombo = (movie: Movie) => {
    if (!selectedCombo.find((m) => m.tmdb_id === movie.tmdb_id)) {
      setSelectedCombo([...selectedCombo, movie]);
    }
    setComboSearchQuery("");
    setComboSuggestions([]);
    setIsDropdownOpen(false);
  };

  const generateBlend = async () => {
    if (selectedCombo.length === 0 || !session?.access_token) return;
    setIsBlending(true);
    try {
      const res = await fetch(`${API_URL}/recommend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tmdb_ids: selectedCombo.map((m) => m.tmdb_id) }),
      });
      if (res.ok) {
        const data = await res.json();
        const keywordMatches = data.keyword_recommendations || [];
        const hybridMatches = data.hybrid_recommendations || [];
        setKeywordResults(keywordMatches);
        setHybridResults(hybridMatches);
        pushToast(
          `Found ${keywordMatches.length + hybridMatches.length} matches`,
          "info",
        );
      }
    } catch (err) {
      console.error("Blend failed:", err);
      pushToast("Could not generate matches", "info");
    } finally {
      setIsBlending(false);
    }
  };

  const handleRate = async (tmdb_id: number, rating: number) => {
    if (!session?.access_token) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_URL}/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tmdb_id, rating }),
      });
      if (res.ok) {
        fetchUserData(session.access_token);
        pushToast(
          rating === 0 ? "Rating removed" : `Saved ${rating}★ rating`,
          "success",
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnwatch = async (tmdb_id: number) => {
    if (!session?.access_token) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_URL}/unwatch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tmdb_id }),
      });
      if (res.ok) {
        fetchUserData(session.access_token);
        pushToast("Removed from your watchlist", "success");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center p-4 relative isolate font-sans">
        <AnimatedBackground />

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-sm relative z-10"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#090D16] border border-white/10 shadow-2xl mb-3">
              <PlaySquare className="text-indigo-500" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              CineFinder
            </h1>
          </div>

          <div className="bg-[#090D16]/90 backdrop-blur-2xl rounded-3xl p-8 border border-white/[0.08] shadow-2xl">
            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                <X size={14} /> {error}
              </div>
            )}
            <form onSubmit={handleAuth} className="space-y-3.5">
              <AnimatePresence>
                {isRegistering && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-3.5 overflow-hidden"
                  >
                    <input
                      type="text"
                      placeholder="Username"
                      required
                      className="w-full bg-[#030712] border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/50 transition-colors"
                      onChange={(e) =>
                        setAuthForm({ ...authForm, username: e.target.value })
                      }
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      required
                      className="w-full bg-[#030712] border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/50 transition-colors"
                      onChange={(e) =>
                        setAuthForm({ ...authForm, email: e.target.value })
                      }
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              {!isRegistering && (
                <input
                  type="text"
                  placeholder="Username or Email"
                  required
                  className="w-full bg-[#030712] border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/50 transition-colors"
                  onChange={(e) =>
                    setAuthForm({ ...authForm, identifier: e.target.value })
                  }
                />
              )}
              <input
                type="password"
                placeholder="Password"
                required
                className="w-full bg-[#030712] border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/50 transition-colors"
                onChange={(e) =>
                  setAuthForm({ ...authForm, password: e.target.value })
                }
              />
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={authLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl py-3 mt-2 transition-colors shadow-lg shadow-indigo-600/20"
              >
                {authLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : isRegistering ? (
                  "Create Account"
                ) : (
                  "Log In"
                )}
              </motion.button>
            </form>

            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
              }}
              className="w-full mt-5 text-slate-400 hover:text-white text-xs transition-colors"
            >
              {isRegistering
                ? "Already have an account? Log in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 font-sans selection:bg-indigo-500/30 relative isolate">
      <AnimatedBackground />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#030712]/70 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <PlaySquare size={14} className="text-white" />
            </div>
            <span className="font-bold tracking-tight text-white hidden sm:inline">
              CineFinder
            </span>
          </div>

          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-1 bg-[#090D16] p-1 rounded-full border border-white/[0.06] relative">
              {[
                { id: "foryou", label: "For You" },
                { id: "combo", label: "Combo Search" },
                { id: "watchlist", label: "Watchlist" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative px-4 py-1.5 text-xs font-medium transition-colors z-10 ${
                    activeTab === tab.id
                      ? "text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-indigo-600 rounded-full shadow-md -z-10"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2 pl-4 border-l border-white/[0.08]">
              <button
                onClick={() => setActiveTab("settings")}
                className={`p-2 rounded-full transition-colors ${
                  activeTab === "settings"
                    ? "text-indigo-400 bg-indigo-500/10"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Settings size={18} />
              </button>
              <button
                onClick={() => supabase.auth.signOut()}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 pb-24 relative">
        <AnimatePresence mode="wait">
          {/* --- FOR YOU TAB --- */}
          {activeTab === "foryou" && (
            <motion.div
              key="foryou"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
                  Personalized for You
                </h2>
                <p className="text-sm text-slate-400">
                  Curated recommendations based on your highest-rated movies.
                </p>
              </div>

              {!userData ? (
                <SkeletonGrid />
              ) : userData.personalized_recommendations?.length ? (
                <motion.div
                  layout
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                >
                  {userData.personalized_recommendations.map((m) => (
                    <MovieCard
                      key={m.tmdb_id}
                      movie={m}
                      actionLabel="Add to Watchlist"
                      actionIcon={CheckCircle2}
                      matchScore={m.score}
                      onAction={() => handleRate(m.tmdb_id, 5)}
                      onCardClick={() => openMovieDetails(m.tmdb_id)}
                    />
                  ))}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-[#090D16]/50 border border-white/[0.06] rounded-3xl border-dashed">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
                    <Star className="text-slate-500" size={20} />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">
                    No recommendations yet
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mb-5">
                    Rate items in your watchlist to generate personalized
                    suggestions.
                  </p>
                  <button
                    onClick={() => setActiveTab("combo")}
                    className="px-5 py-2 bg-white text-black text-xs font-semibold rounded-full hover:bg-slate-200 transition-colors"
                  >
                    Start Searching
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* --- COMBO SEARCH TAB --- */}
          {activeTab === "combo" && (
            <motion.div
              key="combo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
                  Combo Search
                </h2>
                <p className="text-sm text-slate-400">
                  Select multiple movies to generate a blended recommendation
                  vector.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                <div className="lg:col-span-2 bg-[#090D16] border border-white/[0.06] rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
                  <div>
                    <div className="relative z-50 mb-4">
                      <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder="Search for a movie..."
                        value={comboSearchQuery}
                        onChange={(e) => setComboSearchQuery(e.target.value)}
                        onFocus={() => setIsDropdownOpen(true)}
                        onBlur={() =>
                          setTimeout(() => setIsDropdownOpen(false), 200)
                        }
                        className="w-full bg-[#030712] border border-white/10 text-white rounded-xl pl-11 pr-10 py-3 text-sm focus:border-indigo-500/50 outline-none transition-all"
                      />
                      {isSearchingCombo && (
                        <Loader2
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 animate-spin"
                          size={14}
                        />
                      )}

                      <AnimatePresence>
                        {isDropdownOpen && comboSuggestions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-[#090D16] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl"
                          >
                            {comboSuggestions.map((m) => (
                              <div
                                key={m.tmdb_id}
                                onClick={() => addToCombo(m)}
                                className="flex items-center gap-3 p-2.5 hover:bg-white/5 cursor-pointer border-b border-white/[0.04] last:border-0 transition-colors"
                              >
                                <div className="w-8 h-12 bg-slate-900 rounded shrink-0 overflow-hidden">
                                  {m.poster_path ? (
                                    <img
                                      src={`${TMDB_CDN_BASE}${m.poster_path}`}
                                      alt={m.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                                      <Film size={14} />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-white">
                                    {m.title}
                                  </div>
                                  {m.release_date && (
                                    <div className="text-[10px] text-slate-400">
                                      {m.release_date.split("-")[0]}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <motion.div layout className="flex flex-wrap gap-2">
                      {selectedCombo.length === 0 && (
                        <span className="text-xs text-slate-500 py-1">
                          Add movies to start blending...
                        </span>
                      )}
                      <AnimatePresence>
                        {selectedCombo.map((movie) => (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            key={movie.tmdb_id}
                            className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-medium"
                          >
                            {movie.title}
                            <button
                              onClick={() =>
                                setSelectedCombo(
                                  selectedCombo.filter(
                                    (m) => m.tmdb_id !== movie.tmdb_id,
                                  ),
                                )
                              }
                              className="hover:text-white transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  </div>

                  <div className="mt-8 pt-5 border-t border-white/[0.06] flex justify-end">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={generateBlend}
                      disabled={selectedCombo.length === 0 || isBlending}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl px-5 py-2.5 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-600/20"
                    >
                      {isBlending ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Sparkles size={16} />
                      )}{" "}
                      Generate Blended Matches
                    </motion.button>
                  </div>
                </div>

                <div className="bg-[#090D16] border border-white/[0.06] rounded-3xl p-6 shadow-2xl flex flex-col">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <Activity size={14} className="text-indigo-400" /> Metadata
                    Profile
                  </div>
                  <div className="flex-1 flex items-center justify-center min-h-[220px] w-full">
                    {selectedCombo.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          data={genreRadarData}
                          outerRadius="100%"
                          margin={{ top: 35, right: 55, bottom: 35, left: 55 }}
                        >
                          <PolarGrid
                            stroke="rgba(226, 232, 240, 0.20)"
                            strokeWidth={2}
                          />

                          <PolarAngleAxis
                            dataKey="genre"
                            tick={({ payload, x, y, textAnchor }) => {
                              const words = payload.value.split(" ");

                              const offsetY =
                                textAnchor === "middle"
                                  ? Number(y) < 150
                                    ? -10
                                    : 10
                                  : 0;

                              return (
                                <text
                                  x={x}
                                  y={Number(y) + offsetY}
                                  textAnchor={textAnchor}
                                  fill="#94a3b8"
                                  fontSize={12}
                                >
                                  {words.map((word: string, index: number) => (
                                    <tspan
                                      key={index}
                                      x={x}
                                      dy={index === 0 ? 0 : 13}
                                    >
                                      {word}
                                    </tspan>
                                  ))}
                                </text>
                              );
                            }}
                          />

                          <Tooltip content={<CustomTooltip />} />

                          <Radar
                            name="Metadata Profile"
                            dataKey="value"
                            stroke="#6366f1"
                            fill="#6366f1"
                            fillOpacity={0.3}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-slate-500 text-center px-4">
                        Add movies to visualize their structural metadata
                        footprint.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isBlending ? (
                <LoadingSpinner />
              ) : (
                <div className="space-y-12">
                  <RecommendationSection
                    title="Keyword Matches"
                    subtitle="Recommended by TMDB keyword similarity alone."
                    results={keywordResults}
                    onAction={(id) => handleRate(id, 5)}
                    onCardClick={openMovieDetails}
                  />
                  <RecommendationSection
                    title="Hybrid Matches"
                    subtitle="Recommended by keywords, genres, and ratings/popularity."
                    results={hybridResults}
                    onAction={(id) => handleRate(id, 5)}
                    onCardClick={openMovieDetails}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* --- WATCHLIST TAB --- */}
          {activeTab === "watchlist" && (
            <motion.div
              key="watchlist"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
                    Your Watchlist
                  </h2>
                  <p className="text-sm text-slate-400">
                    Filter your list or search TMDB to add new movies instantly.
                  </p>
                </div>

                {/* Collapsible Filter Toggle Button */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold border transition-all shadow-lg self-start sm:self-auto ${
                    isFilterOpen || minRatingFilter > 0 || sortBy !== "recent"
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/20"
                      : "bg-[#090D16] text-slate-300 border-white/[0.06] hover:border-white/20"
                  }`}
                >
                  <SlidersHorizontal size={14} />
                  <span>Filter & Sort</span>
                  {(minRatingFilter > 0 || sortBy !== "recent") && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 ml-1" />
                  )}
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-300 ${
                      isFilterOpen ? "rotate-180" : ""
                    }`}
                  />
                </motion.button>
              </div>

              {/* Integrated Watchlist Searchbar & TMDB Add Engine */}
              <div className="relative z-40 mb-6">
                <div className="relative">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Search your watchlist or type to find & add new movies from TMDB..."
                    value={watchlistSearchQuery}
                    onChange={(e) => {
                      setWatchlistSearchQuery(e.target.value);
                      setIsWatchlistDropdownOpen(true);
                    }}
                    onFocus={() => setIsWatchlistDropdownOpen(true)}
                    className="w-full bg-[#090D16] border border-white/[0.08] text-white rounded-2xl pl-11 pr-10 py-3.5 text-sm focus:border-indigo-500/50 outline-none transition-all shadow-xl"
                  />
                  {isSearchingWatchlistApi && (
                    <Loader2
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 animate-spin"
                      size={16}
                    />
                  )}
                  {watchlistSearchQuery && !isSearchingWatchlistApi && (
                    <button
                      onClick={() => setWatchlistSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* TMDB Search Dropdown for Adding New Movies */}
                <AnimatePresence>
                  {isWatchlistDropdownOpen &&
                    watchlistSearchQuery.trim() &&
                    watchlistSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[#090D16] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl divide-y divide-white/[0.04]"
                      >
                        <div className="px-4 py-2 bg-slate-900/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Discover on TMDB to Add</span>
                          <button
                            onClick={() => setIsWatchlistDropdownOpen(false)}
                            className="hover:text-white"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        {watchlistSuggestions.map((m) => {
                          const alreadyAdded = isInWatchlist(m.tmdb_id);
                          return (
                            <div
                              key={m.tmdb_id}
                              className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                            >
                              <div
                                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                                onClick={() => {
                                  openMovieDetails(m.tmdb_id);
                                  setIsWatchlistDropdownOpen(false);
                                }}
                              >
                                <div className="w-9 h-13 bg-slate-900 rounded shrink-0 overflow-hidden">
                                  {m.poster_path ? (
                                    <img
                                      src={`${TMDB_CDN_BASE}${m.poster_path}`}
                                      alt={m.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                                      <Film size={14} />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-white truncate">
                                    {m.title}
                                  </div>
                                  {m.release_date && (
                                    <div className="text-[10px] text-slate-400">
                                      {m.release_date.split("-")[0]}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="pl-4">
                                {alreadyAdded ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                    <CheckCircle2 size={12} /> Added
                                  </span>
                                ) : (
                                  <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRate(m.tmdb_id, 3.0); // Default add rating to 3 stars
                                    }}
                                    disabled={isUpdating}
                                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
                                  >
                                    <Plus size={13} /> Add
                                  </motion.button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                </AnimatePresence>
              </div>

              {/* Expandable Advanced Filter Drawer */}
              <AnimatePresence>
                {isFilterOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                    animate={{ height: "auto", opacity: 1, marginBottom: 24 }}
                    exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="bg-[#090D16] border border-white/[0.08] rounded-3xl p-6 shadow-2xl space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Rating Slider Filter */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Star size={13} className="text-amber-400" />{" "}
                              Minimum Rating
                            </label>
                            <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                              {minRatingFilter === 0
                                ? "All Ratings"
                                : `${minRatingFilter}+ Stars`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.5"
                            value={minRatingFilter}
                            onChange={(e) =>
                              setMinRatingFilter(parseFloat(e.target.value))
                            }
                            className="w-full accent-indigo-500 bg-slate-900 cursor-pointer h-2 rounded-lg"
                          />
                          <div className="flex justify-between text-[10px] text-slate-500 font-medium px-1">
                            <span>0 (All)</span>
                            <span>2.5</span>
                            <span>5.0</span>
                          </div>
                        </div>

                        {/* Sorting Options */}
                        <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <SlidersHorizontal
                              size={13}
                              className="text-indigo-400"
                            />{" "}
                            Sort Order
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: "rating-desc", label: "Highest Rated" },
                              { id: "recent", label: "Recently Added" },
                              { id: "rating-asc", label: "Lowest Rated" },
                              { id: "title", label: "Alphabetical" },
                            ].map((sortOption) => (
                              <button
                                key={sortOption.id}
                                onClick={() => setSortBy(sortOption.id as any)}
                                className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors border ${
                                  sortBy === sortOption.id
                                    ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                                    : "bg-[#030712] border-white/5 text-slate-400 hover:text-white"
                                }`}
                              >
                                {sortOption.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Filter Controls Bottom Bar with Reset Button */}
                      <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          Showing{" "}
                          <strong className="text-white">
                            <CountUp value={filteredAndSortedRatings.length} />
                          </strong>{" "}
                          of{" "}
                          <strong className="text-white">
                            {allRatings.length}
                          </strong>{" "}
                          movies
                        </span>

                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => {
                            setMinRatingFilter(0);
                            setSortBy("rating-desc"); // <-- Reset to highest rated instead of recent
                            setWatchlistSearchQuery("");
                          }}
                          disabled={
                            minRatingFilter === 0 &&
                            sortBy === "rating-desc" && // <-- Match disabled check to default
                            !watchlistSearchQuery
                          }
                          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 disabled:opacity-40 disabled:hover:bg-slate-800/80 text-xs font-semibold rounded-xl border border-white/10 transition-all shadow-lg"
                        >
                          <RotateCcw size={13} className="text-indigo-400" />
                          <span>Reset Filters</span>
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!userData ? (
                <SkeletonGrid />
              ) : filteredAndSortedRatings.length > 0 ? (
                <motion.div
                  layout
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredAndSortedRatings.map((item) => (
                      <WatchlistCard
                        key={item.tmdb_id}
                        item={item}
                        onRate={handleRate}
                        onUnwatch={handleUnwatch}
                        onOpenDetails={() => openMovieDetails(item.tmdb_id)}
                        isUpdating={isUpdating}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-[#090D16]/50 border border-white/[0.06] rounded-3xl border-dashed">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
                    <Film className="text-slate-500" size={20} />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">
                    {allRatings.length > 0
                      ? "No movies match your filter/search"
                      : "Your Watchlist is empty"}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mb-5 text-center">
                    {allRatings.length > 0
                      ? "Try clearing your search query or lowering your rating filter."
                      : "Use the search bar above to find and add movies or rate recommendations."}
                  </p>
                  {allRatings.length > 0 ? (
                    <button
                      onClick={() => {
                        setMinRatingFilter(0);
                        setSortBy("recent");
                        setWatchlistSearchQuery("");
                      }}
                      className="px-5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-full hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
                    >
                      <RotateCcw size={13} /> Reset Filters
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveTab("combo")}
                      className="px-5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-full hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
                    >
                      Find Movies
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* --- SETTINGS TAB --- */}
          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-sm mx-auto mt-10"
            >
              <div className="bg-[#090D16] border border-white/[0.06] rounded-3xl p-6 shadow-2xl">
                <h2 className="text-lg font-bold text-white mb-5">
                  Account Settings
                </h2>
                <form className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      placeholder={userData?.name || "New Username"}
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full bg-[#030712] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/50 transition-colors"
                    />
                  </div>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setUpdateMessage("Updated successfully!");
                      pushToast("Profile updated", "success");
                    }}
                    className="w-full bg-indigo-600 text-white font-semibold text-xs rounded-xl py-3 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
                  >
                    Save Changes
                  </motion.button>
                  {updateMessage && (
                    <p className="text-emerald-400 text-xs text-center mt-2 font-medium">
                      {updateMessage}
                    </p>
                  )}
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- MOVIE DETAILS MODAL --- */}
      <AnimatePresence>
        {selectedMovie && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMovie(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#090D16] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[90vh] flex flex-col"
            >
              <button
                onClick={() => setSelectedMovie(null)}
                className="absolute top-4 right-4 z-20 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
              >
                <X size={16} />
              </button>

              <div className="relative h-64 sm:h-72 w-full bg-slate-950 overflow-hidden shrink-0">
                {selectedMovie.backdrop_path || selectedMovie.poster_path ? (
                  <img
                    src={`${TMDB_CDN_BASE}${selectedMovie.backdrop_path || selectedMovie.poster_path}`}
                    alt={selectedMovie.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-700">
                    <Film size={48} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#090D16] via-[#090D16]/40 to-transparent" />

                <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
                      {selectedMovie.title}
                    </h2>
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
                      {selectedMovie.release_date && (
                        <span className="flex items-center gap-1.5 text-indigo-400">
                          <Calendar size={14} />{" "}
                          {selectedMovie.release_date.split("-")[0]}
                        </span>
                      )}
                      {selectedMovie.score !== undefined && (
                        <span className="flex items-center gap-1.5 text-amber-400">
                          <Star size={14} fill="currentColor" />{" "}
                          {selectedMovie.score.toFixed(1)} / 10
                        </span>
                      )}
                    </div>
                  </div>

                  {!isInWatchlist(selectedMovie.tmdb_id) && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleRate(selectedMovie.tmdb_id, 3.0)}
                      disabled={isUpdating}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
                    >
                      <Plus size={14} /> Add to Watchlist
                    </motion.button>
                  )}
                </div>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Info size={14} className="text-indigo-400" /> Synopsis
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {selectedMovie.overview ||
                      "No synopsis available for this title."}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Star size={14} className="text-amber-400" /> Your Rating
                  </h3>
                  {isInWatchlist(selectedMovie.tmdb_id) ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <motion.button
                            key={star}
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.85 }}
                            onClick={() => handleRate(selectedMovie.tmdb_id, star)}
                            disabled={isUpdating}
                            className={`transition-colors disabled:opacity-50 ${
                              selectedRating >= star
                                ? "text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                                : "text-slate-700 hover:text-amber-400/50"
                            }`}
                            title={`${star} stars`}
                          >
                            <Star
                              size={22}
                              fill={selectedRating >= star ? "currentColor" : "none"}
                            />
                          </motion.button>
                        ))}
                      </div>
                      <motion.span
                        key={selectedRating}
                        initial={{ scale: 0.7, opacity: 0.4 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 18 }}
                        className="text-sm font-bold text-amber-400"
                      >
                        {selectedRating.toFixed(1)}
                      </motion.span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Add this movie to your watchlist to give it a rating.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="pointer-events-auto flex items-center gap-2 bg-[#090D16]/95 border border-white/10 backdrop-blur-xl text-xs font-semibold text-slate-200 rounded-xl pl-3 pr-4 py-2.5 shadow-2xl max-w-xs"
            >
              {toast.tone === "success" ? (
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              ) : (
                <Info size={14} className="text-indigo-400 shrink-0" />
              )}
              <span className="leading-snug">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
