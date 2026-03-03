import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useTheme } from "../contexts/ThemeContext"
import {
  FileText, ArrowLeft, AlertTriangle, CheckCircle,
  XCircle, Scale, Gavel, Mail, ChevronDown, ChevronUp,
  ArrowUp, BookOpen, Clock, ExternalLink, Info
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
  accent: string
  content: ContentItem[]
}

const sections: Section[] = [
  {
    id: "acceptance",
    icon: <CheckCircle className="h-5 w-5" />,
    title: "Acceptance of Terms",
    color: "from-emerald-500 to-green-600",
    bgLight: "bg-emerald-50 border-emerald-100",
    bgDark: "bg-emerald-950/20 border-emerald-500/10",
    accent: "border-l-emerald-500",
    content: [
      {
        subtitle: "Agreement",
        text: "By accessing or using KodeKalki, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.",
      },
      {
        subtitle: "Age Requirement",
        text: "You must be at least 13 years of age to use KodeKalki. By using the platform, you confirm you meet this requirement. Users under 18 may require parental consent in some jurisdictions.",
      },
      {
        subtitle: "Updates to Terms",
        text: "We reserve the right to modify these terms at any time. We will notify users of significant changes via email or platform notification. Continued use after changes constitutes acceptance.",
      },
    ],
  },
  {
    id: "account",
    icon: <CheckCircle className="h-5 w-5" />,
    title: "Account Responsibilities",
    color: "from-blue-500 to-indigo-600",
    bgLight: "bg-blue-50 border-blue-100",
    bgDark: "bg-blue-950/20 border-blue-500/10",
    accent: "border-l-blue-500",
    content: [
      {
        subtitle: "Account Security",
        text: "You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. Notify us immediately of unauthorized access.",
      },
      {
        subtitle: "Accurate Information",
        text: "You agree to provide accurate, current, and complete information when registering and to keep your profile information up to date at all times.",
      },
      {
        subtitle: "One Account Per User",
        text: "Creating multiple accounts to gain unfair advantages in contests, rankings, or coin rewards is strictly prohibited and may result in a permanent ban of all associated accounts.",
      },
    ],
  },
  {
    id: "prohibited",
    icon: <XCircle className="h-5 w-5" />,
    title: "Prohibited Conduct",
    color: "from-red-500 to-rose-600",
    bgLight: "bg-red-50 border-red-100",
    bgDark: "bg-red-950/20 border-red-500/10",
    accent: "border-l-red-500",
    content: [
      {
        subtitle: "Cheating and Plagiarism",
        text: "Sharing contest solutions during live contests, plagiarizing code, using unauthorized tools or AI assistants during timed assessments is strictly prohibited and may result in disqualification.",
      },
      {
        subtitle: "Platform Abuse",
        text: "Attempting to hack, scrape, disrupt, or gain unauthorized access to the platform, its servers, databases, or other user accounts will result in immediate termination and potential legal action.",
      },
      {
        subtitle: "Harassment",
        text: "Harassing, threatening, or discriminating against other users in any form including in discussion forums, game chat, or profile comments is not tolerated under any circumstances.",
      },
    ],
  },
  {
    id: "ip",
    icon: <Scale className="h-5 w-5" />,
    title: "Intellectual Property",
    color: "from-violet-500 to-purple-600",
    bgLight: "bg-violet-50 border-violet-100",
    bgDark: "bg-violet-950/20 border-violet-500/10",
    accent: "border-l-violet-500",
    content: [
      {
        subtitle: "Platform Content",
        text: "All problems, editorial solutions, platform code, design, and content are the exclusive property of KodeKalki. Reproduction or distribution without prior written permission is prohibited.",
      },
      {
        subtitle: "Your Submissions",
        text: "You retain full ownership of the code you write. By submitting solutions, you grant KodeKalki a non-exclusive license to use anonymized and aggregated data solely for platform improvement.",
      },
      {
        subtitle: "Feedback",
        text: "Any feedback, bug reports, or feature suggestions you provide may be used by KodeKalki to improve the platform without any obligation or compensation to you.",
      },
    ],
  },
  {
    id: "disclaimers",
    icon: <AlertTriangle className="h-5 w-5" />,
    title: "Disclaimers and Liability",
    color: "from-amber-500 to-orange-500",
    bgLight: "bg-amber-50 border-amber-100",
    bgDark: "bg-amber-950/20 border-amber-500/10",
    accent: "border-l-amber-500",
    content: [
      {
        subtitle: "Service Availability",
        text: "KodeKalki is provided as-is without warranties of any kind. We do not guarantee uninterrupted service and may perform maintenance, updates, or experience downtime at any time.",
      },
      {
        subtitle: "Limitation of Liability",
        text: "KodeKalki shall not be liable for any indirect, incidental, special, or consequential damages arising from the use or inability to use the platform, even if advised of such possibilities.",
      },
      {
        subtitle: "Third-Party Links",
        text: "The platform may contain links to third-party websites and learning resources. We are not responsible for the content, privacy practices, or reliability of those external sites.",
      },
    ],
  },
  {
    id: "termination",
    icon: <Gavel className="h-5 w-5" />,
    title: "Termination and Governing Law",
    color: "from-gray-600 to-slate-700",
    bgLight: "bg-gray-50 border-gray-200",
    bgDark: "bg-gray-800/30 border-gray-500/10",
    accent: "border-l-gray-500",
    content: [
      {
        subtitle: "Account Termination",
        text: "We reserve the right to suspend or terminate accounts that violate these terms, with or without prior notice, at our sole discretion. Users may also delete their accounts at any time.",
      },
      {
        subtitle: "Governing Law",
        text: "These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Jurisdiction is Uttar Pradesh, India.",
      },
      {
        subtitle: "Dispute Resolution",
        text: "Any disputes arising from these Terms will first be attempted to be resolved through good-faith negotiation. Unresolved disputes will be subject to binding arbitration per Indian law.",
      },
    ],
  },
]

interface AccordionProps {
  section: Section
  isDark: boolean
  index: number
}

const AccordionSection: React.FC<AccordionProps> = ({
  section,
  isDark,
  index,
}) => {
  const [open, setOpen] = useState<boolean>(index === 0)

  return (
    <div
      id={section.id}
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
        className="w-full flex items-center justify-between p-5 md:p-6 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-2xl"
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
              Clause {String(index + 1).padStart(2, "0")}
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
                className={`rounded-xl p-4 border border-l-[3px] ${section.accent} transition-all duration-200 ${
                  isDark ? section.bgDark : section.bgLight
                }`}
              >
                <h4
                  className={`font-semibold text-sm mb-1.5 ${
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
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const TermsOfService: React.FC = () => {
  const { isDark } = useTheme()
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false)
  const [readProgress, setReadProgress] = useState<number>(0)
  const [activeSection, setActiveSection] = useState<string>("acceptance")

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight
      setReadProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
      setShowScrollTop(scrollTop > 500)

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

  return (
    <>
      {/* Reading Progress */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px]">
        <div
          className="h-full bg-gradient-to-r from-orange-500 via-red-500 to-rose-600 transition-all duration-100"
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
              } bg-orange-600`}
            />
            <div
              className={`absolute bottom-0 -left-24 w-[500px] h-[500px] rounded-full blur-[120px] ${
                isDark ? "opacity-[0.07]" : "opacity-[0.05]"
              } bg-red-600`}
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
              <div className="hidden sm:flex w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 items-center justify-center shadow-2xl shadow-orange-500/20 flex-shrink-0 mt-1">
                <FileText className="h-8 w-8 md:h-10 md:w-10 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span
                    className={`text-[11px] font-mono uppercase tracking-[0.22em] px-3 py-1 rounded-full border ${
                      isDark
                        ? "text-orange-400 bg-orange-500/8 border-orange-500/15"
                        : "text-orange-600 bg-orange-50 border-orange-200"
                    }`}
                  >
                    Legal Document
                  </span>
                  <span
                    className={`flex items-center gap-1.5 text-xs ${
                      isDark ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    <Clock className="h-3 w-3" />7 min read
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
                  Terms of{" "}
                  <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                    Service
                  </span>
                </h1>
                <p
                  className={`text-base md:text-lg max-w-2xl leading-relaxed ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Please read these terms carefully. They govern your access to
                  and use of KodeKalki and constitute a binding legal agreement
                  between you and us.
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
                    {sections.length} clauses
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
                    Clauses
                  </span>
                </div>
                <nav className="p-3" aria-label="Document clauses">
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
                      to="/privacy-policy"
                      className="text-orange-500 hover:underline"
                    >
                      Privacy
                    </Link>
                    {" · "}
                    <Link
                      to="/cookie-policy"
                      className="text-orange-500 hover:underline"
                    >
                      Cookies
                    </Link>
                  </p>
                </div>
              </div>
            </aside>

            {/* Content */}
            <div className="lg:col-span-3 space-y-4">
              {/* Important notice */}
              <div
                className={`rounded-2xl p-4 mb-6 flex items-start gap-3 border-l-[3px] border-l-orange-500 ${
                  isDark
                    ? "bg-orange-950/15 border border-orange-500/8"
                    : "bg-orange-50/70 border border-orange-100"
                }`}
              >
                <Info
                  className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                    isDark ? "text-orange-400" : "text-orange-500"
                  }`}
                />
                <p
                  className={`text-sm leading-relaxed ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  These Terms of Service constitute a legally binding agreement
                  between you and KodeKalki. By accessing or using our platform,
                  you confirm that you have read, understood, and agree to be
                  bound by these terms and our{" "}
                  <Link
                    to="/privacy-policy"
                    className="text-orange-500 hover:underline font-medium inline-flex items-center gap-1"
                  >
                    Privacy Policy
                    <ExternalLink className="h-3 w-3" />
                  </Link>
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
                <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-red-500 to-rose-600" />
                <div className="p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`text-lg font-semibold mb-1 ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Legal Questions?
                    </h3>
                    <p
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Our team responds to legal inquiries within 48 business
                      hours.
                    </p>
                  </div>
                  <a
                    href="mailto:support@kodekalki.com"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-300 hover:scale-105 shadow-lg shadow-orange-500/20 whitespace-nowrap"
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
                  className="text-xs text-orange-500 hover:underline transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/cookie-policy"
                  className="text-xs text-orange-500 hover:underline transition-colors"
                >
                  Cookie Policy
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll to Top */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={`fixed bottom-8 right-6 md:right-8 w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-xl shadow-orange-500/25 flex items-center justify-center transition-all duration-300 z-40 ${
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

export default TermsOfService
