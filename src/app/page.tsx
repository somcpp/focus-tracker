"use client";

import { ClientOnly } from "@/components/ClientOnly";
import Link from "next/link";
import { CheckCircle2, Clock3, History, Layers, NotebookPen, Pin, Sun, Timer } from "lucide-react";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useActiveSession, useNow, useToday } from "@/lib/hooks";
import { categoryTotals, dayTotals } from "@/lib/selectors";
import { addDays, formatDuration, greeting, prettyDate } from "@/lib/time";
import { DayBoard } from "@/components/DayBoard";
import { DayBreakdown } from "@/components/DayBreakdown";
import { FocusTimer } from "@/components/FocusTimer";
import { MiniCalendar } from "@/components/MiniCalendar";
import { QuickAdd } from "@/components/QuickAdd";
import { StatCard } from "@/components/StatCard";
import { Button, SectionTitle, toast } from "@/components/ui";

const QUOTES = [
  "Progress over perfection.",
  "Small steps every day.",
  "Consistency beats intensity.",
  "Focus on the next hour, not the whole day.",
  "Done is better than perfect.",
  "One problem at a time.",
  "Show up, even when it's hard.",
];

function TodayPage() {
  const today = useToday();
  const name = useStore((s) => s.settings.name);
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight md:text-[32px]">
              {greeting()}
              {name ? `, ${name}` : ""}!
            </h1>
            <p className="mt-1 text-[15px] text-muted">Let&apos;s make today productive.</p>
          </div>
          <div className="text-right">
            <p className="text-[15px] font-medium text-ink-2">
              {prettyDate(today, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </p>
            <p className="mt-1 flex items-center justify-end gap-1.5 text-[13px] italic text-muted">
              <Sun size={15} className="text-amber-400" /> “{quote}”
            </p>
          </div>
        </header>

        <KpiRow today={today} />
        <CarryOver today={today} />
        <YesterdayPlan today={today} />
        <WorkHeader today={today} />
        <DayBoard date={today} />
      </div>

      <aside className="flex flex-col gap-5">
        <div className="card p-5">
          <FocusTimer today={today} />
        </div>
        <div className="card p-5">
          <CalendarWidget today={today} />
        </div>
        <div className="card p-5">
          <QuickAdd date={today} />
        </div>
        <SplitCard today={today} />
      </aside>
    </div>
  );
}

function useTodayData(today: string, interval = 5000) {
  const active = useActiveSession();
  const now = useNow(!!active, interval);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  return { now, tasks, sessions, totals: dayTotals(tasks, sessions, now), todays: tasks.filter((t) => t.date === today) };
}

function KpiRow({ today }: { today: string }) {
  const { totals, todays, sessions } = useTodayData(today);
  const ids = new Set(todays.map((t) => t.id));
  const todaySessions = sessions.filter((s) => ids.has(s.taskId));
  const tracked = new Set(todaySessions.map((s) => s.taskId));
  const todayMs = totals.get(today) ?? 0;
  const yesterday = totals.get(addDays(today, -1)) ?? 0;
  const diff = todayMs - yesterday;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        icon={Clock3}
        color="#2f6bff"
        label="Focus time"
        value={formatDuration(todayMs)}
        sub={yesterday ? `${diff >= 0 ? "+" : "−"}${formatDuration(Math.abs(diff))} vs yday` : undefined}
      />
      <StatCard
        icon={CheckCircle2}
        color="#12b76a"
        label="Completed"
        value={`${todays.filter((t) => t.done).length}/${todays.length}`}
      />
      <StatCard
        icon={Timer}
        color="#f97316"
        label="In progress"
        value={String(todays.filter((t) => !t.done && tracked.has(t.id)).length)}
      />
      <StatCard icon={Layers} color="#8b5cf6" label="Sessions" value={String(todaySessions.length)} />
    </div>
  );
}

function WorkHeader({ today }: { today: string }) {
  const { totals, todays } = useTodayData(today, 1000);
  const goalMinutes = useStore((s) => s.settings.dailyGoalMinutes);
  const todayMs = totals.get(today) ?? 0;
  const pct = Math.min(1, todayMs / (goalMinutes * 60000));
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
      <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
        Today
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-accent-soft px-2 text-xs font-semibold text-accent">
          {todays.length}
        </span>
      </h2>
      <div className="ml-auto flex items-center gap-3">
        <div className="h-2 w-36 overflow-hidden rounded-full bg-accent-soft">
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{
              width: `${pct * 100}%`,
              background: pct >= 1 ? "#12b76a" : "linear-gradient(90deg, #6aa1ff, var(--accent))",
            }}
          />
        </div>
        <span className="text-[13px] font-medium text-muted tnum">
          <span className="font-semibold text-ink">{formatDuration(todayMs)}</span> / {formatDuration(goalMinutes * 60000)} goal
        </span>
        <Link href={`/day/${today}`}>
          <Button size="sm" variant="secondary">
            <NotebookPen size={14} /> Review
          </Button>
        </Link>
      </div>
    </div>
  );
}

function CalendarWidget({ today }: { today: string }) {
  const { totals } = useTodayData(today, 60000);
  const goalMinutes = useStore((s) => s.settings.dailyGoalMinutes);
  return <MiniCalendar today={today} totals={totals} goalMinutes={goalMinutes} />;
}

function SplitCard({ today }: { today: string }) {
  const { tasks, sessions, now } = useTodayData(today);
  const categories = useStore((s) => s.categories);
  const catTotals = useMemo(() => categoryTotals(tasks, sessions, new Set([today]), now), [tasks, sessions, today, now]);
  return (
    <section className="card p-5">
      <SectionTitle>Time by category</SectionTitle>
      <DayBreakdown totals={catTotals} categories={categories} />
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
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-200/70 bg-gradient-to-r from-blue-50 to-indigo-50/40 px-4 py-3 text-sm dark:border-blue-900/60 dark:from-blue-950/40 dark:to-transparent">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-white">
        <History size={15} />
      </span>
      <p className="flex-1">
        <span className="font-semibold">
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
    <div className="flex gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/40 px-4 py-3 dark:border-amber-900/50 dark:from-amber-950/30 dark:to-transparent">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-400 text-white">
        <Pin size={15} />
      </span>
      <div>
        <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-400">Your plan from yesterday</p>
        <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{plan}</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ClientOnly>
      <TodayPage />
    </ClientOnly>
  );
}
