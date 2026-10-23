"use client";

import { ClientOnly } from "@/components/ClientOnly";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, Clock3, Flame, History, NotebookPen, Pause, Pin, Play, Target } from "lucide-react";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useActiveSession, useNow, useToday } from "@/lib/hooks";
import { categoryTotals, dayTotals, sessionsByTask, streaks, taskMs } from "@/lib/selectors";
import { addDays, formatClock, formatDuration, greeting, parseDayKey, prettyDate } from "@/lib/time";
import { HEAT, heatLevel, solid, tint } from "@/lib/colors";
import { CategoryIcon } from "@/lib/icons";
import { DayBoard } from "@/components/DayBoard";
import { DayBreakdown } from "@/components/DayBreakdown";
import { ProgressRing } from "@/components/ProgressRing";
import { StatCard } from "@/components/StatCard";
import { Button, PageHeader, SectionTitle, toast } from "@/components/ui";

function TodayPage() {
  const today = useToday();
  const name = useStore((s) => s.settings.name);
  return (
    <>
      <PageHeader
        title={`${greeting()}${name ? `, ${name}` : ""}`}
        subtitle={prettyDate(today, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        actions={
          <Link href={`/day/${today}`}>
            <Button variant="secondary">
              <NotebookPen size={15} /> Daily review
            </Button>
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <FocusCard today={today} />
          <KpiRow today={today} />
          <CarryOver today={today} />
          <YesterdayPlan today={today} />
          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Today&apos;s work</h2>
          </div>
          <DayBoard date={today} />
        </div>
        <aside className="flex flex-col gap-4">
          <SideStats today={today} />
        </aside>
      </div>
    </>
  );
}

function FocusCard({ today }: { today: string }) {
  const active = useActiveSession();
  const now = useNow(!!active);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const categories = useStore((s) => s.categories);
  const goalMinutes = useStore((s) => s.settings.dailyGoalMinutes);
  const { startTask, pauseActive, finishTask } = useStore.getState();

  const todayMs = dayTotals(tasks, sessions, now).get(today) ?? 0;
  const goalMs = goalMinutes * 60000;
  const task = active ? tasks.find((t) => t.id === active.taskId) : undefined;
  const cat = task ? categories.find((c) => c.id === task.categoryId) : undefined;
  const byTask = useMemo(() => sessionsByTask(sessions), [sessions]);
  const taskTotal = task ? taskMs(task.id, byTask, now) : 0;

  // Most recently tracked unfinished task, offered as a quick resume
  const last = !active
    ? [...sessions]
        .sort((a, b) => b.start - a.start)
        .map((s) => tasks.find((t) => t.id === s.taskId))
        .find((t) => t && !t.done && t.date === today)
    : undefined;
  const lastCat = last ? categories.find((c) => c.id === last.categoryId) : undefined;
  const goalHit = todayMs >= goalMs;

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col items-stretch sm:flex-row">
        <div
          className="relative flex min-w-0 flex-1 flex-col justify-center gap-1 p-5 md:p-6"
          style={cat ? { background: `linear-gradient(135deg, ${tint(cat.color, 9)}, var(--card) 70%)` } : undefined}
        >
          {task && cat ? (
            <>
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: solid(cat.color) }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: solid(cat.color) }} />
                </span>
                <span style={{ color: solid(cat.color) }}>Tracking</span>
                <span className="text-muted">· {cat.name}</span>
              </div>
              <h2 className="truncate text-xl font-semibold tracking-tight">{task.title}</h2>
              <p className="font-mono text-4xl font-semibold tracking-tight tnum md:text-5xl">{formatClock(taskTotal)}</p>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" onClick={() => pauseActive()}>
                  <Pause size={15} className="fill-current" /> Pause
                </Button>
                <Button
                  variant="success"
                  onClick={() => {
                    finishTask(task.id);
                    toast({ tone: "success", text: `Completed “${task.title}”` });
                  }}
                >
                  <Check size={15} strokeWidth={3} /> Complete
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-medium text-muted">No timer running</p>
              <h2 className="text-xl font-semibold tracking-tight">
                {todayMs === 0 ? "Ready when you are" : goalHit ? "Daily goal reached" : "Paused"}
              </h2>
              <p className="text-sm text-muted">
                {todayMs === 0
                  ? "Add a task below and press play to start tracking."
                  : goalHit
                    ? "Everything from here is extra. Nice work."
                    : `${formatDuration(goalMs - todayMs)} left to reach today's goal.`}
              </p>
              {last && (
                <button
                  onClick={() => startTask(last.id)}
                  className="mt-3 flex w-fit items-center gap-3 rounded-xl border border-line bg-card py-2 pl-2 pr-4 text-left shadow-sm transition-colors hover:bg-subtle"
                >
                  {lastCat && <CategoryIcon icon={lastCat.icon} color={lastCat.color} size="sm" />}
                  <span className="min-w-0">
                    <span className="block text-[11px] text-muted">Resume</span>
                    <span className="block max-w-56 truncate text-sm font-medium">{last.title}</span>
                  </span>
                  <Play size={15} className="ml-2 fill-current text-accent" />
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex items-center justify-center gap-4 border-t border-line p-5 sm:border-l sm:border-t-0 md:px-8">
          <ProgressRing value={todayMs / goalMs} color={goalHit ? "#10b981" : "var(--accent)"}>
            <div>
              <p className="text-xl font-semibold tracking-tight tnum">{formatDuration(todayMs)}</p>
              <p className="text-[11px] text-muted">of {formatDuration(goalMs)}</p>
            </div>
          </ProgressRing>
        </div>
      </div>
    </section>
  );
}

function KpiRow({ today }: { today: string }) {
  const active = useActiveSession();
  const now = useNow(!!active, 5000);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const settings = useStore((s) => s.settings);
  const totals = dayTotals(tasks, sessions, now);
  const st = streaks(totals, settings.streakMinMinutes, today);
  const todays = tasks.filter((t) => t.date === today);
  const ids = new Set(todays.map((t) => t.id));
  const todaySessions = sessions.filter((s) => ids.has(s.taskId));
  const yesterday = totals.get(addDays(today, -1)) ?? 0;
  const todayMs = totals.get(today) ?? 0;
  const diff = todayMs - yesterday;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard
        icon={Clock3}
        color="#3b82f6"
        label="Focus time"
        value={formatDuration(todayMs)}
        sub={yesterday ? `${diff >= 0 ? "+" : "−"}${formatDuration(Math.abs(diff))} vs yesterday` : "Today"}
      />
      <StatCard
        icon={CheckCircle2}
        color="#10b981"
        label="Completed"
        value={`${todays.filter((t) => t.done).length}/${todays.length}`}
        sub="Tasks today"
      />
      <StatCard icon={Target} color="#8b5cf6" label="Sessions" value={String(todaySessions.length)} sub="Focus blocks" />
      <StatCard
        icon={Flame}
        color="#f97316"
        label="Streak"
        value={`${st.current} day${st.current === 1 ? "" : "s"}`}
        sub={st.todayHit || st.current === 0 ? `Best ${st.best}` : `${formatDuration(settings.streakMinMinutes * 60000 - todayMs)} to keep it`}
      />
    </div>
  );
}

function CarryOver({ today }: { today: string }) {
  const tasks = useStore((s) => s.tasks);
  const carryOver = useStore((s) => s.carryOver);
  // most recent earlier day with unfinished, not-yet-carried tasks
  const prev = useMemo(() => {
    const days = tasks.filter((t) => t.date < today && !t.done && !t.carriedTo).map((t) => t.date);
    if (!days.length) return null;
    const d = days.sort().at(-1)!;
    return { date: d, count: tasks.filter((t) => t.date === d && !t.done && !t.carriedTo).length };
  }, [tasks, today]);

  if (!prev) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-2.5 text-sm dark:border-blue-900/60 dark:bg-blue-950/30">
      <History size={16} className="text-blue-500" />
      <p className="flex-1">
        <span className="font-medium">
          {prev.count} unfinished task{prev.count > 1 ? "s" : ""}
        </span>{" "}
        <span className="text-muted">
          from {prev.date === addDays(today, -1) ? "yesterday" : prettyDate(prev.date, { month: "short", day: "numeric" })}
        </span>
      </p>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          const st = useStore.getState();
          tasks
            .filter((t) => t.date === prev.date && !t.done && !t.carriedTo)
            .forEach((t) => st.updateTask(t.id, { carriedTo: "dismissed" }));
        }}
      >
        Dismiss
      </Button>
      <Button
        size="sm"
        onClick={() => {
          const n = carryOver(prev.date, today);
          toast({ tone: "success", text: `Moved ${n} task${n > 1 ? "s" : ""} to today` });
        }}
      >
        Move to today
      </Button>
    </div>
  );
}

function YesterdayPlan({ today }: { today: string }) {
  const plan = useStore((s) => s.journals[addDays(today, -1)]?.plan?.trim());
  if (!plan) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
        <Pin size={13} /> Plan from yesterday
      </p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{plan}</p>
    </div>
  );
}

function SideStats({ today }: { today: string }) {
  const active = useActiveSession();
  const now = useNow(!!active, 5000);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const categories = useStore((s) => s.categories);
  const goalMinutes = useStore((s) => s.settings.dailyGoalMinutes);

  const totals = dayTotals(tasks, sessions, now);
  const catTotals = categoryTotals(tasks, sessions, new Set([today]), now);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const weekMs = week.reduce((s, d) => s + (totals.get(d) ?? 0), 0);
  const maxDay = Math.max(goalMinutes * 60000, ...week.map((d) => totals.get(d) ?? 0));

  return (
    <>
      <section className="card p-4">
        <SectionTitle>Time by category</SectionTitle>
        <DayBreakdown totals={catTotals} categories={categories} />
      </section>

      <section className="card p-4">
        <SectionTitle right={<span className="tnum">{formatDuration(weekMs)}</span>}>Last 7 days</SectionTitle>
        <div className="flex h-24 items-end gap-1.5">
          {week.map((d) => {
            const ms = totals.get(d) ?? 0;
            return (
              <Link key={d} href={`/day/${d}`} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={formatDuration(ms)}>
                <span
                  className="w-full rounded-md transition-opacity group-hover:opacity-80"
                  style={{
                    height: `${Math.max(4, (ms / maxDay) * 100)}%`,
                    background: d === today ? "var(--accent)" : HEAT[Math.max(1, heatLevel(ms, goalMinutes))],
                    opacity: ms === 0 ? 0.5 : 1,
                  }}
                />
                <span className={`text-[10px] font-medium ${d === today ? "text-ink" : "text-muted"}`}>
                  {parseDayKey(d).toLocaleDateString([], { weekday: "narrow" })}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <Link href={`/day/${today}`} className="card group flex items-center gap-3 p-4 transition-colors hover:bg-subtle">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-orange-500/12 text-orange-500">
          <NotebookPen size={17} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">End-of-day review</p>
          <p className="text-xs text-muted">Summary, journal and tomorrow&apos;s plan</p>
        </div>
        <ArrowRight size={16} className="text-muted transition-transform group-hover:translate-x-0.5" />
      </Link>
    </>
  );
}

export default function Page() {
  return (
    <ClientOnly>
      <TodayPage />
    </ClientOnly>
  );
}
