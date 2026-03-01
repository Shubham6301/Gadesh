import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ArrowLeft, BellOff, Loader2, ExternalLink } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications, Notification } from '../contexts/NotificationContext';

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
  announcement:              'from-blue-500 to-blue-600',
  problem_added:             'from-purple-500 to-purple-600',
  potd_solved:               'from-yellow-500 to-yellow-600',
  contest_added:             'from-green-500 to-green-600',
  contest_starting:          'from-orange-500 to-orange-600',
  contest_status_change:     'from-orange-400 to-orange-500',
  game_result:               'from-indigo-500 to-indigo-600',
  order_update:              'from-teal-500 to-teal-600',
  help_article_added:        'from-sky-500 to-sky-600',
  admin_new_order:           'from-pink-500 to-pink-600',
  admin_user_blocked:        'from-red-500 to-red-600',
  admin_new_user:            'from-emerald-500 to-emerald-600',
  admin_contest_registration:'from-violet-500 to-violet-600',
  admin_chatroom_created:    'from-cyan-500 to-cyan-600',
  admin_discussion_created:  'from-blue-400 to-blue-500',
  admin_document_added:      'from-slate-500 to-slate-600',
  admin_order_status_change: 'from-amber-500 to-amber-600',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const NotificationsPage: React.FC = () => {
  const { isDark } = useTheme();
  const navigate   = useNavigate();
  const { notifications, unreadCount, loading, markRead, markAllRead, dismiss, hasMore, loadMore } =
    useNotifications();

  const handleClick = (n: Notification) => {
    if (!n.isRead) markRead(n._id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <Bell className={`h-6 w-6 ${isDark ? 'text-white' : 'text-gray-900'}`} />
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'text-blue-400 hover:bg-blue-900/30 border border-blue-800' : 'text-blue-600 hover:bg-blue-50 border border-blue-200'}`}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          )}
        </div>

        {/* Content */}
        <div className={`rounded-2xl overflow-hidden border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
          {loading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className={`h-8 w-8 animate-spin ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Loading notifications…</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <BellOff className={`h-12 w-12 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`text-base font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                You're all caught up!
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                No notifications to show right now.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.map((n) => {
                const icon  = TYPE_ICONS[n.type]  ?? '🔔';
                const color = TYPE_COLORS[n.type] ?? 'from-gray-500 to-gray-600';
                return (
                  <div
                    key={n._id}
                    onClick={() => handleClick(n)}
                    className={`
                      relative flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors
                      ${n.isRead
                        ? isDark ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'
                        : isDark ? 'bg-blue-900/20 hover:bg-blue-900/30' : 'bg-blue-50/60 hover:bg-blue-100/60'
                      }
                    `}
                  >
                    {/* Unread indicator */}
                    {!n.isRead && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500" />
                    )}

                    {/* Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-lg shadow-sm`}>
                      {icon}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {n.title}
                        </p>
                        <span className={`text-xs flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {n.message}
                      </p>
                      {n.link && (
                        <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                          <ExternalLink className="h-3 w-3" />
                          View details
                        </div>
                      )}
                    </div>

                    {/* Dismiss */}
                    <button
                      onClick={(e) => { e.stopPropagation(); dismiss(n._id); }}
                      className={`flex-shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:opacity-100 ${isDark ? 'text-gray-600 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'}`}
                      title="Dismiss"
                    >
                      ×
                    </button>
                  </div>
                );
              })}

              {/* Load more */}
              {hasMore && (
                <div className="px-5 py-4 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className={`text-sm font-medium px-5 py-2 rounded-lg border transition-colors disabled:opacity-50 ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {loading ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
