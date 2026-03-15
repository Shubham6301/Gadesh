import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { API_URL } from '../config/api';
import {
  Clock, TrendingUp, Zap, Calendar, Flame, BarChart2,
  ChevronLeft, ChevronRight, Target, Award, Trophy,
  Code, Swords, Star, CheckCircle, Activity, Moon,
  BookOpen, Cpu, Layers, Timer, Hash,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirrors backend profile response exactly (same as Profile.tsx)
// ─────────────────────────────────────────────────────────────────────────────
interface ProfileData {
  username: string;
  coins?: number;

  // From backend aggregations
  last7DaysSubmissions: number[];
  weeklySubmissionsCount: number;
  totalProblemsCount: number;
  activeDaysCount: number;

  stats: {
    problemsSolved: { total: number; easy: number; medium: number; hard: number };
    totalSubmissions: number;
    correctSubmissions: number;
    accuracy: number;
    currentStreak: number;
    maxStreak: number;
    lastSubmissionDate?: string;
  };

  ratings: {
    gameRating: number;
    rapidFireRating: number;
    contestRating: number;
    globalRank: number;
    percentile: number;
  };

  submissions: {
    problem: string;
    status: string;
    language: string;
    runtime: number;
    memory: number;
    date: string;
  }[];

  gameHistory: {
    result: string;
    ratingChange: number;
    date: string;
    opponent?: { username: string };
    problem?: { title: string; difficulty: string };
  }[];

  contestHistory: {
    rank: number;
    score: number;
    ratingChange: number;
    date: string;
    contest?: { name: string };
  }[];

  topicProgress: { topic: string; solved: number; total: number }[];
  solvedProblems: { _id: string; title: string; difficulty: string }[];

  rapidFireHistory?: {
    result: string;
    ratingChange: number;
    date: string;
  }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// normalizeProfile — same defensive normalization as Profile.tsx
// ensures no undefined/null crashes anywhere in the component
// ─────────────────────────────────────────────────────────────────────────────
function normalizeProfile(data: any): ProfileData {
  return {
    username:               data.username               || '',
    coins:                  data.coins                  ?? 0,
    last7DaysSubmissions:   data.last7DaysSubmissions   || [0,0,0,0,0,0,0],
    weeklySubmissionsCount: data.weeklySubmissionsCount || 0,
    totalProblemsCount:     data.totalProblemsCount     || 0,
    activeDaysCount:        data.activeDaysCount        || 0,

    stats: {
      problemsSolved: {
        total:  data.stats?.problemsSolved?.total  || 0,
        easy:   data.stats?.problemsSolved?.easy   || 0,
        medium: data.stats?.problemsSolved?.medium || 0,
        hard:   data.stats?.problemsSolved?.hard   || 0,
      },
      totalSubmissions:   data.stats?.totalSubmissions   || 0,
      correctSubmissions: data.stats?.correctSubmissions || 0,
      accuracy:           data.stats?.accuracy           || 0,
      currentStreak:      data.stats?.currentStreak      || 0,
      maxStreak:          data.stats?.maxStreak          || 0,
      lastSubmissionDate: data.stats?.lastSubmissionDate || '',
    },

    ratings: {
      gameRating:      data.ratings?.gameRating      || 1200,
      rapidFireRating: data.ratings?.rapidFireRating || 1200,
      contestRating:   data.ratings?.contestRating   || 1200,
      globalRank:      data.ratings?.globalRank      || 0,
      percentile:      data.ratings?.percentile      || 0,
    },

    // Sort submissions descending by date (newest first) — consistent with Profile.tsx
    submissions: (data.submissions || []).sort(
      (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),

    gameHistory:      data.gameHistory      || [],
    contestHistory:   data.contestHistory   || [],
    topicProgress:    data.topicProgress    || [],
    solvedProblems:   data.solvedProblems   || [],
    rapidFireHistory: data.rapidFireHistory || [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// toIST — manually shifts UTC → IST (+5:30)
// IMPORTANT: always pair with timeZone:'UTC' in toLocaleString/toLocaleDateString
// so the browser doesn't apply its own local offset on top of our manual shift.
// ─────────────────────────────────────────────────────────────────────────────
const toIST = (d: Date) => new Date(d.getTime() + 5.5 * 60 * 60 * 1000);

const HOUR_LABELS  = Array.from({ length: 24 }, (_, i) =>
  i === 0 ? '12a' : i < 12 ? `${i}a` : i === 12 ? '12p' : `${i - 12}p`
);
const DAY_LABELS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL     = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const LANG_COLORS  = ['#818cf8','#34d399','#fbbf24','#fb923c','#f472b6'];
const ACCENT       = '#818cf8';

function fmtHour(h: number) {
  if (h === 0) return '12 AM';
  if (h < 12)  return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function fmtTime(mins: number) {
  if (mins <= 0) return '0m';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// FIXED: timeZone:'UTC' prevents double-offset (toIST already added +5:30)
function fmtDateTime(dateStr: string) {
  if (!dateStr) return '—';
  try {
    const d = toIST(new Date(dateStr));
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
      timeZone: 'UTC',
    });
  } catch {
    return '—';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// sessionMins — estimates minutes per submission for "Total Time" stat.
// This is an APPROXIMATION because the API does not store actual coding duration.
// All other stats (counts, ratings, streaks, etc.) are 100% real API data.
// ─────────────────────────────────────────────────────────────────────────────
function sessionMins(
  idx: number,
  all: { date: string; status: string }[]
) {
  if (idx + 1 < all.length) {
    const gap = (
      new Date(all[idx + 1].date).getTime() - new Date(all[idx].date).getTime()
    ) / 60000;
    if (gap > 0 && gap < 120) return Math.min(Math.round(gap), 90);
  }
  const accepted = all[idx]?.status === 'accepted' || all[idx]?.status === 'Accepted';
  return accepted ? 30 : 20;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color: string; dark: boolean; accent?: boolean;
}> = ({ icon, label, value, sub, color, dark, accent }) => (
  <div className={`relative rounded-2xl p-5 border flex flex-col gap-1.5 transition-all duration-200 hover:scale-[1.02] overflow-hidden ${
    dark
      ? accent ? 'bg-gray-800 border-gray-600' : 'bg-gray-800/70 border-gray-700/60'
      : accent ? 'bg-white border-gray-200 shadow-md' : 'bg-white border-gray-200 shadow-sm'
  }`}>
    {accent && (
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, ${color}, transparent 70%)` }}
      />
    )}
    <div className="flex items-center gap-2 relative">
      <div className="p-1.5 rounded-lg" style={{ background: `${color}18` }}>
        <span style={{ color, display: 'block', lineHeight: 1 }}>{icon}</span>
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
    <div className={`text-2xl font-black relative ${dark ? 'text-white' : 'text-gray-900'}`}>{value}</div>
    {sub && <div className={`text-xs relative ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{sub}</div>}
  </div>
);

const SectionHeader: React.FC<{
  icon: React.ReactNode; title: string; dark: boolean;
  color?: string; right?: React.ReactNode;
}> = ({ icon, title, dark, color = ACCENT, right }) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-2.5">
      <div className="p-1.5 rounded-lg" style={{ background: `${color}18` }}>
        <span style={{ color, display: 'block', lineHeight: 1 }}>{icon}</span>
      </div>
      <h2 className={`font-bold text-sm tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
    </div>
    {right}
  </div>
);

interface TimelineEvent {
  time: string; date: string; sortKey: string;
  type: 'submission' | 'game' | 'contest';
  title: string; subtitle: string;
  badge: string; badgeColor: string;
  result?: 'success' | 'fail' | 'neutral';
  meta?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Backgrounds
// ─────────────────────────────────────────────────────────────────────────────
const DarkBackground: React.FC = () => (
  <>
    <style>{`
      @keyframes ta-neural-pulse {
        0%, 100% { transform: translateX(0px) translateY(0px) scale(1) rotate(0deg); opacity: 0.6; }
        25%       { transform: translateX(20px) translateY(-15px) scale(1.1) rotate(90deg); opacity: 1; }
        50%       { transform: translateX(-10px) translateY(20px) scale(0.9) rotate(180deg); opacity: 0.8; }
        75%       { transform: translateX(30px) translateY(5px) scale(1.05) rotate(270deg); opacity: 0.9; }
      }
      @keyframes ta-data-stream {
        0%   { transform: translateY(-100px) translateX(0px) rotate(0deg); opacity: 0; }
        10%  { opacity: 0.8; }
        90%  { opacity: 0.8; }
        100% { transform: translateY(100vh) translateX(25px) rotate(360deg); opacity: 0; }
      }
      @keyframes ta-neural-node {
        0%, 100% { opacity: 0.4; transform: scale(1) rotate(0deg); }
        50%       { opacity: 1;   transform: scale(1.1) rotate(180deg); }
      }
      @keyframes ta-constellation {
        0%   { transform: rotate(0deg) translateX(120px) rotate(0deg); }
        100% { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
      }
      @keyframes ta-quantum-field {
        0%, 100% {
          background: linear-gradient(45deg, rgba(59,130,246,0.1), rgba(147,51,234,0.1));
          transform: scale(1) rotate(0deg);
        }
        33% {
          background: linear-gradient(45deg, rgba(16,185,129,0.1), rgba(59,130,246,0.1));
          transform: scale(1.1) rotate(120deg);
        }
        66% {
          background: linear-gradient(45deg, rgba(139,92,246,0.1), rgba(16,185,129,0.1));
          transform: scale(0.9) rotate(240deg);
        }
      }
      @keyframes ta-circuit-flow {
        0%   { transform: translateX(-100px) translateY(0px) rotate(0deg); opacity: 0; }
        10%  { opacity: 0.7; }
        90%  { opacity: 0.7; }
        100% { transform: translateX(100vw) translateY(20px) rotate(360deg); opacity: 0; }
      }
      .ta-neural-pulse  { animation: ta-neural-pulse 7s ease-in-out infinite; }
      .ta-data-stream   { animation: ta-data-stream 9s linear infinite; }
      .ta-neural-node   { animation: ta-neural-node 3s ease-in-out infinite; }
      .ta-constellation { animation: ta-constellation 25s linear infinite; }
      .ta-quantum-field { animation: ta-quantum-field 14s ease-in-out infinite; }
      .ta-circuit-flow  { animation: ta-circuit-flow 10s linear infinite; }
    `}</style>
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute top-1/4 left-1/5 w-96 h-96 ta-quantum-field rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 ta-quantum-field rounded-full blur-3xl" style={{ animationDelay: '5s' }} />
      <div className="absolute top-2/3 left-1/3 w-64 h-64 ta-quantum-field rounded-full blur-2xl" style={{ animationDelay: '10s' }} />
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={`ta-nn-${i}`}
          className={`ta-neural-node absolute ${
            i % 7 === 0 ? 'w-2 h-2 bg-blue-400 rounded-full'       :
            i % 7 === 1 ? 'w-1.5 h-1.5 bg-purple-400 rounded-full' :
            i % 7 === 2 ? 'w-2 h-2 bg-cyan-400 rounded-full'       :
            i % 7 === 3 ? 'w-1 h-1 bg-green-400 rounded-full'      :
            i % 7 === 4 ? 'w-1.5 h-1.5 bg-teal-400 rounded-full'   :
            i % 7 === 5 ? 'w-2 h-2 bg-indigo-400 rounded-full'     :
                          'w-1.5 h-1.5 bg-violet-400 rounded-full'
          }`}
          style={{
            left: `${(i * 37 + 13) % 100}%`,
            top:  `${(i * 53 +  7) % 100}%`,
            animationDelay:    `${(i * 0.3) % 3}s`,
            animationDuration: `${3 + (i % 3) * 0.7}s`,
          }}
        />
      ))}
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={`ta-ds-${i}`}
          className={`ta-data-stream absolute w-1 h-6 ${
            i % 4 === 0 ? 'bg-gradient-to-b from-blue-400 to-transparent'   :
            i % 4 === 1 ? 'bg-gradient-to-b from-purple-400 to-transparent' :
            i % 4 === 2 ? 'bg-gradient-to-b from-cyan-400 to-transparent'   :
                          'bg-gradient-to-b from-green-400 to-transparent'
          }`}
          style={{
            left:              `${(i * 17 + 5) % 100}%`,
            animationDelay:    `${(i * 0.75) % 9}s`,
            animationDuration: `${9 + (i % 4)}s`,
          }}
        />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={`ta-cf-${i}`}
          className={`ta-circuit-flow absolute w-1 h-1 ${
            i % 4 === 0 ? 'bg-blue-400'   :
            i % 4 === 1 ? 'bg-purple-400' :
            i % 4 === 2 ? 'bg-cyan-400'   : 'bg-green-400'
          } rounded-full`}
          style={{
            top:               `${(i * 23 + 11) % 100}%`,
            animationDelay:    `${(i * 1.25) % 10}s`,
            animationDuration: `${10 + (i % 5)}s`,
          }}
        />
      ))}
      <div className="absolute top-1/4 left-1/4 w-4 h-4">
        <div className="ta-constellation w-2 h-2 bg-blue-400 rounded-full ta-neural-node" />
      </div>
      <div className="absolute top-3/4 right-1/3 w-4 h-4">
        <div className="ta-constellation w-2 h-2 bg-purple-400 rounded-full ta-neural-node" style={{ animationDelay: '8s' }} />
      </div>
      <div className="absolute top-1/2 left-2/3 w-4 h-4">
        <div className="ta-constellation w-2 h-2 bg-cyan-400 rounded-full ta-neural-node" style={{ animationDelay: '12s' }} />
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={`ta-np-${i}`}
          className={`ta-neural-pulse absolute ${
            i % 4 === 0 ? 'w-4 h-4 bg-gradient-to-br from-blue-500/40 to-cyan-500/40'      :
            i % 4 === 1 ? 'w-3 h-3 bg-gradient-to-br from-purple-500/40 to-violet-500/40'  :
            i % 4 === 2 ? 'w-3.5 h-3.5 bg-gradient-to-br from-green-500/40 to-teal-500/40' :
                          'w-4 h-4 bg-gradient-to-br from-indigo-500/40 to-purple-500/40'
          } rounded-full blur-sm`}
          style={{
            left:              `${(i * 41 +  9) % 100}%`,
            top:               `${(i * 29 + 17) % 100}%`,
            animationDuration: `${7 + (i % 3)}s`,
            animationDelay:    `${(i * 0.7) % 7}s`,
          }}
        />
      ))}
    </div>
  </>
);

const LightBackground: React.FC = () => (
  <>
    <style>{`
      @keyframes ta-light-float {
        0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.5; }
        25%       { transform: translateY(-10px) translateX(12px) rotate(90deg); opacity: 0.8; }
        50%       { transform: translateY(6px) translateX(-8px) rotate(180deg); opacity: 1; }
        75%       { transform: translateY(-15px) translateX(18px) rotate(270deg); opacity: 0.6; }
      }
      @keyframes ta-light-particle {
        0%   { transform: translateY(-30px) translateX(0px) rotate(0deg); opacity: 0; }
        10%  { opacity: 0.6; }
        90%  { opacity: 0.6; }
        100% { transform: translateY(100vh) translateX(20px) rotate(360deg); opacity: 0; }
      }
      @keyframes ta-aurora {
        0%, 100% {
          background: linear-gradient(45deg, rgba(59,130,246,0.12), rgba(147,51,234,0.12));
          transform: scale(1) rotate(0deg);
        }
        33% {
          background: linear-gradient(45deg, rgba(16,185,129,0.12), rgba(59,130,246,0.12));
          transform: scale(1.05) rotate(120deg);
        }
        66% {
          background: linear-gradient(45deg, rgba(139,92,246,0.12), rgba(16,185,129,0.12));
          transform: scale(0.95) rotate(240deg);
        }
      }
      @keyframes ta-light-glow {
        0%, 100% {
          box-shadow: 0 0 10px rgba(59,130,246,0.3), 0 0 20px rgba(147,51,234,0.2);
          opacity: 0.5;
        }
        50% {
          box-shadow: 0 0 20px rgba(59,130,246,0.5), 0 0 40px rgba(147,51,234,0.4);
          opacity: 1;
        }
      }
      .ta-light-float    { animation: ta-light-float 6s ease-in-out infinite; }
      .ta-light-particle { animation: ta-light-particle 8s linear infinite; }
      .ta-aurora         { animation: ta-aurora 11s ease-in-out infinite; }
      .ta-light-glow     { animation: ta-light-glow 2.8s ease-in-out infinite; }
    `}</style>
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute top-1/5 left-1/3 w-96 h-96 ta-aurora rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/5 w-80 h-80 ta-aurora rounded-full blur-3xl" style={{ animationDelay: '4s' }} />
      <div className="absolute top-2/3 left-1/6 w-64 h-64 ta-aurora rounded-full blur-2xl" style={{ animationDelay: '8s' }} />
      {Array.from({ length: 25 }).map((_, i) => (
        <div key={`ta-ln-${i}`}
          className={`ta-light-glow absolute ${
            i % 6 === 0 ? 'w-2 h-2 bg-blue-400/60 rounded-full'       :
            i % 6 === 1 ? 'w-1.5 h-1.5 bg-purple-400/60 rounded-full' :
            i % 6 === 2 ? 'w-2 h-2 bg-cyan-400/60 rounded-full'       :
            i % 6 === 3 ? 'w-1 h-1 bg-green-400/60 rounded-full'      :
            i % 6 === 4 ? 'w-1.5 h-1.5 bg-teal-400/60 rounded-full'   :
                          'w-2 h-2 bg-indigo-400/60 rounded-full'
          }`}
          style={{
            left:              `${(i * 43 +  7) % 100}%`,
            top:               `${(i * 31 + 13) % 100}%`,
            animationDelay:    `${(i * 0.112) % 2.8}s`,
            animationDuration: `${2.8 + (i % 3) * 0.5}s`,
          }}
        />
      ))}
      {Array.from({ length: 15 }).map((_, i) => (
        <div key={`ta-lp-${i}`}
          className={`ta-light-particle absolute w-1 h-1 ${
            i % 5 === 0 ? 'bg-blue-300/50'   :
            i % 5 === 1 ? 'bg-purple-300/50' :
            i % 5 === 2 ? 'bg-cyan-300/50'   :
            i % 5 === 3 ? 'bg-green-300/50'  : 'bg-teal-300/50'
          } rounded-full`}
          style={{
            left:              `${(i * 19 + 11) % 100}%`,
            animationDelay:    `${(i * 0.53) % 8}s`,
            animationDuration: `${8 + (i % 3)}s`,
          }}
        />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={`ta-lf-${i}`}
          className={`ta-light-float absolute ${
            i % 4 === 0 ? 'w-3 h-3 bg-gradient-to-br from-blue-200/50 to-purple-200/50'     :
            i % 4 === 1 ? 'w-2.5 h-2.5 bg-gradient-to-br from-cyan-200/50 to-teal-200/50'   :
            i % 4 === 2 ? 'w-3 h-3 bg-gradient-to-br from-green-200/50 to-blue-200/50'      :
                          'w-2.5 h-2.5 bg-gradient-to-br from-indigo-200/50 to-violet-200/50'
          } rounded-full blur-sm`}
          style={{
            left:              `${(i * 47 +  3) % 100}%`,
            top:               `${(i * 37 + 19) % 100}%`,
            animationDuration: `${6 + (i % 3) * 0.7}s`,
            animationDelay:    `${(i * 0.75) % 6}s`,
          }}
        />
      ))}
    </div>
  </>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const TimeAnalytics: React.FC = () => {
  const { isDark } = useTheme();
  const { user }   = useAuth();

  const [profile, setProfile]       = useState<ProfileData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [chartView, setChartView]   = useState<'weekly' | 'hourly' | 'monthly'>('weekly');
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeTab, setActiveTab]   = useState<'overview' | 'timeline' | 'games' | 'contests' | 'topics'>('overview');
  const [tlFilter, setTlFilter]     = useState<'all' | 'submission' | 'game' | 'contest'>('all');

  // ── Fetch profile — identical pattern to Profile.tsx ──────────────────────
  useEffect(() => {
    if (!user?.username) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    axios
      .get(`${API_URL}/profile/${user.username}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params:  { _t: Date.now() },
      })
      .then(res => setProfile(normalizeProfile(res.data)))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [user?.username]);

  // ── Submissions sorted ascending for time calculations ────────────────────
  const submissions = useMemo(() => profile?.submissions ?? [], [profile]);
  const sortedSubs  = useMemo(
    () => [...submissions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [submissions]
  );

  // ── Real submission counts per hour / day / month (IST) ──────────────────
  const hourCounts = useMemo(() => {
    const a = new Array(24).fill(0);
    sortedSubs.forEach(s => { a[toIST(new Date(s.date)).getUTCHours()]++; });
    return a;
  }, [sortedSubs]);

  const dayCounts = useMemo(() => {
    const a = new Array(7).fill(0);
    sortedSubs.forEach(s => { a[toIST(new Date(s.date)).getUTCDay()]++; });
    return a;
  }, [sortedSubs]);

  const monthCounts = useMemo(() => {
    const a = new Array(12).fill(0);
    sortedSubs.forEach(s => { a[toIST(new Date(s.date)).getUTCMonth()]++; });
    return a;
  }, [sortedSubs]);

  // ── Time estimates (approximated — no real duration data in API) ──────────
  const totalMinutes = useMemo(
    () => sortedSubs.reduce((acc, _, i) => acc + sessionMins(i, sortedSubs), 0),
    [sortedSubs]
  );

  const avgDailyMins = useMemo(() => {
    if (sortedSubs.length === 0) return 0;
    const spanDays = Math.max(
      1,
      Math.ceil(
        (new Date(sortedSubs[sortedSubs.length - 1].date).getTime() -
          new Date(sortedSubs[0].date).getTime()) /
          86400000
      )
    );
    return Math.round(totalMinutes / spanDays);
  }, [sortedSubs, totalMinutes]);

  // ── Peak hour / day from real submission data ─────────────────────────────
  const peakHour = useMemo(() => hourCounts.indexOf(Math.max(...hourCounts)), [hourCounts]);
  const peakDay  = useMemo(() => dayCounts.indexOf(Math.max(...dayCounts)),   [dayCounts]);

  // ── Weekly bars — real per-day submission counts & estimated time ─────────
  const weeklyBars = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, j) => {
      const d  = new Date(now);
      d.setDate(d.getDate() - (6 - j) - weekOffset * 7);
      const ds = toIST(d).toISOString().split('T')[0];
      const subs = sortedSubs.filter(
        s => toIST(new Date(s.date)).toISOString().split('T')[0] === ds
      );
      const mins = subs.reduce(
        (acc, sub) =>
          acc + sessionMins(sortedSubs.findIndex(x => x.date === sub.date), sortedSubs),
        0
      );
      return {
        label: DAY_LABELS[d.getDay()],
        date:  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        mins,
        count: subs.length,
      };
    });
  }, [sortedSubs, weekOffset]);

  // ── Game stats — all from real gameHistory ────────────────────────────────
  const gameStats = useMemo(() => {
    const h      = profile?.gameHistory ?? [];
    const wins   = h.filter(g => g.result === 'win').length;
    const losses = h.filter(g => g.result === 'lose').length;
    const draws  = h.filter(g => g.result === 'draw').length;
    return {
      total:      h.length,
      wins,
      losses,
      draws,
      winRate:    h.length > 0 ? Math.round((wins / h.length) * 100) : 0,
      ratingGain: h.reduce((a, g) => a + (g.ratingChange || 0), 0),
    };
  }, [profile]);

  // ── Contest stats — all from real contestHistory ──────────────────────────
  const contestStats = useMemo(() => {
    const h       = profile?.contestHistory ?? [];
    const validRanks = h.map(c => c.rank).filter(r => r > 0);
    return {
      total:      h.length,
      bestRank:   validRanks.length > 0 ? Math.min(...validRanks) : 0,
      totalScore: h.reduce((a, c) => a + (c.score || 0), 0),
    };
  }, [profile]);

  // ── Language breakdown — from real submission language field ──────────────
  const languageStats = useMemo(() => {
    const m: Record<string, number> = {};
    submissions.forEach(s => {
      if (s.language) m[s.language] = (m[s.language] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [submissions]);

  // ── Rank / percentile display (matches Profile.tsx logic) ─────────────────
  const hasActivity = profile
    ? profile.ratings.gameRating      > 1200 ||
      profile.ratings.contestRating   > 1200 ||
      profile.ratings.rapidFireRating > 1200 ||
      profile.stats.totalSubmissions  > 0    ||
      profile.stats.problemsSolved.total > 0
    : false;

  const displayRank = !profile || !hasActivity
    ? 'Unranked'
    : profile.ratings.globalRank > 0
      ? `#${profile.ratings.globalRank}`
      : 'Unranked';

  const displayPct = !profile || !hasActivity
    ? 'N/A'
    : profile.ratings.percentile > 0
      ? `Top ${profile.ratings.percentile.toFixed(1)}%`
      : 'N/A';

  // ── Global score breakdown — all from real ratings ────────────────────────
  const scoreBreakdown = profile
    ? [
        { label: 'Game Rating',     value: profile.ratings.gameRating,              color: '#3b82f6', points: profile.ratings.gameRating      || 1200 },
        { label: 'Contest Rating',  value: profile.ratings.contestRating,           color: '#a855f7', points: profile.ratings.contestRating   || 1200 },
        { label: 'Rapid Fire',      value: profile.ratings.rapidFireRating,         color: '#f43f5e', points: profile.ratings.rapidFireRating || 1200 },
        { label: 'Problems Solved', value: profile.stats.problemsSolved.total,      color: '#10b981', points: (profile.stats.problemsSolved.total || 0) * 10 },
        { label: 'Accuracy',        value: `${profile.stats.accuracy.toFixed(1)}%`, color: '#fbbf24', points: Math.round((profile.stats.accuracy || 0) * 10) },
      ]
    : [];
  const totalScore = scoreBreakdown.reduce((a, b) => a + b.points, 0);
  const maxScore   = 2000 + 2000 + 2000 + 5000 + 1000;

  // ── Real values from backend aggregations ─────────────────────────────────
  const weeklyCount = profile?.weeklySubmissionsCount ?? 0;
  const activeDays  = profile?.activeDaysCount        ?? 0;

  // ── Timeline events — built entirely from real API data ──────────────────
  const allEvents = useMemo((): TimelineEvent[] => {
    if (!profile) return [];
    const ev: TimelineEvent[] = [];

    profile.submissions.forEach(s => {
      const ist      = toIST(new Date(s.date));
      const accepted = s.status === 'accepted' || s.status === 'Accepted';
      ev.push({
        time: ist.toLocaleString('en-IN', {
          hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC',
        }),
        date: ist.toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
        }),
        sortKey:    s.date,
        type:       'submission',
        title:      s.language ? `Submitted · ${s.language}` : 'Code submitted',
        subtitle:   [
          s.runtime > 0 ? `${s.runtime}ms` : null,
          s.memory  > 0 ? `${s.memory}MB`  : null,
        ].filter(Boolean).join('  ·  ') || 'No runtime data',
        badge:      accepted ? 'Accepted' : (s.status || 'Attempted'),
        badgeColor: accepted ? '#10b981'  : '#ef4444',
        result:     accepted ? 'success'  : 'fail',
      });
    });

    profile.gameHistory.forEach(g => {
      if (!g.date) return;
      const ist = toIST(new Date(g.date));
      ev.push({
        time: ist.toLocaleString('en-IN', {
          hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC',
        }),
        date: ist.toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
        }),
        sortKey:    g.date,
        type:       'game',
        title:      g.opponent?.username ? `Game vs @${g.opponent.username}` : 'Coding Game',
        subtitle:   g.problem?.title ?? '—',
        badge:      g.result === 'win'  ? 'Win'  : g.result === 'lose' ? 'Loss' : 'Draw',
        badgeColor: g.result === 'win'  ? '#10b981' : g.result === 'lose' ? '#ef4444' : '#6b7280',
        result:     g.result === 'win'  ? 'success' : g.result === 'lose' ? 'fail' : 'neutral',
        meta:       `${g.ratingChange >= 0 ? '+' : ''}${g.ratingChange} pts`,
      });
    });

    profile.contestHistory.forEach(c => {
      if (!c.date || !c.contest) return;
      const ist = toIST(new Date(c.date));
      ev.push({
        time: ist.toLocaleString('en-IN', {
          hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC',
        }),
        date: ist.toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
        }),
        sortKey:    c.date,
        type:       'contest',
        title:      c.contest.name,
        subtitle:   `Rank #${c.rank}  ·  ${c.score} pts`,
        badge:      `#${c.rank}`,
        badgeColor: c.rank <= 3 ? '#f59e0b' : c.rank <= 10 ? '#818cf8' : '#6b7280',
        result:     c.rank <= 10 ? 'success' : 'neutral',
        meta:       `${c.ratingChange >= 0 ? '+' : ''}${c.ratingChange}`,
      });
    });

    return ev.sort((a, b) => new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime());
  }, [profile]);

  const filteredEvents = useMemo(
    () => tlFilter === 'all' ? allEvents : allEvents.filter(e => e.type === tlFilter),
    [allEvents, tlFilter]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    filteredEvents.forEach(e => { map.set(e.date, [...(map.get(e.date) ?? []), e]); });
    return map;
  }, [filteredEvents]);

  // ── Theme helpers ─────────────────────────────────────────────────────────
  const bg      = isDark ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100';
  const card    = isDark ? 'bg-gray-800/80 border-gray-700/50'                          : 'bg-white border-gray-200 shadow-sm';
  const txt     = isDark ? 'text-white'                                                  : 'text-gray-900';
  const muted   = isDark ? 'text-gray-400'                                               : 'text-gray-500';
  const divider = isDark ? 'border-gray-700/60'                                          : 'border-gray-100';

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${bg} relative`}>
      {isDark ? <DarkBackground /> : <LightBackground />}
      <div className="relative z-10 text-center space-y-4">
        <div className="relative w-12 h-12 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700" />
          <div
            className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${ACCENT} transparent transparent transparent` }}
          />
        </div>
        <p className={`text-sm font-medium ${muted}`}>Loading analytics…</p>
      </div>
    </div>
  );

  // ── No profile ────────────────────────────────────────────────────────────
  if (!profile) return (
    <div className={`min-h-screen flex items-center justify-center ${bg} relative`}>
      {isDark ? <DarkBackground /> : <LightBackground />}
      <div className={`relative z-10 text-center p-8 rounded-2xl border ${card}`}>
        <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-3">
          <Activity size={20} className="text-red-500" />
        </div>
        <p className={`text-sm font-semibold ${txt}`}>No data found</p>
        <p className={`text-xs mt-1 ${muted}`}>Start solving problems to see your analytics</p>
      </div>
    </div>
  );

  // ── Derived display values ────────────────────────────────────────────────
  const maxWeek  = Math.max(...weeklyBars.map(d => d.mins), 1);
  const maxHour  = Math.max(...hourCounts, 1);
  const maxMonth = Math.max(...monthCounts, 1);
  const maxDay   = Math.max(...dayCounts, 1);

  const peakLabel =
    peakHour >= 21 || peakHour <= 4 ? 'Night Owl 🌙'
    : peakHour < 12                  ? 'Morning Coder ☀️'
    : peakHour < 17                  ? 'Afternoon Grinder 💪'
    :                                  'Evening Hacker 🌆';

  const tabs = [
    { id: 'overview',  label: 'Overview',  icon: <BarChart2 size={12}/> },
    { id: 'timeline',  label: 'Timeline',  icon: <Clock size={12}/> },
    { id: 'games',     label: 'Games',     icon: <Swords size={12}/> },
    { id: 'contests',  label: 'Contests',  icon: <Trophy size={12}/> },
    { id: 'topics',    label: 'Topics',    icon: <BookOpen size={12}/> },
  ] as const;

  return (
    <div className={`${bg} min-h-screen relative`}>
      {isDark ? <DarkBackground /> : <LightBackground />}

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 space-y-5">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}18` }}>
              <Clock size={20} color={ACCENT} />
            </div>
            <div>
              <h1 className={`text-2xl font-black tracking-tight ${txt}`}>Analytics</h1>
              <p className={`text-xs ${muted}`}>@{profile.username}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black" style={{ color: ACCENT }}>{profile.stats.currentStreak}🔥</div>
            <div className={`text-xs ${muted}`}>day streak</div>
          </div>
        </div>

        {/* ── KPI Row 1 — time stats ────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Timer size={14}/>}      label="Total Time"    value={fmtTime(totalMinutes)}
            sub={`${submissions.length} submissions`}              color={ACCENT}  dark={isDark} accent />
          <StatCard
            icon={<TrendingUp size={14}/>} label="Daily Average" value={fmtTime(avgDailyMins)}
            sub="estimated per day"                                color="#34d399" dark={isDark} />
          <StatCard
            icon={<Flame size={14}/>}      label="Best Streak"   value={`${profile.stats.maxStreak}d`}
            sub={`Current: ${profile.stats.currentStreak}d`}      color="#fb923c" dark={isDark} />
          <StatCard
            icon={<Calendar size={14}/>}   label="Active Days"   value={activeDays}
            sub="days with activity"                               color="#10b981" dark={isDark} />
        </div>

        {/* ── KPI Row 2 — problem / rating stats ───────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<CheckCircle size={14}/>} label="Problems"   value={profile.stats.problemsSolved.total}
            sub={`${profile.stats.accuracy.toFixed(1)}% accuracy`} color="#10b981" dark={isDark} />
          <StatCard
            icon={<Trophy size={14}/>}      label="Contest"    value={profile.ratings.contestRating}
            sub={`${contestStats.total} contests`}               color="#a855f7" dark={isDark} accent />
          <StatCard
            icon={<Swords size={14}/>}      label="Game"       value={profile.ratings.gameRating}
            sub={`${gameStats.winRate}% win rate`}               color="#3b82f6" dark={isDark} accent />
          <StatCard
            icon={<Zap size={14}/>}         label="Rapid Fire" value={profile.ratings.rapidFireRating}
            sub="ELO rating"                                     color="#f43f5e" dark={isDark} accent />
        </div>

        {/* ── KPI Row 3 — activity stats ────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Activity size={14}/>}   label="This Week"       value={weeklyCount}
            sub="submissions"                                        color={ACCENT}  dark={isDark} />
          <StatCard
            icon={<Award size={14}/>}      label="Global Rank"     value={displayRank}
            sub={displayPct !== 'N/A' ? displayPct : undefined}     color="#fb923c" dark={isDark} accent />
          <StatCard
            icon={<Hash size={14}/>}       label="Total Submitted" value={profile.stats.totalSubmissions}
            sub={`${profile.stats.correctSubmissions} accepted`}    color="#3b82f6" dark={isDark} />
          <StatCard
            icon={<Cpu size={14}/>}        label="Peak Hour"       value={fmtHour(peakHour)}
            sub={peakLabel}                                          color="#fbbf24" dark={isDark} />
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div className={`flex gap-1 p-1.5 rounded-2xl border w-full overflow-x-auto ${card}`}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-1 justify-center ${
                activeTab === tab.id ? 'text-white shadow-sm' : muted
              }`}
              style={activeTab === tab.id ? { background: ACCENT } : {}}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            OVERVIEW TAB
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-5">

            {/* Global Score */}
            <div className={`rounded-2xl border p-5 ${card}`}>
              <SectionHeader
                icon={<Award size={14}/>}
                title="Global Score"
                dark={isDark}
                color="#fb923c"
                right={
                  <div className="text-right">
                    <div className="text-xl font-black" style={{ color: ACCENT }}>{totalScore.toLocaleString()}</div>
                    <div className={`text-xs ${muted}`}>{displayRank} · {displayPct}</div>
                  </div>
                }
              />
              <div className={`w-full h-2 rounded-full mb-5 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${Math.min((totalScore / maxScore) * 100, 100)}%`,
                    background: 'linear-gradient(90deg,#818cf8,#fb923c)',
                  }}
                />
              </div>
              <div className="space-y-3">
                {scoreBreakdown.map((item, i) => {
                  const pct = Math.min((item.points / maxScore) * 100, 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold ${muted}`}>{item.label}</span>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-medium ${muted}`}>{item.value}</span>
                          <span className="text-xs font-black tabular-nums" style={{ color: item.color, minWidth: 56, textAlign: 'right' }}>
                            {item.points.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className={`h-1.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: item.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity Chart */}
            <div className={`rounded-2xl border p-5 ${card}`}>
              <SectionHeader
                icon={<BarChart2 size={14}/>}
                title="Submission Activity"
                dark={isDark}
                right={
                  <div className="flex gap-1">
                    {(['weekly','hourly','monthly'] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => setChartView(v)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all ${chartView === v ? 'text-white' : muted}`}
                        style={chartView === v ? { background: ACCENT } : {}}>
                        {v}
                      </button>
                    ))}
                  </div>
                }
              />

              {/* Weekly chart */}
              {chartView === 'weekly' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setWeekOffset(o => o + 1)} className={`p-1.5 rounded-lg ${muted} hover:opacity-70`}>
                      <ChevronLeft size={14}/>
                    </button>
                    <span className={`text-xs font-semibold ${muted}`}>
                      {weekOffset === 0 ? 'This week' : `${weekOffset}w ago`}
                    </span>
                    <button
                      onClick={() => setWeekOffset(o => Math.max(0, o - 1))}
                      disabled={weekOffset === 0}
                      className={`p-1.5 rounded-lg ${muted} hover:opacity-70 disabled:opacity-20`}>
                      <ChevronRight size={14}/>
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {weeklyBars.map((day, i) => {
                      const pct     = day.mins / maxWeek;
                      const isToday = i === 6 && weekOffset === 0;
                      return (
                        <div
                          key={i}
                          className="flex flex-col items-center gap-1.5"
                          title={`${day.date}: ${fmtTime(day.mins)}, ${day.count} subs`}>
                          <div className="relative w-full" style={{ height: 80 }}>
                            <div
                              className="absolute bottom-0 w-full rounded-t-lg transition-all duration-700"
                              style={{
                                height:    `${Math.max(pct * 100, day.mins > 0 ? 5 : 0)}%`,
                                minHeight: day.mins > 0 ? 3 : 0,
                                background: isToday ? ACCENT : `rgba(129,140,248,${0.12 + pct * 0.55})`,
                              }}
                            />
                          </div>
                          <span
                            className={`text-[10px] font-bold ${isToday ? '' : muted}`}
                            style={isToday ? { color: ACCENT } : {}}>
                            {day.label}
                          </span>
                          {day.mins > 0 && (
                            <span className={`text-[9px] ${muted}`}>{fmtTime(day.mins)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Hourly chart */}
              {chartView === 'hourly' && (
                <>
                  <div className="grid gap-0.5 mb-3" style={{ gridTemplateColumns: 'repeat(24, 1fr)' }}>
                    {hourCounts.map((c, h) => {
                      const pct    = c / maxHour;
                      const isPeak = c === Math.max(...hourCounts) && c > 0;
                      return (
                        <div key={h} className="flex flex-col items-center gap-0.5" title={`${fmtHour(h)}: ${c} submissions`}>
                          <div className="w-full relative" style={{ height: 64 }}>
                            <div
                              className="absolute bottom-0 w-full rounded-t-sm transition-all duration-700"
                              style={{
                                height:     `${pct * 100}%`,
                                background: isPeak ? ACCENT : `rgba(129,140,248,${0.1 + pct * 0.55})`,
                              }}
                            />
                          </div>
                          <span className="text-[7px]" style={{ color: isPeak ? ACCENT : undefined }}>
                            {HOUR_LABELS[h]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div
                    className={`p-3 rounded-xl border ${divider} flex items-center gap-2`}
                    style={{ background: `${ACCENT}0d` }}>
                    <Moon size={13} color={ACCENT}/>
                    <span className={`text-xs ${txt}`}>
                      Peak coding hour: <strong style={{ color: ACCENT }}>{fmtHour(peakHour)}</strong> — {peakLabel}
                    </span>
                  </div>
                </>
              )}

              {/* Monthly chart */}
              {chartView === 'monthly' && (
                <div className="grid grid-cols-12 gap-1.5">
                  {monthCounts.map((c, m) => {
                    const pct   = c / maxMonth;
                    const isNow = m === new Date().getMonth();
                    return (
                      <div key={m} className="flex flex-col items-center gap-1" title={`${MONTH_LABELS[m]}: ${c} submissions`}>
                        <div className="w-full relative" style={{ height: 70 }}>
                          <div
                            className="absolute bottom-0 w-full rounded-t-md transition-all duration-700"
                            style={{
                              height:     `${Math.max(pct * 100, c > 0 ? 5 : 0)}%`,
                              background: isNow ? ACCENT : `rgba(129,140,248,${0.12 + pct * 0.5})`,
                            }}
                          />
                        </div>
                        <span className="text-[9px] font-bold" style={{ color: isNow ? ACCENT : undefined }}>
                          {MONTH_LABELS[m]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3-col: By Day / Difficulty / Languages */}
            <div className="grid md:grid-cols-3 gap-4">

              {/* By Day */}
              <div className={`rounded-2xl border p-5 ${card}`}>
                <SectionHeader icon={<Calendar size={13}/>} title="By Day" dark={isDark}/>
                <div className="space-y-2">
                  {DAY_LABELS.map((day, i) => {
                    const pct    = dayCounts[i] / maxDay;
                    const isPeak = i === peakDay;
                    return (
                      <div key={day} className="flex items-center gap-2.5">
                        <span
                          className={`text-[11px] w-7 font-bold ${isPeak ? '' : muted}`}
                          style={isPeak ? { color: ACCENT } : {}}>
                          {day}
                        </span>
                        <div className={`flex-1 h-1.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct * 100}%`, background: isPeak ? ACCENT : 'rgba(129,140,248,0.35)' }}
                          />
                        </div>
                        <span className={`text-[10px] w-4 text-right tabular-nums ${muted}`}>{dayCounts[i]}</span>
                      </div>
                    );
                  })}
                </div>
                <p className={`mt-3 text-[11px] ${muted}`}>
                  Power day: <strong style={{ color: ACCENT }}>{DAY_FULL[peakDay]}</strong>
                </p>
              </div>

              {/* Difficulty */}
              <div className={`rounded-2xl border p-5 ${card}`}>
                <SectionHeader icon={<Target size={13}/>} title="Difficulty" dark={isDark} color="#10b981"/>
                <div className="space-y-3">
                  {[
                    { label: 'Easy',   count: profile.stats.problemsSolved.easy,   color: '#10b981' },
                    { label: 'Medium', count: profile.stats.problemsSolved.medium, color: '#f59e0b' },
                    { label: 'Hard',   count: profile.stats.problemsSolved.hard,   color: '#ef4444' },
                  ].map(d => {
                    const pct = profile.stats.problemsSolved.total > 0
                      ? (d.count / profile.stats.problemsSolved.total) * 100 : 0;
                    return (
                      <div key={d.label}>
                        <div className="flex justify-between mb-1">
                          <span className={`text-[11px] font-semibold ${muted}`}>{d.label}</span>
                          <span className="text-[11px] font-bold tabular-nums" style={{ color: d.color }}>{d.count}</span>
                        </div>
                        <div className={`h-1.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className={`mt-4 pt-4 border-t ${divider} grid grid-cols-2 gap-2 text-center`}>
                  <div>
                    <div className={`text-base font-black ${txt}`}>{profile.stats.correctSubmissions}</div>
                    <div className={`text-[10px] ${muted}`}>Accepted</div>
                  </div>
                  <div>
                    <div className={`text-base font-black ${txt}`}>{profile.stats.accuracy.toFixed(0)}%</div>
                    <div className={`text-[10px] ${muted}`}>Accuracy</div>
                  </div>
                </div>
              </div>

              {/* Languages */}
              <div className={`rounded-2xl border p-5 ${card}`}>
                <SectionHeader icon={<Code size={13}/>} title="Languages" dark={isDark} color="#3b82f6"/>
                {languageStats.length > 0 ? (
                  <div className="space-y-3">
                    {languageStats.map(([lang, count], i) => {
                      const pct = (count / submissions.length) * 100;
                      return (
                        <div key={lang}>
                          <div className="flex justify-between mb-1">
                            <span className={`text-[11px] font-semibold ${muted}`}>{lang}</span>
                            <span className="text-[11px] font-bold" style={{ color: LANG_COLORS[i] }}>
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                          <div className={`h-1.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: LANG_COLORS[i] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className={`text-xs ${muted} mt-4 text-center`}>No submissions yet</p>
                )}
              </div>
            </div>

            {/* Insights */}
            <div className={`rounded-2xl border p-5 ${card}`}>
              <SectionHeader icon={<Layers size={13}/>} title="Insights" dark={isDark} color="#f59e0b"/>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  {
                    icon: '🌙', color: ACCENT,
                    title: `Peak at ${fmtHour(peakHour)}`,
                    sub: peakLabel,
                  },
                  {
                    icon: '📅', color: '#34d399',
                    title: `${DAY_FULL[peakDay]} is your power day`,
                    sub: `${dayCounts[peakDay]} submissions`,
                  },
                  {
                    icon: '🔥', color: '#fb923c',
                    title: profile.stats.currentStreak > 0 ? `${profile.stats.currentStreak}-day streak` : 'No streak yet',
                    sub: profile.stats.maxStreak > 0 ? `Best: ${profile.stats.maxStreak} days` : 'Start today!',
                  },
                  {
                    icon: '⏱️', color: '#10b981',
                    title: `${fmtTime(avgDailyMins)} avg daily`,
                    sub: avgDailyMins >= 30 ? 'Great consistency!' : 'Aim for 30m/day',
                  },
                  {
                    icon: '🏆', color: '#a855f7',
                    title: `${contestStats.total} contests`,
                    sub: contestStats.bestRank > 0 ? `Best rank #${contestStats.bestRank}` : 'Join a contest!',
                  },
                  {
                    icon: '⚔️', color: '#3b82f6',
                    title: `${gameStats.wins}W  ${gameStats.losses}L  ${gameStats.draws}D`,
                    sub: `${gameStats.winRate}% win rate`,
                  },
                  {
                    icon: '📊', color: '#f43f5e',
                    title: `${weeklyCount} this week`,
                    sub: weeklyCount > 0 ? 'Keep going!' : 'Start coding today',
                  },
                  {
                    icon: '🗓️', color: '#10b981',
                    title: `${activeDays} active days`,
                    sub: 'Total days on platform',
                  },
                ].map((ins, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border ${divider} ${isDark ? 'bg-gray-900/30' : 'bg-gray-50/80'}`}>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
                      style={{ background: `${ins.color}18` }}>
                      {ins.icon}
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${txt}`}>{ins.title}</div>
                      <div className={`text-[11px] ${muted} mt-0.5`}>{ins.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TIMELINE TAB
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'timeline' && (
          <div className="space-y-5">
            <div className={`flex gap-1 p-1.5 rounded-2xl border ${card}`}>
              {([
                { id: 'all',        label: 'All',         count: allEvents.length },
                { id: 'submission', label: 'Submissions', count: allEvents.filter(e => e.type === 'submission').length },
                { id: 'game',       label: 'Games',       count: allEvents.filter(e => e.type === 'game').length },
                { id: 'contest',    label: 'Contests',    count: allEvents.filter(e => e.type === 'contest').length },
              ] as const).map(f => (
                <button
                  key={f.id}
                  onClick={() => setTlFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all flex-1 justify-center ${
                    tlFilter === f.id ? 'text-white' : muted
                  }`}
                  style={tlFilter === f.id ? { background: ACCENT } : {}}>
                  {f.label}
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                    tlFilter === f.id ? 'bg-white/20 text-white' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'
                  }`}>{f.count}</span>
                </button>
              ))}
            </div>

            {filteredEvents.length === 0 ? (
              <div className={`rounded-2xl border p-12 text-center ${card}`}>
                <p className={`text-sm font-semibold ${txt}`}>No activity yet</p>
                <p className={`text-xs ${muted} mt-1`}>Start solving to build your timeline</p>
              </div>
            ) : (
              <div className="space-y-7">
                {Array.from(eventsByDate.entries()).map(([date, events]) => (
                  <div key={date}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`px-3 py-1 rounded-lg text-xs font-bold flex-shrink-0 ${
                        isDark ? 'bg-gray-800 text-gray-300 border border-gray-700' : 'bg-gray-100 text-gray-600'
                      }`}>{date}</div>
                      <div className={`flex-1 h-px ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />
                      <span className={`text-[10px] font-semibold flex-shrink-0 ${muted}`}>
                        {events.length} event{events.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="relative pl-7 space-y-2">
                      <div className={`absolute left-2.5 top-3 bottom-3 w-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                      {events.map((ev, ei) => {
                        const typeColor =
                          ev.type === 'submission'
                            ? (ev.result === 'success' ? '#10b981' : '#ef4444')
                            : ev.type === 'game'
                              ? (ev.result === 'success' ? '#3b82f6' : ev.result === 'fail' ? '#ef4444' : '#6b7280')
                              : '#a855f7';
                        const typeIcon =
                          ev.type === 'submission' ? <Code size={10}/> :
                          ev.type === 'game'       ? <Swords size={10}/> :
                                                     <Trophy size={10}/>;
                        return (
                          <div
                            key={ei}
                            className={`relative flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-150 hover:scale-[1.005] ${
                              isDark
                                ? 'bg-gray-800/60 border-gray-700/50 hover:bg-gray-800'
                                : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
                            }`}>
                            <div
                              className="absolute -left-5 top-4 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                              style={{ background: isDark ? '#030712' : 'white', borderColor: typeColor }}>
                              <div className="w-1 h-1 rounded-full" style={{ background: typeColor }} />
                            </div>
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ background: `${typeColor}18`, color: typeColor }}>
                              {typeIcon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className={`text-xs font-semibold truncate ${txt}`}>{ev.title}</p>
                                  <p className={`text-[11px] ${muted} mt-0.5 truncate`}>{ev.subtitle}</p>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {ev.type !== 'submission' && ev.meta && (
                                    <span className={`text-[10px] font-bold tabular-nums ${
                                      ev.meta.startsWith('+') ? 'text-emerald-500' :
                                      ev.meta.startsWith('-') ? 'text-red-500' : muted
                                    }`}>{ev.meta}</span>
                                  )}
                                  <span
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                                    style={{ background: `${ev.badgeColor}18`, color: ev.badgeColor }}>
                                    {ev.badge}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className={`text-[10px] font-medium flex-shrink-0 mt-1 tabular-nums ${muted}`}>{ev.time}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            GAMES TAB
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'games' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={<Swords size={14}/>}      label="Total"    value={gameStats.total}                                                       color="#3b82f6" dark={isDark} accent />
              <StatCard icon={<CheckCircle size={14}/>} label="Wins"     value={gameStats.wins}    sub={`${gameStats.winRate}% win rate`}               color="#10b981" dark={isDark} accent />
              <StatCard icon={<Activity size={14}/>}    label="Losses"   value={gameStats.losses}                                                       color="#ef4444" dark={isDark} />
              <StatCard icon={<TrendingUp size={14}/>}  label="Rating ±" value={`${gameStats.ratingGain >= 0 ? '+' : ''}${gameStats.ratingGain}`}       color="#fbbf24" dark={isDark} accent />
            </div>

            {/* Win / Loss / Draw bar */}
            <div className={`rounded-2xl border p-5 ${card}`}>
              <SectionHeader icon={<Swords size={13}/>} title="Win / Loss / Draw" dark={isDark} color="#3b82f6"/>
              {gameStats.total > 0 ? (
                <>
                  <div className="flex h-3 rounded-full overflow-hidden mb-3">
                    <div style={{ width: `${(gameStats.wins   / gameStats.total) * 100}%`, background: '#10b981' }} className="transition-all duration-700"/>
                    <div style={{ width: `${(gameStats.draws  / gameStats.total) * 100}%`, background: '#6b7280' }} className="transition-all duration-700"/>
                    <div style={{ width: `${(gameStats.losses / gameStats.total) * 100}%`, background: '#ef4444' }} className="transition-all duration-700"/>
                  </div>
                  <div className={`flex gap-5 text-xs ${muted}`}>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block"/>Win {gameStats.wins}</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-gray-500 inline-block"/>Draw {gameStats.draws}</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block"/>Loss {gameStats.losses}</span>
                  </div>
                </>
              ) : <p className={`text-xs ${muted}`}>No games yet.</p>}
            </div>

            {/* Recent Games list */}
            <div className={`rounded-2xl border p-5 ${card}`}>
              <SectionHeader icon={<Activity size={13}/>} title="Recent Games" dark={isDark} color="#3b82f6"/>
              <div className="space-y-2">
                {(profile.gameHistory ?? []).length === 0 && (
                  <p className={`text-xs ${muted} text-center py-6`}>No games yet!</p>
                )}
                {(profile.gameHistory ?? [])
                  .slice()
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 10)
                  .map((g, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3.5 rounded-xl border ${divider} ${isDark ? 'bg-gray-900/30' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black ${
                          g.result === 'win'  ? 'bg-emerald-500/15 text-emerald-500' :
                          g.result === 'lose' ? 'bg-red-500/15 text-red-500'         :
                                               'bg-gray-500/15 text-gray-400'
                        }`}>
                          {g.result === 'win' ? 'W' : g.result === 'lose' ? 'L' : 'D'}
                        </div>
                        <div>
                          <div className={`text-xs font-semibold ${txt}`}>
                            vs {g.opponent?.username ?? 'Unknown'}
                          </div>
                          <div className={`text-[10px] ${muted}`}>{g.problem?.title ?? '—'}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-bold tabular-nums ${g.ratingChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {g.ratingChange >= 0 ? '+' : ''}{g.ratingChange}
                        </div>
                        <div className={`text-[10px] ${muted}`}>{fmtDateTime(g.date)}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            CONTESTS TAB
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'contests' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={<Trophy size={14}/>} label="Contests"    value={contestStats.total}                                                  color="#a855f7" dark={isDark} accent />
              <StatCard icon={<Award size={14}/>}  label="Best Rank"   value={contestStats.bestRank > 0 ? `#${contestStats.bestRank}` : 'N/A'}    color="#fbbf24" dark={isDark} accent />
              <StatCard icon={<Star size={14}/>}   label="Total Score" value={contestStats.totalScore}                                             color="#10b981" dark={isDark} />
            </div>

            <div className={`rounded-2xl border p-5 ${card}`}>
              <SectionHeader icon={<Trophy size={13}/>} title="Contest History" dark={isDark} color="#a855f7"/>
              <div className="space-y-2">
                {(profile.contestHistory ?? []).length === 0 && (
                  <p className={`text-xs ${muted} text-center py-6`}>No contests yet!</p>
                )}
                {(profile.contestHistory ?? [])
                  .filter(c => c.contest)
                  .slice()
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((c, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3.5 rounded-xl border ${divider} ${isDark ? 'bg-gray-900/30' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black"
                          style={{
                            background: c.rank <= 3 ? '#f59e0b18' : `${ACCENT}15`,
                            color:      c.rank <= 3 ? '#f59e0b'   : ACCENT,
                          }}>
                          #{c.rank}
                        </div>
                        <div>
                          <div className={`text-xs font-semibold ${txt}`}>{c.contest?.name}</div>
                          <div className={`text-[10px] ${muted}`}>{fmtDateTime(c.date)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-purple-500 tabular-nums">{c.score} pts</div>
                        <div className={`text-[10px] tabular-nums ${c.ratingChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {c.ratingChange >= 0 ? '+' : ''}{c.ratingChange}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TOPICS TAB
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'topics' && (
          <div className="space-y-4">

            {/* Topic Progress */}
            <div className={`rounded-2xl border p-5 ${card}`}>
              <SectionHeader icon={<Target size={13}/>} title="Topic Progress" dark={isDark} color="#10b981"/>
              {profile.topicProgress && profile.topicProgress.length > 0 ? (
                <div className="space-y-4">
                  {profile.topicProgress.map((t, i) => {
                    const pct   = t.total > 0 ? (t.solved / t.total) * 100 : 0;
                    const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
                    return (
                      <div key={i}>
                        <div className="flex justify-between mb-1.5">
                          <span className={`text-xs font-semibold ${txt}`}>{t.topic}</span>
                          <span className="text-xs font-bold tabular-nums" style={{ color }}>
                            {t.solved}/{t.total} · {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className={`h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={`text-xs ${muted} text-center py-8`}>Solve problems to see topic progress</p>
              )}
            </div>

            {/* Recently Solved */}
            <div className={`rounded-2xl border p-5 ${card}`}>
              <SectionHeader icon={<CheckCircle size={13}/>} title="Recently Solved" dark={isDark} color="#10b981"/>
              <div className="space-y-2">
                {(profile.solvedProblems ?? []).length === 0 && (
                  <p className={`text-xs ${muted} text-center py-6`}>No problems solved yet</p>
                )}
                {(profile.solvedProblems ?? []).slice(0, 15).map((p, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-xl border ${divider} ${isDark ? 'bg-gray-900/30' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2.5">
                      <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />
                      <span className={`text-xs font-medium truncate max-w-[200px] ${txt}`}>{p.title}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0 ${
                      p.difficulty === 'Easy'   ? 'bg-emerald-500/15 text-emerald-500' :
                      p.difficulty === 'Medium' ? 'bg-amber-500/15 text-amber-500'     :
                                                   'bg-red-500/15 text-red-500'
                    }`}>{p.difficulty}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default TimeAnalytics;
