import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { showError, showSuccess } from '../utils/toast';
import {
  ThumbsUp, ThumbsDown, Eye, MessageSquare, Search, Plus,
  ArrowLeft, Pin, Lock, Send, Trash2, ChevronDown, ChevronUp,
  Share2, Code2, Flame, Clock, TrendingUp, Filter, X
} from 'lucide-react';
import { API_URL } from '../config/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Comment {
  _id: string;
  content: string;
  author: { _id: string; username: string };
  upvotes: string[];
  downvotes: string[];
  createdAt: string;
}

interface Solution {
  _id: string;
  title: string;
  code: string;
  language: string;
  explanation: string;
  author: { _id: string; username: string };
  tags: string[];
  upvotes: string[];
  downvotes: string[];
  comments: Comment[];
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  score?: number;
  createdAt: string;
}

type SortBy = 'recent' | 'popular' | 'mostCommented';

const LANGUAGES = ['C++', 'Java', 'Python3', 'JavaScript', 'Go', 'Rust', 'TypeScript', 'C'];
const TAG_FILTERS = ['My Solution', 'C++', 'Java', 'Python3', 'Array', 'Dynamic Programming', 'Prefix Sum', 'Matrix', 'Math', 'Greedy'];

const LANG_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'C++':        { bg: 'rgba(0,122,204,0.12)',  text: '#4da6ff', dot: '#007acc' },
  'Java':       { bg: 'rgba(248,152,32,0.12)', text: '#f8a040', dot: '#f89820' },
  'Python3':    { bg: 'rgba(55,180,150,0.12)', text: '#37c89a', dot: '#37b496' },
  'JavaScript': { bg: 'rgba(240,219,79,0.12)', text: '#e8c84b', dot: '#f0db4f' },
  'Go':         { bg: 'rgba(0,173,216,0.12)',  text: '#00add8', dot: '#00add8' },
  'Rust':       { bg: 'rgba(222,165,132,0.12)',text: '#dea584', dot: '#dea584' },
  'TypeScript': { bg: 'rgba(49,120,198,0.12)', text: '#5b9bd5', dot: '#3178c6' },
  'C':          { bg: 'rgba(149,117,205,0.12)',text: '#b39ddb', dot: '#9575cd' },
};

const AVATAR_COLORS = [
  '#e06c75','#98c379','#e5c07b','#61afef','#c678dd','#56b6c2','#d19a66'
];

const avatarColor = (name: string) =>
  AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const timeAgo = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ─── Avatar ────────────────────────────────────────────────────────────────────
const Avatar: React.FC<{ name: string; size?: number }> = ({ name, size = 28 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: `${avatarColor(name)}22`,
    border: `1.5px solid ${avatarColor(name)}55`,
    color: avatarColor(name),
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.4, fontWeight: 700, flexShrink: 0,
    fontFamily: 'inherit',
  }}>
    {name?.[0]?.toUpperCase() || '?'}
  </div>
);

// ─── LangBadge ────────────────────────────────────────────────────────────────
const LangBadge: React.FC<{ lang: string }> = ({ lang }) => {
  const c = LANG_COLORS[lang] || { bg: 'rgba(120,120,120,0.1)', text: '#888', dot: '#888' };
  return (
    <span style={{
      background: c.bg, color: c.text,
      border: `1px solid ${c.dot}33`,
      borderRadius: 6, fontSize: 11, fontWeight: 600,
      padding: '2px 8px', fontFamily: 'ui-monospace, monospace',
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, display: 'inline-block' }} />
      {lang}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Solutions: React.FC = () => {
  const { user, token } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [activeTag, setActiveTag] = useState('');
  const [activeLang, setActiveLang] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [selected, setSelected] = useState<Solution | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [codeExpanded, setCodeExpanded] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [voteLoading, setVoteLoading] = useState<string | null>(null);

  const [showSubmit, setShowSubmit] = useState(false);
  const [form, setForm] = useState({ title: '', code: '', language: 'C++', explanation: '', tags: '' });
  const [submitLoading, setSubmitLoading] = useState(false);

  // ─── Theme tokens ────────────────────────────────────────────────────────────
  const T = {
    bg:       isDark ? '#111214' : '#f7f8fa',
    surface:  isDark ? '#18191c' : '#ffffff',
    surface2: isDark ? '#1e2023' : '#f0f1f4',
    border:   isDark ? '#2a2b2f' : '#e4e6eb',
    border2:  isDark ? '#333640' : '#d4d7de',
    text:     isDark ? '#e6e8ed' : '#11131a',
    text2:    isDark ? '#9ba3af' : '#6b7280',
    text3:    isDark ? '#6b7280' : '#9ba3af',
    accent:   '#f5a623',
    accentBg: isDark ? 'rgba(245,166,35,0.12)' : 'rgba(245,166,35,0.1)',
    blue:     '#4da6ff',
    red:      '#ff6b6b',
    green:    '#37c89a',
    hover:    isDark ? '#1f2126' : '#f5f6f9',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: T.surface2, border: `1.5px solid ${T.border}`,
    color: T.text, borderRadius: 10, fontSize: 13,
    padding: '9px 12px', outline: 'none', transition: 'border 0.15s',
    fontFamily: 'inherit',
  };

  // ─── Fetch list ──────────────────────────────────────────────────────────────
  const fetchSolutions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sortBy });
      if (activeLang) params.append('language', activeLang);
      if (activeTag && !TAG_FILTERS.includes(activeTag)) params.append('tag', activeTag);
      const res = await axios.get(`${API_URL}/code-reviews?${params}`);
      setSolutions(res.data.reviews || []);
    } catch { showError('Failed to load solutions'); }
    finally { setLoading(false); }
  }, [sortBy, activeLang, activeTag]);

  useEffect(() => { fetchSolutions(); }, [fetchSolutions]);

  const openSolution = async (id: string) => {
    setDetailLoading(true); setSelected(null);
    try {
      const res = await axios.get(`${API_URL}/code-reviews/${id}`);
      setSelected(res.data); setNewComment('');
    } catch { showError('Failed to load solution'); }
    finally { setDetailLoading(false); }
  };

  const refreshSelected = async () => {
    if (!selected) return;
    const res = await axios.get(`${API_URL}/code-reviews/${selected._id}`);
    setSelected(res.data);
  };

  const voteSolution = async (id: string, type: 'up' | 'down', e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user || !token) return showError('Please login to vote');
    setVoteLoading(id + type);
    try {
      const res = await axios.post(`${API_URL}/code-reviews/${id}/vote`, { type }, { headers: { Authorization: `Bearer ${token}` } });
      setSolutions(prev => prev.map(s => s._id === id ? {
        ...s,
        upvotes: Array(res.data.upvotes).fill(user.id),
        downvotes: Array(res.data.downvotes).fill('x'),
        score: res.data.score
      } : s));
      if (selected?._id === id) refreshSelected();
    } catch { showError('Error voting'); }
    finally { setVoteLoading(null); }
  };

  const voteComment = async (commentId: string, type: 'up' | 'down') => {
    if (!user || !token || !selected) return;
    try {
      await axios.post(`${API_URL}/code-reviews/${selected._id}/comments/${commentId}/vote`, { type }, { headers: { Authorization: `Bearer ${token}` } });
      refreshSelected();
    } catch { showError('Error voting'); }
  };

  const submitComment = async () => {
    if (!user || !token || !selected || !newComment.trim()) return;
    setCommentLoading(true);
    try {
      await axios.post(`${API_URL}/code-reviews/${selected._id}/comments`, { content: newComment }, { headers: { Authorization: `Bearer ${token}` } });
      setNewComment(''); refreshSelected();
    } catch { showError('Failed to post comment'); }
    finally { setCommentLoading(false); }
  };

  const deleteComment = async (commentId: string) => {
    if (!user || !token || !selected) return;
    try {
      await axios.delete(`${API_URL}/code-reviews/${selected._id}/comments/${commentId}`, { headers: { Authorization: `Bearer ${token}` } });
      refreshSelected();
    } catch { showError('Failed to delete comment'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) return showError('Please login');
    if (!form.title.trim() || !form.code.trim()) return showError('Title and code required');
    setSubmitLoading(true);
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      await axios.post(`${API_URL}/code-reviews`, { ...form, tags }, { headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Solution published!');
      setForm({ title: '', code: '', language: 'C++', explanation: '', tags: '' });
      setShowSubmit(false); fetchSolutions();
    } catch { showError('Failed to submit'); }
    finally { setSubmitLoading(false); }
  };

  const isUpvoted = (upvotes: string[]) => user ? upvotes.some(v => v === user.id || v === user._id) : false;
  const isDownvoted = (downvotes: string[]) => user ? downvotes.some(v => v === user.id || v === user._id) : false;

  const filtered = solutions.filter(s => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.author?.username.toLowerCase().includes(q);
  }).filter(s => {
    if (!activeTag) return true;
    if (activeTag === 'My Solution') return user && (s.author?._id === user.id || s.author?._id === user._id);
    return s.tags.includes(activeTag) || s.language === activeTag;
  });

  const sortIcons: Record<SortBy, React.ReactNode> = {
    recent: <Clock size={12} />, popular: <Flame size={12} />, mostCommented: <TrendingUp size={12} />
  };
  const sortLabels: Record<SortBy, string> = {
    recent: 'Recent', popular: 'Hot', mostCommented: 'Most discussed'
  };

  // ─── SUBMIT VIEW ──────────────────────────────────────────────────────────────
  if (showSubmit) return (
    <div style={{ minHeight: '100vh', background: T.bg, padding: '0 0 60px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <button onClick={() => setShowSubmit(false)} style={{
            display: 'flex', alignItems: 'center', gap: 6, color: T.text2,
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
            padding: '6px 10px', borderRadius: 8,
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = T.hover)}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span style={{ fontSize: 12, color: T.text3 }}>Share your approach with the community</span>
        </div>

        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, background: isDark ? 'rgba(245,166,35,0.05)' : 'rgba(245,166,35,0.04)' }}>
            <h2 style={{ color: T.text, fontSize: 17, fontWeight: 700, margin: 0 }}>Publish Your Solution</h2>
            <p style={{ color: T.text2, fontSize: 13, margin: '4px 0 0' }}>Help others understand your approach</p>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Title <span style={{ color: T.accent }}>*</span>
                </label>
                <input
                  type="text" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. O(n) Prefix Sum — beats 99.8% runtime"
                  style={inputStyle} required
                  onFocus={e => (e.target.style.borderColor = T.accent)}
                  onBlur={e => (e.target.style.borderColor = T.border)}
                />
              </div>

              {/* Language */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Language <span style={{ color: T.accent }}>*</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {LANGUAGES.map(lang => {
                    const c = LANG_COLORS[lang] || { bg: 'transparent', text: T.text2, dot: T.text3 };
                    const active = form.language === lang;
                    return (
                      <button key={lang} type="button" onClick={() => setForm({ ...form, language: lang })} style={{
                        padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        fontFamily: 'ui-monospace, monospace', cursor: 'pointer', transition: 'all 0.15s',
                        border: `1.5px solid ${active ? c.dot : T.border}`,
                        background: active ? c.bg : 'transparent',
                        color: active ? c.text : T.text2,
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: active ? c.dot : T.text3 }} />
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Code */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Code <span style={{ color: T.accent }}>*</span>
                </label>
                <div style={{ borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${T.border}` }}>
                  <div style={{ background: isDark ? '#0d0e10' : '#f5f6f8', padding: '8px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 6 }}>
                    {['#ff5f57','#febc2e','#28c840'].map(c => <span key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c, display: 'block' }} />)}
                  </div>
                  <textarea
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    placeholder={`class Solution {\npublic:\n    // your solution here\n};`}
                    rows={14}
                    style={{
                      ...inputStyle, borderRadius: 0, border: 'none',
                      fontFamily: 'ui-monospace, "Cascadia Code", monospace',
                      fontSize: 12.5, lineHeight: 1.7, resize: 'vertical',
                      background: isDark ? '#0d0e10' : '#fafbfc',
                    }}
                    required
                    onFocus={e => { e.target.parentElement!.parentElement!.style.borderColor = T.accent; }}
                    onBlur={e => { e.target.parentElement!.parentElement!.style.borderColor = T.border; }}
                  />
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Explanation
                </label>
                <textarea
                  value={form.explanation}
                  onChange={e => setForm({ ...form, explanation: e.target.value })}
                  placeholder="Walk through your approach, time & space complexity, key insights..."
                  rows={4}
                  style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
                  onFocus={e => (e.target.style.borderColor = T.accent)}
                  onBlur={e => (e.target.style.borderColor = T.border)}
                />
              </div>

              {/* Tags */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tags
                </label>
                <input
                  type="text" value={form.tags}
                  onChange={e => setForm({ ...form, tags: e.target.value })}
                  placeholder="Array, Prefix Sum, Matrix  (comma separated)"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = T.accent)}
                  onBlur={e => (e.target.style.borderColor = T.border)}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button type="submit" disabled={submitLoading} style={{
                  padding: '9px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: T.accent, color: '#fff', border: 'none', cursor: 'pointer',
                  opacity: submitLoading ? 0.6 : 1, transition: 'all 0.15s',
                  boxShadow: `0 2px 12px ${T.accent}44`,
                }}>
                  {submitLoading ? 'Publishing...' : '↑ Publish Solution'}
                </button>
                <button type="button" onClick={() => setShowSubmit(false)} style={{
                  padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: 'none', color: T.text2, border: `1.5px solid ${T.border}`, cursor: 'pointer',
                }}>
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  // ─── DETAIL VIEW ──────────────────────────────────────────────────────────────
  if (selected || detailLoading) return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 20px 60px' }}>
        <button onClick={() => { setSelected(null); setDetailLoading(false); }} style={{
          display: 'flex', alignItems: 'center', gap: 6, color: T.text2,
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
          padding: '6px 10px 6px 4px', borderRadius: 8, marginBottom: 20,
        }}>
          <ArrowLeft size={14} /> All Solutions
        </button>

        {detailLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `2.5px solid ${T.border2}`,
              borderTopColor: T.accent, animation: 'spin 0.8s linear infinite'
            }} />
          </div>
        )}

        {selected && (
          <div>
            {/* Main card */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
              {/* Card header */}
              <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <Avatar name={selected.author?.username || '?'} size={34} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.blue }}>{selected.author?.username}</span>
                      <span style={{ color: T.text3, fontSize: 12 }}>·</span>
                      <span style={{ fontSize: 12, color: T.text3 }}>{timeAgo(selected.createdAt)}</span>
                      {selected.isPinned && (
                        <span style={{ fontSize: 11, color: '#f5c518', display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(245,197,24,0.12)', padding: '1px 7px', borderRadius: 20 }}>
                          <Pin size={10} /> Pinned
                        </span>
                      )}
                      {selected.isLocked && (
                        <span style={{ fontSize: 11, color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(255,107,107,0.12)', padding: '1px 7px', borderRadius: 20 }}>
                          <Lock size={10} /> Locked
                        </span>
                      )}
                    </div>
                    <h1 style={{ color: T.text, fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.4 }}>
                      {selected.title}
                    </h1>
                  </div>
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  <LangBadge lang={selected.language} />
                  {selected.tags.map(tag => (
                    <span key={tag} style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 6,
                      background: T.surface2, border: `1px solid ${T.border}`, color: T.text2,
                    }}>{tag}</span>
                  ))}
                </div>
              </div>

              {/* Vote / stats bar */}
              <div style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 20, borderBottom: `1px solid ${T.border}`, background: T.surface2 }}>
                <button onClick={() => voteSolution(selected._id, 'up')} disabled={!!voteLoading} style={{
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
                  background: isUpvoted(selected.upvotes) ? 'rgba(77,166,255,0.12)' : 'none',
                  color: isUpvoted(selected.upvotes) ? T.blue : T.text2,
                  border: `1px solid ${isUpvoted(selected.upvotes) ? T.blue + '44' : 'transparent'}`,
                  borderRadius: 8, padding: '4px 10px', cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <ThumbsUp size={14} /> {selected.upvotes.length}
                </button>
                <button onClick={() => voteSolution(selected._id, 'down')} disabled={!!voteLoading} style={{
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
                  background: isDownvoted(selected.downvotes) ? 'rgba(255,107,107,0.12)' : 'none',
                  color: isDownvoted(selected.downvotes) ? T.red : T.text2,
                  border: `1px solid ${isDownvoted(selected.downvotes) ? T.red + '44' : 'transparent'}`,
                  borderRadius: 8, padding: '4px 10px', cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <ThumbsDown size={14} /> {selected.downvotes.length}
                </button>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: T.text3 }}>
                  <Eye size={14} /> {selected.viewCount}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: T.text3 }}>
                  <MessageSquare size={14} /> {selected.comments.length}
                </span>
              </div>

              {/* Explanation */}
              {selected.explanation && (
                <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.border}` }}>
                  <p style={{ fontSize: 14, color: isDark ? '#c5c9d1' : '#374151', lineHeight: 1.75, margin: 0 }}>
                    {selected.explanation}
                  </p>
                </div>
              )}

              {/* Code block */}
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', borderBottom: `1px solid ${T.border}`,
                  background: isDark ? '#0d0e11' : '#f5f6f8',
                }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {['#ff5f57', '#febc2e', '#28c840'].map(c => <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
                    <span style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', color: T.text3, marginLeft: 8 }}>{selected.language}</span>
                  </div>
                  <button onClick={() => setCodeExpanded(!codeExpanded)} style={{
                    display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: T.text3,
                    background: 'none', border: 'none', cursor: 'pointer',
                  }}>
                    {codeExpanded ? <><ChevronUp size={12} /> collapse</> : <><ChevronDown size={12} /> expand</>}
                  </button>
                </div>
                <pre style={{
                  margin: 0, padding: '18px 22px',
                  fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
                  fontSize: 12.5, lineHeight: 1.75, overflowX: 'auto',
                  background: isDark ? '#0a0b0e' : '#fafbfd',
                  color: isDark ? '#d5dae5' : '#2d3748',
                  maxHeight: codeExpanded ? 'none' : 200, overflowY: codeExpanded ? 'visible' : 'auto',
                }}>
                  <code>{selected.code}</code>
                </pre>
              </div>
            </div>

            {/* Comments section */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: `1px solid ${T.border}` }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>
                  {selected.comments.length} Comment{selected.comments.length !== 1 ? 's' : ''}
                </h3>
              </div>

              <div style={{ padding: '0 24px' }}>
                {selected.comments.length === 0 && (
                  <p style={{ fontSize: 13, color: T.text3, padding: '20px 0', textAlign: 'center' }}>
                    No comments yet — be the first!
                  </p>
                )}

                {selected.comments.map((c, i) => (
                  <div key={c._id} style={{
                    display: 'flex', gap: 12, padding: '16px 0',
                    borderBottom: i < selected.comments.length - 1 ? `1px solid ${T.border}` : 'none',
                  }}>
                    <Avatar name={c.author?.username || '?'} size={30} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{c.author?.username}</span>
                        <span style={{ fontSize: 11, color: T.text3 }}>{timeAgo(c.createdAt)}</span>
                      </div>
                      <p style={{ fontSize: 13.5, color: isDark ? '#b8bdc8' : '#374151', lineHeight: 1.65, margin: '0 0 8px' }}>
                        {c.content}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={() => voteComment(c._id, 'up')} style={{
                          display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                          color: isUpvoted(c.upvotes) ? T.blue : T.text3,
                          background: 'none', border: 'none', cursor: 'pointer',
                        }}>
                          <ThumbsUp size={12} /> {c.upvotes.length}
                        </button>
                        <button onClick={() => voteComment(c._id, 'down')} style={{
                          display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                          color: isDownvoted(c.downvotes) ? T.red : T.text3,
                          background: 'none', border: 'none', cursor: 'pointer',
                        }}>
                          <ThumbsDown size={12} /> {c.downvotes.length}
                        </button>
                        {user && (c.author?._id === user.id || c.author?._id === user._id || user.role === 'admin') && (
                          <button onClick={() => deleteComment(c._id)} style={{
                            display: 'flex', alignItems: 'center', fontSize: 12, color: T.text3,
                            background: 'none', border: 'none', cursor: 'pointer',
                          }}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comment input */}
              <div style={{ padding: '16px 24px', borderTop: `1px solid ${T.border}`, background: T.surface2 }}>
                {user ? (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Avatar name={user.username || '?'} size={30} />
                    <div style={{ flex: 1 }}>
                      <textarea
                        value={newComment} onChange={e => setNewComment(e.target.value)}
                        placeholder="Share your thoughts, ask a question..."
                        rows={3}
                        style={{ ...inputStyle, resize: 'none', lineHeight: 1.6, marginBottom: 10 }}
                        onFocus={e => (e.target.style.borderColor = T.accent)}
                        onBlur={e => (e.target.style.borderColor = T.border)}
                        onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submitComment(); }}
                      />
                      <button onClick={submitComment} disabled={commentLoading || !newComment.trim()} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5,
                        fontWeight: 700, padding: '7px 16px', borderRadius: 9,
                        background: T.accent, color: '#fff', border: 'none', cursor: 'pointer',
                        opacity: commentLoading || !newComment.trim() ? 0.5 : 1,
                        boxShadow: `0 2px 8px ${T.accent}33`,
                      }}>
                        <Send size={12} />
                        {commentLoading ? 'Posting...' : 'Comment'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: T.text3, margin: 0 }}>
                    <button onClick={() => navigate('/login')} style={{ color: T.blue, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Log in
                    </button>{' '}to join the discussion
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ─── LIST VIEW ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .sol-card:hover { background: ${T.hover} !important; }
        .sol-card { animation: fadeUp 0.2s ease forwards; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 8px; }
      `}</style>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Top bar */}
        <div style={{ padding: '16px 20px 0' }}>
          {/* Search + actions row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: T.text3 }} />
              <input
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search solutions or authors..."
                style={{ ...inputStyle, paddingLeft: 32, paddingTop: 8, paddingBottom: 8 }}
                onFocus={e => (e.target.style.borderColor = T.accent)}
                onBlur={e => (e.target.style.borderColor = T.border)}
              />
            </div>
            {user && (
              <button onClick={() => setShowSubmit(true)} style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
                padding: '8px 16px', borderRadius: 10, background: T.accent, color: '#fff',
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                boxShadow: `0 2px 10px ${T.accent}44`,
              }}>
                <Share2 size={13} /> Share Solution
              </button>
            )}
          </div>

          {/* Sort pills */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {(['recent', 'popular', 'mostCommented'] as SortBy[]).map(k => (
              <button key={k} onClick={() => setSortBy(k)} style={{
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600,
                padding: '5px 12px', borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s',
                background: sortBy === k ? T.accentBg : T.surface2,
                color: sortBy === k ? T.accent : T.text2,
                border: `1.5px solid ${sortBy === k ? T.accent + '55' : T.border}`,
              }}>
                {sortIcons[k]} {sortLabels[k]}
              </button>
            ))}
          </div>

          {/* Tag pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <button onClick={() => setActiveTag('')} style={{
              fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
              background: !activeTag ? T.surface : 'none',
              color: !activeTag ? T.text : T.text3,
              border: `1.5px solid ${!activeTag ? T.border2 : T.border}`,
            }}>All</button>
            {TAG_FILTERS.map(tag => (
              <button key={tag} onClick={() => setActiveTag(activeTag === tag ? '' : tag)} style={{
                fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s',
                background: activeTag === tag ? T.surface : 'none',
                color: activeTag === tag ? T.text : T.text3,
                border: `1.5px solid ${activeTag === tag ? T.border2 : T.border}`,
              }}>{tag}</button>
            ))}
          </div>
        </div>

        {/* Count line */}
        {!loading && (
          <div style={{ padding: '10px 20px 6px', fontSize: 12, color: T.text3 }}>
            {filtered.length} solution{filtered.length !== 1 ? 's' : ''}
            {searchTerm && <> for "<span style={{ color: T.text2 }}>{searchTerm}</span>"</>}
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: T.border, margin: '0 20px' }} />

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2.5px solid ${T.border2}`, borderTopColor: T.accent, animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 80, color: T.text3 }}>
            <Code2 size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: 14, margin: 0 }}>No solutions found</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Try a different filter or search term</p>
          </div>
        ) : (
          <div>
            {filtered.map((s, i) => (
              <div
                key={s._id}
                className="sol-card"
                style={{
                  padding: '16px 20px', cursor: 'pointer', transition: 'background 0.12s',
                  borderBottom: `1px solid ${T.border}`,
                  animationDelay: `${Math.min(i * 0.03, 0.18)}s`,
                  animationFillMode: 'both',
                }}
                onClick={() => openSolution(s._id)}
              >
                {/* Top row: avatar + meta */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <Avatar name={s.author?.username || '?'} size={32} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Author + meta */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: T.blue }}>{s.author?.username}</span>
                      {s.isPinned && (
                        <span style={{ fontSize: 10, color: '#f5c518', background: 'rgba(245,197,24,0.1)', padding: '1px 6px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Pin size={9} /> pinned
                        </span>
                      )}
                      {s.isLocked && (
                        <span style={{ fontSize: 10, color: T.red, background: 'rgba(255,107,107,0.1)', padding: '1px 6px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Lock size={9} /> locked
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: T.text3 }}>{timeAgo(s.createdAt)}</span>
                    </div>

                    {/* Title */}
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: '0 0 8px', lineHeight: 1.45 }}>
                      {s.title}
                    </h3>

                    {/* Badges row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                      <LangBadge lang={s.language} />
                      {s.tags.slice(0, 5).map(tag => (
                        <span key={tag} style={{
                          fontSize: 11, padding: '2px 7px', borderRadius: 5,
                          background: T.surface2, border: `1px solid ${T.border}`, color: T.text2,
                        }}>{tag}</span>
                      ))}
                      {s.tags.length > 5 && (
                        <span style={{ fontSize: 11, color: T.text3, padding: '2px 4px' }}>+{s.tags.length - 5}</span>
                      )}
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <button
                        onClick={e => voteSolution(s._id, 'up', e)}
                        disabled={!!voteLoading}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600,
                          padding: '3px 9px', borderRadius: 7,
                          background: isUpvoted(s.upvotes) ? 'rgba(77,166,255,0.12)' : T.surface2,
                          color: isUpvoted(s.upvotes) ? T.blue : T.text2,
                          border: `1px solid ${isUpvoted(s.upvotes) ? T.blue + '44' : T.border}`,
                          cursor: 'pointer', transition: 'all 0.12s',
                        }}
                      >
                        <ThumbsUp size={12} /> {s.upvotes?.length || 0}
                      </button>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.text3 }}>
                        <Eye size={12} /> {s.viewCount || 0}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.text3 }}>
                        <MessageSquare size={12} /> {s.comments?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Solutions;
