"use client";

import { ClientOnly } from "@/components/ClientOnly";
import Link from "next/link";
import { BarChart3, CheckCircle2, Clock3, Hourglass, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/hooks";
import { categoryTotals, dayTotals, sessionMs, sessionsByTask, streaks, taskMs } from "@/lib/selectors";
import { addDays, formatDuration, formatHours, parseDayKey } from "@/lib/time";
import { DIFFICULTY, HEAT, heatLevel, solid } from "@/lib/colors";
import { CategoryIcon } from "@/lib/icons";
import type { Difficulty, Session, Task } from "@/lib/types";
import { DayBreakdown } from "@/components/DayBreakdown";
import { StatCard } from "@/components/StatCard";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui";

const RANGES = [
  { key: 7, label: "7D" },
  { key: 30, label: "30D" },
  { key: 90, label: "90D" },
  { key: 0, label: "All" },
] as const;

function StatsPage() {
  const today = useToday();
  const [range, setRange] = useState<number>(30);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const categories = useStore((s) => s.categories);
  const settings = useStore((s) => s.settings);
  // Insights are a snapshot; a running timer doesn't need second-level updates here.
  const [now] = useState(() => Date.now());

  const totals = useMemo(() => dayTotals(tasks, sessions, now), [tasks, sessions, now]);
  const firstDay = useMemo(() => tasks.map((t) => t.date).sort()[0] ?? today, [tasks, today]);

  const days = useMemo(() => {
    const count =
      range ||
      Math.max(1, Math.round((parseDayKey(today).getTime() - parseDayKey(firstDay).getTime()) / 86400000) + 1);
    return Array.from({ length: count }, (_, i) => addDays(today, i - count + 1));
  }, [range, today, firstDay]);
  const daySet = useMemo(() => new Set(days), [days]);

  const rangeTasks = tasks.filter((t) => daySet.has(t.date));
  const rangeTaskIds = new Set(rangeTasks.map((t) => t.id));
  const rangeSessions = sessions.filter((s) => rangeTaskIds.has(s.taskId));
  const totalMs = days.reduce((s, d) => s + (totals.get(d) ?? 0), 0);
  const activeDays = days.filter((d) => (totals.get(d) ?? 0) > 0).length;
  const avgSession = rangeSessions.length ? rangeSessions.reduce((m, s) => m + sessionMs(s, now), 0) / rangeSessions.length : 0;
  const catTotals = categoryTotals(tasks, sessions, daySet, now);
  const st = streaks(totals, settings.streakMinMinutes, today);

  const header = (
    <PageHeader
      title="Insights"
      subtitle="Where your time goes and how consistent you are."
      actions={
        <div className="flex rounded-lg border border-line bg-card-2 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                range === r.key ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      }
    />
  );

  if (sessions.length === 0) {
    return (
      <>
        {header}
        <div className="card">
          <EmptyState icon={BarChart3} color="#8b5cf6" title="No data yet" text="Track a few sessions on the Today page and your insights will appear here." />
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={Clock3} color="#3b82f6" label="Total focus" value={`${formatHours(totalMs)}h`} sub={`${activeDays} active days`} />
          <StatCard
            icon={TrendingUp}
            color="#8b5cf6"
            label="Daily average"
            value={formatDuration(activeDays ? totalMs / activeDays : 0)}
            sub="On active days"
          />
          <StatCard
            icon={CheckCircle2}
            color="#10b981"
            label="Tasks completed"
            value={String(rangeTasks.filter((t) => t.done).length)}
            sub={`of ${rangeTasks.length} logged`}
          />
          <StatCard icon={Hourglass} color="#f97316" label="Avg. session" value={formatDuration(avgSession)} sub={`${rangeSessions.length} sessions`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <DailyBars days={days} tasks={rangeTasks} sessions={rangeSessions} now={now} goalMinutes={settings.dailyGoalMinutes} />
          <section className="card p-4">
            <SectionTitle>Time by category</SectionTitle>
            <DayBreakdown totals={catTotals} categories={categories} />
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <HourChart sessions={rangeSessions} now={now} />
          <TopTasks tasks={rangeTasks} sessions={rangeSessions} now={now} />
        </div>

        <YearHeatmap totals={totals} today={today} goalMinutes={settings.dailyGoalMinutes} best={st.best} current={st.current} />
      </div>
    </>
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
  tasks: Task[];
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
  const fmt = (d: string) => parseDayKey(d).toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <section className="card p-4">
      <SectionTitle right={`Dashed line = ${bucket > 1 ? "weekly" : "daily"} goal`}>
        {bucket > 1 ? "Weekly" : "Daily"} focus
      </SectionTitle>
      <div className="relative mt-2 flex h-52 items-end gap-[3px]">
        {[0.25, 0.5, 0.75].map((f) => (
          <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-line" style={{ bottom: `${f * 100}%` }} />
        ))}
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-accent/70"
          style={{ bottom: `${(goalMs / max) * 100}%` }}
        />
        {data.map((d) => (
          <div key={d.label} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className="flex flex-col-reverse overflow-hidden rounded-t-[4px] transition-[height] duration-500"
              style={{ height: `${(d.total / max) * 100}%` }}
            >
              {categories
                .filter((c) => d.perCat.get(c.id))
                .map((c) => (
                  <div key={c.id} style={{ height: `${((d.perCat.get(c.id) ?? 0) / d.total) * 100}%`, background: solid(c.color) }} />
                ))}
            </div>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-bg shadow group-hover:block">
              {fmt(d.label)} · {formatDuration(d.total)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted">
        <span>{fmt(data[0].label)}</span>
        <span>{fmt(days.at(-1)!)}</span>
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
  const period = peak < 12 ? "mornings" : peak < 18 ? "afternoons" : "evenings";

  return (
    <section className="card p-4">
      <SectionTitle right={`Peak ${label(peak)}`}>Focus by hour</SectionTitle>
      <p className="-mt-1 mb-4 text-xs text-muted">You do your most focused work in the {period}.</p>
      <div className="flex h-28 items-end gap-[3px]">
        {hours.map((ms, h) => (
          <div
            key={h}
            title={`${label(h)}: ${formatDuration(ms)}`}
            className="flex-1 rounded-t-[3px] transition-[height] duration-500"
            style={{
              height: `${Math.max(3, (ms / max) * 100)}%`,
              background: h === peak ? "#8b5cf6" : "color-mix(in srgb, #8b5cf6 28%, var(--card))",
            }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted">
        <span>12am</span>
        <span>6am</span>
        <span>12pm</span>
        <span>6pm</span>
        <span>11pm</span>
      </div>
    </section>
  );
}

function TopTasks({ tasks, sessions, now }: { tasks: Task[]; sessions: Session[]; now: number }) {
  const categories = useStore((s) => s.categories);
  const byTask = sessionsByTask(sessions);
  const top = tasks
    .map((t) => ({ t, ms: taskMs(t.id, byTask, now) }))
    .filter((x) => x.ms > 0)
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 6);
  const maxMs = top[0]?.ms ?? 1;
  const diffs = (Object.keys(DIFFICULTY) as Difficulty[]).map((d) => ({
    d,
    n: tasks.filter((t) => t.difficulty === d && t.done).length,
  }));

  return (
    <section className="card p-4">
      <SectionTitle>Most time spent</SectionTitle>
      <ul className="flex flex-col gap-2.5">
        {top.map(({ t, ms }) => {
          const c = categories.find((x) => x.id === t.categoryId);
          return (
            <li key={t.id} className="flex items-center gap-2.5 text-sm">
              {c && <CategoryIcon icon={c.icon} color={c.color} size="xs" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.title}</p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-card-2">
                  <div className="h-full rounded-full" style={{ width: `${(ms / maxMs) * 100}%`, background: c ? solid(c.color) : "var(--accent)" }} />
                </div>
              </div>
              <span className="w-14 text-right font-mono text-xs text-ink-2 tnum">{formatDuration(ms)}</span>
            </li>
          );
        })}
      </ul>
      {diffs.some((d) => d.n) && (
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
          {diffs.map(({ d, n }) => (
            <div key={d} className="rounded-lg border border-line px-3 py-2">
              <p className="text-lg font-semibold tnum" style={{ color: DIFFICULTY[d].color }}>
                {n}
              </p>
              <p className="text-[11px] text-muted">{DIFFICULTY[d].label} solved</p>
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
    <section className="card p-4">
      <SectionTitle right={`${formatHours(yearMs)}h total · current streak ${current} · best ${best}`}>Last 12 months</SectionTitle>
      <div className="no-scrollbar overflow-x-auto">
        <div className="flex w-max gap-[3px]">
          {weeks.map((week, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {week.map((d) =>
                d > today ? (
                  <span key={d} className="h-3 w-3" />
                ) : (
                  <Link
                    key={d}
                    href={`/day/${d}`}
                    title={`${d}: ${formatDuration(totals.get(d) ?? 0)}`}
                    className={`h-3 w-3 rounded-[3px] hover:ring-1 hover:ring-ink/40 ${d === today ? "ring-1 ring-accent" : ""}`}
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
