"use client";

import { ClientOnly } from "@/components/ClientOnly";
import Link from "next/link";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/hooks";
import { categoryTotals, dayTotals, sessionMs, sessionsByTask, streaks, taskMs } from "@/lib/selectors";
import { addDays, formatDuration, formatHours, parseDayKey } from "@/lib/time";
import { HEAT, heatLevel, solid } from "@/lib/colors";
import type { Session } from "@/lib/types";
import { DayBreakdown } from "@/components/DayBreakdown";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/ui";

const RANGES = [
  { key: 7, label: "7 days" },
  { key: 30, label: "30 days" },
  { key: 90, label: "90 days" },
  { key: 0, label: "All time" },
] as const;

function StatsPage() {
  const today = useToday();
  const [range, setRange] = useState<number>(7);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const categories = useStore((s) => s.categories);
  const settings = useStore((s) => s.settings);
  // Stats are a snapshot; a running timer doesn't need second-level updates here.
  const [now] = useState(() => Date.now());

  const totals = useMemo(() => dayTotals(tasks, sessions, now), [tasks, sessions, now]);
  const firstDay = useMemo(() => tasks.map((t) => t.date).sort()[0] ?? today, [tasks, today]);

  const days = useMemo(() => {
    const count = range || Math.max(1, Math.round((parseDayKey(today).getTime() - parseDayKey(firstDay).getTime()) / 86400000) + 1);
    return Array.from({ length: count }, (_, i) => addDays(today, i - count + 1));
  }, [range, today, firstDay]);
  const daySet = useMemo(() => new Set(days), [days]);

  const rangeTasks = tasks.filter((t) => daySet.has(t.date));
  const rangeTaskIds = new Set(rangeTasks.map((t) => t.id));
  const rangeSessions = sessions.filter((s) => rangeTaskIds.has(s.taskId));
  const totalMs = days.reduce((s, d) => s + (totals.get(d) ?? 0), 0);
  const activeDays = days.filter((d) => (totals.get(d) ?? 0) > 0).length;
  const longest = rangeSessions.reduce((m, s) => Math.max(m, sessionMs(s, now)), 0);
  const catTotals = categoryTotals(tasks, sessions, daySet, now);
  const st = streaks(totals, settings.streakMinMinutes, today);

  if (sessions.length === 0) {
    return (
      <div className="card">
        <EmptyState emoji="📊" title="No stats yet" text="Track a few sessions on the Today page and your charts will bloom here." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 font-display text-3xl font-bold">Your stats ✨</h1>
        <div className="flex rounded-full border-2 border-line bg-card p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`relative rounded-full px-3 py-1 text-sm font-bold ${range === r.key ? "text-bg" : "text-muted"}`}
            >
              {range === r.key && <motion.span layoutId="range-pill" className="absolute inset-0 rounded-full bg-ink" />}
              <span className="relative">{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard emoji="⏱️" label="Total focus" value={`${formatHours(totalMs)}h`} color="#4d96ff" />
        <StatCard emoji="📈" label="Avg per active day" value={formatDuration(activeDays ? totalMs / activeDays : 0)} color="#9b5de5" />
        <StatCard emoji="✅" label="Tasks finished" value={String(rangeTasks.filter((t) => t.done).length)} color="#7bd389" />
        <StatCard emoji="🧘" label="Longest session" value={formatDuration(longest)} color="#f15bb5" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <DailyBars days={days} tasks={rangeTasks} sessions={rangeSessions} now={now} goalMinutes={settings.dailyGoalMinutes} />
        <section className="card p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Where the time went</h2>
          <DayBreakdown totals={catTotals} categories={categories} />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <HourChart sessions={rangeSessions} now={now} />
        <TopTasks tasks={rangeTasks} sessions={rangeSessions} now={now} />
      </div>

      <YearHeatmap totals={totals} today={today} goalMinutes={settings.dailyGoalMinutes} best={st.best} current={st.current} />
    </div>
  );
}

function DailyBars({
  days,
  tasks,
  sessions,
  now,
  goalMinutes,
}: {
  days: string[];
  tasks: { id: string; date: string; categoryId: string }[];
  sessions: Session[];
  now: number;
  goalMinutes: number;
}) {
  const categories = useStore((s) => s.categories);
  // Group into weeks when the range is long so bars stay readable
  const bucket = days.length > 45 ? 7 : 1;
  const buckets: string[][] = [];
  for (let i = 0; i < days.length; i += bucket) buckets.push(days.slice(i, i + bucket));

  const taskInfo = new Map(tasks.map((t) => [t.id, t]));
  const data = buckets.map((b) => {
    const set = new Set(b);
    const perCat = new Map<string, number>();
    for (const s of sessions) {
      const t = taskInfo.get(s.taskId);
      if (!t || !set.has(t.date)) continue;
      perCat.set(t.categoryId, (perCat.get(t.categoryId) ?? 0) + sessionMs(s, now));
    }
    return { label: b[0], perCat, total: Array.from(perCat.values()).reduce((a, x) => a + x, 0) };
  });
  const goalMs = goalMinutes * 60000 * bucket;
  const max = Math.max(goalMs, ...data.map((d) => d.total), 1);

  return (
    <section className="card p-5">
      <h2 className="mb-4 font-display text-lg font-semibold">{bucket > 1 ? "Weekly" : "Daily"} focus</h2>
      <div className="relative flex h-56 items-end gap-[3px]">
        <div
          className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-accent"
          style={{ bottom: `${(goalMs / max) * 100}%` }}
        >
          <span className="absolute -top-5 right-0 text-xs font-bold text-accent">goal</span>
        </div>
        {data.map((d, i) => (
          <div key={d.label} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${formatDuration(d.total)}`}>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.total / max) * 100}%` }}
              transition={{ delay: i * 0.01, type: "spring", stiffness: 120, damping: 18 }}
              className="flex flex-col-reverse overflow-hidden rounded-t-lg"
            >
              {categories
                .filter((c) => d.perCat.get(c.id))
                .map((c) => (
                  <div key={c.id} style={{ height: `${((d.perCat.get(c.id) ?? 0) / d.total) * 100}%`, background: solid(c.color) }} />
                ))}
            </motion.div>
            <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-0.5 text-xs font-bold text-bg group-hover:block">
              {formatDuration(d.total)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs font-bold text-muted">
        <span>{parseDayKey(data[0].label).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
        <span>{parseDayKey(days.at(-1)!).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
      </div>
    </section>
  );
}

function HourChart({ sessions, now }: { sessions: Session[]; now: number }) {
  const hours = Array<number>(24).fill(0);
  for (const s of sessions) {
    let t = s.start;
    const end = s.end ?? now;
    while (t < end) {
      const d = new Date(t);
      const next = new Date(d);
      next.setHours(d.getHours() + 1, 0, 0, 0);
      const chunkEnd = Math.min(end, next.getTime());
      hours[d.getHours()] += chunkEnd - t;
      t = chunkEnd;
    }
  }
  const max = Math.max(...hours, 1);
  const peak = hours.indexOf(Math.max(...hours));
  const label = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

  return (
    <section className="card p-5">
      <h2 className="font-display text-lg font-semibold">When you focus</h2>
      <p className="mb-4 text-sm font-semibold text-muted">
        Peak hour: <b className="text-ink">{label(peak)}</b>{" "}
        {peak < 12 ? "🌅 morning person!" : peak < 18 ? "☀️ afternoon grinder" : "🦉 night owl"}
      </p>
      <div className="flex h-32 items-end gap-[3px]">
        {hours.map((ms, h) => (
          <motion.div
            key={h}
            title={`${label(h)}: ${formatDuration(ms)}`}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(3, (ms / max) * 100)}%` }}
            className="flex-1 rounded-t-md"
            style={{ background: h === peak ? "var(--accent)" : "color-mix(in oklab, var(--accent) 35%, var(--card-2))" }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs font-bold text-muted">
        <span>12am</span>
        <span>6am</span>
        <span>12pm</span>
        <span>6pm</span>
        <span>11pm</span>
      </div>
    </section>
  );
}

function TopTasks({ tasks, sessions, now }: { tasks: { id: string; title: string; categoryId: string; difficulty: string | null; done: boolean }[]; sessions: Session[]; now: number }) {
  const categories = useStore((s) => s.categories);
  const byTask = sessionsByTask(sessions);
  const top = tasks
    .map((t) => ({ t, ms: taskMs(t.id, byTask, now) }))
    .filter((x) => x.ms > 0)
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 6);
  const diffs = (["easy", "medium", "hard"] as const).map((d) => ({
    d,
    n: tasks.filter((t) => t.difficulty === d && t.done).length,
  }));

  return (
    <section className="card p-5">
      <h2 className="mb-3 font-display text-lg font-semibold">Biggest time sinks</h2>
      <ul className="flex flex-col gap-2">
        {top.map(({ t, ms }, i) => {
          const c = categories.find((x) => x.id === t.categoryId);
          return (
            <li key={t.id} className="flex items-center gap-2 font-semibold">
              <span className="w-5 text-center font-display text-muted">{i + 1}</span>
              <span className="grid h-7 w-7 place-items-center rounded-lg text-sm" style={{ background: c ? solid(c.color) : undefined }}>
                {c?.emoji}
              </span>
              <span className="flex-1 truncate">{t.title}</span>
              <span className="font-display tabular-nums">{formatDuration(ms)}</span>
            </li>
          );
        })}
      </ul>
      {diffs.some((d) => d.n) && (
        <div className="mt-4 flex gap-2 border-t-2 border-soft-line pt-4">
          {diffs.map(({ d, n }) => (
            <div key={d} className="flex-1 rounded-2xl border-2 border-line p-2 text-center text-[#2b2240]" style={{ background: { easy: "#7bd389", medium: "#f7c531", hard: "#ff6b6b" }[d] }}>
              <p className="font-display text-2xl font-bold">{n}</p>
              <p className="text-xs font-bold capitalize">{d} solved</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function YearHeatmap({ totals, today, goalMinutes, best, current }: { totals: Map<string, number>; today: string; goalMinutes: number; best: number; current: number }) {
  // 53 weeks ending this week, Monday-first columns
  const todayDate = parseDayKey(today);
  const endOffset = 6 - ((todayDate.getDay() + 6) % 7);
  const end = addDays(today, endOffset);
  const weeks = Array.from({ length: 53 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(end, -(52 - w) * 7 - (6 - d))),
  );
  const yearMs = weeks.flat().reduce((s, d) => s + (d <= today ? totals.get(d) ?? 0 : 0), 0);

  return (
    <section className="card p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Last 12 months</h2>
        <p className="text-sm font-bold text-muted">
          {formatHours(yearMs)}h total · 🔥 {current} current · 🏆 {best} best
        </p>
      </div>
      <div className="no-scrollbar overflow-x-auto">
        <div className="flex w-max gap-[3px]">
          {weeks.map((week, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {week.map((d) =>
                d > today ? (
                  <span key={d} className="h-3.5 w-3.5" />
                ) : (
                  <Link
                    key={d}
                    href={`/day/${d}`}
                    title={`${d}: ${formatDuration(totals.get(d) ?? 0)}`}
                    className={`h-3.5 w-3.5 rounded-[4px] transition-transform hover:scale-150 ${d === today ? "ring-2 ring-line" : ""}`}
                    style={{ background: HEAT[heatLevel(totals.get(d) ?? 0, goalMinutes)] }}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Page() {
  return (
    <ClientOnly>
      <StatsPage />
    </ClientOnly>
  );
}
