import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useTheme } from "../contexts/ThemeContext"
import {
  Cookie, ArrowLeft, Shield, BarChart2, Settings,
  ToggleRight, Mail, ChevronDown, ChevronUp, ArrowUp,
  BookOpen, Clock, ExternalLink, HelpCircle, CheckCircle
} from "lucide-react"

interface CookieType {
  id: string
  icon: React.ReactNode
  title: string
  color: string
  bgLight: string
  bgDark: string
  badge: string
  badgeColorLight: string
  badgeColorDark: string
  required: boolean
  description: string
  examples: string[]
}

interface FAQ {
  id: string
  title: string
  text: string
}

const cookieTypes: CookieType[] = [
  {
    id: "essential",
    icon: <Shield className="h-5 w-5" />,
    title: "Essential Cookies",
    color: "from-emerald-500 to-green-600",
    bgLight: "bg-emerald-50 border-emerald-100",
    bgDark: "bg-emerald-950/20 border-emerald-500/10",
    badge: "Always Active",
    badgeColorLight: "bg-emerald-100 text-emerald-700 border-emerald-200",
    badgeColorDark: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    required: true,
    description:
      "These cookies are strictly necessary for KodeKalki to function. Without them, core features like login, security, and your saved preferences will not work properly.",
    examples: [
      "JWT authentication session token",
      "CSRF security protection token",
      "Dark and Light mode preference",
      "Language and region settings",
    ],
  },
  {
    id: "analytics",
    icon: <BarChart2 className="h-5 w-5" />,
    title: "Analytics Cookies",
    color: "from-blue-500 to-indigo-600",
    bgLight: "bg-blue-50 border-blue-100",
    bgDark: "bg-blue-950/20 border-blue-500/10",
    badge: "Optional",
    badgeColorLight: "bg-blue-100 text-blue-700 border-blue-200",
    badgeColorDark: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    required: false,
    description:
      "These cookies help us understand how users interact with KodeKalki, which features are popular, where users spend time, and how we can keep improving the platform.",
    examples: [
      "Page visit and navigation tracking",
      "Feature usage and engagement analytics",
      "Performance and error monitoring",
      "Contest participation patterns",
    ],
  },
  {
    id: "preference",
    icon: <Settings className="h-5 w-5" />,
    title: "Preference Cookies",
    color: "from-violet-500 to-purple-600",
    bgLight: "bg-violet-50 border-violet-100",
    bgDark: "bg-violet-950/20 border-violet-500/10",
    badge: "Optional",
    badgeColorLight: "bg-violet-100 text-violet-700 border-violet-200",
    badgeColorDark: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    required: false,
    description:
      "These cookies remember your personal settings so you do not have to reconfigure them every time you visit KodeKalki, providing a smoother experience.",
    examples: [
      "Code editor theme and font size",
      "Preferred programming language",
      "Problem filter and sort settings",
      "Notification and display preferences",
    ],
  },
]

const faqs: FAQ[] = [
  {
    id: "what",
    title: "What Exactly Are Cookies?",
    text: "Cookies are small text files stored on your device when you visit a website. They allow the site to remember information about your visit, making it more functional and personalized for your next session.",
  },
  {
    id: "duration",
    title: "How Long Do Cookies Last?",
    text: "Session cookies expire automatically when you close your browser. Persistent cookies remain on your device for a defined period — typically 30 to 365 days — or until you manually delete them through your browser settings.",
  },
  {
    id: "thirdparty",
    title: "Do You Use Third-Party Cookies?",
    text: "KodeKalki uses minimal third-party services including trusted analytics providers with anonymization enabled and CDN services for performance. We do not use advertising cookies, tracking pixels, or data from ad networks of any kind.",
  },
  {
    id: "manage",
    title: "How Can I Manage or Delete Cookies?",
    text: "You can control cookies through your browser settings. Most browsers allow you to view, block, or delete individual cookies. You can also update your consent preferences anytime from your KodeKalki account settings. Note that disabling essential cookies will prevent the platform from functioning properly.",
  },
]

interface CookieCardProps {
  cookie: CookieType
  isDark: boolean
  index: number
}

const CookieCard: React.FC<CookieCardProps> = ({ cookie, isDark, index }) => {
  const [open, setOpen] = useState<boolean>(index === 0)

  return (
    <div
      id={cookie.id}
      className={`rounded-2xl border overflow-hidden transition-all duration-300 scroll-mt-24 ${
        isDark
          ? `bg-gray-900/60 border-white/8 hover:border-white/15 ${
              open ? "border-white/15 shadow-xl shadow-black/30" : ""
            }`
          : `bg-white border-gray-200/80 hover:border-gray-300 shadow-sm ${
              open ? "shadow-md" : ""
            }`
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 md:p-6 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 rounded-2xl"
        aria-expanded={open}
        aria-controls={`${cookie.id}-content`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cookie.color} flex items-center justify-center text-white flex-shrink-0 shadow-md transition-transform duration-300 group-hover:scale-110`}
          >
            {cookie.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3
                className={`text-base font-semibold leading-tight ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {cookie.title}
              </h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                  isDark ? cookie.badgeColorDark : cookie.badgeColorLight
                } ${cookie.required ? "animate-pulse" : ""}`}
              >
                {cookie.badge}
              </span>
            </div>
            <p
              className={`text-[11px] ${
                isDark ? "text-gray-600" : "text-gray-400"
              }`}
            >
              {cookie.examples.length} types
            </p>
          </div>
        </div>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ml-4 transition-all duration-300 ${
            open
              ? `bg-gradient-to-br ${cookie.color} text-white shadow-md`
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
        id={`${cookie.id}-content`}
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
        aria-hidden={!open}
      >
        <div
          className={`px-5 md:px-6 pb-5 md:pb-6 border-t ${
            isDark ? "border-white/5" : "border-gray-100"
          }`}
        >
          <p
            className={`text-sm leading-relaxed mt-5 mb-4 ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {cookie.description}
          </p>
          <div
            className={`rounded-xl p-4 border ${
              isDark ? cookie.bgDark : cookie.bgLight
            }`}
          >
            <h4
              className={`font-semibold text-xs uppercase tracking-wider mb-3 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Examples
            </h4>
            <ul className="space-y-2">
              {cookie.examples.map((ex, i) => (
                <li
                  key={i}
                  className={`text-sm flex items-center gap-2.5 ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-gradient-to-br ${cookie.color} flex items-center justify-center flex-shrink-0`}
                  >
                    <CheckCircle className="h-2.5 w-2.5 text-white" />
                  </div>
                  {ex}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FAQItemProps {
  faq: FAQ
  isDark: boolean
  index: number
}

const FAQItem: React.FC<FAQItemProps> = ({ faq, isDark, index }) => {
  const [open, setOpen] = useState<boolean>(index === 0)

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
        isDark
          ? `bg-gray-900/60 border-white/8 hover:border-white/15 ${open ? "border-white/15" : ""}`
          : `bg-white border-gray-200/80 hover:border-gray-300 shadow-sm ${open ? "shadow-md" : ""}`
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 rounded-2xl"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-110">
            <HelpCircle className="h-4 w-4 text-white" />
          </div>
          <h3
            className={`text-sm font-semibold ${
              isDark ? "text-gray-200" : "text-gray-800"
            }`}
          >
            {faq.title}
          </h3>
        </div>
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ml-4 transition-all duration-300 ${
            open
              ? "bg-gradient-to-br from-yellow-500 to-orange-500 text-white"
              : isDark
              ? "bg-white/5 text-gray-500"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {open ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </div>
      </button>
      <div
        className={`overflow-hidden transition-all duration-400 ease-in-out ${
          open ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div
          className={`px-5 pb-5 border-t ${
            isDark ? "border-white/5" : "border-gray-100"
          }`}
        >
          <p
            className={`text-sm leading-relaxed pt-4 ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {faq.text}
          </p>
        </div>
      </div>
    </div>
  )
}

const CookiePolicy: React.FC = () => {
  const { isDark } = useTheme()
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false)
  const [readProgress, setReadProgress] = useState<number>(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight
      setReadProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
      setShowScrollTop(scrollTop > 500)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      {/* Reading Progress */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px]">
        <div
          className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 transition-all duration-100"
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
        {/* ── Hero ── */}
        <div
          className={`relative overflow-hidden ${
            isDark ? "bg-[#0c0c18]" : "bg-white"
          } border-b ${isDark ? "border-white/5" : "border-gray-100"}`}
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className={`absolute -top-24 right-0 w-[700px] h-[700px] rounded-full blur-[140px] ${
                isDark ? "opacity-[0.10]" : "opacity-[0.07]"
              } bg-yellow-500`}
            />
            <div
              className={`absolute bottom-0 -left-24 w-[500px] h-[500px] rounded-full blur-[120px] ${
                isDark ? "opacity-[0.07]" : "opacity-[0.05]"
              } bg-orange-600`}
            />
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
              <div className="hidden sm:flex w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-gradient-to-br from-yellow-500 to-orange-600 items-center justify-center shadow-2xl shadow-yellow-500/20 flex-shrink-0 mt-1">
                <Cookie className="h-8 w-8 md:h-10 md:w-10 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span
                    className={`text-[11px] font-mono uppercase tracking-[0.22em] px-3 py-1 rounded-full border ${
                      isDark
                        ? "text-yellow-400 bg-yellow-500/8 border-yellow-500/15"
                        : "text-yellow-700 bg-yellow-50 border-yellow-200"
                    }`}
                  >
                    Legal Document
                  </span>
                  <span
                    className={`flex items-center gap-1.5 text-xs ${
                      isDark ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    <Clock className="h-3 w-3" />3 min read
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
                  Cookie{" "}
                  <span className="bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent">
                    Policy
                  </span>
                </h1>
                <p
                  className={`text-base md:text-lg max-w-2xl leading-relaxed ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  We use cookies to make KodeKalki work better for you. Here is
                  exactly what we use and why — complete transparency, no
                  surprises.
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
                    {cookieTypes.length} cookie types
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Sidebar */}
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
                    Cookie Types
                  </span>
                </div>
                <nav className="p-3">
                  {cookieTypes.map((cookie, i) => (
                    <a
                      key={cookie.id}
                      href={`#${cookie.id}`}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group mb-0.5 ${
                        isDark
                          ? "text-gray-500 hover:text-gray-200 hover:bg-white/5"
                          : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg bg-gradient-to-br ${cookie.color} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 transition-transform duration-200 group-hover:scale-110`}
                      >
                        {i + 1}
                      </span>
                      <span className="leading-tight text-xs font-medium">
                        {cookie.title}
                      </span>
                    </a>
                  ))}
                </nav>
                <div
                  className={`px-5 py-4 border-t ${
                    isDark ? "border-white/5" : "border-gray-100"
                  }`}
                >
                  <Link
                    to="/settings"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 hover:scale-105 shadow-md shadow-yellow-500/20"
                  >
                    <ToggleRight className="h-3.5 w-3.5" />
                    Manage Preferences
                  </Link>
                </div>
                <div
                  className={`px-5 pb-4`}
                >
                  <p
                    className={`text-[10px] ${
                      isDark ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    Also read:{" "}
                    <Link
                      to="/privacy-policy"
                      className="text-yellow-600 hover:underline"
                    >
                      Privacy
                    </Link>
                    {" · "}
                    <Link
                      to="/terms-of-service"
                      className="text-yellow-600 hover:underline"
                    >
                      Terms
                    </Link>
                  </p>
                </div>
              </div>
            </aside>

            {/* Content */}
            <div className="lg:col-span-3 space-y-4">
              {/* Intro */}
              <div
                className={`rounded-2xl p-5 border-l-[3px] border-l-yellow-500 mb-6 ${
                  isDark
                    ? "bg-yellow-950/10 border border-yellow-500/8"
                    : "bg-yellow-50/60 border border-yellow-100"
                }`}
              >
                <p
                  className={`text-sm leading-relaxed ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  When you use KodeKalki, we place small data files called
                  cookies on your device. This policy explains which cookies we
                  use, what they do, and how you can control them. Questions?
                  Contact us at{" "}
                  <a
                    href="mailto:support@kodekalki.com"
                    className="text-yellow-600 hover:underline font-medium inline-flex items-center gap-1"
                  >
                    support@kodekalki.com
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>

              {/* Cookie Types */}
              <div>
                <h2
                  className={`text-lg font-bold mb-4 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Cookie Types We Use
                </h2>
                <div className="space-y-3">
                  {cookieTypes.map((cookie, index) => (
                    <CookieCard
                      key={cookie.id}
                      cookie={cookie}
                      isDark={isDark}
                      index={index}
                    />
                  ))}
                </div>
              </div>

              {/* FAQ */}
              <div className="pt-4">
                <h2
                  className={`text-lg font-bold mb-4 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Frequently Asked Questions
                </h2>
                <div className="space-y-3">
                  {faqs.map((faq, i) => (
                    <FAQItem
                      key={faq.id}
                      faq={faq}
                      isDark={isDark}
                      index={i}
                    />
                  ))}
                </div>
              </div>

              {/* Manage Preferences CTA */}
              <div
                className={`rounded-2xl border overflow-hidden mt-6 ${
                  isDark
                    ? "bg-gray-900/60 border-white/8"
                    : "bg-white border-gray-200/80 shadow-sm"
                }`}
              >
                <div className="h-1 w-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500" />
                <div className="p-6 md:p-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-yellow-500/20">
                      <ToggleRight className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3
                        className={`text-lg font-semibold mb-1 ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Manage Your Cookie Preferences
                      </h3>
                      <p
                        className={`text-sm ${
                          isDark ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Update your consent preferences at any time from your
                        account settings. Changes take effect immediately.
                      </p>
                    </div>
                    <Link
                      to="/settings"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 text-white text-sm font-semibold hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 hover:scale-105 shadow-lg shadow-yellow-500/20 whitespace-nowrap"
                    >
                      <Settings className="h-4 w-4" />
                      Go to Settings
                    </Link>
                  </div>
                </div>
              </div>

              {/* Contact Card */}
              <div
                className={`rounded-2xl border overflow-hidden ${
                  isDark
                    ? "bg-gray-900/60 border-white/8"
                    : "bg-white border-gray-200/80 shadow-sm"
                }`}
              >
                <div className="p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-yellow-500/20">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`text-lg font-semibold mb-1 ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Cookie Questions?
                    </h3>
                    <p
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      We are happy to explain more about how and why we use
                      cookies.
                    </p>
                  </div>
                  <a
                    href="mailto:support@kodekalki.com"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 text-white text-sm font-semibold hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 hover:scale-105 shadow-lg shadow-yellow-500/20 whitespace-nowrap"
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
                  to="/privacy-policy"
                  className="text-xs text-yellow-600 hover:underline transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/terms-of-service"
                  className="text-xs text-yellow-600 hover:underline transition-colors"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll to Top */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={`fixed bottom-8 right-6 md:right-8 w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 text-white shadow-xl shadow-yellow-500/25 flex items-center justify-center transition-all duration-300 z-40 ${
            showScrollTop
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-4 pointer-events-none"
          } hover:scale-110`}
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>
    </>
  )
}

export default CookiePolicy
