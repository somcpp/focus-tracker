"use client";

import { useRef, useState, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Flame,
  Globe,
  Layers,
  Share2,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-client";
import { useUi, type ShareScope } from "@/lib/ui-store";
import { useActiveSession, useNow, useToday } from "@/lib/hooks";
import { dayTotals, streaks, sessionsByTask, taskMs } from "@/lib/selectors";
import { solid } from "@/lib/colors";
import type { ColorKey } from "@/lib/types";
import { addDays, formatDuration, prettyDate } from "@/lib/time";
import { plainText, splitLinks } from "@/lib/links";
import { getMood } from "@/lib/moods";
import { toast } from "./ui";
import { LeetCodeIcon } from "./RichText";
import { toBlob, toPng } from "html-to-image";

function ShareCardTaskTitle({ title }: { title: string }) {
  const parts = splitLinks(title);
  if (parts.length === 1 && parts[0].type === "text") {
    return <span className="truncate">{parts[0].value}</span>;
  }
  return (
    <span className="truncate flex-1 inline-flex items-center gap-1.5 min-w-0">
      {parts.map((p, i) => {
        if (p.type === "text") {
          return (
            <span key={i} className="truncate">
              {p.value}
            </span>
          );
        }
        if (p.link.site === "LeetCode") {
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 shrink-0 font-medium text-white/95 bg-white/10 px-1.5 py-0.5 rounded text-[11px]"
            >
              <LeetCodeIcon size={11} />
              <span className="truncate max-w-[170px]">{p.link.title ?? "LeetCode"}</span>
            </span>
          );
        }
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 shrink-0 font-medium text-white/80 bg-white/10 px-1.5 py-0.5 rounded text-[11px]"
          >
            <Globe size={10} className="text-white/60" />
            <span className="truncate max-w-[140px]">{p.link.title ?? p.link.site}</span>
          </span>
        );
      })}
    </span>
  );
}

type CardTheme = "midnight" | "sunset" | "cyber" | "obsidian";

const THEMES: { id: CardTheme; name: string; preview: string; aura: string; border: string; accent: string }[] = [
  {
    id: "midnight",
    name: "Midnight Neon",
    preview: "from-indigo-600 via-purple-600 to-blue-600",
    aura: "radial-gradient(circle at 10% 10%, rgba(99,102,241,0.28), transparent 45%), radial-gradient(circle at 90% 90%, rgba(217,70,239,0.22), transparent 45%)",
    border: "rgba(129, 140, 248, 0.35)",
    accent: "#818cf8",
  },
  {
    id: "sunset",
    name: "Sunset Ember",
    preview: "from-amber-500 via-orange-600 to-rose-600",
    aura: "radial-gradient(circle at 10% 10%, rgba(249,115,22,0.32), transparent 45%), radial-gradient(circle at 90% 90%, rgba(239,68,68,0.25), transparent 45%)",
    border: "rgba(251, 146, 60, 0.35)",
    accent: "#fb923c",
  },
  {
    id: "cyber",
    name: "Cyber Emerald",
    preview: "from-emerald-500 via-teal-600 to-cyan-600",
    aura: "radial-gradient(circle at 10% 10%, rgba(16,185,129,0.3), transparent 45%), radial-gradient(circle at 90% 90%, rgba(6,182,212,0.25), transparent 45%)",
    border: "rgba(52, 211, 153, 0.35)",
    accent: "#34d399",
  },
  {
    id: "obsidian",
    name: "Obsidian Silver",
    preview: "from-zinc-700 via-zinc-800 to-zinc-900",
    aura: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.12), transparent 50%)",
    border: "rgba(255, 255, 255, 0.16)",
    accent: "#e4e4e7",
  },
];

export function ShareProgressModal() {
  const open = useUi((s) => s.shareModalOpen);
  const shareDate = useUi((s) => s.shareDate);
  const uiScope = useUi((s) => s.shareScope);
  const closeShare = useUi((s) => s.closeShare);
  const today = useToday();

  // Mode: "day" or "month"
  const [selectedScope, setSelectedScope] = useState<ShareScope | null>(null);
  const scope = selectedScope ?? (uiScope || "day");

  // Day mode state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const currentDate = selectedDate ?? (shareDate || today);
  const setCurrentDate = (d: string | ((prev: string) => string)) => {
    setSelectedDate((prev) => (typeof d === "function" ? d(prev ?? (shareDate || today)) : d));
  };

  // Month mode navigation offset (0 = current month, -1 = previous month, etc.)
  const [monthOffset, setMonthOffset] = useState<number>(0);

  const handleClose = () => {
    setSelectedDate(null);
    setSelectedScope(null);
    setMonthOffset(0);
    closeShare();
  };

  const [selectedTheme, setSelectedTheme] = useState<CardTheme>("midnight");
  const [copyingImg, setCopyingImg] = useState(false);
  const [copiedImg, setCopiedImg] = useState(false);
  const [copyingTxt, setCopyingTxt] = useState(false);
  const [copiedTxt, setCopiedTxt] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  const active = useActiveSession();
  const now = useNow(!!active, 10000);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const categories = useStore((s) => s.categories);
  const journals = useStore((s) => s.journals);
  const settings = useStore((s) => s.settings);
  const authUser = useAuth((s) => s.user);

  const userName = settings.name || authUser?.name || "Focus User";
  const userAvatar = authUser?.image;

  // Day totals map
  const totals = useMemo(() => dayTotals(tasks, sessions, now), [tasks, sessions, now]);

  // Overall streak
  const streak = useMemo(
    () => streaks(totals, settings.streakMinMinutes, today),
    [totals, settings.streakMinMinutes, today],
  );

  // ---------------- DAILY CALCULATIONS ----------------
  const dayMs = totals.get(currentDate) ?? 0;
  const dayMinutes = Math.round(dayMs / 60000);
  const goalMinutes = settings.dailyGoalMinutes || 360;
  const goalPercent = Math.min(999, Math.round((dayMinutes / goalMinutes) * 100));

  const dayTasks = useMemo(() => tasks.filter((t) => t.date === currentDate), [tasks, currentDate]);
  const completedDayTasks = useMemo(() => dayTasks.filter((t) => t.done), [dayTasks]);
  const daySessions = useMemo(() => {
    const taskIds = new Set(dayTasks.map((t) => t.id));
    return sessions.filter((s) => taskIds.has(s.taskId));
  }, [dayTasks, sessions]);

  const byTask = useMemo(() => sessionsByTask(daySessions), [daySessions]);

  const dayCategoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of dayTasks) {
      const ms = taskMs(t.id, byTask, now);
      if (ms > 0) {
        map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + ms);
      }
    }
    return Array.from(map.entries())
      .map(([catId, ms]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          id: catId,
          name: cat?.name ?? "General",
          color: cat?.color ?? "blue",
          durationMs: ms,
          percent: dayMs > 0 ? Math.round((ms / dayMs) * 100) : 0,
        };
      })
      .sort((a, b) => b.durationMs - a.durationMs);
  }, [dayTasks, byTask, now, categories, dayMs]);

  const journal = journals[currentDate];
  const mood = journal ? getMood(journal.mood) : null;
  const win = journal?.wins?.trim();

  // Completed tasks grouped by category for daily changelog showcase
  const completedByCategory = useMemo(() => {
    const groups: {
      category: { id: string; name: string; color: ColorKey };
      totalMs: number;
      tasks: { task: (typeof dayTasks)[number]; ms: number }[];
    }[] = [];

    const catMap = new Map<
      string,
      {
        category: { id: string; name: string; color: ColorKey };
        totalMs: number;
        tasks: { task: (typeof dayTasks)[number]; ms: number }[];
      }
    >();

    for (const t of completedDayTasks) {
      const cat = categories.find((c) => c.id === t.categoryId) || {
        id: t.categoryId,
        name: "General",
        color: "blue" as ColorKey,
      };
      const ms = taskMs(t.id, byTask, now);
      let group = catMap.get(cat.id);
      if (!group) {
        group = { category: { id: cat.id, name: cat.name, color: (cat.color ?? "blue") as ColorKey }, totalMs: 0, tasks: [] };
        catMap.set(cat.id, group);
        groups.push(group);
      }
      group.totalMs += ms;
      group.tasks.push({ task: t, ms });
    }

    // Sort categories by total focused time descending, or task count
    groups.sort((a, b) => b.totalMs - a.totalMs || b.tasks.length - a.tasks.length);
    return groups;
  }, [completedDayTasks, categories, byTask, now]);

  // ---------------- MONTHLY CALCULATIONS ----------------
  const currentMonthDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const monthYear = currentMonthDate.getFullYear();
  const monthIdx = currentMonthDate.getMonth();
  const monthName = currentMonthDate.toLocaleDateString([], { month: "long", year: "numeric" });
  const monthShortName = currentMonthDate.toLocaleDateString([], { month: "short" });
  const monthPrefix = `${monthYear}-${String(monthIdx + 1).padStart(2, "0")}`;

  const daysInMonth = new Date(monthYear, monthIdx + 1, 0).getDate();
  const monthDayKeys = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => `${monthPrefix}-${String(i + 1).padStart(2, "0")}`).filter(
      (d) => d <= today,
    );
  }, [daysInMonth, monthPrefix, today]);

  const monthMs = useMemo(() => {
    return monthDayKeys.reduce((sum, d) => sum + (totals.get(d) ?? 0), 0);
  }, [monthDayKeys, totals]);

  const activeDaysCount = useMemo(() => {
    return monthDayKeys.filter((d) => (totals.get(d) ?? 0) > 0).length;
  }, [monthDayKeys, totals]);

  const monthTasks = useMemo(() => {
    return tasks.filter((t) => t.date.startsWith(monthPrefix));
  }, [tasks, monthPrefix]);

  const completedMonthTasks = useMemo(() => {
    return monthTasks.filter((t) => t.done);
  }, [monthTasks]);

  const monthSessions = useMemo(() => {
    const taskIds = new Set(monthTasks.map((t) => t.id));
    return sessions.filter((s) => taskIds.has(s.taskId));
  }, [monthTasks, sessions]);

  const monthByTask = useMemo(() => sessionsByTask(monthSessions), [monthSessions]);

  const monthCategoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthTasks) {
      const ms = taskMs(t.id, monthByTask, now);
      if (ms > 0) {
        map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + ms);
      }
    }
    return Array.from(map.entries())
      .map(([catId, ms]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          id: catId,
          name: cat?.name ?? "General",
          color: cat?.color ?? "blue",
          durationMs: ms,
          percent: monthMs > 0 ? Math.round((ms / monthMs) * 100) : 0,
        };
      })
      .sort((a, b) => b.durationMs - a.durationMs);
  }, [monthTasks, monthByTask, now, categories, monthMs]);

  const avgFocusPerActiveDay = activeDaysCount > 0 ? Math.round(monthMs / activeDaysCount) : 0;
  const activePercent = monthDayKeys.length > 0 ? Math.round((activeDaysCount / monthDayKeys.length) * 100) : 0;

  const themeConfig = THEMES.find((t) => t.id === selectedTheme) || THEMES[0];

  // ---------------- ACTIONS ----------------
  const handleCopyImage = async () => {
    if (!cardRef.current || copyingImg) return;
    try {
      setCopyingImg(true);
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
      });
      if (!blob) throw new Error("Could not generate image");

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopiedImg(true);
        toast("Card image copied! Ready to paste into Twitter, WhatsApp, Discord, or Slack.");
        setTimeout(() => setCopiedImg(false), 2500);
      } else {
        const dataUrl = await toPng(cardRef.current, { pixelRatio: 2.5 });
        const link = document.createElement("a");
        link.download = scope === "month" ? `focus-month-${monthPrefix}.png` : `focus-progress-${currentDate}.png`;
        link.href = dataUrl;
        link.click();
        toast("Saved progress card as PNG image!");
      }
    } catch (err) {
      console.error("Failed to copy card image:", err);
      toast("Unable to copy image directly. Try Download Image.");
    } finally {
      setCopyingImg(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current || downloading) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = scope === "month" ? `focus-month-${monthPrefix}.png` : `focus-progress-${currentDate}.png`;
      link.href = dataUrl;
      link.click();
      toast("Downloaded high-res progress card!");
    } catch (err) {
      console.error("Failed to download image:", err);
      toast("Failed to download image.");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyText = async () => {
    try {
      setCopyingTxt(true);
      let text = "";

      if (scope === "month") {
        const breakdownText =
          monthCategoryBreakdown.length > 0
            ? "\n\nCategory Breakdown:\n" +
              monthCategoryBreakdown.map((c) => `• ${c.name}: ${formatDuration(c.durationMs)} (${c.percent}%)`).join("\n")
            : "";

        text = `🗓️ Focus Tracker Monthly Report · ${monthName}
⏱️ ${formatDuration(monthMs)} Total Focus Time (${formatDuration(avgFocusPerActiveDay)}/active day)
🔥 ${activeDaysCount}/${monthDayKeys.length} Days Active (${activePercent}% consistency)
✅ ${completedMonthTasks.length}/${monthTasks.length} Tasks Smashed
⚡ ${monthSessions.length} Focus Blocks Logged${breakdownText}

Tracked with Focus Tracker · https://focus-tracker-lemon.vercel.app`;
      } else {
        const tasksText =
          completedByCategory.length > 0
            ? "\n\nTasks Completed:\n" +
              completedByCategory
                .map(
                  (g) =>
                    `📁 ${g.category.name}${g.totalMs > 0 ? ` (${formatDuration(g.totalMs)})` : ""}:\n` +
                    g.tasks
                      .map((t) => `  ✓ ${plainText(t.task.title)}${t.ms > 0 ? ` · ${formatDuration(t.ms)}` : ""}`)
                      .join("\n"),
                )
                .join("\n\n")
            : "";

        const breakdownText =
          dayCategoryBreakdown.length > 0
            ? "\n\nCategory Distribution:\n" +
              dayCategoryBreakdown.map((c) => `• ${c.name}: ${formatDuration(c.durationMs)} (${c.percent}%)`).join("\n")
            : "";

        const winText = win ? `\n\n🏆 Daily Win: ${win}` : "";

        text = `🎯 Focus Tracker Report · ${prettyDate(currentDate)}
⏱️ ${formatDuration(dayMs)} Total Focus Time (${goalPercent}% of daily goal)
✅ ${completedDayTasks.length}/${dayTasks.length} Tasks Done
🔥 ${streak.current}-Day Streak${tasksText}${breakdownText}${winText}

Tracked with Focus Tracker · https://focus-tracker-lemon.vercel.app`;
      }

      await navigator.clipboard.writeText(text);
      setCopiedTxt(true);
      toast("Text summary copied to clipboard!");
      setTimeout(() => setCopiedTxt(false), 2500);
    } catch {
      toast("Failed to copy text.");
    } finally {
      setCopyingTxt(false);
    }
  };

  const handleNativeShare = async () => {
    if (!cardRef.current) return;
    try {
      const blob = await toBlob(cardRef.current, { pixelRatio: 2.5 });
      const filename = scope === "month" ? `focus-month-${monthPrefix}.png` : `focus-progress-${currentDate}.png`;
      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: "image/png" })] })) {
        const file = new File([blob], filename, { type: "image/png" });
        await navigator.share({
          title: scope === "month" ? `Focus Tracker - ${monthName}` : `Focus Tracker - ${prettyDate(currentDate)}`,
          text:
            scope === "month"
              ? `Logged ${formatDuration(monthMs)} of focus time in ${monthName}! 🔥`
              : `Crushed ${formatDuration(dayMs)} of deep focus on ${prettyDate(currentDate)}! 🔥`,
          files: [file],
        });
      } else if (navigator.share) {
        await navigator.share({
          title: scope === "month" ? `Focus Tracker - ${monthName}` : `Focus Tracker - ${prettyDate(currentDate)}`,
          text:
            scope === "month"
              ? `Logged ${formatDuration(monthMs)} of focus time in ${monthName}! 🔥`
              : `Crushed ${formatDuration(dayMs)} of deep focus with ${completedDayTasks.length}/${dayTasks.length} tasks done! 🔥`,
          url: window.location.origin,
        });
      } else {
        handleCopyImage();
      }
    } catch (err) {
      console.log("Share dismissed", err);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 320 }}
          className="relative z-10 flex max-h-[94vh] w-full max-w-[620px] flex-col overflow-hidden rounded-3xl border border-white/15 bg-card shadow-2xl"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-blue-500/25">
                <Share2 size={16} />
              </span>
              <div>
                <h3 className="text-base font-bold text-ink">Share Progress Card</h3>
                <p className="text-xs text-muted">Generate a stunning graphic to share anywhere</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-card-2 hover:text-ink"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
            {/* Scope Switcher: Day vs Month */}
            <div className="flex rounded-2xl border border-line bg-card-2 p-1">
              <button
                type="button"
                onClick={() => setSelectedScope("day")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                  scope === "day"
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted hover:text-ink hover:bg-card"
                }`}
              >
                <Calendar size={14} />
                <span>Daily Progress</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedScope("month")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                  scope === "month"
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted hover:text-ink hover:bg-card"
                }`}
              >
                <CalendarDays size={14} />
                <span>This Month&apos;s Progress</span>
              </button>
            </div>

            {/* Scope Navigation Bar */}
            {scope === "day" ? (
              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-line bg-card-2 p-2 sm:px-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentDate(today)}
                    className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                      currentDate === today ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink hover:bg-card"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentDate(addDays(today, -1))}
                    className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                      currentDate === addDays(today, -1)
                        ? "bg-accent text-white shadow-sm"
                        : "text-muted hover:text-ink hover:bg-card"
                    }`}
                  >
                    Yesterday
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentDate((d) => addDays(d, -1))}
                    title="Previous Day"
                    className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-card hover:text-ink transition"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="relative flex items-center">
                    <input
                      type="date"
                      value={currentDate}
                      max={today}
                      onChange={(e) => e.target.value && setCurrentDate(e.target.value)}
                      className="cursor-pointer rounded-lg bg-card px-2.5 py-1 text-xs font-semibold text-ink border border-line focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentDate((d) => (d < today ? addDays(d, 1) : d))}
                    disabled={currentDate >= today}
                    title="Next Day"
                    className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-card hover:text-ink transition disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2.5 rounded-2xl border border-line bg-card-2 p-2 sm:px-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMonthOffset(0)}
                    className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                      monthOffset === 0 ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink hover:bg-card"
                    }`}
                  >
                    Current Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonthOffset(-1)}
                    className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                      monthOffset === -1 ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink hover:bg-card"
                    }`}
                  >
                    Last Month
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMonthOffset((m) => m - 1)}
                    title="Previous Month"
                    className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-card hover:text-ink transition"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-semibold text-xs text-ink">{monthName}</span>
                  <button
                    type="button"
                    onClick={() => setMonthOffset((m) => Math.min(0, m + 1))}
                    disabled={monthOffset >= 0}
                    title="Next Month"
                    className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-card hover:text-ink transition disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Theme Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">Theme:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {THEMES.map((theme) => {
                  const active = selectedTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedTheme(theme.id)}
                      className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition border ${
                        active
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-line bg-card text-muted hover:text-ink hover:border-line-2"
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${theme.preview}`} />
                      {theme.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* THE SHAREABLE CARD (RENDERED & CAPTURED AS PNG) */}
            <div className="flex justify-center">
              <div
                ref={cardRef}
                style={{
                  background:
                    selectedTheme === "midnight"
                      ? "linear-gradient(145deg, #090d16 0%, #111827 50%, #030712 100%)"
                      : selectedTheme === "sunset"
                      ? "linear-gradient(145deg, #180903 0%, #291307 50%, #0c0401 100%)"
                      : selectedTheme === "cyber"
                      ? "linear-gradient(145deg, #02120e 0%, #062b21 50%, #010a08 100%)"
                      : "linear-gradient(145deg, #18181b 0%, #09090b 100%)",
                  borderColor: themeConfig.border,
                }}
                className="relative w-full max-w-[520px] select-none overflow-hidden rounded-3xl border p-6 text-white shadow-2xl transition-all"
              >
                {/* Background Ambient Glow */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: themeConfig.aura }}
                />

                {/* Card Top: Branding & User Info */}
                <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={userName}
                        className="h-10 w-10 rounded-full border border-white/20 object-cover shadow-md"
                      />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white shadow-md text-sm">
                        {userName[0]?.toUpperCase() || "F"}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold leading-none text-white tracking-tight">{userName}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-white/70">
                        <Calendar size={12} className="text-white/60" />
                        {scope === "month"
                          ? monthName
                          : prettyDate(currentDate, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 backdrop-blur-md">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-[#ff9a3c] to-[#ff5f45] text-white">
                      {scope === "month" ? <Trophy size={11} className="fill-white" /> : <Flame size={12} className="fill-white" />}
                    </span>
                    <span className="text-xs font-bold text-white tracking-wide">
                      {scope === "month" ? `${activeDaysCount} Days Active` : `${streak.current}d Streak`}
                    </span>
                  </div>
                </div>

                {/* HERO METRICS SECTION */}
                {scope === "month" ? (
                  /* MONTHLY HERO GRID */
                  <div className="relative z-10 my-5 grid grid-cols-2 gap-3">
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                          {monthShortName} Total Focus
                        </span>
                        <Clock size={15} style={{ color: themeConfig.accent }} />
                      </div>
                      <p className="mt-2 text-3xl font-extrabold tracking-tight text-white tnum">
                        {formatDuration(monthMs)}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-white/75">
                        <span className="h-2 w-2 rounded-full" style={{ background: themeConfig.accent }} />
                        <span>{formatDuration(avgFocusPerActiveDay)} / active day</span>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                          Consistency
                        </span>
                        <Flame size={15} className="text-amber-400" />
                      </div>
                      <p className="mt-2 text-3xl font-extrabold tracking-tight text-white tnum">
                        {activePercent}
                        <span className="text-lg font-medium text-white/50">%</span>
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-white/75">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        <span>{activeDaysCount} of {monthDayKeys.length} days active</span>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                          Tasks Completed
                        </span>
                        <CheckCircle2 size={15} className="text-emerald-400" />
                      </div>
                      <p className="mt-2 text-2xl font-extrabold tracking-tight text-white tnum">
                        {completedMonthTasks.length}
                        <span className="text-base font-medium text-white/50">/{monthTasks.length}</span>
                      </p>
                      <div className="mt-1.5 text-xs text-white/60 truncate">
                        {monthTasks.length > 0
                          ? `${Math.round((completedMonthTasks.length / monthTasks.length) * 100)}% monthly completion`
                          : "0 tasks logged"}
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                          Focus Sessions
                        </span>
                        <Layers size={15} className="text-purple-400" />
                      </div>
                      <p className="mt-2 text-2xl font-extrabold tracking-tight text-white tnum">
                        {monthSessions.length}
                      </p>
                      <div className="mt-1.5 text-xs text-white/60 truncate">
                        Blocks recorded this month
                      </div>
                    </div>
                  </div>
                ) : (
                  /* DAILY HERO STATS STRIP */
                  <div className="relative z-10 my-4 grid grid-cols-2 gap-3">
                    {/* Total Focus Time */}
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                          Total Focus Time
                        </span>
                        <Clock size={14} style={{ color: themeConfig.accent }} />
                      </div>
                      <p className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-white tnum">
                        {formatDuration(dayMs)}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/75">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: goalPercent >= 100 ? "#10b981" : themeConfig.accent }}
                        />
                        <span>{goalPercent}% of daily goal</span>
                      </div>
                    </div>

                    {/* Total Tasks Completed */}
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                          Tasks Done
                        </span>
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      </div>
                      <p className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-white tnum">
                        {completedDayTasks.length}
                        <span className="text-base font-medium text-white/50">
                          {dayTasks.length > 0 ? ` / ${dayTasks.length}` : " done"}
                        </span>
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/75">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span>
                          {completedByCategory.length} {completedByCategory.length === 1 ? "category" : "categories"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* CATEGORY BREAKDOWN MULTI-BAR */}
                {((scope === "month" ? monthCategoryBreakdown : dayCategoryBreakdown).length > 0) && (
                  <div className="relative z-10 my-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-sm">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-white/70">
                      <span className="flex items-center gap-1.5">
                        <Layers size={12} className="text-white/60" />
                        {scope === "month" ? "Monthly Breakdown" : "Focus Distribution"}
                      </span>
                      <span className="tnum font-bold text-white/90">
                        {(scope === "month" ? monthCategoryBreakdown : dayCategoryBreakdown).length} Categories
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                      {(scope === "month" ? monthCategoryBreakdown : dayCategoryBreakdown).map((c) => (
                        <div
                          key={c.id}
                          style={{
                            width: `${c.percent}%`,
                            background: solid(c.color),
                          }}
                          title={`${c.name}: ${formatDuration(c.durationMs)} (${c.percent}%)`}
                          className="h-full transition-all"
                        />
                      ))}
                    </div>

                    {/* Category Legend Pills */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {(scope === "month" ? monthCategoryBreakdown : dayCategoryBreakdown).slice(0, 4).map((c) => (
                        <span
                          key={c.id}
                          className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/90"
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: solid(c.color) }}
                          />
                          <span className="truncate max-w-[110px]">{c.name}</span>
                          <span className="text-white/60 tnum">{formatDuration(c.durationMs)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* DAILY EXCLUSIVE: All Completed Tasks Grouped by Category */}
                {scope === "day" && (
                  <div className="relative z-10 my-3 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/60">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        Completed Tasks ({completedDayTasks.length})
                      </p>
                      {completedByCategory.length > 0 && (
                        <span className="text-[10px] font-semibold text-white/50">
                          Grouped by category
                        </span>
                      )}
                    </div>

                    {completedByCategory.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {completedByCategory.map((group) => (
                          <div
                            key={group.category.id}
                            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm"
                          >
                            {/* Category Subheader */}
                            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{ background: solid(group.category.color) }}
                                />
                                <span className="font-bold text-white tracking-tight">{group.category.name}</span>
                                <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] font-semibold text-white/70">
                                  {group.tasks.length} {group.tasks.length === 1 ? "task" : "tasks"}
                                </span>
                              </div>
                              {group.totalMs > 0 && (
                                <span className="text-[11px] font-medium text-white/60 tnum">
                                  {formatDuration(group.totalMs)}
                                </span>
                              )}
                            </div>

                            {/* Task Items */}
                            <ul className="divide-y divide-white/5">
                              {group.tasks.map(({ task, ms }) => (
                                <li
                                  key={task.id}
                                  className="flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-white/90"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
                                      <Check size={10} strokeWidth={3} />
                                    </span>
                                    <ShareCardTaskTitle title={task.title} />
                                  </div>
                                  {ms > 0 && (
                                    <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-white/60 tnum">
                                      {formatDuration(ms)}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-center">
                        <p className="text-xs font-medium text-white/70">No tasks completed yet on this day</p>
                        <p className="mt-1 text-[11px] text-white/40">Finish a task to see it listed here!</p>
                      </div>
                    )}

                    {(win || mood) && (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white/90 flex items-start gap-2.5">
                        <Trophy size={16} className="shrink-0 text-amber-400 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          {mood && (
                            <span className="inline-block rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white mb-1">
                              Mood: {mood.label}
                            </span>
                          )}
                          {win && <p className="italic line-clamp-2 text-white/85">“{win}”</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Watermark */}
                <div className="relative z-10 mt-5 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-white/60">
                  <div className="flex items-center gap-1.5 font-bold tracking-tight text-white/80">
                    <span className="grid h-4 w-4 place-items-center rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 text-[10px] text-white">
                      F
                    </span>
                    Focus Tracker
                  </div>
                  <span className="font-mono text-[10px] text-white/50 tracking-wider">
                    focus-tracker-lemon.vercel.app
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-card-2 p-4 sm:px-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink transition hover:bg-card-2 active:scale-95"
              >
                {copiedTxt ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copiedTxt ? "Copied Text!" : copyingTxt ? "Copying..." : "Copy Text"}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={downloading}
                className="flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink transition hover:bg-card-2 active:scale-95 disabled:opacity-50"
              >
                <Download size={14} />
                <span>{downloading ? "Saving..." : "Download PNG"}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {"share" in (typeof window !== "undefined" ? navigator : {}) && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent-soft px-3.5 py-2 text-xs font-bold text-accent transition hover:brightness-105 active:scale-95"
                >
                  <Share2 size={14} />
                  <span>Share</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyImage}
                disabled={copyingImg}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                {copiedImg ? <Check size={15} /> : <Sparkles size={15} />}
                <span>{copiedImg ? "Image Copied!" : copyingImg ? "Rendering..." : "Copy Card Image"}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
