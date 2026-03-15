import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../config/api";
import { Outlet } from "react-router-dom"; // ← ADD THIS
import { useTheme } from "../../contexts/ThemeContext";
import ViewDocumentsTab from "../../components/Admin/ViewDocumentsTab";
import AddDocumentTab from "../../components/Admin/AddDocumentTab";
import HelpManagement from '../../components/Admin/HelpAdminPanel';
import NotificationsAdminTab from '../../components/Admin/NotificationsAdminTab'; // 🔔
import PlagiarismAdminPanel from '../../components/Admin/PlagiarismAdminPanel';
import ReportsAdminTab from '../../components/Admin/ReportsAdminTab';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Users,
  Trophy,
  MessageSquare,
  Megaphone,
  Code,
  Settings,
  Save,
  X,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  TestTube,
  Eye,
  EyeOff,
  Calendar,
  Award,
  ShoppingCart,
  HelpCircle,
  BookOpen,
  FileText,
  Truck,
  MapPin,
  XCircle,
  CheckCircle,
  Bell,
  Shield,
  AlertTriangle,
  Ban,
  UserCheck,
  Flag,
} from "lucide-react";

interface MCQQuestion {
  _id: string;
  question: string;
  options: {
    text: string;
    isCorrect: boolean;
  }[];
  domain: string;
  difficulty: string;
  explanation?: string;
  tags: string[];
  timesAsked: number;
  correctAnswers: number;
  totalAttempts: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
}

interface RedeemItem {
  _id: string;
  title: string;
  description: string;
  category: string;
  coinCost: number;
  imageUrl?: string;
  isActive: boolean;
  stockQuantity?: number;
  createdAt: string;
}

interface RedeemOrder {
  _id: string;
  user: string;
  items: Array<{
    item: string;
    quantity: number;
    coinCostAtTime: number;
  }>;
  totalCoinCost: number;
  status: string;
  createdAt: string;
}

interface RedeemOrderAdmin {
  _id: string;
  userId: { _id: string; username: string; email: string };
  itemId: { _id: string; name: string; imageUrl: string; coinsCost: number };
  quantity: number;
  totalCost: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  deliveryAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  orderDate: string;
  trackingNumber?: string;
  cancelledBy?: "admin" | "user";
  cancelReason?: string;
  cancelledAt?: string;
  deliveredAt?: string;
}

interface ChatRoom {
  _id: string;
  name: string;
  description?: string;
  type: string;
  isActive: boolean;
  participants: string[];
  createdBy: string;
  createdAt: string;
}

interface ContestProblem {
  problemId: string;
  score: number;
}

interface Game {
  _id: string;
  title: string;
  description: string;
  type: string;
  settings: any;
  isActive: boolean;
  participants: string[];
  status: string;
  createdAt: string;
}

interface Problem {
  _id: string;
  title: string;
  difficulty: string;
  tags: string[];
  submissions: number;
  accepted: number;
  acceptanceRate: number;
}

interface Contest {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  status: string;
  participants: any[];
}

interface Discussion {
  _id: string;
  title: string;
  author: { username: string };
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
}

interface Announcement {
  _id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  createdAt: string;
}

interface UserProfile {
  firstName?: string;
  lastName?: string;
  linkedIn?: string;
  github?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  college?: string;
  branch?: string;
  graduationYear?: number;
}

interface User {
  _id: string;
  username?: string;
  email?: string;
  role?: string;
  createdAt?: string;
  profile?: UserProfile;
  isBanned?: boolean;
  bannedReason?: string;
  plagiarismWarnings?: any[];
  contestPermanentBan?: boolean;
  contestPermanentBanAt?: string;
  contestPermanentBanReason?: string;
  contestBans?: {
    _id?: string;
    contestId: string;
    reason: string;
    similarity: number;
    matchedWithUser?: string;
    bannedAt: string;
    unbannedAt?: string;
    isActive: boolean;
    
  }[];
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState("overview");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [redeemOrders, setRedeemOrders] = useState<RedeemOrderAdmin[]>([]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editOrderStatus, setEditOrderStatus] = useState('');
  const [editTrackingNumber, setEditTrackingNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateProblem, setShowCreateProblem] = useState(false);
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [editProblemData, setEditProblemData] = useState<any>(null);
  const [showCreateContest, setShowCreateContest] = useState(false);
  const [editingContestId, setEditingContestId] = useState<string | null>(null);
  const [editContestData, setEditContestData] = useState<any>(null);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ open: true, title, message, onConfirm });
  };
const [contestBanPermanent, setContestBanPermanent] = useState(false);
const [mcqSearchQuery, setMcqSearchQuery] = useState("");
const [mcqCurrentPage, setMcqCurrentPage] = useState(1);
const MCQ_PER_PAGE = 10;  const closeConfirm = () => setConfirmModal({ open: false, title: '', message: '', onConfirm: () => {} });
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editCancelReason, setEditCancelReason] = useState("");
  const [editDeliveredAt, setEditDeliveredAt] = useState('');
  const [editPredictedDeliveryDate, setEditPredictedDeliveryDate] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserData, setEditUserData] = useState<any>(null);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });

  const [newProblem, setNewProblem] = useState({
    title: "",
    description: "",
    difficulty: "Easy",
    tags: "",
    companies: "",
    constraints: "",
    examples: [{ input: "", output: "", explanation: "" }],
    testCases: [
      { input: "", output: "", explanation: "", isPublic: true },
      { input: "", output: "", explanation: "", isPublic: true },
      { input: "", output: "", explanation: "", isPublic: false },
      { input: "", output: "", explanation: "", isPublic: false },
      { input: "", output: "", explanation: "", isPublic: false },
    ],
    codeTemplates: {
      cpp: "// C++ template\nclass Solution {\npublic:\n    // Your function here\n};",
      java: "// Java template\nclass Solution {\n    public int functionName() {\n        // Your code here\n    }\n}",
      python:
        "# Python template\nclass Solution:\n    def function_name(self):\n        # Your code here\n        pass",
      c: "// C template\n#include <stdio.h>\n\nint functionName() {\n    // Your code here\n}",
      javascript:
        "// JavaScript template\nvar functionName = function(nums) {\n    // Your code here\n};",
    },
    functionSignature: {
      cpp: "int functionName(vector<int>& nums)",
      java: "public int functionName(int[] nums)",
      python: "def function_name(self, nums: List[int]) -> int:",
      c: "int functionName(int* nums, int numsSize)",
      javascript: "var functionName = function(nums) { };",
    },
    timeLimit: 2000,
    memoryLimit: 256,
    isPublished: false,
    isFeatured: false,
    editorial: {
      written: "",
      videoUrl: "",
      thumbnailUrl: "",
      duration: 0,
    },
    visibility: "public",
    referenceSolution: [
      { language: "cpp", completeCode: "" },
      { language: "java", completeCode: "" },
      { language: "python", completeCode: "" },
      { language: "c", completeCode: "" },
    ],
  });
// ✅ Block/Unblock states
const [blockModal, setBlockModal] = useState<{ open: boolean; userId: string | null }>({ open: false, userId: null });
const [blockReason, setBlockReason] = useState("");

// ✅ Contest Ban states
const [contestBanModal, setContestBanModal] = useState<{ open: boolean; userId: string | null; username: string }>({ open: false, userId: null, username: "" });
const [contestBanContestId, setContestBanContestId] = useState("");
const [contestBanSimilarity, setContestBanSimilarity] = useState(80);
const [contestBanMatchedUser, setContestBanMatchedUser] = useState("");
const [contestBanProblemId, setContestBanProblemId] = useState("");
const [userSearchQuery, setUserSearchQuery] = useState("");
const [userCurrentPage, setUserCurrentPage] = useState(1);
const USERS_PER_PAGE = 10;

const [problemSearchQuery, setProblemSearchQuery] = useState("");
const [problemCurrentPage, setProblemCurrentPage] = useState(1);
const PROBLEMS_PER_PAGE = 10;

// ✅ User Detail Modal
const [viewUserModal, setViewUserModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
// Line ~235 ke aaspaas
const [activeUserTab, setActiveUserTab] = useState<"info" | "contestBans" | "plagiarism" | "plagiarismCases">("info");  const [newContest, setNewContest] = useState({
    name: "",
    description: "",
    bannerImage: "",
    startTime: "",
    endTime: "",
    duration: 60,
    isPublic: true,
    password: "",
    leaderboardVisible: true,
    freezeTime: 0,
    rules: "",
    editorial: "",
    allowedLanguages: ["cpp", "python", "java", "c", "js"],
    problems: [] as ContestProblem[], // Array of {problemId, score}
  });

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    type: "general",
    priority: "medium",
    tags: "",
    imageUrl: "",
    link: "",
    expiresAt: "",
    visibleToRoles: ["user"],
    pinned: false,
  });

  const [editingAnnouncementId, setEditingAnnouncementId] = useState<
    string | null
  >(null);
  const [editAnnouncementData, setEditAnnouncementData] = useState<any>(null);

  // MCQ Questions state
  const [showCreateMCQ, setShowCreateMCQ] = useState(false);
  const [editingMCQId, setEditingMCQId] = useState<string | null>(null);
  const [editMCQData, setEditMCQData] = useState<any>(null);
  const [newMCQ, setNewMCQ] = useState({
    question: "",
    options: [
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
    domain: "dsa",
    difficulty: "Medium",
    explanation: "",
    tags: [] as string[],
    isActive: true,
  });

  // Chat Rooms state
  const [showCreateChatRoom, setShowCreateChatRoom] = useState(false);
  const [newChatRoom, setNewChatRoom] = useState({
    name: "",
    description: "",
    type: "general",
    isActive: true,
  });

  // Redirect if not admin
  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  // Helper function to show notifications
  const showNotification = (
    type: "success" | "error" | "info",
    message: string
  ) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // User CRUD handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API_URL}/users`, newUser, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      setUsers([response.data, ...users]);
      setShowCreateUser(false);
      setNewUser({ username: "", email: "", password: "", role: "user" });
      showNotification("success", "User created successfully!");
    } catch (error: any) {
      showNotification(
        "error",
        `Failed to create user: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user._id);
    setEditUserData({ ...user });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${API_URL}/users/${editingUserId}`,
        editUserData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setUsers(users.map((u) => (u._id === editingUserId ? response.data : u)));
      setEditingUserId(null);
      setEditUserData(null);
      showNotification("success", "User updated!");
    } catch (error: any) {
      showNotification("error", "Failed to update user.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    showConfirm("Delete User", "Are you sure you want to delete this user? This action cannot be undone.", async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.filter((u) => u._id !== userId));
      showNotification("success", "User deleted successfully!");
    } catch (error) {
      showNotification("error", "Failed to delete user.");
    }
  });
  };
const handleBlockUser = async () => {
  if (!blockModal.userId) return;
  try {
    const token = localStorage.getItem("token");
    await axios.patch(
      `${API_URL}/users/${blockModal.userId}/block`,
      { reason: blockReason || "Blocked by admin" },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    // ✅ Optimistic update
    setUsers(prev => prev.map((u) =>
      u._id === blockModal.userId
        ? { ...u, isBanned: true, bannedReason: blockReason || "Blocked by admin" }
        : u
    ));
    showNotification("success", "User blocked successfully!");
    setBlockModal({ open: false, userId: null });
    setBlockReason("");
  } catch (error: any) {
    showNotification("error", error.response?.data?.message || "Failed to block user.");
  }
};

const handleUnblockUser = async (userId: string) => {
  try {
    const token = localStorage.getItem("token");
    await axios.patch(
      `${API_URL}/users/${userId}/unblock`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    // ✅ Optimistic update — turant button change hoga
    setUsers(prev => prev.map((u) =>
      u._id === userId ? { ...u, isBanned: false, bannedReason: "" } : u
    ));
    showNotification("success", "User unblocked successfully!");
  } catch (error: any) {
    showNotification("error", "Failed to unblock user.");
  }
};

const handleContestBanUser = async () => {
  if (!contestBanModal.userId || !contestBanContestId) return;
  try {
    const token = localStorage.getItem("token");
    const response = await axios.patch(
      `${API_URL}/users/${contestBanModal.userId}/contest-block`,
      {
        contestId: contestBanContestId,
        similarity: contestBanSimilarity,
        matchedWithUser: contestBanMatchedUser || undefined,
        problemId: contestBanProblemId || undefined,
        forcePermanentContestBan: contestBanPermanent, // ✅ NEW
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = response.data;

    if (data.permanentContestBan) {
      showNotification("error", `🚫 User PERMANENTLY banned from ALL contests! ${contestBanPermanent ? '(Admin forced)' : `2nd offense`} (${contestBanSimilarity}% similarity).`);
    } else {
      showNotification("success", `⚠️ 1st Warning! User banned from this contest (${contestBanSimilarity}% similarity). One more = permanent contest ban.`);
    }

    setContestBanModal({ open: false, userId: null, username: "" });
    setContestBanContestId("");
    setContestBanSimilarity(80);
    setContestBanMatchedUser("");
    setContestBanProblemId("");
    setContestBanPermanent(false); // ✅ NEW

    setUsers(prev => prev.map(u =>
      u._id === contestBanModal.userId
        ? {
            ...u,
            contestPermanentBan: data.permanentContestBan ? true : u.contestPermanentBan,
            contestBans: [
              ...(u.contestBans || []),
              {
                contestId: contestBanContestId,
                reason: 'Code similarity detected',
                similarity: contestBanSimilarity,
                bannedAt: new Date().toISOString(),
                isActive: true
              }
            ]
          }
        : u
    ));

  } catch (error: any) {
    showNotification("error", error.response?.data?.message || "Failed to contest-ban user.");
  }
};

const refreshViewModal = (updatedUsers: User[]) => {
  if (viewUserModal.open && viewUserModal.user) {
    const freshUser = updatedUsers.find(u => u._id === viewUserModal.user!._id);
    if (freshUser) setViewUserModal({ open: true, user: freshUser });
  }
};

const handleContestUnban = async (userId: string, contestId: string) => {  try {
    const token = localStorage.getItem("token");
    await axios.patch(
      `${API_URL}/users/${userId}/contest-unblock`,
      { contestId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    showNotification("success", "Contest ban removed!");
    
    // ✅ State update + modal refresh ek saath
    setUsers(prev => {
      const updated = prev.map(u =>
        u._id === userId
          ? {
              ...u,
              contestBans: u.contestBans?.map(b =>
                b.contestId === contestId ? { ...b, isActive: false } : b
              )
            }
          : u
      );
      // Modal mein bhi fresh user do
      const freshUser = updated.find(u => u._id === userId);
      if (freshUser) setViewUserModal({ open: true, user: freshUser });
      return updated;
    });
  } catch (error: any) {
    showNotification("error", "Failed to remove contest ban.");
  }
};

const handleRemovePermanentContestBan = async (userId: string, username: string) => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/users/${userId}/remove-permanent-contest-ban`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed');
    setUsers(prev => {
      const updated = prev.map(u =>
        u._id === userId ? { ...u, contestPermanentBan: false, contestPermanentBanReason: '' } : u
      );
      refreshViewModal(updated);
      return updated;
    });
    showNotification('success', `${username} ka permanent contest ban hata diya!`);
  } catch {
    showNotification('error', 'Failed to remove permanent contest ban');
  }
};

const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [
        problemsRes,
        contestsRes,
        discussionsRes,
        announcementsRes,
        usersRes,
        mcqRes,
        chatRoomsRes,
        redeemOrdersRes,
      ] = await Promise.all([
        axios.get(`${API_URL}/problems/admin/all`, { headers }),
        axios.get(`${API_URL}/contests`, { headers }),
        axios.get(`${API_URL}/discussion`, { headers }),
        axios.get(`${API_URL}/announcements`, { headers }),
        axios.get(`${API_URL}/users`, { headers }),
        axios.get(`${API_URL}/mcq`, { headers }).catch(() => ({ data: [] })),
        axios
          .get(`${API_URL}/chats/rooms`, { headers })
          .catch(() => ({ data: [] })),
        axios
          .get(`${API_URL}/redeem/admin/orders`, { headers })
          .catch(() => ({ data: { orders: [] } })),
      ]);

      // Remove duplicates by creating a Map with _id as key
      const uniqueUsers = Array.from(
        new Map((usersRes.data || []).map((user: User) => [user._id, user])).values()
      ) as User[];

      // Log if duplicates were found
      const originalCount = (usersRes.data || []).length;
      if (originalCount > uniqueUsers.length) {
        console.warn(`⚠️ Removed ${originalCount - uniqueUsers.length} duplicate users from API response`);
      }

      setProblems(problemsRes.data.problems || []);
      setContests(contestsRes.data || []);
      setDiscussions(discussionsRes.data.discussions || []);
      setAnnouncements(announcementsRes.data || []);
      setUsers(uniqueUsers);
      setMcqQuestions(mcqRes.data.questions || []);
      setChatRooms(chatRoomsRes.data || []);
      setRedeemOrders(redeemOrdersRes.data.orders || redeemOrdersRes.data || []);
    } catch (error: any) {
      console.error("❌ [AdminDashboard] Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

const handleUpdateOrderStatus = async (orderId: string) => {
  try {
    const token = localStorage.getItem('token');

    if (editOrderStatus === "cancelled" && !editCancelReason.trim()) {
      showNotification('error', 'Cancellation reason is required');
      return;
    }

    const updateData: any = {
      status: editOrderStatus,
      ...(editTrackingNumber && { trackingNumber: editTrackingNumber }),
    };

    if (editOrderStatus === 'cancelled') {
      updateData.reason = editCancelReason;
    } else if (editOrderStatus === 'delivered') {
      updateData.deliveredAt = editDeliveredAt || new Date().toISOString();
    } else if (editOrderStatus === 'shipped' || editOrderStatus === 'processing') {
      if (editPredictedDeliveryDate) {
        updateData.predictedDeliveryDate = editPredictedDeliveryDate;
      }
    }

    await axios.put(`${API_URL}/redeem/admin/orders/${orderId}`, updateData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    setEditingOrderId(null);
    setEditOrderStatus('');
    setEditTrackingNumber('');
    setEditCancelReason('');
    setEditDeliveredAt('');
    setEditPredictedDeliveryDate('');

    showNotification('success', 'Order status updated successfully!');
    await fetchData();

  } catch (error: any) {
    showNotification('error', `Failed to update order: ${error.response?.data?.error || error.message}`);
  }
};

  const handleCreateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("📝 Admin: Creating new problem...");
    console.log("👤 Current user role:", user?.role);
    console.log("🔑 Token exists:", !!localStorage.getItem("token"));

    try {
      const problemData = {
        title: newProblem.title,
        description: newProblem.description,
        difficulty: newProblem.difficulty,
        tags: newProblem.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        companies: newProblem.companies
          .split(",")
          .map((company) => company.trim())
          .filter((company) => company),
        constraints: newProblem.constraints,
        examples: newProblem.examples.filter((ex) => ex.input && ex.output),
        testCases: newProblem.testCases.filter((tc) => tc.input && tc.output),
        codeTemplates: newProblem.codeTemplates,
        functionSignature: newProblem.functionSignature,
        timeLimit: newProblem.timeLimit,
        memoryLimit: newProblem.memoryLimit,
        isPublished: newProblem.isPublished,
        isFeatured: newProblem.isFeatured,
        editorial: newProblem.editorial.written
          ? newProblem.editorial
          : undefined,
        visibility: newProblem.visibility,
        referenceSolution: newProblem.referenceSolution.filter(
        (sol) => sol.completeCode.trim() !== ""
      ),
      };

      console.log("📤 Sending problem data:", problemData);

      const token = localStorage.getItem("token");
      if (!token) {
        console.error("❌ No authentication token");
        alert("Please login again.");
        return;
      }

      const response = await axios.post(`${API_URL}/problems`, problemData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      console.log("✅ Admin: Problem created successfully");

      setProblems([response.data, ...problems]);
      setShowCreateProblem(false);
      setNewProblem({
        title: "",
        description: "",
        difficulty: "Easy",
        tags: "",
        companies: "",
        constraints: "",
        examples: [{ input: "", output: "", explanation: "" }],
        testCases: [{ input: "", output: "", explanation: "", isPublic: true }],
        codeTemplates: {
          cpp: "",
          java: "",
          python: "",
          c: "",
          javascript: "",
        },
        functionSignature: {
          cpp: "",
          java: "",
          python: "",
          c: "",
          javascript: "",
        },
        timeLimit: 2000,
        memoryLimit: 256,
        isPublished: false,
        isFeatured: false,
        editorial: {
          written: "",
          videoUrl: "",
          thumbnailUrl: "",
          duration: 0,
        },
        visibility: "public",
        referenceSolution: [
          { language: "cpp", completeCode: "" },
          { language: "java", completeCode: "" },
          { language: "python", completeCode: "" },
          { language: "c", completeCode: "" },
        ],
      });
      showNotification("success", "Problem created successfully!");
    } catch (error: any) {
      console.error("❌ Admin: Error creating problem:", error);
      console.error("📊 Error response:", error.response?.data);

      if (error.response?.status === 401) {
        showNotification(
          "error",
          "Authentication failed. Please logout and login again."
        );
      } else {
        showNotification(
          "error",
          `Failed to create problem: ${
            error.response?.data?.message || error.message
          }`
        );
      }
    }
  };

  // Helper functions for managing test cases and examples
  const addTestCase = () => {
    setNewProblem((prev) => ({
      ...prev,
      testCases: [
        ...prev.testCases,
        { input: "", output: "", explanation: "", isPublic: false },
      ],
    }));
  };

  const removeTestCase = (index: number) => {
    if (newProblem.testCases.length > 1) {
      setNewProblem((prev) => ({
        ...prev,
        testCases: prev.testCases.filter((_, i) => i !== index),
      }));
    }
  };

  const updateTestCase = (
    index: number,
    field: string,
    value: string | boolean
  ) => {
    setNewProblem((prev) => ({
      ...prev,
      testCases: prev.testCases.map((tc, i) =>
        i === index ? { ...tc, [field]: value } : tc
      ),
    }));
  };

  const addExample = () => {
    setNewProblem((prev) => ({
      ...prev,
      examples: [...prev.examples, { input: "", output: "", explanation: "" }],
    }));
  };

  const removeExample = (index: number) => {
    if (newProblem.examples.length > 1) {
      setNewProblem((prev) => ({
        ...prev,
        examples: prev.examples.filter((_, i) => i !== index),
      }));
    }
  };

  const updateExample = (index: number, field: string, value: string) => {
    setNewProblem((prev) => ({
      ...prev,
      examples: prev.examples.map((ex, i) =>
        i === index ? { ...ex, [field]: value } : ex
      ),
    }));
  };

  const updateCodeTemplate = (language: string, value: string) => {
    setNewProblem((prev) => ({
      ...prev,
      codeTemplates: { ...prev.codeTemplates, [language]: value },
    }));
  };

  const updateFunctionSignature = (language: string, value: string) => {
    setNewProblem((prev) => ({
      ...prev,
      functionSignature: { ...prev.functionSignature, [language]: value },
    }));
  };

  const updateReferenceSolution = (
    index: number,
    field: string,
    value: string
  ) => {
    setNewProblem((prev) => ({
      ...prev,
      referenceSolution: prev.referenceSolution.map((sol, i) =>
        i === index ? { ...sol, [field]: value } : sol
      ),
    }));
  };

  // MCQ CRUD handlers
  const handleCreateMCQ = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API_URL}/mcq`, newMCQ, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      setMcqQuestions([response.data, ...mcqQuestions]);
      setShowCreateMCQ(false);
      setNewMCQ({
        question: "",
        options: [
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ],
        domain: "dsa",
        difficulty: "Medium",
        explanation: "",
        tags: [] as string[],
        isActive: true,
      });
      showNotification("success", "MCQ Question created successfully!");
    } catch (error: any) {
      showNotification(
        "error",
        `Failed to create MCQ: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  };

  const handleDeleteMCQ = async (id: string) => {
    showConfirm("Delete MCQ Question", "Are you sure you want to delete this MCQ question?", async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/mcq/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMcqQuestions(mcqQuestions.filter((mcq) => mcq._id !== id));
      showNotification("success", "MCQ Question deleted!");
    } catch (error: any) {
      showNotification("error", "Failed to delete MCQ question.");
    }
  });
  };

  const handleEditMCQ = (mcq: MCQQuestion) => {
    setEditingMCQId(mcq._id);
    setEditMCQData({
      question: mcq.question,
      options: mcq.options.map(o => ({ text: o.text, isCorrect: o.isCorrect })),
      domain: mcq.domain,
      difficulty: mcq.difficulty,
      explanation: mcq.explanation || "",
      tags: mcq.tags || [],
      isActive: mcq.isActive,
    });
  };

  const handleUpdateMCQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMCQId || !editMCQData) return;
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(`${API_URL}/mcq/${editingMCQId}`, editMCQData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      setMcqQuestions(mcqQuestions.map(m => m._id === editingMCQId ? { ...m, ...response.data } : m));
      showNotification("success", "MCQ Question updated successfully!");
      setEditingMCQId(null);
      setEditMCQData(null);
    } catch (error: any) {
      showNotification("error", `Failed to update MCQ: ${error.response?.data?.message || error.message}`);
    }
  };

  // Chat Room CRUD handlers
  const handleCreateChatRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API_URL}/chats/rooms`, newChatRoom, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      setChatRooms([response.data, ...chatRooms]);
      setShowCreateChatRoom(false);
      setNewChatRoom({
        name: "",
        description: "",
        type: "general",
        isActive: true,
      });
      showNotification("success", "Chat Room created successfully!");
    } catch (error: any) {
      showNotification(
        "error",
        `Failed to create chat room: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  };

  const handleDeleteChatRoom = async (id: string) => {
    showConfirm("Delete Chat Room", "Are you sure you want to delete this chat room?", async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/chats/rooms/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChatRooms(chatRooms.filter((room) => room._id !== id));
      showNotification("success", "Chat Room deleted!");
    } catch (error: any) {
      showNotification("error", "Failed to delete chat room.");
    }
  });
  };

  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🏆 Admin: Creating new contest...");
    console.log("👤 Current user role:", user?.role);
    console.log("🔑 Token exists:", !!localStorage.getItem("token"));

    try {
      console.log("📤 Sending contest data:", newContest);

      const token = localStorage.getItem("token");
      if (!token) {
        console.error("❌ No authentication token");
        alert("Please login again.");
        return;
      }

      const response = await axios.post(`${API_URL}/contests`, newContest, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      console.log("✅ Admin: Contest created successfully");

      setContests([response.data, ...contests]);
      setShowCreateContest(false);
      setNewContest({
        name: "",
        description: "",
        bannerImage: "",
        startTime: "",
        endTime: "",
        duration: 60,
        isPublic: true,
        password: "",
        leaderboardVisible: true,
        freezeTime: 0,
        rules: "",
        editorial: "",
        allowedLanguages: ["cpp", "python", "java", "c", "js"],
        problems: [] as ContestProblem[],
      });
      showNotification("success", "Contest created successfully!");
    } catch (error: any) {
      console.error("❌ Admin: Error creating contest:", error);
      console.error("📊 Error response:", error.response?.data);

      if (error.response?.status === 401) {
        showNotification(
          "error",
          "Authentication failed. Please logout and login again."
        );
      } else {
        showNotification(
          "error",
          `Failed to create contest: ${
            error.response?.data?.message || error.message
          }`
        );
      }
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("📢 Admin: Creating new announcement...");
    console.log("👤 Current user in admin dashboard:", user);
    console.log("🔑 Token from localStorage:", localStorage.getItem("token"));
    console.log("🔍 User role check:", user?.role);

    try {
      const announcementData = {
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        type: newAnnouncement.type,
        priority: newAnnouncement.priority,
        tags: newAnnouncement.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        imageUrl: newAnnouncement.imageUrl,
        link: newAnnouncement.link,
        expiresAt: newAnnouncement.expiresAt
          ? new Date(newAnnouncement.expiresAt)
          : null,
        visibleToRoles: newAnnouncement.visibleToRoles,
        pinned: newAnnouncement.pinned,
      };

      console.log("📤 Sending announcement data:", announcementData);

      // Double-check authentication
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("❌ No token found in localStorage");
        alert("Authentication required. Please login again.");
        return;
      }

      if (user?.role !== "admin") {
        console.error("❌ User is not admin:", user?.role);
        alert("Admin access required.");
        return;
      }

      const response = await axios.post(
        `${API_URL}/announcements`,
        announcementData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("✅ Admin: Announcement created successfully");

      setAnnouncements([response.data, ...announcements]);
      setShowCreateAnnouncement(false);
      setNewAnnouncement({
        title: "",
        content: "",
        type: "general",
        priority: "medium",
        tags: "",
        imageUrl: "",
        link: "",
        expiresAt: "",
        visibleToRoles: ["user"],
        pinned: false,
      });
      showNotification("success", "Announcement created successfully!");
    } catch (error: any) {
      console.error("❌ Admin: Error creating announcement:", error);
      console.error("📊 Error response:", error.response?.data);
      console.error("📊 Error status:", error.response?.status);
      console.error("📊 Error headers:", error.response?.headers);

      if (error.response?.status === 401) {
        console.error("🔒 Authentication failed - token may be invalid");
        showNotification(
          "error",
          "Authentication failed. Please logout and login again."
        );
      } else {
        showNotification(
          "error",
          `Failed to create announcement: ${
            error.response?.data?.message || error.message
          }`
        );
      }
    }
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncementId(announcement._id);
    setEditAnnouncementData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      // Add other fields as needed
    });
  };

  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncementId) return;
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${API_URL}/announcements/${editingAnnouncementId}`,
        editAnnouncementData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setAnnouncements(
        announcements.map((a) =>
          a._id === editingAnnouncementId ? response.data : a
        )
      );
      setEditingAnnouncementId(null);
      setEditAnnouncementData(null);
      showNotification("success", "Announcement updated!");
    } catch (error: any) {
      showNotification("error", "Failed to update announcement.");
    }
  };

  const handleDeleteProblem = async (problemId: string) => {
    console.log("🗑️ Admin: Deleting problem:", problemId);
    showConfirm("Delete Problem", "Are you sure you want to delete this problem?", async () => {

    try {
      await axios.delete(`${API_URL}/problems/${problemId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      console.log("✅ Problem deleted successfully");
      setProblems(problems.filter((p) => p._id !== problemId));
      showNotification("success", "Problem deleted successfully!");
    } catch (error) {
      console.error("❌ Error deleting problem:", error);
      showNotification("error", "Failed to delete problem.");
    }
  });
  };

  const handleEditProblem = (problem: Problem) => {
    setEditingProblemId(problem._id);
    setEditProblemData({ ...problem });
  };

  const handleUpdateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProblemId || !editProblemData) return;
    try {
      const token = localStorage.getItem("token");
const updateData = {
      ...editProblemData,
      // ✅ Ensure referenceSolution is included
      referenceSolution: editProblemData.referenceSolution || [],
    };

      const response = await axios.put(
        `${API_URL}/problems/${editingProblemId}`,
        editProblemData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setProblems(
        problems.map((p) => (p._id === editingProblemId ? response.data : p))
      );
      setEditingProblemId(null);
      setEditProblemData(null);
      showNotification("success", "Problem updated successfully!");
    } catch (error: any) {
      showNotification(
        "error",
        `Failed to update problem: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  };

  const handleEditContest = (contest: Contest) => {
    setEditingContestId(contest._id);
    setEditContestData({ ...contest });
  };

  const handleUpdateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContestId || !editContestData) return;
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${API_URL}/contests/${editingContestId}`,
        editContestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setContests(
        contests.map((c) => (c._id === editingContestId ? response.data : c))
      );
      setEditingContestId(null);
      setEditContestData(null);
      showNotification("success", "Contest updated successfully!");
    } catch (error: any) {
      showNotification(
        "error",
        `Failed to update contest: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  };

  const handleDeleteContest = async (contestId: string) => {
    console.log("🗑️ Admin: Deleting contest:", contestId);
    showConfirm("Delete Contest", "Are you sure you want to delete this contest?", async () => {

    try {
      await axios.delete(`${API_URL}/contests/${contestId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      console.log("✅ Contest deleted successfully");
      setContests(contests.filter((c) => c._id !== contestId));
      showNotification("success", "Contest deleted successfully!");
    } catch (error) {
      console.error("❌ Error deleting contest:", error);
      showNotification("error", "Failed to delete contest.");
    }
  });
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    console.log("🗑️ Admin: Deleting announcement:", announcementId);
    showConfirm("Delete Announcement", "Are you sure you want to delete this announcement?", async () => {

    try {
      await axios.delete(`${API_URL}/announcements/${announcementId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      console.log("✅ Announcement deleted successfully");
      setAnnouncements(announcements.filter((a) => a._id !== announcementId));
      showNotification("success", "Announcement deleted successfully!");
    } catch (error) {
      console.error("❌ Error deleting announcement:", error);
      showNotification("error", "Failed to delete announcement.");
    }
  });
  };

  const handleDeleteDiscussion = async (discussionId: string) => {
    console.log("🗑️ Admin: Deleting discussion:", discussionId);
    showConfirm("Delete Discussion", "Are you sure you want to delete this discussion?", async () => {

    try {
      await axios.delete(`${API_URL}/discussion/${discussionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      console.log("✅ Discussion deleted successfully");
      setDiscussions(discussions.filter((d) => d._id !== discussionId));
      showNotification("success", "Discussion deleted successfully!");
    } catch (error) {
      console.error("❌ Error deleting discussion:", error);
      showNotification("error", "Failed to delete discussion.");
    }
  });
  };

  const stats = [
    {
      title: "Total Problems",
      value: problems.length,
      icon: <Code className="h-8 w-8 text-blue-600" />,
      color:
        "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    },
    {
  title: "Active Contests",
  value: contests.filter((c) => {
    const now = new Date();
    const start = new Date(c.startTime);
    const end = new Date(c.endTime);
    return now >= start && now <= end;
  }).length,
      icon: <Trophy className="h-8 w-8 text-yellow-600" />,
      color:
        "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    },
    {
      title: "Discussions",
      value: discussions.length,
      icon: <MessageSquare className="h-8 w-8 text-green-600" />,
      color:
        "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    },
    {
      title: "Announcements",
      value: announcements.length,
      icon: <Megaphone className="h-8 w-8 text-purple-600" />,
      color:
        "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
    },
  ];

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      icon: <Settings className="h-4 w-4" />,
    },
    { id: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { id: "problems", label: "Problems", icon: <Code className="h-4 w-4" /> },
    { id: "contests", label: "Contests", icon: <Trophy className="h-4 w-4" /> },
    {
      id: "discussions",
      label: "Discussions",
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      id: "announcements",
      label: "Announcements",
      icon: <Megaphone className="h-4 w-4" />,
    },
    {
      id: "mcq",
      label: "MCQ Questions",
      icon: <HelpCircle className="h-4 w-4" />,
    },
    {
      id: "chats",
      label: "Chat Rooms",
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      id: "documents",
      label: "View Documents",
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      id: "add-document",
      label: "Add Document",
      icon: <Plus className="h-4 w-4" />,
    },  
      { id: "help", label: "Help Articles", icon: <FileText className="h-4 w-4" /> },
    {
      id: "redeem-orders",
      label: "Redeem Orders",
      icon: <ShoppingCart className="h-4 w-4" />,
    },
    {
  id: "plagiarism",
  label: "Plagiarism",
  icon: <AlertTriangle className="h-4 w-4 text-red-400" />,
},
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell className="h-4 w-4" />,
    },

    {
  id: "reports",
  label: "Reports",
  icon: <Flag className="h-4 w-4 text-red-400" />,
},
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-300 relative ${
        isDark
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900"
          : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
      }`}
    >
      {/* Animated Background - same as Game.tsx */}
      {isDark && (
        <>
          <style>{`
            @keyframes gaming-pulse {
              0%, 100% {
                transform: translateX(0px) translateY(0px) scale(1) rotate(0deg);
                opacity: 0.7;
              }
              25% {
                transform: translateX(25px) translateY(-15px) scale(1.1) rotate(90deg);
                opacity: 1;
              }
              50% {
                transform: translateX(-10px) translateY(20px) scale(0.9) rotate(180deg);
                opacity: 0.8;
              }
              75% {
                transform: translateX(35px) translateY(5px) scale(1.05) rotate(270deg);
                opacity: 0.9;
              }
            }
            @keyframes neon-glow {
              0%, 100% { 
                box-shadow: 0 0 5px rgba(34, 197, 94, 0.5), 0 0 10px rgba(34, 197, 94, 0.3), 0 0 15px rgba(34, 197, 94, 0.1);
                opacity: 0.6; 
              }
              50% { 
                box-shadow: 0 0 10px rgba(34, 197, 94, 0.8), 0 0 20px rgba(34, 197, 94, 0.6), 0 0 30px rgba(34, 197, 94, 0.4);
                opacity: 1; 
              }
            }
            @keyframes digital-rain {
              0% { transform: translateY(-100px) translateX(0px) rotate(0deg); opacity: 0; }
              10% { opacity: 0.8; }
              90% { opacity: 0.8; }
              100% { transform: translateY(100vh) translateX(20px) rotate(360deg); opacity: 0; }
            }
            @keyframes cyber-orbit {
              0% { transform: rotate(0deg) translateX(100px) rotate(0deg); }
              100% { transform: rotate(360deg) translateX(100px) rotate(-360deg); }
            }
            @keyframes gaming-nebula {
              0%, 100% { 
                transform: scale(1) rotate(0deg);
                background: linear-gradient(45deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1));
              }
              33% { 
                transform: scale(1.1) rotate(120deg);
                background: linear-gradient(45deg, rgba(147, 51, 234, 0.1), rgba(34, 197, 94, 0.1));
              }
              66% { 
                transform: scale(0.9) rotate(240deg);
                background: linear-gradient(45deg, rgba(239, 68, 68, 0.1), rgba(147, 51, 234, 0.1));
              }
            }
            .gaming-pulse {
              animation: gaming-pulse 6s ease-in-out infinite;
            }
            .neon-glow {
              animation: neon-glow 2s ease-in-out infinite;
            }
            .digital-rain {
              animation: digital-rain 8s linear infinite;
            }
            .cyber-orbit {
              animation: cyber-orbit 20s linear infinite;
            }
            .gaming-nebula {
              animation: gaming-nebula 12s ease-in-out infinite;
            }
          `}</style>
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute top-1/4 left-1/5 w-96 h-96 gaming-nebula rounded-full blur-3xl"></div>
            <div
              className="absolute bottom-1/3 right-1/4 w-80 h-80 gaming-nebula rounded-full blur-3xl"
              style={{ animationDelay: "4s" }}
            ></div>
            <div
              className="absolute top-2/3 left-1/3 w-64 h-64 gaming-nebula rounded-full blur-2xl"
              style={{ animationDelay: "8s" }}
            ></div>
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={`neon-particle-admin-${i}`}
                className={`neon-glow absolute ${
                  i % 6 === 0
                    ? "w-2 h-2 bg-green-400 rounded-full"
                    : i % 6 === 1
                    ? "w-1.5 h-1.5 bg-blue-400 rounded-full"
                    : i % 6 === 2
                    ? "w-2 h-2 bg-purple-400 rounded-full"
                    : i % 6 === 3
                    ? "w-1 h-1 bg-cyan-400 rounded-full"
                    : i % 6 === 4
                    ? "w-1.5 h-1.5 bg-pink-400 rounded-full"
                    : "w-2 h-2 bg-red-400 rounded-full"
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 1}s`,
                }}
              />
            ))}
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={`digital-rain-admin-${i}`}
                className={`digital-rain absolute w-1 h-8 ${
                  i % 4 === 0
                    ? "bg-gradient-to-b from-green-400 to-transparent"
                    : i % 4 === 1
                    ? "bg-gradient-to-b from-blue-400 to-transparent"
                    : i % 4 === 2
                    ? "bg-gradient-to-b from-purple-400 to-transparent"
                    : "bg-gradient-to-b from-cyan-400 to-transparent"
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 8}s`,
                  animationDuration: `${8 + Math.random() * 4}s`,
                }}
              />
            ))}
            <div className="absolute top-1/4 left-1/4 w-4 h-4">
              <div className="cyber-orbit w-2 h-2 bg-green-400 rounded-full neon-glow"></div>
            </div>
            <div className="absolute top-3/4 right-1/3 w-4 h-4">
              <div
                className="cyber-orbit w-2 h-2 bg-blue-400 rounded-full neon-glow"
                style={{ animationDelay: "5s" }}
              ></div>
            </div>
            <div className="absolute top-1/2 left-2/3 w-4 h-4">
              <div
                className="cyber-orbit w-2 h-2 bg-purple-400 rounded-full neon-glow"
                style={{ animationDelay: "10s" }}
              ></div>
            </div>
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={`gaming-pulse-admin-${i}`}
                className={`gaming-pulse absolute ${
                  i % 4 === 0
                    ? "w-4 h-4 bg-gradient-to-br from-green-500/40 to-blue-500/40"
                    : i % 4 === 1
                    ? "w-3 h-3 bg-gradient-to-br from-purple-500/40 to-pink-500/40"
                    : i % 4 === 2
                    ? "w-3.5 h-3.5 bg-gradient-to-br from-cyan-500/40 to-green-500/40"
                    : "w-4 h-4 bg-gradient-to-br from-red-500/40 to-orange-500/40"
                } rounded-full blur-sm`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${6 + Math.random() * 3}s`,
                  animationDelay: `${Math.random() * 6}s`,
                }}
              />
            ))}
          </div>
        </>
      )}
      {!isDark && (
        <>
          <style>{`
            @keyframes light-gaming-float {
              0%, 100% {
                transform: translateY(0px) translateX(0px) rotate(0deg);
                opacity: 0.5;
              }
              25% {
                transform: translateY(-12px) translateX(18px) rotate(90deg);
                opacity: 0.8;
              }
              50% {
                transform: translateY(8px) translateX(-10px) rotate(180deg);
                opacity: 1;
              }
              75% {
                transform: translateY(-18px) translateX(25px) rotate(270deg);
                opacity: 0.6;
              }
            }
            @keyframes pastel-glow {
              0%, 100% { 
                box-shadow: 0 0 8px rgba(59, 130, 246, 0.3), 0 0 16px rgba(147, 51, 234, 0.2);
                opacity: 0.6; 
              }
              50% { 
                box-shadow: 0 0 16px rgba(59, 130, 246, 0.5), 0 0 32px rgba(147, 51, 234, 0.4);
                opacity: 1; 
              }
            }
            @keyframes light-pixel-fall {
              0% { transform: translateY(-50px) translateX(0px) rotate(0deg); opacity: 0; }
              10% { opacity: 0.7; }
              90% { opacity: 0.7; }
              100% { transform: translateY(100vh) translateX(30px) rotate(360deg); opacity: 0; }
            }
            @keyframes gaming-aurora {
              0%, 100% { 
                background: linear-gradient(45deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15));
                transform: scale(1) rotate(0deg);
              }
              33% { 
                background: linear-gradient(45deg, rgba(34, 197, 94, 0.15), rgba(59, 130, 246, 0.15));
                transform: scale(1.05) rotate(120deg);
              }
              66% { 
                background: linear-gradient(45deg, rgba(251, 191, 36, 0.15), rgba(34, 197, 94, 0.15));
                transform: scale(0.95) rotate(240deg);
              }
            }
            .light-gaming-float {
              animation: light-gaming-float 5s ease-in-out infinite;
            }
            .pastel-glow {
              animation: pastel-glow 2.5s ease-in-out infinite;
            }
            .light-pixel-fall {
              animation: light-pixel-fall 7s linear infinite;
            }
            .gaming-aurora {
              animation: gaming-aurora 10s ease-in-out infinite;
            }
          `}</style>
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute top-1/5 left-1/3 w-96 h-96 gaming-aurora rounded-full blur-3xl"></div>
            <div
              className="absolute bottom-1/4 right-1/5 w-80 h-80 gaming-aurora rounded-full blur-3xl"
              style={{ animationDelay: "3s" }}
            ></div>
            <div
              className="absolute top-2/3 left-1/6 w-64 h-64 gaming-aurora rounded-full blur-2xl"
              style={{ animationDelay: "7s" }}
            ></div>
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={`pastel-particle-admin-${i}`}
                className={`pastel-glow absolute ${
                  i % 6 === 0
                    ? "w-2 h-2 bg-blue-400/70 rounded-full"
                    : i % 6 === 1
                    ? "w-1.5 h-1.5 bg-purple-400/70 rounded-full"
                    : i % 6 === 2
                    ? "w-2 h-2 bg-green-400/70 rounded-full"
                    : i % 6 === 3
                    ? "w-1 h-1 bg-pink-400/70 rounded-full"
                    : i % 6 === 4
                    ? "w-1.5 h-1.5 bg-cyan-400/70 rounded-full"
                    : "w-2 h-2 bg-yellow-400/70 rounded-full"
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2.5}s`,
                  animationDuration: `${2.5 + Math.random() * 1}s`,
                }}
              />
            ))}
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={`pixel-fall-admin-${i}`}
                className={`light-pixel-fall absolute w-1 h-1 ${
                  i % 5 === 0
                    ? "bg-blue-300/60"
                    : i % 5 === 1
                    ? "bg-purple-300/60"
                    : i % 5 === 2
                    ? "bg-green-300/60"
                    : i % 5 === 3
                    ? "bg-pink-300/60"
                    : "bg-cyan-300/60"
                } rounded-full`}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 7}s`,
                  animationDuration: `${7 + Math.random() * 3}s`,
                }}
              />
            ))}
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={`light-gaming-admin-${i}`}
                className={`light-gaming-float absolute ${
                  i % 4 === 0
                    ? "w-3 h-3 bg-gradient-to-br from-blue-200/50 to-purple-200/50"
                    : i % 4 === 1
                    ? "w-2.5 h-2.5 bg-gradient-to-br from-green-200/50 to-cyan-200/50"
                    : i % 4 === 2
                    ? "w-3 h-3 bg-gradient-to-br from-pink-200/50 to-red-200/50"
                    : "w-2.5 h-2.5 bg-gradient-to-br from-yellow-200/50 to-orange-200/50"
                } rounded-full blur-sm`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${5 + Math.random() * 2}s`,
                  animationDelay: `${Math.random() * 5}s`,
                }}
              />
            ))}
          </div>
        </>
      )}
      <div className="relative z-10">
        {/* Notification */}
{/* ✅ Block Modal */}
{blockModal.open && (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4">
    <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl border border-red-500">
      <h2 className="text-xl font-bold text-white mb-2">🚫 Block User</h2>
      <p className="text-gray-400 mb-4 text-sm">User ko permanently block karo. Woh login nahi kar payega.</p>
      <label className="text-gray-300 text-sm mb-1 block">Reason (optional)</label>
      <input
        type="text"
        className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 mb-4 border border-gray-600 focus:outline-none focus:border-red-400"
        placeholder="e.g. Plagiarism, cheating..."
        value={blockReason}
        onChange={(e) => setBlockReason(e.target.value)}
      />
      <div className="flex gap-3 justify-end">
        <button onClick={() => { setBlockModal({ open: false, userId: null }); setBlockReason(""); }}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition">
          Cancel
        </button>
        <button onClick={handleBlockUser}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition">
          Yes, Block User
        </button>
      </div>
    </div>
  </div>
)}

{/* ✅ Contest Ban Modal */}
{contestBanModal.open && (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4">
    <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl border border-orange-500">
      <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
        <Shield className="h-5 w-5 text-orange-400" />
        Contest Ban: {contestBanModal.username}
      </h2>
      <p className="text-gray-400 text-sm mb-4">User ko specific contest se disqualify karo (plagiarism).</p>

      <label className="text-gray-300 text-sm mb-1 block">Contest *</label>
      <select
        className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 mb-3 border border-gray-600 focus:outline-none focus:border-orange-400"
        value={contestBanContestId}
        onChange={(e) => setContestBanContestId(e.target.value)}
      >
        <option value="">-- Select Contest --</option>
        {contests.map(c => (
          <option key={c._id} value={c._id}>{c.name}</option>
        ))}
      </select>

      <label className="text-gray-300 text-sm mb-1 block">Similarity % *</label>
      <input type="number" min={0} max={100}
        className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 mb-3 border border-gray-600 focus:outline-none focus:border-orange-400"
        value={contestBanSimilarity}
        onChange={(e) => setContestBanSimilarity(Number(e.target.value))}
      />

      <label className="text-gray-300 text-sm mb-1 block">Matched With User ID (optional)</label>
      <input type="text"
        className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 mb-3 border border-gray-600 focus:outline-none focus:border-orange-400"
        placeholder="Other user's _id"
        value={contestBanMatchedUser}
        onChange={(e) => setContestBanMatchedUser(e.target.value)}
      />

     <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={contestBanPermanent}
            onChange={(e) => setContestBanPermanent(e.target.checked)}
            className="w-4 h-4 accent-red-500"
          />
          <div>
            <p className="text-red-300 font-semibold text-sm">🚫 Force Permanent Contest Ban</p>
            <p className="text-red-400 text-xs mt-0.5">
              User ko sabhi future contests se permanently ban karo (chahe 1st offense ho).
            </p>
          </div>
        </label>
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={() => {
          setContestBanModal({ open: false, userId: null, username: "" });
          setContestBanContestId("");
          setContestBanSimilarity(80);
          setContestBanMatchedUser("");
          setContestBanProblemId("");
          setContestBanPermanent(false); // ✅ NEW
        }}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition">
          Cancel
        </button>
        <button
          onClick={handleContestBanUser}
          disabled={!contestBanContestId}
          className={`px-4 py-2 disabled:opacity-50 text-white rounded-lg font-semibold transition ${
            contestBanPermanent
              ? "bg-red-600 hover:bg-red-700"
              : "bg-orange-600 hover:bg-orange-700"
          }`}>
          {contestBanPermanent ? "🚫 Permanent Ban" : "Contest Ban"}
        </button>
      </div>
    </div>
  </div>
)}

{/* ✅ User Detail Modal */}
{viewUserModal.open && viewUserModal.user && (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4">
    <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[85vh] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{viewUserModal.user.username}</h2>
          <p className="text-sm text-gray-500">{viewUserModal.user.email}</p>
        </div>
        <button onClick={() => setViewUserModal({ open: false, user: null })}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700 px-5">
        {[
          { id: "info", label: "Info", icon: <Users className="h-4 w-4" /> },
          { id: "contestBans", label: `Contest Bans (${viewUserModal.user.contestBans?.filter(b => b.isActive).length || 0} active)`, icon: <Ban className="h-4 w-4" /> },
         { id: "plagiarism", label: `Warnings (${viewUserModal.user.plagiarismWarnings?.length || 0})`, icon: <AlertTriangle className="h-4 w-4" /> },
{ id: "plagiarismCases", label: "Plagiarism Cases", icon: <Shield className="h-4 w-4 text-red-400" /> },        ].map(tab => (
          <button key={tab.id}
            onClick={() => setActiveUserTab(tab.id as any)}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 text-sm font-medium transition-colors ${
              activeUserTab === tab.id ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto flex-1 p-5">
        {activeUserTab === "info" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Role</p>
                <p className="font-medium text-sm">{viewUserModal.user.role || "user"}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Joined</p>
                <p className="font-medium text-sm">{viewUserModal.user.createdAt ? new Date(viewUserModal.user.createdAt).toLocaleDateString() : "N/A"}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Account Status</p>
                {viewUserModal.user.isBanned
                  ? <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">🚫 Banned</span>
                  : <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">✅ Active</span>}
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Active Contest Bans</p>
                <p className="font-bold text-sm text-orange-600">{viewUserModal.user.contestBans?.filter(b => b.isActive).length || 0}</p>
              </div>
            </div>
            {viewUserModal.user.isBanned && viewUserModal.user.bannedReason && (
  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
    <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">Ban Reason</p>
    <p className="text-sm text-red-600">{viewUserModal.user.bannedReason}</p>
  </div>
)}
{viewUserModal.user?.contestPermanentBan && (
  <div className="flex items-center justify-between bg-red-900/30 border border-red-500/50 rounded-lg p-3 mt-2">
    <div>
      <span className="text-red-400 font-semibold text-sm">🚫 Permanently Contest Banned</span>
      <p className="text-gray-400 text-xs mt-1">
        {viewUserModal.user.contestPermanentBanReason || 'Auto-banned by system'}
      </p>
    </div>
    <button
      onClick={() => handleRemovePermanentContestBan(
        viewUserModal.user!._id,
        viewUserModal.user!.username!
      )}
      className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors ml-3"
    >
      Remove Ban
    </button>
  </div>
)}
          </div>
        )}

        {activeUserTab === "contestBans" && (
          <div className="space-y-3">
            {(!viewUserModal.user.contestBans || viewUserModal.user.contestBans.length === 0) ? (
              <div className="text-center py-8 text-gray-400">
                <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No contest bans found.</p>
              </div>
            ) : (
              viewUserModal.user.contestBans.map((ban, idx) => (
                <div key={ban._id || idx} className={`p-4 rounded-lg border ${
                  ban.isActive
                    ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                    : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 opacity-60"
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          ban.isActive ? "bg-orange-200 text-orange-800" : "bg-gray-200 text-gray-600"
                        }`}>{ban.isActive ? "🚫 Active" : "✅ Removed"}</span>
                        {ban.similarity && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            {ban.similarity}% similarity
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Contest ID: <span className="font-mono">{ban.contestId}</span></p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Reason: {ban.reason}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Banned: {new Date(ban.bannedAt).toLocaleDateString()}
                        {ban.unbannedAt && ` • Removed: ${new Date(ban.unbannedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    {ban.isActive && (
                      <button
                        onClick={() => handleContestUnban(viewUserModal.user!._id, ban.contestId)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-medium transition-colors flex-shrink-0"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Unban
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      {activeUserTab === "plagiarism" && (
  <div className="space-y-3">
    {(!viewUserModal.user.plagiarismWarnings || viewUserModal.user.plagiarismWarnings.length === 0) ? (
      <div className="text-center py-8 text-gray-400">
        <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No plagiarism warnings.</p>
      </div>
    ) : (
      viewUserModal.user.plagiarismWarnings.map((w, idx) => (
        <div key={idx} className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Warning #{idx + 1}</span>
          </div>
          <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto">
            {JSON.stringify(w, null, 2)}
          </pre>
        </div>
      ))
    )}
  </div>
)}

{activeUserTab === "plagiarismCases" && (
  <div className="space-y-3">
    <p className="text-xs text-gray-500 mb-3">
      Yeh cases sirf un contests ke hain jisme is user ka code similar tha.
    </p>
    {contests
      .filter((c: Contest) =>
        (c as any).plagiarismCases?.some(
          (pc: any) =>
            pc.user1?.toString() === viewUserModal.user!._id ||
            pc.user2?.toString() === viewUserModal.user!._id
        )
      ).length === 0 ? (
      <div className="text-center py-8 text-gray-400">
        <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Koi plagiarism case nahi mila.</p>
      </div>
    ) : (
      contests
        .flatMap((c: Contest) =>
          ((c as any).plagiarismCases || [])
            .map((pc: any, idx: number) => ({
              ...pc,
              contestName: c.name,
              contestId: c._id,
              idx,
            }))
            .filter(
              (pc: any) =>
                pc.user1?.toString() === viewUserModal.user!._id ||
                pc.user2?.toString() === viewUserModal.user!._id
            )
        )
        .map((pc: any, i: number) => (
          <div key={i} className={`p-4 rounded-lg border ${
            pc.actionTaken === "pending"
              ? "bg-red-500/5 border-red-500/30"
              : "bg-gray-800/60 border-gray-700/50"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-2xl font-black ${
                pc.similarity >= 90 ? "text-red-400" :
                pc.similarity >= 80 ? "text-orange-400" : "text-yellow-400"
              }`}>{pc.similarity}%</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                pc.actionTaken === "pending"     ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/25" :
                pc.actionTaken === "warned"      ? "bg-orange-500/10 text-orange-400 border-orange-500/25" :
                pc.actionTaken === "contest_ban" ? "bg-red-500/10 text-red-400 border-red-500/25" :
                pc.actionTaken === "ignored"     ? "bg-green-500/10 text-green-400 border-green-500/25" :
                                                   "bg-gray-500/10 text-gray-400 border-gray-500/25"
              }`}>
                {pc.actionTaken === "pending"     ? "⏳ Pending" :
                 pc.actionTaken === "warned"      ? "⚠️ Warned" :
                 pc.actionTaken === "contest_ban" ? "🚫 Banned" :
                 pc.actionTaken === "ignored"     ? "✅ Ignored" : pc.actionTaken}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Contest: <span className="text-gray-200 font-medium">{pc.contestName}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Detected: {new Date(pc.detectedAt).toLocaleDateString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
              })}
            </p>
          </div>
        ))
    )}
  </div>
)}
      </div>
    </div>
  </div>
)}

        {/* Global Confirm Modal */}
        {confirmModal.open && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999999, padding: '16px' }}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{confirmModal.title}</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">{confirmModal.message}</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={closeConfirm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { confirmModal.onConfirm(); closeConfirm(); }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {notification && (
          <div
            style={{ position: 'fixed', top: '80px', right: '16px', zIndex: 999999 }}
            className={`p-4 rounded-lg shadow-2xl border-2 max-w-sm ${
              notification.type === "success"
                ? "bg-green-100 text-green-800 border-green-400"
                : notification.type === "error"
                ? "bg-red-100 text-red-800 border-red-400"
                : "bg-blue-100 text-blue-800 border-blue-400"
            }`}
          >
            <p className="font-semibold text-sm">{notification.message}</p>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Manage your platform content and settings
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`p-6 rounded-lg border ${stat.color} transition-transform duration-200 hover:scale-105 hover:shadow-lg`}
                // ↑ Added scaling and shadow on hover
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                  {stat.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="flex overflow-x-auto scrollbar-hide px-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 py-3 px-3 border-b-2 font-medium text-xs whitespace-nowrap flex-shrink-0 transition-colors ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Problems */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        Recent Problems
                      </h3>
                      <div className="space-y-3">
                        {problems.slice(0, 5).map((problem) => (
                          <div
                            key={problem._id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{problem.title}</p>
                              <p className="text-sm text-gray-600">
                                {problem.difficulty} •{" "}
                                {problem.acceptanceRate.toFixed(1)}% acceptance
                              </p>
                            </div>
                            <span className="text-sm text-gray-500">
                              {problem.submissions} submissions
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Contests */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        Recent Contests
                      </h3>
                      <div className="space-y-3">
                        {contests.slice(0, 5).map((contest) => (
                          <div
                            key={contest._id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{contest.name}</p>
                              <p className="text-sm text-gray-600">
                                {contest.status} • {contest.participants.length}{" "}
                                participants
                              </p>
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(contest.startTime).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "users" && (
                <div>
   <div className="flex items-center justify-between mb-4">
  <div>
    <h3 className="text-xl font-bold text-white">Manage Users</h3>
    <p className="text-sm text-gray-500 mt-0.5">{users.length} total users</p>
  </div>
  <button
    onClick={() => setShowCreateUser(true)}
    className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg shadow-lg shadow-blue-500/20 transition-all duration-150 text-sm font-medium"
  >
    <Plus className="h-4 w-4 mr-2" />
    Add User
  </button>
</div>

{/* Search Bar */}
<div className="relative mb-6">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
  <input
    type="text"
    placeholder="Search by username, email or role..."
    value={userSearchQuery}
    onChange={(e) => { setUserSearchQuery(e.target.value); setUserCurrentPage(1); }}
    className="w-full pl-10 pr-4 py-2.5 bg-gray-800/60 border border-gray-700/60 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
  />
  {userSearchQuery && (
    <button
      onClick={() => { setUserSearchQuery(""); setUserCurrentPage(1); }}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
    >
      <X className="h-4 w-4" />
    </button>
  )}
</div>

                  {showCreateUser && (
                    <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg max-w-lg">
                      <h4 className="text-lg font-semibold mb-4">
                        Create New User
                      </h4>
                      <form onSubmit={handleCreateUser} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Username *
                          </label>
                          <input
                            type="text"
                            required
                            value={newUser.username}
                            onChange={(e) =>
                              setNewUser({
                                ...newUser,
                                username: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Email *
                          </label>
                          <input
                            type="email"
                            required
                            value={newUser.email}
                            onChange={(e) =>
                              setNewUser({ ...newUser, email: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Password *
                          </label>
                          <input
                            type="password"
                            required
                            value={newUser.password}
                            onChange={(e) =>
                              setNewUser({
                                ...newUser,
                                password: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Role
                          </label>
                          <select
                            value={newUser.role}
                            onChange={(e) =>
                              setNewUser({ ...newUser, role: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div className="flex space-x-4">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                          >
                            Create User
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCreateUser(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {editingUserId && (
                    <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg max-w-lg">
                      <h4 className="text-lg font-semibold mb-4">Edit User</h4>
                      <form onSubmit={handleUpdateUser} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Username *
                          </label>
                          <input
                            type="text"
                            required
                            value={editUserData?.username || ""}
                            onChange={(e) =>
                              setEditUserData({
                                ...editUserData,
                                username: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Email *
                          </label>
                          <input
                            type="email"
                            required
                            value={editUserData?.email || ""}
                            onChange={(e) =>
                              setEditUserData({
                                ...editUserData,
                                email: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Role
                          </label>
                          <select
                            value={editUserData?.role || "user"}
                            onChange={(e) =>
                              setEditUserData({
                                ...editUserData,
                                role: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div className="flex space-x-4">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                          >
                            Update User
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUserId(null);
                              setEditUserData(null);
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

             <div className="overflow-x-auto rounded-xl border border-gray-700/50 shadow-2xl">
  <table className="w-full min-w-[800px] bg-gray-900/80 backdrop-blur-sm">
    <thead>
      <tr className="border-b border-gray-700/60">
        <th className="px-5 py-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Username</th>
        <th className="px-5 py-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Email</th>
        <th className="px-5 py-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Role</th>
        <th className="px-5 py-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Created</th>
        <th className="px-5 py-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Status</th>
        <th className="px-5 py-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Actions</th>
      </tr>
    </thead>
    <tbody>
      {users.length === 0 ? (
        <tr>
          <td colSpan={6} className="text-center py-16 text-gray-500">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No users found.</p>
          </td>
        </tr>
      ) : (
        (() => {
          const filtered = users.filter(u => {
            const q = userSearchQuery.toLowerCase();
            return (
              (u.username || "").toLowerCase().includes(q) ||
              (u.email || "").toLowerCase().includes(q) ||
              (u.role || "").toLowerCase().includes(q)
            );
          });
          const paginated = filtered.slice(
            (userCurrentPage - 1) * USERS_PER_PAGE,
            userCurrentPage * USERS_PER_PAGE
          );
          return paginated.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-16 text-gray-500">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{userSearchQuery ? `No results for "${userSearchQuery}"` : "No users found."}</p>
              </td>
            </tr>
          ) : paginated.map((user, idx) => {
          const displayName =
            typeof user.username === "string" && user.username.trim()
              ? user.username
              : (user.profile && typeof user.profile.firstName === "string" && user.profile.firstName.trim()
                  ? user.profile.firstName : "") +
                (user.profile && typeof user.profile.lastName === "string" && user.profile.lastName.trim()
                  ? ` ${user.profile.lastName}` : "") || "N/A";
          const displayEmail = typeof user.email === "string" && user.email.trim() ? user.email : "N/A";
          const displayRole = typeof user.role === "string" && user.role.trim() ? user.role : "user";
          let displayCreated = "N/A";
          if (user.createdAt) {
            try { displayCreated = new Date(user.createdAt).toLocaleDateString(); } catch { displayCreated = "N/A"; }
          }
          const avatarLetter = displayName !== "N/A" ? displayName[0].toUpperCase() : "?";
          const avatarColors = [
            "from-violet-500 to-purple-600",
            "from-blue-500 to-cyan-600",
            "from-emerald-500 to-teal-600",
            "from-orange-500 to-amber-600",
            "from-pink-500 to-rose-600",
            "from-indigo-500 to-blue-600",
          ];
          const colorClass = avatarColors[idx % avatarColors.length];

          return (
            <tr key={user._id} className="border-b border-gray-800/60 hover:bg-white/[0.03] transition-colors duration-150 group">
              {/* Username with avatar */}
              <td className="px-5 py-3.5 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center text-white text-xs font-bold shadow-lg flex-shrink-0`}>
                    {avatarLetter}
                  </div>
                  <span className="font-semibold text-white text-sm">{displayName}</span>
                </div>
              </td>

              {/* Email */}
              <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-400">
                {displayEmail}
              </td>

              {/* Role */}
              <td className="px-5 py-3.5 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${
                  displayRole === "admin"
                    ? "bg-violet-500/10 text-violet-300 border-violet-500/30"
                    : "bg-gray-700/50 text-gray-300 border-gray-600/40"
                }`}>
                  {displayRole === "admin" ? "⚡ admin" : "👤 user"}
                </span>
              </td>

              {/* Created */}
              <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-500">
                {displayCreated}
              </td>

              {/* Status */}
              <td className="px-5 py-3.5 whitespace-nowrap">
                <div className="flex flex-col gap-1">
                  {user.isBanned ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/25" title={user.bannedReason}>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                      Banned
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Active
                    </span>
                  )}
                  {(user.contestBans?.filter(b => b.isActive).length || 0) > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/25">
                      ⚠ {user.contestBans!.filter(b => b.isActive).length} ban(s)
                    </span>
                  )}
                </div>
              </td>

              {/* Actions */}
              <td className="px-5 py-3.5 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { setViewUserModal({ open: true, user }); setActiveUserTab("info"); }}
                    className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-150"
                    title="View Details">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleEditUser(user)}
                    className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-400/40 transition-all duration-150"
                    title="Edit">
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  {user.isBanned ? (
                    <button onClick={() => handleUnblockUser(user._id)}
                      className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-400/40 transition-all duration-150"
                      title="Unblock">
                      <CheckCircle className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button onClick={() => setBlockModal({ open: true, userId: user._id })}
                      className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 border border-orange-500/20 hover:border-orange-400/40 transition-all duration-150"
                      title="Block">
                      <AlertCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={() => setContestBanModal({ open: true, userId: user._id, username: user.username || "User" })}
                    className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-150"
                    title="Contest Ban">
                    <Shield className="h-3.5 w-3.5" />
                  </button>
                  {(user.contestBans?.filter(b => b.isActive).length || 0) > 0 && (
                    <button onClick={() => { setViewUserModal({ open: true, user }); setActiveUserTab("contestBans"); }}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-400/40 transition-all duration-150 relative"
                      title="Contest Bans">
                      <Ban className="h-3.5 w-3.5" />
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                        {user.contestBans!.filter(b => b.isActive).length}
                      </span>
                    </button>
                  )}
                  <button onClick={() => handleDeleteUser(user._id)}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-400/40 transition-all duration-150"
                    title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          );
        });
        })()
      )}
    </tbody>
  </table>
</div>

{/* Pagination */}
{(() => {
  const filtered = users.filter(u => {
    const q = userSearchQuery.toLowerCase();
    return (
      (u.username || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });
  const totalPages = Math.ceil(filtered.length / USERS_PER_PAGE);
  if (totalPages <= 1) return null;
  const pages: (number | string)[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - userCurrentPage) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }
  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-xs text-gray-500">
        Showing{" "}
        <span className="text-gray-300 font-medium">
          {Math.min((userCurrentPage - 1) * USERS_PER_PAGE + 1, filtered.length)}–{Math.min(userCurrentPage * USERS_PER_PAGE, filtered.length)}
        </span>{" "}
        of <span className="text-gray-300 font-medium">{filtered.length}</span> users
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setUserCurrentPage(p => Math.max(1, p - 1))}
          disabled={userCurrentPage === 1}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          ← Prev
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="px-1.5 text-gray-600 text-xs select-none">…</span>
          ) : (
            <button
              key={p}
              onClick={() => setUserCurrentPage(p as number)}
              className={`w-8 h-8 rounded-lg text-xs font-medium border transition-all ${
                userCurrentPage === p
                  ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => setUserCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={userCurrentPage === totalPages}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Next →
        </button>
      </div>
    </div>
  );
})()}
                </div>
              )}

              {activeTab === "problems" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Manage Problems</h3>
                    <button
                      onClick={() => setShowCreateProblem(true)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Problem
                    </button>
                  </div>

                  {showCreateProblem && (
                    <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-[80vh] overflow-y-auto">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                          <Code className="mr-2 h-6 w-6 text-blue-600" />
                          Create New Problem
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowCreateProblem(false)}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <form
                        onSubmit={handleCreateProblem}
                        className="space-y-6"
                      >
                        {/* Basic Information */}
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
                          <h5 className="text-lg font-semibold mb-4 text-blue-600 dark:text-blue-400">
                            Basic Information
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Title *
                              </label>
                              <input
                                type="text"
                                required
                                value={newProblem.title}
                                onChange={(e) =>
                                  setNewProblem({
                                    ...newProblem,
                                    title: e.target.value,
                                  })
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                                placeholder="e.g., Two Sum"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Difficulty *
                              </label>
                              <select
                                value={newProblem.difficulty}
                                onChange={(e) =>
                                  setNewProblem({
                                    ...newProblem,
                                    difficulty: e.target.value,
                                  })
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                              >
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                              </select>
                            </div>
                          </div>

                          <div className="mt-4">
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                              Description *
                            </label>
                            <textarea
                              required
                              rows={6}
                              value={newProblem.description}
                              onChange={(e) =>
                                setNewProblem({
                                  ...newProblem,
                                  description: e.target.value,
                                })
                              }
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                              placeholder="Describe the problem in detail..."
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Tags (comma-separated)
                              </label>
                              <input
                                type="text"
                                value={newProblem.tags}
                                onChange={(e) =>
                                  setNewProblem({
                                    ...newProblem,
                                    tags: e.target.value,
                                  })
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                                placeholder="Array, Hash Table, Two Pointers"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Companies (comma-separated)
                              </label>
                              <input
                                type="text"
                                value={newProblem.companies}
                                onChange={(e) =>
                                  setNewProblem({
                                    ...newProblem,
                                    companies: e.target.value,
                                  })
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                                placeholder="Google, Microsoft, Amazon"
                              />
                            </div>
                          </div>

                          <div className="mt-4">
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                              Constraints *
                            </label>
                            <textarea
                              required
                              rows={3}
                              value={newProblem.constraints}
                              onChange={(e) =>
                                setNewProblem({
                                  ...newProblem,
                                  constraints: e.target.value,
                                })
                              }
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                              placeholder="1 <= n <= 10^4&#10;-10^9 <= nums[i] <= 10^9"
                            />
                          </div>
                        </div>

                        {/* Examples Section */}
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
                          <div className="flex justify-between items-center mb-4">
                            <h5 className="text-lg font-semibold text-green-600 dark:text-green-400 flex items-center">
                              <TestTube className="mr-2 h-5 w-5" />
                              Examples
                            </h5>
                            <button
                              type="button"
                              onClick={addExample}
                              className="flex items-center px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Example
                            </button>
                          </div>
                          {newProblem.examples.map((example, index) => (
                            <div
                              key={index}
                              className="mb-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                                  Example {index + 1}
                                </span>
                                {newProblem.examples.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeExample(index)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 gap-3">
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                                    Input:
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={example.input}
                                    onChange={(e) =>
                                      updateExample(
                                        index,
                                        "input",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                                    placeholder="nums = [2,7,11,15], target = 9"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                                    Output:
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={example.output}
                                    onChange={(e) =>
                                      updateExample(
                                        index,
                                        "output",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                                    placeholder="[0,1]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                                    Explanation:
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={example.explanation}
                                    onChange={(e) =>
                                      updateExample(
                                        index,
                                        "explanation",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Because nums[0] + nums[1] == 9, we return [0, 1]."
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Test Cases Section */}
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
                          <div className="flex justify-between items-center mb-4">
                            <h5 className="text-lg font-semibold text-purple-600 dark:text-purple-400 flex items-center">
                              <TestTube className="mr-2 h-5 w-5" />
                              Test Cases ({newProblem.testCases.length})
                            </h5>
                            <button
                              type="button"
                              onClick={addTestCase}
                              className="flex items-center px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-md transition-colors"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Test Case
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            {newProblem.testCases.map((testCase, index) => (
                              <div
                                key={index}
                                className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                                      Test Case {index + 1}
                                    </span>
                                    <label className="flex items-center text-sm">
                                      {testCase.isPublic ? (
                                        <Eye className="h-4 w-4 text-green-600 mr-1" />
                                      ) : (
                                        <EyeOff className="h-4 w-4 text-gray-400 mr-1" />
                                      )}
                                      <input
                                        type="checkbox"
                                        checked={testCase.isPublic}
                                        onChange={(e) =>
                                          updateTestCase(
                                            index,
                                            "isPublic",
                                            e.target.checked
                                          )
                                        }
                                        className="sr-only"
                                      />
                                      <span
                                        className={`cursor-pointer ${
                                          testCase.isPublic
                                            ? "text-green-600"
                                            : "text-gray-400"
                                        }`}
                                        onClick={() =>
                                          updateTestCase(
                                            index,
                                            "isPublic",
                                            !testCase.isPublic
                                          )
                                        }
                                      >
                                        {testCase.isPublic
                                          ? "Public"
                                          : "Hidden"}
                                      </span>
                                    </label>
                                  </div>
                                  {newProblem.testCases.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeTestCase(index)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                                      Input:
                                    </label>
                                    <textarea
                                      rows={3}
                                      value={testCase.input}
                                      onChange={(e) =>
                                        updateTestCase(
                                          index,
                                          "input",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                                      placeholder="2&#10;7 11 15&#10;9"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                                      Expected Output:
                                    </label>
                                    <textarea
                                      rows={3}
                                      value={testCase.output}
                                      onChange={(e) =>
                                        updateTestCase(
                                          index,
                                          "output",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                                      placeholder="0 1"
                                    />
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                                    Explanation (optional):
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={testCase.explanation || ""}
                                    onChange={(e) =>
                                      updateTestCase(
                                        index,
                                        "explanation",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Optional explanation for this test case..."
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Code Templates Section */}
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
                          <h5 className="text-lg font-semibold mb-4 text-indigo-600 dark:text-indigo-400 flex items-center">
                            <Code className="mr-2 h-5 w-5" />
                            Code Templates & Function Signatures
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {["python", "cpp", "java", "c", "javascript"].map(
                              (lang) => (
                                <div key={lang} className="space-y-3">
                                  <h6 className="font-medium text-sm text-gray-700 dark:text-gray-300 capitalize">
                                    {lang}
                                  </h6>
                                  <div>
                                    <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                                      Function Signature:
                                    </label>
                                    <textarea
                                      rows={2}
                                      value={
                                        newProblem.functionSignature[
                                          lang as keyof typeof newProblem.functionSignature
                                        ] || ""
                                      }
                                      onChange={(e) =>
                                        updateFunctionSignature(
                                          lang,
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                                      placeholder={`${lang} function signature...`}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                                      Code Template:
                                    </label>
                                    <textarea
                                      rows={4}
                                      value={
                                        newProblem.codeTemplates[
                                          lang as keyof typeof newProblem.codeTemplates
                                        ] || ""
                                      }
                                      onChange={(e) =>
                                        updateCodeTemplate(lang, e.target.value)
                                      }
                                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                                      placeholder={`${lang} starter code...`}
                                    />
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        {/* Settings & Limits */}
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
                          <h5 className="text-lg font-semibold mb-4 text-orange-600 dark:text-orange-400 flex items-center">
                            <Settings className="mr-2 h-5 w-5" />
                            Settings & Limits
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Time Limit (ms)
                              </label>
                              <input
                                type="number"
                                value={newProblem.timeLimit}
                                onChange={(e) =>
                                  setNewProblem({
                                    ...newProblem,
                                    timeLimit: parseInt(e.target.value) || 2000,
                                  })
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Memory Limit (MB)
                              </label>
                              <input
                                type="number"
                                value={newProblem.memoryLimit}
                                onChange={(e) =>
                                  setNewProblem({
                                    ...newProblem,
                                    memoryLimit:
                                      parseInt(e.target.value) || 256,
                                  })
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Visibility
                              </label>
                              <select
                                value={newProblem.visibility}
                                onChange={(e) =>
                                  setNewProblem({
                                    ...newProblem,
                                    visibility: e.target.value,
                                  })
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                              >
                                <option value="public">Public</option>
                                <option value="private">Private</option>
                                <option value="premium">Premium</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex items-center space-x-6 mt-4">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={newProblem.isPublished}
                                onChange={(e) =>
                                  setNewProblem({
                                    ...newProblem,
                                    isPublished: e.target.checked,
                                  })
                                }
                                className="mr-2 rounded"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Published
                              </span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={newProblem.isFeatured}
                                onChange={(e) =>
                                  setNewProblem({
                                    ...newProblem,
                                    isFeatured: e.target.checked,
                                  })
                                }
                                className="mr-2 rounded"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Featured
                              </span>
                            </label>
                          </div>
                        </div>

{/* Editorial Section */}
<div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
  <h5 className="text-lg font-semibold mb-4 text-teal-600 dark:text-teal-400">
    Editorial (Optional)
  </h5>
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
        Written Editorial
      </label>
      <textarea
        rows={4}
        value={newProblem.editorial.written}
        onChange={(e) =>
          setNewProblem({
            ...newProblem,
            editorial: {
              ...newProblem.editorial,
              written: e.target.value,
            },
          })
        }
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
        placeholder="Detailed solution explanation..."
      />
    </div>
    
    {/* Thumbnail URL Container - YouTube Style */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2">
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Video URL
        </label>
        <input
          type="url"
          value={newProblem.editorial.videoUrl}
          onChange={(e) =>
            setNewProblem({
              ...newProblem,
              editorial: {
                ...newProblem.editorial,
                videoUrl: e.target.value,
              },
            })
          }
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
          placeholder="https://youtube.com/watch?v=..."
        />
        <p className="text-xs text-gray-500 mt-1">
          YouTube, Vimeo, or any video hosting URL
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Thumbnail URL
        </label>
        <input
          type="url"
          value={newProblem.editorial.thumbnailUrl}
          onChange={(e) =>
            setNewProblem({
              ...newProblem,
              editorial: {
                ...newProblem.editorial,
                thumbnailUrl: e.target.value,
              },
            })
          }
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
          placeholder="https://img.youtube.com/vi/..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Optional: Custom thumbnail image
        </p>
      </div>
    </div>
    
    {/* Video Preview Section */}
    {newProblem.editorial.videoUrl && (
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
        <h6 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Video Preview
        </h6>
        <div className="flex items-center space-x-4">
          {/* Thumbnail Preview */}
          <div className="w-40 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden border">
            {newProblem.editorial.thumbnailUrl ? (
              <img
                src={newProblem.editorial.thumbnailUrl}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "https://via.placeholder.com/160x90?text=No+Thumbnail";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  No thumbnail
                </span>
              </div>
            )}
          </div>
          
          {/* Video Info */}
          <div className="flex-1">
            <div className="text-sm">
              <span className="font-medium">Video URL:</span>
              <a
                href={newProblem.editorial.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 ml-2 truncate block"
              >
                {newProblem.editorial.videoUrl}
              </a>
            </div>
            
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newProblem.editorial.duration}
                  onChange={(e) =>
                    setNewProblem({
                      ...newProblem,
                      editorial: {
                        ...newProblem.editorial,
                        duration: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="Duration in seconds"
                />
              </div>
              
              {/* Format Duration Display */}
              {newProblem.editorial.duration > 0 && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {Math.floor(newProblem.editorial.duration / 60)}:
                  {String(newProblem.editorial.duration % 60).padStart(2, '0')}
                </div>
              )}
            </div>
            
            {/* Thumbnail Actions */}
            <div className="flex space-x-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  // Auto-generate YouTube thumbnail URL
                  if (newProblem.editorial.videoUrl.includes('youtube.com') || 
                      newProblem.editorial.videoUrl.includes('youtu.be')) {
                    const videoId = newProblem.editorial.videoUrl.match(
                      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
                    );
                    if (videoId) {
                      setNewProblem({
                        ...newProblem,
                        editorial: {
                          ...newProblem.editorial,
                          thumbnailUrl: `https://img.youtube.com/vi/${videoId[1]}/hqdefault.jpg`,
                        },
                      });
                    }
                  }
                }}
                className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
              >
                Auto-generate YouTube thumbnail
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewProblem({
                    ...newProblem,
                    editorial: {
                      ...newProblem.editorial,
                      thumbnailUrl: '',
                    },
                  });
                }}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    
    {/* Thumbnail Preview Only Section */}
    {newProblem.editorial.thumbnailUrl && !newProblem.editorial.videoUrl && (
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
        <h6 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Thumbnail Preview
        </h6>
        <div className="flex items-center space-x-4">
          <div className="w-32 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden border">
            <img
              src={newProblem.editorial.thumbnailUrl}
              alt="Thumbnail"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/128x80?text=Invalid+URL";
              }}
            />
          </div>
          <div className="flex-1">
            <div className="text-sm">
              <span className="font-medium">Thumbnail URL:</span>
              <a
                href={newProblem.editorial.thumbnailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 ml-2 truncate block"
              >
                {newProblem.editorial.thumbnailUrl.length > 50
                  ? `${newProblem.editorial.thumbnailUrl.substring(0, 50)}...`
                  : newProblem.editorial.thumbnailUrl}
              </a>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewProblem({
                  ...newProblem,
                  editorial: {
                    ...newProblem.editorial,
                    thumbnailUrl: '',
                  },
                });
              }}
              className="mt-2 text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded"
            >
              Remove Thumbnail
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
</div>

                        {/* Reference Solutions */}
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
                          <h5 className="text-lg font-semibold mb-4 text-red-600 dark:text-red-400">
                            Reference Solutions
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {newProblem.referenceSolution.map(
                              (solution, index) => (
                                <div key={index} className="space-y-2">
                                  <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                      Language
                                    </label>
                                    <select
                                      value={solution.language}
                                      onChange={(e) =>
                                        updateReferenceSolution(
                                          index,
                                          "language",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                    >
                                      <option value="python">Python</option>
                                      <option value="cpp">C++</option>
                                      <option value="java">Java</option>
                                      <option value="c">C</option>
                                      <option value="javascript">
                                        JavaScript
                                      </option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                      Complete Solution Code
                                    </label>
                                    <textarea
                                      rows={8}
                                      value={solution.completeCode}
                                      onChange={(e) =>
                                        updateReferenceSolution(
                                          index,
                                          "completeCode",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                                      placeholder="Complete working solution..."
                                    />
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                          <button
                            type="submit"
                            className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                          >
                            <Save className="h-5 w-5 mr-2" />
                            Create Problem
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCreateProblem(false)}
                            className="flex items-center px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                          >
                            <X className="h-5 w-5 mr-2" />
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Edit Problem Modal */}
                  {editingProblemId && editProblemData && (
                    <div className="mb-6 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 max-h-[80vh] overflow-y-auto">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xl font-bold text-yellow-800 dark:text-yellow-200 flex items-center">
                          <Edit className="mr-2 h-6 w-6" />
                          Edit Problem: {editProblemData.title}
                        </h4>
                        <button
                          onClick={() => {
                            setEditingProblemId(null);
                            setEditProblemData(null);
                          }}
                          className="p-2 hover:bg-yellow-100 dark:hover:bg-yellow-800 rounded-full transition-colors"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <form
                        onSubmit={handleUpdateProblem}
                        className="space-y-6"
                      >
                        {/* Basic Information */}
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
                          <h5 className="text-lg font-semibold mb-4 text-yellow-600 dark:text-yellow-400">
                            Basic Information
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Title *
                              </label>
                              <input
                                type="text"
                                required
                                value={editProblemData.title || ""}
                                onChange={(e) =>
                                  setEditProblemData({
                                    ...editProblemData,
                                    title: e.target.value,
                                  })
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Difficulty *
                              </label>
                              <select
                                value={editProblemData.difficulty || "Easy"}
                                onChange={(e) =>
                                  setEditProblemData({
                                    ...editProblemData,
                                    difficulty: e.target.value,
                                  })
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                              >
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                              </select>
                            </div>
                          </div>

                          <div className="mt-4">
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                              Description *
                            </label>
                            <textarea
                              required
                              rows={4}
                              value={editProblemData.description || ""}
                              onChange={(e) =>
                                setEditProblemData({
                                  ...editProblemData,
                                  description: e.target.value,
                                })
                              }
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Tags (comma-separated)
                              </label>
                              <input
                                type="text"
                                value={
                                  Array.isArray(editProblemData.tags)
                                    ? editProblemData.tags.join(", ")
                                    : editProblemData.tags || ""
                                }
                                onChange={(e) =>
                                  setEditProblemData({
                                    ...editProblemData,
                                    tags: e.target.value,
                                  })
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Companies (comma-separated)
                              </label>
                              <input
                                type="text"
                                value={
                                  Array.isArray(editProblemData.companies)
                                    ? editProblemData.companies.join(", ")
                                    : editProblemData.companies || ""
                                }
                                onChange={(e) =>
                                  setEditProblemData({
                                    ...editProblemData,
                                    companies: e.target.value,
                                  })
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-4">
                          <button
                            type="submit"
                            className="flex items-center px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium"
                          >
                            <Save className="h-5 w-5 mr-2" />
                            Update Problem
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProblemId(null);
                              setEditProblemData(null);
                            }}
                            className="flex items-center px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                          >
                            <X className="h-5 w-5 mr-2" />
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Search Bar */}
                  <div className="relative mb-5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search by title, difficulty, or tag..."
                      value={problemSearchQuery}
                      onChange={(e) => { setProblemSearchQuery(e.target.value); setProblemCurrentPage(1); }}
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-800/60 border border-gray-700/60 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    />
                    {problemSearchQuery && (
                      <button
                        onClick={() => { setProblemSearchQuery(""); setProblemCurrentPage(1); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-700/50 shadow-xl">
                    <table className="w-full min-w-[700px] bg-gray-900/80 backdrop-blur-sm">
                      <thead>
                        <tr className="border-b border-gray-700/60">
                          <th className="px-5 py-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">#</th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Title</th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Difficulty</th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Acceptance</th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Submissions</th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const filtered = problems.filter(p => {
                            const q = problemSearchQuery.toLowerCase();
                            return (
                              p.title.toLowerCase().includes(q) ||
                              p.difficulty.toLowerCase().includes(q) ||
                              (p.tags || []).some(t => t.toLowerCase().includes(q))
                            );
                          });
                          const paginated = filtered.slice(
                            (problemCurrentPage - 1) * PROBLEMS_PER_PAGE,
                            problemCurrentPage * PROBLEMS_PER_PAGE
                          );

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="text-center py-16 text-gray-500">
                                  <Code className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                  <p className="text-sm">{problemSearchQuery ? `No results for "${problemSearchQuery}"` : "No problems found."}</p>
                                </td>
                              </tr>
                            );
                          }

                          return paginated.map((problem, idx) => {
                            const globalIdx = (problemCurrentPage - 1) * PROBLEMS_PER_PAGE + idx + 1;
                            return (
                              <tr key={problem._id} className="border-b border-gray-800/60 hover:bg-white/[0.03] transition-colors duration-150">
                                <td className="px-5 py-3.5 text-sm text-gray-500 font-mono">{globalIdx}</td>
                                <td className="px-5 py-3.5">
                                  <div>
                                    <p className="font-medium text-sm text-gray-100">{problem.title}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {(problem.tags || []).slice(0, 2).map((tag, i) => (
                                        <span key={i} className="px-1.5 py-0.5 bg-gray-700/60 text-gray-400 text-[10px] rounded border border-gray-600/40">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5">
                                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                                    problem.difficulty === "Easy"
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                      : problem.difficulty === "Medium"
                                      ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                                      : "bg-red-500/10 text-red-400 border-red-500/25"
                                  }`}>
                                    {problem.difficulty}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-sm text-gray-300 font-mono">
                                  {problem.acceptanceRate.toFixed(1)}%
                                </td>
                                <td className="px-5 py-3.5 text-sm text-gray-400">
                                  {problem.submissions.toLocaleString()}
                                </td>
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleEditProblem(problem)}
                                      className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-400/40 transition-all duration-150"
                                      title="Edit Problem"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteProblem(problem._id)}
                                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-400/40 transition-all duration-150"
                                      title="Delete Problem"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {(() => {
                    const filtered = problems.filter(p => {
                      const q = problemSearchQuery.toLowerCase();
                      return (
                        p.title.toLowerCase().includes(q) ||
                        p.difficulty.toLowerCase().includes(q) ||
                        (p.tags || []).some(t => t.toLowerCase().includes(q))
                      );
                    });
                    const totalPages = Math.ceil(filtered.length / PROBLEMS_PER_PAGE);
                    if (totalPages <= 1) return null;
                    const pages: (number | string)[] = [];
                    for (let i = 1; i <= totalPages; i++) {
                      if (i === 1 || i === totalPages || Math.abs(i - problemCurrentPage) <= 1) {
                        pages.push(i);
                      } else if (pages[pages.length - 1] !== "...") {
                        pages.push("...");
                      }
                    }
                    return (
                      <div className="flex items-center justify-between mt-4 px-1">
                        <p className="text-xs text-gray-500">
                          Showing{" "}
                          <span className="text-gray-300 font-medium">
                            {Math.min((problemCurrentPage - 1) * PROBLEMS_PER_PAGE + 1, filtered.length)}–{Math.min(problemCurrentPage * PROBLEMS_PER_PAGE, filtered.length)}
                          </span>{" "}
                          of <span className="text-gray-300 font-medium">{filtered.length}</span> problems
                        </p>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setProblemCurrentPage(p => Math.max(1, p - 1))}
                            disabled={problemCurrentPage === 1}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            ← Prev
                          </button>
                          {pages.map((p, i) =>
                            p === "..." ? (
                              <span key={`dots-${i}`} className="px-1.5 text-gray-600 text-xs select-none">…</span>
                            ) : (
                              <button
                                key={p}
                                onClick={() => setProblemCurrentPage(p as number)}
                                className={`w-8 h-8 rounded-lg text-xs font-medium border transition-all ${
                                  problemCurrentPage === p
                                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                                    : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"
                                }`}
                              >
                                {p}
                              </button>
                            )
                          )}
                          <button
                            onClick={() => setProblemCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={problemCurrentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeTab === "contests" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-400" />
                        Manage Contests
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">{contests.length} total contests</p>
                    </div>
                    <button
                      onClick={() => setShowCreateContest(true)}
                      className="flex items-center px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white rounded-lg shadow-lg shadow-yellow-500/20 transition-all text-sm font-medium"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Contest
                    </button>
                  </div>

                  {showCreateContest && (
                    <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="text-lg font-semibold mb-4">
                        Create New Contest
                      </h4>
                      <form
                        onSubmit={handleCreateContest}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Contest Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={newContest.name}
                              onChange={(e) =>
                                setNewContest({
                                  ...newContest,
                                  name: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Duration (minutes) *
                            </label>
                            <input
                              type="number"
                              required
                              value={newContest.duration}
                              onChange={(e) =>
                                setNewContest({
                                  ...newContest,
                                  duration: parseInt(e.target.value),
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Description *
                          </label>
                          <textarea
                            required
                            rows={3}
                            value={newContest.description}
                            onChange={(e) =>
                              setNewContest({
                                ...newContest,
                                description: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="Contest description..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Banner Image URL
                          </label>
                          <input
                            type="url"
                            value={newContest.bannerImage}
                            onChange={(e) =>
                              setNewContest({
                                ...newContest,
                                bannerImage: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="https://example.com/banner.jpg"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Contest Rules (Markdown)
                          </label>
                          <textarea
                            rows={4}
                            value={newContest.rules}
                            onChange={(e) =>
                              setNewContest({
                                ...newContest,
                                rules: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="Contest rules and guidelines..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Editorial Content (Markdown)
                          </label>
                          <textarea
                            rows={4}
                            value={newContest.editorial}
                            onChange={(e) =>
                              setNewContest({
                                ...newContest,
                                editorial: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="Contest editorial and explanations..."
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Start Time *
                            </label>
                            <input
                              type="datetime-local"
                              required
                              value={newContest.startTime}
                              onChange={(e) =>
                                setNewContest({
                                  ...newContest,
                                  startTime: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              End Time *
                            </label>
                            <input
                              type="datetime-local"
                              required
                              value={newContest.endTime}
                              onChange={(e) =>
                                setNewContest({
                                  ...newContest,
                                  endTime: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Freeze Time (minutes before end)
                            </label>
                            <input
                              type="number"
                              value={newContest.freezeTime}
                              onChange={(e) =>
                                setNewContest({
                                  ...newContest,
                                  freezeTime: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Password (for private contest)
                            </label>
                            <input
                              type="text"
                              value={newContest.password}
                              onChange={(e) =>
                                setNewContest({
                                  ...newContest,
                                  password: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                              placeholder="Leave empty for public contest"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Rules (Markdown supported)
                          </label>
                          <textarea
                            rows={3}
                            value={newContest.rules}
                            onChange={(e) =>
                              setNewContest({
                                ...newContest,
                                rules: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="Contest rules and guidelines..."
                          />
                        </div>

                        <div className="flex items-center space-x-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={newContest.isPublic}
                              onChange={(e) =>
                                setNewContest({
                                  ...newContest,
                                  isPublic: e.target.checked,
                                })
                              }
                              className="mr-2"
                            />
                            Public Contest
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={newContest.leaderboardVisible}
                              onChange={(e) =>
                                setNewContest({
                                  ...newContest,
                                  leaderboardVisible: e.target.checked,
                                })
                              }
                              className="mr-2"
                            />
                            Show Leaderboard
                          </label>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Allowed Languages
                          </label>
                          <div className="flex flex-wrap gap-3">
                            {["cpp", "java", "python", "c", "js"].map(
                              (lang) => (
                                <label key={lang} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={newContest.allowedLanguages.includes(
                                      lang
                                    )}
                                    onChange={(e) => {
                                      const languages = e.target.checked
                                        ? [...newContest.allowedLanguages, lang]
                                        : newContest.allowedLanguages.filter(
                                            (l) => l !== lang
                                          );
                                      setNewContest({
                                        ...newContest,
                                        allowedLanguages: languages,
                                      });
                                    }}
                                    className="mr-1"
                                  />
                                  {lang.toUpperCase()}
                                </label>
                              )
                            )}
                          </div>
                        </div>

                        {/* Problem Selection */}
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Contest Problems
                          </label>
                          <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                            <div className="text-sm text-gray-600 mb-3">
                              Select problems for this contest and set their
                              scores:
                            </div>
                            <div className="space-y-2">
                              {problems.map((problem, pIdx) => {
                                const isSelected = newContest.problems.some(
                                  (p) => p.problemId === problem._id
                                );
                                const selectedProblem =
                                  newContest.problems.find(
                                    (p) => p.problemId === problem._id
                                  );

                                return (
                                  <div
                                    key={`contest-problem-${problem._id}-${pIdx}`}
                                    className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50"
                                  >
                                    <div className="flex items-center flex-1">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setNewContest({
                                              ...newContest,
                                              problems: [
                                                ...newContest.problems,
                                                {
                                                  problemId: problem._id,
                                                  score: 100,
                                                },
                                              ],
                                            });
                                          } else {
                                            setNewContest({
                                              ...newContest,
                                              problems:
                                                newContest.problems.filter(
                                                  (p) =>
                                                    p.problemId !== problem._id
                                                ),
                                            });
                                          }
                                        }}
                                        className="mr-3"
                                      />
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">
                                          {problem.title}
                                        </div>
                                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                                          <span
                                            className={`px-2 py-0.5 rounded ${
                                              problem.difficulty === "Easy"
                                                ? "bg-green-100 text-green-700"
                                                : problem.difficulty ===
                                                  "Medium"
                                                ? "bg-yellow-100 text-yellow-700"
                                                : "bg-red-100 text-red-700"
                                            }`}
                                          >
                                            {problem.difficulty}
                                          </span>
                                          <span>
                                            {problem.tags
                                              .slice(0, 2)
                                              .join(", ")}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <div className="ml-4 flex items-center space-x-2">
                                        <label className="text-sm font-medium">
                                          Score:
                                        </label>
                                        <input
                                          type="number"
                                          min="1"
                                          max="1000"
                                          value={selectedProblem?.score || 100}
                                          onChange={(e) => {
                                            const score =
                                              parseInt(e.target.value) || 100;
                                            setNewContest({
                                              ...newContest,
                                              problems: newContest.problems.map(
                                                (p) =>
                                                  p.problemId === problem._id
                                                    ? { ...p, score }
                                                    : p
                                              ),
                                            });
                                          }}
                                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500"
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            {problems.length === 0 && (
                              <div className="text-center text-gray-500 py-4">
                                No problems available. Create some problems
                                first.
                              </div>
                            )}
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            Selected: {newContest.problems.length} problem(s)
                          </div>
                        </div>

                        <div className="flex space-x-4">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                          >
                            Create Contest
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCreateContest(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Edit Contest Modal */}
                  {editingContestId && editContestData && (
                    <div className="mb-6 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                          Edit Contest: {editContestData.name}
                        </h4>
                        <button
                          onClick={() => {
                            setEditingContestId(null);
                            setEditContestData(null);
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <form
                        onSubmit={handleUpdateContest}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Contest Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={editContestData.name || ""}
                              onChange={(e) =>
                                setEditContestData({
                                  ...editContestData,
                                  name: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-yellow-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Duration (minutes) *
                            </label>
                            <input
                              type="number"
                              required
                              value={editContestData.duration || ""}
                              onChange={(e) =>
                                setEditContestData({
                                  ...editContestData,
                                  duration: parseInt(e.target.value),
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-yellow-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Description
                          </label>
                          <textarea
                            rows={3}
                            value={editContestData.description || ""}
                            onChange={(e) =>
                              setEditContestData({
                                ...editContestData,
                                description: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Start Time *
                            </label>
                            <input
                              type="datetime-local"
                              required
                              value={
                                editContestData.startTime
                                  ? new Date(editContestData.startTime)
                                      .toISOString()
                                      .slice(0, 16)
                                  : ""
                              }
                              onChange={(e) =>
                                setEditContestData({
                                  ...editContestData,
                                  startTime: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-yellow-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              End Time *
                            </label>
                            <input
                              type="datetime-local"
                              required
                              value={
                                editContestData.endTime
                                  ? new Date(editContestData.endTime)
                                      .toISOString()
                                      .slice(0, 16)
                                  : ""
                              }
                              onChange={(e) =>
                                setEditContestData({
                                  ...editContestData,
                                  endTime: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-yellow-500"
                            />
                          </div>
                        </div>

                        <div className="flex space-x-4">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                          >
                            Update Contest
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingContestId(null);
                              setEditContestData(null);
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                {/* Search */}
                  <div className="relative mb-5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search by contest name..."
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-800/60 border border-gray-700/60 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30 transition-all"
                      onChange={(e) => {
                        const q = e.target.value.toLowerCase();
                        // inline filter via state not needed — filtering inline below
                        (e.target as any)._q = q;
                        e.target.closest('div')!.setAttribute('data-q', q);
                      }}
                      id="contestSearch"
                    />
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-700/50 shadow-xl">
                    <table className="w-full min-w-[750px] bg-gray-900/80 backdrop-blur-sm">
                      <thead>
                        <tr className="border-b border-gray-700/60">
                          <th className="px-5 py-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Contest</th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Start</th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">End</th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Participants</th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Status</th>
                          <th className="px-5 py-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contests.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-16 text-gray-500">
                              <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
                              <p className="text-sm">No contests found.</p>
                            </td>
                          </tr>
                        ) : (
                          contests.map((contest) => {
                            const now = new Date();
                            const start = new Date(contest.startTime);
                            const end = new Date(contest.endTime);
                            const isLive = now >= start && now <= end;
                            const isUpcoming = now < start;
                            return (
                              <tr key={contest._id} className="border-b border-gray-800/60 hover:bg-white/[0.03] transition-colors duration-150">
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${
                                      isLive ? 'bg-green-500/20' : isUpcoming ? 'bg-blue-500/20' : 'bg-gray-700/50'
                                    }`}>🏆</div>
                                    <div>
                                      <p className="font-semibold text-sm text-gray-100">{contest.name}</p>
                                      <p className="text-xs text-gray-500">{contest.participants.length} registered</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                                  {start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  <br /><span className="text-gray-600">{start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                </td>
                                <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                                  {end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  <br /><span className="text-gray-600">{end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                </td>
                                <td className="px-5 py-3.5">
                                  <span className="text-sm text-gray-300 font-mono">{contest.participants.length}</span>
                                </td>
                                <td className="px-5 py-3.5">
                                  {isLive ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Live
                                    </span>
                                  ) : isUpcoming ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/25">
                                      <Calendar className="h-3 w-3" />Upcoming
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gray-500/10 text-gray-500 border border-gray-500/25">
                                      Ended
                                    </span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleEditContest(contest)}
                                      className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-400/40 transition-all duration-150"
                                      title="Edit Contest"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteContest(contest._id)}
                                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-400/40 transition-all duration-150"
                                      title="Delete Contest"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "discussions" && (
                <div>
                  <h3 className="text-lg font-semibold mb-6">
                    Manage Discussions
                  </h3>
                  <div className="space-y-4">
                    {discussions.map((discussion) => (
                      <div
                        key={discussion._id}
                        className="p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">
                              {discussion.title}
                            </h4>
                            <p className="text-sm text-gray-600">
                              By {discussion.author.username}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(
                                discussion.createdAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {discussion.isPinned && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Pinned
                              </span>
                            )}
                            {discussion.isLocked && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                Locked
                              </span>
                            )}
                            {/* <button className="text-blue-600 hover:text-blue-900">
                              <Edit className="h-4 w-4" />
                            </button> */}
                            <button
                              onClick={() =>
                                handleDeleteDiscussion(discussion._id)
                              }
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "announcements" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">
                      Manage Announcements
                    </h3>
                    <button
                      onClick={() => setShowCreateAnnouncement(true)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Announcement
                    </button>
                  </div>

                  {showCreateAnnouncement && (
                    <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="text-lg font-semibold mb-4">
                        Create New Announcement
                      </h4>
                      <form
                        onSubmit={handleCreateAnnouncement}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Title *
                          </label>
                          <input
                            type="text"
                            required
                            value={newAnnouncement.title}
                            onChange={(e) =>
                              setNewAnnouncement({
                                ...newAnnouncement,
                                title: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Content *
                          </label>
                          <textarea
                            required
                            rows={4}
                            value={newAnnouncement.content}
                            onChange={(e) =>
                              setNewAnnouncement({
                                ...newAnnouncement,
                                content: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="Announcement content (supports Markdown)"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Type
                            </label>
                            <select
                              value={newAnnouncement.type}
                              onChange={(e) =>
                                setNewAnnouncement({
                                  ...newAnnouncement,
                                  type: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="general">General</option>
                              <option value="contest">Contest</option>
                              <option value="maintenance">Maintenance</option>
                              <option value="feature">Feature</option>
                              <option value="update">Update</option>
                              <option value="alert">Alert</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Priority
                            </label>
                            <select
                              value={newAnnouncement.priority}
                              onChange={(e) =>
                                setNewAnnouncement({
                                  ...newAnnouncement,
                                  priority: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="critical">Critical</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Tags (comma-separated)
                            </label>
                            <input
                              type="text"
                              value={newAnnouncement.tags}
                              onChange={(e) =>
                                setNewAnnouncement({
                                  ...newAnnouncement,
                                  tags: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                              placeholder="urgent, feature, contest"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Image URL
                            </label>
                            <input
                              type="url"
                              value={newAnnouncement.imageUrl}
                              onChange={(e) =>
                                setNewAnnouncement({
                                  ...newAnnouncement,
                                  imageUrl: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                              placeholder="https://example.com/image.jpg"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Link URL
                            </label>
                            <input
                              type="url"
                              value={newAnnouncement.link}
                              onChange={(e) =>
                                setNewAnnouncement({
                                  ...newAnnouncement,
                                  link: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                              placeholder="https://example.com/more-info"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Expires At
                            </label>
                            <input
                              type="datetime-local"
                              value={newAnnouncement.expiresAt}
                              onChange={(e) =>
                                setNewAnnouncement({
                                  ...newAnnouncement,
                                  expiresAt: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={newAnnouncement.pinned}
                              onChange={(e) =>
                                setNewAnnouncement({
                                  ...newAnnouncement,
                                  pinned: e.target.checked,
                                })
                              }
                              className="mr-2"
                            />
                            Pin to top
                          </label>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Visible to roles
                            </label>
                            <div className="flex space-x-4">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={newAnnouncement.visibleToRoles.includes(
                                    "user"
                                  )}
                                  onChange={(e) => {
                                    const roles = e.target.checked
                                      ? [
                                          ...newAnnouncement.visibleToRoles,
                                          "user",
                                        ].filter(
                                          (v, i, a) => a.indexOf(v) === i
                                        )
                                      : newAnnouncement.visibleToRoles.filter(
                                          (r) => r !== "user"
                                        );
                                    setNewAnnouncement({
                                      ...newAnnouncement,
                                      visibleToRoles: roles,
                                    });
                                  }}
                                  className="mr-1"
                                />
                                Users
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={newAnnouncement.visibleToRoles.includes(
                                    "admin"
                                  )}
                                  onChange={(e) => {
                                    const roles = e.target.checked
                                      ? [
                                          ...newAnnouncement.visibleToRoles,
                                          "admin",
                                        ].filter(
                                          (v, i, a) => a.indexOf(v) === i
                                        )
                                      : newAnnouncement.visibleToRoles.filter(
                                          (r) => r !== "admin"
                                        );
                                    setNewAnnouncement({
                                      ...newAnnouncement,
                                      visibleToRoles: roles,
                                    });
                                  }}
                                  className="mr-1"
                                />
                                Admins
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-4">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                          >
                            Create Announcement
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCreateAnnouncement(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Edit Announcement Form */}
                  {editingAnnouncementId && editAnnouncementData && (
                    <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="text-lg font-semibold mb-4">
                        Edit Announcement
                      </h4>
                      <form
                        onSubmit={handleUpdateAnnouncement}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Title *
                          </label>
                          <input
                            type="text"
                            required
                            value={editAnnouncementData.title}
                            onChange={(e) =>
                              setEditAnnouncementData({
                                ...editAnnouncementData,
                                title: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Content *
                          </label>
                          <textarea
                            required
                            rows={4}
                            value={editAnnouncementData.content}
                            onChange={(e) =>
                              setEditAnnouncementData({
                                ...editAnnouncementData,
                                content: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="Announcement content (supports Markdown)"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Type
                            </label>
                            <select
                              value={editAnnouncementData.type}
                              onChange={(e) =>
                                setEditAnnouncementData({
                                  ...editAnnouncementData,
                                  type: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="general">General</option>
                              <option value="contest">Contest</option>
                              <option value="maintenance">Maintenance</option>
                              <option value="feature">Feature</option>
                              <option value="update">Update</option>
                              <option value="alert">Alert</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Priority
                            </label>
                            <select
                              value={editAnnouncementData.priority}
                              onChange={(e) =>
                                setEditAnnouncementData({
                                  ...editAnnouncementData,
                                  priority: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="critical">Critical</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex space-x-4">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            Update Announcement
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAnnouncementId(null);
                              setEditAnnouncementData(null);
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {announcements.map((announcement) => (
                      <div
                        key={announcement._id}
                        className="group relative p-4 border border-gray-200 rounded-lg bg-white shadow-sm transition-all duration-200
                          hover:shadow-lg hover:scale-[1.03] hover:border-blue-400"
                        style={{
                          minHeight: 140,
                          maxHeight: 180,
                          overflow: "hidden",
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-base truncate">
                            {announcement.title}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              announcement.priority === "high"
                                ? "bg-red-100 text-red-800"
                                : announcement.priority === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {announcement.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-3">
                          {announcement.content.length > 120
                            ? `${announcement.content.substring(0, 120)}...`
                            : announcement.content}
                        </p>
                        <p className="text-xs text-gray-500 mb-2">
                          {new Date(
                            announcement.createdAt
                          ).toLocaleDateString()}
                        </p>
                        <div className="absolute top-2 right-2 flex space-x-2 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            className="text-blue-600 hover:text-blue-800 bg-white rounded-full p-1 shadow-sm border border-blue-100 hover:border-blue-400 transition-colors"
                            title="Edit"
                            onClick={() => handleEditAnnouncement(announcement)}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteAnnouncement(announcement._id)
                            }
                            className="text-red-600 hover:text-red-800 bg-white rounded-full p-1 shadow-sm border border-red-100 hover:border-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MCQ Questions Tab */}
              {activeTab === "mcq" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-blue-400" />
                        Manage MCQ Questions
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">{mcqQuestions.length} total questions</p>
                    </div>
                    <button
                      onClick={() => setShowCreateMCQ(true)}
                      className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg shadow-lg shadow-blue-500/20 transition-all text-sm font-medium"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create MCQ Question
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search by question, domain, difficulty or tag..."
                      value={mcqSearchQuery}
                      onChange={(e) => { setMcqSearchQuery(e.target.value); setMcqCurrentPage(1); }}
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-800/60 border border-gray-700/60 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    />
                    {mcqSearchQuery && (
                      <button
                        onClick={() => { setMcqSearchQuery(""); setMcqCurrentPage(1); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {showCreateMCQ && (
                    <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-semibold">
                          Create New MCQ Question
                        </h4>
                        <button
                          onClick={() => setShowCreateMCQ(false)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <form onSubmit={handleCreateMCQ} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Question *
                          </label>
                          <textarea
                            required
                            rows={3}
                            value={newMCQ.question}
                            onChange={(e) =>
                              setNewMCQ({ ...newMCQ, question: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your question..."
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          {newMCQ.options.map((option, index) => (
                            <div key={index}>
                              <label className="block text-sm font-medium mb-2">
                                Option {index + 1}{" "}
                                {option.isCorrect && (
                                  <span className="text-green-600">
                                    (Correct)
                                  </span>
                                )}
                              </label>
                              <div className="flex space-x-2">
                                <input
                                  type="text"
                                  value={option.text}
                                  onChange={(e) => {
                                    const newOptions = [...newMCQ.options];
                                    newOptions[index] = {
                                      ...newOptions[index],
                                      text: e.target.value,
                                    };
                                    setNewMCQ({
                                      ...newMCQ,
                                      options: newOptions,
                                    });
                                  }}
                                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                                  placeholder={`Option ${index + 1} text...`}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newOptions = newMCQ.options.map(
                                      (opt, i) => ({
                                        ...opt,
                                        isCorrect: i === index,
                                      })
                                    );
                                    setNewMCQ({
                                      ...newMCQ,
                                      options: newOptions,
                                    });
                                  }}
                                  className={`px-3 py-2 rounded-md ${
                                    option.isCorrect
                                      ? "bg-green-600 text-white"
                                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                  }`}
                                  title="Mark as correct answer"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Domain
                            </label>
                            <select
                              value={newMCQ.domain}
                              onChange={(e) =>
                                setNewMCQ({ ...newMCQ, domain: e.target.value })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="dsa">
                                Data Structures & Algorithms
                              </option>
                              <option value="system-design">
                                System Design
                              </option>
                              <option value="aiml">AI/ML</option>
                              <option value="aptitude">Aptitude</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Difficulty
                            </label>
                            <select
                              value={newMCQ.difficulty}
                              onChange={(e) =>
                                setNewMCQ({
                                  ...newMCQ,
                                  difficulty: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="Easy">Easy</option>
                              <option value="Medium">Medium</option>
                              <option value="Hard">Hard</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Tags (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={newMCQ.tags.join(", ")}
                            onChange={(e) =>
                              setNewMCQ({
                                ...newMCQ,
                                tags: e.target.value
                                  .split(",")
                                  .map((tag) => tag.trim())
                                  .filter((tag) => tag),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="arrays, sorting, recursion"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Explanation (optional)
                          </label>
                          <textarea
                            rows={2}
                            value={newMCQ.explanation}
                            onChange={(e) =>
                              setNewMCQ({
                                ...newMCQ,
                                explanation: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="Explain the correct answer..."
                          />
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newMCQ.isActive}
                            onChange={(e) =>
                              setNewMCQ({
                                ...newMCQ,
                                isActive: e.target.checked,
                              })
                            }
                            className="mr-2"
                          />
                          <label className="text-sm">Active</label>
                        </div>

                        <div className="flex space-x-4">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                          >
                            Create MCQ
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCreateMCQ(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Edit MCQ Form */}
                  {editingMCQId && editMCQData && (
                    <div className="mb-6 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 flex items-center">
                          <Edit className="mr-2 h-5 w-5" />
                          Edit MCQ Question
                        </h4>
                        <button
                          onClick={() => { setEditingMCQId(null); setEditMCQData(null); }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <form onSubmit={handleUpdateMCQ} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Question *</label>
                          <textarea
                            required
                            rows={3}
                            value={editMCQData.question}
                            onChange={(e) => setEditMCQData({ ...editMCQData, question: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-yellow-500 dark:bg-gray-800 dark:text-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {editMCQData.options.map((option: any, index: number) => (
                            <div key={index}>
                              <label className="block text-sm font-medium mb-1">
                                Option {index + 1}{" "}
                                {option.isCorrect && <span className="text-green-600">(Correct)</span>}
                              </label>
                              <div className="flex space-x-2">
                                <input
                                  type="text"
                                  value={option.text}
                                  onChange={(e) => {
                                    const opts = [...editMCQData.options];
                                    opts[index] = { ...opts[index], text: e.target.value };
                                    setEditMCQData({ ...editMCQData, options: opts });
                                  }}
                                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-yellow-500 dark:bg-gray-800 dark:text-white"
                                  placeholder={`Option ${index + 1}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const opts = editMCQData.options.map((o: any, i: number) => ({
                                      ...o,
                                      isCorrect: i === index,
                                    }));
                                    setEditMCQData({ ...editMCQData, options: opts });
                                  }}
                                  className={`px-3 py-2 rounded-md ${
                                    option.isCorrect
                                      ? "bg-green-600 text-white"
                                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                  }`}
                                  title="Mark as correct"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Domain</label>
                            <select
                              value={editMCQData.domain}
                              onChange={(e) => setEditMCQData({ ...editMCQData, domain: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-yellow-500 dark:bg-gray-800 dark:text-white"
                            >
                              <option value="dsa">Data Structures & Algorithms</option>
                              <option value="system-design">System Design</option>
                              <option value="aiml">AI/ML</option>
                              <option value="aptitude">Aptitude</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Difficulty</label>
                            <select
                              value={editMCQData.difficulty}
                              onChange={(e) => setEditMCQData({ ...editMCQData, difficulty: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-yellow-500 dark:bg-gray-800 dark:text-white"
                            >
                              <option value="Easy">Easy</option>
                              <option value="Medium">Medium</option>
                              <option value="Hard">Hard</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                          <input
                            type="text"
                            value={editMCQData.tags.join(", ")}
                            onChange={(e) =>
                              setEditMCQData({
                                ...editMCQData,
                                tags: e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-yellow-500 dark:bg-gray-800 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Explanation (optional)</label>
                          <textarea
                            rows={2}
                            value={editMCQData.explanation}
                            onChange={(e) => setEditMCQData({ ...editMCQData, explanation: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-yellow-500 dark:bg-gray-800 dark:text-white"
                          />
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editMCQData.isActive}
                            onChange={(e) => setEditMCQData({ ...editMCQData, isActive: e.target.checked })}
                            className="mr-2"
                          />
                          <label className="text-sm">Active</label>
                        </div>

                        <div className="flex space-x-4">
                          <button
                            type="submit"
                            className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Update MCQ
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingMCQId(null); setEditMCQData(null); }}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="space-y-3">
                    {(() => {
                      const filtered = mcqQuestions.filter(m => {
                        const q = mcqSearchQuery.toLowerCase();
                        return (
                          m.question.toLowerCase().includes(q) ||
                          m.domain.toLowerCase().includes(q) ||
                          m.difficulty.toLowerCase().includes(q) ||
                          (m.tags || []).some(t => t.toLowerCase().includes(q))
                        );
                      });
                      const totalMcqPages = Math.ceil(filtered.length / MCQ_PER_PAGE);
                      const paginated = filtered.slice(
                        (mcqCurrentPage - 1) * MCQ_PER_PAGE,
                        mcqCurrentPage * MCQ_PER_PAGE
                      );
                      if (filtered.length === 0) return (
                        <div className="text-center py-16 rounded-xl border border-gray-700/50 bg-gray-900/50">
                          <HelpCircle className="h-10 w-10 mx-auto mb-3 text-gray-600" />
                          <p className="text-sm text-gray-500">{mcqSearchQuery ? `No results for "${mcqSearchQuery}"` : "No MCQ questions found."}</p>
                        </div>
                      );
                      return (
                        <>
                          {paginated.map((mcq) => (
                        <div key={mcq._id} className="rounded-xl border border-gray-700/50 bg-gray-900/80 backdrop-blur-sm overflow-hidden hover:border-gray-600/60 transition-all duration-150">
                          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-800/60">
                            <p className="text-sm font-medium text-gray-100 leading-relaxed flex-1">{mcq.question}</p>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button onClick={() => handleEditMCQ(mcq)}
                                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-400/40 transition-all"
                                title="Edit">
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleDeleteMCQ(mcq._id)}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-400/40 transition-all"
                                title="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-800/60 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                              mcq.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                              : mcq.difficulty === "Medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                              : "bg-red-500/10 text-red-400 border-red-500/25"
                            }`}>{mcq.difficulty}</span>
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/25">{mcq.domain}</span>
                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium border ${
                              mcq.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" : "bg-gray-500/10 text-gray-400 border-gray-500/25"
                            }`}>{mcq.isActive ? "✓ Active" : "Inactive"}</span>
                            {(mcq.tags || []).map((tag, i) => (
                              <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-gray-700/60 text-gray-400 border border-gray-600/40">{tag}</span>
                            ))}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-5 py-3">
                            {mcq.options.map((option, index) => (
                              <div key={index} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                                option.isCorrect
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                  : "bg-gray-800/50 border-gray-700/40 text-gray-400"
                              }`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                  option.isCorrect ? "bg-emerald-500 text-white" : "bg-gray-700 text-gray-400"
                                }`}>{String.fromCharCode(65 + index)}</span>
                                <span className="flex-1">{option.text}</span>
                                {option.isCorrect && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                              </div>
                            ))}
                          </div>
                          {mcq.explanation && (
                            <div className="mx-5 mb-3 px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                              <p className="text-xs text-blue-300"><span className="font-semibold">Explanation: </span>{mcq.explanation}</p>
                            </div>
                          )}
                        </div>
                   ))}

                          {totalMcqPages > 1 && (
                            <div className="flex items-center justify-between mt-4 px-1">
                              <p className="text-xs text-gray-500">
                                Showing{" "}
                                <span className="text-gray-300 font-medium">
                                  {Math.min((mcqCurrentPage - 1) * MCQ_PER_PAGE + 1, filtered.length)}–{Math.min(mcqCurrentPage * MCQ_PER_PAGE, filtered.length)}
                                </span>{" "}
                                of <span className="text-gray-300 font-medium">{filtered.length}</span> questions
                              </p>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setMcqCurrentPage(p => Math.max(1, p - 1))}
                                  disabled={mcqCurrentPage === 1}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                  ← Prev
                                </button>
                                {(() => {
                                  const pages: (number | string)[] = [];
                                  for (let i = 1; i <= totalMcqPages; i++) {
                                    if (i === 1 || i === totalMcqPages || Math.abs(i - mcqCurrentPage) <= 1) pages.push(i);
                                    else if (pages[pages.length - 1] !== "...") pages.push("...");
                                  }
                                  return pages.map((p, i) =>
                                    p === "..." ? (
                                      <span key={`dots-${i}`} className="px-1.5 text-gray-600 text-xs select-none">…</span>
                                    ) : (
                                      <button
                                        key={p}
                                        onClick={() => setMcqCurrentPage(p as number)}
                                        className={`w-8 h-8 rounded-lg text-xs font-medium border transition-all ${
                                          mcqCurrentPage === p
                                            ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                                            : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"
                                        }`}
                                      >
                                        {p}
                                      </button>
                                    )
                                  );
                                })()}
                                <button
                                  onClick={() => setMcqCurrentPage(p => Math.min(totalMcqPages, p + 1))}
                                  disabled={mcqCurrentPage === totalMcqPages}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                  Next →
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Chat Rooms Tab */}
              {activeTab === "chats" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-indigo-400" />
                        Manage Chat Rooms
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">{chatRooms.length} total rooms</p>
                    </div>
                    <button
                      onClick={() => setShowCreateChatRoom(true)}
                      className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all text-sm font-medium"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Chat Room
                    </button>
                  </div>

                  {showCreateChatRoom && (
                    <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-semibold">
                          Create New Chat Room
                        </h4>
                        <button
                          onClick={() => setShowCreateChatRoom(false)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <form
                        onSubmit={handleCreateChatRoom}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Room Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={newChatRoom.name}
                              onChange={(e) =>
                                setNewChatRoom({
                                  ...newChatRoom,
                                  name: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., General Discussion"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Type
                            </label>
                            <select
                              value={newChatRoom.type}
                              onChange={(e) =>
                                setNewChatRoom({
                                  ...newChatRoom,
                                  type: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="general">General</option>
                              <option value="contest">Contest</option>
                              <option value="study">Study Group</option>
                              <option value="announcement">
                                Announcements
                              </option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Description
                          </label>
                          <textarea
                            rows={3}
                            value={newChatRoom.description}
                            onChange={(e) =>
                              setNewChatRoom({
                                ...newChatRoom,
                                description: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="Room description..."
                          />
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newChatRoom.isActive}
                            onChange={(e) =>
                              setNewChatRoom({
                                ...newChatRoom,
                                isActive: e.target.checked,
                              })
                            }
                            className="mr-2"
                          />
                          <label className="text-sm">Active</label>
                        </div>

                        <div className="flex space-x-4">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                          >
                            Create Room
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCreateChatRoom(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {chatRooms.length === 0 ? (
                      <div className="col-span-full text-center py-8 text-gray-500">
                        No chat rooms found. Create your first room!
                      </div>
                    ) : (
                      chatRooms.map((room) => (
                        <div
                          key={room._id}
                          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-semibold text-lg">
                              {room.name}
                            </h4>
                            <div className="flex space-x-1">
                              <button className="text-blue-600 hover:text-blue-800 p-1">
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteChatRoom(room._id)}
                                className="text-red-600 hover:text-red-800 p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          {room.description && (
                            <p className="text-gray-600 text-sm mb-3">
                              {room.description}
                            </p>
                          )}
                          <div className="flex justify-between items-center text-sm">
                            <div className="flex space-x-2">
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                {room.type}
                              </span>
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  room.isActive
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {room.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <span className="text-gray-500">
                              {room.participants.length} members
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}


            {activeTab === "help" && <HelpManagement showNotification={showNotification} />}
              {/* Notifications Tab */}
              {activeTab === "notifications" && <NotificationsAdminTab />}
              {/* View Documents Tab */}
              {activeTab === "documents" && <ViewDocumentsTab showNotification={showNotification} />}

              {/* Add Documents Tab */}
              {activeTab === "add-document" && <AddDocumentTab showNotification={showNotification} />}

              {/* Redeem Orders Tab */}
{activeTab === "redeem-orders" && (
  <div>
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-semibold flex items-center">
        <ShoppingCart className="mr-2 h-6 w-6 text-orange-600" />
        Redeem Orders ({redeemOrders.length})
      </h3>
      <div className="flex gap-2 text-xs">
        {(['pending','processing','shipped','delivered','cancelled'] as const).map(s => {
          const count = redeemOrders.filter(o => o.status === s).length;
          if (!count) return null;
          return (
            <span key={s} className={`px-2 py-1 rounded-full font-medium ${
              s === 'delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
              s === 'shipped' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
              s === 'processing'? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
              s === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}>{s}: {count}</span>
          );
        })}
      </div>
    </div>
    {redeemOrders.length === 0 ? (
      <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
        <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium text-gray-500">No redeem orders found.</p>
      </div>
    ) : (
      <div className="space-y-4">
        {redeemOrders.map(order => {
          const steps = [
            { key: 'pending', label: 'Order Placed', icon: '📦', desc: 'Order received' },
            { key: 'processing', label: 'Processing', icon: '⚙️', desc: 'Preparing order' },
            { key: 'shipped', label: 'Shipped', icon: '🚚', desc: 'On the way' },
            { key: 'delivered', label: 'Delivered', icon: '✅', desc: 'Delivered!' },
          ];
          const statusOrder = ['pending','processing','shipped','delivered'];
          const currentIdx = order.status === 'cancelled' ? -1 : statusOrder.indexOf(order.status);
          const isExpanded = editingOrderId === order._id;
          return (
            <div key={order._id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              {/* Card Header */}
              <div
                className="flex items-center p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => {
                  if (isExpanded) {
                    setEditingOrderId(null); setEditOrderStatus(''); setEditTrackingNumber(''); setEditDeliveredAt('');
                  } else {
                    setEditingOrderId(order._id); setEditOrderStatus(order.status);
                    setEditTrackingNumber(order.trackingNumber || '');
                    setEditDeliveredAt(order.deliveredAt ? new Date(order.deliveredAt).toISOString().slice(0,16) : new Date().toISOString().slice(0,16));
                  }
                }}
              >
                <div className="flex items-center space-x-4 flex-1">
                  {order.itemId?.imageUrl && (
                    <img src={order.itemId.imageUrl} alt={order.itemId?.name} className="w-14 h-14 object-cover rounded-lg border flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{order.itemId?.name || 'Item'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">👤 {order.userId?.username} • {order.userId?.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Qty: {order.quantity} • 🪙 {order.totalCost} coins • {new Date(order.orderDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 flex-shrink-0">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    order.status==='delivered'?'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300':
                    order.status==='shipped'?'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300':
                    order.status==='processing'?'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300':
                    order.status==='cancelled'?'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300':
                    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    {order.status==='pending'&&'🕐 '}{order.status==='processing'&&'⚙️ '}{order.status==='shipped'&&'🚚 '}{order.status==='delivered'&&'✅ '}{order.status==='cancelled'&&'❌ '}
                    {order.status.charAt(0).toUpperCase()+order.status.slice(1)}
                  </span>
                  {isExpanded?<ChevronUp className="h-4 w-4 text-gray-400"/>:<ChevronDown className="h-4 w-4 text-gray-400"/>}
                </div>
              </div>

              {/* Expanded Section */}
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-700 p-5 space-y-5">
                  {order.status==='cancelled' && order.cancelReason && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5"/>
                        <div>
                          <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">Cancellation Reason ({order.cancelledBy==="admin"?"Admin":"User"})</p>
                          <p className="text-sm text-red-600 dark:text-red-400 bg-white/50 dark:bg-gray-800/50 p-3 rounded border border-red-200 dark:border-red-700">"{order.cancelReason}"</p>
                          {order.cancelledAt && <p className="text-xs text-red-500 mt-2">Cancelled on: {new Date(order.cancelledAt).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {order.status!=='cancelled' && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Order Progress</p>
                      <div className="relative">
                        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 dark:bg-gray-700 z-0">
                          <div className="h-full bg-blue-500 transition-all duration-500" style={{width:`${currentIdx<=0?0:currentIdx>=3?100:(currentIdx/3)*100}%`}}/>
                        </div>
                        <div className="relative z-10 flex justify-between">
                          {steps.map((step,idx)=>{
                            const isDone=idx<=currentIdx; const isActive=idx===currentIdx;
                            return (
                              <div key={step.key} className="flex flex-col items-center w-1/4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all duration-300 ${isDone?'bg-blue-600 border-blue-600 shadow-md':'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'} ${isActive?'ring-4 ring-blue-200 dark:ring-blue-900':''}`}>
                                  <span className={isDone?'':'grayscale opacity-40'}>{step.icon}</span>
                                </div>
                                <p className={`mt-2 text-xs font-medium text-center ${isDone?'text-blue-600 dark:text-blue-400':'text-gray-400 dark:text-gray-600'}`}>{step.label}</p>
                                {isActive && <p className="text-xs text-gray-500 text-center mt-0.5 max-w-[80px]">{step.desc}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {order.status!=='cancelled' && (
                    <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                      <p className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-3 flex items-center"><Edit className="h-4 w-4 mr-1.5"/>Admin — Update Order</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">Order Status</label>
                          <select value={editOrderStatus} onChange={(e)=>{setEditOrderStatus(e.target.value);if(e.target.value==='delivered'&&!editDeliveredAt)setEditDeliveredAt(new Date().toISOString().slice(0,16));}}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-400 dark:bg-gray-700 dark:text-white text-sm">
                            <option value="pending">🕐 Pending</option>
                            <option value="processing">⚙️ Processing</option>
                            <option value="shipped">🚚 Shipped</option>
                            <option value="delivered">✅ Delivered</option>
                            <option value="cancelled">❌ Cancelled</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">Tracking Number (optional)</label>
                          <input type="text" value={editTrackingNumber} onChange={(e)=>setEditTrackingNumber(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-400 dark:bg-gray-700 dark:text-white text-sm" placeholder="e.g., IND123456789IN"/>
                        </div>
                        {(editOrderStatus==='processing'||editOrderStatus==='shipped') && (
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">📅 Predicted Delivery Date</label>
                            <input type="datetime-local" value={editPredictedDeliveryDate} onChange={(e)=>setEditPredictedDeliveryDate(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-400 dark:bg-gray-700 dark:text-white text-sm"/>
                            <p className="text-xs text-gray-400 mt-1">Auto-set to 7 days if empty for shipped orders</p>
                          </div>
                        )}
                        {editOrderStatus==='delivered' && (
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">Delivered Date & Time</label>
                            <input type="datetime-local" value={editDeliveredAt} onChange={(e)=>setEditDeliveredAt(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-400 dark:bg-gray-700 dark:text-white text-sm"/>
                          </div>
                        )}
                        {editOrderStatus==='cancelled' && (
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium mb-1.5 text-red-600 dark:text-red-400">Cancellation Reason <span className="text-red-500">*</span></label>
                            <textarea value={editCancelReason} onChange={(e)=>setEditCancelReason(e.target.value)} rows={3}
                              className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-lg focus:ring-2 focus:ring-red-400 dark:bg-gray-700 dark:text-white text-sm" placeholder="Reason for cancelling..."/>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2 mt-3">
                        <button onClick={()=>{if(editOrderStatus==='cancelled'&&!editCancelReason.trim()){showNotification('error','Cancellation reason is required');return;}handleUpdateOrderStatus(order._id);}}
                          className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                          <Save className="h-3.5 w-3.5 mr-1.5"/>Save Changes
                        </button>
                        <button onClick={()=>{setEditingOrderId(null);setEditOrderStatus('');setEditTrackingNumber('');setEditCancelReason('');setEditDeliveredAt('');setEditPredictedDeliveryDate('');}}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {order.status==='cancelled' && (
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-700 dark:text-red-300 flex items-center">
                        <XCircle className="h-4 w-4 mr-2"/>This order was cancelled by {order.cancelledBy==="admin"?"Admin":"User"}.{order.cancelledBy==="admin"&&" Coins have been refunded."}
                      </p>
                    </div>
                  )}

                  {order.trackingNumber && (
                    <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <Truck className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0"/>
                      <div>
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Current Tracking Number</p>
                        <p className="text-sm font-bold text-blue-900 dark:text-blue-100">{order.trackingNumber}</p>
                      </div>
                    </div>
                  )}

                  {order.status==='delivered' && (
                    <div className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"/>
                      <div>
                        <p className="text-xs font-medium text-green-700 dark:text-green-300">Delivered On</p>
                        <p className="text-sm font-bold text-green-900 dark:text-green-100">
                          {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Not recorded'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 flex items-center"><MapPin className="h-3.5 w-3.5 mr-1"/>Delivery Address</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{order.deliveryAddress?.fullName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{order.deliveryAddress?.phone}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{order.deliveryAddress?.address}, {order.deliveryAddress?.city}, {order.deliveryAddress?.state} - {order.deliveryAddress?.pincode}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
)}
              {activeTab === "plagiarism" && (
                <PlagiarismAdminPanel
                  contests={contests}
                  showNotification={showNotification}
                  onOpenContestBan={(userId, username) =>
                    setContestBanModal({ open: true, userId, username })
                  }
                />
              )}
              
              {activeTab === "reports" && <ReportsAdminTab />}

              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
