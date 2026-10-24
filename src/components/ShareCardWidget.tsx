"use client";

import { useMemo } from "react";
import { Calendar, Share2, Sparkles, Trophy } from "lucide-react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui-store";
import { useActiveSession, useNow } from "@/lib/hooks";
import { dayTotals } from "@/lib/selectors";
import { formatDuration } from "@/lib/time";

export function ShareCardWidget({ today }: { today: string }) {
  const openShare = useUi((s) => s.openShare);
  const active = useActiveSession();
  const now = useNow(!!active, 5000);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);

  const totals = useMemo(() => dayTotals(tasks, sessions, now), [tasks, sessions, now]);
  const todayMs = totals.get(today) ?? 0;

  // Calculate this month's total
  const monthPrefix = today.slice(0, 7); // "YYYY-MM"
  const monthName = useMemo(() => {
    return new Date().toLocaleDateString([], { month: "short" });
  }, []);

  const monthMs = useMemo(() => {
    let sum = 0;
    for (const [date, ms] of totals.entries()) {
      if (date.startsWith(monthPrefix) && date <= today) {
        sum += ms;
      }
    }
    return sum;
  }, [totals, monthPrefix, today]);

  const todaysTasks = tasks.filter((t) => t.date === today);
  const completedToday = todaysTasks.filter((t) => t.done).length;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-card via-card to-card-2 p-4 shadow-sm transition-all hover:border-accent/40">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-indigo-500/10 blur-2xl" />

      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
            <Share2 size={13} />
          </span>
          <div>
            <h3 className="text-xs font-bold text-ink flex items-center gap-1.5">
              Share Progress
              <span className="rounded bg-accent-soft px-1.5 py-0.2 text-[10px] font-bold text-accent uppercase tracking-wide">
                New
              </span>
            </h3>
            <p className="text-[11px] text-muted">Generate graphics for socials & friends</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="my-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-line bg-card/60 p-2.5 backdrop-blur-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
            <Calendar size={11} className="text-blue-500" /> Today
          </span>
          <p className="mt-1 text-sm font-extrabold text-ink tnum">
            {formatDuration(todayMs)}
          </p>
          <p className="text-[10px] text-muted truncate">
            {completedToday}/{todaysTasks.length} tasks done
          </p>
        </div>

        <div className="rounded-xl border border-line bg-card/60 p-2.5 backdrop-blur-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
            <Trophy size={11} className="text-amber-500" /> {monthName} Total
          </span>
          <p className="mt-1 text-sm font-extrabold text-ink tnum">
            {formatDuration(monthMs)}
          </p>
          <p className="text-[10px] text-muted truncate">
            Monthly progress
          </p>
        </div>
      </div>

      {/* Launch Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => openShare(today, "day")}
          className="flex items-center justify-center gap-1 rounded-xl border border-line bg-card py-2 text-xs font-bold text-ink shadow-sm transition hover:bg-card-2 hover:border-line-2 active:scale-95"
        >
          <span>Today&apos;s Card</span>
        </button>

        <button
          type="button"
          onClick={() => openShare(today, "month")}
          className="flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:brightness-110 active:scale-95"
        >
          <Sparkles size={12} />
          <span>Monthly Card</span>
        </button>
      </div>
    </div>
  );
}
