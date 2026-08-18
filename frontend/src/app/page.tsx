"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
  type RefObject,
  type FormEvent,
  type ReactNode,
} from "react";
import { createClient } from "@supabase/supabase-js";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
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
  Mail,
  KeyRound,
  ShieldCheck,
  ChevronRight,
  Award,
  UserRound,
} from "lucide-react";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  attachTilt,
  attachMagnetic,
  attachRipple,
  revealWords,
  sparkleBurst,
} from "@/lib/premium";

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
    <div className="relative flex flex-col items-center gap-3">
      <CameraReel size={34} />
      <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">
        <span className="rec-dot inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
        Rolling…
      </span>
    </div>
  </motion.div>
);

// Staggered entrance orchestration for recommendation grids
const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.075, delayChildren: 0.08 },
  },
};

const cardItem: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.96, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 260, damping: 24, mass: 0.7 },
  },
};

// Real movie backdrops used as dim, drifting ambient art behind the app.
// Fetched once and cached so the login screen, tabs, and home share them.
let ambientBackdrops: string[] = [];
let ambientPromise: Promise<void> | null = null;

const ensureAmbientBackdrops = () => {
  if (!ambientPromise) {
    ambientPromise = (async () => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&vote_count.gte=500&page=1`,
        );
        const data = await res.json();
        ambientBackdrops = (data.results || [])
          .map((m: any) => m.backdrop_path)
          .filter(Boolean)
          .slice(0, 6);
      } catch (e) {
        ambientBackdrops = [];
      }
    })();
  }
  return ambientPromise;
};

// Cinematic ambient background: dimmed movie backdrops, film grain, a soft
// vignette, and film-sprocket strips on the edges — no gradient orbs.
const AnimatedBackground = () => {
  const [, forceRender] = useState(0);
  useEffect(() => {
    ensureAmbientBackdrops().then(() => forceRender((n) => n + 1));
  }, []);
  const bd = ambientBackdrops;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-[#0a0a10]"
    >
      {/* Ambient movie backdrops — dimmed, blurred, slowly drifting */}
      {bd[0] && (
        <div className="absolute -top-32 -left-48 h-[30rem] w-[52rem] opacity-[0.10] blur-2xl animate-float-slow">
          <img
            src={`${TMDB_CDN_BASE}${bd[0]}`}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}
      {bd[1] && (
        <div className="absolute -bottom-40 -right-48 h-[32rem] w-[54rem] opacity-[0.10] blur-2xl animate-float-slower">
          <img
            src={`${TMDB_CDN_BASE}${bd[1]}`}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}
      {bd[2] && (
        <div className="absolute top-[28%] left-1/2 -translate-x-1/2 h-[24rem] w-[46rem] opacity-[0.07] blur-3xl animate-float-reverse">
          <img
            src={`${TMDB_CDN_BASE}${bd[2]}`}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Faint color wash for depth (kept subtle — not a hard gradient) */}
      <div className="absolute inset-0 bg-[radial-gradient(110%_70%_at_50%_0%,rgba(30,27,75,0.28),transparent_62%)]" />

      {/* Film-sprocket strips along the page edges */}
      <div className="sprocket-strip absolute left-0 top-0 hidden h-full w-6 lg:block" />
      <div className="sprocket-strip absolute right-0 top-0 hidden h-full w-6 lg:block" />

      {/* Film grain + cinematic vignette */}
      <div className="film-grain absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_42%,transparent_52%,rgba(2,4,10,0.5)_100%)]" />
    </div>
  );
};

// Cinema marquee light strip along the clapboard's top edge
const MarqueeLights = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none flex h-7 items-center justify-between bg-black/25 px-3"
  >
    {Array.from({ length: 44 }).map((_, i) => (
      <span
        key={i}
        className="marquee-bulb"
        style={{ animationDelay: `${(i % 9) * 0.4}s` }}
      />
    ))}
  </div>
);

// Home-only scroll progress: a film-strip line of sprocket ticks at the bottom
// of the clapboard header that fills with chalk white as the page scrolls.
function FilmScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-white/10">
      {/* sprocket ticks */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0 10px, rgba(244,241,234,0.55) 10px 13px, transparent 13px 23px)",
        }}
      />
      {/* chalk-white fill */}
      <motion.div
        className="absolute inset-y-0 left-0 bg-[#f4f1ea] shadow-[0_0_8px_rgba(244,241,234,0.8)]"
        style={{ scaleX: scrollYProgress }}
      />
    </div>
  );
}

// --- Film clapboard components ---

// The pivoting top stick of a clapperboard, striped black & white.
// rotate is applied to the wrapping element; the stripes fill the stick.
function ClapperArm({
  className = "",
  idle = false,
  origin = "right",
  anim,
}: {
  className?: string;
  idle?: boolean;
  origin?: "left" | "right";
  anim?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`absolute ${className}`}
      style={{
        transformOrigin: origin === "right" ? "right center" : "left center",
      }}
    >
      <div
        className={`h-full w-full rounded-[3px] clap-stripes shadow-[0_4px_14px_rgba(0,0,0,0.55)] ring-1 ring-black/40 ${
          anim || (idle ? "clap-arm-idle" : "clap-arm")
        }`}
        style={{
          transformOrigin: origin === "right" ? "right center" : "left center",
        }}
      />
    </div>
  );
}

// A full director's slate: black board, handwritten chalk info lines,
// and a clapper arm that slaps down on mount.
function ClapSlate({
  title,
  subtitle,
  scene,
  take,
  size = "md",
  armIdle = true,
  showCorner = true,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  scene?: string;
  take?: string;
  size?: "sm" | "md" | "lg";
  armIdle?: boolean;
  showCorner?: boolean;
}) {
  const dims =
    size === "sm"
      ? { w: "w-56", pad: "px-5 py-4", title: "text-2xl", line: "text-[10px]" }
      : size === "lg"
        ? {
            w: "w-[26rem] max-w-full",
            pad: "px-8 py-7",
            title: "text-4xl sm:text-5xl",
            line: "text-xs",
          }
        : {
            w: "w-80",
            pad: "px-7 py-6",
            title: "text-3xl",
            line: "text-[11px]",
          };

  return (
    <div className={`relative ${dims.w}`}>
      {/* The clapper arm, attached at the right end of the board */}
      <ClapperArm
        className="right-1.5 -top-3 h-4 sm:h-5 left-1.5"
        idle={armIdle}
      />

      {/* Board */}
      <div className={`clap-board relative rounded-xl ${dims.pad}`}>
        {showCorner && (
          <>
            <span className="clap-corner clap-corner-tl" />
            <span className="clap-corner clap-corner-tr" />
            <span className="clap-corner clap-corner-bl" />
            <span className="clap-corner clap-corner-br" />
          </>
        )}

        {/* Top chalk info row: PROD / SCENE / TAKE like a real slate */}
        <div
          className={`mb-3 flex items-center justify-between gap-3 border-b border-white/10 pb-2 font-mono font-semibold uppercase tracking-[0.18em] text-[#e9e4d8]/70 ${dims.line}`}
        >
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-300" />
            CINEFINDER
          </span>
          <span className="flex items-center gap-2.5">
            {scene && <span>SCENE {scene}</span>}
            {take && <span>TAKE {take}</span>}
          </span>
        </div>

        <div className={`chalk-text text-[#f6f1e6] ${dims.title}`}>{title}</div>
        {subtitle && (
          <div
            className={`chalk-text mt-1.5 text-[#d8cfba]/80 ${dims.line === "text-xs" ? "text-base" : dims.line === "text-[11px]" ? "text-sm" : "text-xs"}`}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

// A spinning film reel disc with a blinking REC dot — the "camera is
// rolling" cue. Used in the header and the loading spinner.
function CameraReel({
  size = 20,
  className = "",
  showRec = false,
}: {
  size?: number;
  className?: string;
  showRec?: boolean;
}) {
  const holes = Array.from({ length: 8 });
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Reel body — concentric rings with sprocket holes, spinning */}
      <span
        className="reel-spin absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, #0a0a0e 0 22%, transparent 23% 27%, rgba(244,241,234,0.85) 28% 31%, transparent 32% 45%, rgba(244,241,234,0.5) 46% 49%, transparent 50% 60%, rgba(244,241,234,0.85) 61% 64%, transparent 65% 100%)",
          borderRadius: "9999px",
        }}
      />
      {/* Sprocket holes */}
      {holes.map((_, i) => (
        <span
          key={i}
          className="reel-spin absolute rounded-full bg-[#0a0a0e]"
          style={{
            width: size * 0.12,
            height: size * 0.12,
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) rotate(${(i * 360) / holes.length}deg) translateY(-${size * 0.34}px)`,
          }}
        />
      ))}
      {showRec && (
        <span className="absolute -right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-widest text-amber-300">
          <span className="rec-dot inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
          REC
        </span>
      )}
    </span>
  );
}

// Scrolling film reel: a strip of poster frames threads sideways inside a
// real-looking film strip — white sprocket holes along the top and bottom
// edges, and each poster mounted in a white rounded frame. Every frame opens
// the movie's details modal when clicked.
function FilmReelStrip({
  movies,
  label = "Now screening",
  onSelect,
}: {
  movies: Movie[];
  label?: string;
  onSelect: (tmdb_id: number) => void;
}) {
  if (movies.length === 0) return null;
  // Duplicate the list so the -50% translateX loop is seamless.
  const loop = [...movies, ...movies];

  return (
    <div className="relative">
      <div className="mb-4 flex items-center justify-center gap-3">
        <span className="h-px w-12 bg-white/15" />
        <span className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300">
          <span className="rec-dot inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
          {label}
        </span>
        <span className="h-px w-12 bg-white/15" />
      </div>

      {/* Film strip: the whole reel scrolls as one unit — the white sprocket
          holes along the top and bottom edges spin together with the frames. */}
      <div className="film-reel-strip relative overflow-hidden border border-white/10 py-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-black to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-black to-transparent" />

        <div className="film-reel-track">
          <div className="film-reel-sprockets" />
          <div className="film-reel-frames">
            {loop.map((m, i) => (
              <button
                key={`${m.tmdb_id}-${i}`}
                type="button"
                onClick={() => onSelect(m.tmdb_id)}
                aria-label={`Open ${m.title}`}
                className="film-frame group cursor-pointer"
                style={{ animationDelay: `${(i % movies.length) * 0.35}s` }}
              >
                <span className="block overflow-hidden rounded-[20px]">
                  <img
                    src={`${TMDB_CDN_BASE}${m.poster_path}`}
                    alt={m.title}
                    className="h-40 w-28 object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </span>
              </button>
            ))}
          </div>
          <div className="film-reel-sprockets" />
        </div>
      </div>
    </div>
  );
}

// The classic slate body: a black board divided by crisp white field
// separators into the metadata cells every director fills in — SCENE |
// TAKE | ROLL up top, then DATE / PROD.CO. / SOUND, DIRECTOR, CAMERAMAN.
// Used as the header of every home section so the page reads as a stack
// of clapboards.
function SlateBoard({
  scene,
  take,
  roll,
  date,
  prod = "CINEFINDER",
  sound = "STEREO",
  director,
  cameraman = "YOU",
  className = "",
  size = "md",
}: {
  scene?: string;
  take?: string;
  roll?: string;
  date?: string;
  prod?: string;
  sound?: string;
  director?: string;
  cameraman?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const tight = size === "sm";
  const cell = tight ? "px-2.5 py-1" : "px-3 py-1.5";
  const label = tight ? "text-[7px]" : "text-[8px]";
  const value = tight ? "text-[10px]" : "text-[11px]";
  return (
    <div
      className={`clap-board relative w-full overflow-hidden rounded-lg border border-white/10 shadow-[0_18px_45px_rgba(0,0,0,0.4)] ${className}`}
    >
      {/* Clapper-arm stripe band along the board's top edge */}
      <div className="clap-stripes h-2 opacity-90" />
      <div className="divide-y divide-white/15">
        {/* SCENE | TAKE | ROLL */}
        <div className="grid grid-cols-3 divide-x divide-white/15">
          <div className={cell}>
            <div className={`font-mono font-bold uppercase tracking-[0.2em] text-[#f4f1ea]/45 ${label}`}>
              Scene
            </div>
            <div className={`font-mono font-semibold text-[#f4f1ea]/95 ${value}`}>
              {scene || "—"}
            </div>
          </div>
          <div className={cell}>
            <div className={`font-mono font-bold uppercase tracking-[0.2em] text-[#f4f1ea]/45 ${label}`}>
              Take
            </div>
            <div className={`font-mono font-semibold text-[#f4f1ea]/95 ${value}`}>
              {take || "—"}
            </div>
          </div>
          <div className={cell}>
            <div className={`font-mono font-bold uppercase tracking-[0.2em] text-[#f4f1ea]/45 ${label}`}>
              Roll
            </div>
            <div className={`font-mono font-semibold text-[#f4f1ea]/95 ${value}`}>
              {roll || "—"}
            </div>
          </div>
        </div>
        {/* DATE | PROD.CO. | SOUND */}
        <div className="grid grid-cols-3 divide-x divide-white/15">
          <div className={cell}>
            <div className={`font-mono font-bold uppercase tracking-[0.2em] text-[#f4f1ea]/45 ${label}`}>
              Date
            </div>
            <div className={`font-mono font-semibold text-[#f4f1ea]/95 ${value}`}>
              {date || "—"}
            </div>
          </div>
          <div className={cell}>
            <div className={`font-mono font-bold uppercase tracking-[0.2em] text-[#f4f1ea]/45 ${label}`}>
              Prod. Co.
            </div>
            <div className={`font-mono font-semibold text-[#f4f1ea]/95 ${value}`}>
              {prod}
            </div>
          </div>
          <div className={cell}>
            <div className={`font-mono font-bold uppercase tracking-[0.2em] text-[#f4f1ea]/45 ${label}`}>
              Sound
            </div>
            <div className={`font-mono font-semibold text-[#f4f1ea]/95 ${value}`}>
              {sound}
            </div>
          </div>
        </div>
        {/* DIRECTOR */}
        <div className={cell}>
          <div className={`font-mono font-bold uppercase tracking-[0.2em] text-[#f4f1ea]/45 ${label}`}>
            Director
          </div>
          <div className={`font-mono font-semibold text-[#f4f1ea]/95 ${value}`}>
            {director || "—"}
          </div>
        </div>
        {/* CAMERAMAN */}
        <div className={cell}>
          <div className={`font-mono font-bold uppercase tracking-[0.2em] text-[#f4f1ea]/45 ${label}`}>
            Cameraman
          </div>
          <div className={`font-mono font-semibold text-[#f4f1ea]/95 ${value}`}>
            {cameraman}
          </div>
        </div>
      </div>
    </div>
  );
}

// Framed board container: a clapboard body with viewfinder corners, used to
// box up each home section's content so the whole page is a stack of slates.
function SlateFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`clap-board relative rounded-3xl border border-white/10 p-5 sm:p-8 ${className}`}
    >
      <span className="clap-corner clap-corner-tl" />
      <span className="clap-corner clap-corner-tr" />
      <span className="clap-corner clap-corner-bl" />
      <span className="clap-corner clap-corner-br" />
      {children}
    </div>
  );
}

const VisualSystem = () => (
  <style>{`
    @keyframes cine-float { 0%, 100% { transform: translate3d(0, 0, 0) scale(1); } 50% { transform: translate3d(24px, -18px, 0) scale(1.06); } }
    @keyframes cine-float-reverse { 0%, 100% { transform: translate3d(-50%, 0, 0) scale(1); } 50% { transform: translate3d(calc(-50% - 28px), 24px, 0) scale(0.94); } }
    @keyframes cine-orbit { from { transform: rotate(0deg) translateX(8px) rotate(0deg); } to { transform: rotate(360deg) translateX(8px) rotate(-360deg); } }
    @keyframes cine-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    @keyframes cine-sheen { 0% { transform: translateX(-135%) skewX(-18deg); } 100% { transform: translateX(135%) skewX(-18deg); } }
    @keyframes cine-pulse-border { 0%, 100% { box-shadow: 0 0 0 1px rgba(129, 140, 248, 0.08), 0 20px 60px rgba(2, 6, 23, 0.42); } 50% { box-shadow: 0 0 0 1px rgba(129, 140, 248, 0.28), 0 24px 72px rgba(49, 46, 129, 0.3); } }
    .animated-grid { background-image: linear-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px); background-size: 48px 48px; mask-image: radial-gradient(ellipse at center, black 0%, transparent 74%); opacity: 0.68; }
    .animate-float-slow { animation: cine-float 15s ease-in-out infinite; }
    .animate-float-slower { animation: cine-float 20s ease-in-out infinite reverse; }
    .animate-float-reverse { animation: cine-float-reverse 17s ease-in-out infinite; }
    .animate-orbit-slow { animation: cine-orbit 20s linear infinite; }
    .animate-orbit-reverse { animation: cine-orbit 15s linear infinite reverse; }
    .skeleton { background: linear-gradient(105deg, rgba(30, 41, 59, 0.66) 8%, rgba(71, 85, 105, 0.54) 18%, rgba(30, 41, 59, 0.66) 33%); background-size: 200% 100%; border: 1px solid rgba(255,255,255,0.04); animation: cine-shimmer 1.6s linear infinite; }
    .shine { position: absolute; inset: 0; z-index: 5; pointer-events: none; background: linear-gradient(100deg, transparent 38%, rgba(255,255,255,0.17) 50%, transparent 62%); transform: translateX(-135%) skewX(-18deg); }
    .group:hover .shine { animation: cine-sheen 0.85s cubic-bezier(0.2, 0.65, 0.3, 1) 1; }
    .cine-panel { animation: cine-pulse-border 6s ease-in-out infinite; }
    .soft-scrollbar::-webkit-scrollbar { width: 6px; }
    .soft-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .soft-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.25); border-radius: 99px; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: 0.01ms !important; } }
  `}</style>
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

// --- Anime.js premium interaction hooks ---

// Attach a cursor-following 3D tilt to a ref'd element
function useTilt<T extends HTMLElement>(
  ref: RefObject<T | null>,
  intensity?: number,
  scale?: number,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return attachTilt(el, { intensity, scale });
  }, [ref, intensity, scale]);
}

// Attach magnetic hover + click ripple to a ref'd button
function useMagneticButton<T extends HTMLElement>(
  ref: RefObject<T | null>,
  strength = 0.3,
  rippleColor?: string,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const detachMagnetic = attachMagnetic(el, strength);
    const detachRipple = attachRipple(el, rippleColor);
    return () => {
      detachMagnetic();
      detachRipple();
    };
  }, [ref, strength, rippleColor]);
}

// Wrapper that tilts its children (used inside maps where refs are awkward)
function TiltLayer({
  children,
  intensity,
  className = "h-full w-full",
}: {
  children: ReactNode;
  intensity?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useTilt(ref, intensity);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// Hero headline with an anime.js staggered word reveal. Memoized so React
// never re-renders it (revealWords mutates the DOM).
const HeroHeadline = memo(function HeroHeadline() {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (ref.current) revealWords(ref.current);
  }, []);
  return (
    <h1
      ref={ref}
      className="poster-text mt-6 text-6xl sm:text-7xl lg:text-[5.5rem] leading-[0.92] tracking-[0.02em] text-[#f4f1ea]"
    >
      Find your next{" "}
      <em className="chalk-text text-amber-300 normal-case tracking-normal">
        obsession
      </em>
      .
    </h1>
  );
});

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

  const posterRef = useRef<HTMLDivElement>(null);
  useTilt(posterRef);

  return (
    <motion.div
      layout
      variants={cardItem}
      whileHover={{ y: -8, transition: { duration: 0.2, ease: "easeOut" } }}
      whileTap={{ scale: 0.98 }}
      onClick={onCardClick}
      className="group relative bg-[#090D16]/85 rounded-2xl overflow-hidden border border-white/[0.07] hover:border-amber-400/60 transition-all duration-500 cursor-pointer shadow-[0_18px_50px_rgba(2,6,23,0.4)] hover:shadow-[0_26px_70px_rgba(217,119,6,0.25)] flex flex-col h-full"
    >
      <div
        ref={posterRef}
        className="aspect-[2/3] bg-slate-900 relative overflow-hidden"
      >
        <div className="card-glare" />
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/45 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-500" />
        <div className="shine" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-95 group-hover:scale-100">
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-[#030712]/70 px-3.5 py-2 text-[11px] font-semibold text-white shadow-xl backdrop-blur-xl">
            <PlaySquare size={14} className="text-amber-300" />
            Quick look
          </div>
        </div>

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

      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#020617] via-[#020617]/95 to-transparent pt-10">
        <div className="mb-2 flex items-center justify-between gap-2">
          {movie.release_date && (
            <span className="text-[10px] font-medium text-slate-300">
              {movie.release_date.split("-")[0]}
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-white line-clamp-1 tracking-tight mb-2">
          {movie.title}
        </h3>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 transform translate-y-1 group-hover:translate-y-0"
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
  onAction: (movie: Movie) => void;
  onCardClick: (id: number) => void;
}) {
  // 20 shown initially, +20 per "Show more" click. Resets when new results arrive.
  const [visibleCount, setVisibleCount] = useState(20);
  useEffect(() => {
    setVisibleCount(20);
  }, [results]);
  if (results.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
          {results.length}
        </span>
      </div>
      <p className="subtitle-text text-sm text-white mb-4">{subtitle}</p>
      <motion.div
        layout
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      >
        {results.slice(0, visibleCount).map((m) => (
          <MovieCard
            key={m.tmdb_id}
            movie={m}
            actionLabel="Add to Watchlist"
            actionIcon={CheckCircle2}
            matchScore={m.score}
            onAction={() => onAction(m)}
            onCardClick={() => onCardClick(m.tmdb_id)}
          />
        ))}
      </motion.div>
      <ShowMoreButton
        shown={visibleCount}
        total={results.length}
        onShowMore={() => setVisibleCount((c) => c + 20)}
      />
    </motion.div>
  );
}

// "Show more" pagination control for long recommendation grids.
function ShowMoreButton({
  shown,
  total,
  onShowMore,
  step = 20,
}: {
  shown: number;
  total: number;
  onShowMore: () => void;
  step?: number;
}) {
  if (shown >= total) return null;
  const remaining = Math.min(step, total - shown);
  return (
    <div className="mt-8 flex justify-center">
      <button
        onClick={onShowMore}
        className="clap-stripes-amber rounded-full px-6 py-2.5 text-sm font-bold text-[#f2eee3] transition-all hover:-translate-y-0.5 ring-1 ring-black/40"
      >
        Show more ({remaining} more)
      </button>
    </div>
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
  onRate: (item: RatingItem, r: number) => void;
  onUnwatch: (id: number) => void;
  onOpenDetails: () => void;
  isUpdating: boolean;
}) {
  const posterRef = useRef<HTMLDivElement>(null);
  useTilt(posterRef);

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
        className="absolute -inset-full bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,transparent_270deg,#f59e0b_360deg)] opacity-0 group-hover:opacity-100 group-hover:animate-spin transition-opacity duration-500 pointer-events-none"
        style={{
          animationDuration: "3s",
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
        }}
      />

      <div className="relative flex flex-col bg-slate-900 rounded-[15px] border border-white/[0.08] group-hover:border-transparent transition-colors z-10 overflow-hidden h-full">
        <div
          ref={posterRef}
          className="relative aspect-[2/3] w-full bg-slate-950 overflow-hidden"
        >
          <div className="card-glare" />
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
                    onClick={() => onRate(item, star - 0.5)}
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
                    onClick={() => onRate(item, star)}
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

// Half-star rating control (0.5 increments). Each star is split into two
// half-width buttons so you can click either the left or right half.
function StarRating({
  value,
  onChange,
  size = 22,
  disabled = false,
}: {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
  disabled?: boolean;
}) {
  const half = size / 2;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <div key={star} className="relative flex items-center">
          <motion.button
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.85 }}
            disabled={disabled}
            onClick={() => onChange(star - 0.5)}
            style={{ width: half, height: size }}
            className={`overflow-hidden p-0 disabled:opacity-50 ${
              value >= star - 0.5
                ? "text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                : "text-slate-700 hover:text-amber-400/50"
            }`}
            title={`${star - 0.5} stars`}
          >
            <div
              className="flex items-center justify-center"
              style={{ width: size, height: size }}
            >
              <Star
                size={size}
                fill={value >= star - 0.5 ? "currentColor" : "none"}
              />
            </div>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.85 }}
            disabled={disabled}
            onClick={() => onChange(star)}
            style={{ width: half, height: size }}
            className={`overflow-hidden p-0 disabled:opacity-50 ${
              value >= star
                ? "text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                : "text-slate-700 hover:text-amber-400/50"
            }`}
            title={`${star} stars`}
          >
            <div
              className="flex items-center justify-center"
              style={{ width: size, height: size, marginLeft: -half }}
            >
              <Star
                size={size}
                fill={value >= star ? "currentColor" : "none"}
              />
            </div>
          </motion.button>
        </div>
      ))}
    </div>
  );
}

// Google's "G" logo, used on the login screen and the settings
// "Connect Google" control.
function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  );
}

// The sign-in card: username/email + password form, Google button, and the
// sign-up toggle. Shown on the home page until the user signs in.
function AuthCard({
  id,
  isRegistering,
  onToggleRegister,
  authForm,
  setAuthForm,
  authLoading,
  error,
  onSubmit,
  onGoogle,
  loginSubmitRef,
  googleBtnRef,
}: {
  id?: string;
  isRegistering: boolean;
  onToggleRegister: () => void;
  authForm: { identifier: string; email: string; password: string; username: string };
  setAuthForm: (f: any) => void;
  authLoading: boolean;
  error: string;
  onSubmit: (e: FormEvent) => void;
  onGoogle: () => void;
  loginSubmitRef?: RefObject<HTMLButtonElement | null>;
  googleBtnRef?: RefObject<HTMLButtonElement | null>;
}) {
  const inputCls =
    "w-full bg-black/50 border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400/70 focus:ring-4 focus:ring-amber-400/10 transition-all placeholder:text-slate-600";
  return (
    <div
      id={id}
      className="clap-board relative rounded-3xl p-7 border border-white/[0.08] backdrop-blur-xl shadow-[0_24px_70px_rgba(0,0,0,0.5)]"
    >
      <span className="clap-corner clap-corner-tl" />
      <span className="clap-corner clap-corner-tr" />
      <span className="clap-corner clap-corner-bl" />
      <span className="clap-corner clap-corner-br" />
      <div className="film-tape absolute -top-2 left-1/2 h-4 w-24 -translate-x-1/2" />

      <div className="mb-5 text-center">
        <div className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-300" />
          Scene 00 · Box office
        </div>
        <h3 className="chalk-text mt-2 text-3xl text-[#f4f1ea]">
          {isRegistering ? "Join the show" : "Sign in"}
        </h3>
        <p className="subtitle-text mt-1 text-sm text-white/80">
          {isRegistering
            ? "Create an account to start your shelf."
            : "Unlock your watchlist, blends & picks."}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
          <X size={14} /> {error}
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-3.5">
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
                className={inputCls}
                onChange={(e) =>
                  setAuthForm({ ...authForm, username: e.target.value })
                }
              />
              <input
                type="email"
                placeholder="Email"
                required
                className={inputCls}
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
            className={inputCls}
            onChange={(e) =>
              setAuthForm({ ...authForm, identifier: e.target.value })
            }
          />
        )}
        <input
          type="password"
          placeholder="Password"
          required
          className={inputCls}
          onChange={(e) =>
            setAuthForm({ ...authForm, password: e.target.value })
          }
        />
        <motion.button
          ref={loginSubmitRef}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={authLoading}
          className="w-full bg-gradient-to-r from-[#23232c] via-[#1c1c24] to-[#14141a] hover:brightness-125 text-[#f3efe4] font-bold text-sm rounded-xl py-3 mt-2 transition-all shadow-[0_12px_32px_rgba(0,0,0,0.45)] ring-1 ring-white/25 disabled:brightness-75"
        >
          {authLoading ? (
            <div className="w-4 h-4 border-2 border-amber-900/30 border-t-amber-900 rounded-full animate-spin mx-auto" />
          ) : isRegistering ? (
            "Create Account"
          ) : (
            "Log In"
          )}
        </motion.button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          or
        </span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <button
        ref={googleBtnRef}
        type="button"
        onClick={onGoogle}
        disabled={authLoading}
        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-sm rounded-xl py-3 transition-all disabled:opacity-60 shadow-[0_10px_28px_rgba(255,255,255,0.12)]"
      >
        <GoogleIcon size={18} />
        Continue with Google
      </button>

      <button
        type="button"
        onClick={onToggleRegister}
        className="w-full mt-5 text-slate-400 hover:text-white text-xs transition-colors"
      >
        {isRegistering
          ? "Already have an account? Log in"
          : "Don't have an account? Sign up"}
      </button>
    </div>
  );
}

export default function CineFinder() {
  const [session, setSession] = useState<any>(null);
  const [userData, setUserData] = useState<UserHistory | null>(null);
  const [activeTab, setActiveTab] = useState<
    "home" | "foryou" | "combo" | "watchlist" | "settings"
  >("home");
  const [isUpdating, setIsUpdating] = useState(false);

  // Increments whenever the app boots or the user returns to the home
  // page, so the header's clapper arm re-slaps. Used as a React key to
  // remount the arm and replay its CSS animation.
  const [headerClapKey, setHeaderClapKey] = useState(0);
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (activeTab === "home" && prevTabRef.current !== "home") {
      setHeaderClapKey((n) => n + 1);
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);

  // Home-page scroll choreography: the hero parallaxes + fades away as you
  // scroll, and the header's film-strip progress line fills.
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroBgY = useTransform(heroScroll, [0, 1], [0, 200]);
  const heroBgScale = useTransform(heroScroll, [0, 1], [1, 1.15]);
  const heroBgOpacity = useTransform(heroScroll, [0, 0.65], [1, 0]);
  const heroContentY = useTransform(heroScroll, [0, 1], [0, -70]);
  const heroContentOpacity = useTransform(heroScroll, [0, 0.55], [1, 0]);

  // Popular movies used to dress the home page hero collage + film reel
  const [homePosters, setHomePosters] = useState<Movie[]>([]);
  const [homeBackdrop, setHomeBackdrop] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&vote_count.gte=200&page=1`,
        );
        const data = await res.json();
        const results: any[] = data.results || [];
        const posters: Movie[] = results
          .filter((m) => m.poster_path)
          .slice(0, 10)
          .map((m) => ({
            tmdb_id: m.id,
            title: m.title,
            poster_path: m.poster_path,
            backdrop_path: m.backdrop_path,
          }));
        const backdrop =
          results.find((m) => m.backdrop_path)?.backdrop_path || "";
        if (!cancelled) {
          setHomePosters(posters);
          setHomeBackdrop(backdrop);
        }
      } catch (e) {
        /* home page still works without the collage */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Watchlist Search & Filter State
  const [watchlistSearchQuery, setWatchlistSearchQuery] = useState("");
  const [watchlistSuggestions, setWatchlistSuggestions] = useState<Movie[]>([]);
  const [isWatchlistDropdownOpen, setIsWatchlistDropdownOpen] = useState(false);
  const [isSearchingWatchlistApi, setIsSearchingWatchlistApi] = useState(false);

  // Expanded Advanced Filter Drawer State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [includeUnrated, setIncludeUnrated] = useState(true);
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
  const [hybridResults, setHybridResults] = useState<Movie[]>([]);
  // Pagination for the For You grid: 20 shown initially, +20 per "Show more".
  const [forYouVisibleCount, setForYouVisibleCount] = useState(20);
  const [isBlending, setIsBlending] = useState(false);

  // Settings state
  const [newUsername, setNewUsername] = useState("");
  const [settingsMsg, setSettingsMsg] = useState<{
    text: string;
    tone: "success" | "error";
  } | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [usernameSaving, setUsernameSaving] = useState(false);

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
  const averageRating = allRatings.length
    ? allRatings.reduce((total, item) => total + item.rating, 0) /
      allRatings.length
    : 0;
  const favoritesCount = allRatings.filter((item) => item.rating >= 4).length;

  // Movies for the home hero collage: the user's own movies first,
  // topped up with popular titles so the hero always looks rich.
  const homeMovies = (() => {
    const own: Movie[] = [
      ...(userData?.personalized_recommendations || []),
      ...allRatings,
    ];
    const seen = new Set<number>();
    const uniqueOwn = own.filter((m) => {
      if (!m.poster_path || seen.has(m.tmdb_id)) return false;
      seen.add(m.tmdb_id);
      return true;
    });
    const fill = homePosters.filter((m) => !seen.has(m.tmdb_id));
    return [...uniqueOwn, ...fill].slice(0, 9);
  })();

  // Premium button micro-interactions (magnetic hover + click ripple)
  const loginSubmitRef = useRef<HTMLButtonElement>(null);
  const googleBtnRef = useRef<HTMLButtonElement>(null);
  const heroBrowseRef = useRef<HTMLButtonElement>(null);
  const heroBlendRef = useRef<HTMLButtonElement>(null);
  const modalAddRef = useRef<HTMLButtonElement>(null);
  useMagneticButton(loginSubmitRef);
  useMagneticButton(googleBtnRef, 0.3, "rgba(51,65,85,0.35)");
  useMagneticButton(heroBrowseRef, 0.25);
  useMagneticButton(heroBlendRef, 0.25);
  useMagneticButton(modalAddRef, 0.25);

  // Check if a movie is already in watchlist
  const isInWatchlist = (tmdbId: number) => {
    return allRatings.some((item) => item.tmdb_id === tmdbId);
  };

  // Current rating for the open movie details modal
  const selectedRating = selectedMovie
    ? (allRatings.find((item) => item.tmdb_id === selectedMovie.tmdb_id)
        ?.rating ?? 0)
    : 0;

  const filteredAndSortedRatings = allRatings
    .filter((item) => {
      // Hide unrated movies entirely when the checkbox is off
      if (!includeUnrated && item.rating === 0) return false;
      // Rating filter (unrated movies bypass it so they stay at the top)
      if (item.rating !== 0 && item.rating < minRatingFilter) return false;
      // Search text filter
      if (watchlistSearchQuery.trim()) {
        return item.title
          .toLowerCase()
          .includes(watchlistSearchQuery.toLowerCase().trim());
      }
      return true;
    })
    .sort((a, b) => {
      // Unrated movies always float to the top, regardless of the chosen sort
      const aUnrated = a.rating === 0 ? 0 : 1;
      const bUnrated = b.rating === 0 ? 0 : 1;
      if (aUnrated !== bUnrated) return aUnrated - bUnrated;

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
      else {
        setUserData(null);
        // Sign-out always lands back on the (public) home page.
        setActiveTab("home");
      }
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
        const matches = data.recommendations || [];
        setHybridResults(matches);
        pushToast(`Found ${matches.length} matches`, "info");
      }
    } catch (err) {
      console.error("Blend failed:", err);
      pushToast("Could not generate matches", "info");
    } finally {
      setIsBlending(false);
    }
  };

  const handleRate = async (movie: Movie, rating: number) => {
    if (!session?.access_token) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_URL}/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tmdb_id: movie.tmdb_id,
          rating,
          title: movie.title,
          poster_path: movie.poster_path || "",
        }),
      });
      if (res.ok) {
        fetchUserData(session.access_token);
        if (rating > 0) {
          sparkleBurst(window.innerWidth / 2, window.innerHeight * 0.42);
        }
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

  const handleAddToWatchlist = async (movie: Movie) => {
    if (!session?.access_token) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_URL}/watch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tmdb_id: movie.tmdb_id,
          title: movie.title,
          poster_path: movie.poster_path || "",
        }),
      });
      if (res.ok) {
        fetchUserData(session.access_token);
        sparkleBurst(
          window.innerWidth / 2,
          window.innerHeight * 0.42,
          "#818cf8",
          10,
        );
        pushToast("Added to your watchlist", "success");
      }
    } catch (err) {
      console.error(err);
      pushToast("Could not add to watchlist", "info");
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

  // --- Google OAuth sign-in ---
  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      // OAuth redirects away; if it returns here (popup mode) we stop the spinner.
      setAuthLoading(false);
    } catch (err: any) {
      setError(err.message || "Google sign-in failed.");
      setAuthLoading(false);
    }
  };

  // Tab navigation guard: For You / Combo / Watchlist / Settings require a
  // session. If the user isn't signed in, stay on home and nudge them to the
  // sign-in card.
  const PROTECTED_LABELS: Record<string, string> = {
    foryou: "For You",
    combo: "Combo Search",
    watchlist: "Watchlist",
    settings: "Settings",
  };
  const goToTab = (
    tab: "home" | "foryou" | "combo" | "watchlist" | "settings",
  ) => {
    if (tab !== "home" && !session) {
      setActiveTab("home");
      pushToast(
        `Sign in to open ${PROTECTED_LABELS[tab] || "that"}`,
        "info",
      );
      window.setTimeout(() => {
        document
          .getElementById("auth-card")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
      return;
    }
    setActiveTab(tab);
  };

  // --- Settings: link a previously existing account to Google ---
  // Uses Supabase's linkIdentity: while signed in with email/password, this
  // runs the Google OAuth flow and attaches the Google identity to the
  // current user, so they can sign in with Google from then on.
  const handleLinkGoogle = async () => {
    setAuthLoading(true);
    setSettingsMsg(null);
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      // OAuth redirects away to Google's consent page and back with the
      // newly-linked identity; if it returns here (popup mode) we stop.
      setAuthLoading(false);
      pushToast("Google connected", "success");
    } catch (err: any) {
      setSettingsMsg({
        text: err.message || "Could not connect Google.",
        tone: "error",
      });
      setAuthLoading(false);
    }
  };

  // --- Settings: update username ---
  const handleSaveUsername = async () => {
    if (!session?.user?.id || !newUsername.trim()) return;
    setUsernameSaving(true);
    setSettingsMsg(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: newUsername.trim() })
        .eq("id", session.user.id);
      if (error) throw error;
      setNewUsername("");
      setSettingsMsg({ text: "Username updated", tone: "success" });
      pushToast("Profile updated", "success");
      if (session.access_token) fetchUserData(session.access_token);
    } catch (err: any) {
      setSettingsMsg({
        text: err.message || "Could not update username.",
        tone: "error",
      });
    } finally {
      setUsernameSaving(false);
    }
  };

  // True when the current user already has a Google identity linked
  const hasGoogleLinked = !!session?.user?.identities?.some(
    (i: any) => i.provider === "google",
  );

  // --- Settings: change password ---
  const handleChangePassword = async () => {
    setPasswordLoading(true);
    setSettingsMsg(null);
    if (passwordForm.next.length < 6) {
      setSettingsMsg({
        text: "New password must be at least 6 characters.",
        tone: "error",
      });
      setPasswordLoading(false);
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setSettingsMsg({ text: "Passwords do not match.", tone: "error" });
      setPasswordLoading(false);
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.next,
      });
      if (error) throw error;
      setPasswordForm({ current: "", next: "", confirm: "" });
      setSettingsMsg({ text: "Password updated", tone: "success" });
      pushToast("Password updated", "success");
    } catch (err: any) {
      setSettingsMsg({
        text: err.message || "Could not update password.",
        tone: "error",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 font-sans selection:bg-amber-400/30 relative isolate">
      <VisualSystem />
      <AnimatedBackground />
      {/* The ENTIRE top of the screen is the clapboard: marquee bulbs, stripes,
          and the nav bar are all one full-width clapper arm that slams down on
          boot and whenever you return home. */}
      <header className="sticky top-0 z-50">
        <div className="relative">
          {/* White board revealed while the clap arm is lifted; covered on the slam */}
          <div className="header-clap-reveal" aria-hidden />
          <div
            key={headerClapKey}
            className="header-clap clap-board relative overflow-hidden rounded-b-2xl border-b border-white/[0.08] backdrop-blur-2xl shadow-[0_18px_55px_rgba(2,6,23,0.45)]"
          >
            {/* Marquee bulbs along the clapboard's top edge */}
            <MarqueeLights />
            {/* Home-only scroll progress: film ticks fill as you scroll */}
            {activeTab === "home" && <FilmScrollProgress />}
            {/* Clapper-arm stripes */}
            <div className="clap-stripes pointer-events-none h-2.5 opacity-90" />

            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <button
              onClick={() => setActiveTab("home")}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              {/* Mini clapboard logo */}
              <div className="relative h-8 w-9 shrink-0 overflow-hidden rounded-[5px] bg-[#101016] ring-1 ring-white/20 shadow-lg">
                <div className="clap-stripes absolute inset-x-0 top-0 h-[10px] opacity-90" />
                <div className="absolute inset-x-0 top-[10px] bottom-0 flex items-center justify-center">
                  <span className="chalk-text text-[13px] leading-none text-[#f6f1e6]">
                    C
                  </span>
                </div>
              </div>
              <div className="hidden sm:block text-left">
              <span className="bebas-text block text-[17px] leading-none tracking-[0.08em] text-[#f6f1e6]">
                CINEFINDER
              </span>
                <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.16em] text-amber-300/90">
                  Roll camera — action
                </span>
              </div>
              <CameraReel size={22} showRec className="hidden md:inline-flex" />
            </button>

            <div className="flex items-center gap-4">
              <nav className="hidden md:flex items-center gap-1 bg-black/20 p-1 rounded-full border border-white/[0.08] relative shadow-inner shadow-black/10">
                {[
                  { id: "foryou", label: "For You" },
                  { id: "combo", label: "Combo Search" },
                  { id: "watchlist", label: "Watchlist" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => goToTab(tab.id as any)}
                    className={`relative px-4 py-1.5 text-xs font-medium transition-colors z-10 ${
                      activeTab === tab.id
                        ? "text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 clap-stripes-amber rounded-full shadow-[0_5px_16px_rgba(0,0,0,0.4)] -z-10 ring-1 ring-black/40"
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
                {session ? (
                  <>
                    <button
                      onClick={() => goToTab("settings")}
                      className={`p-2 rounded-full transition-colors ${
                        activeTab === "settings"
                          ? "text-amber-400 bg-amber-400/10"
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
                  </>
                ) : (
                  <button
                    onClick={() =>
                      document
                        .getElementById("auth-card")
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        })
                    }
                    className="clap-stripes-amber rounded-full px-4 py-1.5 text-xs font-bold text-[#f2eee3] transition-all hover:-translate-y-0.5 ring-1 ring-black/40"
                  >
                    Sign in
                  </button>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {/* --- HOME: full-bleed cozy landing (not a tab) --- */}
        {activeTab === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full bg-[#0a0a0e]"
          >
            {/* ================= HERO ================= */}
            <section ref={heroRef} className="relative overflow-hidden bg-[#0a0a0e]">
              {/* Film-strip sprocket bar across the very top of the page */}
              <div className="film-strip-h absolute inset-x-0 top-0 h-4 opacity-70" />
              {/* Dimmed cinematic backdrop — parallax drifts and fades as you scroll */}
              {(homeBackdrop || homeMovies[0]?.poster_path) && (
                <motion.div
                  className="absolute inset-0"
                  style={{ y: heroBgY, scale: heroBgScale, opacity: heroBgOpacity }}
                >
                  <img
                    src={`${TMDB_CDN_BASE}${homeBackdrop || homeMovies[0]?.poster_path}`}
                    alt=""
                    className="h-full w-full object-cover opacity-[0.16] blur-[2px]"
                  />
                  <div className="absolute inset-0 bg-[#0a0a0e]/60" />
                </motion.div>
              )}
              <div className="film-grain absolute inset-0" />
              {/* Warm rise from the bottom so the hero melts into the page */}
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0a0a0e] via-[#0a0a0e]/60 to-transparent" />

              <div className="relative mx-auto max-w-6xl px-6 sm:px-10 py-16 sm:py-24 lg:py-28">
                <motion.div
                  className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]"
                  style={{ y: heroContentY, opacity: heroContentOpacity }}
                >
                  <div>
                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                      className="cozy-eyebrow"
                    >
                      <span className="cozy-dot h-2 w-2 rounded-full bg-amber-300" />
                      <span className="font-mono text-amber-300">SCENE 01</span>
                      <span className="opacity-60">—</span>
                      {new Date().getHours() < 12
                        ? "Good morning"
                        : new Date().getHours() < 18
                          ? "Good afternoon"
                          : "Good evening"}
                      , {userData?.name || "friend"}
                    </motion.div>

                    <HeroHeadline />

                    <motion.p
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="subtitle-text mt-6 max-w-md text-[15px] leading-relaxed text-white"
                    >
                      Blend the movies you love, unearth hidden gems, and keep
                      your shelf in order. One cozy corner of the internet for
                      everything you'll watch next.
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.28 }}
                      className="mt-9 flex flex-wrap items-center gap-3"
                    >
                      <button
                        ref={heroBrowseRef}
                        onClick={() => goToTab("foryou")}
                        className="clap-stripes-amber rounded-full px-6 py-3 text-sm font-bold text-[#f2eee3] shadow-[0_14px_34px_rgba(0,0,0,0.45)] transition-all hover:-translate-y-0.5 ring-1 ring-black/40"
                      >
                        {session ? "Browse your picks" : "Sign in to browse"}
                      </button>
                      <button
                        ref={heroBlendRef}
                        onClick={() => goToTab("combo")}
                        className="rounded-full border border-[#f4f1ea]/30 px-6 py-3 text-sm font-semibold text-[#f4f1ea] transition-colors hover:bg-white/5"
                      >
                        {session ? "Start a blend" : "Sign in to blend"}
                      </button>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.34 }}
                      className="mt-10 grid grid-cols-3 divide-x divide-white/15 overflow-hidden rounded-xl border border-white/10 bg-[#101016]/60 backdrop-blur"
                    >
                      {[
                        {
                          icon: Film,
                          label: "in your shelf",
                          value: allRatings.length,
                        },
                        {
                          icon: Award,
                          label: "top picks",
                          value: favoritesCount,
                        },
                        {
                          icon: Star,
                          label: "avg rating",
                          value: averageRating ? averageRating.toFixed(1) : "—",
                        },
                      ].map(({ icon: Icon, label, value }) => (
                        <div
                          key={label}
                          className="flex flex-col items-center gap-1.5 px-3 py-3 text-center"
                        >
                          <Icon size={15} className="text-amber-300/80" />
                          <span className="text-lg font-bold text-[#f4f1ea]">
                            {value}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#cfc9ba]/60">
                            {label}
                          </span>
                        </div>
                      ))}
                    </motion.div>
                  </div>

                  {/* Hero right column: the sign-in card is the first thing
                      logged-out visitors see; the poster collage shows once
                      they're signed in. */}
                  {!session ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        delay: 0.2,
                        type: "spring",
                        stiffness: 120,
                        damping: 16,
                      }}
                      className="relative mx-auto w-full max-w-sm scroll-mt-40"
                    >
                      <AuthCard
                        id="auth-card"
                        isRegistering={isRegistering}
                        onToggleRegister={() => {
                          setIsRegistering(!isRegistering);
                          setError("");
                        }}
                        authForm={authForm}
                        setAuthForm={setAuthForm}
                        authLoading={authLoading}
                        error={error}
                        onSubmit={handleAuth}
                        onGoogle={handleGoogleLogin}
                        loginSubmitRef={loginSubmitRef}
                        googleBtnRef={googleBtnRef}
                      />
                    </motion.div>
                  ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 0.25,
                      type: "spring",
                      stiffness: 120,
                      damping: 16,
                    }}
                    className="relative mx-auto h-[26rem] w-[19rem] sm:h-[28rem] sm:w-[21rem]"
                  >
                    {homeMovies.slice(0, 3).map((m, i) => (
                      <motion.div
                        key={m.tmdb_id}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 0.32 + i * 0.12,
                          type: "spring",
                          stiffness: 160,
                          damping: 18,
                        }}
                        onClick={() => openMovieDetails(m.tmdb_id)}
                        role="button"
                        aria-label={`Open ${m.title}`}
                        className={`absolute cursor-pointer overflow-hidden rounded-2xl shadow-[0_28px_60px_rgba(0,0,0,0.55)] ring-1 ring-[#f4f1ea]/15 transition-transform hover:scale-[1.03] ${
                          i === 0
                            ? "left-0 top-6 z-20 w-36 h-[13.5rem] -rotate-6"
                            : i === 1
                              ? "left-20 top-0 z-30 w-40 h-60 rotate-2"
                              : "right-0 top-14 z-10 w-32 h-48 rotate-6"
                        }`}
                      >
                        <TiltLayer intensity={7}>
                          <img
                            src={`${TMDB_CDN_BASE}${m.poster_path}`}
                            alt={m.title}
                            className="h-full w-full object-cover"
                          />
                        </TiltLayer>
                      </motion.div>
                    ))}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0a0a0e]/90 px-4 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300 backdrop-blur ring-1 ring-amber-300/25">
                      ▸ fresh from the shelf
                    </div>
                  </motion.div>
                  )}
              </motion.div>
            </div>
            </section>

            {/* ================= FILM REEL ================= */}
            <div className="slate-rule mx-auto max-w-6xl" />
            <section className="mx-auto max-w-6xl px-6 sm:px-10 py-14 sm:py-20">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="mb-8 mx-auto max-w-2xl"
              >
                <SlateBoard
                  scene="01"
                  take="1"
                  roll="A"
                  date={new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  })}
                  director={userData?.name || "GUEST"}
                />
              </motion.div>
              <SlateFrame>
                <FilmReelStrip movies={homeMovies} onSelect={openMovieDetails} />
              </SlateFrame>
            </section>

            {/* ================= FOR YOU ================= */}
            <div className="slate-rule mx-auto max-w-6xl" />
            <section className="mx-auto max-w-6xl px-6 sm:px-10 py-16 sm:py-20">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="mb-8 mx-auto max-w-2xl"
              >
                <SlateBoard
                  scene="02"
                  take="2"
                  roll="B"
                  date={new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  })}
                  director={userData?.name || "GUEST"}
                  sound="DOLBY"
                />
              </motion.div>
              <SlateFrame>
                <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                  <motion.div
                    initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
                    whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <span className="cozy-eyebrow">
                      <span className="cozy-dot h-1.5 w-1.5 rounded-full bg-amber-300" />
                      <span className="font-mono text-amber-300">SCENE 02</span>
                      <span className="opacity-60">—</span>
                      Handpicked for you
                    </span>
                    <h2 className="poster-text mt-5 text-5xl sm:text-6xl leading-[0.95] tracking-[0.01em] text-[#f4f1ea]">
                      Your next favorite is already waiting.
                    </h2>
                    <p className="subtitle-text mt-5 max-w-md text-[15px] leading-relaxed text-white">
                      We look at the movies you rated highest and quietly line
                      up the ones most like them — no noise, just your taste.
                    </p>
                    <button
                      onClick={() => goToTab("foryou")}
                      className="cozy-link mt-7"
                    >
                      Explore your picks <ChevronRight size={16} />
                    </button>
                  </motion.div>

                  <div className="flex flex-wrap items-end justify-center gap-5">
                    {(userData?.personalized_recommendations || [])
                      .slice(0, 3)
                      .map((m, i) =>
                        m.poster_path ? (
                          <motion.div
                            key={m.tmdb_id}
                            initial={{ opacity: 0, y: 22 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-60px" }}
                            transition={{
                              delay: i * 0.1,
                              type: "spring",
                              stiffness: 150,
                              damping: 18,
                            }}
                            onClick={() => openMovieDetails(m.tmdb_id)}
                            role="button"
                            aria-label={`Open ${m.title}`}
                            className={`w-28 cursor-pointer sm:w-32 ${
                              i === 1 ? "sm:-translate-y-4" : ""
                            }`}
                          >
                            <TiltLayer intensity={9} className="w-full">
                              <img
                                src={`${TMDB_CDN_BASE}${m.poster_path}`}
                                alt={m.title}
                                className="w-full rounded-xl shadow-[0_22px_45px_rgba(0,0,0,0.5)] ring-1 ring-[#f4f1ea]/15"
                              />
                            </TiltLayer>
                            <p className="mt-2 truncate text-center text-xs font-medium text-[#cfc9ba]/70">
                              {m.title}
                            </p>
                          </motion.div>
                        ) : null,
                      )}
                    {!userData?.personalized_recommendations?.length && (
                      <div className="cozy-card relative w-full max-w-xs rounded-[1.75rem] p-7 text-center">
                        <p className="chalk-text text-2xl text-[#f4f1ea]">
                          Rate a few movies first
                        </p>
                        <p className="subtitle-text mt-2 text-sm leading-relaxed text-white">
                          Your picks appear here once you've rated some
                          favorites in your watchlist.
                        </p>
                        <button
                          onClick={() => goToTab("watchlist")}
                          className="cozy-link mt-4 justify-center"
                        >
                          Rate movies <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </SlateFrame>
            </section>

            {/* ================= COMBO ================= */}
            <div className="slate-rule mx-auto max-w-6xl" />
            <section className="relative overflow-hidden bg-[#0d0d12]">
              <div className="film-grain absolute inset-0" />
              <div className="film-strip-h absolute inset-x-0 top-0 h-4 opacity-60" />
              <div className="relative mx-auto max-w-6xl px-6 sm:px-10 py-20 sm:py-28">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="mb-8 mx-auto max-w-2xl"
                >
                  <SlateBoard
                    scene="03"
                    take="3"
                    roll="C"
                    date={new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    })}
                    director={userData?.name || "GUEST"}
                    sound="5.1 MIX"
                  />
                </motion.div>
                <SlateFrame>
                <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                  {/* Blend visual */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, rotate: -3 }}
                    whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ type: "spring", stiffness: 120, damping: 16 }}
                    className="relative order-2 mx-auto flex h-72 w-full max-w-md items-center justify-center lg:order-1"
                  >
                    <div className="flex items-center gap-3">
                      {homeMovies.slice(0, 2).map((m, i) => (
                        <div
                          key={m.tmdb_id}
                          onClick={() => openMovieDetails(m.tmdb_id)}
                          role="button"
                          aria-label={`Open ${m.title}`}
                          className={`shrink-0 cursor-pointer ${i === 0 ? "-rotate-6" : "rotate-6"}`}
                        >
                          <TiltLayer intensity={9}>
                            <img
                              src={`${TMDB_CDN_BASE}${m.poster_path}`}
                              alt={m.title}
                              className="h-48 w-32 rounded-xl shadow-[0_24px_50px_rgba(0,0,0,0.5)] ring-1 ring-[#f4f1ea]/15"
                            />
                          </TiltLayer>
                        </div>
                      ))}
                      <div className="clap-stripes-amber z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-bold text-[#f2eee3] shadow-lg ring-4 ring-[#0d0d12]">
                        +
                      </div>
                    </div>
                    {homeMovies[2] && (
                      <img
                        src={`${TMDB_CDN_BASE}${homeMovies[2].poster_path}`}
                        alt={homeMovies[2].title}
                        onClick={() => openMovieDetails(homeMovies[2].tmdb_id)}
                        className="absolute -bottom-2 left-1/2 h-[10.5rem] w-28 -translate-x-1/2 cursor-pointer rounded-xl shadow-[0_24px_50px_rgba(0,0,0,0.5)] ring-1 ring-[#f4f1ea]/15"
                      />
                    )}
                  </motion.div>
                  {/* Text */}
                  <motion.div
                    initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
                    whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="order-1 lg:order-2"
                  >
                    <span className="cozy-eyebrow">
                      <span className="font-mono text-amber-300">SCENE 03</span>
                      <span className="opacity-60">—</span>
                      Combo search
                    </span>
                    <h2 className="poster-text mt-5 text-5xl sm:text-6xl leading-[0.95] tracking-[0.01em] text-[#f4f1ea]">
                      Blend two worlds into one.
                    </h2>
                    <p className="subtitle-text mt-5 max-w-md text-[15px] leading-relaxed text-white">
                      Pick a couple of movies you adore and we'll find the
                      titles that feel like both of them at once — the overlap
                      you didn't know you were looking for.
                    </p>
                    <button
                      onClick={() => goToTab("combo")}
                      className="cozy-link mt-7"
                    >
                      Start a blend <ChevronRight size={16} />
                    </button>
                  </motion.div>
                </div>
                </SlateFrame>
              </div>
            </section>

            {/* ================= WATCHLIST ================= */}
            <div className="slate-rule mx-auto max-w-6xl" />
            <section className="mx-auto max-w-6xl px-6 sm:px-10 py-20 sm:py-28">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="mb-8 mx-auto max-w-2xl"
              >
                <SlateBoard
                  scene="04"
                  take="4"
                  roll="D"
                  date={new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  })}
                  director={userData?.name || "GUEST"}
                  sound="SYNC"
                />
              </motion.div>
              <SlateFrame>
                <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                  <motion.div
                    initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
                    whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <span className="cozy-eyebrow">
                      <span className="cozy-dot h-1.5 w-1.5 rounded-full bg-amber-300" />
                      <span className="font-mono text-amber-300">SCENE 04</span>
                      <span className="opacity-60">—</span>
                      Your shelf
                    </span>
                    <h2 className="poster-text mt-5 text-5xl sm:text-6xl leading-[0.95] tracking-[0.01em] text-[#f4f1ea]">
                      Everything you've saved, in one place.
                    </h2>
                    <p className="subtitle-text mt-5 max-w-md text-[15px] leading-relaxed text-white">
                      Keep a collection of all your watched movies, rate what
                      you've seen, and sort your shelf however you like.
                    </p>
                    <button
                      onClick={() => goToTab("watchlist")}
                      className="cozy-link mt-7"
                    >
                      Open your watchlist <ChevronRight size={16} />
                    </button>
                  </motion.div>

                  <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    {allRatings
                      .slice(0, 6)
                      .map((m) =>
                        m.poster_path ? (
                          <motion.img
                            key={m.tmdb_id}
                            initial={{ opacity: 0, y: 18 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-60px" }}
                            src={`${TMDB_CDN_BASE}${m.poster_path}`}
                            alt={m.title}
                            onClick={() => openMovieDetails(m.tmdb_id)}
                            role="button"
                            aria-label={`Open ${m.title}`}
                            className="h-44 w-29 shrink-0 cursor-pointer rounded-xl object-cover shadow-[0_20px_40px_rgba(0,0,0,0.45)] ring-1 ring-[#f4f1ea]/15 transition-transform hover:scale-105"
                          />
                        ) : null,
                      )}
                    {!allRatings.length && (
                      <div className="cozy-card relative w-full rounded-[1.75rem] p-7 text-center">
                        <p className="chalk-text text-2xl text-[#f4f1ea]">
                          Your shelf is empty
                        </p>
                        <p className="subtitle-text mt-2 text-sm leading-relaxed text-white">
                          Add movies from the top of the watchlist page and
                          they'll show up right here.
                        </p>
                        <button
                          onClick={() => goToTab("watchlist")}
                          className="cozy-link mt-4 justify-center"
                        >
                          Open watchlist <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </SlateFrame>
            </section>

            {/* ================= SETTINGS FOOTER ================= */}
            <div className="slate-rule mx-auto max-w-6xl" />
            <section className="mx-auto max-w-6xl px-6 sm:px-10 pb-24">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="cozy-card relative flex flex-col items-start justify-between gap-6 rounded-[2rem] p-8 sm:flex-row sm:items-center sm:p-10"
              >
                <span className="clap-corner clap-corner-tl" />
                <span className="clap-corner clap-corner-tr" />
                <span className="clap-corner clap-corner-bl" />
                <span className="clap-corner clap-corner-br" />
                <div className="film-tape absolute -top-2 left-8 h-4 w-24" />
                <div>
                  <h3 className="chalk-text text-3xl font-semibold text-[#f4f1ea]">
                    Tune your corner
                  </h3>
                  <p className="subtitle-text mt-1 text-sm text-white">
                    Username, password, and more.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => goToTab("settings")}
                    className="clap-stripes-amber rounded-full px-5 py-2.5 text-sm font-bold text-[#f2eee3] transition-colors ring-1 ring-black/40"
                  >
                    Settings
                  </button>
                  {session ? (
                    <button
                      onClick={() => supabase.auth.signOut()}
                      className="rounded-full border border-[#f4f1ea]/25 px-5 py-2.5 text-sm font-semibold text-[#f4f1ea] transition-colors hover:bg-white/5"
                    >
                      Sign out
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        document
                          .getElementById("auth-card")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          })
                      }
                      className="rounded-full border border-[#f4f1ea]/25 px-5 py-2.5 text-sm font-semibold text-[#f4f1ea] transition-colors hover:bg-white/5"
                    >
                      Sign in
                    </button>
                  )}
                </div>
              </motion.div>
            </section>
          </motion.div>
        )}

        {activeTab !== "home" && (
          <motion.main
            key="main"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-6xl mx-auto px-5 sm:px-6 py-10 pb-36 md:pb-24 relative"
          >
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
                  <div className="clap-board relative mb-8 flex flex-col gap-5 rounded-3xl border border-white/[0.08] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.28)] sm:flex-row sm:items-end sm:justify-between">
                    <span className="clap-corner clap-corner-tl" />
                    <span className="clap-corner clap-corner-tr" />
                    <span className="clap-corner clap-corner-bl" />
                    <span className="clap-corner clap-corner-br" />
                    <div className="film-tape absolute -top-2 left-8 h-4 w-24" />
                    <div>
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                        <Sparkles size={12} /> Scene 01 · Tailored discovery
                      </div>
                      <h2 className="poster-text text-3xl tracking-[0.02em] text-white mb-1">
                        Personalized for You
                      </h2>
                      <p className="text-sm text-slate-400">
                        Curated recommendations based on your highest-rated
                        movies.
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 backdrop-blur-md">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/10">
                        <Star
                          size={15}
                          className="text-amber-300"
                          fill="currentColor"
                        />
                      </div>
                      <div>
                        <div className="text-lg font-bold leading-none text-white">
                          {favoritesCount}
                        </div>
                        <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Top picks
                        </div>
                      </div>
                    </div>
                  </div>

                  {!userData ? (
                    <SkeletonGrid />
                  ) : userData.personalized_recommendations?.length ? (
                    <>
                      <motion.div
                        layout
                        variants={staggerContainer}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                      >
                        {userData.personalized_recommendations
                          .slice(0, forYouVisibleCount)
                          .map((m) => (
                            <MovieCard
                              key={m.tmdb_id}
                              movie={m}
                              actionLabel="Add to Watchlist"
                              actionIcon={CheckCircle2}
                              matchScore={m.score}
                              onAction={() => handleAddToWatchlist(m)}
                              onCardClick={() => openMovieDetails(m.tmdb_id)}
                            />
                          ))}
                      </motion.div>
                      <ShowMoreButton
                        shown={forYouVisibleCount}
                        total={userData.personalized_recommendations.length}
                        onShowMore={() => setForYouVisibleCount((c) => c + 20)}
                      />
                    </>
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
                        onClick={() => goToTab("combo")}
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
                  <div className="mb-8 flex items-end justify-between gap-4">
                    <div>
                      <div className="mb-2 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-300" />
                        Scene 02 · The lab
                      </div>
                      <h2 className="poster-text text-4xl tracking-[0.02em] text-white leading-none">
                        Combo Search
                      </h2>
                      <p className="mt-2 text-sm text-slate-400">
                        Select multiple movies to generate a blended
                        recommendation vector.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                    <div className="cine-panel lg:col-span-2 bg-[#090D16]/80 border border-white/[0.08] rounded-3xl p-6 shadow-2xl flex flex-col justify-between backdrop-blur-xl">
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
                            onChange={(e) =>
                              setComboSearchQuery(e.target.value)
                            }
                            onFocus={() => setIsDropdownOpen(true)}
                            onBlur={() =>
                              setTimeout(() => setIsDropdownOpen(false), 200)
                            }
                            className="w-full bg-black/50 border border-white/10 text-white rounded-xl pl-11 pr-10 py-3 text-sm focus:border-amber-400/70 outline-none transition-all"
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
                                className="flex items-center gap-1.5 bg-amber-400/10 text-amber-300 border border-amber-400/20 px-3 py-1 rounded-full text-xs font-medium"
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
                          className="clap-stripes-amber flex items-center gap-2 text-[#f2eee3] font-bold text-xs rounded-xl px-5 py-2.5 transition-opacity disabled:opacity-50 shadow-lg shadow-black/30 ring-1 ring-black/40"
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

                    <div className="cine-panel bg-[#090D16]/80 border border-white/[0.08] rounded-3xl p-6 shadow-2xl flex flex-col backdrop-blur-xl">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <Activity size={14} className="text-amber-300" />{" "}
                        Metadata Profile
                      </div>
                      <div className="flex-1 flex items-center justify-center min-h-[220px] w-full">
                        {selectedCombo.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart
                              data={genreRadarData}
                              outerRadius="100%"
                              margin={{
                                top: 35,
                                right: 55,
                                bottom: 35,
                                left: 55,
                              }}
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
                                      {words.map(
                                        (word: string, index: number) => (
                                          <tspan
                                            key={index}
                                            x={x}
                                            dy={index === 0 ? 0 : 13}
                                          >
                                            {word}
                                          </tspan>
                                        ),
                                      )}
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
                        title="Matches"
                        subtitle="Blended by keywords, genres, ratings, popularity, and your combo's metadata profile (era, richness)."
                        results={hybridResults}
                        onAction={(movie) => handleAddToWatchlist(movie)}
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
                  <div className="clap-board relative mb-6 overflow-hidden rounded-3xl border border-white/[0.08] p-5 shadow-[0_18px_55px_rgba(2,6,23,0.32)] backdrop-blur-xl sm:p-6">
                    <span className="clap-corner clap-corner-tl" />
                    <span className="clap-corner clap-corner-tr" />
                    <span className="clap-corner clap-corner-bl" />
                    <span className="clap-corner clap-corner-br" />
                    <div className="film-tape absolute -top-2 left-8 h-4 w-24" />
                    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="mb-2 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                          <Film size={12} /> Scene 03 · Your collection
                        </div>
                        <h2 className="poster-text text-3xl tracking-[0.02em] text-white mb-1">
                          Your Watchlist
                        </h2>
                        <p className="text-sm text-slate-400">
                          Filter your list or search TMDB to add new movies
                          instantly.
                        </p>
                      </div>
                      <div className="grid grid-cols-3 divide-x divide-white/[0.08] overflow-hidden rounded-2xl border border-white/[0.08] bg-black/20 backdrop-blur-md">
                        <div className="px-3 py-2.5 text-center sm:px-4">
                          <div className="text-base font-bold text-white">
                            <CountUp value={allRatings.length} />
                          </div>
                          <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                            Saved
                          </div>
                        </div>
                        <div className="px-3 py-2.5 text-center sm:px-4">
                          <div className="text-base font-bold text-amber-300">
                            {averageRating.toFixed(1)}
                          </div>
                          <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                            Avg. score
                          </div>
                        </div>
                        <div className="px-3 py-2.5 text-center sm:px-4">
                          <div className="text-base font-bold text-amber-300">
                            <CountUp value={favoritesCount} />
                          </div>
                          <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                            Favorites
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Filter Toggle Button */}
                    <div className="relative mt-5 flex justify-end">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold border transition-all shadow-lg self-start sm:self-auto ${
                          isFilterOpen ||
                          minRatingFilter > 0 ||
                          sortBy !== "rating-desc" ||
                          !includeUnrated
                            ? "clap-stripes-amber text-[#f2eee3] border-white/40 shadow-black/30 ring-1 ring-black/40"
                            : "bg-[#090D16] text-slate-300 border-white/[0.06] hover:border-white/20"
                        }`}
                      >
                        <SlidersHorizontal size={14} />
                        <span>Filter & Sort</span>
                        {(minRatingFilter > 0 ||
                          sortBy !== "rating-desc" ||
                          !includeUnrated) && (
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
                        className="w-full bg-black/40 border border-white/[0.08] text-white rounded-2xl pl-11 pr-10 py-3.5 text-sm focus:border-amber-400/70 focus:ring-4 focus:ring-amber-400/10 outline-none transition-all shadow-xl backdrop-blur-xl placeholder:text-slate-600"
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
                            initial={{ opacity: 0, y: -10, scale: 0.985 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.985 }}
                            transition={{
                              type: "spring",
                              stiffness: 360,
                              damping: 28,
                            }}
                            className="absolute top-full left-0 right-0 mt-2 bg-[#090D16]/95 border border-white/[0.12] rounded-2xl shadow-[0_24px_65px_rgba(2,6,23,0.58)] overflow-hidden z-50 backdrop-blur-2xl divide-y divide-white/[0.05]"
                          >
                            <div className="px-4 py-2 bg-slate-900/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                              <span>Discover on TMDB to Add</span>
                              <button
                                onClick={() =>
                                  setIsWatchlistDropdownOpen(false)
                                }
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
                                  className="group flex items-center justify-between p-3 hover:bg-amber-400/[0.06] transition-colors"
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
                                          handleAddToWatchlist(m);
                                        }}
                                        disabled={isUpdating}
                                        className="clap-stripes-amber flex items-center gap-1 text-[#f2eee3] text-xs font-bold px-3 py-1.5 rounded-xl transition-colors shadow-lg shadow-black/30 ring-1 ring-black/40"
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
                        animate={{
                          height: "auto",
                          opacity: 1,
                          marginBottom: 24,
                        }}
                        exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="cine-panel bg-[#090D16]/85 border border-white/[0.10] rounded-3xl p-6 shadow-2xl space-y-6 backdrop-blur-xl">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Rating Slider Filter */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <Star size={13} className="text-amber-400" />{" "}
                                  Minimum Rating
                                </label>
                                <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
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
                                className="w-full accent-amber-500 bg-slate-900 cursor-pointer h-2 rounded-lg"
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
                                  className="text-amber-300"
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
                                    onClick={() =>
                                      setSortBy(sortOption.id as any)
                                    }
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors border ${
                                      sortBy === sortOption.id
                                        ? "clap-stripes-amber border-white/40 text-[#f2eee3] ring-1 ring-black/40"
                                        : "bg-[#030712] border-white/5 text-slate-400 hover:text-white"
                                    }`}
                                  >
                                    {sortOption.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Include unrated movies toggle */}
                          <div className="flex items-center justify-between gap-4 pt-1">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={includeUnrated}
                                onClick={() =>
                                  setIncludeUnrated(!includeUnrated)
                                }
                                className={`relative w-10 h-6 rounded-full transition-colors duration-300 shrink-0 ${
                                  includeUnrated
                                    ? "clap-stripes-amber shadow-[0_0_14px_rgba(0,0,0,0.45)] ring-1 ring-black/40"
                                    : "bg-slate-800 border border-white/10"
                                }`}
                              >
                                <motion.span
                                  layout
                                  transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 30,
                                  }}
                                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md ${
                                    includeUnrated ? "left-[18px]" : "left-0.5"
                                  }`}
                                />
                              </button>
                              <div>
                                <div className="text-xs font-semibold text-white">
                                  Include unrated movies
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Unrated movies always appear at the top of the
                                  list.
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                              {includeUnrated ? "On" : "Off"}
                            </span>
                          </div>

                          {/* Filter Controls Bottom Bar with Reset Button */}
                          <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                            <span className="text-xs text-slate-400">
                              Showing{" "}
                              <strong className="text-white">
                                <CountUp
                                  value={filteredAndSortedRatings.length}
                                />
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
                                setSortBy("rating-desc");
                                setIncludeUnrated(true);
                                setWatchlistSearchQuery("");
                              }}
                              disabled={
                                minRatingFilter === 0 &&
                                sortBy === "rating-desc" &&
                                includeUnrated &&
                                !watchlistSearchQuery
                              }
                              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 disabled:opacity-40 disabled:hover:bg-slate-800/80 text-xs font-semibold rounded-xl border border-white/10 transition-all shadow-lg"
                            >
                              <RotateCcw size={13} className="text-amber-300" />
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
                            setSortBy("rating-desc");
                            setIncludeUnrated(true);
                            setWatchlistSearchQuery("");
                          }}
                          className="clap-stripes-amber px-5 py-2 text-[#f2eee3] text-xs font-bold rounded-full hover:brightness-110 transition-all shadow-lg shadow-black/30 ring-1 ring-black/40 flex items-center gap-1.5"
                        >
                          <RotateCcw size={13} /> Reset Filters
                        </button>
                      ) : (
                        <button
                          onClick={() => goToTab("combo")}
                          className="clap-stripes-amber px-5 py-2 text-[#f2eee3] text-xs font-bold rounded-full hover:brightness-110 transition-all shadow-lg shadow-black/30 ring-1 ring-black/40"
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
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="mx-auto max-w-2xl"
                >
                  <div className="mb-7">
                    <div className="mb-2 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-300" />
                      Scene 04 · Backstage
                    </div>
                    <h2 className="poster-text text-4xl tracking-[0.02em] text-white leading-none">
                      Settings
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Manage your profile, security, and app preferences.
                    </p>
                  </div>

                  {settingsMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mb-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${
                        settingsMsg.tone === "success"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-rose-500/20 bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {settingsMsg.tone === "success" ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <X size={14} />
                      )}
                      {settingsMsg.text}
                    </motion.div>
                  )}

                  <div className="space-y-5">
                    {/* --- Profile --- */}
                    <motion.section
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                      className="clap-board relative rounded-3xl border border-white/[0.08] p-6 backdrop-blur-xl shadow-[0_16px_45px_rgba(2,6,23,0.3)]"
                    >
                      <span className="clap-corner clap-corner-tl" />
                      <span className="clap-corner clap-corner-tr" />
                      <span className="clap-corner clap-corner-bl" />
                      <span className="clap-corner clap-corner-br" />
                      <div className="film-tape absolute -top-2 left-8 h-4 w-20" />
                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-amber-300">
                          <UserRound size={17} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            Profile
                          </h3>
                          <p className="text-xs text-slate-500">
                            Your public display name
                          </p>
                        </div>
                      </div>

                      <div className="mb-5 flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#15151c] text-lg font-extrabold text-amber-300 shadow-lg ring-1 ring-amber-300/30">
                          {(userData?.name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-base font-bold text-white">
                            {userData?.name || "—"}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Mail size={12} />
                            <span className="truncate">
                              {session?.user?.email || "No email on file"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          type="text"
                          placeholder="New username"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSaveUsername();
                            }
                          }}
                          className="flex-1 bg-black/50 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-400/70 focus:ring-4 focus:ring-amber-400/10 transition-all placeholder:text-slate-600"
                        />

                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={handleSaveUsername}
                          disabled={usernameSaving || !newUsername.trim()}
                          className="clap-stripes-amber text-[#f2eee3] font-bold text-xs rounded-xl px-5 py-2.5 transition-opacity disabled:opacity-40 shadow-lg ring-1 ring-black/40"
                        >
                          {usernameSaving ? "Saving…" : "Save username"}
                        </motion.button>
                      </div>
                    </motion.section>

                    {/* --- Security --- */}
                    <motion.section
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="clap-board relative rounded-3xl border border-white/[0.08] p-6 backdrop-blur-xl shadow-[0_16px_45px_rgba(2,6,23,0.3)]"
                    >
                      <span className="clap-corner clap-corner-tl" />
                      <span className="clap-corner clap-corner-tr" />
                      <span className="clap-corner clap-corner-bl" />
                      <span className="clap-corner clap-corner-br" />
                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-amber-300">
                          <KeyRound size={17} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            Change password
                          </h3>
                          <p className="text-xs text-slate-500">
                            At least 6 characters
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <input
                          type="password"
                          placeholder="Current password"
                          value={passwordForm.current}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              current: e.target.value,
                            })
                          }
                          className="w-full bg-black/50 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-400/70 focus:ring-4 focus:ring-amber-400/10 transition-all placeholder:text-slate-600"
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input
                            type="password"
                            placeholder="New password"
                            value={passwordForm.next}
                            onChange={(e) =>
                              setPasswordForm({
                                ...passwordForm,
                                next: e.target.value,
                              })
                            }
                            className="w-full bg-black/50 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-400/70 focus:ring-4 focus:ring-amber-400/10 transition-all placeholder:text-slate-600"
                          />
                          <input
                            type="password"
                            placeholder="Confirm new password"
                            value={passwordForm.confirm}
                            onChange={(e) =>
                              setPasswordForm({
                                ...passwordForm,
                                confirm: e.target.value,
                              })
                            }
                            className="w-full bg-black/50 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-400/70 focus:ring-4 focus:ring-amber-400/10 transition-all placeholder:text-slate-600"
                          />
                        </div>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={handleChangePassword}
                          disabled={passwordLoading}
                          className="w-full flex items-center justify-center gap-2 border border-white/10 bg-white/5 text-white font-semibold text-xs rounded-xl py-2.5 transition-colors hover:bg-white/10 disabled:opacity-50"
                        >
                          {passwordLoading ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <ShieldCheck size={14} className="text-amber-300" />
                          )}
                          {passwordLoading ? "Updating…" : "Update password"}
                        </motion.button>
                      </div>
                    </motion.section>

                    {/* --- Sign-in methods --- */}
                    <motion.section
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="clap-board relative rounded-3xl border border-white/[0.08] p-6 backdrop-blur-xl shadow-[0_16px_45px_rgba(2,6,23,0.3)]"
                    >
                      <span className="clap-corner clap-corner-tl" />
                      <span className="clap-corner clap-corner-tr" />
                      <span className="clap-corner clap-corner-bl" />
                      <span className="clap-corner clap-corner-br" />
                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-amber-300">
                          <Award size={17} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            Sign-in methods
                          </h3>
                          <p className="text-xs text-slate-500">
                            Connect Google to this account so you can log in
                            without a password
                          </p>
                        </div>
                      </div>

                      {hasGoogleLinked ? (
                        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                          <GoogleIcon size={18} />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-white">
                              Google connected
                            </div>
                            <div className="text-xs text-slate-400">
                              You can sign in with Google on this account.
                            </div>
                          </div>
                          <CheckCircle2
                            size={16}
                            className="text-emerald-400 shrink-0"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="flex-1 text-xs text-slate-400">
                            Link your Google account to sign in without a
                            password. Use a Google account with the same email
                            as this one for a seamless link.
                          </div>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.97 }}
                            onClick={handleLinkGoogle}
                            disabled={authLoading}
                            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white hover:bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-800 transition-all disabled:opacity-60 shadow-[0_10px_28px_rgba(255,255,255,0.12)]"
                          >
                            {authLoading ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <GoogleIcon size={14} />
                            )}
                            {authLoading ? "Connecting…" : "Connect Google"}
                          </motion.button>
                        </div>
                      )}
                    </motion.section>

                    {/* --- Danger zone --- */}
                    <motion.section
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="rounded-3xl border border-rose-500/15 bg-rose-500/[0.04] p-6 backdrop-blur-xl"
                    >
                      <span className="clap-corner clap-corner-tl" />
                      <span className="clap-corner clap-corner-tr" />
                      <span className="clap-corner clap-corner-bl" />
                      <span className="clap-corner clap-corner-br" />
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                          <LogOut size={17} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            Sign out
                          </h3>
                          <p className="text-xs text-slate-500">
                            End your session on this device
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => supabase.auth.signOut()}
                        className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/20"
                      >
                        <LogOut size={14} /> Sign out
                      </button>
                    </motion.section>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.main>
        )}
      </AnimatePresence>

      <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-max items-center gap-1 rounded-2xl border border-white/[0.10] bg-[#090D16]/85 p-1.5 shadow-[0_18px_50px_rgba(2,6,23,0.52)] backdrop-blur-2xl md:hidden">
        {[
          { id: "foryou", label: "For you", icon: Star },
          { id: "combo", label: "Blend", icon: Sparkles },
          { id: "watchlist", label: "Library", icon: Film },
        ].map(({ id, label, icon: Icon }) => (
          <motion.button
            key={id}
            whileTap={{ scale: 0.92 }}
            onClick={() => goToTab(id as any)}
            className={`flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl px-3 text-[10px] font-bold transition-all ${activeTab === id ? "clap-stripes-amber text-[#f2eee3] shadow-lg shadow-black/30 ring-1 ring-black/40" : "text-slate-400"}`}
            aria-label={label}
          >
            <Icon size={14} />
            {activeTab === id && <span>{label}</span>}
          </motion.button>
        ))}
      </div>

      {/* --- MOVIE DETAILS MODAL --- */}
      <AnimatePresence>
        {selectedMovie && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMovie(null)}
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 50% 12%, rgba(245, 158, 11, 0.14), transparent 38%)",
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 28, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.94, y: 20, filter: "blur(8px)" }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 28,
                mass: 0.8,
              }}
              className="clap-board relative w-full max-w-2xl bg-[#090D16]/95 border border-white/[0.14] rounded-3xl overflow-hidden shadow-[0_30px_100px_rgba(2,6,23,0.78)] z-10 max-h-[90vh] flex flex-col backdrop-blur-2xl"
            >
              <span className="clap-corner clap-corner-tl" />
              <span className="clap-corner clap-corner-tr" />
              <span className="clap-corner clap-corner-bl" />
              <span className="clap-corner clap-corner-br" />
              <div className="film-tape absolute -top-2 left-1/2 z-20 h-4 w-28 -translate-x-1/2" />
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
                <div className="absolute inset-0 bg-gradient-to-t from-[#090D16] via-[#090D16]/45 to-transparent" />
                <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(99,102,241,0.16),transparent_38%,transparent_62%,rgba(56,189,248,0.12))]" />

                <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                  <div>
                    <div className="mb-1.5 inline-flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-amber-300/90">
                      <span className="inline-block h-1 w-1 rounded-full bg-amber-300" />
                      SCENE 05 · Detail
                    </div>
                    <h2 className="poster-text text-4xl tracking-[0.02em] text-white leading-none">
                      {selectedMovie.title}
                    </h2>
                    <div className="mt-2 flex items-center gap-4 text-xs font-semibold text-slate-300">
                      {selectedMovie.release_date && (
                        <span className="flex items-center gap-1.5 text-amber-300">
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
                      ref={modalAddRef}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAddToWatchlist(selectedMovie)}
                      disabled={isUpdating}
                      className="clap-stripes-amber flex items-center gap-1.5 text-[#f2eee3] text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-black/30 ring-1 ring-black/40"
                    >
                      <Plus size={14} /> Add to Watchlist
                    </motion.button>
                  )}
                </div>
              </div>

              <div className="soft-scrollbar p-6 overflow-y-auto space-y-6 flex-1">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Info size={14} className="text-amber-300" /> Synopsis
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
                      <StarRating
                        value={selectedRating}
                        onChange={(r) => handleRate(selectedMovie, r)}
                        size={24}
                        disabled={isUpdating}
                      />
                      <motion.span
                        key={selectedRating}
                        initial={{ scale: 0.7, opacity: 0.4 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 18,
                        }}
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
                <Info size={14} className="text-amber-300 shrink-0" />
              )}
              <span className="leading-snug">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
