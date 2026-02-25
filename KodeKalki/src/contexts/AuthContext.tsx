import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { showError, showSuccess } from '../utils/toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface User {
  id: string;
  _id?: string;
  username: string;
  email: string;
  role: string;             // 'user' | 'admin'
  coins?: number;
  totalCoinsEarned?: number;
  profile?: {
    avatar?: string;
    firstName?: string;
    lastName?: string;
  };
  ratings?: { gameRating: number };
  stats?: {
    problemsSolved?: { total: number; easy: number; medium: number; hard: number };
    totalSubmissions?: number;
    accuracy?: number;
    currentStreak?: number;
    maxStreak?: number;
  };
}

/**
 * panelType passed to login():
 *  'user'  → only role='user' may proceed  → redirects to /dashboard
 *  'admin' → only role='admin' may proceed → redirects to /admin
 */
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string, panelType?: 'user' | 'admin') => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateCoins: (newCoins: number) => void;
  setUser: (user: User | null) => void;
  loading: boolean;
  setRedirectUrl: (url: string) => void;
  getAndClearRedirectUrl: () => string | null;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// ─── Helper ───────────────────────────────────────────────────────────────────
const normalizeUser = (u: any): User => ({
  ...u,
  id:  u.id  || u._id,
  _id: u._id || u.id,
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]                     = useState<User | null>(null);
  const [token, setToken]                   = useState<string | null>(null);
  const [loading, setLoading]               = useState(true);
  const [redirectUrl, setRedirectUrlState]  = useState<string | null>(null);

  // ── Auto-login on mount ────────────────────────────────────────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken?.trim()) {
      setToken(savedToken);
      axios.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${savedToken}` } })
        .then((res) => setUser(normalizeUser(res.data)))
        .catch(() => {
          showError('Session expired — please log in again');
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // ── Fetch full profile ─────────────────────────────────────────────────────
  const fetchProfile = async (bearerToken: string): Promise<User> => {
    const res = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    return normalizeUser(res.data);
  };

  const refreshUser = async () => {
    const t = localStorage.getItem('token');
    if (!t) return;
    try { setUser(await fetchProfile(t)); }
    catch { showError('Failed to refresh user data'); }
  };

  // ── LOGIN — with role-based panel enforcement ──────────────────────────────
  const login = async (
    username: string,
    password: string,
    panelType: 'user' | 'admin' = 'user'
  ) => {
    // Pass expected role to backend so it can also validate
    const response = await axios.post(`${API_URL}/auth/login`, {
      username,
      password,
      role: panelType,
    });

    const { token: receivedToken, user: basicUser } = response.data;

    if (!receivedToken?.trim()) throw new Error('Invalid token received from server');

    // Fetch authoritative profile
    let completeUser: User;
    try { completeUser = await fetchProfile(receivedToken); }
    catch { completeUser = normalizeUser(basicUser); }

    // ── Panel guard (frontend double-check) ──────────────────────────────────
    if (panelType === 'admin' && completeUser.role !== 'admin') {
      throw new Error('Your current account does not have access to the Admin Panel');
    }
    if (panelType === 'user' && completeUser.role === 'admin') {
      throw new Error('Please ensure you are signing in through the correct login page');
    }

    // ── Persist ───────────────────────────────────────────────────────────────
    localStorage.setItem('token', receivedToken);
    setToken(receivedToken);
    setUser(completeUser);
    showSuccess(`Welcome back, ${completeUser.username}!`);

    // ── Redirect to correct panel ─────────────────────────────────────────────
    const saved = redirectUrl;
    setRedirectUrlState(null);

    if (saved) {
      window.location.href = saved;
    } else if (completeUser.role === 'admin') {
      window.location.href = '/admin';       // 👈 Change to your admin route
    } else {
      window.location.href = '/';            // 👈 Change to your user home route
    }
  };

  // ── REGISTER ──────────────────────────────────────────────────────────────
  const register = async (username: string, email: string, password: string) => {
    const response = await axios.post(`${API_URL}/auth/register`, {
      username,
      email,
      password,
      role: 'user',  // Registration always creates a regular user
    });
    const { token: receivedToken, user: newUser } = response.data;
    if (!receivedToken?.trim()) throw new Error('Invalid token received from server');
    localStorage.setItem('token', receivedToken);
    setToken(receivedToken);
    setUser(normalizeUser(newUser));
  };

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setToken(null);
  };

  const updateCoins = (newCoins: number) => {
    if (user) setUser({ ...user, coins: newCoins });
  };

  const setRedirectUrl            = (url: string) => setRedirectUrlState(url);
  const getAndClearRedirectUrl    = (): string | null => {
    const url = redirectUrl;
    setRedirectUrlState(null);
    return url;
  };

  return (
    <AuthContext.Provider value={{
      user, token,
      isAuthenticated: !!token,
      login, register, logout, refreshUser,
      updateCoins, setUser, loading,
      setRedirectUrl, getAndClearRedirectUrl,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
