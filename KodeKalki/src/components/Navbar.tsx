import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import HelpWidget from "./HelpWidgetComponent";
import NotificationBell from "./NotificationBell";
import {
  Code,
  Menu,
  X,
  User,
  LogOut,
  Shield,
  Moon,
  Sun,
  Coins,
  Flame,
  ChevronDown,
  Swords,
  Clock,
} from "lucide-react";

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/problems",  label: "Problems",  requiresAuth: true  },
    { path: "/top",       label: "Discuss",   requiresAuth: true  },
    { path: "/contest",   label: "Contest",   requiresAuth: false },
    { path: "/game",      label: "Game",      requiresAuth: true  },
    { path: "/interview", label: "Interview", requiresAuth: true  },
    { path: "/chats",     label: "Chat",      requiresAuth: true  },
    { path: "/search",    label: "Search",    requiresAuth: true  },
    { path: "/solutions", label: "Solutions", requiresAuth: false },
  ];

  const handleNavigation = (path: string, requiresAuth: boolean) => {
    if (requiresAuth && !user) {
      navigate("/login");
      setIsMobileMenuOpen(false);
      return;
    }
    if (location.pathname.includes("/game") && !path.includes("/game")) {
      window.dispatchEvent(new CustomEvent("gameNavigation", { detail: { leavingGame: true } }));
    }
    setIsMobileMenuOpen(false);
  };

  const handleArenaClick = (e: React.MouseEvent) => {
    if (!user) { e.preventDefault(); navigate("/login"); }
    setIsMobileMenuOpen(false);
  };

  const navLink = `text-sm font-medium transition-colors duration-150 whitespace-nowrap px-3 py-1.5 rounded-md`;
  const activeClass   = isDark ? "text-orange-400" : "text-orange-500";
  const inactiveClass = isDark ? "text-gray-300 hover:text-white" : "text-gray-700 hover:text-gray-900";

  const dropItem = `flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
    isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-50"
  }`;

  const mobileItem = `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    isDark ? "text-gray-300 hover:text-white hover:bg-gray-800" : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
  }`;

  return (
    <nav className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
      isDark ? "bg-gray-800 border-gray-800" : "bg-white border-gray-200"
    }`}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-14 gap-4">

          {/* ── Logo ──────────────────────────────────────────────────── */}
          <Link
            to="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-600 to-orange-700">
              <Code className="h-4 w-4 text-white" />
            </div>
            <span className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
              KodeKalki
            </span>
          </Link>

          {/* ── Desktop Nav Links ──────────────────────────────────────── */}
          <div className="hidden lg:flex items-center flex-1 min-w-0">
            {navItems.map((item) => {
              if (item.requiresAuth && !user) {
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate("/login")}
                    className={`${navLink} ${inactiveClass}`}
                  >
                    {item.label}
                  </button>
                );
              }
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => handleNavigation(item.path, item.requiresAuth)}
                  className={`${navLink} ${isActive(item.path) ? activeClass : inactiveClass}`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Arena */}
            <a
              href="https://arena-algorithem.vercel.app/"
              onClick={handleArenaClick}
              target="_blank"
              rel="noopener noreferrer"
              className={`${navLink} flex items-center gap-1 ${
                isDark ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-700"
              }`}
            >
              <Swords className="h-3.5 w-3.5" />
              Arena
            </a>
          </div>

          {/* ── Desktop Right ──────────────────────────────────────────── */}
          <div className="hidden lg:flex items-center gap-3 ml-auto flex-shrink-0">

            {/* Streak */}
            {user && (
              <Link
                to="/problems"
                title={`Streak: ${user.stats?.currentStreak || 0} days`}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                  isDark
                    ? "bg-orange-900/20 border-orange-800 text-orange-400 hover:bg-orange-900/30"
                    : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                }`}
              >
                <Flame className="h-3.5 w-3.5 animate-pulse" />
                {user.stats?.currentStreak || 0}
              </Link>
            )}

            {/* Coins */}
            {user && (
              <Link
                to="/redeem"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                  isDark
                    ? "bg-yellow-900/20 border-yellow-800 text-yellow-400 hover:bg-yellow-900/30"
                    : "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                }`}
              >
                <Coins className="h-3.5 w-3.5" />
                {user.coins || 0}
              </Link>
            )}

            {user && <NotificationBell />}
            {user && <HelpWidget />}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                isDark
                  ? "text-gray-400 hover:text-white hover:bg-gray-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Auth */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    isDark
                      ? "border-gray-700 hover:bg-gray-700 text-gray-300"
                      : "border-gray-200 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {user.profile?.avatar && !user.profile.avatar.startsWith("default:") ? (
                    <img src={user.profile.avatar} alt={user.username} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <span className="max-w-[96px] truncate">{user.username}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                </button>

                {isProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
                    <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border py-1 z-20 ${
                      isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                    }`}>
                      {user.role === "admin" && (
                        <Link to="/admin" className={dropItem} onClick={() => setIsProfileOpen(false)}>
                          <Shield className="h-4 w-4 opacity-70" /> Admin Dashboard
                        </Link>
                      )}
                      <Link to={`/profile/${user.username}`} className={dropItem} onClick={() => setIsProfileOpen(false)}>
                        <User className="h-4 w-4 opacity-70" /> Profile
                      </Link>
                      <Link to="/time-analytics" className={dropItem} onClick={() => setIsProfileOpen(false)}>
                        <Clock className="h-4 w-4 opacity-70" /> Time Analytics
                      </Link>
                      <hr className={`my-1 ${isDark ? "border-gray-700" : "border-gray-200"}`} />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="h-4 w-4" /> Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    isDark ? "text-gray-300 hover:text-white" : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Start Learning →
                </Link>
              </div>
            )}
          </div>

          {/* ── Mobile Hamburger ───────────────────────────────────────── */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`lg:hidden p-2 rounded-lg ml-auto transition-colors duration-200 ${
              isDark
                ? "text-gray-400 hover:text-white hover:bg-gray-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ──────────────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className={`fixed top-0 left-0 w-80 h-full z-50 flex flex-col overflow-y-auto shadow-2xl lg:hidden ${
            isDark ? "bg-gray-900 border-r border-gray-800" : "bg-white border-r border-gray-200"
          }`}>

            {/* Drawer Header */}
            <div className={`flex items-center justify-between p-5 border-b flex-shrink-0 ${
              isDark ? "border-gray-800" : "border-gray-200"
            }`}>
              <Link to="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-600 to-orange-700">
                  <Code className="h-4 w-4 text-white" />
                </div>
                <span className={`text-base font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  KodeKalki
                </span>
              </Link>
              <div className="flex items-center gap-2">
                {user && <NotificationBell />}
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`p-2 rounded-lg transition-colors duration-200 ${
                    isDark ? "text-gray-400 hover:text-white hover:bg-gray-800" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Drawer Nav Items */}
            <div className="px-4 py-3 space-y-1 flex-1">
              {navItems.map((item) => {
                const act = isActive(item.path);
                if (item.requiresAuth && !user) {
                  return (
                    <button
                      key={item.path}
                      onClick={() => { navigate("/login"); setIsMobileMenuOpen(false); }}
                      className={`block w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        isDark ? "text-gray-300 hover:text-white hover:bg-gray-800" : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => handleNavigation(item.path, item.requiresAuth)}
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      act
                        ? isDark ? "text-blue-400 bg-blue-900/20" : "text-blue-600 bg-blue-50"
                        : isDark ? "text-gray-300 hover:text-white hover:bg-gray-800" : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <a
                href="https://arena-algorithem.vercel.app/"
                onClick={handleArenaClick}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isDark ? "text-purple-400 hover:text-white hover:bg-gray-800" : "text-purple-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Swords className="h-4 w-4" /> Arena
              </a>
            </div>

            {/* Drawer Bottom — User Section */}
            {user ? (
              <div className={`px-4 py-4 border-t space-y-1 flex-shrink-0 ${isDark ? "border-gray-800" : "border-gray-200"}`}>
                {/* Streak + Coins row */}
                <div className="flex items-center justify-between px-1 py-2">
                  <Link
                    to="/redeem"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isDark ? "text-yellow-400 hover:bg-gray-800" : "text-yellow-700 hover:bg-gray-50"
                    }`}
                  >
                    <Coins className="h-4 w-4" />
                    Coins ({user.coins || 0})
                  </Link>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium ${
                    isDark ? "bg-orange-900/20 border-orange-800 text-orange-400" : "bg-orange-50 border-orange-200 text-orange-700"
                  }`}>
                    <Flame className="h-4 w-4 animate-pulse" />
                    {user.stats?.currentStreak || 0}
                  </div>
                </div>

                {user.role === "admin" && (
                  <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className={mobileItem}>
                    <Shield className="h-4 w-4" /> Admin
                  </Link>
                )}
                <Link to={`/profile/${user.username}`} onClick={() => setIsMobileMenuOpen(false)} className={mobileItem}>
                  <User className="h-4 w-4" /> Profile
                </Link>
                <Link to="/time-analytics" onClick={() => setIsMobileMenuOpen(false)} className={mobileItem}>
                  <Clock className="h-4 w-4" /> Time Analytics
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            ) : (
              <div className={`px-4 py-4 border-t space-y-2 flex-shrink-0 ${isDark ? "border-gray-800" : "border-gray-200"}`}>
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block w-full px-4 py-3 text-center text-sm font-medium border rounded-lg transition-colors duration-200 ${
                    isDark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full px-4 py-3 text-center text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Start Learning →
                </Link>
              </div>
            )}

            {/* Theme Toggle */}
            <div className={`px-4 py-3 border-t flex-shrink-0 ${isDark ? "border-gray-800" : "border-gray-200"}`}>
              <button
                onClick={toggleTheme}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isDark ? "text-gray-300 hover:text-white hover:bg-gray-800" : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {isDark ? <><Sun className="h-4 w-4" /> Light Mode</> : <><Moon className="h-4 w-4" /> Dark Mode</>}
              </button>
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

export default Navbar;
