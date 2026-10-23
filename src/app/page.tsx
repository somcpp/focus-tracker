"use client";

import { ClientOnly } from "@/components/ClientOnly";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Check, History, MoonStar, Pause, Play } from "lucide-react";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useActiveSession, useNow, useToday } from "@/lib/hooks";
import { categoryTotals, dayTotals, sessionsByTask, streaks, taskMs } from "@/lib/selectors";
import { addDays, formatClock, formatDuration, greeting, parseDayKey, prettyDate } from "@/lib/time";
import { HEAT, heatLevel, solid } from "@/lib/colors";
import { DayBoard } from "@/components/DayBoard";
import { DayBreakdown } from "@/components/DayBreakdown";
import { ProgressRing } from "@/components/ProgressRing";
import { Button, toast } from "@/components/ui";

function TodayPage() {
  const today = useToday();
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-5">
        <Hero today={today} />
        <CarryOver today={today} />
        <YesterdayPlan today={today} />
        <DayBoard date={today} />
      </div>
      <aside className="flex flex-col gap-5">
        <SideStats today={today} />
      </aside>
    </div>
  );
}

function Hero({ today }: { today: string }) {
  const active = useActiveSession();
  const now = useNow(!!active);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const categories = useStore((s) => s.categories);
  const settings = useStore((s) => s.settings);
  const { startTask, pauseActive, finishTask } = useStore.getState();

  const todayMs = dayTotals(tasks, sessions, now).get(today) ?? 0;
  const goalMs = settings.dailyGoalMinutes * 60000;
  const task = active ? tasks.find((t) => t.id === active.taskId) : undefined;
  const cat = task ? categories.find((c) => c.id === task.categoryId) : undefined;
  const byTask = useMemo(() => sessionsByTask(sessions), [sessions]);
  const taskTotal = task ? taskMs(task.id, byTask, now) : 0;

  // Last paused (unfinished) task, offered as a quick resume
  const last = !active
    ? [...sessions]
        .sort((a, b) => b.start - a.start)
        .map((s) => tasks.find((t) => t.id === s.taskId))
        .find((t) => t && !t.done && t.date === today)
    : undefined;

  return (
    <section className="card relative overflow-hidden p-5 md:p-6">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full opacity-30 blur-2xl"
        style={{ background: cat ? solid(cat.color) : "var(--accent)" }}
      />
      <div className="relative flex flex-col items-center gap-5 sm:flex-row">
        <ProgressRing value={todayMs / goalMs} color={todayMs >= goalMs ? "#45c46a" : "var(--accent)"}>
          <div>
            <p className="font-display text-2xl font-bold tabular-nums">{formatDuration(todayMs)}</p>
            <p className="text-xs font-bold text-muted">of {formatDuration(goalMs)}</p>
          </div>
        </ProgressRing>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="font-semibold text-muted">
            {greeting()}
            {settings.name ? `, ${settings.name}` : ""} 👋 · {prettyDate(today)}
          </p>

          {task && cat ? (
            <>
              <p className="mt-1 flex items-center justify-center gap-2 text-sm font-bold sm:justify-start" style={{ color: solid(cat.color) }}>
                <span className="h-2.5 w-2.5 animate-pulse rounded-full" style={{ background: solid(cat.color) }} />
                Now tracking · {cat.emoji} {cat.name}
              </p>
              <h1 className="truncate font-display text-3xl font-bold md:text-4xl">{task.title}</h1>
              <motion.p
                key={Math.floor(taskTotal / 1000)}
                initial={{ scale: 1.04 }}
                animate={{ scale: 1 }}
                className="font-display text-5xl font-bold tabular-nums md:text-6xl"
              >
                {formatClock(taskTotal)}
              </motion.p>
              <div className="mt-3 flex justify-center gap-2 sm:justify-start">
                <Button variant="sun" onClick={() => pauseActive()}>
                  <Pause size={18} className="fill-current" /> Pause
                </Button>
                <Button
                  variant="mint"
                  onClick={() => {
                    finishTask(task.id);
                    toast({ emoji: "✅", text: `Finished "${task.title}"` });
                  }}
                >
                  <Check size={18} strokeWidth={3} /> Finish
                </Button>
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-1 font-display text-3xl font-bold md:text-4xl">
                {todayMs === 0 ? "What are we grinding today?" : "Taking a breather ☕"}
              </h1>
              <p className="mt-1 text-muted">
                {todayMs >= goalMs
                  ? "Goal done for today. Anything extra is a bonus 🌟"
                  : `${formatDuration(Math.max(0, goalMs - todayMs))} to go for today's goal.`}
              </p>
              {last && (
                <Button className="mt-3" onClick={() => startTask(last.id)}>
                  <Play size={16} className="fill-current" /> Resume “{last.title}”
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
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
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card flex flex-wrap items-center gap-3 bg-card-2 px-4 py-3"
    >
      <History className="text-accent" />
      <p className="flex-1 font-semibold">
        {prev.count} unfinished task{prev.count > 1 ? "s" : ""} from{" "}
        {prev.date === addDays(today, -1) ? "yesterday" : prettyDate(prev.date, { month: "short", day: "numeric" })}.
      </p>
      <Button
        variant="plain"
        className="!py-1.5"
        onClick={() => {
          const n = carryOver(prev.date, today);
          toast({ emoji: "📦", text: `Brought over ${n} task${n > 1 ? "s" : ""}` });
        }}
      >
        Bring them over
      </Button>
      <Button
        variant="ghost"
        className="!py-1.5"
        onClick={() => {
          // mark as handled without copying
          const st = useStore.getState();
          tasks
            .filter((t) => t.date === prev.date && !t.done && !t.carriedTo)
            .forEach((t) => st.updateTask(t.id, { carriedTo: "dismissed" }));
        }}
      >
        Dismiss
      </Button>
    </motion.div>
  );
}

function YesterdayPlan({ today }: { today: string }) {
  const plan = useStore((s) => s.journals[addDays(today, -1)]?.plan?.trim());
  if (!plan) return null;
  return (
    <div className="card relative overflow-hidden bg-[#fff4c2] px-5 py-4 text-[#2b2240] dark:bg-[#3d3520] dark:text-[#f4efff]">
      <p className="mb-1 flex items-center gap-1.5 font-display font-semibold">📌 Yesterday-you planned:</p>
      <p className="whitespace-pre-wrap leading-relaxed">{plan}</p>
    </div>
  );
}

function SideStats({ today }: { today: string }) {
  const active = useActiveSession();
  const now = useNow(!!active, 5000);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const categories = useStore((s) => s.categories);
  const settings = useStore((s) => s.settings);

  const totals = dayTotals(tasks, sessions, now);
  const catTotals = categoryTotals(tasks, sessions, new Set([today]), now);
  const st = streaks(totals, settings.streakMinMinutes, today);
  const todays = tasks.filter((t) => t.date === today);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  return (
    <>
      <div className="card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Today&apos;s split</h2>
        <DayBreakdown totals={catTotals} categories={categories} />
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-2xl bg-card-2 p-2">
            <p className="font-display text-2xl font-bold">{todays.filter((t) => t.done).length}</p>
            <p className="text-xs font-bold text-muted">tasks done</p>
          </div>
          <div className="rounded-2xl bg-card-2 p-2">
            <p className="font-display text-2xl font-bold">
              {sessions.filter((s) => todays.some((t) => t.id === s.taskId)).length}
            </p>
            <p className="text-xs font-bold text-muted">sessions</p>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">This week</h2>
          <span className="text-sm font-bold text-muted">🔥 {st.current} · best {st.best}</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((d) => {
            const ms = totals.get(d) ?? 0;
            return (
              <Link key={d} href={`/day/${d}`} className="flex flex-col items-center gap-1" title={formatDuration(ms)}>
                <span
                  className={`aspect-square w-full rounded-xl border-2 ${d === today ? "border-line" : "border-transparent"}`}
                  style={{ background: HEAT[heatLevel(ms, settings.dailyGoalMinutes)] }}
                />
                <span className="text-[11px] font-bold text-muted">
                  {parseDayKey(d).toLocaleDateString([], { weekday: "narrow" })}
                </span>
              </Link>
            );
          })}
        </div>
        {!st.todayHit && st.current > 0 && (
          <p className="mt-3 rounded-xl bg-card-2 px-3 py-2 text-sm font-semibold">
            ⚠️ {formatDuration(settings.streakMinMinutes * 60000 - (totals.get(today) ?? 0))} more to keep your streak!
          </p>
        )}
      </div>

      <Link href={`/day/${today}`}>
        <motion.div
          whileHover={{ y: -3 }}
          className="card flex items-center gap-3 bg-ink p-5 text-bg"
        >
          <MoonStar className="shrink-0" />
          <div className="flex-1">
            <p className="font-display text-lg font-semibold">Wrap up the day</p>
            <p className="text-sm opacity-70">Summary, journal & plan tomorrow</p>
          </div>
          <ArrowRight />
        </motion.div>
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
