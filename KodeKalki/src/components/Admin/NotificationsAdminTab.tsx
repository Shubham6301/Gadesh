import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_URL } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  Bell,
  Trash2,
  Send,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  BellOff,
  Megaphone,
  ShieldAlert,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  audience: "user" | "admin" | "all";
  recipient?: { username: string; email: string } | null;
  isRead: boolean;
  deletedByAdmin: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  announcement: "📢",
  problem_added: "📝",
  potd_solved: "🏆",
  contest_added: "🏆",
  contest_starting: "⏰",
  contest_status_change: "🔄",
  game_result: "🎮",
  order_update: "📦",
  help_article_added: "📖",
  admin_new_order: "🛒",
  admin_user_blocked: "🔒",
  admin_new_user: "👤",
  admin_contest_registration: "📋",
  admin_chatroom_created: "💬",
  admin_discussion_created: "💬",
  admin_document_added: "📄",
  admin_order_status_change: "🔄",
};

const AUDIENCE_BADGE: Record<string, string> = {
  all: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  user: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ─── Main Component ───────────────────────────────────────────────────────────
const NotificationsAdminTab: React.FC = () => {
  const { token } = useAuth();
  const { isDark } = useTheme();

  // List state
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filterAudience, setFilterAudience] = useState("");
  const [filterType, setFilterType] = useState("");

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearDays, setClearDays] = useState(30);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  // Broadcast state
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcast, setBroadcast] = useState({
    title: "",
    message: "",
    link: "",
    audience: "all",
    type: "announcement",
  });
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  const LIMIT = 20;
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  // ── Fetch notifications ─────────────────────────────────────────────────────
  const fetchNotifications = useCallback(
    async (p = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: String(LIMIT),
          ...(filterAudience && { audience: filterAudience }),
          ...(filterType && { type: filterType }),
        });
        const { data } = await axios.get(
          `${API_URL}/notifications/admin/all?${params}`,
          authHeader
        );
        setNotifications(data.notifications);
        setTotal(data.total);
        setPage(p);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load notifications");
      } finally {
        setLoading(false);
      }
    },
    [token, filterAudience, filterType]
  );

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  // ── Single delete ───────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await axios.delete(`${API_URL}/notifications/admin/${id}`, authHeader);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setTotal((t) => t - 1);
    } catch {
      alert("Failed to delete notification");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Clear old ───────────────────────────────────────────────────────────────
  const handleClearOld = async () => {
    setClearLoading(true);
    try {
      const { data } = await axios.delete(
        `${API_URL}/notifications/admin/clear-old?days=${clearDays}`,
        authHeader
      );
      setClearConfirm(false);
      alert(`✅ Deleted ${data.deleted} notifications older than ${clearDays} days.`);
      fetchNotifications(1);
    } catch {
      alert("Failed to clear old notifications");
    } finally {
      setClearLoading(false);
    }
  };

  // ── Send broadcast ──────────────────────────────────────────────────────────
  const handleBroadcast = async () => {
    if (!broadcast.title.trim() || !broadcast.message.trim()) {
      alert("Title and message are required");
      return;
    }
    setBroadcastLoading(true);
    try {
      await axios.post(
        `${API_URL}/notifications/admin/broadcast`,
        {
          type: broadcast.type,
          title: broadcast.title,
          message: broadcast.message,
          link: broadcast.link || undefined,
          audience: broadcast.audience,
        },
        authHeader
      );
      setBroadcastSuccess(true);
      setBroadcast({ title: "", message: "", link: "", audience: "all", type: "announcement" });
      setTimeout(() => {
        setBroadcastSuccess(false);
        setShowBroadcast(false);
        fetchNotifications(1);
      }, 1800);
    } catch {
      alert("Failed to send broadcast");
    } finally {
      setBroadcastLoading(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2
            className={`text-xl font-bold flex items-center gap-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            <Bell className="h-5 w-5 text-blue-500" />
            Notification Manager
          </h2>
          <p className={`text-sm mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {total} total notifications in the system
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Refresh */}
          <button
            onClick={() => fetchNotifications(1)}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
              isDark
                ? "border-gray-700 text-gray-300 hover:bg-gray-700"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          {/* Clear old */}
          <button
            onClick={() => setClearConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-red-500/10 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Clear Old
          </button>

          {/* Send broadcast */}
          <button
            onClick={() => setShowBroadcast((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Megaphone className="h-4 w-4" />
            Send Broadcast
            {showBroadcast ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* ── Broadcast Form ──────────────────────────────────────────────────── */}
      {showBroadcast && (
        <div
          className={`rounded-xl border p-5 ${
            isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          } shadow-sm`}
        >
          <h3
            className={`text-sm font-semibold mb-4 flex items-center gap-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            <Send className="h-4 w-4 text-blue-500" />
            Send Broadcast Notification
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {/* Audience */}
            <div>
              <label
                className={`text-xs font-medium mb-1 block ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Audience
              </label>
              <select
                value={broadcast.audience}
                onChange={(e) =>
                  setBroadcast((b) => ({ ...b, audience: e.target.value }))
                }
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-200 text-gray-900"
                }`}
              >
                <option value="all">All Users</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>
            {/* Type */}
            <div>
              <label
                className={`text-xs font-medium mb-1 block ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Type
              </label>
              <select
                value={broadcast.type}
                onChange={(e) =>
                  setBroadcast((b) => ({ ...b, type: e.target.value }))
                }
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-200 text-gray-900"
                }`}
              >
                <option value="announcement">📢 Announcement</option>
                <option value="problem_added">📝 Problem Added</option>
                <option value="contest_added">🏆 Contest Added</option>
                <option value="help_article_added">📖 Help Article</option>
              </select>
            </div>
          </div>
          {/* Title */}
          <input
            type="text"
            placeholder="Notification title *"
            value={broadcast.title}
            onChange={(e) => setBroadcast((b) => ({ ...b, title: e.target.value }))}
            className={`w-full px-3 py-2 text-sm rounded-lg border mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
            }`}
          />
          {/* Message */}
          <textarea
            placeholder="Notification message *"
            value={broadcast.message}
            onChange={(e) =>
              setBroadcast((b) => ({ ...b, message: e.target.value }))
            }
            rows={3}
            className={`w-full px-3 py-2 text-sm rounded-lg border mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              isDark
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
            }`}
          />
          {/* Link */}
          <input
            type="text"
            placeholder="Link (optional) — e.g. /contest"
            value={broadcast.link}
            onChange={(e) => setBroadcast((b) => ({ ...b, link: e.target.value }))}
            className={`w-full px-3 py-2 text-sm rounded-lg border mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
            }`}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleBroadcast}
              disabled={broadcastLoading || broadcastSuccess}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors font-medium"
            >
              {broadcastLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : broadcastSuccess ? (
                <CheckCheck className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {broadcastSuccess ? "Sent!" : "Send Now"}
            </button>
            <button
              onClick={() => setShowBroadcast(false)}
              className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                isDark
                  ? "border-gray-700 text-gray-300 hover:bg-gray-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Clear Old Dialog ────────────────────────────────────────────────── */}
      {clearConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            className={`rounded-xl border p-6 max-w-sm w-full shadow-2xl ${
              isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3
                  className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Clear Old Notifications
                </h3>
                <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className={`text-sm mb-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              Permanently delete all notifications older than:
            </p>
            <div className="flex items-center gap-2 mb-5">
              <input
                type="number"
                min={1}
                max={365}
                value={clearDays}
                onChange={(e) => setClearDays(Number(e.target.value))}
                className={`w-20 px-3 py-2 text-sm rounded-lg border text-center focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-200 text-gray-900"
                }`}
              />
              <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                days
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClearOld}
                disabled={clearLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors font-medium"
              >
                {clearLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </button>
              <button
                onClick={() => setClearConfirm(false)}
                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                  isDark
                    ? "border-gray-700 text-gray-300 hover:bg-gray-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div
        className={`flex flex-wrap gap-3 p-4 rounded-xl border ${
          isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <select
          value={filterAudience}
          onChange={(e) => setFilterAudience(e.target.value)}
          className={`px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isDark
              ? "bg-gray-700 border-gray-600 text-white"
              : "bg-white border-gray-200 text-gray-900"
          }`}
        >
          <option value="">All Audiences</option>
          <option value="all">Broadcast (All)</option>
          <option value="admin">Admin Only</option>
          <option value="user">User Only</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={`px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isDark
              ? "bg-gray-700 border-gray-600 text-white"
              : "bg-white border-gray-200 text-gray-900"
          }`}
        >
          <option value="">All Types</option>
          <option value="announcement">📢 Announcement</option>
          <option value="problem_added">📝 Problem Added</option>
          <option value="potd_solved">🏆 POTD Solved</option>
          <option value="contest_added">🏆 Contest Added</option>
          <option value="contest_starting">⏰ Contest Starting</option>
          <option value="contest_status_change">🔄 Contest Status</option>
          <option value="game_result">🎮 Game Result</option>
          <option value="order_update">📦 Order Update</option>
          <option value="help_article_added">📖 Help Article</option>
          <option value="admin_new_order">🛒 New Order</option>
          <option value="admin_user_blocked">🔒 User Blocked</option>
          <option value="admin_new_user">👤 New User</option>
          <option value="admin_contest_registration">📋 Contest Registration</option>
          <option value="admin_discussion_created">💬 New Discussion</option>
          <option value="admin_document_added">📄 Document Added</option>
          <option value="admin_order_status_change">🔄 Order Status</option>
        </select>

        {(filterAudience || filterType) && (
          <button
            onClick={() => {
              setFilterAudience("");
              setFilterType("");
            }}
            className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
              isDark
                ? "border-gray-700 text-gray-400 hover:bg-gray-700"
                : "border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* ── Notification List ───────────────────────────────────────────────── */}
      <div
        className={`rounded-xl border overflow-hidden ${
          isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        {error ? (
          <div className="flex items-center gap-3 p-6 text-red-500">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        ) : loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <BellOff className="h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              No notifications found
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div
              className={`hidden sm:grid grid-cols-[2fr_3fr_1fr_1fr_80px] gap-3 px-5 py-3 border-b text-xs font-semibold uppercase tracking-wide ${
                isDark
                  ? "border-gray-700 text-gray-500"
                  : "border-gray-100 text-gray-400"
              }`}
            >
              <span>Notification</span>
              <span>Message</span>
              <span>Audience</span>
              <span>Time</span>
              <span className="text-right">Action</span>
            </div>

            {/* Rows */}
            <div className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-100"}`}>
              {notifications.map((n) => (
                <div
                  key={n._id}
                  className={`flex flex-col sm:grid sm:grid-cols-[2fr_3fr_1fr_1fr_80px] gap-3 items-start sm:items-center px-5 py-4 transition-colors ${
                    isDark ? "hover:bg-gray-700/40" : "hover:bg-gray-50"
                  } ${n.deletedByAdmin ? "opacity-40" : ""}`}
                >
                  {/* Title + type */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg flex-shrink-0">
                      {TYPE_ICONS[n.type] ?? "🔔"}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {n.title}
                      </p>
                      <p
                        className={`text-xs truncate ${
                          isDark ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        {n.type}
                        {n.recipient && (
                          <span className="ml-1 font-medium text-blue-500">
                            → {n.recipient.username}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Message */}
                  <p
                    className={`text-sm line-clamp-2 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {n.message}
                  </p>

                  {/* Audience badge */}
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium w-fit ${
                      AUDIENCE_BADGE[n.audience]
                    }`}
                  >
                    {n.audience}
                  </span>

                  {/* Time */}
                  <span
                    className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}
                  >
                    {timeAgo(n.createdAt)}
                  </span>

                  {/* Delete button */}
                  <div className="sm:text-right">
                    {n.deletedByAdmin ? (
                      <span className="text-xs text-gray-400 italic">Hidden</span>
                    ) : (
                      <button
                        onClick={() => handleDelete(n._id)}
                        disabled={deletingId === n._id}
                        title="Hide from all users"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-500 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 font-medium"
                      >
                        {deletingId === n._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                className={`flex items-center justify-between px-5 py-3 border-t text-sm ${
                  isDark
                    ? "border-gray-700 text-gray-400"
                    : "border-gray-100 text-gray-500"
                }`}
              >
                <span>
                  Page {page} of {totalPages} — {total} total
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchNotifications(page - 1)}
                    disabled={page <= 1}
                    className={`px-3 py-1.5 rounded-lg border text-xs disabled:opacity-40 transition-colors ${
                      isDark
                        ? "border-gray-700 hover:bg-gray-700"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => fetchNotifications(page + 1)}
                    disabled={page >= totalPages}
                    className={`px-3 py-1.5 rounded-lg border text-xs disabled:opacity-40 transition-colors ${
                      isDark
                        ? "border-gray-700 hover:bg-gray-700"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationsAdminTab;
