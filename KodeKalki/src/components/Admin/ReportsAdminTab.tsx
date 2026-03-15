import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Flag, CheckCircle, XCircle, Trash2, ExternalLink,
  RefreshCw, Filter, ChevronLeft, ChevronRight,
  AlertTriangle, Clock, User, MessageSquare, Code, ShieldAlert
} from 'lucide-react';

interface Report {
  _id: string;
  reportedBy: { username: string; avatar?: string };
  type: 'problem' | 'discussion' | 'user';
  targetId: string;
  targetTitle: string;
  targetUrl: string;
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  adminNote: string;
  resolvedBy?: { username: string };
  resolvedAt?: string;
  createdAt: string;
}

interface Summary { pending: number; resolved: number; dismissed: number }

const REASON_LABELS: Record<string, string> = {
  wrong_test_case: 'Wrong Test Case',
  wrong_editorial: 'Wrong Editorial',
  unclear_problem: 'Unclear Problem',
  spam: 'Spam',
  abusive_content: 'Abusive Content',
  harassment: 'Harassment',
  misinformation: 'Misinformation',
  duplicate: 'Duplicate',
  other: 'Other',
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  problem: <Code className="h-3.5 w-3.5" />,
  discussion: <MessageSquare className="h-3.5 w-3.5" />,
  user: <User className="h-3.5 w-3.5" />,
};

const TYPE_COLOR: Record<string, string> = {
  problem: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  discussion: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  user: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  resolved: 'bg-green-500/15 text-green-400 border-green-500/30',
  dismissed: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

const ReportsAdminTab: React.FC = () => {
  const { token } = useAuth();
  const { isDark } = useTheme();

  const [reports, setReports] = useState<Report[]>([]);
  const [summary, setSummary] = useState<Summary>({ pending: 0, resolved: 0, dismissed: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);

  // Single modal for both resolve & dismiss
  const [noteModal, setNoteModal] = useState<{ reportId: string; action: 'resolved' | 'dismissed' } | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setSelected([]);
    try {
      const { data } = await axios.get(`${API_URL}/reports`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: statusFilter, type: typeFilter, page, limit: 15 }
      });
      setReports(data.reports);
      setSummary(data.summary);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, typeFilter, page]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Open note modal (for both resolve & dismiss) ──
  const openNoteModal = (reportId: string, action: 'resolved' | 'dismissed') => {
    setAdminNote('');
    setNoteModal({ reportId, action });
  };

  // ── Confirm action from modal ──
  const handleAction = async (reportId: string, status: 'resolved' | 'dismissed', note = '') => {
    setActionLoading(true);
    try {
      await axios.patch(
        `${API_URL}/reports/${reportId}`,
        { status, adminNote: note },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchReports();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
      setNoteModal(null);
      setAdminNote('');
    }
  };

  const handleBulkAction = async (status: 'resolved' | 'dismissed') => {
    if (!selected.length) return;
    setActionLoading(true);
    try {
      await axios.patch(
        `${API_URL}/reports/bulk/action`,
        { ids: selected, status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchReports();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    try {
      await axios.delete(`${API_URL}/reports/${confirmDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReports();
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmDelete(null);
    }
  };

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAll = () =>
    setSelected(selected.length === reports.length ? [] : reports.map(r => r._id));

  const base = isDark
    ? 'bg-[#1a1b2e] border-[#6366f1]/20 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  // Modal title/color config
  const modalConfig = noteModal?.action === 'resolved'
    ? { title: 'Resolve Report', btnClass: 'bg-green-600 hover:bg-green-700', btnLabel: 'Confirm Resolve', emoji: '✅' }
    : { title: 'Dismiss Report', btnClass: 'bg-gray-600 hover:bg-gray-700', btnLabel: 'Confirm Dismiss', emoji: '🚫' };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/10">
            <Flag className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Report Queue</h2>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Manage user-submitted reports
            </p>
          </div>
        </div>
        <button
          onClick={fetchReports}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
            isDark ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: 'pending', label: 'Pending', color: 'yellow', icon: <Clock className="h-4 w-4" /> },
          { key: 'resolved', label: 'Resolved', color: 'green', icon: <CheckCircle className="h-4 w-4" /> },
          { key: 'dismissed', label: 'Dismissed', color: 'gray', icon: <XCircle className="h-4 w-4" /> },
        ].map(({ key, label, color, icon }) => (
          <button
            key={key}
            onClick={() => { setStatusFilter(key); setPage(1); }}
            className={`p-4 rounded-xl border transition-all text-left ${
              statusFilter === key
                ? isDark
                  ? `border-${color}-500/50 bg-${color}-500/10`
                  : `border-${color}-300 bg-${color}-50`
                : isDark
                  ? 'border-white/10 bg-white/3 hover:bg-white/5'
                  : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className={`text-${color}-500 mb-1`}>{icon}</div>
            <div className="text-xl font-bold">{summary[key as keyof Summary]}</div>
            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</div>
          </button>
        ))}
      </div>

      {/* Filters + Bulk */}
      <div className={`flex flex-wrap items-center gap-3 p-3 rounded-xl border ${
        isDark ? 'border-white/10 bg-white/3' : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 opacity-50" />
          <span className="text-xs font-medium opacity-60">Filters</span>
        </div>

        <div className="flex gap-1">
          {['pending', 'resolved', 'dismissed', 'all'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white'
                  : isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className={`h-4 w-px ${isDark ? 'bg-white/20' : 'bg-gray-300'}`} />

        <div className="flex gap-1">
          {['all', 'problem', 'discussion', 'user'].map(t => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setPage(1); }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                typeFilter === t
                  ? 'bg-indigo-600 text-white'
                  : isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {selected.length > 0 && (
          <>
            <div className={`h-4 w-px ${isDark ? 'bg-white/20' : 'bg-gray-300'}`} />
            <span className="text-xs font-medium text-indigo-400">{selected.length} selected</span>
            <button
              onClick={() => handleBulkAction('resolved')}
              disabled={actionLoading}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              ✓ Bulk Resolve
            </button>
            <button
              onClick={() => handleBulkAction('dismissed')}
              disabled={actionLoading}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
            >
              ✕ Bulk Dismiss
            </button>
          </>
        )}

        <span className={`ml-auto text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {total} report{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Reports Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-16 rounded-xl border ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <div className="p-4 rounded-full bg-green-500/10 mb-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <p className="font-semibold">All clear!</p>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            No {statusFilter !== 'all' ? statusFilter : ''} reports found.
          </p>
        </div>
      ) : (
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b ${
            isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}>
            <input
              type="checkbox"
              checked={selected.length === reports.length && reports.length > 0}
              onChange={toggleAll}
              className="rounded"
            />
            <span>Report</span>
            <span>Type</span>
            <span>Reason</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          <div className="divide-y divide-white/5">
            {reports.map((report) => (
              <div
                key={report._id}
                className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 items-center px-4 py-3.5 transition-colors ${
                  selected.includes(report._id)
                    ? isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'
                    : isDark ? 'hover:bg-white/3' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(report._id)}
                  onChange={() => toggleSelect(report._id)}
                  className="rounded"
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm truncate max-w-[300px]">
                      {report.targetTitle || report.targetId}
                    </span>
                    {report.targetUrl && (
                      <a
                        href={report.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 flex-shrink-0"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span>By <span className="font-medium">{report.reportedBy?.username}</span></span>
                    <span>·</span>
                    <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                    {report.description && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[200px] italic opacity-70">"{report.description}"</span>
                      </>
                    )}
                  </div>
                  {report.adminNote && (
                    <div className={`mt-1 text-xs px-2 py-1 rounded ${
                      isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'
                    }`}>
                      📝 {report.adminNote}
                    </div>
                  )}
                </div>

                <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${TYPE_COLOR[report.type]}`}>
                  {TYPE_ICON[report.type]}
                  {report.type}
                </span>

                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                  isDark ? 'border-white/10 bg-white/5 text-gray-300' : 'border-gray-200 bg-gray-100 text-gray-600'
                }`}>
                  {REASON_LABELS[report.reason] || report.reason}
                </span>

                <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border capitalize ${STATUS_COLOR[report.status]}`}>
                  {report.status === 'pending' && <Clock className="h-3 w-3" />}
                  {report.status === 'resolved' && <CheckCircle className="h-3 w-3" />}
                  {report.status === 'dismissed' && <XCircle className="h-3 w-3" />}
                  {report.status}
                </span>

                {/* Action buttons — both open modal now */}
                <div className="flex items-center gap-1">
                  {report.status === 'pending' && (
                    <>
                      <button
                        title="Resolve"
                        onClick={() => openNoteModal(report._id, 'resolved')}
                        className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        title="Dismiss"
                        onClick={() => openNoteModal(report._id, 'dismissed')}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-500/10 transition-colors"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button
                    title="Delete"
                    onClick={() => setConfirmDelete(report._id)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className={`p-1.5 rounded-lg border transition-colors disabled:opacity-30 ${
              isDark ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className={`p-1.5 rounded-lg border transition-colors disabled:opacity-30 ${
              isDark ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Resolve / Dismiss Modal (unified) ── */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setNoteModal(null)} />
          <div className={`relative w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-4 ${base}`}>
            <h3 className="font-semibold flex items-center gap-2">
              <span>{modalConfig.emoji}</span>
              {modalConfig.title}
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Optionally add a note — it will be sent to the reporter as a message.
            </p>
            <textarea
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              placeholder="Write a note for the reporter (optional)..."
              rows={3}
              className={`w-full px-3 py-2 rounded-lg text-sm border resize-none outline-none ${
                isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-500' : 'bg-white border-gray-200'
              }`}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setNoteModal(null)}
                className={`flex-1 py-2 rounded-lg text-sm border ${
                  isDark ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(noteModal.reportId, noteModal.action, adminNote)}
                disabled={actionLoading}
                className={`flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${modalConfig.btnClass}`}
              >
                {actionLoading ? 'Saving...' : modalConfig.btnLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmDelete(null)}
          />
          <div className={`relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border ${
            isDark ? 'bg-[#0f1117] border-white/[0.08]' : 'bg-white border-gray-200'
          }`}>
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-orange-400 to-red-600" />
            <div className="p-6 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-red-500/10 border border-red-500/20">
                <ShieldAlert className="h-8 w-8 text-red-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Delete this report?
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  This action is permanent and cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 w-full pt-1">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    isDark
                      ? 'border-white/[0.08] text-gray-300 hover:bg-white/[0.06]'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirmed}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsAdminTab;
