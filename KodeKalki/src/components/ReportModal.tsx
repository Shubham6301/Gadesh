import React, { useState, useEffect, useRef, FC, ReactNode } from 'react';
import {
  X, Flag, AlertTriangle, CheckCircle, ArrowRight, Shield,
  Bug, BookOpen, HelpCircle, Copy, Bookmark,
  Ban, Angry, Frown, AlertOctagon, MessageSquareX,
  UserX, Repeat2,
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'problem' | 'discussion' | 'user';
  targetId: string;
  targetTitle: string;
  targetUrl?: string;
}

interface ReasonItem {
  value: string;
  label: string;
  icon: ReactNode;
  desc: string;
}

interface ReasonConfig {
  label: string;
  subtitle: string;
  reasons: ReasonItem[];
}

/* ─────────────────────────────────────────
   Icon wrapper — consistent sizing
───────────────────────────────────────── */
const I: FC<{ children: ReactNode }> = ({ children }) => (
  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {children}
  </span>
);

const SZ = 15; // icon size in reason rows
const SW = 1.8; // stroke width

const REASONS: Record<string, ReasonConfig> = {
  problem: {
    label: 'Report Problem',
    subtitle: 'Help us improve content quality',
    reasons: [
      { value: 'wrong_test_case', label: 'Wrong Test Case',   icon: <I><Bug        size={SZ} strokeWidth={SW} /></I>, desc: 'Test cases produce incorrect results'  },
      { value: 'wrong_editorial', label: 'Wrong Editorial',   icon: <I><BookOpen   size={SZ} strokeWidth={SW} /></I>, desc: 'Solution or explanation is incorrect'  },
      { value: 'unclear_problem', label: 'Unclear Statement', icon: <I><HelpCircle size={SZ} strokeWidth={SW} /></I>, desc: 'Problem is confusing or ambiguous'      },
      { value: 'duplicate',       label: 'Duplicate Problem', icon: <I><Copy       size={SZ} strokeWidth={SW} /></I>, desc: 'This problem already exists'            },
      { value: 'other',           label: 'Other Issue',       icon: <I><Bookmark   size={SZ} strokeWidth={SW} /></I>, desc: 'Something else is wrong'                },
    ],
  },
  discussion: {
    label: 'Report Discussion',
    subtitle: 'Keep our community safe & respectful',
    reasons: [
      { value: 'spam',            label: 'Spam',             icon: <I><Ban            size={SZ} strokeWidth={SW} /></I>, desc: 'Irrelevant or promotional content'   },
      { value: 'abusive_content', label: 'Abusive Content',  icon: <I><Angry          size={SZ} strokeWidth={SW} /></I>, desc: 'Offensive or harmful language'       },
      { value: 'harassment',      label: 'Harassment',       icon: <I><Frown          size={SZ} strokeWidth={SW} /></I>, desc: 'Targeting or bullying a user'        },
      { value: 'misinformation',  label: 'Misinformation',   icon: <I><AlertOctagon   size={SZ} strokeWidth={SW} /></I>, desc: 'False or misleading information'     },
      { value: 'duplicate',       label: 'Duplicate Post',   icon: <I><Repeat2        size={SZ} strokeWidth={SW} /></I>, desc: 'This topic already exists'           },
      { value: 'other',           label: 'Other Issue',      icon: <I><MessageSquareX size={SZ} strokeWidth={SW} /></I>, desc: 'Another issue not listed above'      },
    ],
  },
  user: {
    label: 'Report User',
    subtitle: 'Report inappropriate user behaviour',
    reasons: [
      { value: 'spam',            label: 'Spamming',          icon: <I><Ban      size={SZ} strokeWidth={SW} /></I>, desc: 'Sending unwanted repetitive content'  },
      { value: 'abusive_content', label: 'Abusive Behaviour', icon: <I><Angry    size={SZ} strokeWidth={SW} /></I>, desc: 'Using offensive or harmful language'  },
      { value: 'harassment',      label: 'Harassment',        icon: <I><UserX    size={SZ} strokeWidth={SW} /></I>, desc: 'Targeting or intimidating others'     },
      { value: 'other',           label: 'Other Issue',       icon: <I><Bookmark size={SZ} strokeWidth={SW} /></I>, desc: 'Another issue not listed above'       },
    ],
  },
};

/* ─────────────────────────────────────────
   Component
───────────────────────────────────────── */
const ReportModal: FC<ReportModalProps> = ({
  isOpen, onClose, type, targetId, targetTitle, targetUrl,
}) => {
  const { token, user } = useAuth();
  const { isDark }      = useTheme();

  const [reason,      setReason]      = useState('');
  const [description, setDescription] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [error,       setError]       = useState('');
  const [mounted,     setMounted]     = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const D = isDark;

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setMounted(true));
    else        setMounted(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const cfg = REASONS[type];

  const handleSubmit = async () => {
    if (!reason) { setError('Please select a reason.'); return; }
    if (!user)   { setError('Please log in to submit a report.'); return; }
    setLoading(true); setError('');
    try {
      await axios.post(
        `${API_URL}/reports`,
        { type, targetId, reason, description, targetTitle, targetUrl: targetUrl ?? '' },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setSubmitted(true);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason(''); setDescription(''); setError(''); setSubmitted(false);
    onClose();
  };

  /* ── Design tokens ── */
  const t = {
    // surfaces
    cardBg:       D ? '#0b0c11'                     : '#fafafa',
    cardBorder:   D ? 'rgba(255,255,255,0.08)'       : 'rgba(0,0,0,0.10)',
    headerBg:     D ? 'rgba(255,255,255,0.025)'      : 'rgba(0,0,0,0.025)',
    divider:      D ? 'rgba(255,255,255,0.06)'       : 'rgba(0,0,0,0.07)',
    // text
    hi:           D ? '#f0f2f8'                     : '#0c0e1a',
    md:           D ? 'rgba(255,255,255,0.42)'       : 'rgba(0,0,0,0.44)',
    lo:           D ? 'rgba(255,255,255,0.20)'       : 'rgba(0,0,0,0.24)',
    // rows
    rowBg:        D ? 'rgba(255,255,255,0.03)'       : '#ffffff',
    rowBorder:    D ? 'rgba(255,255,255,0.07)'       : 'rgba(0,0,0,0.08)',
    rowShadow:    D ? '0 1px 4px rgba(0,0,0,0.3)'   : '0 1px 4px rgba(0,0,0,0.06)',
    // inputs
    inBg:         D ? 'rgba(255,255,255,0.03)'       : '#ffffff',
    inBorder:     D ? 'rgba(255,255,255,0.09)'       : 'rgba(0,0,0,0.11)',
    // misc
    chipBg:       D ? 'rgba(255,255,255,0.07)'       : 'rgba(0,0,0,0.06)',
    shadow:       D
      ? '0 0 0 1px rgba(255,255,255,0.05), 0 32px 72px -16px rgba(0,0,0,0.92), 0 8px 24px -8px rgba(0,0,0,0.6)'
      : '0 0 0 1px rgba(0,0,0,0.08), 0 24px 60px -12px rgba(0,0,0,0.18), 0 4px 16px -4px rgba(0,0,0,0.08)',
    // accent
    red:          '#ef4444',
    redFaded:     D ? 'rgba(239,68,68,0.10)'         : 'rgba(239,68,68,0.07)',
    redBorder:    'rgba(239,68,68,0.32)',
    redGlow:      '0 4px 20px -6px rgba(239,68,68,0.28)',
    redText:      D ? '#fca5a5'                      : '#dc2626',
    redTextMd:    D ? 'rgba(252,165,165,0.55)'       : 'rgba(220,38,38,0.55)',
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');

        .rm-wrap * { font-family: 'Geist', system-ui, sans-serif; box-sizing: border-box; }
        .rm-mono   { font-family: 'Geist Mono', monospace !important; }

        /* ── Keyframes ── */
        @keyframes rm-bd    { from{opacity:0}                                                          to{opacity:1}                                          }
        @keyframes rm-up    { from{opacity:0;transform:translateY(24px) scale(.96)}                    to{opacity:1;transform:none}                           }
        @keyframes rm-row-i { from{opacity:0;transform:translateY(6px)}                                to{opacity:1;transform:none}                           }
        @keyframes rm-pop   { 0%{transform:scale(.25) rotate(-18deg);opacity:0} 65%{transform:scale(1.15) rotate(4deg)} 100%{transform:none;opacity:1}        }
        @keyframes rm-spin  { to{transform:rotate(360deg)} }
        @keyframes rm-ring  { 0%{transform:scale(1);opacity:.55} 100%{transform:scale(1.9);opacity:0} }
        @keyframes rm-pulse { 0%,100%{opacity:.35} 50%{opacity:.75} }
        @keyframes rm-halo  { 0%{background-position:0 50%} 100%{background-position:300% 50%}        }
        @keyframes rm-float { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-10px) scale(1.04)} }

        /* ── Animation classes ── */
        .rm-bd-ani  { animation: rm-bd   .22s ease }
        .rm-up-ani  { animation: rm-up   .30s cubic-bezier(.22,1,.36,1) }
        .rm-row-ani { animation: rm-row-i .22s ease both }
        .rm-pop-ani { animation: rm-pop   .50s cubic-bezier(.34,1.56,.64,1) forwards }
        .rm-ring-ani{ animation: rm-ring  1.55s ease-out infinite }
        .rm-pulse   { animation: rm-pulse 2.8s  ease-in-out infinite }
        .rm-float   { animation: rm-float 5s    ease-in-out infinite }

        /* ── Submit button ── */
        .rm-submit {
          background: linear-gradient(135deg,#f05050 0%,#dc2020 50%,#b91c1c 100%);
          transition: filter .18s ease, transform .14s ease, box-shadow .2s ease;
          position: relative; overflow: hidden;
        }
        .rm-submit::after {
          content:''; position:absolute; inset:0;
          background: linear-gradient(to bottom, rgba(255,255,255,.12) 0%, transparent 60%);
          pointer-events: none;
        }
        .rm-submit:not(:disabled):hover  { filter:brightness(1.10); transform:translateY(-1px); }
        .rm-submit:not(:disabled):active { filter:brightness(.94);  transform:translateY(0);   }

        /* ── Cancel button ── */
        .rm-cancel { transition: background .15s, border-color .15s, color .15s; }

        /* ── Reason row ── */
        .rm-reason-row { transition: border-color .15s, background .15s, box-shadow .15s, transform .13s; }
        .rm-reason-row:hover { transform: translateX(2px); }

        /* ── Icon bubble ── */
        .rm-icon-bub { transition: background .15s, border-color .15s, color .15s; }

        /* ── Textarea ── */
        .rm-ta { transition: border-color .18s, box-shadow .18s, background .18s; }
        .rm-ta:focus { outline: none; }

        /* ── Close btn ── */
        .rm-x { transition: background .13s, color .13s, transform .13s; }
        .rm-x:hover { transform: rotate(90deg); }

        /* ── Scrollbar ── */
        .rm-scroll::-webkit-scrollbar              { width: 3px }
        .rm-scroll::-webkit-scrollbar-track        { background: transparent }
        .rm-scroll::-webkit-scrollbar-thumb        { background: rgba(255,255,255,.09); border-radius: 99px }
        .rm-scroll::-webkit-scrollbar-thumb:hover  { background: rgba(255,255,255,.18) }
      `}</style>

      {/* ── Root overlay ──
           overflowY:auto  → card scrolls into view if taller than screen
           background set here (not absolute child) → no gap when scrolling       */}
      <div
        className="rm-wrap rm-bd-ani"
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          overflowY: 'auto',
          background: D ? 'rgba(2,3,8,0.92)' : 'rgba(6,8,18,0.60)',
          backdropFilter: 'blur(18px) saturate(1.6)',
        }}
        onClick={handleClose}
      >
        {/* Inner centering wrapper — takes at least full height so card stays centered */}
        <div style={{
          minHeight: '100%', boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '80px 16px 32px', /* 80px top clears ~60px navbar */
          pointerEvents: 'none',     /* clicks fall through to root dismiss */
        }}>

        {/* Ambient blobs (fixed to viewport center) */}
        <div className="rm-pulse rm-float" style={{
          position:'fixed', width:360, height:360, borderRadius:'50%', pointerEvents:'none',
          background:'radial-gradient(circle, rgba(239,68,68,.10) 0%, transparent 68%)',
          left:'50%', top:'50%', transform:'translate(-68%,-62%)', filter:'blur(48px)',
          zIndex:0,
        }}/>
        <div className="rm-pulse" style={{
          position:'fixed', width:280, height:280, borderRadius:'50%', pointerEvents:'none',
          background:'radial-gradient(circle, rgba(249,115,22,.07) 0%, transparent 68%)',
          left:'50%', top:'50%', transform:'translate(8%,8%)', filter:'blur(56px)',
          animationDelay:'1.4s', zIndex:0,
        }}/>

        {/* ═══════════════════════════ CARD ═══════════════════════════ */}
        <div
          className="rm-up-ani"
          onClick={e => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%', maxWidth: 452,
            borderRadius: 22,
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            boxShadow: t.shadow,
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            pointerEvents: 'all',
            zIndex: 1,
          }}
        >
          {/* Top accent stripe — animated shimmer */}
          <div style={{
            position:'absolute', top:0, left:0, right:0, height:2, zIndex:3,
            background:'linear-gradient(90deg,transparent 0%,#ef4444 25%,#f97316 50%,#ef4444 75%,transparent 100%)',
            backgroundSize:'300% 100%',
            animation:'rm-halo 4s linear infinite',
          }}/>

          {/* Subtle inner glow at top */}
          <div style={{
            position:'absolute', top:0, left:0, right:0, height:80, pointerEvents:'none', zIndex:1,
            background: D
              ? 'linear-gradient(to bottom, rgba(239,68,68,.04) 0%, transparent 100%)'
              : 'linear-gradient(to bottom, rgba(239,68,68,.03) 0%, transparent 100%)',
          }}/>

          {/* ══ SUCCESS STATE ══ */}
          {submitted ? (
            <div style={{
              display:'flex', flexDirection:'column', alignItems:'center',
              gap:22, padding:'56px 36px 44px', textAlign:'center',
            }}>
              <div style={{ position:'relative', width:88, height:88 }}>
                <div className="rm-ring-ani" style={{
                  position:'absolute', inset:-10, borderRadius:'50%',
                  border:'1.5px solid rgba(34,197,94,.5)',
                }}/>
                <div className="rm-ring-ani" style={{
                  position:'absolute', inset:-10, borderRadius:'50%',
                  border:'1.5px solid rgba(34,197,94,.28)',
                  animationDelay:'.6s',
                }}/>
                <div className="rm-pop-ani" style={{
                  width:88, height:88, borderRadius:'50%',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background:'linear-gradient(135deg,rgba(34,197,94,.16),rgba(16,185,129,.06))',
                  border:'1.5px solid rgba(34,197,94,.26)',
                  boxShadow:'0 0 36px -6px rgba(34,197,94,.32)',
                }}>
                  <CheckCircle size={40} strokeWidth={1.4} color="#4ade80"/>
                </div>
              </div>

              <div style={{ maxWidth:300 }}>
                <p style={{
                  fontSize:22, fontWeight:700, letterSpacing:'-.03em', marginBottom:10,
                  color: t.hi,
                }}>Report Submitted</p>
                <p style={{ fontSize:14, lineHeight:1.75, color:t.md }}>
                  Our moderation team will review this and take appropriate action. Thank you for helping keep the community safe.
                </p>
              </div>

              <button
                onClick={handleClose}
                style={{
                  marginTop:4, padding:'11px 44px', borderRadius:99,
                  fontSize:13.5, fontWeight:700, letterSpacing:'-.015em',
                  background:'linear-gradient(135deg,#22c55e,#10b981)',
                  color:'#fff', border:'none', cursor:'pointer',
                  boxShadow:'0 8px 28px -6px rgba(34,197,94,.42)',
                  transition:'filter .15s, transform .15s',
                }}
                onMouseEnter={e=>{ const el=e.currentTarget; el.style.filter='brightness(1.1)'; el.style.transform='translateY(-1px)'; }}
                onMouseLeave={e=>{ const el=e.currentTarget; el.style.filter='';                el.style.transform=''; }}
              >Done</button>
            </div>

          ) : (
            <>
              {/* ══ HEADER ══ */}
              <div style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'18px 20px 16px',
                background: t.headerBg,
                borderBottom:`1px solid ${t.divider}`,
                flexShrink: 0,
                zIndex: 2,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  {/* Flag icon container */}
                  <div style={{
                    width:42, height:42, borderRadius:13, flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    background:'linear-gradient(135deg,rgba(239,68,68,.16) 0%,rgba(185,28,28,.05) 100%)',
                    border:'1px solid rgba(239,68,68,.20)',
                    boxShadow:'0 4px 16px -6px rgba(239,68,68,.30), inset 0 1px 0 rgba(255,255,255,.07)',
                  }}>
                    <Flag size={17} strokeWidth={2.1} color="#f87171"/>
                  </div>

                  <div>
                    <p style={{
                      fontSize:15, fontWeight:700, letterSpacing:'-.025em',
                      color:t.hi, lineHeight:1,
                    }}>{cfg.label}</p>
                    <p style={{ fontSize:12, marginTop:4.5, color:t.md, lineHeight:1 }}>
                      {cfg.subtitle}
                    </p>
                  </div>
                </div>

                {/* Close */}
                <button
                  className="rm-x"
                  onClick={handleClose}
                  style={{
                    width:34, height:34, borderRadius:10, flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    background:'transparent', border:'none', cursor:'pointer',
                    color: t.lo,
                  }}
                  onMouseEnter={e=>{ const el=e.currentTarget; el.style.background=D?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'; el.style.color=D?'rgba(255,255,255,.7)':'rgba(0,0,0,.6)'; }}
                  onMouseLeave={e=>{ const el=e.currentTarget; el.style.background='transparent'; el.style.color=t.lo; }}
                >
                  <X size={15} strokeWidth={2.5}/>
                </button>
              </div>

              {/* ══ SCROLLABLE BODY ══ */}
              <div
                ref={bodyRef}
                className="rm-scroll"
                style={{ padding:'18px 20px 22px' }}
              >

                {/* ── Reporting target banner ── */}
                <div style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'10px 14px', borderRadius:11, marginBottom:22,
                  background: D ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                  border:`1px solid ${t.divider}`,
                }}>
                  <Shield
                    size={13} strokeWidth={2.1}
                    color={D?'rgba(255,255,255,.30)':'rgba(0,0,0,.32)'}
                    style={{ flexShrink:0 }}
                  />
                  <span style={{
                    fontSize:10.5, fontWeight:600, letterSpacing:'.06em',
                    textTransform:'uppercase', color:t.lo, flexShrink:0,
                  }}>Reporting</span>
                  <div style={{ width:1, height:12, background:t.divider, flexShrink:0 }}/>
                  <span style={{
                    fontSize:12.5, fontWeight:600,
                    color: D?'rgba(255,255,255,.65)':'rgba(0,0,0,.60)',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  }}>{targetTitle}</span>
                </div>

                {/* ── Section heading ── */}
                <p style={{
                  fontSize:10, fontWeight:700, letterSpacing:'.09em',
                  textTransform:'uppercase', color:t.lo, marginBottom:10,
                }}>
                  Reason <span style={{ color:'#f87171', letterSpacing:0, textTransform:'none', fontWeight:500 }}>*</span>
                </p>

                {/* ── Reason rows ── */}
                <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:20 }}>
                  {cfg.reasons.map((r, idx) => {
                    const sel = reason === r.value;
                    return (
                      <button
                        key={r.value}
                        className="rm-reason-row rm-row-ani"
                        onClick={() => { setReason(r.value); setError(''); }}
                        style={{
                          animationDelay: `${idx * 48}ms`,
                          display:'flex', alignItems:'center', gap:13,
                          padding:'12px 14px', borderRadius:13,
                          border: sel ? `1.5px solid ${t.redBorder}` : `1.5px solid ${t.rowBorder}`,
                          background: sel ? t.redFaded : t.rowBg,
                          boxShadow: sel ? t.redGlow : t.rowShadow,
                          cursor:'pointer', width:'100%', textAlign:'left',
                        }}
                      >
                        {/* Icon bubble */}
                        <div
                          className="rm-icon-bub"
                          style={{
                            width:36, height:36, borderRadius:10, flexShrink:0,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            background: sel
                              ? (D?'rgba(239,68,68,.18)':'rgba(239,68,68,.12)')
                              : (D?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)'),
                            border: sel
                              ? '1px solid rgba(239,68,68,.28)'
                              : `1px solid ${t.rowBorder}`,
                            color: sel
                              ? t.redText
                              : t.md,
                          }}
                        >
                          {r.icon}
                        </div>

                        {/* Labels */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{
                            fontSize:13.5, fontWeight:600, letterSpacing:'-.015em', lineHeight:1,
                            color: sel ? t.redText : t.hi,
                            transition:'color .15s',
                          }}>{r.label}</p>
                          <p style={{
                            fontSize:11.5, marginTop:3.5, lineHeight:1,
                            color: sel ? t.redTextMd : t.md,
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                            transition:'color .15s',
                          }}>{r.desc}</p>
                        </div>

                        {/* Radio indicator */}
                        <div style={{
                          width:20, height:20, borderRadius:'50%', flexShrink:0,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          background: sel ? t.red : 'transparent',
                          border: sel ? 'none' : `2px solid ${D?'rgba(255,255,255,.20)':'rgba(0,0,0,.20)'}`,
                          boxShadow: sel ? `0 0 0 3.5px rgba(239,68,68,.18), 0 0 14px -2px rgba(239,68,68,.35)` : 'none',
                          transition:'all .18s ease',
                        }}>
                          {sel && (
                            <div style={{ width:7, height:7, borderRadius:'50%', background:'#fff' }}/>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* ── Additional details ── */}
                <div style={{ marginBottom:20 }}>
                  <p style={{
                    fontSize:10, fontWeight:700, letterSpacing:'.09em',
                    textTransform:'uppercase', color:t.lo, marginBottom:9,
                    display:'flex', alignItems:'center', gap:8,
                  }}>
                    Additional details
                    <span style={{
                      fontSize:9, fontWeight:600, letterSpacing:'.05em',
                      textTransform:'uppercase', padding:'2px 8px', borderRadius:99,
                      background: t.chipBg, color: t.md,
                    }}>optional</span>
                  </p>

                  <div style={{ position:'relative' }}>
                    <textarea
                      className="rm-ta rm-scroll"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="Describe the issue in more detail…"
                      style={{
                        width:'100%', resize:'none', display:'block',
                        padding:'12px 14px 26px', borderRadius:13, fontSize:13.5,
                        fontFamily:'Geist, system-ui, sans-serif', lineHeight:1.65,
                        border:`1.5px solid ${t.inBorder}`,
                        background: t.inBg,
                        color: t.hi,
                        caretColor: t.red,
                      }}
                      onFocus={e=>{
                        e.currentTarget.style.borderColor=D?'rgba(239,68,68,.30)':'rgba(239,68,68,.36)';
                        e.currentTarget.style.boxShadow='0 0 0 3px rgba(239,68,68,.08)';
                        e.currentTarget.style.background=D?'rgba(255,255,255,.045)':'rgba(255,255,255,1)';
                      }}
                      onBlur={e=>{
                        e.currentTarget.style.borderColor=t.inBorder;
                        e.currentTarget.style.boxShadow='none';
                        e.currentTarget.style.background=t.inBg;
                      }}
                    />
                    <span className="rm-mono" style={{
                      position:'absolute', bottom:9, right:12,
                      fontSize:10.5, pointerEvents:'none',
                      color: t.lo,
                    }}>
                      {description.length}
                      <span style={{ opacity:.45 }}>/500</span>
                    </span>
                  </div>
                </div>

                {/* ── Error ── */}
                {error && (
                  <div style={{
                    display:'flex', alignItems:'center', gap:9,
                    padding:'10px 14px', borderRadius:11, marginBottom:16,
                    background:'rgba(239,68,68,.09)', border:'1px solid rgba(239,68,68,.22)',
                    color:'#f87171', fontSize:12.5, fontWeight:500,
                  }}>
                    <AlertTriangle size={14} strokeWidth={2.2} style={{flexShrink:0}}/>
                    {error}
                  </div>
                )}

                {/* ── Action buttons ── */}
                <div style={{ display:'flex', gap:10 }}>

                  {/* Cancel */}
                  <button
                    className="rm-cancel"
                    onClick={handleClose}
                    style={{
                      flex:1, padding:'12.5px 0', borderRadius:13,
                      fontSize:13.5, fontWeight:600, letterSpacing:'-.015em',
                      background:'transparent', cursor:'pointer',
                      border:`1.5px solid ${t.divider}`,
                      color: t.md,
                    }}
                    onMouseEnter={e=>{
                      const el=e.currentTarget;
                      el.style.background=D?'rgba(255,255,255,.05)':'rgba(0,0,0,.04)';
                      el.style.borderColor=D?'rgba(255,255,255,.14)':'rgba(0,0,0,.14)';
                      el.style.color=D?'rgba(255,255,255,.65)':'rgba(0,0,0,.60)';
                    }}
                    onMouseLeave={e=>{
                      const el=e.currentTarget;
                      el.style.background='transparent';
                      el.style.borderColor=t.divider;
                      el.style.color=t.md;
                    }}
                  >Cancel</button>

                  {/* Submit */}
                  <button
                    className="rm-submit"
                    onClick={handleSubmit}
                    disabled={loading || !reason}
                    style={{
                      flex:1.75, padding:'12.5px 0', borderRadius:13,
                      fontSize:13.5, fontWeight:700, letterSpacing:'-.015em',
                      color:'#fff', border:'none',
                      cursor: reason && !loading ? 'pointer' : 'not-allowed',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                      opacity: reason && !loading ? 1 : 0.36,
                      boxShadow: reason && !loading ? '0 6px 24px -6px rgba(220,31,31,.50)' : 'none',
                      transition:'opacity .2s, box-shadow .2s',
                    }}
                  >
                    {loading ? (
                      <>
                        <div
                          className="rm-spin"
                          style={{
                            width:15, height:15, borderRadius:'50%',
                            border:'2.5px solid rgba(255,255,255,.28)',
                            borderTopColor:'#fff',
                          }}
                        />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <Flag size={14} strokeWidth={2.5}/>
                        Submit Report
                        <ArrowRight size={14} strokeWidth={2.5} style={{marginLeft:-2}}/>
                      </>
                    )}
                  </button>
                </div>

              </div>{/* /body */}
            </>
          )}
        </div>{/* /card */}
        </div>{/* /inner centering wrapper */}
      </div>{/* /root */}
    </>
  );
};

export default ReportModal;
