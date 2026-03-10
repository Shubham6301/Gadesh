// frontend/src/components/Admin/PlagiarismAdminPanel.tsx

import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../../config/api";
import {
  AlertTriangle, Search, Shield, Ban, CheckCircle,
  RefreshCw, ChevronDown, ChevronUp, Loader,
  Trophy, AlertCircle, UserCheck, Globe, Copy,
} from "lucide-react";

interface PlagiarismCase {
  _id?: string;
  user1: { _id: string; username: string; email: string } | string;
  user2: { _id: string; username: string; email: string } | string;
  problemId?: { _id: string; title: string } | string;
  similarity: number;
  detectedAt: string;
  actionTaken: string;
  reviewedBy?: { username: string } | null;
  isCrossLanguage?: boolean;
  isSuspicious?: boolean;
  timeDiffSeconds?: number | null;
  language?: string;
}

interface Contest {
  _id: string;
  name: string;
  status: string;
}

interface Props {
  contests: Contest[];
  showNotification: (type: "success" | "error" | "info", message: string) => void;
  onOpenContestBan?: (userId: string, username: string) => void;
}

const ACTION_CONFIG: Record<string, { label: string; color: string }> = {
  pending:               { label: "⏳ Pending Review",  color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/25" },
  warned:                { label: "⚠️ Warned",          color: "bg-orange-500/10 text-orange-400 border-orange-500/25" },
  contest_ban:           { label: "🚫 Contest Banned",  color: "bg-red-500/10 text-red-400 border-red-500/25" },
  contest_banned:        { label: "🚫 Contest Banned",  color: "bg-red-500/10 text-red-400 border-red-500/25" },
  permanent_contest_ban: { label: "🔴 Permanent Ban",   color: "bg-red-700/20 text-red-300 border-red-600/40" },
  site_banned:           { label: "💀 Site Banned",     color: "bg-gray-700/50 text-gray-300 border-gray-600/40" },
  ignored:               { label: "✅ False Positive",  color: "bg-green-500/10 text-green-400 border-green-500/25" },
  false_positive:        { label: "✅ False Positive",  color: "bg-green-500/10 text-green-400 border-green-500/25" },
};

const getUsername = (user: any): string =>
  typeof user === "object" && user?.username ? user.username : "Unknown";
const getUserId = (user: any): string =>
  typeof user === "object" && user?._id ? user._id : String(user);
const getProblemTitle = (p: any): string =>
  typeof p === "object" && p?.title ? p.title : "Unknown Problem";

const formatTimeDiff = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined) return "Unknown";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
};

const PlagiarismAdminPanel: React.FC<Props> = ({ contests, showNotification, onOpenContestBan }) => {
  const [selectedContest, setSelectedContest] = useState<string>("");
  const [cases, setCases] = useState<PlagiarismCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [threshold, setThreshold] = useState(70);
  const [expandedCase, setExpandedCase] = useState<number | null>(null);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterType, setFilterType] = useState<"all" | "same_lang" | "cross_lang">("all");
  const [checkResult, setCheckResult] = useState<{ totalMatches: number; contestName: string } | null>(null);
  const [updatingCase, setUpdatingCase] = useState<number | null>(null);

  const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };

  const loadCases = async (contestId: string) => {
    if (!contestId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/contests/${contestId}/plagiarism-cases`, { headers });
      setCases(res.data.cases || []);
    } catch {
      showNotification("error", "Failed to load plagiarism cases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedContest) {
      loadCases(selectedContest);
      setCheckResult(null);
      setExpandedCase(null);
      setFilterAction("all");
      setFilterType("all");
    }
  }, [selectedContest]);

  const handleManualCheck = async () => {
    if (!selectedContest) { showNotification("error", "Pehle contest select karo"); return; }
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await axios.get(
        `${API_URL}/contests/${selectedContest}/check-plagiarism?threshold=${threshold}`,
        { headers }
      );
      setCheckResult({ totalMatches: res.data.totalMatches, contestName: res.data.contestName });
      showNotification(
        res.data.totalMatches > 0 ? "error" : "success",
        res.data.totalMatches > 0
          ? `🚨 ${res.data.totalMatches} plagiarism case(s) detected!`
          : `✅ No plagiarism above ${threshold}% threshold`
      );
      await loadCases(selectedContest);
    } catch (err: any) {
      showNotification("error", err.response?.data?.message || "Check failed");
    } finally {
      setChecking(false);
    }
  };

  // ✅ FIX: realIdx directly use karo — caseId nahi
  const handleUpdateAction = async (realIdx: number, actionTaken: string) => {
    setUpdatingCase(realIdx);
    try {
      await axios.patch(
        `${API_URL}/contests/${selectedContest}/plagiarism-cases/${realIdx}`,
        { actionTaken },
        { headers }
      );
      await loadCases(selectedContest); // fresh data reload
      showNotification("success", `✅ Case updated: ${ACTION_CONFIG[actionTaken]?.label || actionTaken}`);
      // Expanded state maintain karo
    } catch (err: any) {
      showNotification("error", err?.response?.data?.message || "Failed to update case");
    } finally {
      setUpdatingCase(null);
    }
  };

  // Filter logic: action + type dono
  const filteredCases = cases.filter(c => {
    const actionMatch = filterAction === "all" || c.actionTaken === filterAction;
    const typeMatch =
      filterType === "all" ||
      (filterType === "cross_lang" && c.isCrossLanguage) ||
      (filterType === "same_lang" && !c.isCrossLanguage);
    return actionMatch && typeMatch;
  });

  const pendingCount = cases.filter(c => c.actionTaken === "pending").length;
  const crossLangCount = cases.filter(c => c.isCrossLanguage).length;
  const sameLangCount = cases.filter(c => !c.isCrossLanguage).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            Plagiarism Detection
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                {pendingCount} pending
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
          Auto-detect upon submission + manual check also possible          </p>
        </div>
        {selectedContest && (
          <button
            onClick={() => loadCases(selectedContest)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-400 hover:text-white hover:border-gray-500 transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 rounded-xl border border-gray-700/50 bg-gray-900/60 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Contest Select Karo</label>
            <select
              value={selectedContest}
              onChange={e => setSelectedContest(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-red-500/60 transition-all"
            >
              <option value="">-- Contest Select Karo --</option>
              {contests.map(c => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.status === "ongoing" ? "🟢 Live" : c.status === "upcoming" ? "🔵 Upcoming" : "⚫ Ended"})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Threshold: <span className="text-red-400 font-bold">{threshold}%</span>
            </label>
            <input type="range" min={50} max={100} value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              className="w-full accent-red-500 mt-2" />
            <div className="flex justify-between text-xs text-gray-600 mt-0.5">
              <span>50%</span><span>100%</span>
            </div>
          </div>
        </div>

        <button onClick={handleManualCheck} disabled={checking || !selectedContest}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-all">
          {checking ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {checking ? "Checking..." : "Run Plagiarism Check"}
        </button>

        {checkResult && (
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${
            checkResult.totalMatches > 0
              ? "bg-red-500/10 border-red-500/30 text-red-300"
              : "bg-green-500/10 border-green-500/30 text-green-300"
          }`}>
            {checkResult.totalMatches > 0
              ? <AlertCircle className="h-5 w-5 flex-shrink-0" />
              : <CheckCircle className="h-5 w-5 flex-shrink-0" />}
            <p className="text-sm font-medium">
              {checkResult.totalMatches > 0
                ? `🚨 ${checkResult.totalMatches} case(s) found in "${checkResult.contestName}"!`
                : `✅ "${checkResult.contestName}" mein ${threshold}%+ similarity nahi mili.`}
            </p>
          </div>
        )}
      </div>

      {/* Stats bar */}
      {cases.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-gray-700/50 bg-gray-900/60 text-center">
            <p className="text-2xl font-black text-white">{cases.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Cases</p>
          </div>
          <div
            onClick={() => setFilterType(filterType === "same_lang" ? "all" : "same_lang")}
            className={`p-3 rounded-xl border cursor-pointer transition-all text-center ${
              filterType === "same_lang"
                ? "border-orange-500/50 bg-orange-500/10"
                : "border-gray-700/50 bg-gray-900/60 hover:border-orange-500/30"
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <Copy className="h-3.5 w-3.5 text-orange-400" />
              <p className="text-2xl font-black text-orange-400">{sameLangCount}</p>
            </div>
            <p className="text-xs text-gray-500">Same Language</p>
          </div>
          <div
            onClick={() => setFilterType(filterType === "cross_lang" ? "all" : "cross_lang")}
            className={`p-3 rounded-xl border cursor-pointer transition-all text-center ${
              filterType === "cross_lang"
                ? "border-purple-500/50 bg-purple-500/10"
                : "border-gray-700/50 bg-gray-900/60 hover:border-purple-500/30"
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <Globe className="h-3.5 w-3.5 text-purple-400" />
              <p className="text-2xl font-black text-purple-400">{crossLangCount}</p>
            </div>
            <p className="text-xs text-gray-500">Cross Language</p>
          </div>
        </div>
      )}

      {/* Filter bar */}
      {cases.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 mr-1">Filter:</span>
          {(["all", "pending", "warned", "contest_ban", "permanent_contest_ban", "ignored"] as const).map(f => {
            const count = f === "all" ? cases.length : cases.filter(c => c.actionTaken === f || (f === "contest_ban" && c.actionTaken === "contest_banned")).length;
            return (
              <button key={f} onClick={() => setFilterAction(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  filterAction === f
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
                }`}>
                {f === "all" ? "All" : ACTION_CONFIG[f]?.label || f} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Cases list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : !selectedContest ? (
        <div className="text-center py-16 rounded-xl border border-gray-700/50 bg-gray-900/40">
          <Trophy className="h-12 w-12 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-500 text-sm">Upar se contest select karo</p>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-gray-700/50 bg-gray-900/40">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-600/40" />
          <p className="text-gray-500 text-sm">
            {cases.length === 0 ? "Koi case nahi mila. Check run karo." : "Is filter mein koi cases nahi."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCases.map((c, idx) => {
            // ✅ IMPORTANT: realIdx = original cases array mein position
            const realIdx = cases.indexOf(c);
            const isExpanded = expandedCase === realIdx;
            const actionConfig = ACTION_CONFIG[c.actionTaken] || ACTION_CONFIG.pending;
            const similarityColor =
              c.similarity >= 90 ? "text-red-400" :
              c.similarity >= 80 ? "text-orange-400" :
              c.similarity >= 70 ? "text-yellow-400" : "text-gray-400";

            return (
              <div key={`plagiarism-case-${realIdx}-${c.detectedAt}-${idx}`} className={`rounded-xl border overflow-hidden transition-all ${
                c.actionTaken === "pending"
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-gray-700/50 bg-gray-900/60"
              }`}>
                {/* Header row */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpandedCase(isExpanded ? null : realIdx)}
                >
                  {/* Similarity % */}
                  <div className={`text-2xl font-black ${similarityColor} w-14 text-center flex-shrink-0`}>
                    {c.similarity}%
                  </div>

                  {/* Users + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-100">{getUsername(c.user1)}</span>
                      <span className="text-gray-600 text-xs">vs</span>
                      <span className="font-semibold text-sm text-gray-100">{getUsername(c.user2)}</span>

                      {c.isCrossLanguage ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                          <Globe className="h-2.5 w-2.5" /> Cross-Lang
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                          <Copy className="h-2.5 w-2.5" /> Same-Lang
                        </span>
                      )}

                      {c.isSuspicious && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                          ⚡ Suspicious
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <p className="text-xs text-gray-500">
                        Problem: {getProblemTitle(c.problemId)}
                      </p>
                      {c.language && (
                        <span className="text-xs text-gray-600 font-mono">
                          [{c.language}]
                        </span>
                      )}
                      {c.timeDiffSeconds !== null && c.timeDiffSeconds !== undefined && (
                        <span className={`text-xs font-medium ${
                          c.timeDiffSeconds < 3600 ? "text-red-400" : "text-gray-500"
                        }`}>
                          ⏱ {formatTimeDiff(c.timeDiffSeconds)} apart
                        </span>
                      )}
                      <span className="text-xs text-gray-600">
                        {new Date(c.detectedAt).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${actionConfig.color}`}>
                    {actionConfig.label}
                  </span>
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />}
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-gray-800/60 p-4 space-y-4">

                    {c.isCrossLanguage && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/25">
                        <Globe className="h-4 w-4 text-purple-400 flex-shrink-0" />
                        <p className="text-xs text-purple-300">
                          <span className="font-semibold">Cross-Language Plagiarism:</span> Dono users ne alag languages mein same logic submit kiya —{" "}
                          <span className="font-mono font-bold">{c.language}</span>
                        </p>
                      </div>
                    )}

                    {c.isSuspicious && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/25">
                        <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                        <p className="text-xs text-red-300">
                          <span className="font-semibold">Suspicious:</span> Both submissions{" "}
                          <span className="font-bold">{formatTimeDiff(c.timeDiffSeconds)}</span> Came inside there is more chance of copy-paste.
                        </p>
                      </div>
                    )}

                    {/* User cards */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "👑 Original (Before)", user: c.user1 },
                        { label: "🚨 Copier (Later)", user: c.user2 || { username: "Unknown / Not Recorded", _id: null } },
                      ].map(({ label, user }) => (
                        <div key={label} className="p-3 bg-gray-800/60 rounded-lg border border-gray-700/40">
                          <p className="text-xs text-gray-500 mb-1">{label}</p>
                          <p className="font-semibold text-sm text-gray-100">{getUsername(user)}</p>
                          {typeof user === "object" && (user as any)?.email && (
                            <p className="text-xs text-gray-500">{(user as any).email}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* ✅ FIXED Action buttons — realIdx directly pass ho raha hai */}
                    <div>
                      <p className="text-xs font-semibold text-gray-400 mb-2">Action Lo:</p>
                      <div className="flex flex-wrap gap-2">
                        {([
                          { action: "ignored",               label: "✅ False Positive", cls: "bg-green-600 hover:bg-green-500" },
                          { action: "warned",                label: "⚠️ Warn Diya",     cls: "bg-yellow-600 hover:bg-yellow-500" },
                          { action: "contest_ban",           label: "🚫 Contest Ban",    cls: "bg-orange-600 hover:bg-orange-500" },
                          { action: "permanent_contest_ban", label: "🔴 Permanent Ban",  cls: "bg-red-700 hover:bg-red-600" },
                        ] as const).map(({ action, label, cls }) => (
                          <button key={action}
                            onClick={() => handleUpdateAction(realIdx, action)}
                            disabled={
                              (c.actionTaken === action || c.actionTaken === "contest_banned" && action === "contest_ban") 
                              || updatingCase === realIdx
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 ${cls}`}>
                            {updatingCase === realIdx && <Loader className="h-3 w-3 animate-spin" />}
                            {label}
                          </button>
                        ))}
                      </div>
                      {/* ✅ Current action status indicator */}
                      <p className="text-xs text-gray-600 mt-2">
                        Current status: <span className={`font-medium ${actionConfig.color.split(' ')[1]}`}>{actionConfig.label}</span>
                        {c.reviewedBy && (
                          <span className="ml-2">• Reviewed by: {typeof c.reviewedBy === "object" ? c.reviewedBy.username : c.reviewedBy}</span>
                        )}
                      </p>
                    </div>

                    {/* Contest ban modal buttons */}
                    {onOpenContestBan && (
                      <div className="pt-3 border-t border-gray-800/60">
                        <p className="text-xs font-semibold text-gray-400 mb-2">Open the Contest Ban Modal:</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { user: c.user1, label: "👑 Original ko Ban" },
                            { user: c.user2, label: "🚨 Copier ko Ban" },
                          ].map(({ user, label }) => (
                            <button key={label}
                              onClick={() => onOpenContestBan(getUserId(user), getUsername(user))}
                              disabled={!getUserId(user)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 rounded-lg text-xs font-medium transition-all">
                              <Ban className="h-3.5 w-3.5" /> {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PlagiarismAdminPanel;
