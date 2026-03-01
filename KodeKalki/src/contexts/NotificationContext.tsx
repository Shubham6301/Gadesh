import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import axios from 'axios';
import { API_URL, SOCKET_URL } from '../config/api';
import { useAuth } from './AuthContext';
import { io, Socket } from 'socket.io-client';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  audience: 'user' | 'admin' | 'all';
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: (page?: number) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  hasMore: boolean;
  page: number;
  loadMore: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
};

// ─── Provider ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(false);
  const [page, setPage]                   = useState(1);
  const [hasMore, setHasMore]             = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const authHeader = useCallback(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  // ── Fetch (supports pagination) ─────────────────────────────────────────
  const fetchNotifications = useCallback(
    async (p = 1) => {
      if (!user || !token) return;
      setLoading(true);
      try {
        const { data } = await axios.get(
          `${API_URL}/notifications?page=${p}&limit=${PAGE_SIZE}`,
          authHeader()
        );
        if (p === 1) {
          setNotifications(data.notifications);
        } else {
          setNotifications((prev) => [...prev, ...data.notifications]);
        }
        setUnreadCount(data.unreadCount);
        setHasMore(p * PAGE_SIZE < data.total);
        setPage(p);
      } catch (err) {
        console.error('fetchNotifications error:', err);
      } finally {
        setLoading(false);
      }
    },
    [user, token, authHeader]
  );

  const loadMore = useCallback(() => fetchNotifications(page + 1), [fetchNotifications, page]);

  // ── Mark single read ────────────────────────────────────────────────────
  const markRead = useCallback(
    async (id: string) => {
      if (!token) return;
      try {
        await axios.patch(`${API_URL}/notifications/${id}/read`, {}, authHeader());
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error('markRead error:', err);
      }
    },
    [token, authHeader]
  );

  // ── Mark all read ────────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    if (!token) return;
    try {
      await axios.patch(`${API_URL}/notifications/read-all`, {}, authHeader());
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('markAllRead error:', err);
    }
  }, [token, authHeader]);

  // ── Dismiss (mark read) ──────────────────────────────────────────────────
  const dismiss = useCallback(
    async (id: string) => {
      if (!token) return;
      try {
        await axios.delete(`${API_URL}/notifications/${id}`, authHeader());
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error('dismiss error:', err);
      }
    },
    [token, authHeader]
  );

  // ── Socket.IO real-time ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Join personal room
      socket.emit('notification:join', user.id || user._id);
      // If admin, also join admin room
      if (user.role === 'admin') socket.emit('notification:join-admin');
    });

    socket.on('notification:new', (notif: Notification) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((c) => c + 1);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, token]);

  // ── Initial load + polling fallback (every 60s) ─────────────────────────
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    fetchNotifications(1);

    const interval = setInterval(() => fetchNotifications(1), 60_000);
    return () => clearInterval(interval);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markRead,
        markAllRead,
        dismiss,
        hasMore,
        page,
        loadMore,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
