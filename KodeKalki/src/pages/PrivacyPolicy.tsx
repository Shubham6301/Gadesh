import React, { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { useTheme } from "../contexts/ThemeContext"
import {
  Shield, ArrowLeft, Lock, Eye, Database, Share2,
  Trash2, Mail, ChevronDown, ChevronUp, CheckCircle,
  Clock, ArrowUp, BookOpen, ExternalLink
} from "lucide-react"

interface ContentItem {
  subtitle: string
  text: string
}

interface Section {
  id: string
  icon: React.ReactNode
  title: string
  color: string
  bgLight: string
  bgDark: string
  content: ContentItem[]
}

const sections: Section[] = [
  {
    id: "collection",
    icon: <Eye className="h-5 w-5" />,
    title: "Information We Collect",
    color: "from-blue-500 to-indigo-600",
    bgLight: "bg-blue-50 border-blue-100",
    bgDark: "bg-blue-950/20 border-blue-500/10",
    content: [
      {
        subtitle: "Account Information",
        text: "When you register, we collect your username, email address, and password stored as a bcrypt hash. You may optionally provide your name, profile picture, and social links.",
      },
      {
        subtitle: "Usage Data",
        text: "We automatically collect information about how you interact with KodeKalki including problems you attempt, contests you join, time spent, submissions, and game results.",
      },
      {
        subtitle: "Device and Technical Data",
        text: "We collect IP address, browser type, operating system, and device identifiers to ensure platform security and provide a consistent experience across sessions.",
      },
    ],
  },
  {
    id: "usage",
    icon: <Database className="h-5 w-5" />,
    title: "How We Use Your Data",
    color: "from-violet-500 to-purple-600",
    bgLight: "bg-violet-50 border-violet-100",
    bgDark: "bg-violet-950/20 border-violet-500/10",
    content: [
      {
        subtitle: "Platform Operation",
        text: "To provide, maintain, and improve KodeKalki features including problem recommendations, leaderboard rankings, contest management, and AI interview practice.",
      },
      {
        subtitle: "Personalization",
        text: "To tailor your learning journey, suggest problems based on your progress, and display relevant contests and company-specific problem sets.",
      },
      {
        subtitle: "Communications",
        text: "To send you important platform updates, contest reminders, and achievement notifications. You may opt out of non-essential emails at any time from your settings.",
      },
    ],
  },
  {
    id: "sharing",
    icon: <Share2 className="h-5 w-5" />,
    title: "Data Sharing and Disclosure",
    color: "from-orange-500 to-red-500",
    bgLight: "bg-orange-50 border-orange-100",
    bgDark: "bg-orange-950/20 border-orange-500/10",
    content: [
      {
        subtitle: "No Selling of Data",
        text: "We do not sell, trade, or rent your personal information to third parties for any reason whatsoever. Your data belongs to you.",
      },
      {
        subtitle: "Service Providers",
        text: "We may share limited data with trusted service providers who are contractually bound to protect your information and use it only for specified purposes.",
      },
      {
        subtitle: "Legal Requirements",
        text: "We may disclose data when required by law or to protect the rights, property, or safety of KodeKalki, our users, or the public.",
      },
    ],
  },
  {
    id: "security",
    icon: <Lock className="h-5 w-5" />,
    title: "Data Security",
    color: "from-emerald-500 to-green-600",
    bgLight: "bg-emerald-50 border-emerald-100",
    bgDark: "bg-emerald-950/20 border-emerald-500/10",
    content: [
      {
        subtitle: "Encryption",
        text: "All data transmitted between your browser and our servers is encrypted using TLS 1.3. Passwords are hashed using bcrypt and never stored in plain text.",
      },
      {
        subtitle: "Access Controls",
        text: "We implement strict role-based access controls. Only authorized personnel can access user data, and all access is logged, monitored, and audited regularly.",
      },
      {
        subtitle: "Incident Response",
        text: "In the event of a security breach, we will notify affected users within 72 hours per GDPR requirements and take immediate remediation steps.",
      },
    ],
  },
  {
    id: "rights",
    icon: <Trash2 className="h-5 w-5" />,
    title: "Your Rights",
    color: "from-pink-500 to-rose-600",
    bgLight: "bg-pink-50 border-pink-100",
    bgDark: "bg-pink-950/20 border-pink-500/10",
    content: [
      {
        subtitle: "Access and Portability",
        text: "You may request a full export of your personal data at any time through your account settings in a machine-readable format.",
      },
      {
        subtitle: "Correction and Deletion",
        text: "You can update your profile information directly. To request permanent deletion of your account and all associated data, contact our privacy team.",
      },
      {
        subtitle: "Opt-Out",
        text: "You can opt out of non-essential communications and analytics tracking through your account preferences at any time with immediate effect.",
      },
    ],
  },
]

interface AccordionProps {
  section: Section
  isDark: boolean
  index: number
}

const AccordionSection: React.FC<AccordionProps> = ({ section, isDark, index }) => {
  const [open, setOpen] = useState<boolean>(index === 0)

  return (
    <div
      id={section.id}
      className={`rounded-2xl border overflow-hidden transition-all duration-300 scroll-mt-24 ${
        isDark
          ? `bg-gray-900/60 border-white/8 hover:border-white/15 ${open ? "border-white/15 shadow-xl shadow-black/30" : ""}`
          : `bg-white border-gray-200/80 hover:border-gray-300 shadow-sm ${open ? "shadow-md border-gray-300" : ""}`
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 md:p-6 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl"
        aria-expanded={open}
        aria-controls={`${section.id}-content`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center text-white flex-shrink-0 shadow-md transition-transform duration-300 group-hover:scale-110`}
          >
            {section.icon}
          </div>
          <div>
            <span
              className={`text-[10px] font-mono uppercase tracking-[0.18em] mb-0.5 block ${
                isDark ? "text-gray-600" : "text-gray-400"
              }`}
            >
              Section {String(index + 1).padStart(2, "0")}
            </span>
            <h3
              className={`text-base font-semibold leading-tight ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {section.title}
            </h3>
          </div>
        </div>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ml-4 transition-all duration-300 ${
            open
              ? `bg-gradient-to-br ${section.color} text-white shadow-md`
              : isDark
              ? "bg-white/5 text-gray-500"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>

      <div
        id={`${section.id}-content`}
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          open ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0"
        }`}
        aria-hidden={!open}
      >
        <div
          className={`px-5 md:px-6 pb-5 md:pb-6 border-t ${
            isDark ? "border-white/5" : "border-gray-100"
          }`}
        >
          <div className="pt-5 grid gap-3">
            {section.content.map((item, i) => (
              <div
                key={i}
                className={`rounded-xl p-4 border transition-all duration-200 ${
                  isDark ? section.bgDark : section.bgLight
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-full bg-gradient-to-br ${section.color} flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm`}
                  >
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <h4
                      className={`font-semibold text-sm mb-1 ${
                        isDark ? "text-gray-100" : "text-gray-800"
                      }`}
                    >
                      {item.subtitle}
                    </h4>
                    <p
                      className={`text-sm leading-relaxed ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {item.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const PrivacyPolicy: React.FC = () => {
  const { isDark } = useTheme()
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false)
  const [readProgress, setReadProgress] = useState<number>(0)
  const [activeSection, setActiveSection] = useState<string>("collection")

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight
      setReadProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
      setShowScrollTop(scrollTop > 500)

      // Active section detection
      sections.forEach((section) => {
        const el = document.getElementById(section.id)
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= 120 && rect.bottom > 120) {
            setActiveSection(section.id)
          }
        }
      })
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" })

  return (
    <>
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-purple-600 transition-all duration-100"
          style={{ width: `${readProgress}%` }}
          role="progressbar"
          aria-label="Reading progress"
          aria-valuenow={Math.round(readProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <div
        className={`min-h-screen transition-colors duration-300 ${
          isDark ? "bg-[#080810]" : "bg-gray-50/80"
        }`}
      >
        {/* ── Hero Section ── */}
        <div
          className={`relative overflow-hidden ${
            isDark ? "bg-[#0c0c18]" : "bg-white"
          } border-b ${isDark ? "border-white/5" : "border-gray-100"}`}
        >
          {/* Background FX */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className={`absolute -top-24 right-0 w-[700px] h-[700px] rounded-full blur-[140px] ${
                isDark ? "opacity-[0.12]" : "opacity-[0.08]"
              } bg-blue-600`}
            />
            <div
              className={`absolute bottom-0 -left-24 w-[500px] h-[500px] rounded-full blur-[120px] ${
                isDark ? "opacity-[0.08]" : "opacity-[0.06]"
              } bg-violet-600`}
            />
            {/* Dot grid */}
            <div
              className={`absolute inset-0 ${
                isDark ? "opacity-[0.025]" : "opacity-[0.04]"
              }`}
              style={{
                backgroundImage: `radial-gradient(${
                  isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.5)"
                } 1px, transparent 1px)`,
                backgroundSize: "28px 28px",
              }}
            />
          </div>

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            {/* Back Button */}
            <Link
              to="/"
              className={`inline-flex items-center gap-2 mb-10 text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${
                isDark
                  ? "text-gray-400 hover:text-white hover:bg-white/6"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to KodeKalki
            </Link>

            <div className="flex flex-col sm:flex-row items-start gap-6 md:gap-8">
              <div className="hidden sm:flex w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-gradient-to-br from-blue-500 to-violet-600 items-center justify-center shadow-2xl shadow-blue-500/20 flex-shrink-0 mt-1">
                <Shield className="h-8 w-8 md:h-10 md:w-10 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span
                    className={`text-[11px] font-mono uppercase tracking-[0.22em] px-3 py-1 rounded-full border ${
                      isDark
                        ? "text-blue-400 bg-blue-500/8 border-blue-500/15"
                        : "text-blue-600 bg-blue-50 border-blue-200"
                    }`}
                  >
                    Legal Document
                  </span>
                  <span
                    className={`flex items-center gap-1.5 text-xs ${
                      isDark ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    <Clock className="h-3 w-3" />5 min read
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Current
                  </span>
                </div>
                <h1
                  className={`text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 leading-[1.1] ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Privacy{" "}
                  <span className="bg-gradient-to-r from-blue-500 to-violet-600 bg-clip-text text-transparent">
                    Policy
                  </span>
                </h1>
                <p
                  className={`text-base md:text-lg max-w-2xl leading-relaxed ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  We believe in radical transparency. This document explains
                  exactly what data we collect, why we collect it, and how you
                  can control it at any time.
                </p>
                <div
                  className={`flex flex-wrap items-center gap-4 mt-6 pt-6 border-t ${
                    isDark ? "border-white/5" : "border-gray-100"
                  }`}
                >
                  <span
                    className={`text-sm ${
                      isDark ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    Effective: January 1, 2026
                  </span>
                  <span
                    className={`w-1 h-1 rounded-full ${
                      isDark ? "bg-gray-700" : "bg-gray-300"
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      isDark ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    Version 2.0
                  </span>
                  <span
                    className={`w-1 h-1 rounded-full ${
                      isDark ? "bg-gray-700" : "bg-gray-300"
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      isDark ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    {sections.length} sections
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Sidebar TOC */}
            <aside className="hidden lg:block">
              <div
                className={`sticky top-8 rounded-2xl border overflow-hidden ${
                  isDark
                    ? "bg-gray-900/70 border-white/8 backdrop-blur-xl"
                    : "bg-white border-gray-200/80 shadow-sm"
                }`}
              >
                <div
                  className={`px-5 py-4 border-b flex items-center gap-2 ${
                    isDark ? "border-white/5" : "border-gray-100"
                  }`}
                >
                  <BookOpen
                    className={`h-3.5 w-3.5 ${
                      isDark ? "text-gray-500" : "text-gray-400"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-widest ${
                      isDark ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    Table of Contents
                  </span>
                </div>
                <nav className="p-3" aria-label="Page sections">
                  {sections.map((section, i) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group mb-0.5 ${
                        activeSection === section.id
                          ? isDark
                            ? "bg-white/8 text-white"
                            : "bg-gray-100 text-gray-900"
                          : isDark
                          ? "text-gray-500 hover:text-gray-200 hover:bg-white/5"
                          : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg bg-gradient-to-br ${section.color} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 transition-transform duration-200 group-hover:scale-110`}
                      >
                        {i + 1}
                      </span>
                      <span className="leading-tight text-xs font-medium">
                        {section.title}
                      </span>
                    </a>
                  ))}
                </nav>
                <div
                  className={`px-5 py-3 border-t ${
                    isDark ? "border-white/5" : "border-gray-100"
                  }`}
                >
                  <p
                    className={`text-[10px] ${
                      isDark ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    Also read:{" "}
                    <Link
                      to="/terms-of-service"
                      className="text-blue-500 hover:underline"
                    >
                      Terms
                    </Link>
                    {" · "}
                    <Link
                      to="/cookie-policy"
                      className="text-blue-500 hover:underline"
                    >
                      Cookies
                    </Link>
                  </p>
                </div>
              </div>
            </aside>

            {/* Content */}
            <div className="lg:col-span-3 space-y-4">
              {/* Intro */}
              <div
                className={`rounded-2xl p-5 border-l-[3px] border-l-blue-500 mb-6 ${
                  isDark
                    ? "bg-blue-950/15 border border-blue-500/8"
                    : "bg-blue-50/70 border border-blue-100"
                }`}
              >
                <p
                  className={`text-sm leading-relaxed ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  This Privacy Policy applies to KodeKalki and describes how we
                  handle personal information collected through our website and
                  services. By using KodeKalki, you agree to the practices
                  described in this policy. Questions? Reach us at{" "}
                  <a
                    href="mailto:support@kodekalki.com"
                    className="text-blue-500 hover:underline font-medium inline-flex items-center gap-1"
                  >
                    support@kodekalki.com
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>

              {/* Accordions */}
              {sections.map((section, index) => (
                <AccordionSection
                  key={section.id}
                  section={section}
                  isDark={isDark}
                  index={index}
                />
              ))}

              {/* Contact Card */}
              <div
                className={`rounded-2xl border mt-8 overflow-hidden ${
                  isDark
                    ? "bg-gray-900/60 border-white/8"
                    : "bg-white border-gray-200/80 shadow-sm"
                }`}
              >
                <div
                  className={`h-1 w-full bg-gradient-to-r from-blue-500 via-violet-500 to-purple-600`}
                />
                <div className="p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`text-lg font-semibold mb-1 ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Questions About Privacy?
                    </h3>
                    <p
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Our privacy team responds within 48 hours on business
                      days.
                    </p>
                  </div>
                  <a
                    href="mailto:support@kodekalki.com"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-violet-700 transition-all duration-300 hover:scale-105 shadow-lg shadow-blue-500/20 whitespace-nowrap"
                  >
                    <Mail className="h-4 w-4" />
                    Contact Us
                  </a>
                </div>
              </div>

              {/* Policy nav */}
              <div
                className={`rounded-xl px-5 py-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 ${
                  isDark ? "bg-white/2" : "bg-gray-100/50"
                }`}
              >
                <span
                  className={`text-xs ${
                    isDark ? "text-gray-600" : "text-gray-400"
                  }`}
                >
                  Related policies:
                </span>
                <Link
                  to="/terms-of-service"
                  className="text-xs text-blue-500 hover:underline hover:text-blue-400 transition-colors"
                >
                  Terms of Service
                </Link>
                <Link
                  to="/cookie-policy"
                  className="text-xs text-blue-500 hover:underline hover:text-blue-400 transition-colors"
                >
                  Cookie Policy
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll to Top */}
        <button
          onClick={scrollToTop}
          className={`fixed bottom-8 right-6 md:right-8 w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-xl shadow-blue-500/25 flex items-center justify-center transition-all duration-300 z-40 ${
            showScrollTop
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-4 pointer-events-none"
          } hover:scale-110 hover:shadow-2xl hover:shadow-blue-500/30`}
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>
    </>
  )
}

export default PrivacyPolicy
