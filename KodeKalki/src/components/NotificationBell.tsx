import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, X, Loader2, BellOff, ExternalLink } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications, Notification } from '../contexts/NotificationContext';

// ─── Icon map by notification type ───────────────────────────────────────────
const TYPE_ICONS: Record<string, string> = {
  announcement:              '📢',
  problem_added:             '📝',
  potd_solved:               '🏆',
  contest_added:             '🏆',
  contest_starting:          '⏰',
  contest_status_change:     '🔄',
  game_result:               '🎮',
  order_update:              '📦',
  help_article_added:        '📖',
  admin_new_order:           '🛒',
  admin_user_blocked:        '🔒',
  admin_new_user:            '👤',
  admin_contest_registration:'📋',
  admin_chatroom_created:    '💬',
  admin_discussion_created:  '💬',
  admin_document_added:      '📄',
  admin_order_status_change: '🔄',
};

const TYPE_COLORS: Record<string, string> = {
  announcement:              'bg-blue-500',
  problem_added:             'bg-purple-500',
  potd_solved:               'bg-yellow-500',
  contest_added:             'bg-green-500',
  contest_starting:          'bg-orange-500',
  contest_status_change:     'bg-orange-400',
  game_result:               'bg-indigo-500',
  order_update:              'bg-teal-500',
  help_article_added:        'bg-sky-500',
  admin_new_order:           'bg-pink-500',
  admin_user_blocked:        'bg-red-500',
  admin_new_user:            'bg-emerald-500',
  admin_contest_registration:'bg-violet-500',
  admin_chatroom_created:    'bg-cyan-500',
  admin_discussion_created:  'bg-blue-400',
  admin_document_added:      'bg-slate-500',
  admin_order_status_change: 'bg-amber-500',
};

// ─── Time formatter ───────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Single notification row ──────────────────────────────────────────────────
const NotifItem: React.FC<{
  notif: Notification;
  isDark: boolean;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onNavigate: (link: string | null | undefined, id: string) => void;
}> = ({ notif, isDark, onRead, onDismiss, onNavigate }) => {
  const icon  = TYPE_ICONS[notif.type]  ?? '🔔';
  const color = TYPE_COLORS[notif.type] ?? 'bg-gray-500';

  return (
    <div
      onClick={() => onNavigate(notif.link, notif._id)}
      className={`
        group relative flex items-start gap-3 px-4 py-3 cursor-pointer
        transition-colors duration-150
        ${notif.isRead
          ? isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
          : isDark ? 'bg-blue-900/20 hover:bg-blue-900/30' : 'bg-blue-50/70 hover:bg-blue-100/70'
        }
      `}
    >
      {/* Unread dot */}
      {!notif.isRead && (
        <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
      )}

      {/* Icon pill */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${color} flex items-center justify-center text-sm`}>
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {notif.title}
        </p>
        <p className={`text-xs mt-0.5 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {notif.message}
        </p>
        <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          {timeAgo(notif.createdAt)}
        </p>
      </div>

      {/* Dismiss button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(notif._id); }}
        className={`
          flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded
          ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}
        `}
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// ─── Main Bell component ──────────────────────────────────────────────────────
const NotificationBell: React.FC = () => {
  const { isDark } = useTheme();
  const navigate   = useNavigate();
  const { notifications, unreadCount, loading, markRead, markAllRead, dismiss, hasMore, loadMore } =
    useNotifications();

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef   = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current   && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNavigate = (link: string | null | undefined, id: string) => {
    if (!notifications.find((n) => n._id === id)?.isRead) markRead(id);
    if (link) { setOpen(false); navigate(link); }
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className={`
          relative p-2 rounded-lg transition-colors duration-200
          ${isDark
            ? 'text-gray-400 hover:text-white hover:bg-gray-700'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }
        `}
        aria-label="Notifications"
      >
        <Bell className={`h-5 w-5 ${open ? (isDark ? 'text-white' : 'text-gray-900') : ''}`} />
        {unreadCount > 0 && (
          <span className="
            absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px]
            bg-red-500 text-white text-[10px] font-bold rounded-full
            flex items-center justify-center px-1 animate-pulse
          ">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className={`
            absolute right-0 mt-2 w-80 sm:w-96 rounded-xl shadow-2xl border overflow-hidden z-50
            ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          `}
          style={{ maxHeight: '520px', display: 'flex', flexDirection: 'column' }}
        >
          {/* Header */}
          <div className={`
            flex items-center justify-between px-4 py-3 border-b flex-shrink-0
            ${isDark ? 'border-gray-700' : 'border-gray-100'}
          `}>
            <div className="flex items-center gap-2">
              <Bell className={`h-4 w-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
              <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className={`
                  flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors
                  ${isDark
                    ? 'text-blue-400 hover:bg-blue-900/30'
                    : 'text-blue-600 hover:bg-blue-50'
                  }
                `}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className={`h-6 w-6 animate-spin ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <BellOff className={`h-10 w-10 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  No notifications yet
                </p>
              </div>
            ) : (
              <>
                {notifications.map((n) => (
                  <NotifItem
                    key={n._id}
                    notif={n}
                    isDark={isDark}
                    onRead={markRead}
                    onDismiss={dismiss}
                    onNavigate={handleNavigate}
                  />
                ))}
                {hasMore && (
                  <div className="px-4 py-3 text-center">
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className={`
                        text-xs font-medium px-4 py-2 rounded-lg transition-colors
                        ${isDark
                          ? 'text-blue-400 hover:bg-blue-900/20 disabled:opacity-50'
                          : 'text-blue-600 hover:bg-blue-50 disabled:opacity-50'
                        }
                      `}
                    >
                      {loading ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className={`
            flex items-center justify-center px-4 py-2.5 border-t flex-shrink-0
            ${isDark ? 'border-gray-700' : 'border-gray-100'}
          `}>
            <button
              onClick={() => { setOpen(false); navigate('/notifications'); }}
              className={`
                flex items-center gap-1.5 text-xs font-medium transition-colors
                ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}
              `}
            >
              <ExternalLink className="h-3 w-3" />
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
