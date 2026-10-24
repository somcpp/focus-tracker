"use client";

import { ClientOnly } from "@/components/ClientOnly";
import Link from "next/link";
import { BarChart3, CheckCircle2, Clock3, Hourglass, Share2, Target, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/hooks";
import { categoryTotals, dayTotals, sessionMs, sessionsByTask, taskMs, titleKey } from "@/lib/selectors";
import { addDays, formatDuration, formatHours, parseDayKey } from "@/lib/time";
import { DIFFICULTY, solid } from "@/lib/colors";
import { CategoryIcon } from "@/lib/icons";
import { plainText } from "@/lib/links";
import { useUi } from "@/lib/ui-store";
import type { Category, Difficulty, Session, Task } from "@/lib/types";
import { DayBreakdown } from "@/components/DayBreakdown";
import { StatCard } from "@/components/StatCard";
import { RichText } from "@/components/RichText";
import { Button, EmptyState, PageHeader, SectionTitle } from "@/components/ui";

const RANGES = [
  { key: 7, label: "7D" },
  { key: 30, label: "30D" },
  { key: 90, label: "90D" },
  { key: 0, label: "All" },
] as const;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "▲ 18% vs prev 7 days" */
function trend(cur: number, prev: number, label: string): string | undefined {
  if (!prev) return cur ? `New vs ${label}` : undefined;
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return `Same as ${label}`;
  return `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs ${label}`;
}

function StatsPage() {
  const today = useToday();
  const openShare = useUi((s) => s.openShare);
  const [range, setRange] = useState<number>(30);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const categories = useStore((s) => s.categories);
  const settings = useStore((s) => s.settings);
  // Insights are a snapshot; a running timer doesn't need second-level updates here.
  const [now] = useState(() => Date.now());

  const totals = useMemo(() => dayTotals(tasks, sessions, now), [tasks, sessions, now]);
  const firstDay = useMemo(() => tasks.map((t) => t.date).sort()[0] ?? today, [tasks, today]);

  const count = useMemo(
    () => range || Math.max(1, Math.round((parseDayKey(today).getTime() - parseDayKey(firstDay).getTime()) / 86400000) + 1),
    [range, today, firstDay],
  );
  const days = useMemo(() => Array.from({ length: count }, (_, i) => addDays(today, i - count + 1)), [count, today]);
  const prevDays = useMemo(() => (range ? Array.from({ length: count }, (_, i) => addDays(today, i - 2 * count + 1)) : []), [range, count, today]);

  const summarize = (ds: string[]) => {
    const set = new Set(ds);
    const ts = tasks.filter((t) => set.has(t.date));
    const ids = new Set(ts.map((t) => t.id));
    const ss = sessions.filter((s) => ids.has(s.taskId));
    const total = ds.reduce((s, d) => s + (totals.get(d) ?? 0), 0);
    const active = ds.filter((d) => (totals.get(d) ?? 0) > 0).length;
    return {
      set,
      tasks: ts,
      sessions: ss,
      total,
      active,
      avg: active ? total / active : 0,
      done: ts.filter((t) => t.done).length,
      avgSession: ss.length ? ss.reduce((m, s) => m + sessionMs(s, now), 0) / ss.length : 0,
    };
  };
  const cur = summarize(days);
  const prev = range ? summarize(prevDays) : null;
  const prevLabel = `prev ${count} days`;
  const t = (a: number, b: number | undefined) => (prev && b !== undefined ? trend(a, b, prevLabel) : undefined);

  const header = (
    <PageHeader
      title="Insights"
      subtitle="Where your time goes, and whether you're trending up."
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => openShare(today)}>
            <Share2 size={14} className="text-accent" /> Share Card
          </Button>
          <div className="flex rounded-lg border border-line bg-card p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  range === r.key ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Clock3} color="#2f6bff" label="Total focus" value={`${formatHours(cur.total)}h`} sub={t(cur.total, prev?.total) ?? `${cur.active} active days`} />
          <StatCard icon={TrendingUp} color="#8b5cf6" label="Daily average" value={formatDuration(cur.avg)} sub={t(cur.avg, prev?.avg) ?? "On days you tracked"} />
          <StatCard icon={CheckCircle2} color="#12b76a" label="Tasks completed" value={String(cur.done)} sub={t(cur.done, prev?.done) ?? `of ${cur.tasks.length} logged`} />
          <StatCard icon={Hourglass} color="#f97316" label="Avg. session" value={formatDuration(cur.avgSession)} sub={t(cur.avgSession, prev?.avgSession) ?? `${cur.sessions.length} sessions`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <DailyBars days={days} tasks={cur.tasks} sessions={cur.sessions} now={now} goalMinutes={settings.dailyGoalMinutes} />
          <section className="card p-5">
            <SectionTitle>Time by category</SectionTitle>
            <DayBreakdown totals={categoryTotals(tasks, sessions, cur.set, now)} categories={categories} />
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Consistency days={days} totals={totals} goalMinutes={settings.dailyGoalMinutes} />
          <HourChart sessions={cur.sessions} now={now} />
        </div>

        <CategoryTrends days={days} tasks={cur.tasks} sessions={cur.sessions} now={now} categories={categories} prevTotals={prev ? categoryTotals(tasks, sessions, prev.set, now) : null} />

        <TopTasks tasks={cur.tasks} sessions={cur.sessions} now={now} />
      </div>
    </>
  );
}

/** Split days into buckets (weekly when the range is long) */
function bucketize(days: string[]) {
  const size = days.length > 45 ? 7 : 1;
  const out: string[][] = [];
  for (let i = 0; i < days.length; i += size) out.push(days.slice(i, i + size));
  return { size, buckets: out };
}

function DailyBars({ days, tasks, sessions, now, goalMinutes }: { days: string[]; tasks: Task[]; sessions: Session[]; now: number; goalMinutes: number }) {
  const categories = useStore((s) => s.categories);
  const { size, buckets } = bucketize(days);
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
  const goalMs = goalMinutes * 60000 * size;
  const max = Math.max(goalMs, ...data.map((d) => d.total), 1);
  const fmt = (d: string) => parseDayKey(d).toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <section className="card p-5">
      <SectionTitle right={`Dashed line = ${size > 1 ? "weekly" : "daily"} goal`}>{size > 1 ? "Weekly" : "Daily"} focus</SectionTitle>
      <div className="relative mt-2 flex h-52 items-end gap-[3px]">
        {[0.25, 0.5, 0.75].map((f) => (
          <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-line" style={{ bottom: `${f * 100}%` }} />
        ))}
        <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-accent/70" style={{ bottom: `${(goalMs / max) * 100}%` }} />
        {data.map((d) => (
          <div key={d.label} className="group relative flex h-full flex-1 flex-col justify-end">
            <div className="flex flex-col-reverse overflow-hidden rounded-t-[4px] transition-[height] duration-500" style={{ height: `${(d.total / max) * 100}%` }}>
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

/** Goal hit rate + average focus per weekday */
function Consistency({ days, totals, goalMinutes }: { days: string[]; totals: Map<string, number>; goalMinutes: number }) {
  const goalMs = goalMinutes * 60000;
  const hit = days.filter((d) => (totals.get(d) ?? 0) >= goalMs).length;
  const rate = days.length ? hit / days.length : 0;
  const sums = Array(7).fill(0);
  const counts = Array(7).fill(0);
  for (const d of days) {
    const wd = (parseDayKey(d).getDay() + 6) % 7;
    sums[wd] += totals.get(d) ?? 0;
    counts[wd]++;
  }
  const avgs = sums.map((s, i) => (counts[i] ? s / counts[i] : 0));
  const max = Math.max(...avgs, 1);
  const best = avgs.indexOf(Math.max(...avgs));

  return (
    <section className="card p-5">
      <SectionTitle>Consistency</SectionTitle>
      <div className="mb-5 flex items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/12 text-emerald-600">
          <Target size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            Hit your {formatDuration(goalMs)} goal on <span className="font-bold tnum">{hit}</span> of {days.length} days
          </p>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-emerald-500/12">
            <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-700" style={{ width: `${rate * 100}%` }} />
          </div>
        </div>
        <span className="text-xl font-bold text-emerald-600 tnum">{Math.round(rate * 100)}%</span>
      </div>
      <p className="mb-2 text-xs text-muted">
        Average focus by weekday · you focus most on <span className="font-semibold text-ink">{WEEKDAYS[best]}s</span>
      </p>
      <div className="flex h-24 items-end gap-2">
        {avgs.map((ms, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${WEEKDAYS[i]}: ${formatDuration(ms)} avg`}>
            <div
              className="w-full rounded-t-md transition-[height] duration-500"
              style={{ height: `${Math.max(4, (ms / max) * 100)}%`, background: i === best ? "#12b76a" : "color-mix(in srgb, #12b76a 25%, var(--card))" }}
            />
            <span className={`text-[11px] font-medium ${i === best ? "text-ink" : "text-muted"}`}>{WEEKDAYS[i]}</span>
          </div>
        ))}
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
    <section className="card p-5">
      <SectionTitle right={`Peak ${label(peak)}`}>Focus by hour</SectionTitle>
      <p className="-mt-1 mb-4 text-xs text-muted">You do your most focused work in the {period}.</p>
      <div className="flex h-28 items-end gap-[3px]">
        {hours.map((ms, h) => (
          <div
            key={h}
            title={`${label(h)}: ${formatDuration(ms)}`}
            className="flex-1 rounded-t-[3px] transition-[height] duration-500"
            style={{ height: `${Math.max(3, (ms / max) * 100)}%`, background: h === peak ? "#8b5cf6" : "color-mix(in srgb, #8b5cf6 28%, var(--card))" }}
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

/** One sparkline per category over the range, with change vs the previous period */
function CategoryTrends({
  days,
  tasks,
  sessions,
  now,
  categories,
  prevTotals,
}: {
  days: string[];
  tasks: Task[];
  sessions: Session[];
  now: number;
  categories: Category[];
  prevTotals: Map<string, number> | null;
}) {
  const { buckets } = bucketize(days);
  const bucketOf = new Map<string, number>();
  buckets.forEach((b, i) => b.forEach((d) => bucketOf.set(d, i)));
  const taskInfo = new Map(tasks.map((t) => [t.id, t]));
  const series = new Map<string, number[]>();
  for (const s of sessions) {
    const t = taskInfo.get(s.taskId);
    if (!t) continue;
    const arr = series.get(t.categoryId) ?? Array(buckets.length).fill(0);
    arr[bucketOf.get(t.date)!] += sessionMs(s, now);
    series.set(t.categoryId, arr);
  }
  const rows = categories
    .map((c) => ({ c, data: series.get(c.id) ?? [], total: (series.get(c.id) ?? []).reduce((a, b) => a + b, 0) }))
    .filter((r) => r.total > 0 || (prevTotals?.get(r.c.id) ?? 0) > 0)
    .sort((a, b) => b.total - a.total);
  if (!rows.length) return null;

  return (
    <section className="card p-5">
      <SectionTitle right={prevTotals ? "Change vs previous period" : undefined}>Category trends</SectionTitle>
      <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
        {rows.map(({ c, data, total }) => {
          const prev = prevTotals?.get(c.id) ?? 0;
          const pct = prev ? Math.round(((total - prev) / prev) * 100) : null;
          const max = Math.max(...data, 1);
          const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * 100},${30 - (v / max) * 26}`).join(" ");
          return (
            <Link key={c.id} href={`/categories/${c.id}`} className="flex items-center gap-3 rounded-xl p-1 hover:bg-subtle">
              <CategoryIcon icon={c.icon} color={c.color} size="sm" variant="solid" />
              <div className="w-24 min-w-0">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="text-xs text-muted tnum">{formatDuration(total)}</p>
              </div>
              <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-8 min-w-0 flex-1">
                <polyline points={`0,32 ${pts} 100,32`} fill={`color-mix(in srgb, ${solid(c.color)} 14%, transparent)`} stroke="none" />
                <polyline points={pts} fill="none" stroke={solid(c.color)} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              </svg>
              {pct !== null && (
                <span className={`w-14 text-right text-xs font-semibold tnum ${pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {pct >= 0 ? "▲" : "▼"} {Math.abs(pct)}%
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Tasks grouped by title across days, so a problem revisited 3 times shows once */
function TopTasks({ tasks, sessions, now }: { tasks: Task[]; sessions: Session[]; now: number }) {
  const categories = useStore((s) => s.categories);
  const openTask = useUi((s) => s.openTask);
  const byTask = sessionsByTask(sessions);
  const groups = new Map<string, { latest: Task; ms: number; days: Set<string>; done: boolean }>();
  for (const t of tasks) {
    const k = titleKey(t.title);
    const g = groups.get(k) ?? { latest: t, ms: 0, days: new Set<string>(), done: false };
    g.ms += taskMs(t.id, byTask, now);
    g.days.add(t.date);
    g.done ||= t.done;
    if (t.date >= g.latest.date) g.latest = t;
    groups.set(k, g);
  }
  const top = [...groups.values()].filter((g) => g.ms > 0).sort((a, b) => b.ms - a.ms).slice(0, 8);
  const maxMs = top[0]?.ms ?? 1;
  const diffs = (Object.keys(DIFFICULTY) as Difficulty[]).map((d) => ({
    d,
    n: [...groups.values()].filter((g) => g.latest.difficulty === d && g.done).length,
  }));

  return (
    <section className="card p-5">
      <SectionTitle>Most time spent</SectionTitle>
      <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
        {top.map(({ latest, ms, days }) => {
          const c = categories.find((x) => x.id === latest.categoryId);
          return (
            <div
              key={latest.id}
              role="button"
              tabIndex={0}
              onClick={() => openTask(latest.id)}
              onKeyDown={(e) => e.key === "Enter" && openTask(latest.id)}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg p-1 text-sm hover:bg-subtle"
              title={plainText(latest.title)}
            >
              {c && <CategoryIcon icon={c.icon} color={c.color} size="xs" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  <RichText text={latest.title} size="sm" />
                </p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-card-2">
                  <div className="h-full rounded-full" style={{ width: `${(ms / maxMs) * 100}%`, background: c ? solid(c.color) : "var(--accent)" }} />
                </div>
              </div>
              <span className="text-right text-[11px] text-muted">
                <span className="block font-mono text-xs text-ink-2 tnum">{formatDuration(ms)}</span>
                {days.size > 1 && `${days.size} days`}
              </span>
            </div>
          );
        })}
      </div>
      {diffs.some((d) => d.n) && (
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
          {diffs.map(({ d, n }) => (
            <div key={d} className="rounded-xl px-3 py-2" style={{ background: `color-mix(in srgb, ${DIFFICULTY[d].color} 9%, var(--card))` }}>
              <p className="text-lg font-bold tnum" style={{ color: DIFFICULTY[d].color }}>
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

export default function Page() {
  return (
    <ClientOnly>
      <StatsPage />
    </ClientOnly>
  );
}
