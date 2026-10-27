"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useActiveSession, useMounted, useNow, useToday } from "@/lib/hooks";
import { formatClock } from "@/lib/time";
import { solid } from "@/lib/colors";
import { CategoryIcon } from "@/lib/icons";
import { plainText } from "@/lib/links";
import { useAuth } from "@/lib/auth-client";
import { initializeDatabaseSync, pullLatestFromCloud, queueDatabaseSync, syncWithCloud } from "@/lib/sync";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Laptop,
  Lock,
  LogOut,
  Mail,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";

declare global {
  interface Window {
    electronAPI?: {
      setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void;
      minimize: () => void;
      close: () => void;
      resize: (width: number, height: number) => void;
      isDesktop?: boolean;
    };
  }
}

export default function DynamicIslandPage() {
  const mounted = useMounted();
  const [expanded, setExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Authentication & Pairing state
  const { user, token, setSession, signInWithEmail, signOut } = useAuth();
  const [pairingCode, setPairingCode] = useState("");
  const [pairLoading, setPairLoading] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);
  const [useEmailAuth, setUseEmailAuth] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const categories = useStore((s) => s.categories);
  const { startTask, pauseActive, finishTask } = useStore.getState();

  const active = useActiveSession();
  const now = useNow(!!active, 1000);
  const today = useToday();

  // Find currently active task, or retain the paused/most recent task
  const currentTask = useMemo(() => {
    if (active) {
      return tasks.find((t) => t.id === active.taskId) ?? null;
    }
    // When paused: find the most recently paused/worked-on task that is not marked done
    const recentSession = [...sessions]
      .filter((s) => s.end !== null)
      .sort((a, b) => (b.end ?? 0) - (a.end ?? 0))[0];
    if (recentSession) {
      const task = tasks.find((t) => t.id === recentSession.taskId && !t.done);
      if (task) return task;
    }
    // Otherwise fallback to today's first pending task
    return tasks.find((t) => t.date === today && !t.done) ?? null;
  }, [active, sessions, tasks, today]);

  const currentCategory = useMemo(() => {
    if (!currentTask) return null;
    return categories.find((c) => c.id === currentTask.categoryId) ?? null;
  }, [currentTask, categories]);

  const totalTime = useMemo(() => {
    if (!currentTask) return 0;
    return sessions
      .filter((s) => s.taskId === currentTask.id)
      .reduce((sum, s) => sum + ((s.end ?? now) - s.start), 0);
  }, [currentTask, sessions, now]);

  // Today's pending tasks for quick switching or starting
  const pendingTasks = useMemo(() => {
    return tasks.filter((t) => t.date === today && !t.done);
  }, [tasks, today]);

  // Electron click-through registration and body transparency
  useEffect(() => {
    window.electronAPI?.setIgnoreMouseEvents(true, { forward: true });
    document.documentElement.style.setProperty("background", "transparent", "important");
    document.documentElement.style.setProperty("background-color", "transparent", "important");
    document.body.style.setProperty("background", "transparent", "important");
    document.body.style.setProperty("background-color", "transparent", "important");
  }, []);

  // 1. Initial auth verification & database synchronization
  useEffect(() => {
    if (!mounted) return;
    useAuth.getState().checkSession().then((u) => {
      if (u) {
        initializeDatabaseSync();
      }
    });
  }, [mounted]);

  // 2. Event-driven sync on window focus (0 interval polling calls!)
  useEffect(() => {
    if (!mounted || !user) return;
    const onFocus = () => {
      pullLatestFromCloud();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [mounted, user]);

  // 3. Dynamic window resizing based on state
  useEffect(() => {
    if (expanded) {
      const height = !user ? 220 : 160;
      window.electronAPI?.resize(460, height);
      window.electronAPI?.setIgnoreMouseEvents(false);
    } else {
      window.electronAPI?.resize(460, 60);
      if (!isHovered) {
        window.electronAPI?.setIgnoreMouseEvents(true, { forward: true });
      }
    }
  }, [expanded, isHovered, user]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    window.electronAPI?.setIgnoreMouseEvents(false);
    // Refresh only when user hovers over the island
    if (user) {
      pullLatestFromCloud();
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!expanded) {
      window.electronAPI?.setIgnoreMouseEvents(true, { forward: true });
    }
  };

  // Pair Desktop Island with 6-digit code
  const handleClaimCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = pairingCode.trim().replace(/\s+/g, "");
    if (clean.length !== 6) {
      setPairError("Please enter a 6-digit code");
      return;
    }

    setPairLoading(true);
    setPairError(null);
    try {
      const res = await fetch("/api/auth/desktop-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim", code: clean }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setPairError(data.error || "Invalid or expired code");
        return;
      }

      // Successfully authenticated!
      setSession(data.user, data.token);
      setPairingCode("");
      setExpanded(false);

      // Immediately pull all cloud tasks and sessions from Neon Postgres
      await syncWithCloud();
    } catch {
      setPairError("Failed to connect. Check internet connection.");
    } finally {
      setPairLoading(false);
    }
  };

  // Direct email sign-in fallback
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput.trim()) {
      setPairError("Please enter email and password");
      return;
    }
    setPairLoading(true);
    setPairError(null);
    try {
      const res = await signInWithEmail(emailInput.trim(), passwordInput.trim());
      if (res?.error) {
        setPairError(res.error);
        return;
      }
      setExpanded(false);
      await syncWithCloud();
    } catch {
      setPairError("Failed to sign in");
    } finally {
      setPairLoading(false);
    }
  };

  if (!mounted) return null;

  const accentColor = currentCategory ? solid(currentCategory.color) : "#3b82f6";
  const isLeetCode = currentTask ? /leetcode/i.test(currentTask.title) : false;

  return (
    <div
      data-island="true"
      className="flex h-screen w-screen flex-col items-center justify-start overflow-hidden bg-transparent select-none pt-1"
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
    >
      {/* Top drag bar */}
      <div
        className="h-1.5 w-32 cursor-grab active:cursor-grabbing rounded-full bg-transparent hover:bg-white/10 transition-colors"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        title="Drag to reposition Dynamic Island"
      />

      {/* Dynamic Island Pill Container */}
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative flex flex-col items-center overflow-hidden rounded-[26px] bg-[#000000]/95 backdrop-blur-3xl text-white transition-all duration-300 ease-out ${
          expanded
            ? !user
              ? "h-[200px] w-[440px] px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_20px_rgba(255,255,255,0.06)]"
              : "h-[142px] w-[440px] px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_20px_rgba(255,255,255,0.06)]"
            : "h-[42px] w-[370px] px-3.5 shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_15px_rgba(255,255,255,0.04)]"
        }`}
        style={{
          border: "1px solid rgba(255, 255, 255, 0.14)",
          boxShadow: active
            ? `0 10px 40px -10px rgba(0,0,0,0.9), 0 0 25px ${accentColor}30, inset 0 1px 0 rgba(255,255,255,0.2)`
            : "0 10px 30px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.15)",
        }}
      >
        {/* COMPACT VIEW */}
        {!expanded ? (
          <div className="flex h-full w-full items-center justify-between gap-2.5">
            {!user ? (
              /* NOT CONNECTED STATE */
              <>
                <div className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
                    <Laptop size={11} />
                  </span>
                  <span className="text-[12px] font-semibold text-white/90">
                    Focus Island
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setExpanded(true)}
                    className="flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 px-2.5 py-1 text-[11px] font-bold text-white transition active:scale-95 shadow-sm shadow-blue-500/30"
                  >
                    <span>Connect Account</span>
                  </button>
                  <button
                    onClick={() => setExpanded(true)}
                    className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/15 text-white/70 hover:text-white transition"
                    title="Open connection options"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </>
            ) : currentTask ? (
              /* FOCUS SESSION STATE (ACTIVE OR PAUSED) */
              <>
                {/* Left: Category Icon & Pulsing Aura */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative flex items-center justify-center">
                    {active && (
                      <span
                        className="absolute h-3 w-3 animate-ping rounded-full opacity-60"
                        style={{ backgroundColor: accentColor }}
                      />
                    )}
                    <span
                      className={`relative h-2.5 w-2.5 rounded-full ${
                        active ? "shadow-[0_0_8px_currentColor]" : "opacity-60"
                      }`}
                      style={{ backgroundColor: accentColor, color: accentColor }}
                    />
                  </div>
                  {isLeetCode && (
                    <span className="flex items-center gap-1 rounded bg-[#ffa116]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#ffa116]">
                      LC
                    </span>
                  )}
                  <span className="truncate text-[13px] font-semibold tracking-tight text-white/95 max-w-[150px]">
                    {plainText(currentTask.title)}
                  </span>
                  {!active && (
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                      PAUSED
                    </span>
                  )}
                </div>

                {/* Right: Clock & Equalizer & Hover Actions */}
                <div className="flex items-center gap-2">
                  {active ? (
                    <div className="flex items-center gap-0.5 h-3 px-1">
                      <span className="h-full w-[2.5px] animate-[pulse_1s_ease-in-out_infinite] rounded-full bg-emerald-400" />
                      <span className="h-2/3 w-[2.5px] animate-[pulse_0.7s_ease-in-out_infinite] rounded-full bg-emerald-400" />
                      <span className="h-4/5 w-[2.5px] animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-emerald-400" />
                    </div>
                  ) : null}

                  <span
                    className={`font-mono text-[13px] font-bold tracking-tight tnum ${
                      active ? "" : "text-white/70"
                    }`}
                    style={active ? { color: accentColor } : undefined}
                  >
                    {formatClock(totalTime)}
                  </span>

                  <div className="flex items-center gap-1 pl-1">
                    {active ? (
                      <button
                        onClick={() => {
                          pauseActive();
                          queueDatabaseSync(300);
                        }}
                        aria-label="Pause"
                        title="Pause timer"
                        className="grid h-6 w-6 place-items-center rounded-full bg-white/10 hover:bg-white/25 text-white transition active:scale-90"
                      >
                        <Pause size={12} className="fill-current" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          startTask(currentTask.id);
                          queueDatabaseSync(300);
                        }}
                        aria-label="Resume"
                        title="Resume timer"
                        className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 hover:bg-emerald-400 text-white transition active:scale-90 shadow-sm shadow-emerald-500/40"
                      >
                        <Play size={11} className="fill-current ml-0.5" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        finishTask(currentTask.id);
                        queueDatabaseSync(300);
                      }}
                      aria-label="Done"
                      title="Finish Task"
                      className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500/80 hover:bg-emerald-400 text-white transition active:scale-90"
                    >
                      <Check size={12} strokeWidth={3} />
                    </button>
                    <button
                      onClick={() => setExpanded(true)}
                      aria-label="Expand Island"
                      title="Expand Island"
                      className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/15 text-white/70 hover:text-white transition"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* IDLE STATE (Authenticated, but paused or waiting) */
              <>
                <div className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                    <Sparkles size={11} />
                  </span>
                  <span className="text-[12px] font-medium text-white/80">
                    {pendingTasks.length > 0
                      ? `${pendingTasks.length} task${pendingTasks.length > 1 ? "s" : ""} today`
                      : "Ready to focus"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {pendingTasks.length > 0 ? (
                    <button
                      onClick={() => {
                        startTask(pendingTasks[0].id);
                        queueDatabaseSync(300);
                      }}
                      className="flex items-center gap-1 rounded-full bg-white/15 hover:bg-white/25 px-2.5 py-1 text-[11px] font-semibold text-white transition active:scale-95"
                    >
                      <Play size={10} className="fill-current" />
                      <span className="truncate max-w-[100px]">{plainText(pendingTasks[0].title)}</span>
                    </button>
                  ) : null}
                  <button
                    onClick={() => setExpanded(true)}
                    className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/15 text-white/70 hover:text-white transition"
                    title="Open options"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* EXPANDED VIEW */
          <div className="flex h-full w-full flex-col justify-between">
            {!user ? (
              /* PAIRING FORM */
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Laptop size={15} className="text-indigo-400" />
                      <span>Connect to Focus Tracker</span>
                    </h3>
                    <p className="text-[11px] text-white/60">
                      {useEmailAuth ? "Sign in with your account credentials" : "Enter the 6-digit code from your web dashboard"}
                    </p>
                  </div>
                  <button
                    onClick={() => setExpanded(false)}
                    className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/15 text-white/70 hover:text-white"
                  >
                    <ChevronUp size={14} />
                  </button>
                </div>

                {pairError && (
                  <div className="rounded-lg bg-red-500/20 px-2.5 py-1 text-[11px] text-red-300">
                    {pairError}
                  </div>
                )}

                {!useEmailAuth ? (
                  <form onSubmit={handleClaimCode} className="flex flex-col gap-2 my-auto">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={pairingCode}
                        onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="e.g. 582914"
                        className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 font-mono text-lg font-bold tracking-widest text-center text-white placeholder:text-white/30 focus:border-indigo-400 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={pairLoading || pairingCode.length !== 6}
                        className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40 transition active:scale-95 shadow-md shadow-blue-500/30 flex items-center gap-1.5"
                      >
                        {pairLoading ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                        <span>Pair</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-white/50 pt-1">
                      <span>Click &quot;Desktop Island&quot; on web to get code</span>
                      <button
                        type="button"
                        onClick={() => setUseEmailAuth(true)}
                        className="underline hover:text-white"
                      >
                        Sign in with email
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleEmailSignIn} className="flex flex-col gap-2 my-auto">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="Email"
                        className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-indigo-400 focus:outline-none"
                      />
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Password"
                        className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-indigo-400 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setUseEmailAuth(false)}
                        className="text-[11px] text-white/50 underline hover:text-white"
                      >
                        Use 6-digit code instead
                      </button>
                      <button
                        type="submit"
                        disabled={pairLoading}
                        className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-40 transition"
                      >
                        {pairLoading ? "Signing in..." : "Sign In"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="flex justify-end gap-1 text-[11px] text-white/40 border-t border-white/10 pt-1.5">
                  <a
                    href="https://focus-tracker-lemon.vercel.app"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white flex items-center gap-1"
                  >
                    <span>Open Web App</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            ) : (
              /* AUTHENTICATED EXPANDED VIEW */
              <div className="flex h-full w-full flex-col justify-between">
                {/* Header: Title, Category Badge, User & Window Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {currentCategory ? (
                        <span
                          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-white shadow-sm"
                          style={{ backgroundColor: accentColor }}
                        >
                          <CategoryIcon icon={currentCategory.icon} color={currentCategory.color} size="sm" />
                          <span>{currentCategory.name}</span>
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/80">
                          Focus Tracker
                        </span>
                      )}
                      {isLeetCode && (
                        <span className="rounded bg-[#ffa116]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#ffa116]">
                          LeetCode
                        </span>
                      )}
                      <span className="truncate text-[10px] text-emerald-400 font-medium">
                        • {user.name || "Synced"}
                      </span>
                    </div>
                    <h3 className="mt-1 truncate text-sm font-bold text-white">
                      {currentTask ? plainText(currentTask.title) : "No active session"}
                    </h3>
                  </div>

                  {/* Window Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => pullLatestFromCloud()}
                      title="Sync with cloud now"
                      className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/15 text-white/70 hover:text-white transition"
                    >
                      <RefreshCw size={12} />
                    </button>
                    <a
                      href="https://focus-tracker-lemon.vercel.app"
                      target="_blank"
                      rel="noreferrer"
                      title="Open Full Web Dashboard"
                      className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/15 text-white/70 hover:text-white transition"
                    >
                      <ExternalLink size={12} />
                    </a>
                    <button
                      onClick={() => setExpanded(false)}
                      title="Collapse Island"
                      className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/15 text-white/70 hover:text-white transition"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => window.electronAPI?.close()}
                      title="Close Floating Island"
                      className="grid h-6 w-6 place-items-center rounded-full hover:bg-red-500/20 hover:text-red-400 text-white/50 transition"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Middle: Big Monospace Clock + Pulse */}
                <div className="flex items-center justify-between border-t border-white/10 pt-2">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="font-mono text-2xl font-black tracking-tight tnum"
                      style={{ color: active ? accentColor : "#94a3b8" }}
                    >
                      {formatClock(totalTime)}
                    </span>
                    <span className="text-[11px] font-medium text-white/50">
                      {active ? "RUNNING" : "PAUSED"}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {currentTask ? (
                      <>
                        {active ? (
                          <button
                            onClick={() => {
                              pauseActive();
                              queueDatabaseSync(300);
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-semibold text-white transition active:scale-95"
                          >
                            <Pause size={12} className="fill-current" />
                            <span>Pause</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              startTask(currentTask.id);
                              queueDatabaseSync(300);
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-3.5 py-1.5 text-xs font-bold text-white transition shadow-md shadow-emerald-500/40 active:scale-95"
                          >
                            <Play size={12} className="fill-current" />
                            <span>Resume</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            finishTask(currentTask.id);
                            queueDatabaseSync(300);
                            setExpanded(false);
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-500/80 hover:bg-emerald-400 px-3 py-1.5 text-xs font-bold text-white transition shadow-[0_0_12px_rgba(16,185,129,0.5)] active:scale-95"
                        >
                          <Check size={13} strokeWidth={3} />
                          <span>Done</span>
                        </button>
                      </>
                    ) : (
                      <>
                        {pendingTasks.length > 0 ? (
                          <button
                            onClick={() => {
                              startTask(pendingTasks[0].id);
                              queueDatabaseSync(300);
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-xs font-bold text-white transition shadow-md shadow-blue-500/30 active:scale-95"
                          >
                            <Play size={12} className="fill-current" />
                            <span>Start Next</span>
                          </button>
                        ) : (
                          <a
                            href="https://focus-tracker-lemon.vercel.app"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-semibold text-white transition"
                          >
                            <span>Add Task in Dashboard</span>
                          </a>
                        )}
                        <button
                          onClick={() => signOut()}
                          title="Sign out of Desktop Island"
                          className="grid h-7 w-7 place-items-center rounded-lg hover:bg-white/10 text-white/40 hover:text-red-400 transition"
                        >
                          <LogOut size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
