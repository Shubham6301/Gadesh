import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { showError, showSuccess } from '../utils/toast';
import {
  ThumbsUp, ThumbsDown, Eye, MessageSquare,
  Send, Trash2, ChevronDown, ChevronUp,
  Share2, Code2, Search, ArrowLeft, AlertTriangle
} from 'lucide-react';
import { API_URL } from '../config/api';

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
  createdAt: string;
}

interface Props {
  problemId: string;
  problemTitle: string;
}

interface DeleteModal {
  show: boolean;
  type: 'solution' | 'comment';
  solutionId: string;
  commentId?: string;
  title: string;
}

const LANGUAGES = ['C++', 'Java', 'Python3', 'JavaScript', 'Go', 'C'];

const timeAgo = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

const ProblemSolutions: React.FC<Props> = ({ problemId, problemTitle }) => {
  const { user, token } = useAuth();
  const { isDark } = useTheme();

  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [filterLang, setFilterLang] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<Solution | null>(null);
  const [codeExpanded, setCodeExpanded] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [voteLoading, setVoteLoading] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [form, setForm] = useState({ title: '', code: '', language: 'C++', explanation: '', tags: '' });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState<DeleteModal>({
    show: false, type: 'solution', solutionId: '', title: ''
  });

  // ─── Fetch ────────────────────────────────────────────────────────────────────
  const fetchSolutions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sortBy, problemRef: problemId });
      if (filterLang) params.append('language', filterLang);
      const res = await axios.get(`${API_URL}/code-reviews?${params}`);
      const all: Solution[] = res.data.reviews || [];
      setSolutions(all.filter(s =>
        s.tags.includes(`problem:${problemId}`) || s.tags.includes(`problem:${problemTitle}`)
      ));
    } catch {
      showError('Failed to load solutions');
    } finally {
      setLoading(false);
    }
  }, [sortBy, filterLang, problemId, problemTitle]);

  useEffect(() => { fetchSolutions(); }, [fetchSolutions]);

  const refreshSelected = async () => {
    if (!selected) return;
    const res = await axios.get(`${API_URL}/code-reviews/${selected._id}`);
    setSelected(res.data);
  };

  // ─── Delete confirm ───────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!user || !token) return;
    setDeleteLoading(true);
    try {
      if (deleteModal.type === 'solution') {
        await axios.delete(`${API_URL}/code-reviews/${deleteModal.solutionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccess('Solution deleted');
        if (selected?._id === deleteModal.solutionId) setSelected(null);
        fetchSolutions();
      } else {
        await axios.delete(
          `${API_URL}/code-reviews/${deleteModal.solutionId}/comments/${deleteModal.commentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showSuccess('Comment deleted');
        refreshSelected();
      }
      setDeleteModal({ show: false, type: 'solution', solutionId: '', title: '' });
    } catch {
      showError('Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openDeleteSolution = (id: string, title: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeleteModal({ show: true, type: 'solution', solutionId: id, title });
  };

  const openDeleteComment = (solutionId: string, commentId: string, content: string) => {
    setDeleteModal({ show: true, type: 'comment', solutionId, commentId, title: content });
  };

  const closeDeleteModal = () =>
    setDeleteModal({ show: false, type: 'solution', solutionId: '', title: '' });

  // ─── Vote solution ────────────────────────────────────────────────────────────
  const voteSolution = async (id: string, type: 'up' | 'down', e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user || !token) return showError('Login to vote');
    setVoteLoading(id + type);
    try {
      const res = await axios.post(
        `${API_URL}/code-reviews/${id}/vote`, { type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSolutions(prev => prev.map(s => s._id === id ? {
        ...s,
        upvotes: Array(res.data.upvotes).fill(user.id),
        downvotes: Array(res.data.downvotes).fill('x'),
      } : s));
      if (selected?._id === id) refreshSelected();
    } catch { showError('Error voting'); }
    finally { setVoteLoading(null); }
  };

  // ─── Vote comment ─────────────────────────────────────────────────────────────
  const voteComment = async (commentId: string, type: 'up' | 'down') => {
    if (!user || !token || !selected) return;
    try {
      await axios.post(
        `${API_URL}/code-reviews/${selected._id}/comments/${commentId}/vote`, { type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refreshSelected();
    } catch { showError('Error voting'); }
  };

  // ─── Add comment ──────────────────────────────────────────────────────────────
  const submitComment = async () => {
    if (!user || !token || !selected || !newComment.trim()) return;
    setCommentLoading(true);
    try {
      await axios.post(
        `${API_URL}/code-reviews/${selected._id}/comments`, { content: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewComment('');
      refreshSelected();
    } catch { showError('Failed to post comment'); }
    finally { setCommentLoading(false); }
  };

  // ─── Submit solution ──────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) return showError('Login required');
    if (!form.title.trim() || !form.code.trim()) return showError('Title and code required');
    setSubmitLoading(true);
    try {
      const userTags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const tags = [...userTags, `problem:${problemId}`, `problem:${problemTitle}`];
      await axios.post(`${API_URL}/code-reviews`, { ...form, tags },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSuccess('Solution published!');
      setForm({ title: '', code: '', language: 'C++', explanation: '', tags: '' });
      setShowSubmit(false);
      fetchSolutions();
    } catch { showError('Submission failed'); }
    finally { setSubmitLoading(false); }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const isUpvoted = (votes: string[]) =>
    user ? votes.some(v => v === user.id || v === (user as any)._id) : false;
  const isDownvoted = (votes: string[]) =>
    user ? votes.some(v => v === user.id || v === (user as any)._id) : false;
  const isOwner = (authorId: string) =>
    !!user && (authorId === user.id || authorId === (user as any)._id || user.role === 'admin');

  const filtered = solutions
    .filter(s => !searchTerm ||
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.author?.username.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(s => !filterLang || s.language === filterLang);

  // ─── Theme ────────────────────────────────────────────────────────────────────
  const border = isDark ? 'border-gray-700' : 'border-gray-200';
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const textPrimary = isDark ? 'text-gray-100' : 'text-gray-900';
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all ${isDark
    ? 'bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-600 focus:border-gray-500'
    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-gray-400'}`;
  const tagCls = (active: boolean) =>
    `text-xs px-3 py-1 rounded-full border cursor-pointer transition-all whitespace-nowrap ${active
      ? isDark ? 'bg-gray-700 text-gray-200 border-gray-500' : 'bg-gray-200 text-gray-800 border-gray-400'
      : isDark ? 'border-gray-700 text-gray-500 hover:text-gray-300' : 'border-gray-200 text-gray-500 hover:text-gray-700'}`;

  // ─── DELETE MODAL ─────────────────────────────────────────────────────────────
  const DeleteConfirmModal = () => {
    if (!deleteModal.show) return null;
    const isSolution = deleteModal.type === 'solution';
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
        onClick={closeDeleteModal}
      >
        <div
          className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-100'}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Red top accent */}
          <div className="h-1 w-full bg-gradient-to-r from-red-500 to-rose-400" />

          <div className="p-6">
            {/* Warning icon */}
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
              <AlertTriangle size={26} className="text-red-500" />
            </div>

            {/* Heading */}
            <h3 className={`text-base font-semibold text-center mb-1 ${textPrimary}`}>
              Delete {isSolution ? 'Solution' : 'Comment'}?
            </h3>
            <p className={`text-xs text-center mb-4 ${muted}`}>
              This action cannot be undone.
            </p>

            {/* Preview */}
            <div className={`px-3 py-2.5 rounded-xl text-xs line-clamp-2 mb-5 ${isDark ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
              "{deleteModal.title}"
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={deleteLoading}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border ${isDark
                  ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleteLoading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Deleting...</>
                  : <><Trash2 size={14} />Delete</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── SUBMIT FORM ──────────────────────────────────────────────────────────────
  if (showSubmit) return (
    <div>
      <DeleteConfirmModal />
      <button onClick={() => setShowSubmit(false)}
        className={`flex items-center gap-1.5 text-sm mb-5 ${muted} transition-colors`}>
        <ArrowLeft size={14} /> Back to Solutions
      </button>
      <h3 className={`text-base font-semibold mb-4 ${textPrimary}`}>Share Your Solution</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={`block text-xs font-medium mb-1.5 ${muted}`}>Title *</label>
          <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. O(n) DP approach | beats 95%" className={inputCls} required />
        </div>
        <div>
          <label className={`block text-xs font-medium mb-2 ${muted}`}>Language *</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(lang => (
              <button key={lang} type="button" onClick={() => setForm({ ...form, language: lang })}
                className={`text-xs px-3 py-1.5 rounded-full border font-mono transition-all ${form.language === lang
                  ? 'bg-blue-600 text-white border-blue-600'
                  : isDark ? 'border-gray-700 text-gray-400 hover:border-gray-500' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                {lang}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={`block text-xs font-medium mb-1.5 ${muted}`}>Code *</label>
          <textarea value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
            placeholder="Paste your accepted solution here..."
            rows={12} className={`${inputCls} font-mono text-xs resize-y`} required />
        </div>
        <div>
          <label className={`block text-xs font-medium mb-1.5 ${muted}`}>Explanation / Approach</label>
          <textarea value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })}
            placeholder="Explain your approach, time & space complexity..."
            rows={3} className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className={`block text-xs font-medium mb-1.5 ${muted}`}>Extra Tags (comma separated)</label>
          <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
            placeholder="e.g. DP, DFS, two-pointers" className={inputCls} />
          <p className={`text-xs mt-1 ${muted}`}>Problem tag added automatically</p>
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={submitLoading}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50">
            {submitLoading ? 'Publishing...' : 'Publish Solution'}
          </button>
          <button type="button" onClick={() => setShowSubmit(false)}
            className={`px-4 py-2 rounded-lg text-sm border transition-all ${isDark ? 'border-gray-700 text-gray-400 hover:bg-gray-800' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  // ─── DETAIL VIEW ──────────────────────────────────────────────────────────────
  if (selected) return (
    <div>
      <DeleteConfirmModal />
      <button onClick={() => setSelected(null)}
        className={`flex items-center gap-1.5 text-sm mb-4 ${muted} transition-colors`}>
        <ArrowLeft size={14} /> All Solutions
      </button>

      <div className="mb-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className={`text-base font-semibold mb-1 ${textPrimary}`}>{selected.title}</h3>
          {isOwner(selected.author?._id) && (
            <button
              onClick={e => openDeleteSolution(selected._id, selected.title, e)}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-500 transition-colors shrink-0 mt-0.5">
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
        <div className={`flex flex-wrap items-center gap-2 text-xs ${muted}`}>
          <span className="text-blue-500 font-medium">{selected.author?.username}</span>
          <span>·</span>
          <span>{timeAgo(selected.createdAt)}</span>
          <span className={`font-mono px-2 py-0.5 rounded border ${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
            {selected.language}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.tags.filter(t => !t.startsWith('problem:')).map(tag => (
            <span key={tag} className={`text-xs px-2 py-0.5 rounded border ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-500'}`}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className={`flex items-center gap-4 py-2.5 border-y mb-4 ${border}`}>
        <button onClick={() => voteSolution(selected._id, 'up')} disabled={!!voteLoading}
          className={`flex items-center gap-1.5 text-sm transition-colors ${isUpvoted(selected.upvotes) ? 'text-blue-500' : `${muted} hover:text-blue-500`}`}>
          <ThumbsUp size={14} /> {selected.upvotes.length}
        </button>
        <button onClick={() => voteSolution(selected._id, 'down')} disabled={!!voteLoading}
          className={`flex items-center gap-1.5 text-sm transition-colors ${isDownvoted(selected.downvotes) ? 'text-red-500' : `${muted} hover:text-red-500`}`}>
          <ThumbsDown size={14} /> {selected.downvotes.length}
        </button>
        <span className={`flex items-center gap-1.5 text-sm ${muted}`}><Eye size={14} /> {selected.viewCount}</span>
        <span className={`flex items-center gap-1.5 text-sm ${muted}`}><MessageSquare size={14} /> {selected.comments.length}</span>
      </div>

      {selected.explanation && (
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          {selected.explanation}
        </p>
      )}

      <div className={`rounded-lg border overflow-hidden mb-5 ${border}`}>
        <div className={`flex items-center justify-between px-3 py-2 border-b text-xs ${border} ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <span className={`font-mono font-medium ${muted}`}>{selected.language}</span>
          <button onClick={() => setCodeExpanded(!codeExpanded)} className={`flex items-center gap-1 ${muted}`}>
            {codeExpanded ? <><ChevronUp size={12} />collapse</> : <><ChevronDown size={12} />expand</>}
          </button>
        </div>
        <pre className={`font-mono text-xs leading-relaxed p-4 overflow-x-auto ${codeExpanded ? '' : 'max-h-48 overflow-y-auto'} ${isDark ? 'bg-gray-950 text-gray-300' : 'bg-gray-50 text-gray-800'}`}>
          <code>{selected.code}</code>
        </pre>
      </div>

      <div className={`border-t pt-4 ${border}`}>
        <p className={`text-xs font-semibold mb-3 ${textPrimary}`}>
          {selected.comments.length} Comment{selected.comments.length !== 1 ? 's' : ''}
        </p>
        <div className="space-y-3 mb-4">
          {selected.comments.length === 0 && <p className={`text-sm ${muted}`}>No comments yet.</p>}
          {selected.comments.map(c => (
            <div key={c._id} className="flex gap-2.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                {c.author?.username?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <div className={`flex items-center gap-2 mb-0.5 text-xs ${muted}`}>
                  <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{c.author?.username}</span>
                  <span>{timeAgo(c.createdAt)}</span>
                </div>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{c.content}</p>
                <div className="flex items-center gap-3 mt-1">
                  <button onClick={() => voteComment(c._id, 'up')}
                    className={`flex items-center gap-1 text-xs transition-colors ${isUpvoted(c.upvotes) ? 'text-blue-500' : `${muted} hover:text-blue-500`}`}>
                    <ThumbsUp size={11} /> {c.upvotes.length}
                  </button>
                  <button onClick={() => voteComment(c._id, 'down')}
                    className={`flex items-center gap-1 text-xs transition-colors ${isDownvoted(c.downvotes) ? 'text-red-500' : `${muted} hover:text-red-500`}`}>
                    <ThumbsDown size={11} />
                  </button>
                  {isOwner(c.author?._id) && (
                    <button
                      onClick={() => openDeleteComment(selected._id, c._id, c.content)}
                      className={`text-xs ${muted} hover:text-red-500 transition-colors`}>
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {user ? (
          <div className="flex gap-2.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
              {user.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder="Ask a question or leave a comment..."
                rows={2} className={`${inputCls} resize-none mb-1.5`} />
              <button onClick={submitComment} disabled={commentLoading || !newComment.trim()}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-40">
                <Send size={11} />{commentLoading ? 'Posting...' : 'Comment'}
              </button>
            </div>
          </div>
        ) : (
          <p className={`text-xs ${muted}`}>Login to comment</p>
        )}
      </div>
    </div>
  );

  // ─── LIST VIEW ────────────────────────────────────────────────────────────────
  return (
    <div>
      <DeleteConfirmModal />

      <div className={`flex items-center justify-between mb-4 pb-3 border-b ${border}`}>
        <span className={`text-xs ${muted}`}>
          {user
            ? `${filtered.length} community solution${filtered.length !== 1 ? 's' : ''}`
            : 'Login to share your solution'}
        </span>
        {user && (
          <button onClick={() => setShowSubmit(true)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all border ${isDark
              ? 'border-blue-800 bg-blue-900/20 text-blue-400 hover:bg-blue-900/40'
              : 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
            <Share2 size={12} /> Share my solution
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-[120px]">
          <Search size={12} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${muted}`} />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search..." className={`${inputCls} pl-7 py-1.5`} />
        </div>
        {(['recent', 'popular'] as const).map(k => (
          <button key={k} onClick={() => setSortBy(k)} className={tagCls(sortBy === k)}>
            {k === 'recent' ? 'Recent' : 'Top'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <button onClick={() => setFilterLang('')} className={tagCls(!filterLang)}>All</button>
        {LANGUAGES.map(lang => (
          <button key={lang} onClick={() => setFilterLang(filterLang === lang ? '' : lang)}
            className={tagCls(filterLang === lang)}>{lang}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className={`animate-spin rounded-full h-6 w-6 border-2 border-t-transparent ${isDark ? 'border-gray-600' : 'border-gray-300'}`} />
        </div>
      ) : filtered.length === 0 ? (
        <div className={`text-center py-10 rounded-lg border ${border} ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <Code2 size={28} className={`mx-auto mb-2 opacity-30 ${muted}`} />
          <p className={`text-sm ${muted}`}>No community solutions yet.</p>
          {user && (
            <button onClick={() => setShowSubmit(true)} className="mt-3 text-xs text-blue-500 hover:underline">
              Be the first to share →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-0">
          {filtered.map(s => (
            <div key={s._id}
              className={`py-3.5 border-b cursor-pointer transition-colors ${border} ${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}
              onClick={async () => {
                try {
                  const res = await axios.get(`${API_URL}/code-reviews/${s._id}`);
                  setSelected(res.data);
                  setCodeExpanded(true);
                  setNewComment('');
                } catch { showError('Failed to load'); }
              }}>
              <div className={`flex items-center gap-2 mb-1 text-xs ${muted}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                  {s.author?.username?.[0]?.toUpperCase()}
                </div>
                <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{s.author?.username}</span>
                <span>·</span>
                <span>{timeAgo(s.createdAt)}</span>
              </div>
              <p className={`text-sm font-medium mb-1.5 leading-snug ${textPrimary}`}>{s.title}</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded border font-mono ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-500'}`}>
                  {s.language}
                </span>
                {s.tags.filter(t => !t.startsWith('problem:')).slice(0, 3).map(tag => (
                  <span key={tag} className={`text-xs px-2 py-0.5 rounded border ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-500'}`}>
                    {tag}
                  </span>
                ))}
              </div>
              <div className={`flex items-center gap-3 text-xs ${muted}`}>
                <button onClick={e => voteSolution(s._id, 'up', e)} disabled={!!voteLoading}
                  className={`flex items-center gap-1 transition-colors ${isUpvoted(s.upvotes) ? 'text-blue-500' : `${muted} hover:text-blue-500`}`}>
                  <ThumbsUp size={11} /> {s.upvotes.length}
                </button>
                <span className="flex items-center gap-1"><Eye size={11} /> {s.viewCount}</span>
                <span className="flex items-center gap-1"><MessageSquare size={11} /> {s.comments.length}</span>
                {isOwner(s.author?._id) && (
                  <button
                    onClick={e => openDeleteSolution(s._id, s.title, e)}
                    className={`flex items-center gap-1 ml-auto hover:text-red-500 transition-colors`}>
                    <Trash2 size={11} /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProblemSolutions;
