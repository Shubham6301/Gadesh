import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import {
  User, Github, Linkedin, Trophy, Code, TrendingUp, Award, Star,
  Target, Zap, Activity, CheckCircle, Coins,
} from 'lucide-react';
import { API_URL } from '../config/api';
import SubmissionCalendar from '../components/SubmissionCalendar';
import { showError, showSuccess } from '../utils/toast';
import FollowButton from '../components/FollowButton';

// ─────────────────────────────────────────────────────────────────────────────
// Types — exactly mirrors backend response from profile.js
// ─────────────────────────────────────────────────────────────────────────────
interface UserProfile {
  _id: string;
  username: string;
  email: string;
  role: string;
  coins: number;

  totalProblemsCount: number;
  last7DaysSubmissions: number[];
  weeklySubmissionsCount: number;
  activeDaysCount: number;

  profile: {
    firstName: string;
    lastName: string;
    linkedIn: string;
    github: string;
    avatar: string;
    bio: string;
    location: string;
    college: string;
    branch: string;
    graduationYear: number;
  };

  stats: {
    problemsSolved: { total: number; easy: number; medium: number; hard: number };
    problemsAttempted: number;
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

  topicProgress: { topic: string; solved: number; total: number }[];
  solvedProblems: { _id: string; title: string; difficulty: string }[];

  gameHistory: {
    opponent: { username: string };
    result: string;
    ratingChange: number;
    problem: { title: string; difficulty: string };
    date: string;
  }[];

  contestHistory: {
    contest: { name: string };
    rank: number;
    score: number;
    ratingChange: number;
    date: string;
  }[];

  submissions: {
    problem: string;
    status: string;
    language: string;
    runtime: number;
    memory: number;
    date: string;
  }[];

  recentActivities: { type: string; date: string; message: string }[];

  rapidFireHistory?: {
    result: string;
    ratingChange: number;
    date: string;
  }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated Counter
// ─────────────────────────────────────────────────────────────────────────────
const AnimatedCounter: React.FC<{
  end: number; duration?: number; prefix?: string; suffix?: string;
}> = ({ end, duration = 2000, prefix = '', suffix = '' }) => {
  const [count, setCount]         = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !isVisible) setIsVisible(true); },
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    let startTime: number;
    let id: number;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - progress, 3)) * end));
      if (progress < 1) id = requestAnimationFrame(animate);
    };
    id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [end, duration, isVisible]);

  return <span ref={ref}>{prefix}{count}{suffix}</span>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Progress Circle
// ─────────────────────────────────────────────────────────────────────────────
const ProgressCircle: React.FC<{
  percentage: number; size?: number; strokeWidth?: number; color?: string; label?: string;
}> = ({ percentage, size = 120, strokeWidth = 8, color = '#3B82F6', label }) => {
  const radius        = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset        = circumference - (Math.min(percentage, 100) / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor"
          strokeWidth={strokeWidth} fill="transparent" className="text-gray-200 dark:text-gray-700" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color}
          strokeWidth={strokeWidth} fill="transparent"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-xl font-bold text-gray-900 dark:text-white">
          <AnimatedCounter end={Math.round(percentage)} suffix="%" />
        </span>
        {label && <span className="text-xs text-gray-600 dark:text-gray-400 text-center">{label}</span>}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Activity Chart — SVG bar chart with day labels and value dots
// ─────────────────────────────────────────────────────────────────────────────
const ActivityChart: React.FC<{ data: number[]; isDark?: boolean }> = ({ data, isDark }) => {
  const [hov, setHov] = useState<number | null>(null);
  const maxVal = Math.max(...data, 1);
  const today  = new Date();
  const days   = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return { short: d.toLocaleDateString('en-US', { weekday: 'short' }), narrow: d.toLocaleDateString('en-US', { weekday: 'narrow' }) };
  });

  const W = 280, H = 80, PAD = 6, BAR_W = 28, GAP = (W - PAD * 2 - BAR_W * 7) / 6;
  const trackClr = isDark ? '#1e293b' : '#e0e7ff';

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 20}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="wa-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#6366f1" stopOpacity="1"   />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="wa-today" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#8b5cf6" stopOpacity="1"   />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {data.map((val, i) => {
        const isToday = i === 6;
        const isHov   = hov === i;
        const fillH   = Math.max((val / maxVal) * H, val > 0 ? 5 : 2);
        const x       = PAD + i * (BAR_W + GAP);
        const y       = H - fillH;
        const rx      = 5;

        return (
          <g key={i}
            onMouseEnter={() => setHov(i)}
            onMouseLeave={() => setHov(null)}
            style={{ cursor: 'pointer' }}>

            {/* Track */}
            <rect x={x} y={0} width={BAR_W} height={H} rx={rx}
              fill={trackClr} opacity={hov !== null && !isHov ? 0.4 : 1} />

            {/* Fill */}
            <rect x={x} y={y} width={BAR_W} height={fillH} rx={rx}
              fill={isToday ? 'url(#wa-today)' : 'url(#wa-grad)'}
              opacity={isHov ? 1 : hov !== null ? 0.35 : isToday ? 1 : 0.8}
              style={{ transition: 'opacity 0.15s' }} />

            {/* Glow on hover/today */}
            {(isHov || isToday) && fillH > 4 && (
              <rect x={x - 1} y={y - 1} width={BAR_W + 2} height={fillH + 2} rx={rx + 1}
                fill="none"
                stroke={isToday ? '#8b5cf6' : '#6366f1'}
                strokeWidth="1.5" opacity="0.6" />
            )}

            {/* Value above bar on hover */}
            {isHov && val > 0 && (
              <text x={x + BAR_W / 2} y={y - 4}
                textAnchor="middle" fontSize="9" fontWeight="800"
                fill={isToday ? '#8b5cf6' : '#6366f1'}>
                {val}
              </text>
            )}

            {/* Day label below */}
            <text x={x + BAR_W / 2} y={H + 14}
              textAnchor="middle" fontSize="9" fontWeight={isToday ? '800' : '600'}
              fill={isToday ? '#6366f1' : isDark ? '#6b7280' : '#9ca3af'}
              opacity={hov !== null && !isHov ? 0.4 : 1}>
              {days[i].narrow}
            </text>
          </g>
        );
      })}
    </svg>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// Helper colours
// ─────────────────────────────────────────────────────────────────────────────
const getDifficultyColor = (d: string) =>
  d === 'Easy'   ? 'text-green-700 bg-green-200 dark:text-green-300 dark:bg-green-800/50'
: d === 'Medium' ? 'text-yellow-700 bg-yellow-200 dark:text-yellow-300 dark:bg-yellow-800/50'
: d === 'Hard'   ? 'text-red-700 bg-red-200 dark:text-red-300 dark:bg-red-800/50'
:                  'text-gray-700 bg-gray-200 dark:text-gray-300 dark:bg-gray-800/50';

const getResultColor = (r: string) =>
  r === 'win'  ? 'text-green-600'
: r === 'lose' ? 'text-red-600'
:                'text-gray-600';

const getStatusColor = (s: string) =>
  s === 'accepted' ? 'text-green-700 bg-green-200 dark:text-green-300 dark:bg-green-800/50'
: s === 'wrong'    ? 'text-red-700 bg-red-200 dark:text-red-300 dark:bg-red-800/50'
:                    'text-gray-700 bg-gray-200 dark:text-gray-300 dark:bg-gray-800/50';

// ─────────────────────────────────────────────────────────────────────────────
// normalize — converts raw API response to typed UserProfile
// ─────────────────────────────────────────────────────────────────────────────
function normalizeProfile(data: any): UserProfile {
  return {
    _id:      data._id      || '',
    username: data.username || '',
    email:    data.email    || '',
    role:     data.role     || 'user',
    coins:    data.coins    ?? 0,

    totalProblemsCount:     data.totalProblemsCount     || 0,
    last7DaysSubmissions:   data.last7DaysSubmissions   || [0,0,0,0,0,0,0],
    weeklySubmissionsCount: data.weeklySubmissionsCount || 0,
    activeDaysCount:        data.activeDaysCount        || 0,

    profile: {
      firstName:      data.profile?.firstName      || '',
      lastName:       data.profile?.lastName       || '',
      linkedIn:       data.profile?.linkedIn       || '',
      github:         data.profile?.github         || '',
      avatar:         data.profile?.avatar         || '',
      bio:            data.profile?.bio            || '',
      location:       data.profile?.location       || '',
      college:        data.profile?.college        || '',
      branch:         data.profile?.branch         || '',
      graduationYear: data.profile?.graduationYear || 0,
    },

    stats: {
      problemsSolved: {
        total:  data.stats?.problemsSolved?.total  || 0,
        easy:   data.stats?.problemsSolved?.easy   || 0,
        medium: data.stats?.problemsSolved?.medium || 0,
        hard:   data.stats?.problemsSolved?.hard   || 0,
      },
      problemsAttempted:  data.stats?.problemsAttempted  || 0,
      totalSubmissions:   data.stats?.totalSubmissions   || 0,
      correctSubmissions: data.stats?.correctSubmissions || 0,
      accuracy:           data.stats?.accuracy           || 0,
      currentStreak:      data.stats?.currentStreak      || 0,
      maxStreak:          data.stats?.maxStreak           || 0,
      lastSubmissionDate: data.stats?.lastSubmissionDate || '',
    },

    ratings: {
      gameRating:      data.ratings?.gameRating      || 1200,
      rapidFireRating: data.ratings?.rapidFireRating || 1200,
      contestRating:   data.ratings?.contestRating   || 1200,
      globalRank:      data.ratings?.globalRank      || 0,
      percentile:      data.ratings?.percentile      || 0,
    },

    topicProgress:   data.topicProgress   || [],
    solvedProblems:  data.solvedProblems  || [],
    gameHistory:     data.gameHistory     || [],
    contestHistory:  data.contestHistory  || [],
    rapidFireHistory: data.rapidFireHistory || [],
    submissions: (data.submissions || []).sort(
      (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    recentActivities: data.recentActivities || [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Component
// ─────────────────────────────────────────────────────────────────────────────
const Profile: React.FC = () => {
  const { username }          = useParams<{ username: string }>();
  const { user, refreshUser } = useAuth();
  const { isDark }            = useTheme();
  const navigate              = useNavigate();

  const [profile, setProfile]               = useState<UserProfile | null>(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [isEditing, setIsEditing]           = useState(false);
  const [isUpdating, setIsUpdating]         = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [followerCount, setFollowerCount]   = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [leaderboard, setLeaderboard]       = useState<{
    topContest: any[]; topGame: any[]; topRapidFire: any[];
  }>({ topContest: [], topGame: [], topRapidFire: [] });

  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', linkedIn: '', github: '',
    bio: '', location: '', college: '', branch: '', graduationYear: '',
  });

  // ── fetch ────────────────────────────────────────────────────────────────
  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/profile/${username}`, {
        params: { _t: Date.now() },
      });
      const p = normalizeProfile(res.data);
      setProfile(p);
      setEditForm({
        firstName:      p.profile.firstName,
        lastName:       p.profile.lastName,
        linkedIn:       p.profile.linkedIn,
        github:         p.profile.github,
        bio:            p.profile.bio,
        location:       p.profile.location,
        college:        p.profile.college,
        branch:         p.profile.branch,
        graduationYear: p.profile.graduationYear ? String(p.profile.graduationYear) : '',
      });
    } catch (err: any) {
      showError('Error fetching profile');
      setError(err.response?.data?.message || 'Failed to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowCounts = async () => {
    try {
      const res = await axios.get(`${API_URL}/follow/${username}/status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setFollowerCount(res.data.followersCount ?? 0);
      setFollowingCount(res.data.followingCount ?? 0);
    } catch {
      try {
        const r1 = await axios.get(`${API_URL}/follow/${username}/followers`);
        setFollowerCount(r1.data.followers?.length ?? 0);
        const r2 = await axios.get(`${API_URL}/follow/${username}/following`);
        setFollowingCount(r2.data.following?.length ?? 0);
      } catch { /* silent */ }
    }
  };

  useEffect(() => {
    if (username) { fetchProfile(); fetchFollowCounts(); }
  }, [username]);

  useEffect(() => {
    axios.get(`${API_URL}/stats/global-leaderboard`)
      .then(r => setLeaderboard(r.data))
      .catch(() => showError('Error fetching leaderboard'));
  }, []);

  // ── update profile ───────────────────────────────────────────────────────
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await axios.put(`${API_URL}/profile/update`, {
        profile: {
          ...editForm,
          graduationYear: editForm.graduationYear ? parseInt(editForm.graduationYear) : null,
        },
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      showSuccess('Profile updated successfully');
      setIsEditing(false);
      await fetchProfile();
      await refreshUser();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f8fa] dark:bg-[#0d1117]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300">Loading profile...</p>
      </div>
    </div>
  );

  if (error || !profile) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f8fa] dark:bg-[#0d1117]">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Profile not found</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">{error || "The user you're looking for doesn't exist."}</p>
        <button onClick={fetchProfile} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
          Try Again
        </button>
      </div>
    </div>
  );

  // ── derived display values ───────────────────────────────────────────────
  const isOwnProfile = user?.username === profile.username;

  const hasActivity =
    profile.ratings.gameRating      > 1200 ||
    profile.ratings.contestRating   > 1200 ||
    profile.ratings.rapidFireRating > 1200 ||
    profile.stats.totalSubmissions  > 0    ||
    profile.stats.problemsSolved.total > 0;

  const displayGlobalRank = !hasActivity
    ? 'Unranked'
    : profile.ratings.globalRank > 0
      ? `#${profile.ratings.globalRank}`
      : (() => {
          const cIdx = leaderboard.topContest.findIndex(u => u.username === profile.username);
          const gIdx = leaderboard.topGame.findIndex(u => u.username === profile.username);
          const rIdx = leaderboard.topRapidFire.findIndex(u => u.username === profile.username);
          if (cIdx >= 0) return `#${cIdx + 1}`;
          if (gIdx >= 0) return `#${gIdx + 1}`;
          if (rIdx >= 0) return `#${rIdx + 1}`;
          return 'Unranked';
        })();

  const displayPercentile = !hasActivity
    ? 'N/A'
    : profile.ratings.percentile > 0
      ? `${profile.ratings.percentile.toFixed(1)}%`
      : (() => {
          const cIdx = leaderboard.topContest.findIndex(u => u.username === profile.username);
          const gIdx = leaderboard.topGame.findIndex(u => u.username === profile.username);
          const rIdx = leaderboard.topRapidFire.findIndex(u => u.username === profile.username);
          const tc = leaderboard.topContest.length, tg = leaderboard.topGame.length, tr = leaderboard.topRapidFire.length;
          if (cIdx >= 0 && tc > 0) return `Top ${(((tc - cIdx) / tc) * 100).toFixed(0)}%`;
          if (gIdx >= 0 && tg > 0) return `Top ${(((tg - gIdx) / tg) * 100).toFixed(0)}%`;
          if (rIdx >= 0 && tr > 0) return `Top ${(((tr - rIdx) / tr) * 100).toFixed(0)}%`;
          return 'N/A';
        })();

  const recentSolvedProblems = Array.from(
    new Map(
      [...(profile.solvedProblems || [])].reverse().map(p => [p._id, p])
    ).values()
  ).slice(0, 10);

  const recentSubmissions  = profile.submissions.slice(0, 5);
  const weeklyActivityData = profile.last7DaysSubmissions;
  const weeklyCount        = profile.weeklySubmissionsCount;
  const totalActiveDays    = profile.activeDaysCount;

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen transition-colors duration-300 relative ${
      isDark
        ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900'
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
    }`}>

      {/* ════════════════════════════════════════════════════════════════════
          DARK MODE — AI Cosmic Neural Animation (from Doc 2)
      ════════════════════════════════════════════════════════════════════ */}
      {isDark && (
        <>
          <style>{`
            @keyframes ai-neural-pulse {
              0%, 100% { transform: translateX(0px) translateY(0px) scale(1) rotate(0deg); opacity: 0.6; }
              25%       { transform: translateX(20px) translateY(-15px) scale(1.1) rotate(90deg); opacity: 1; }
              50%       { transform: translateX(-10px) translateY(20px) scale(0.9) rotate(180deg); opacity: 0.8; }
              75%       { transform: translateX(30px) translateY(5px) scale(1.05) rotate(270deg); opacity: 0.9; }
            }
            @keyframes ai-data-stream {
              0%   { transform: translateY(-100px) translateX(0px) rotate(0deg); opacity: 0; }
              10%  { opacity: 0.8; }
              90%  { opacity: 0.8; }
              100% { transform: translateY(100vh) translateX(25px) rotate(360deg); opacity: 0; }
            }
            @keyframes neural-network {
              0%, 100% { opacity: 0.4; transform: scale(1) rotate(0deg); }
              50%       { opacity: 1;   transform: scale(1.1) rotate(180deg); }
            }
            @keyframes ai-constellation {
              0%   { transform: rotate(0deg) translateX(120px) rotate(0deg); }
              100% { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
            }
            @keyframes quantum-field {
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
            @keyframes ai-circuit-flow {
              0%   { transform: translateX(-100px) translateY(0px) rotate(0deg); opacity: 0; }
              10%  { opacity: 0.7; }
              90%  { opacity: 0.7; }
              100% { transform: translateX(100vw) translateY(20px) rotate(360deg); opacity: 0; }
            }
            .ai-neural-pulse  { animation: ai-neural-pulse 7s ease-in-out infinite; }
            .ai-data-stream   { animation: ai-data-stream 9s linear infinite; }
            .neural-network   { animation: neural-network 3s ease-in-out infinite; }
            .ai-constellation { animation: ai-constellation 25s linear infinite; }
            .quantum-field    { animation: quantum-field 14s ease-in-out infinite; }
            .ai-circuit-flow  { animation: ai-circuit-flow 10s linear infinite; }
          `}</style>

          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {/* Quantum field blobs */}
            <div className="absolute top-1/4 left-1/5 w-96 h-96 quantum-field rounded-full blur-3xl" />
            <div className="absolute bottom-1/3 right-1/4 w-80 h-80 quantum-field rounded-full blur-3xl" style={{ animationDelay: '5s' }} />
            <div className="absolute top-2/3 left-1/3 w-64 h-64 quantum-field rounded-full blur-2xl" style={{ animationDelay: '10s' }} />

            {/* Neural nodes */}
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={`nn-${i}`}
                className={`neural-network absolute ${
                  i % 7 === 0 ? 'w-2 h-2 bg-blue-400 rounded-full'   :
                  i % 7 === 1 ? 'w-1.5 h-1.5 bg-purple-400 rounded-full' :
                  i % 7 === 2 ? 'w-2 h-2 bg-cyan-400 rounded-full'   :
                  i % 7 === 3 ? 'w-1 h-1 bg-green-400 rounded-full'  :
                  i % 7 === 4 ? 'w-1.5 h-1.5 bg-teal-400 rounded-full'  :
                  i % 7 === 5 ? 'w-2 h-2 bg-indigo-400 rounded-full' :
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

            {/* Data streams */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={`ds-${i}`}
                className={`ai-data-stream absolute w-1 h-6 ${
                  i % 4 === 0 ? 'bg-gradient-to-b from-blue-400 to-transparent'   :
                  i % 4 === 1 ? 'bg-gradient-to-b from-purple-400 to-transparent' :
                  i % 4 === 2 ? 'bg-gradient-to-b from-cyan-400 to-transparent'   :
                               'bg-gradient-to-b from-green-400 to-transparent'
                }`}
                style={{
                  left: `${(i * 17 + 5) % 100}%`,
                  animationDelay:    `${(i * 0.75) % 9}s`,
                  animationDuration: `${9 + (i % 4)}s`,
                }}
              />
            ))}

            {/* Circuit flows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`cf-${i}`}
                className={`ai-circuit-flow absolute w-1 h-1 ${
                  i % 4 === 0 ? 'bg-blue-400'   :
                  i % 4 === 1 ? 'bg-purple-400' :
                  i % 4 === 2 ? 'bg-cyan-400'   : 'bg-green-400'
                } rounded-full`}
                style={{
                  top: `${(i * 23 + 11) % 100}%`,
                  animationDelay:    `${(i * 1.25) % 10}s`,
                  animationDuration: `${10 + (i % 5)}s`,
                }}
              />
            ))}

            {/* Constellation orbiters */}
            <div className="absolute top-1/4 left-1/4 w-4 h-4">
              <div className="ai-constellation w-2 h-2 bg-blue-400 rounded-full neural-network" />
            </div>
            <div className="absolute top-3/4 right-1/3 w-4 h-4">
              <div className="ai-constellation w-2 h-2 bg-purple-400 rounded-full neural-network" style={{ animationDelay: '8s' }} />
            </div>
            <div className="absolute top-1/2 left-2/3 w-4 h-4">
              <div className="ai-constellation w-2 h-2 bg-cyan-400 rounded-full neural-network" style={{ animationDelay: '12s' }} />
            </div>

            {/* Neural pulse blobs */}
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={`np-${i}`}
                className={`ai-neural-pulse absolute ${
                  i % 4 === 0 ? 'w-4 h-4 bg-gradient-to-br from-blue-500/40 to-cyan-500/40'     :
                  i % 4 === 1 ? 'w-3 h-3 bg-gradient-to-br from-purple-500/40 to-violet-500/40'  :
                  i % 4 === 2 ? 'w-3.5 h-3.5 bg-gradient-to-br from-green-500/40 to-teal-500/40' :
                               'w-4 h-4 bg-gradient-to-br from-indigo-500/40 to-purple-500/40'
                } rounded-full blur-sm`}
                style={{
                  left: `${(i * 41 +  9) % 100}%`,
                  top:  `${(i * 29 + 17) % 100}%`,
                  animationDuration: `${7 + (i % 3)}s`,
                  animationDelay:    `${(i * 0.7) % 7}s`,
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          LIGHT MODE — AI Aurora Animation (from Doc 2)
      ════════════════════════════════════════════════════════════════════ */}
      {!isDark && (
        <>
          <style>{`
            @keyframes light-ai-float {
              0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.5; }
              25%       { transform: translateY(-10px) translateX(12px) rotate(90deg); opacity: 0.8; }
              50%       { transform: translateY(6px) translateX(-8px) rotate(180deg); opacity: 1; }
              75%       { transform: translateY(-15px) translateX(18px) rotate(270deg); opacity: 0.6; }
            }
            @keyframes light-data-particle {
              0%   { transform: translateY(-30px) translateX(0px) rotate(0deg); opacity: 0; }
              10%  { opacity: 0.6; }
              90%  { opacity: 0.6; }
              100% { transform: translateY(100vh) translateX(20px) rotate(360deg); opacity: 0; }
            }
            @keyframes ai-aurora {
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
            @keyframes light-neural-glow {
              0%, 100% {
                box-shadow: 0 0 10px rgba(59,130,246,0.3), 0 0 20px rgba(147,51,234,0.2);
                opacity: 0.5;
              }
              50% {
                box-shadow: 0 0 20px rgba(59,130,246,0.5), 0 0 40px rgba(147,51,234,0.4);
                opacity: 1;
              }
            }
            .light-ai-float       { animation: light-ai-float 6s ease-in-out infinite; }
            .light-data-particle  { animation: light-data-particle 8s linear infinite; }
            .ai-aurora            { animation: ai-aurora 11s ease-in-out infinite; }
            .light-neural-glow    { animation: light-neural-glow 2.8s ease-in-out infinite; }
          `}</style>

          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {/* Aurora blobs */}
            <div className="absolute top-1/5 left-1/3 w-96 h-96 ai-aurora rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/5 w-80 h-80 ai-aurora rounded-full blur-3xl" style={{ animationDelay: '4s' }} />
            <div className="absolute top-2/3 left-1/6 w-64 h-64 ai-aurora rounded-full blur-2xl" style={{ animationDelay: '8s' }} />

            {/* Neural glow nodes */}
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={`ln-${i}`}
                className={`light-neural-glow absolute ${
                  i % 6 === 0 ? 'w-2 h-2 bg-blue-400/60 rounded-full'   :
                  i % 6 === 1 ? 'w-1.5 h-1.5 bg-purple-400/60 rounded-full' :
                  i % 6 === 2 ? 'w-2 h-2 bg-cyan-400/60 rounded-full'   :
                  i % 6 === 3 ? 'w-1 h-1 bg-green-400/60 rounded-full'  :
                  i % 6 === 4 ? 'w-1.5 h-1.5 bg-teal-400/60 rounded-full'  :
                               'w-2 h-2 bg-indigo-400/60 rounded-full'
                }`}
                style={{
                  left: `${(i * 43 +  7) % 100}%`,
                  top:  `${(i * 31 + 13) % 100}%`,
                  animationDelay:    `${(i * 0.112) % 2.8}s`,
                  animationDuration: `${2.8 + (i % 3) * 0.5}s`,
                }}
              />
            ))}

            {/* Data particles */}
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={`ld-${i}`}
                className={`light-data-particle absolute w-1 h-1 ${
                  i % 5 === 0 ? 'bg-blue-300/50'   :
                  i % 5 === 1 ? 'bg-purple-300/50' :
                  i % 5 === 2 ? 'bg-cyan-300/50'   :
                  i % 5 === 3 ? 'bg-green-300/50'  : 'bg-teal-300/50'
                } rounded-full`}
                style={{
                  left: `${(i * 19 + 11) % 100}%`,
                  animationDelay:    `${(i * 0.53) % 8}s`,
                  animationDuration: `${8 + (i % 3)}s`,
                }}
              />
            ))}

            {/* Float blobs */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`lf-${i}`}
                className={`light-ai-float absolute ${
                  i % 4 === 0 ? 'w-3 h-3 bg-gradient-to-br from-blue-200/50 to-purple-200/50'   :
                  i % 4 === 1 ? 'w-2.5 h-2.5 bg-gradient-to-br from-cyan-200/50 to-teal-200/50' :
                  i % 4 === 2 ? 'w-3 h-3 bg-gradient-to-br from-green-200/50 to-blue-200/50'    :
                               'w-2.5 h-2.5 bg-gradient-to-br from-indigo-200/50 to-violet-200/50'
                } rounded-full blur-sm`}
                style={{
                  left: `${(i * 47 +  3) % 100}%`,
                  top:  `${(i * 37 + 19) % 100}%`,
                  animationDuration: `${6 + (i % 3) * 0.7}s`,
                  animationDelay:    `${(i * 0.75) % 6}s`,
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MAIN CONTENT (z-10, on top of animated background)
      ════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* ─── Sidebar ──────────────────────────────────────────────── */}
            <div className="lg:col-span-1 space-y-4 self-start">

              {/* ── Profile Card ─────────────────────────────────────── */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-[#161b22] shadow-sm overflow-hidden">

                {/* Cover */}
                <div className="relative h-[88px]" style={{
                  background: isDark
                    ? 'linear-gradient(135deg, #1e2a3a 0%, #1a2035 50%, #1e1f2e 100%)'
                    : 'linear-gradient(135deg, #e8edf5 0%, #eceaf8 50%, #e6eef8 100%)',
                }}>
                  <div className="absolute inset-0 opacity-30" style={{
                    backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.25) 1px, transparent 1px)',
                    backgroundSize: '18px 18px',
                  }} />
                </div>

                <div className="px-5 pb-5">
                  {/* Avatar + coins row */}
                  <div className="flex items-end justify-between" style={{ marginTop: '-36px', marginBottom: '14px' }}>
                    <div className="relative flex-shrink-0">
                      {profile.profile.avatar && !profile.profile.avatar.startsWith('default:') ? (
                        <img src={profile.profile.avatar} alt={profile.username}
                          className="w-[72px] h-[72px] rounded-xl object-cover ring-[3px] ring-white dark:ring-[#161b22] shadow-md" />
                      ) : (
                        <div className="w-[72px] h-[72px] rounded-xl bg-gradient-to-br from-indigo-400 via-violet-500 to-purple-600 flex items-center justify-center ring-[3px] ring-white dark:ring-[#161b22] shadow-md">
                          <span className="text-white text-2xl font-black">
                            {profile.profile.avatar?.startsWith('default:')
                              ? profile.profile.avatar.replace('default:', '')
                              : profile.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      {isOwnProfile && (
                        <button type="button"
                          className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-500 hover:bg-indigo-600 rounded-md flex items-center justify-center shadow border-2 border-white dark:border-[#161b22] transition-all"
                          onClick={() => setShowAvatarModal(true)} title="Change avatar">
                          <User className="h-3 w-3 text-white" />
                        </button>
                      )}
                    </div>

                    {isOwnProfile && profile.coins > 0 && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/80 dark:border-amber-700/40 mb-0.5">
                        <span className="text-sm leading-none">🪙</span>
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400 tabular-nums">{profile.coins}</span>
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="mb-3">
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-snug tracking-tight">
                      {profile.profile.firstName && profile.profile.lastName
                        ? `${profile.profile.firstName} ${profile.profile.lastName}`
                        : profile.username}
                    </h1>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5 leading-none">@{profile.username}</p>
                  </div>

                  {profile.profile.bio && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3 pl-2.5 border-l-[2px] border-indigo-300 dark:border-indigo-600 italic">
                      {profile.profile.bio}
                    </p>
                  )}

                  {(profile.profile.location || profile.profile.college || profile.profile.branch || profile.profile.graduationYear) && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {profile.profile.location && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border border-sky-200/70 dark:border-sky-800/40">
                          📍 {profile.profile.location}
                        </span>
                      )}
                      {profile.profile.college && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-200/70 dark:border-violet-800/40">
                          🎓 {profile.profile.college}
                        </span>
                      )}
                      {profile.profile.branch && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/40">
                          💻 {profile.profile.branch}
                        </span>
                      )}
                      {profile.profile.graduationYear ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/40">
                          🎯 Class of {profile.profile.graduationYear}
                        </span>
                      ) : null}
                    </div>
                  )}

                  {/* Followers / Following */}
                  <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/60 mb-4">
                    <div className="flex-1 flex flex-col items-center py-2.5 bg-gray-50/80 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors cursor-default">
                      <span className="text-base font-extrabold text-gray-900 dark:text-white leading-none tabular-nums">{followerCount}</span>
                      <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 mt-0.5 tracking-wider uppercase">Followers</span>
                    </div>
                    <div className="w-px bg-gray-200 dark:bg-gray-700/60" />
                    <div className="flex-1 flex flex-col items-center py-2.5 bg-gray-50/80 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors cursor-default">
                      <span className="text-base font-extrabold text-gray-900 dark:text-white leading-none tabular-nums">{followingCount}</span>
                      <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 mt-0.5 tracking-wider uppercase">Following</span>
                    </div>
                  </div>

                  {!isOwnProfile && (
                    <FollowButton targetUsername={profile.username} size="md"
                      onFollowChange={(_, counts) => {
                        setFollowerCount(counts.followers);
                        setFollowingCount(counts.following);
                      }} />
                  )}

                  {isOwnProfile && (
                    <button onClick={() => setIsEditing(!isEditing)}
                      className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 ${
                        isEditing
                          ? 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-white/10'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                      }`}>
                      {isEditing ? <><span>✕</span> Cancel</> : <><span>✏️</span> Edit Profile</>}
                    </button>
                  )}
                </div>

                {/* Avatar modal */}
                {showAvatarModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 relative border border-gray-200 dark:border-gray-700">
                      <button className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-xl font-bold"
                        onClick={() => setShowAvatarModal(false)}>×</button>
                      <h2 className="text-base font-bold mb-4 text-gray-900 dark:text-white">Choose avatar</h2>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          'https://png.pngtree.com/background/20230611/original/pngtree-cartoon-with-a-man-in-glasses-wearing-headphones-picture-image_3169569.jpg',
                          'https://www.freepngimg.com/download/youtube/63841-profile-twitch-youtube-avatar-discord-free-download-image.png',
                          'https://png.pngtree.com/png-clipart/20230531/original/pngtree-3d-avatar-a-nurse-female-png-image_9174297.png',
                          'https://static.vecteezy.com/system/resources/previews/021/907/479/large_2x/anime-girl-avatar-ai-generated-photo.jpg',
                          'https://wallpapers.com/images/hd/aesthetic-profile-picture-pjnvodm0tj798j1q.jpg',
                          'https://toppng.com/uploads/preview/cool-avatar-transparent-image-cool-boy-avatar-11562893383qsirclznyw.png',
                        ].map((url, idx) => (
                          <button key={url}
                            className={`relative rounded-xl overflow-hidden aspect-square transition-all duration-150 ${
                              profile.profile.avatar === url
                                ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800 scale-95'
                                : 'hover:scale-95 hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 dark:hover:ring-offset-gray-800'
                            }`}
                            disabled={imageUploading}
                            onClick={async () => {
                              setImageUploading(true);
                              try {
                                const res = await fetch(`${API_URL}/profile/update`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                                  body: JSON.stringify({ profile: { ...profile.profile, avatar: url } }),
                                });
                                if (res.ok) {
                                  setProfile(p => p ? { ...p, profile: { ...p.profile, avatar: url } } : p);
                                  setShowAvatarModal(false);
                                  if (typeof refreshUser === 'function') refreshUser();
                                }
                              } finally { setImageUploading(false); }
                            }}>
                            <img src={url} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                            {profile.profile.avatar === url && (
                              <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                <span className="text-white text-lg font-bold bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center text-sm">✓</span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                      <button className="w-full py-2 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                        onClick={() => setShowAvatarModal(false)} disabled={imageUploading}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Edit Form Card ─────────────────────────────────────── */}
              {isOwnProfile && isEditing && (
                <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Edit Profile</h3>
                  </div>
                  <form onSubmit={handleUpdateProfile} className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'First Name', key: 'firstName', type: 'text' },
                        { label: 'Last Name',  key: 'lastName',  type: 'text' },
                      ].map(({ label, key, type }) => (
                        <div key={key}>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{label}</label>
                          <input type={type} value={(editForm as any)[key]}
                            onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white placeholder-gray-400 transition-all" />
                        </div>
                      ))}
                    </div>
                    {[
                      { label: 'Bio',            key: 'bio',            type: 'textarea', placeholder: 'Tell something about yourself...' },
                      { label: 'Location',        key: 'location',       type: 'text',     placeholder: 'City, Country' },
                      { label: 'College',         key: 'college',        type: 'text',     placeholder: 'University name' },
                      { label: 'Branch',          key: 'branch',         type: 'text',     placeholder: 'e.g. Computer Science' },
                      { label: 'Graduation Year', key: 'graduationYear', type: 'number',   placeholder: '2025' },
                      { label: 'LinkedIn URL',    key: 'linkedIn',       type: 'url',      placeholder: 'https://linkedin.com/in/...' },
                      { label: 'GitHub URL',      key: 'github',         type: 'url',      placeholder: 'https://github.com/...' },
                    ].map(({ label, key, type, placeholder }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{label}</label>
                        {type === 'textarea' ? (
                          <textarea value={(editForm as any)[key]}
                            onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                            rows={3} placeholder={placeholder}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white placeholder-gray-400 transition-all resize-none" />
                        ) : (
                          <input type={type} value={(editForm as any)[key]} placeholder={placeholder}
                            onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white placeholder-gray-400 transition-all" />
                        )}
                      </div>
                    ))}
                    <button type="submit" disabled={isUpdating}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                        isUpdating
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm hover:shadow-md'
                      }`}>
                      {isUpdating
                        ? <><span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> Saving...</>
                        : <><span>✓</span> Save Changes</>}
                    </button>
                  </form>
                </div>
              )}

              {/* ── Social Links ─────────────────────────────────────── */}
              {!isEditing && (
                <div className="space-y-3">
                  {profile.profile.linkedIn && (
                    <a href={profile.profile.linkedIn} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/50 dark:hover:to-blue-800/40 transition-all duration-200 group shadow-sm hover:shadow-md">
                      <div className="w-9 h-9 rounded-lg bg-[#0077B5] flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200">
                        <Linkedin className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-blue-500 dark:text-blue-400">LinkedIn</p>
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 leading-tight">View Profile</p>
                      </div>
                      <div className="ml-auto text-blue-400 dark:text-blue-500 group-hover:translate-x-0.5 transition-transform duration-200">↗</div>
                    </a>
                  )}
                  {profile.profile.github && (
                    <a href={profile.profile.github} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/30 hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-800/80 dark:hover:to-gray-700/50 transition-all duration-200 group shadow-sm hover:shadow-md">
                      <div className="w-9 h-9 rounded-lg bg-[#24292e] dark:bg-[#f0f6ff] flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200">
                        <Github className="h-5 w-5 text-white dark:text-[#24292e]" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">GitHub</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-tight">View Profile</p>
                      </div>
                      <div className="ml-auto text-gray-400 dark:text-gray-500 group-hover:translate-x-0.5 transition-transform duration-200">↗</div>
                    </a>
                  )}
                </div>
              )}

              {/* ── Ratings Card ──────────────────────────────────────── */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-700/30">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" /> Ratings & Ranks
                  </h3>
                </div>
                <div className="p-4 space-y-1">
                  {[
                    { icon: '🎮', label: 'Game Rating',   value: profile.ratings.gameRating,      color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/20'      },
                    { icon: '⚡', label: 'Rapid Fire',     value: profile.ratings.rapidFireRating, color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/20'        },
                    { icon: '🏆', label: 'Contest Rating', value: profile.ratings.contestRating,   color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20'  },
                    { icon: '🌍', label: 'Global Rank',    value: displayGlobalRank,               color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    { icon: '📊', label: 'Percentile',     value: displayPercentile,               color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20'  },
                  ].map(({ icon, label, value, color, bg }) => (
                    <div key={label} className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${bg} transition-colors`}>
                      <div className="flex items-center gap-2.5">
                        <span className="text-base leading-none">{icon}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">{label}</span>
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Global Leaderboard ────────────────────────────────── */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" /> Global Leaderboard
                  </h3>
                </div>
                <div className="px-4 py-4 space-y-5">
                  {/* Contest */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-purple-500" /> Contest
                      </h4>
                      <button onClick={() => navigate('/contest/leaderboard')}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium">View All</button>
                    </div>
                    <div className="space-y-1.5">
                      {leaderboard.topContest.map((u, idx) => (
                        <button key={u._id} onClick={() => navigate(`/profile/${u.username}`)}
                          className="w-full flex items-center px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                              idx === 0 ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400'
                            : idx === 1 ? 'bg-gray-100 text-gray-800 border-2 border-gray-400'
                            : idx === 2 ? 'bg-orange-100 text-orange-800 border-2 border-orange-400'
                            :             'bg-purple-100 text-purple-800 border border-purple-300'}`}>
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-purple-700 dark:group-hover:text-purple-300">{u.username}</span>
                          </div>
                          <span className="text-sm font-bold text-purple-600 dark:text-purple-400 flex-shrink-0 ml-2">
                            <AnimatedCounter end={u.ratings.contestRating} />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Game */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-green-500" /> Game
                      </h4>
                      <button onClick={() => navigate('/game/leaderboard')}
                        className="text-xs text-green-600 dark:text-green-400 hover:underline font-medium">View All</button>
                    </div>
                    <div className="space-y-1.5">
                      {leaderboard.topGame.map((u, idx) => (
                        <button key={u._id} onClick={() => navigate(`/profile/${u.username}`)}
                          className="w-full flex items-center px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all group">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                              idx === 0 ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400'
                            : idx === 1 ? 'bg-gray-100 text-gray-800 border-2 border-gray-400'
                            : idx === 2 ? 'bg-orange-100 text-orange-800 border-2 border-orange-400'
                            :             'bg-green-100 text-green-800 border border-green-300'}`}>
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-green-700 dark:group-hover:text-green-300">{u.username}</span>
                          </div>
                          <span className="text-sm font-bold text-green-600 dark:text-green-400 flex-shrink-0 ml-2">
                            <AnimatedCounter end={u.ratings.gameRating} />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rapid Fire */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-red-500" /> Rapid Fire
                      </h4>
                      <button onClick={() => navigate('/rapidfire/leaderboard')}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium">View All</button>
                    </div>
                    <div className="space-y-1.5">
                      {leaderboard.topRapidFire.length > 0
                        ? leaderboard.topRapidFire.slice(0, 5).map((u, idx) => (
                            <button key={u._id} onClick={() => navigate(`/profile/${u.username}`)}
                              className="w-full flex items-center px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                  idx === 0 ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400'
                                : idx === 1 ? 'bg-gray-100 text-gray-800 border-2 border-gray-400'
                                : idx === 2 ? 'bg-orange-100 text-orange-800 border-2 border-orange-400'
                                :             'bg-red-100 text-red-800 border border-red-300'}`}>
                                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                </div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-red-700 dark:group-hover:text-red-300">{u.username}</span>
                              </div>
                              <span className="text-sm font-bold text-red-600 dark:text-red-400 flex-shrink-0 ml-2">
                                <AnimatedCounter end={u.ratings.rapidFireRating} />
                              </span>
                            </button>
                          ))
                        : (
                            <div className="text-center py-4 text-gray-400 dark:text-gray-500">
                              <Zap className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
                              <p className="text-xs">No rapid fire ratings yet</p>
                            </div>
                          )
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Main Content ─────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Performance Dashboard */}
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                  <TrendingUp className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
                  Performance Dashboard
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

                  {/* Streak — full width */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 md:col-span-3">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <Activity className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Streaks</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          <AnimatedCounter end={profile.stats.currentStreak} />🔥
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Current Streak</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          <AnimatedCounter end={profile.stats.maxStreak} />⭐
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Best Streak</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          <AnimatedCounter end={profile.stats.problemsSolved.total} />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Problems Solved</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          <AnimatedCounter end={totalActiveDays} />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Active Days</p>
                      </div>
                    </div>
                  </div>

                  {/* Problems Solved */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-green-100 dark:bg-green-800/30 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Problems Solved</h4>
                    </div>
                    <div className="flex items-center justify-between mb-4 flex-1">
                      <div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          <AnimatedCounter end={profile.stats.problemsSolved.total} />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">of {profile.totalProblemsCount} total</p>
                      </div>
                      <ProgressCircle
                        percentage={profile.totalProblemsCount > 0
                          ? (profile.stats.problemsSolved.total / profile.totalProblemsCount) * 100 : 0}
                        size={72} color="#10B981" label="Progress" />
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: 'Easy',   val: profile.stats.problemsSolved.easy,   color: 'text-green-600 dark:text-green-400'   },
                        { label: 'Medium', val: profile.stats.problemsSolved.medium, color: 'text-yellow-600 dark:text-yellow-400' },
                        { label: 'Hard',   val: profile.stats.problemsSolved.hard,   color: 'text-red-600 dark:text-red-400'       },
                      ].map(({ label, val, color }) => (
                        <div key={label} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                          <span className={`text-sm font-semibold ${color}`}><AnimatedCounter end={val} /></span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Accuracy */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Accuracy</h4>
                    </div>
                    <div className="flex items-center justify-center flex-1">
                      <ProgressCircle percentage={profile.stats.accuracy} size={100} color="#3B82F6" label="Success Rate" />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          <AnimatedCounter end={profile.stats.correctSubmissions} />
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Accepted</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
                          <AnimatedCounter end={profile.stats.totalSubmissions} />
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                      </div>
                    </div>
                  </div>

                  {/* Rapid Fire */}
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-5 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg">
                          <Zap className="h-4 w-4 text-white" />
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Rapid Fire</h4>
                      </div>
                      <div className="px-2.5 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">MCQ</div>
                    </div>

                    {/* Rating + change */}
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-2xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        <AnimatedCounter end={profile.ratings.rapidFireRating} />
                      </span>
                      {(profile.rapidFireHistory?.length ?? 0) > 0 && (() => {
                        const totalChange = (profile.rapidFireHistory ?? []).reduce((a, g) => a + (g.ratingChange || 0), 0);
                        return (
                          <span className={`text-xs font-semibold ${totalChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {totalChange >= 0 ? '▲' : '▼'} {Math.abs(totalChange)}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {profile.ratings.rapidFireRating >= 1600 ? 'Expert'
                      : profile.ratings.rapidFireRating >= 1400 ? 'Advanced'
                      : profile.ratings.rapidFireRating >= 1200 ? 'Intermediate'
                      : 'Beginner'}
                    </div>

                    {/* Mini SVG line chart from rapidFireHistory */}
                    {(profile.rapidFireHistory?.length ?? 0) >= 2 ? (() => {
                      const sorted = [...(profile.rapidFireHistory ?? [])]
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                      const base = profile.ratings.rapidFireRating - sorted.reduce((a, g) => a + (g.ratingChange || 0), 0);
                      let cum = base;
                      const points = [base, ...sorted.map(g => { cum += (g.ratingChange || 0); return cum; })];
                      const minV = Math.min(...points), maxV = Math.max(...points);
                      const range = maxV - minV || 1;
                      const W = 200, H = 48, pad = 4;
                      const coords = points.map((v, i) => {
                        const x = pad + (i / (points.length - 1)) * (W - pad * 2);
                        const y = H - pad - ((v - minV) / range) * (H - pad * 2);
                        return `${x},${y}`;
                      });
                      const isUp = points[points.length - 1] >= points[0];
                      const lineColor = isUp ? '#8b5cf6' : '#ef4444';
                      return (
                        <div className="my-2">
                          <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
                            <defs>
                              <linearGradient id="rf-area" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
                                <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            <polygon points={`${coords.join(' ')} ${W - pad},${H - pad} ${pad},${H - pad}`} fill="url(#rf-area)" />
                            <polyline points={coords.join(' ')} fill="none" stroke={lineColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx={coords[coords.length - 1].split(',')[0]} cy={coords[coords.length - 1].split(',')[1]} r="3" fill={lineColor} />
                          </svg>
                        </div>
                      );
                    })() : (
                      <div className="h-12 flex items-center justify-center text-xs text-purple-400/60 my-2">
                        Play rapid fire to see rating graph
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-1 mt-auto pt-2 border-t border-purple-200/60 dark:border-purple-700/40">
                      <div className="text-center">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{profile.rapidFireHistory?.length ?? 0}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">Games</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {(profile.rapidFireHistory?.length ?? 0) > 0
                            ? Math.round(((profile.rapidFireHistory ?? []).filter(g => g.result === 'win').length / (profile.rapidFireHistory?.length ?? 1)) * 100)
                            : 0}%
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">Win Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                          {profile.ratings.rapidFireRating}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">ELO</div>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Activity */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                          <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Weekly Activity</h4>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                          <AnimatedCounter end={weeklyCount} />
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">this week</span>
                      </div>
                    </div>

                    {/* SVG Bar Chart */}
                    <div className="flex-1">
                      <ActivityChart data={weeklyActivityData} isDark={isDark} />
                    </div>

                    {/* Max day highlight */}
                    {weeklyCount > 0 && (() => {
                      const maxIdx = weeklyActivityData.indexOf(Math.max(...weeklyActivityData));
                      const d = new Date();
                      d.setDate(d.getDate() - (6 - maxIdx));
                      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
                      return (
                        <div className={`mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium ${
                          isDark ? 'bg-indigo-900/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          <span>🔥</span>
                          <span>Most active: <strong>{dayName}</strong> · {Math.max(...weeklyActivityData)} submissions</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Contest Rating */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <Trophy className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Contest Rating</h4>
                      </div>
                      <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                        {profile.contestHistory.length} contests
                      </span>
                    </div>

                    {/* Rating + delta */}
                    <div className="flex items-baseline gap-1.5 mb-2">
                      <span className="text-3xl font-black text-purple-600 dark:text-purple-400">
                        <AnimatedCounter end={profile.ratings.contestRating} />
                      </span>
                      {profile.contestHistory.length > 0 && (() => {
                        const sorted = [...profile.contestHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                        const totalChange = sorted.reduce((acc, c) => acc + (c.ratingChange || 0), 0);
                        return (
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                            totalChange >= 0
                              ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20'
                              : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20'
                          }`}>
                            {totalChange >= 0 ? '▲' : '▼'} {Math.abs(totalChange)}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Smooth SVG line chart */}
                    {profile.contestHistory.length >= 2 ? (() => {
                      const sorted = [...profile.contestHistory]
                        .filter(c => c.ratingChange !== undefined)
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                      const base = profile.ratings.contestRating - sorted.reduce((acc, c) => acc + (c.ratingChange || 0), 0);
                      let cum = base;
                      const pts = [base, ...sorted.map(c => { cum += (c.ratingChange || 0); return cum; })];

                      const minV = Math.min(...pts), maxV = Math.max(...pts);
                      const range = maxV - minV || 1;
                      const VW = 260, VH = 70, px = 6, py = 8;

                      const coords = pts.map((v, i) => ({
                        x: px + (i / (pts.length - 1)) * (VW - px * 2),
                        y: py + (1 - (v - minV) / range) * (VH - py * 2),
                      }));

                      // Smooth bezier path
                      const pathD = coords.reduce((acc, p, i) => {
                        if (i === 0) return `M ${p.x} ${p.y}`;
                        const prev = coords[i - 1];
                        const cpx = (prev.x + p.x) / 2;
                        return `${acc} C ${cpx} ${prev.y} ${cpx} ${p.y} ${p.x} ${p.y}`;
                      }, '');

                      const areaD = `${pathD} L ${coords[coords.length-1].x} ${VH} L ${coords[0].x} ${VH} Z`;
                      const isUp  = pts[pts.length - 1] >= pts[0];
                      const color = isUp ? '#a855f7' : '#ef4444';
                      const last  = coords[coords.length - 1];

                      return (
                        <div className="flex-1 my-1">
                          <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ display: 'block', overflow: 'visible' }}>
                            <defs>
                              <linearGradient id="cr-area" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor={color} stopOpacity="0.2" />
                                <stop offset="100%" stopColor={color} stopOpacity="0"   />
                              </linearGradient>
                              <filter id="cr-glow">
                                <feGaussianBlur stdDeviation="2" result="blur" />
                                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                              </filter>
                            </defs>

                            {/* Grid lines */}
                            {[0.25, 0.5, 0.75].map((f, i) => (
                              <line key={i}
                                x1={px} y1={py + f * (VH - py * 2)}
                                x2={VW - px} y2={py + f * (VH - py * 2)}
                                stroke={isDark ? '#1e293b' : '#f1f5f9'} strokeWidth="1" />
                            ))}

                            {/* Area */}
                            <path d={areaD} fill="url(#cr-area)" />

                            {/* Line */}
                            <path d={pathD} fill="none"
                              stroke={color} strokeWidth="2.2"
                              strokeLinecap="round" strokeLinejoin="round"
                              filter="url(#cr-glow)" />

                            {/* All dots */}
                            {coords.map((p, i) => (
                              <circle key={i} cx={p.x} cy={p.y} r="2.5"
                                fill={isDark ? '#1f2937' : '#ffffff'}
                                stroke={color} strokeWidth="1.5" />
                            ))}

                            {/* Last dot highlighted */}
                            <circle cx={last.x} cy={last.y} r="4.5"
                              fill={color} opacity="0.2" />
                            <circle cx={last.x} cy={last.y} r="3"
                              fill={color} />
                          </svg>
                        </div>
                      );
                    })() : (
                      <div className="flex-1 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
                        Join 2+ contests to see rating chart
                      </div>
                    )}

                    {/* Stats row */}
                    <div className={`grid grid-cols-3 gap-1 pt-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                      <div className="text-center">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{profile.contestHistory.length}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">Contests</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {(() => { const ranks = profile.contestHistory.map(c => c.rank).filter(r => r > 0); return ranks.length > 0 ? `#${Math.min(...ranks)}` : 'N/A'; })()}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">Best Rank</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {profile.contestHistory.length > 0
                            ? Math.round((profile.contestHistory.filter(c => (c.ratingChange || 0) > 0).length / profile.contestHistory.length) * 100)
                            : 0}%
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">Win Rate</div>
                      </div>
                    </div>
                  </div>

                  {/* Game Rating */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/60 p-5 flex flex-col h-full shadow-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                          <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Game Rating</h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                        {profile.ratings.gameRating >= 1600 ? 'Expert'
                        : profile.ratings.gameRating >= 1400 ? 'Advanced'
                        : profile.ratings.gameRating >= 1200 ? 'Inter'
                        : 'Beginner'}
                      </span>
                    </div>

                    {/* Rating + change */}
                    <div className="flex items-baseline gap-1.5 mb-3">
                      <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                        <AnimatedCounter end={profile.ratings.gameRating} />
                      </span>
                      {profile.gameHistory.length > 0 && (() => {
                        const totalChange = profile.gameHistory.reduce((a, g) => a + (g.ratingChange || 0), 0);
                        return (
                          <span className={`text-xs font-bold ${totalChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {totalChange >= 0 ? '▲' : '▼'} {Math.abs(totalChange)}
                          </span>
                        );
                      })()}
                    </div>

                    {/* W/L/D SVG Donut */}
                    {(() => {
                      const h      = profile.gameHistory;
                      const wins   = h.filter(g => g.result === 'win').length;
                      const losses = h.filter(g => g.result === 'lose').length;
                      const draws  = h.filter(g => g.result === 'draw').length;
                      const total  = h.length;

                      const SZ = 90, ST = 14, RD = (SZ - ST) / 2;
                      const CIRC = 2 * Math.PI * RD;
                      const segments = [
                        { label: 'Win',  val: wins,   color: '#22c55e' },
                        { label: 'Loss', val: losses, color: '#ef4444' },
                        { label: 'Draw', val: draws,  color: '#6b7280' },
                      ];
                      let off = 0;
                      const segs = segments.map(s => {
                        const dash = total > 0 ? (s.val / total) * CIRC : 0;
                        const seg = { ...s, dash, offset: off };
                        off += dash;
                        return seg;
                      });

                      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

                      return total > 0 ? (
                        <div className="flex-1 flex items-center gap-4">
                          {/* Donut */}
                          <div className="relative flex-shrink-0" style={{ width: SZ, height: SZ }}>
                            <svg width={SZ} height={SZ} viewBox={`0 0 ${SZ} ${SZ}`} className="-rotate-90">
                              <circle cx={SZ/2} cy={SZ/2} r={RD}
                                fill="none" stroke={isDark ? '#1f2937' : '#f3f4f6'} strokeWidth={ST} />
                              {segs.filter(s => s.val > 0).map((s, i) => (
                                <circle key={i} cx={SZ/2} cy={SZ/2} r={RD}
                                  fill="none" stroke={s.color} strokeWidth={ST}
                                  strokeDasharray={`${s.dash - 1} ${CIRC - s.dash + 1}`}
                                  strokeDashoffset={-s.offset}
                                  strokeLinecap="butt"
                                />
                              ))}
                            </svg>
                            {/* Center */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-base font-black text-emerald-500">{winRate}%</span>
                              <span className={`text-[9px] font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>win</span>
                            </div>
                          </div>

                          {/* Legend */}
                          <div className="flex flex-col gap-2 flex-1">
                            {segs.map(s => {
                              const pct = total > 0 ? Math.round((s.val / total) * 100) : 0;
                              return (
                                <div key={s.label}>
                                  <div className="flex items-center justify-between mb-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                                      <span className={`text-[11px] font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{s.label}</span>
                                    </div>
                                    <span className="text-[11px] font-black" style={{ color: s.color }}>{s.val}</span>
                                  </div>
                                  <div className={`w-full h-1 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                    <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
                          Play games to see chart
                        </div>
                      );
                    })()}

                    {/* Stats row */}
                    <div className={`grid grid-cols-3 gap-1 pt-2 mt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                      <div className="text-center">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{profile.gameHistory.length}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-emerald-500">
                          {profile.gameHistory.length > 0
                            ? Math.round((profile.gameHistory.filter(g => g.result === 'win').length / profile.gameHistory.length) * 100)
                            : 0}%
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">Win Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {profile.gameHistory.filter(g => g.result === 'win').length}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">Wins</div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Submission Calendar */}
              <div>
                <SubmissionCalendar
                  submissions={profile.submissions.map(s => ({ date: s.date, status: s.status }))}
                />
              </div>

              {/* Recent Activity */}
              {profile.recentActivities.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">Recent Activity</h3>
                  <div className="space-y-3">
                    {profile.recentActivities.slice(0, 5).map((a, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center">
                          <Activity className="h-4 w-4 text-blue-500 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{a.message}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{a.type}</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(a.date).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recently Solved Problems */}
              {recentSolvedProblems.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">Recently Solved Problems</h3>
                  <div className="space-y-2">
                    {recentSolvedProblems.map((p, i) => (
                      <div key={p._id || i}
                        className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-3 flex-shrink-0" />
                          <span className="font-medium text-gray-900 dark:text-white">{p.title}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${getDifficultyColor(p.difficulty)}`}>
                          {p.difficulty}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Submissions */}
              {recentSubmissions.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">Recent Submissions</h3>
                  <div className="space-y-2">
                    {recentSubmissions.map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center">
                          <Code className="h-4 w-4 text-blue-500 mr-3 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">{s.language}</span>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {s.runtime > 0 ? (Math.round(s.runtime * 10) / 10) : 0}ms · {s.memory > 0 ? (Math.round(s.memory * 10) / 10) : 0}MB
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(s.status)}`}>
                            {s.status}
                          </span>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(s.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Game & Contest History */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">Recent Games</h3>
                  <div className="space-y-3 flex-1">
                    {profile.gameHistory.length > 0 ? (
                      Array.from(
                        new Map(
                          profile.gameHistory
                            .filter(g => g.opponent != null && g.problem != null)
                            .map(g => [`${g.date}-${g.opponent.username}-${g.problem.title}-${g.result}`, g])
                        ).values()
                      )
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 5)
                        .map((g, i) => (
                          <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                                  g.result === 'win'  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                                  g.result === 'lose' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                  'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}>{g.result.toUpperCase()}</span>
                                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">vs {g.opponent.username}</span>
                              </div>
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 ml-0.5">{g.problem.title}</div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              <div className={`text-sm font-bold ${g.ratingChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {g.ratingChange >= 0 ? '+' : ''}{g.ratingChange}
                              </div>
                              <div className="text-[11px] text-gray-400 dark:text-gray-500">
                                {new Date(g.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="flex-1 flex items-center justify-center py-8">
                        <p className="text-gray-400 dark:text-gray-500 text-sm text-center">No games played yet</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">Contest History</h3>
                  <div className="space-y-3 flex-1">
                    {profile.contestHistory.length > 0 ? (
                      Array.from(
                        new Map(
                          profile.contestHistory
                            .filter(c => c.contest != null)
                            .map(c => [`${c.contest.name}-${c.date}`, c])
                        ).values()
                      )
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 5)
                        .map((c, i) => (
                          <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors">
                            <div className="min-w-0">
                              <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{c.contest.name}</div>
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                Rank <span className={`font-semibold ${c.rank <= 3 ? 'text-amber-500' : 'text-gray-600 dark:text-gray-300'}`}>#{c.rank}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{c.score} pts</div>
                              <div className="text-[11px] text-gray-400 dark:text-gray-500">
                                {new Date(c.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="flex-1 flex items-center justify-center py-8">
                        <p className="text-gray-400 dark:text-gray-500 text-sm text-center">No contests participated yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
