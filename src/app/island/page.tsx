"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useActiveSession, useMounted, useNow, useToday } from "@/lib/hooks";
import { formatClock } from "@/lib/time";
import { solid } from "@/lib/colors";
import { CategoryIcon } from "@/lib/icons";
import { plainText, splitLinks } from "@/lib/links";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flame,
  Minus,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
  Zap,
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

  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const categories = useStore((s) => s.categories);
  const settings = useStore((s) => s.settings);
  const { startTask, pauseActive, finishTask } = useStore.getState();

  const active = useActiveSession();
  const now = useNow(!!active, 1000);
  const today = useToday();

  const currentTask = useMemo(() => {
    if (!active) return null;
    return tasks.find((t) => t.id === active.taskId) ?? null;
  }, [active, tasks]);

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

  // Electron click-through registration
  useEffect(() => {
    window.electronAPI?.setIgnoreMouseEvents(true, { forward: true });
  }, []);

  // Dynamic window resizing based on expanded state
  useEffect(() => {
    if (expanded) {
      window.electronAPI?.resize(460, 160);
      window.electronAPI?.setIgnoreMouseEvents(false);
    } else {
      window.electronAPI?.resize(460, 60);
      if (!isHovered) {
        window.electronAPI?.setIgnoreMouseEvents(true, { forward: true });
      }
    }
  }, [expanded, isHovered]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    window.electronAPI?.setIgnoreMouseEvents(false);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!expanded) {
      window.electronAPI?.setIgnoreMouseEvents(true, { forward: true });
    }
  };

  if (!mounted) return null;

  const accentColor = currentCategory ? solid(currentCategory.color) : "#3b82f6";
  const isLeetCode = currentTask ? /leetcode/i.test(currentTask.title) : false;

  return (
    <div
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
            ? "h-[142px] w-[440px] px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_20px_rgba(255,255,255,0.06)]"
            : "h-[42px] w-[370px] px-3.5 shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_15px_rgba(255,255,255,0.04)]"
        }`}
        style={{
          border: "1px solid rgba(255, 255, 255, 0.14)",
          boxShadow: active
            ? `0 10px 40px -10px rgba(0,0,0,0.9), 0 0 25px ${accentColor}30, inset 0 1px 0 rgba(255,255,255,0.2)`
            : "0 10px 30px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.15)",
        }}
      >
        {/* COMPACT VIEW (Single Pill Bar) */}
        {!expanded ? (
          <div className="flex h-full w-full items-center justify-between gap-2.5">
            {active && currentTask ? (
              <>
                {/* Left: Category Icon & Pulsing Aura */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative flex items-center justify-center">
                    <span
                      className="absolute h-3 w-3 animate-ping rounded-full opacity-60"
                      style={{ backgroundColor: accentColor }}
                    />
                    <span
                      className="relative h-2.5 w-2.5 rounded-full shadow-[0_0_8px_currentColor]"
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
                </div>

                {/* Right: Clock & Equalizer & Hover Actions */}
                <div className="flex items-center gap-2">
                  {/* Apple Soundwave Equalizer */}
                  <div className="flex items-center gap-0.5 h-3 px-1">
                    <span className="h-full w-[2.5px] animate-[pulse_1s_ease-in-out_infinite] rounded-full bg-emerald-400" />
                    <span className="h-2/3 w-[2.5px] animate-[pulse_0.7s_ease-in-out_infinite] rounded-full bg-emerald-400" />
                    <span className="h-4/5 w-[2.5px] animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-emerald-400" />
                  </div>

                  <span
                    className="font-mono text-[13px] font-bold tracking-tight tnum"
                    style={{ color: accentColor }}
                  >
                    {formatClock(totalTime)}
                  </span>

                  {/* Quick Controls */}
                  <div className="flex items-center gap-1 pl-1">
                    <button
                      onClick={() => pauseActive()}
                      aria-label="Pause"
                      title="Pause"
                      className="grid h-6 w-6 place-items-center rounded-full bg-white/10 hover:bg-white/25 text-white transition active:scale-90"
                    >
                      <Pause size={12} className="fill-current" />
                    </button>
                    <button
                      onClick={() => finishTask(currentTask.id)}
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
              /* IDLE STATE */
              <>
                <div className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                    <Sparkles size={11} />
                  </span>
                  <span className="text-[12px] font-medium text-white/80">
                    {pendingTasks.length > 0
                      ? `${pendingTasks.length} task${pendingTasks.length > 1 ? "s" : ""} for today`
                      : "Ready to focus"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {pendingTasks.length > 0 ? (
                    <button
                      onClick={() => startTask(pendingTasks[0].id)}
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
            {/* Header: Title, Category Badge, Window Actions */}
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
                </div>
                <h3 className="mt-1 truncate text-sm font-bold text-white">
                  {currentTask ? plainText(currentTask.title) : "No active session"}
                </h3>
              </div>

              {/* Close / Collapse Buttons */}
              <div className="flex items-center gap-1">
                <a
                  href="http://localhost:3000"
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
                {active && currentTask ? (
                  <>
                    <button
                      onClick={() => pauseActive()}
                      className="flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-semibold text-white transition active:scale-95"
                    >
                      <Pause size={12} className="fill-current" />
                      <span>Pause</span>
                    </button>
                    <button
                      onClick={() => {
                        finishTask(currentTask.id);
                        setExpanded(false);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-bold text-white transition shadow-[0_0_12px_rgba(16,185,129,0.5)] active:scale-95"
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
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-xs font-bold text-white transition shadow-md shadow-blue-500/30 active:scale-95"
                      >
                        <Play size={12} className="fill-current" />
                        <span>Start Next</span>
                      </button>
                    ) : (
                      <a
                        href="http://localhost:3000"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-semibold text-white transition"
                      >
                        <span>Add Task in Dashboard</span>
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
