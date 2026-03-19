"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "../contexts/AuthContext"
import axios from "axios"
import { showError, showSuccess } from '../utils/toast';
import {
  Play,
  Send,
  Clock,
  MemoryStickIcon as Memory,
  CheckCircle,
  XCircle,
  BookOpen,
  Video,
  Code,
  FileText,
  MessageSquare,
  Bot,
  User,
  Copy,
  Maximize2,
  Minimize2,
  History,
  Plus,
  ArrowLeft,
  Zap,
  GraduationCap,
  Settings,
  Trophy,
  Flag,
} from "lucide-react"
import CodeMirrorEditor from "../components/CodeMirrorEditor"
import { API_URL } from "../config/api"
import ReportModal from "../components/ReportModal";
import ProblemSolutions from "../components/ProblemSolutions";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";
import { useParams, useNavigate } from "react-router-dom"


interface Problem {
  _id: string
  title: string
  description: string
  difficulty: string
  tags: string[]
  companies: string[]
  constraints: string
  examples: {
    input: string
    output: string
    explanation: string
  }[]
  testCases: {
    input: string
    output: string
    isPublic: boolean
  }[]
  acceptanceRate: number
  submissions: number
  accepted: number
  editorial?: {
    written?: string
    videoUrl?: string
    thumbnailUrl?: string
    duration?: number
  }
  codeTemplates?: Record<string, string>
}

interface Submission {
  _id: string
  status: string
  language: string
  runtime: number
  memory: number
  date: string
  code?: string
}

interface Solution {
  language: string
  completeCode: string
}

interface RunResult {
  status: string
  passedTests: number
  totalTests: number
  testResults: {
    input: string
    expectedOutput: string
    actualOutput: string
    passed: boolean
    executionTime: number
    memory: number
  }[]
  executionTime: number
  memory: number
  error?: string
  potd?: {
    awarded: boolean
    coinsEarned: number
    totalCoins: number
    reason: string
  }
}

function AnimatedAiResponse({ response }: { response: string }) {
  const [displayed, setDisplayed] = useState("")

  useEffect(() => {
    let i = 0
    setDisplayed("")
    const interval = setInterval(() => {
      if (i < response.length - 1) {
        setDisplayed((prev) => prev + response[i])
        i++
      } else {
        clearInterval(interval)
      }
    }, 12)

    return () => clearInterval(interval)
  }, [response])

  return (
    <div className="flex justify-start">
      <div className="max-w-3xl bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-gray-100 p-3 rounded-xl shadow-md">
        <div className="flex items-center mb-1">
          <Bot className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium">AI Assistant</span>
        </div>
        <div
          className="text-sm whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{
            __html: displayed.replace(
              /\*\*(.*?)\*\*/g,
              "<strong class='font-bold text-gray-900 dark:text-gray-100'>$1</strong>",
            ),
          }}
        />
      </div>
    </div>
  )
}

const ProblemDetail: React.FC = () => {
  // Reset code to starting template from DB
  const handleResetCode = () => {
    if (problem?.codeTemplates && language in problem.codeTemplates) {
      setCode(problem.codeTemplates[language] || "")
    }
  }
  const { id } = useParams<{ id: string }>()
  const { user, token, updateCoins } = useAuth()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState("cpp")
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [submissionResult, setSubmissionResult] = useState<RunResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("description")
  const [editorial, setEditorial] = useState<any>(null)
  const [showSettings, setShowSettings] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [solutions, setSolutions] = useState<Solution[]>([])
  // selectedSolutionLanguage removed — solutions tab handles language internally
  // Separate state for admin reference solutions — Editorial tab only
  const [referenceSolutions, setReferenceSolutions] = useState<Solution[]>([])
  const [selectedRefLanguage, setSelectedRefLanguage] = useState<string>("cpp")
  const [isSolved, setIsSolved] = useState(false)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<{ prompt: string; response: string }[]>([])
  const [isAiMaximized, setIsAiMaximized] = useState(false)
  const [isCodeEditorMaximized, setIsCodeEditorMaximized] = useState(false)
  const chatHistoryRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate();
  // New state variables for complexity analysis
  const [isComplexityAiMaximized, setIsComplexityAiMaximized] = useState(false);
  const [complexityCodeInput, setComplexityCodeInput] = useState("");
  const [complexityAiResponse, setComplexityAiResponse] = useState("");
  const [complexityAiLoading, setComplexityAiLoading] = useState(false);
  // New state variable for visualizer
  const [isVisualizerMaximized, setIsVisualizerMaximized] = useState(false);
  // Console output ref for auto-scrolling
  const consoleOutputRef = useRef<HTMLDivElement>(null);
  // Active test case tab states
  const [activeTestCaseTab, setActiveTestCaseTab] = useState(0);
  // Result card overlay states
  const [showResultCard, setShowResultCard] = useState(false);
  const [resultCardData, setResultCardData] = useState<{
    type: 'success' | 'failure';
    title: string;
    message: string;
    testCases: { passed: number; total: number };
    executionTime?: number;
    memory?: number;
    coinsEarned?: number;
    solveTime?: number;  // seconds taken by timer
  } | null>(null);

  // ✅ NEW: Mobile panel toggle — switch between problem & editor on mobile
  const [mobileActivePanel, setMobileActivePanel] = useState<'problem' | 'editor'>('problem');
  // Best solve time saved in localStorage
  const [bestSolveTime, setBestSolveTime] = useState<number | null>(() => {
    const saved = localStorage.getItem(`best_time_${id}`);
    return saved ? parseInt(saved) : null;
  });
  // ✅ Console open/close state — auto-opens on run/submit
  const [consoleOpen, setConsoleOpen] = useState(false);
  // LeetCode-style console tab: 'testcase' | 'result'
  const [consoleTab, setConsoleTab] = useState<'testcase' | 'result'>('testcase');
  // active test case in console
  const [consoleTestCaseIdx, setConsoleTestCaseIdx] = useState(0);

  // ── Auto-save ── (silent background save, no UI indicator)

  // ── Notes ──
  const [notes, setNotes] = useState<string>("");
  const [notesOpen, setNotesOpen] = useState(false);

  // ── Timer state ──
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerVisible, setTimerVisible] = useState(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ✅ Convert any YouTube/Vimeo URL to embeddable format
  const getEmbedUrl = (url: string): string => {
    if (!url) return '';
    if (url.includes('youtube.com/embed/') || url.includes('player.vimeo.com')) return url;
    const watchMatch = url.match(/youtube\.com\/watch\?v=([^&\s]+)/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
    const shortMatch = url.match(/youtu\.be\/([^?\s]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTo({
        top: chatHistoryRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [chatHistory, aiResponse, isAiMaximized]);

  // Auto-scroll to console output when results are available
  useEffect(() => {
    if ((runResult || submissionResult) && consoleOutputRef.current) {
      setTimeout(() => {
        consoleOutputRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  }, [runResult, submissionResult]);


  // Scroll to console/bottom of page
  const scrollToBottom = () => {
    if (consoleOutputRef.current) {
      consoleOutputRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    } else {
      window.scrollTo({ 
        top: document.body.scrollHeight, 
        behavior: 'smooth' 
      });
    }
  }

  // Show result card overlay
  const showResultCardWithData = (data: {
    type: 'success' | 'failure';
    title: string;
    message: string;
    testCases: { passed: number; total: number };
    executionTime?: number;
    memory?: number;
    coinsEarned?: number;
    solveTime?: number;
  }) => {
    setResultCardData(data);
    setShowResultCard(true);
  }

  const [allChatHistory, setAllChatHistory] = useState<
    {
      sessionId: string
      problemId: string
      problemTitle: string
      date: string
      lastMessage: string
      messageCount: number
      updatedAt: string
    }[]
  >([])
  const [selectedHistorySession, setSelectedHistorySession] = useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string>("")
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Predefined quick prompts
  const quickPrompts = [
    "What's the optimal approach to solve this problem?",
    "What data structures should I use?",
    "Can you explain the algorithm with time complexity?",
    "What are the edge cases I should consider?",
    "How can I optimize my solution?",
    "Explain the problem with an example",
    "What are common mistakes to avoid?",
  ]

  // Generate contextual prompts based on problem
  const getContextualPrompts = () => {
    if (!problem) return quickPrompts

    const contextualPrompts = [...quickPrompts]

    if (problem.difficulty === "Hard") {
      contextualPrompts.push("Break down this complex problem into smaller subproblems")
      contextualPrompts.push("What advanced algorithms are applicable here?")
    } else if (problem.difficulty === "Easy") {
      contextualPrompts.push("What's the simplest approach to solve this?")
    }

    if (problem.tags?.includes("Dynamic Programming")) {
      contextualPrompts.push("How can I identify the DP pattern here?")
      contextualPrompts.push("What's the recurrence relation?")
    }
    if (problem.tags?.includes("Graph")) {
      contextualPrompts.push("Should I use DFS or BFS for this graph problem?")
    }
    if (problem.tags?.includes("Tree")) {
      contextualPrompts.push("What tree traversal method should I use?")
    }
    if (problem.tags?.includes("Array")) {
      contextualPrompts.push("Are there any array manipulation techniques I should consider?")
    }

    return contextualPrompts
  }

  // Load chat history from database
  useEffect(() => {
    if (user) {
      loadUserChatHistory()
    }
  }, [user])

  // Generate unique session ID
  const generateSessionId = () => {
    return `${problem?._id}_${user?.username}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Initialize session when problem loads
  useEffect(() => {
    if (problem && user && !currentSessionId) {
      setCurrentSessionId(generateSessionId())
    }
  }, [problem, user])

  // Load user's chat history from database
  const loadUserChatHistory = async () => {
    try {
      setLoadingHistory(true)
      const response = await axios.get(`${API_URL}/chat/history`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      setAllChatHistory(response.data)
    } catch (error) {
      import.meta.env.DEV && console.error("Error loading chat history:", error)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Save chat message to database
  const saveChatMessage = async (prompt: string, response: string) => {
    try {
      const sessionId = currentSessionId || generateSessionId()
      if (!currentSessionId) {
        setCurrentSessionId(sessionId)
      }

      await axios.post(
        `${API_URL}/chat/save`,
        {
          sessionId,
          problemId: problem?._id,
          problemTitle: problem?.title,
          prompt,
          response,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      )

      loadUserChatHistory()
    } catch (error) {
      import.meta.env.DEV && console.error("Error saving chat message:", error)
    }
  }

  // Load a previous chat session
  const loadChatSession = async (sessionId: string) => {
    try {
      setLoadingHistory(true)
      const response = await axios.get(`${API_URL}/chat/session/${sessionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      const session = response.data
      setChatHistory(session.messages || [])
      setSelectedHistorySession(sessionId)
      setCurrentSessionId(sessionId)
      setAiResponse(session.messages?.length > 0 ? session.messages[session.messages.length - 1].response : "")
    } catch (error) {
      import.meta.env.DEV && console.error("Error loading chat session:", error)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Clear current chat and start fresh
  const startNewChat = () => {
    setChatHistory([])
    setAiResponse("")
    setSelectedHistorySession(null)
    setCurrentSessionId(generateSessionId())
  }

  const toggleAiMaximized = () => {
    setIsAiMaximized(!isAiMaximized)
  }

  const toggleCodeEditorMaximized = () => {
    setIsCodeEditorMaximized(!isCodeEditorMaximized)
  }

  const toggleComplexityAiMaximized = () => {
    setIsComplexityAiMaximized(!isComplexityAiMaximized);
    if (!isComplexityAiMaximized) {
      setComplexityCodeInput(code);
      setComplexityAiResponse("");
    }
  };

  const toggleVisualizerMaximized = () => {
    setIsVisualizerMaximized(!isVisualizerMaximized);
  };

  const handleDsaVisualizerClick = () => {
    setIsVisualizerMaximized(true);
  };

 const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    showSuccess("Code copied to clipboard!");
  } catch (err) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      showSuccess("Code copied to clipboard!");
    } catch {
      showError("Failed to copy code");
    }
    document.body.removeChild(textArea);
  }
};

  useEffect(() => {
    if (id) {
      fetchProblem()
      if (user) {
        checkIfSolved()
      }
    }
  }, [id, user])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => prev + 1)
        if (tabSwitchCount >= 2) {
          toast("⚠️ Tab switching detected! This may affect your submission.", { icon: "🚨", style: { borderRadius: "10px", background: "#333", color: "#fff" } })
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [tabSwitchCount])



  // Timer logic
  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerRunning]);

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const handleTimerToggle = () => {
    if (!timerVisible) {
      setTimerVisible(true);
      setTimerRunning(true);
      setTimerSeconds(0);
    } else {
      setTimerRunning(p => !p);
    }
  };

  const handleTimerReset = () => {
    setTimerSeconds(0);
    setTimerRunning(false);
    setTimerVisible(false);
  };

  // ── Auto-save: save code every 30s ──
  useEffect(() => {
    if (!id || !code) return;
    const interval = setInterval(() => {
      localStorage.setItem(`code_${id}_${language}`, code);
    }, 30000);
    return () => clearInterval(interval);
  }, [code, id, language]);

  // ── Auto-save: also save on code change (debounced 2s) ──
  useEffect(() => {
    if (!id || !code) return;
    const timeout = setTimeout(() => {
      localStorage.setItem(`code_${id}_${language}`, code);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [code, id, language]);

  // ── Notes: save on change (debounced 1s) ──
  useEffect(() => {
    if (!id) return;
    const timeout = setTimeout(() => {
      localStorage.setItem(`notes_${id}`, notes);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [notes, id]);

  const fetchProblem = async () => {
    try {
      const response = await axios.get(`${API_URL}/problems/${id}`)
      setProblem(response.data)
      // ✅ Auto-save: restore saved code if exists, else use template
      const savedCode = localStorage.getItem(`code_${id}_${language}`)
      if (savedCode !== null) {
        setCode(savedCode)
      } else {
        setCode(response.data.codeTemplates?.[language] || "")
      }
      // ✅ Notes: restore saved notes
      const savedNotes = localStorage.getItem(`notes_${id}`)
      if (savedNotes) setNotes(savedNotes)
    } catch (error) {
      showError("Failed to load problem details");
    } finally {
      setLoading(false)
    }
  }

  const generateResponse = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a prompt.", {
        icon: "💡",
        style: { borderRadius: "10px", background: "#333", color: "#fff" },
      });
      return
    }

    if (!token) {
      toast.error("Please login to use AI chat feature.", {
        icon: "🔑",
        style: { borderRadius: "10px", background: "#333", color: "#fff" },
      });
      return
    }

    if (!problem) {
      toast.error("Problem data not loaded yet. Please wait.", {
        icon: "⏳",
        style: { borderRadius: "10px", background: "#333", color: "#fff" },
      });
      return
    }

    setAiLoading(true)
    setAiResponse("")

    try {
      const examplesText = problem.examples
      .map((ex, i) => `Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}\nExplanation: ${ex.explanation || ""}`)
      .join("\n\n");

    const context = `
    Here is the problem statement:
    Title: ${problem.title}
    Description: ${problem.description}
    Constraints: ${problem.constraints}
    Examples:
    ${examplesText}
    
    INSTRUCTION:
    - DO NOT use Markdown symbols like "**", "__", "*", or "\`\`\`".
    - DO NOT format code using triple backticks or indentation blocks.
    - WHENEVER you give a code block:
      - First write: PYTHON CODE (or the language name)
      - Then leave one line
      - Then, write the code on a new line, plain text, no formatting
      - After code , if there is further text , again leave one line
      - Wrap code between comment lines like:
    PYTHON CODE

    // START OF CODE
    (code goes here)
    // END OF CODE

    - Everything else should be in plain readable text.
    
    User question: ${aiPrompt}
    `.trim();

      let chatHistoryForGemini = [];
      chatHistoryForGemini.push({ role: "user", parts: [{ text: context }] });
      const payload = { contents: chatHistoryForGemini };
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      let generatedText = "No response received.";
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        generatedText = result.candidates[0].content.parts[0].text;
      }

      setAiResponse(generatedText)

      const newChatEntry = {
        prompt: aiPrompt,
        response: generatedText,
      }

      setChatHistory((prev) => [...prev, newChatEntry])

      requestAnimationFrame(() => {
        const container = chatHistoryRef.current
        if (!container) return
        const scrollTarget = container.scrollHeight - container.clientHeight / 2
        container.scrollTo({ top: scrollTarget, behavior: "smooth" })
      })

      await saveChatMessage(aiPrompt, generatedText)
      setAiPrompt("")
    } catch (error: any) {
      import.meta.env.DEV && console.error("AI Error:", error);
      if (error.response?.status === 429 || error.response?.data?.error?.includes("quota")) {
        toast.error("🚫 API quota exceeded! Please try again later.", {
          icon: "⚠️",
          duration: 7000,
          style: { borderRadius: "10px", background: "#1f2937", color: "#fff" },
        });
      } else {
        setAiResponse("Something went wrong while generating the response.");
      }
    } finally {
      setAiLoading(false)
    }
  }

  // Function to generate complexity analysis
  const generateComplexityAnalysis = async () => {
    if (!complexityCodeInput.trim()) {
      toast.error("Please enter code to analyze.", {
        icon: "✍️",
        style: { borderRadius: "10px", background: "#333", color: "#fff" },
      });
      return;
    }

    if (!token) {
      toast.error("Please login to use AI analysis feature.", {
        icon: "🔑",
        style: { borderRadius: "10px", background: "#333", color: "#fff" },
      });
      return;
    }

    setComplexityAiLoading(true);
    setComplexityAiResponse("");

    try {
      const prompt = `Analyze the time and space complexity of the following code. Provide the complexities in Big O notation and a brief 3-4 line justification for each.

      Code:
      \`\`\`${language}
      ${complexityCodeInput}
      \`\`\``;

      let chatHistoryForGemini = [];
      chatHistoryForGemini.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistoryForGemini };
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      let generatedText = "Failed to get a response from the AI. Please try again.";
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        generatedText = result.candidates[0].content.parts[0].text;
      }

      setComplexityAiResponse(generatedText);

      requestAnimationFrame(() => {
        if (bottomRef.current) {
          bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
      });

    } catch (error) {
      import.meta.env.DEV && console.error("Complexity AI Error:", error);
      toast.error("Something went wrong while analyzing complexity.", {
        icon: "❌",
        style: { borderRadius: "10px", background: "#333", color: "#fff" },
      });
      setComplexityAiResponse("Error analyzing complexity. Please try again.");
    } finally {
      setComplexityAiLoading(false);
    }
  };


  const checkIfSolved = async () => {
    if (!user || !id || !token) return

    try {
      const response = await axios.get(`${API_URL}/profile/${user.username}/solved`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const solvedProblems = response.data.solvedProblems
      setIsSolved(solvedProblems.some((p: any) => p._id === id))
    } catch (error) {
      import.meta.env.DEV && console.error("Error checking solved status:", error)
    }
  }

  const fetchEditorial = async () => {
    try {
      const response = await axios.get(`${API_URL}/problems/${id}/editorial`)
      setEditorial(response.data.editorial)
    } catch (error) {
      import.meta.env.DEV && console.error("Error fetching editorial:", error)
    }
  }

  const fetchSubmissions = async () => {
    if (!user || !token) return

    try {
      const response = await axios.get(`${API_URL}/problems/${id}/submissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      setSubmissions(response.data.submissions)
    } catch (error) {
      import.meta.env.DEV && console.error("Error fetching submissions:", error)
    }
  }

  const fetchSolutions = async () => {
    try {
      const response = await axios.get(`${API_URL}/problems/${id}/solutions`)
      const fetchedSolutions = response.data.solutions;
      setSolutions(fetchedSolutions);
      
      if (fetchedSolutions.length > 0) {
        const availableLanguages = ['cpp', 'java', 'python', 'c'];
        const firstAvailable = availableLanguages.find(lang => 
          fetchedSolutions.some((sol: Solution) => sol.language === lang)
        );
        if (firstAvailable) {
        }
      }
    } catch (error) {
      import.meta.env.DEV && console.error("Error fetching solutions:", error)
    }
  }

  // Fetch admin reference solutions for Editorial tab only
  const fetchReferenceSolutions = async () => {
    try {
      const response = await axios.get(`${API_URL}/problems/${id}/solutions`)
      const fetched = response.data.solutions
      setReferenceSolutions(fetched)
      if (fetched.length > 0) {
        const availableLanguages = ['cpp', 'java', 'python', 'c']
        const firstAvailable = availableLanguages.find((lang: string) =>
          fetched.some((sol: Solution) => sol.language === lang)
        )
        if (firstAvailable) setSelectedRefLanguage(firstAvailable)
      }
    } catch (error) {
      import.meta.env.DEV && console.error("Error fetching reference solutions:", error)
    }
  }

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage)
    if (problem?.codeTemplates) {
      setCode(problem.codeTemplates[newLanguage] || "")
    } else {
      setCode("")
    }
  }

  const [editorSettings, setEditorSettings] = useState({
    tabSize: 4,
    insertSpaces: true,
    fontSize: 14,
    lineNumbers: true,
    wordWrap: false,
  });

  const [tempEditorSettings, setTempEditorSettings] = useState({
    tabSize: 4,
    insertSpaces: true,
    fontSize: 14,
    lineNumbers: true,
    wordWrap: false,
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('editorSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setEditorSettings(settings);
      setTempEditorSettings(settings);
    }
  }, []);

  const handleApplySettings = () => {
    setEditorSettings(tempEditorSettings);
    localStorage.setItem('editorSettings', JSON.stringify(tempEditorSettings));
    setShowSettings(false);
  };

  const handleCloseSettings = () => {
    setTempEditorSettings(editorSettings);
    setShowSettings(false);
  };

  const handleOpenSettings = () => {
    setTempEditorSettings(editorSettings);
    setShowSettings(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSettings && event.target instanceof Element) {
        const settingsDropdown = document.querySelector('.settings-dropdown');
        const settingsButton = document.querySelector('.settings-button');
        
        if (settingsDropdown && !settingsDropdown.contains(event.target) && 
            settingsButton && !settingsButton.contains(event.target)) {
          handleCloseSettings();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettings, editorSettings]);

  const handleRun = async () => {
    if (!code.trim()) {
      toast.error("Please write some code before running!", {
        icon: "✍️",
        style: { borderRadius: "10px", background: "#333", color: "#fff" },
      });
      return
    }

    if (!token) {
      toast.error("Please login to run code.", {
        icon: "🔑",
        style: { borderRadius: "10px", background: "#333", color: "#fff" },
      });
      return
    }

    setRunning(true)
    setRunResult(null)
    // ✅ auto-switch to editor panel on mobile + open console
    setMobileActivePanel('editor')
    setConsoleOpen(true)

    try {
      const response = await axios.post(
        `${API_URL}/problems/${id}/run`,
        { code, language },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      )
      setRunResult(response.data)
    } catch (error: any) {
      showError("Failed to run code: " + (error.response?.data?.message || "Please try again"));
      if (error.response?.status === 401) {
        toast.error("Authentication failed. Please login again.", {
          icon: "🔒",
          style: { borderRadius: "10px", background: "#333", color: "#fff" },
        });
        return
      }
      setRunResult({
        status: "Error",
        passedTests: 0,
        totalTests: 0,
        testResults: [],
        executionTime: 0,
        memory: 0,
        error: error.response?.data?.error || "Failed to run code",
      })
    } finally {
      setRunning(false)
    }
  }

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error("Please write some code before submitting!", {
        icon: "✍️",
        style: { borderRadius: "10px", background: "#333", color: "#fff" },
      });
      return
    }

    if (!token) {
      toast.error("Please login to submit solutions.", {
        icon: "🔑",
        style: { borderRadius: "10px", background: "#333", color: "#fff" },
      });
      return
    }

    setSubmitting(true)
    setSubmissionResult(null)
    // ✅ auto-switch to editor panel on mobile + open console
    setMobileActivePanel('editor')
    setConsoleOpen(true)

    try {
      const response = await axios.post(
        `${API_URL}/problems/${id}/submit`,
        { code, language },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      )

      setSubmissionResult(response.data)

      if (response.data.status === "Accepted") {
        setIsSolved(true);

        // ✅ Timer: stop timer and save solve time
        let solvedInSeconds: number | undefined = undefined;
        if (timerVisible && timerSeconds > 0) {
          setTimerRunning(false);
          solvedInSeconds = timerSeconds;
          // Save best time to localStorage
          const prevBest = localStorage.getItem(`best_time_${id}`);
          const prevBestNum = prevBest ? parseInt(prevBest) : Infinity;
          if (timerSeconds < prevBestNum) {
            localStorage.setItem(`best_time_${id}`, String(timerSeconds));
            setBestSolveTime(timerSeconds);
          }
        }

        showResultCardWithData({
          type: 'success',
          title: '🎉 Solution Accepted!',
          message: 'Congratulations! Your solution passed all test cases.',
          testCases: {
            passed: response.data.passedTests || 0,
            total: response.data.totalTests || 0
          },
          executionTime: response.data.executionTime,
          memory: response.data.memory,
          coinsEarned: response.data.potd?.awarded ? response.data.potd.coinsEarned : undefined,
          solveTime: solvedInSeconds,
        });

        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 999999 };

        const confettiInterval = setInterval(function () {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) {
            clearInterval(confettiInterval);
            return;
          }
          const particleCount = 50 * (timeLeft / duration);
          confetti(Object.assign({}, defaults, { particleCount, origin: { x: Math.random(), y: Math.random() * 0.6 } }));
        }, 250);

        toast.success("🎉 Solution Accepted!", {
          icon: "✅",
          duration: 5000,
          style: { borderRadius: "10px", background: "#333", color: "#fff" },
        });

        if (response.data.potd && response.data.potd.awarded) {
          updateCoins(response.data.potd.totalCoins);
        }
      } else {
        showResultCardWithData({
          type: 'failure',
          title: '❌ Solution Failed',
          message: 'Your solution didn\'t pass all test cases. Keep trying!',
          testCases: {
            passed: response.data.passedTests || 0,
            total: response.data.totalTests || 0
          },
          executionTime: response.data.executionTime,
          memory: response.data.memory
        });
      }

      if (activeTab === "submissions") {
        fetchSubmissions()
      }
    } catch (error: any) {
      showError("Submission failed: " + (error.response?.data?.message || "Please try again"));
      if (error.response?.status === 401) {
        toast.error("Authentication failed. Please login again.", {
          icon: "🔒",
          style: { borderRadius: "10px", background: "#333", color: "#fff" },
        });
        return
      }
      setSubmissionResult({
        status: "Error",
        passedTests: 0,
        totalTests: 0,
        testResults: [],
        executionTime: 0,
        memory: 0,
        error: error.response?.data?.error || "Submission failed",
      })

      showResultCardWithData({
        type: 'failure',
        title: '❌ Submission Error',
        message: 'There was an error submitting your solution. Please try again.',
        testCases: { passed: 0, total: 0 }
      });
    } finally {
      setSubmitting(false)
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab === "editorial") {
      if (!editorial) fetchEditorial()
      if (referenceSolutions.length === 0) fetchReferenceSolutions()
    } else if (tab === "submissions" && submissions.length === 0) {
      fetchSubmissions()
    } else if (tab === "solutions" && solutions.length === 0) {
      fetchSolutions()
    }
  }

  const handleSubmissionClick = (submission: Submission) => {
    setSelectedSubmission(submission)
    if (submission.code) {
      setCode(submission.code)
      setLanguage(submission.language)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800"
      case "Medium":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800"
      case "Hard":
        return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800"
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Accepted":
      case "Success":
        return "text-green-600 dark:text-green-400"
      case "Wrong Answer":
      case "Failed":
      case "Compilation Error":
      case "Error":
        return "text-red-600 dark:text-red-400"
      default:
        return "text-gray-600 dark:text-gray-400"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Accepted":
      case "Success":
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      case "Wrong Answer":
      case "Failed":
      case "Compilation Error":
      case "Error":
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      default:
        return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 animate-pulse">Loading problem details...</p>
        </div>
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 transition-colors duration-200">
        <div className="text-center bg-white dark:bg-gray-850 p-8 rounded-lg shadow-lg border border-gray-200 dark:border-gray-750">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Problem not found</h2>
          <p className="text-gray-600 dark:text-gray-400">
            The problem you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    )
  }

  // Maximized Code Editor View
  if (isCodeEditorMaximized) {
    return (
      <div className="fixed inset-0 bg-gray-100 dark:bg-gray-950 mt-[64px] flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-750 px-6 py-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Code className="h-6 w-6 mr-3 text-emerald-500" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{problem.title}</h1>
                <div className="flex items-center space-x-4 mt-1">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(problem.difficulty)}`}>
                    {problem.difficulty}
                  </span>
                  {isSolved && (
                    <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Solved
                    </span>
                  )}
                  <span className="text-gray-600 dark:text-gray-400 text-sm">
                    Acceptance: {problem.acceptanceRate.toFixed(2)}% ({problem.submissions} submissions)
                  </span>
                  {user && (
                    <button
                      onClick={() => setShowReportModal(true)}
                      title="Report this problem"
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-red-300/40 text-red-400 hover:bg-red-500/10 hover:border-red-400 transition-colors"
                    >
                      <Flag className="h-3 w-3" />
                      Report
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRun}
                  disabled={running || !token}
                  className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                >
                  {running ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>Running...</>
                  ) : (
                    <><Play className="h-4 w-4 mr-2" />Run</>
                  )}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !token}
                  className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  {submitting ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>Submitting...</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" />Submit</>
                  )}
                </button>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                >
                  <option value="cpp">C++20</option>
                  <option value="java">Java</option>
                  <option value="python">Python</option>
                  <option value="c">C</option>
                </select>
                {(runResult || submissionResult) && (
                  <button
                    onClick={() => { setRunResult(null); setSubmissionResult(null); }}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
                  >
                    Clear Results
                  </button>
                )}
              </div>
              <button
                onClick={toggleCodeEditorMaximized}
                className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium ml-2"
              >
                <Minimize2 className="h-5 w-5 mr-2" />
                Minimize
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Code Editor */}
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-850 border-r border-gray-200 dark:border-gray-750">
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
              {tabSwitchCount > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                    ⚠️ Tab switching detected ({tabSwitchCount} times). This may affect your submission.
                  </p>
                </div>
              )}
              {selectedSubmission && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-blue-800 dark:text-blue-300 text-sm">
                    📝 Viewing code from submission: {selectedSubmission.status} (
                    {new Date(selectedSubmission.date).toLocaleDateString()})
                  </p>
                </div>
              )}
            </div>

            <div className="flex-1 relative p-4">
              <div className="absolute inset-4 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden shadow-inner">
                <CodeMirrorEditor
                  value={code}
                  onChange={setCode}
                  language={language}
                  disabled={false}
                  settings={editorSettings}
                  className="h-full w-full"
                  height="100%"
                  onGoToBottom={scrollToBottom}
                  token={token || undefined}
                />
              </div>
            </div>
          </div>

          {/* Console/Results Panel */}
          <div className="w-96 bg-white dark:bg-gray-800 flex flex-col shadow-lg border-l border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <FileText className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                Console Output
                {(running || submitting) && (
                  <div className="ml-2 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                      {running ? "Running..." : "Submitting..."}
                    </span>
                  </div>
                )}
              </h4>
            </div>

            <div ref={consoleOutputRef} className="flex-1 p-4 overflow-y-auto bg-white dark:bg-gray-850 min-h-[400px]">
              {(running || submitting) && !runResult && !submissionResult && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {running ? "Running your code..." : "Submitting your solution..."}
                  </p>
                </div>
              )}

              {runResult && !submissionResult && (
                <div className="space-y-4">
                  <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
                    runResult.status === "Accepted" || runResult.status === "Success"
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
                      : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  }`}>
                    {runResult.status === "Accepted" || runResult.status === "Success" ? (
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    )}
                    <div>
                      <div className={`font-bold text-lg ${
                        runResult.status === "Accepted" || runResult.status === "Success"
                          ? "text-green-700 dark:text-green-300" 
                          : "text-red-700 dark:text-red-300"
                      }`}>
                        Run Result: {runResult.status === "Success" ? "Accepted" : runResult.status}
                      </div>
                      {runResult.passedTests !== undefined && runResult.totalTests !== undefined && (
                        <div className="text-gray-600 dark:text-gray-400 text-sm">
                          Passed: {runResult.passedTests}/{runResult.totalTests} • Runtime: {runResult.executionTime || 0}ms
                        </div>
                      )}
                    </div>
                  </div>

                  {runResult.testResults && runResult.testResults.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex overflow-x-auto">
                          {runResult.testResults.map((result, index) => (
                            <button
                              key={index}
                              onClick={() => setActiveTestCaseTab(index)}
                              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 flex items-center space-x-2 ${
                                activeTestCaseTab === index
                                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
                                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                              }`}
                            >
                              {result.passed ? (
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              ) : (
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              )}
                              <span>Case {index + 1}</span>
                              {result.passed ? (
                                <span className="text-green-600 dark:text-green-400">- Passed</span>
                              ) : (
                                <span className="text-red-600 dark:text-red-400">- Failed</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {runResult.testResults[activeTestCaseTab] && (
                        <div className="p-4 space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Input</h4>
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                              <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                {runResult.testResults[activeTestCaseTab].input || 'No input data'}
                              </pre>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Output</h4>
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                              <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                {runResult.testResults[activeTestCaseTab].actualOutput || 'No output'}
                              </pre>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Expected</h4>
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                              <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                {runResult.testResults[activeTestCaseTab].expectedOutput || 'No expected output'}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {runResult.error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                        <span className="text-red-800 dark:text-red-300 font-medium">Error</span>
                      </div>
                      <pre className="text-red-700 dark:text-red-200 text-sm font-mono whitespace-pre-wrap">
                        {runResult.error}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {submissionResult && (
                <div className="space-y-4">
                  <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
                    submissionResult.status === "Accepted"
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
                      : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  }`}>
                    {submissionResult.status === "Accepted" ? (
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    )}
                    <div>
                      <div className={`font-bold text-lg ${
                        submissionResult.status === "Accepted"
                          ? "text-green-700 dark:text-green-300" 
                          : "text-red-700 dark:text-red-300"
                      }`}>
                        {submissionResult.status}
                      </div>
                      {submissionResult.passedTests !== undefined && submissionResult.totalTests !== undefined && (
                        <div className="text-gray-600 dark:text-gray-400 text-sm">
                          Passed: {submissionResult.passedTests}/{submissionResult.totalTests} • Runtime: {submissionResult.executionTime || 0}ms
                        </div>
                      )}
                    </div>
                  </div>

                  {submissionResult.potd && submissionResult.potd.awarded && (
                    <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-yellow-400 dark:bg-yellow-500 rounded-full flex items-center justify-center text-white text-lg font-bold">🪙</div>
                        <div className="ml-3">
                          <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-200">Problem of the Day Bonus!</h4>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300">
                            You earned <span className="font-semibold">{submissionResult.potd.coinsEarned} coins</span>!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {submissionResult.error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                        <span className="text-red-800 dark:text-red-300 font-medium">Error</span>
                      </div>
                      <pre className="text-red-700 dark:text-red-200 text-sm font-mono whitespace-pre-wrap">
                        {submissionResult.error}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {!runResult && !submissionResult && !running && !submitting && problem?.testCases && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Testcase</h4>
                      </div>
                    </div>
                    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
                      <div className="flex overflow-x-auto">
                        {problem.testCases.filter((tc: { input: string; output: string; isPublic: boolean }) => tc.isPublic).map((_tc: any, index: number) => (
                          <button
                            key={index}
                            onClick={() => setActiveTestCaseTab(index)}
                            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 ${
                              activeTestCaseTab === index
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
                                : 'border-transparent text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            Case {index + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                    {problem.testCases.filter((tc: { input: string; output: string; isPublic: boolean }) => tc.isPublic)[activeTestCaseTab] && (
                      <div className="p-4 space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Input</h4>
                          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                            <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                              {problem.testCases.filter((tc: { input: string; output: string; isPublic: boolean }) => tc.isPublic)[activeTestCaseTab]?.input || 'No input data'}
                            </pre>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Expected</h4>
                          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                            <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                              {problem.testCases.filter((tc: { input: string; output: string; isPublic: boolean }) => tc.isPublic)[activeTestCaseTab]?.output || 'No expected output'}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Maximized AI View
  if (isAiMaximized) {
    return (
      <div className="fixed inset-0 bg-gray-100 dark:bg-gray-950 z-50 flex mt-[64px]">
        {/* Sidebar for Chat History */}
        <div className="w-80 bg-white dark:bg-gray-850 border-r border-gray-200 dark:border-gray-750 flex flex-col shadow-lg">
          <div className="p-4 border-b border-gray-200 dark:border-gray-750">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <History className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Chat History
              </h2>
              <button
                onClick={startNewChat}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
                title="Start New Chat"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Problem: <span className="font-medium text-gray-900 dark:text-white">{problem.title}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingHistory ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 mx-auto mb-2"></div>
                <p>Loading chat history...</p>
              </div>
            ) : (
              <>
                {allChatHistory.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">No chat history yet.</p>
                )}
                {allChatHistory.map((session) => (
                  <button
                    key={session.sessionId}
                    onClick={() => loadChatSession(session.sessionId)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors shadow-sm ${
                      selectedHistorySession === session.sessionId
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-900 dark:text-blue-100"
                        : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    <div className="font-medium text-sm truncate">{session.problemTitle}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(session.date).toLocaleDateString()} • {session.messageCount} messages
                    </div>
                    {session.lastMessage && (
                      <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate">
                        Last: "{session.lastMessage}"
                      </div>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Main Chat Content */}
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-850 flex items-center justify-between shadow-sm flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <Bot className="h-5 w-5 mr-3 text-indigo-600" />
              AI Assistant - {problem.title}
            </h2>
            <button
              onClick={toggleAiMaximized}
              className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium"
            >
              <Minimize2 className="h-5 w-5 mr-2" />
              Minimize
            </button>
          </div>

          <div ref={chatHistoryRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {chatHistory.length === 0 && aiResponse === "" && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                <MessageSquare className="h-10 w-10 mx-auto mb-4 opacity-60" />
                <p className="text-lg font-medium">Start a conversation with the AI assistant!</p>
                <p className="text-sm mt-2">Ask about optimal approaches, data structures, or edge cases.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
                  {getContextualPrompts().map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setAiPrompt(prompt)}
                      className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors border border-blue-200 dark:border-blue-700 shadow-sm"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatHistory.map((chat, index) => (
              <div key={index} className="space-y-4">
                <div className="flex justify-end">
                  <div className="max-w-3xl bg-blue-600 text-white p-3 rounded-xl shadow-md">
                    <div className="flex items-center mb-1">
                      <User className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">You</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">{chat.prompt}</p>
                  </div>
                </div>
                <AnimatedAiResponse response={chat.response} />
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="max-w-3xl bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-gray-100 p-3 rounded-xl shadow-md">
                  <div className="flex items-center mb-1">
                    <Bot className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium">AI Assistant</span>
                  </div>
                  <div className="flex items-center mt-2">
                    <div className="animate-pulse flex space-x-2">
                      <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                      <div className="h-2 w-2 bg-blue-400 rounded-full delay-75"></div>
                      <div className="h-2 w-2 bg-blue-400 rounded-full delay-150"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {aiResponse && !aiLoading && chatHistory[chatHistory.length -1]?.response !== aiResponse && (
              <AnimatedAiResponse response={aiResponse} />
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-850 flex-shrink-0 shadow-lg">
            <div className="flex items-center space-x-3">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    generateResponse()
                  }
                }}
                rows={1}
                className="flex-1 p-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none overflow-hidden pr-12 shadow-sm"
                placeholder="Ask the AI assistant about this problem..."
                disabled={aiLoading}
                style={{ maxHeight: '150px' }}
              />
              <button
                onClick={generateResponse}
                disabled={aiLoading}
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {aiLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Maximized DSA Visualizer View
  if (isVisualizerMaximized) {
    return (
      <div className="fixed inset-0 bg-gray-100 dark:bg-gray-950 z-50 flex flex-col mt-[64px]">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-850 flex items-center justify-between shadow-sm flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <GraduationCap className="h-5 w-5 mr-3 text-emerald-600" />
            DSA Visualizer Learning
          </h2>
          <button
            onClick={toggleVisualizerMaximized}
            className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium"
          >
            <Minimize2 className="h-5 w-5 mr-2" />
            Minimize
          </button>
        </div>
        <div className="flex-1">
          <iframe
            src="https://code-viz-seven.vercel.app/"
            title="DSA Visualizer"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; web-share"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    );
  }

  // Maximized Complexity Analysis AI View
  if (isComplexityAiMaximized) {
    const extractComplexity = (response: string) => {
      const timeMatch = response.match(/Time Complexity\s*[:is]*\s*(O\([^)]+\))/i);
      const spaceMatch = response.match(/Space Complexity\s*[:is]*\s*(O\([^)]+\))/i);
      const fallbackO = response.match(/O\([^)]+\)/g);
      const timeComplexity = timeMatch ? timeMatch[1] : fallbackO && fallbackO.length > 0 ? fallbackO[0] : "N/A";
      const spaceComplexity = spaceMatch ? spaceMatch[1] : fallbackO && fallbackO.length > 1 ? fallbackO[1] : "N/A";
      const justification = response
        .replace(/Time Complexity\s*[:is]*\s*O\([^)]+\)\s*\.?/gi, "")
        .replace(/Space Complexity\s*[:is]*\s*O\([^)]+\)\s*\.?/gi, "")
        .trim();
      return { timeComplexity, spaceComplexity, justification };
    };

    const { timeComplexity, spaceComplexity, justification } = extractComplexity(complexityAiResponse);

    return (
      <div className="fixed inset-0 bg-gray-100 dark:bg-gray-950 mt-[64px] flex flex-col z-50">
        {/* Header */}
        <div className="bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-750 px-6 py-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Zap className="h-6 w-6 mr-3 text-orange-500" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Complexity Analysis AI</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Analyse time and space complexity of your code.</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleComplexityAiMaximized}
                className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium"
              >
                <Minimize2 className="h-5 w-5 mr-2" />
                Minimize
              </button>
            </div>
          </div>
        </div>

        {/* Main Content - Split Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Code Editor */}
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-850 border-r border-gray-200 dark:border-gray-750">
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900 flex-shrink-0 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Code className="h-4 w-4 mr-2 text-emerald-500" />
                Your Code
              </h3>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="cpp">C++20</option>
                <option value="java">Java</option>
                <option value="python">Python</option>
                <option value="c">C</option>
              </select>
            </div>
            <div className="flex-1 relative p-4">
              <div className="absolute inset-4 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden shadow-inner">
                <CodeMirrorEditor
                  value={code}
                  onChange={setCode}
                  language={language}
                  disabled={false}
                  settings={editorSettings}
                  className="h-full w-full"
                  height="100%"
                  onGoToBottom={scrollToBottom}
                  token={token || undefined}
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900 flex-shrink-0 flex justify-end">
              <button
                onClick={generateComplexityAnalysis}
                disabled={complexityAiLoading || !token || !complexityCodeInput.trim()}
                className="flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {complexityAiLoading ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>Analyzing...</>
                ) : (
                  <><Zap className="h-4 w-4 mr-2" />Analyze Complexity</>
                )}
              </button>
            </div>
          </div>

          {/* Right Pane: Analysis Results */}
          <div className="w-2/5 flex flex-col bg-white dark:bg-gray-850 shadow-lg">
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-750 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Bot className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                AI Complexity Analysis
              </h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
              {complexityAiLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Analyzing your code for complexity...</p>
                </div>
              )}
              {!complexityAiLoading && complexityAiResponse && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="flex-1 p-3 rounded-lg shadow-md bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 font-bold text-sm">
                      Time Complexity: {timeComplexity}
                    </div>
                    <div className="flex-1 p-3 rounded-lg shadow-md bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 font-bold text-sm">
                      Space Complexity: {spaceComplexity}
                    </div>
                  </div>
                  <div
                    className="text-sm whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100"
                    dangerouslySetInnerHTML={{
                      __html: justification.replace(
                        /\*\*(.*?)\*\*/g,
                        "<strong class='font-bold text-gray-900 dark:text-gray-100'>$1</strong>",
                      ),
                    }}
                  />
                </div>
              )}
              {!complexityAiLoading && !complexityAiResponse && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Enter your code on the left and click "Analyze Complexity" to get started!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN RETURN — LeetCode-style fixed layout
  // ============================================================
  return (
    // ✅ CHANGED: fixed viewport layout — panels scroll independently, page doesn't scroll
    <div className="fixed inset-0 bg-gray-100 dark:bg-gray-950 flex flex-col transition-colors duration-200" style={{ top: '64px' }}>

      {/* ✅ NEW: Mobile Panel Toggle Bar — Problem | Editor switch */}
      <div className="flex md:hidden flex-shrink-0 border-b border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-850">
        <button
          onClick={() => setMobileActivePanel('problem')}
          className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
            mobileActivePanel === 'problem'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-transparent text-gray-500 dark:text-gray-400'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Problem
        </button>
        <button
          onClick={() => setMobileActivePanel('editor')}
          className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
            mobileActivePanel === 'editor'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-transparent text-gray-500 dark:text-gray-400'
          }`}
        >
          <Code className="h-4 w-4" />
          Editor
          {(running || submitting) && (
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Main flex row */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT PANEL: Problem Description ─────────────────── */}
        {/* Desktop: always shown | Mobile: shown only when mobileActivePanel === 'problem' */}
        <div className={`
          ${mobileActivePanel === 'problem' ? 'flex' : 'hidden'} md:flex
          w-full md:w-1/2 flex-col bg-white dark:bg-gray-850
          md:border-r border-gray-200 dark:border-gray-750 shadow-lg overflow-hidden
        `}>
          {/* ── LeetCode-style Tab Bar ── */}
          <div className="flex-shrink-0 border-b border-gray-200 dark:border-[#3e3e3e] bg-white dark:bg-[#282828]">
            <div className="flex items-center h-11 px-1 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              {[
                { id: 'description', label: 'Description' },
                { id: 'editorial',   label: 'Editorial'   },
                { id: 'submissions', label: 'Submissions' },
                { id: 'solutions',   label: 'Solutions'   },

              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => handleTabChange(id)}
                  className={`flex-shrink-0 px-4 h-full text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600 dark:text-[#ffa116]  dark:border-[#ffa116]'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
              <div className="flex-1" />

              <button
                onClick={() => navigate("/problems")}
                className="flex-shrink-0 flex items-center gap-1 px-3 h-8 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1a1a1a] custom-scrollbar">
            {activeTab === "description" && (
              <div className="px-5 py-5">
                {/* ── Problem title + meta ── */}
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{problem.title}</h1>

                <div className="flex flex-wrap items-center gap-2 mb-5">
                  {/* Difficulty */}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    problem.difficulty === 'Easy'   ? 'text-green-700  dark:text-green-400  bg-green-100  dark:bg-green-400/10' :
                    problem.difficulty === 'Medium' ? 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-400/10' :
                                                      'text-red-700    dark:text-red-400    bg-red-100    dark:bg-red-400/10'
                  }`}>
                    {problem.difficulty}
                  </span>

                  {/* Solved badge */}
                  {isSolved && (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-400/10 px-2.5 py-1 rounded-full">
                      <CheckCircle className="h-3 w-3" /> Solved
                    </span>
                  )}

                  {/* Acceptance */}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Acceptance: <span className="text-gray-700 dark:text-gray-300 font-medium">{problem.acceptanceRate.toFixed(1)}%</span>
                  </span>
                </div>

                {/* ── Description ── */}
                <div
                  className="text-sm text-gray-800 dark:text-[#eff1f6cc] leading-relaxed mb-6 prose dark:prose-invert max-w-none prose-sm"
                  dangerouslySetInnerHTML={{ __html: problem.description }}
                />

                {/* ── Examples ── */}
                {problem.examples.map((example, index) => (
                  <div key={index} className="mb-5">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Example {index + 1}:</p>
                    <div className="bg-gray-50 dark:bg-[#2d2d2d] rounded-lg p-4 font-mono text-sm space-y-1 border border-gray-100 dark:border-[#3e3e3e]">
                      <div><span className="text-gray-600 dark:text-gray-400 font-semibold not-italic">Input: </span><span className="text-gray-900 dark:text-gray-100">{example.input}</span></div>
                      <div><span className="text-gray-600 dark:text-gray-400 font-semibold not-italic">Output: </span><span className="text-gray-900 dark:text-gray-100">{example.output}</span></div>
                      {example.explanation && (
                        <div className="font-sans mt-1"><span className="text-gray-600 dark:text-gray-400 font-semibold">Explanation: </span><span className="text-gray-700 dark:text-gray-300">{example.explanation}</span></div>
                      )}
                    </div>
                  </div>
                ))}

                {/* ── Constraints ── */}
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Constraints:</p>
                  <div
                    className="text-sm text-gray-800 dark:text-[#eff1f6cc] leading-relaxed prose dark:prose-invert max-w-none prose-sm"
                    dangerouslySetInnerHTML={{ __html: problem.constraints }}
                  />
                </div>

                {/* ── Divider ── */}
                <div className="border-t border-gray-100 dark:border-[#3e3e3e] my-5" />

                {/* ── Tags ── */}
                {problem.tags && problem.tags.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Topics</p>
                    <div className="flex flex-wrap gap-1.5">
                      {problem.tags.map((tag, i) => (
                        <span key={i} className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 dark:bg-[#3e3e3e] text-blue-700 dark:text-[#adadad] hover:bg-blue-100 dark:hover:bg-[#4a4a4a] transition-colors cursor-default">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Companies ── */}
                {problem.companies && problem.companies.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Companies</p>
                    <div className="flex flex-wrap gap-1.5">
                      {problem.companies.map((company, i) => (
                        <span key={i} className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-50 dark:bg-[#3e3e3e] text-purple-700 dark:text-[#c0a0ff] hover:bg-purple-100 dark:hover:bg-[#4a4a4a] transition-colors cursor-default">
                          {company}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "editorial" && (
              <div className="text-gray-800 dark:text-gray-200 space-y-6">
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">Editorial</h2>
                {editorial ? (
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                    {editorial.written && (
                      <div className="prose dark:prose-invert max-w-none mb-6" dangerouslySetInnerHTML={{ __html: editorial.written }} />
                    )}
                    {editorial.videoUrl && (
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Video Editorial</h3>
                        <div className="relative" style={{ paddingBottom: "56.25%", height: 0 }}>
                          <iframe
                            src={getEmbedUrl(editorial.videoUrl)}
                            title="Video Editorial"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; web-share"
                            allowFullScreen
                            className="absolute top-0 left-0 w-full h-full rounded-lg"
                          ></iframe>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <Video className="h-8 w-8 mx-auto mb-2 opacity-50 text-gray-600 dark:text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400">Editorial not available yet.</p>
                  </div>
                )}

                {(() => {
                  const validSolutions = referenceSolutions.filter(s => s.language && s.completeCode);
                  if (referenceSolutions.length === 0) return null;
                  return (
                    <div>
                      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center">
                        <Code className="h-5 w-5 mr-2 text-emerald-500" />
                        Reference Solutions
                      </h2>

                      {validSolutions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 px-6 rounded-xl border border-dashed border-gray-200 dark:border-[#3e3e3e] bg-gray-50 dark:bg-[#2a2a2a]">
                          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#3e3e3e] flex items-center justify-center mb-3">
                            <Code className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                          </div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Solutions coming soon</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 text-center max-w-xs">
                            Our team is working on adding reference solutions for this problem. Check back later!
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700">
                            {validSolutions.map((sol, idx) => (
                              <button
                                key={`${sol.language}-${idx}`}
                                onClick={() => setSelectedRefLanguage(sol.language)}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                                  selectedRefLanguage === sol.language
                                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
                                }`}
                              >
                                {sol.language === "cpp" ? "C++" : sol.language === "c" ? "C" : sol.language.charAt(0).toUpperCase() + sol.language.slice(1)}
                              </button>
                            ))}
                          </div>
                          {validSolutions
                            .filter(s => s.language === selectedRefLanguage)
                            .map((sol, idx) => (
                              <div key={`${sol.language}-sol-${idx}`} className="rounded-b-lg rounded-tr-lg border border-gray-700 overflow-hidden bg-gray-900 dark:bg-gray-950 shadow-lg">
                                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
                                  <span className="text-xs text-gray-400 font-mono">
                                    {sol.language === "cpp" ? "C++" : sol.language === "c" ? "C" : sol.language.charAt(0).toUpperCase() + sol.language.slice(1)}
                                  </span>
                                  <button onClick={() => copyToClipboard(sol.completeCode)} className="flex items-center px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded transition-colors">
                                    <Copy className="h-3 w-3 mr-1" />Copy
                                  </button>
                                </div>
                                <pre className="p-4 overflow-x-auto text-sm text-gray-100 font-mono whitespace-pre-wrap max-h-[500px] overflow-y-auto leading-relaxed">{sol.completeCode}</pre>
                              </div>
                            ))}
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {activeTab === "submissions" && (
              <div className="text-gray-800 dark:text-gray-200">
                <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">Your Submissions</h2>
                {submissions.length > 0 ? (
                  <div className="space-y-4">
                    {submissions.map((submission) => (
                      <div
                        key={submission._id}
                        onClick={() => handleSubmissionClick(submission)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 shadow-sm ${
                          selectedSubmission?._id === submission._id
                            ? "border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(submission.status)}
                            <span className={`font-semibold text-lg ${getStatusColor(submission.status)}`}>
                              {submission.status}
                            </span>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(submission.date).toLocaleString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700 dark:text-gray-300">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1 opacity-70" /> Runtime:{" "}
                            <span className="ml-1 font-medium">{submission.runtime}ms</span>
                          </div>
                          <div className="flex items-center">
                            <Memory className="h-4 w-4 mr-1 opacity-70" /> Memory:{" "}
                            <span className="ml-1 font-medium">{submission.memory}MB</span>
                          </div>
                          <div className="flex items-center col-span-2">
                            <Code className="h-4 w-4 mr-1 opacity-70" /> Language:{" "}
                            <span className="ml-1 font-medium">{submission.language}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50 text-gray-600 dark:text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400">No submissions yet. Run or submit your code!</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "solutions" && (
              <div className="text-gray-800 dark:text-gray-200">
                <ProblemSolutions
                  problemId={problem._id}
                  problemTitle={problem.title}
                />
              </div>
            )}

          </div>
        </div>
        {/* ── END LEFT PANEL ─────────────────────────────────── */}


        {/* ── RIGHT PANEL: Code Editor ─────────────────────────── */}
        {/* Desktop: always shown | Mobile: shown only when mobileActivePanel === 'editor' */}
        <div className={`
          ${mobileActivePanel === 'editor' ? 'flex' : 'hidden'} md:flex
          w-full md:w-1/2 flex-col bg-white dark:bg-gray-850 shadow-lg relative
        `}>

          {/* ── Editor Toolbar — LeetCode exact style ── */}
          <div className="flex-shrink-0 border-b border-gray-200 dark:border-[#3e3e3e] bg-white dark:bg-[#282828]" style={{ minHeight: '44px' }}>
            <div className="flex items-center h-11 px-2 gap-1">

              {/* Language picker */}
              <div className="relative flex items-center">
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="appearance-none pl-2 pr-6 py-1 rounded text-xs font-medium bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3e3e3e] cursor-pointer border-none outline-none transition-colors"
                >
                  <option value="cpp">C++20</option>
                  <option value="java">Java</option>
                  <option value="python">Python</option>
                  <option value="c">C</option>
                </select>
                <svg className="absolute right-1 h-3 w-3 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Separator */}
              <div className="w-px h-5 bg-gray-200 dark:bg-[#3e3e3e] mx-1 flex-shrink-0" />

              {/* Icon buttons — always in DOM, never hidden */}
              <button onClick={handleResetCode} title="Reset code" className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3e3e3e] transition-colors flex-shrink-0">
                <History className="h-4 w-4" />
              </button>

              <button onClick={handleOpenSettings} title="Settings" className="settings-button p-1.5 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3e3e3e] transition-colors flex-shrink-0">
                <Settings className="h-4 w-4" />
              </button>

              {user && (
                <button onClick={() => setShowReportModal(true)} title="Report" className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-[#3e3e3e] transition-colors flex-shrink-0">
                  <Flag className="h-4 w-4" />
                </button>
              )}

              <button onClick={toggleCodeEditorMaximized} title="Maximize" className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3e3e3e] transition-colors flex-shrink-0">
                <Maximize2 className="h-4 w-4" />
              </button>

              {(runResult || submissionResult) && (
                <button
                  onClick={() => { setRunResult(null); setSubmissionResult(null); setConsoleOpen(false); }}
                  title="Clear results"
                  className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-[#3e3e3e] transition-colors flex-shrink-0"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* ── Timer — sits between spacer and Run/Submit ── */}
              <div className="flex items-center gap-0.5 flex-shrink-0 mr-1">
                {timerVisible ? (
                  <>
                    <span className={`text-xs font-mono font-semibold tabular-nums min-w-[42px] text-center select-none ${
                      timerRunning ? 'text-orange-500 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {formatTimer(timerSeconds)}
                    </span>
                    <button onClick={() => setTimerRunning(p => !p)} title={timerRunning ? 'Pause' : 'Resume'}
                      className="p-1 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3e3e3e] transition-colors">
                      {timerRunning
                        ? <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        : <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      }
                    </button>
                    <button onClick={handleTimerReset} title="Reset timer"
                      className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-[#3e3e3e] transition-colors">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                      </svg>
                    </button>
                  </>
                ) : (
                  <button onClick={handleTimerToggle} title="Start timer"
                    className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-[#3e3e3e] transition-colors">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Thin separator */}
              <div className="w-px h-5 bg-gray-200 dark:bg-[#3e3e3e] mx-1 flex-shrink-0" />

              {/* Run — always visible, no disabled hiding */}
              <button
                onClick={() => { if (!running && token) handleRun(); }}
                title={!token ? "Login to run" : "Run"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                  !token ? 'opacity-40 cursor-not-allowed text-gray-500 dark:text-gray-400'
                  : running ? 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#3e3e3e] cursor-wait'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3e3e3e]'
                }`}
              >
                {running
                  ? <div className="animate-spin h-3.5 w-3.5 rounded-full border-2 border-gray-400 border-t-transparent flex-shrink-0" />
                  : <Play className="h-3.5 w-3.5 flex-shrink-0" />
                }
                <span>{running ? 'Running...' : 'Run'}</span>
              </button>

              {/* Submit — always visible, no disabled hiding */}
              <button
                onClick={() => { if (!submitting && token) handleSubmit(); }}
                title={!token ? "Login to submit" : "Submit"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                  !token ? 'opacity-40 cursor-not-allowed bg-green-600 text-white'
                  : submitting ? 'bg-green-700 text-white cursor-wait'
                  : 'bg-green-600 hover:bg-green-500 text-white'
                }`}
              >
                {submitting
                  ? <div className="animate-spin h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent flex-shrink-0" />
                  : <Send className="h-3.5 w-3.5 flex-shrink-0" />
                }
                <span>{submitting ? 'Submitting...' : 'Submit'}</span>
              </button>

              {/* Notes button — inline, right of Submit */}
              <div className="w-px h-5 bg-gray-200 dark:bg-[#3e3e3e] mx-1 flex-shrink-0" />
              <button
                onClick={() => setNotesOpen(p => !p)}
                title="My Notes"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                  notesOpen
                    ? 'bg-yellow-100 dark:bg-yellow-400/10 text-yellow-700 dark:text-yellow-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3e3e3e] hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Notes</span>
              </button>

            </div>

            {/* Settings Dropdown */}
            {showSettings && (
              <div className="settings-dropdown absolute top-12 right-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-4 z-50 min-w-60">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Editor Settings</h3>
                  <button onClick={handleCloseSettings} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Tab Size</label>
                    <select value={tempEditorSettings.tabSize} onChange={(e) => setTempEditorSettings({ ...tempEditorSettings, tabSize: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                      <option value={2}>2 spaces</option><option value={4}>4 spaces</option><option value={8}>8 spaces</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Font Size</label>
                    <select value={tempEditorSettings.fontSize} onChange={(e) => setTempEditorSettings({ ...tempEditorSettings, fontSize: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                      <option value={12}>12px</option><option value={14}>14px</option><option value={16}>16px</option><option value={18}>18px</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="wordWrap" checked={tempEditorSettings.wordWrap}
                      onChange={(e) => setTempEditorSettings({ ...tempEditorSettings, wordWrap: e.target.checked })} className="rounded" />
                    <label htmlFor="wordWrap" className="text-sm text-gray-700 dark:text-gray-300">Word Wrap</label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <button onClick={handleCloseSettings} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">Cancel</button>
                  <button onClick={handleApplySettings} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">Apply</button>
                </div>
              </div>
            )}

            {/* Warnings */}
            {tabSwitchCount > 0 && (
              <div className="mx-2 mb-1 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-300">
                ⚠️ Tab switching detected ({tabSwitchCount} times).
              </div>
            )}
            {selectedSubmission && (
              <div className="mx-2 mb-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-800 dark:text-blue-300">
                📝 Viewing: {selectedSubmission.status} ({new Date(selectedSubmission.date).toLocaleDateString()})
              </div>
            )}
          </div>

          {/* Editor + Console sub-container — flex-1 so toolbar is NEVER clipped */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Code Editor — seamless */}
          <div className="flex-1 min-h-0 bg-white dark:bg-[#1e1e1e]">
            <CodeMirrorEditor
              value={code}
              onChange={setCode}
              language={language}
              disabled={false}
              settings={editorSettings}
              className="h-full w-full"
              height="100%"
              onGoToBottom={scrollToBottom}
              token={token || undefined}
            />
          </div>

          {/* ── Notes Panel — slides in above console when open ── */}
          {notesOpen && (
            <div className="flex-shrink-0 border-t border-gray-200 dark:border-[#3e3e3e] bg-white dark:bg-[#1e1e1e]" style={{ height: '220px' }}>
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-[#3e3e3e]">
                <div className="flex items-center gap-2">
                  <svg className="h-3.5 w-3.5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Notes</span>
                  {notes.length > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-600">{notes.length} chars</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setNotes("");
                    localStorage.removeItem(`notes_${problem?._id}`);
                  }}
                  className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-[#3e3e3e]"
                >
                  Clear
                </button>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write your approach, edge cases, pseudocode..."
                className="w-full h-[calc(100%-36px)] resize-none bg-transparent text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 p-3 focus:outline-none font-mono leading-relaxed"
                spellCheck={false}
              />
            </div>
          )}

          {/* ── LeetCode-style Console ── */}
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-[#3e3e3e] bg-white dark:bg-[#1e1e1e]" style={{ height: consoleOpen ? '260px' : 'auto' }}>
            {/* Console top bar — always visible, click to toggle */}
            <div className="flex items-center border-b border-gray-200 dark:border-[#3e3e3e] select-none">
              {/* Testcase tab */}
              <button
                onClick={() => { setConsoleTab('testcase'); setConsoleOpen(true); }}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  consoleOpen && consoleTab === 'testcase'
                    ? 'border-gray-800 dark:border-white text-gray-800 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Testcase
              </button>
              {/* Test Result tab */}
              <button
                onClick={() => { setConsoleTab('result'); setConsoleOpen(true); }}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  consoleOpen && consoleTab === 'result'
                    ? 'border-gray-800 dark:border-white text-gray-800 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Code className="h-3.5 w-3.5" />
                Test Result
                {(running || submitting) && (
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent ml-1" />
                )}
              </button>

              <div className="flex-1" />

              {/* Toggle chevron */}
              <button
                onClick={() => setConsoleOpen(p => !p)}
                className="px-3 py-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg className={`h-4 w-4 transition-transform duration-200 ${consoleOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Console body */}
            {consoleOpen && (
              <div ref={consoleOutputRef} className="h-full overflow-y-auto pb-2">

                {/* ── TESTCASE TAB ── */}
                {consoleTab === 'testcase' && (
                  <div className="p-3">
                    {/* Case tabs */}
                    <div className="flex gap-2 mb-3">
                      {(problem?.testCases?.filter((tc: { input: string; output: string; isPublic: boolean }) => tc.isPublic) || []).map((_: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setConsoleTestCaseIdx(idx)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            consoleTestCaseIdx === idx
                              ? 'bg-gray-200 dark:bg-[#3e3e3e] text-gray-900 dark:text-white'
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d2d2d]'
                          }`}
                        >
                          Case {idx + 1}
                        </button>
                      ))}
                    </div>
                    {/* Selected test case input */}
                    {(() => {
                      const tc = (problem?.testCases?.filter((tc: { input: string; output: string; isPublic: boolean }) => tc.isPublic) || [])[consoleTestCaseIdx];
                      if (!tc) return null;
                      return (
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Input</p>
                            <div className="bg-gray-100 dark:bg-[#2d2d2d] rounded-lg px-3 py-2">
                              <pre className="text-xs font-mono text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{tc.input}</pre>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expected Output</p>
                            <div className="bg-gray-100 dark:bg-[#2d2d2d] rounded-lg px-3 py-2">
                              <pre className="text-xs font-mono text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{tc.output}</pre>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ── RESULT TAB ── */}
                {consoleTab === 'result' && (
                  <div className="p-3">
                    {/* Loading */}
                    {(running || submitting) && (
                      <div className="flex items-center gap-3 py-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent flex-shrink-0" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {running ? 'Running your code...' : 'Submitting your solution...'}
                        </span>
                      </div>
                    )}

                    {/* Run Result */}
                    {runResult && !submissionResult && !running && (
                      <div className="space-y-3">
                        {/* Status */}
                        <div>
                          <span className={`text-xl font-bold ${
                            runResult.status === 'Accepted' || runResult.status === 'Success'
                              ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {runResult.status === 'Success' ? 'Accepted' : runResult.status}
                          </span>
                          {(runResult.status === 'Accepted' || runResult.status === 'Success') && (
                            <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                              Runtime: {runResult.executionTime || 0} ms
                            </span>
                          )}
                        </div>

                        {/* Case tabs */}
                        {runResult.testResults && runResult.testResults.length > 0 && (
                          <>
                            <div className="flex gap-2">
                              {runResult.testResults.map((r, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setConsoleTestCaseIdx(idx)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                    consoleTestCaseIdx === idx
                                      ? 'bg-gray-200 dark:bg-[#3e3e3e] text-gray-900 dark:text-white'
                                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2d2d2d]'
                                  }`}
                                >
                                  {r.passed
                                    ? <CheckCircle className="h-3 w-3 text-green-500" />
                                    : <XCircle className="h-3 w-3 text-red-500" />
                                  }
                                  Case {idx + 1}
                                </button>
                              ))}
                            </div>

                            {/* Selected case details */}
                            {runResult.testResults[consoleTestCaseIdx] && (
                              <div className="space-y-2">
                                {[
                                  { label: 'Input', value: runResult.testResults[consoleTestCaseIdx].input },
                                  { label: 'Output', value: runResult.testResults[consoleTestCaseIdx].actualOutput },
                                  { label: 'Expected', value: runResult.testResults[consoleTestCaseIdx].expectedOutput },
                                ].map(({ label, value }) => (
                                  <div key={label}>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                                    <div className="bg-gray-100 dark:bg-[#2d2d2d] rounded-lg px-3 py-2">
                                      <pre className="text-xs font-mono text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{value || '—'}</pre>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {/* Error */}
                        {runResult.error && (
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                            <pre className="text-xs font-mono text-red-600 dark:text-red-300 whitespace-pre-wrap">{runResult.error}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Submission Result */}
                    {submissionResult && !submitting && (
                      <div className="space-y-3">
                        {/* Status */}
                        <div>
                          <span className={`text-xl font-bold ${
                            submissionResult.status === 'Accepted' ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {submissionResult.status}
                          </span>
                          {submissionResult.status === 'Accepted' && (
                            <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                              Runtime: {submissionResult.executionTime || 0} ms
                              {submissionResult.memory ? ` · Memory: ${submissionResult.memory} MB` : ''}
                            </span>
                          )}
                        </div>

                        {/* Passed count */}
                        {submissionResult.passedTests !== undefined && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {submissionResult.passedTests}/{submissionResult.totalTests} test cases passed
                          </p>
                        )}

                        {/* POTD coins */}
                        {submissionResult.potd?.awarded && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <span className="text-lg">🪙</span>
                            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                              +{submissionResult.potd.coinsEarned} coins earned!
                            </span>
                          </div>
                        )}

                        {/* Error */}
                        {submissionResult.error && (
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                            <pre className="text-xs font-mono text-red-600 dark:text-red-300 whitespace-pre-wrap">{submissionResult.error}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Empty state */}
                    {!runResult && !submissionResult && !running && !submitting && (
                      <div className="flex flex-col items-center justify-center py-6 text-gray-400 dark:text-gray-500">
                        <Code className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-sm">Run your code to see results here</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          </div>
          {/* END editor+console sub-container */}

          {/* Floating Buttons — visible on ALL screen sizes */}
          <div className="fixed bottom-4 md:bottom-8 right-4 md:right-8 z-40 flex flex-col space-y-2 md:space-y-4">
            <button
              onClick={handleDsaVisualizerClick}
              className="p-3 md:p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-500 focus:ring-opacity-75"
              title="DSA Visualizer Learning"
              style={{ width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <GraduationCap className="h-7 w-7" />
            </button>

            <button
              onClick={toggleComplexityAiMaximized}
              className="p-3 md:p-4 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-orange-500 focus:ring-opacity-75"
              title="Analyse Time and Space Complexity"
              style={{ width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Zap className="h-7 w-7" />
            </button>

            <button
              onClick={toggleAiMaximized}
              className="p-3 md:p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-75"
              title="Open AI Chat"
              style={{ width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Bot className="h-7 w-7" />
            </button>
          </div>
        </div>
        {/* ── END RIGHT PANEL ────────────────────────────────── */}

      </div>
      {/* END main flex row */}

      {/* Result Card Overlay */}
      {showResultCard && resultCardData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`relative max-w-lg w-full mx-4 transform transition-all duration-500 scale-100 ${
            resultCardData.type === 'success'
              ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 border-green-300 dark:from-green-900/30 dark:via-emerald-900/20 dark:to-green-800/30 dark:border-green-600'
              : 'bg-gradient-to-br from-red-50 via-rose-50 to-red-100 border-red-300 dark:from-red-900/30 dark:via-rose-900/20 dark:to-red-800/30 dark:border-red-600'
          } border-2 rounded-2xl shadow-2xl overflow-hidden`}>

            <div className="absolute inset-0 opacity-10">
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full ${
                resultCardData.type === 'success' ? 'bg-green-400' : 'bg-red-400'
              } blur-3xl transform translate-x-16 -translate-y-16`}></div>
              <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full ${
                resultCardData.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'
              } blur-2xl transform -translate-x-12 translate-y-12`}></div>
            </div>

            <button
              onClick={() => { setShowResultCard(false); setResultCardData(null); }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-gray-600 dark:text-gray-300"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="relative p-8 text-center">
              <div className="relative mb-6">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
                  resultCardData.type === 'success'
                    ? 'bg-green-100 border-4 border-green-300 dark:bg-green-800/50 dark:border-green-500'
                    : 'bg-red-100 border-4 border-red-300 dark:bg-red-800/50 dark:border-red-500'
                } animate-pulse`}>
                  {resultCardData.type === 'success' ? (
                    <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>

              <h2 className={`text-3xl font-bold mb-3 bg-gradient-to-r ${
                resultCardData.type === 'success'
                  ? 'from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400'
                  : 'from-red-600 to-rose-600 dark:from-red-400 dark:to-rose-400'
              } bg-clip-text text-transparent`}>
                {resultCardData.title}
              </h2>

              <p className={`text-lg mb-6 ${
                resultCardData.type === 'success'
                  ? 'text-green-700 dark:text-green-200'
                  : 'text-red-700 dark:text-red-200'
              }`}>
                {resultCardData.message}
              </p>

              <div className={`inline-flex items-center px-6 py-3 rounded-xl mb-4 ${
                resultCardData.type === 'success'
                  ? 'bg-green-200/50 border border-green-300 text-green-800 dark:bg-green-800/30 dark:border-green-600 dark:text-green-200'
                  : 'bg-red-200/50 border border-red-300 text-red-800 dark:bg-red-800/30 dark:border-red-600 dark:text-red-200'
              } backdrop-blur-sm`}>
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  resultCardData.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                } animate-pulse`}></div>
                <span className="font-semibold">
                  Test Cases: {resultCardData.testCases.passed}/{resultCardData.testCases.total} passed
                </span>
              </div>

              {/* ✅ Timer solve time — shown only on success with timer active */}
              {resultCardData.type === 'success' && resultCardData.solveTime !== undefined && (
                <div className="mb-4 mx-auto w-fit">
                  <div className="flex items-center gap-3 px-6 py-3 bg-orange-50 dark:bg-orange-400/10 border border-orange-200 dark:border-orange-400/30 rounded-xl">
                    <svg className="h-5 w-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2"/>
                    </svg>
                    <div className="text-left">
                      <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Solved in</p>
                      <p className="text-xl font-bold font-mono text-orange-700 dark:text-orange-300 tabular-nums">
                        {formatTimer(resultCardData.solveTime)}
                      </p>
                    </div>
                    {bestSolveTime !== null && bestSolveTime === resultCardData.solveTime && (
                      <div className="ml-2 flex flex-col items-center">
                        <span className="text-lg">🏆</span>
                        <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">Best!</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(resultCardData.executionTime !== undefined || resultCardData.memory !== undefined) && (
                <div className="flex justify-center space-x-4 mb-6">
                  {resultCardData.executionTime !== undefined && (
                    <div className={`px-4 py-2 rounded-lg ${
                      resultCardData.type === 'success'
                        ? 'bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200'
                        : 'bg-red-100 dark:bg-red-800/30 text-red-800 dark:text-red-200'
                    }`}>
                      <div className="text-sm font-medium">Runtime</div>
                      <div className="text-lg font-bold">{resultCardData.executionTime}ms</div>
                    </div>
                  )}
                  {resultCardData.memory !== undefined && (
                    <div className={`px-4 py-2 rounded-lg ${
                      resultCardData.type === 'success'
                        ? 'bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200'
                        : 'bg-red-100 dark:bg-red-800/30 text-red-800 dark:text-red-200'
                    }`}>
                      <div className="text-sm font-medium">Memory</div>
                      <div className="text-lg font-bold">{resultCardData.memory}MB</div>
                    </div>
                  )}
                </div>
              )}

              {resultCardData.type === 'success' && resultCardData.coinsEarned && (
                <div className="mb-6 p-4 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-xl border border-yellow-300 dark:border-yellow-600">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-8 h-8 bg-yellow-400 dark:bg-yellow-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                      🪙
                    </div>
                    <span className="text-xl font-bold text-yellow-800 dark:text-yellow-200">
                      +{resultCardData.coinsEarned} Coins Earned!
                    </span>
                  </div>
                </div>
              )}

              <div className="flex space-x-4 justify-center">
                {resultCardData.type === 'failure' ? (
                  <>
                    <button
                      onClick={() => { setShowResultCard(false); setResultCardData(null); }}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
                    >
                      <Code className="w-4 h-4 mr-2 inline" />
                      Try Again
                    </button>
                    <button
                      onClick={() => navigate('/problems')}
                      className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-500 focus:ring-opacity-50"
                    >
                      Other Problems
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => navigate('/problems')}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-opacity-50"
                    >
                      <Trophy className="w-4 h-4 mr-2 inline" />
                      Solve More Problems
                    </button>
                    <button
                      onClick={() => { setShowResultCard(false); setResultCardData(null); }}
                      className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-500 focus:ring-opacity-50"
                    >
                      Continue Coding
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {problem && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          type="problem"
          targetId={problem._id}
          targetTitle={problem.title}
          targetUrl={`/problems/${problem._id}`}
        />
      )}

    </div>
  )
}

export default ProblemDetail
