import { useEffect, useState, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext";

const NetworkStatusToast = () => {
  const { isDark } = useTheme();
  const [status, setStatus] = useState<"online" | "offline" | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const showToast = (newStatus: "online" | "offline") => {
    // Clear any existing hide timer
    if (timerRef.current) clearTimeout(timerRef.current);

    setStatus(newStatus);
    setVisible(true);

    // Auto-hide after 4s (offline stays longer — 6s)
    timerRef.current = setTimeout(
      () => setVisible(false),
      newStatus === "offline" ? 6000 : 4000
    );
  };

  useEffect(() => {
    const handleOffline = () => showToast("offline");
    const handleOnline = () => showToast("online");

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Skip showing toast on initial mount
    isFirstRender.current = false;

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible || status === null) return null;

  const isOffline = status === "offline";

  return (
    <div
      style={{
        position: "fixed",
        top: "4.5rem",
        right: "1rem",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        gap: "0.65rem",
        padding: "0.75rem 1.1rem",
        borderRadius: "12px",
        minWidth: "220px",
        maxWidth: "320px",
        boxShadow: isOffline
          ? "0 8px 32px rgba(239,68,68,0.35), 0 2px 8px rgba(0,0,0,0.3)"
          : "0 8px 32px rgba(34,197,94,0.35), 0 2px 8px rgba(0,0,0,0.3)",
        background: isDark
          ? isOffline
            ? "rgba(30, 10, 10, 0.97)"
            : "rgba(10, 28, 15, 0.97)"
          : isOffline
            ? "rgba(255, 245, 245, 0.98)"
            : "rgba(245, 255, 248, 0.98)",
        border: `1.5px solid ${isOffline ? "rgba(239,68,68,0.5)" : "rgba(34,197,94,0.5)"}`,
        backdropFilter: "blur(12px)",
        animation: "netToastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
        transition: "all 0.3s ease",
      }}
    >
      {/* Animated dot */}
      <div
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          flexShrink: 0,
          background: isOffline ? "#ef4444" : "#22c55e",
          boxShadow: isOffline
            ? "0 0 0 0 rgba(239,68,68,0.6)"
            : "0 0 0 0 rgba(34,197,94,0.6)",
          animation: isOffline ? "pulseRed 1.2s ease infinite" : "pulseGreen 1.2s ease infinite",
        }}
      />

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: "0.88rem",
            color: isOffline
              ? isDark ? "#fca5a5" : "#dc2626"
              : isDark ? "#86efac" : "#16a34a",
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1.3,
          }}
        >
          {isOffline ? "No Internet Connection" : "Back Online"}
        </div>
        <div
          style={{
            fontSize: "0.76rem",
            color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)",
            marginTop: "0.15rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {isOffline
            ? "Check your network and try again"
            : "Your connection has been restored"}
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={() => setVisible(false)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0.2rem",
          color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)",
          fontSize: "1rem",
          lineHeight: 1,
          flexShrink: 0,
          borderRadius: "4px",
          transition: "color 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)")}
        onMouseLeave={e => (e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)")}
        aria-label="Dismiss"
      >
        ✕
      </button>

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: "3px",
          borderRadius: "0 0 12px 12px",
          background: isOffline
            ? "linear-gradient(90deg, #ef4444, #f87171)"
            : "linear-gradient(90deg, #22c55e, #4ade80)",
          animation: `netProgress ${isOffline ? "6s" : "4s"} linear forwards`,
          width: "100%",
          transformOrigin: "left",
        }}
      />

      <style>{`
        @keyframes netToastIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulseRed {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
          70%  { box-shadow: 0 0 0 7px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
        @keyframes pulseGreen {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.7); }
          70%  { box-shadow: 0 0 0 7px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        @keyframes netProgress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
};

export default NetworkStatusToast;
