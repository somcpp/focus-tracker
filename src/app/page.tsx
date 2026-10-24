"use client";

import { ClientOnly } from "@/components/ClientOnly";
import Link from "next/link";
import { ChevronDown, CheckCircle2, Clock3, History, Layers, NotebookPen, Share2, Sun, Sunrise, Sunset, Moon, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-client";
import { useUi } from "@/lib/ui-store";
import { useActiveSession, useNow, useToday } from "@/lib/hooks";
import { categoryTotals, dayTotals } from "@/lib/selectors";
import { addDays, formatDuration, prettyDate } from "@/lib/time";
import { getTimeSlotData } from "@/lib/quotes";
import { DayBoard } from "@/components/DayBoard";
import { DayBreakdown } from "@/components/DayBreakdown";
import { FocusTimer } from "@/components/FocusTimer";
import { MiniCalendar } from "@/components/MiniCalendar";
import { PlanList } from "@/components/PlanList";
import { QuickAdd } from "@/components/QuickAdd";
import { ShareCardWidget } from "@/components/ShareCardWidget";
import { StatCard } from "@/components/StatCard";
import { Button, IconButton, SectionTitle, toast } from "@/components/ui";

function TimeSlotIcon({ iconName, className }: { iconName: string; className?: string }) {
  switch (iconName) {
    case "Sunrise":
      return <Sunrise size={15} className={className} />;
    case "Sunset":
      return <Sunset size={15} className={className} />;
    case "Moon":
      return <Moon size={15} className={className} />;
    case "Sparkles":
      return <Sparkles size={15} className={className} />;
    default:
      return <Sun size={15} className={className} />;
  }
}

function TodayPage() {
  const today = useToday();
  const openShare = useUi((s) => s.openShare);
  const settingsName = useStore((s) => s.settings.name);
  const authUser = useAuth((s) => s.user);
  const name = settingsName || authUser?.name?.split(" ")[0] || "";
  const count = useStore((s) => s.tasks.filter((t) => t.date === today).length);

  // Dynamic time-aware welcome and subtitle
  const [now, setNow] = useState(() => new Date());
  const [subtitleOffset, setSubtitleOffset] = useState(() => Math.floor(Math.random() * 20));
  const [greetingOffset, setGreetingOffset] = useState(() => Math.floor(Math.random() * 10));
  const [isFading, setIsFading] = useState(false);

  const timeData = useMemo(() => getTimeSlotData(now), [now]);

  // Update clock every minute so time transitions seamlessly
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Change message gently once every hour (or manually on demand via shuffle button)
  useEffect(() => {
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setSubtitleOffset((prev) => prev + 1);
        setIsFading(false);
      }, 300);
    }, ONE_HOUR_MS);

    return () => clearInterval(interval);
  }, []);

  const handleShuffleQuote = () => {
    setIsFading(true);
    setTimeout(() => {
      setSubtitleOffset((prev) => prev + 1);
      setGreetingOffset((prev) => prev + 1);
      setIsFading(false);
    }, 180);
  };

  const currentGreeting = timeData.greetings[greetingOffset % timeData.greetings.length];
  const currentSubtitle = timeData.subtitles[subtitleOffset % timeData.subtitles.length];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-[28px] font-bold leading-tight tracking-tight md:text-[32px]">
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-300 dark:to-purple-300">
                {currentGreeting}
                {name ? `, ${name}` : ""}!
              </span>
            </h1>
            <div className="mt-1 flex items-center gap-1.5">
              <p
                className={`text-[15px] text-muted transition-opacity duration-300 ${
                  isFading ? "opacity-30" : "opacity-100"
                }`}
              >
                {currentSubtitle}
              </p>
              <button
                type="button"
                onClick={handleShuffleQuote}
                title="Shuffle message"
                className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-muted/50 hover:bg-card-2 hover:text-ink transition active:scale-90"
              >
                <Sparkles size={12} className="transition hover:rotate-12" />
              </button>
            </div>
          </div>
          <div className="shrink-0 sm:text-right">
            <p className="flex items-center gap-1.5 text-[15px] font-medium text-ink-2 sm:justify-end">
              <TimeSlotIcon iconName={timeData.iconName} className={`shrink-0 ${timeData.iconColor}`} />
              {prettyDate(today, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </header>

        <KpiRow today={today} />
        <StartYourDay today={today} />

        <div className="mt-1 flex items-center gap-2">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            Today
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-accent-soft px-2 text-xs font-semibold text-accent">
              {count}
            </span>
          </h2>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => openShare(today)}>
              <Share2 size={14} className="text-accent" /> Share Card
            </Button>
            <Link href="/journal">
              <Button size="sm" variant="secondary">
                <NotebookPen size={14} /> Journal
              </Button>
            </Link>
          </div>
        </div>
        <DayBoard date={today} />
      </div>

      <aside className="flex flex-col gap-5">
        <div className="card p-5">
          <FocusTimer today={today} />
        </div>
        <ShareCardWidget today={today} />
        <SplitCard today={today} />
        <div className="card p-5">
          <CalendarWidget today={today} />
        </div>
        <div className="card p-5">
          <QuickAdd date={today} />
        </div>
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
  const { totals, todays, sessions } = useTodayData(today, 1000);
  const goalMinutes = useStore((s) => s.settings.dailyGoalMinutes);
  const ids = new Set(todays.map((t) => t.id));
  const blocks = sessions.filter((s) => ids.has(s.taskId)).length;
  const todayMs = totals.get(today) ?? 0;
  const goalMs = goalMinutes * 60000;
  const doneCount = todays.filter((t) => t.done).length;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard
        icon={Clock3}
        color="#2f6bff"
        label={todayMs >= goalMs ? "Goal reached" : `Focus · goal ${formatDuration(goalMs)}`}
        value={formatDuration(todayMs)}
        progress={todayMs / goalMs}
      />
      <StatCard
        icon={CheckCircle2}
        color="#12b76a"
        label="Tasks completed"
        value={`${doneCount}/${todays.length}`}
        progress={todays.length ? doneCount / todays.length : 0}
      />
      <StatCard icon={Layers} color="#8b5cf6" label="Focus blocks" value={String(blocks)} sub={blocks ? "Timer sessions today" : "Press play to start one"} />
    </div>
  );
}

/** Yesterday's plan + unfinished tasks, in one collapsible card shown at the start of the day */
function StartYourDay({ today }: { today: string }) {
  const yesterday = addDays(today, -1);
  const tasks = useStore((s) => s.tasks);
  const plan = useStore((s) => s.journals[yesterday]?.plan);
  const dismissedOn = useStore((s) => s.settings.startDayDismissedOn);
  const { carryOver, updateSettings, updateTask } = useStore.getState();
  const [open, setOpen] = useState(true);

  // Most recent earlier day with unfinished, not-yet-carried tasks
  const prev = useMemo(() => {
    const days = tasks.filter((t) => t.date < today && !t.done && !t.carriedTo).map((t) => t.date);
    if (!days.length) return null;
    const d = days.sort().at(-1)!;
    return { date: d, count: tasks.filter((t) => t.date === d && !t.done && !t.carriedTo).length };
  }, [tasks, today]);

  const openPlan = (plan ?? []).filter((p) => !p.done && !p.taskId).length;
  const hasPlan = (plan ?? []).length > 0;
  if (dismissedOn === today || (!hasPlan && !prev)) return null;

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50/30 px-5 py-3.5 dark:from-amber-950/30 dark:to-transparent">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_6px_14px_-6px_#f97316]">
          <Sunrise size={18} />
        </span>
        <button onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <p className="text-[15px] font-bold">Start your day</p>
          <p className="text-xs text-muted">
            {[
              hasPlan && `${openPlan} of ${plan!.length} plan item${plan!.length > 1 ? "s" : ""} open`,
              prev && `${prev.count} unfinished task${prev.count > 1 ? "s" : ""}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </button>
        <ChevronDown size={18} className={`cursor-pointer text-muted transition-transform ${open ? "rotate-180" : ""}`} onClick={() => setOpen((o) => !o)} />
        <IconButton label="Dismiss for today" onClick={() => updateSettings({ startDayDismissedOn: today })}>
          <X size={16} />
        </IconButton>
      </div>

      {open && (
        <div className="flex flex-col gap-4 border-t border-line px-5 py-4">
          {hasPlan && (
            <div>
              <p className="mb-1 text-xs font-semibold text-muted">Your plan from yesterday</p>
              <PlanList date={yesterday} taskDate={today} editable={false} />
            </div>
          )}
          {prev && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-card-2 px-3.5 py-2.5 text-sm">
              <History size={16} className="text-accent" />
              <p className="flex-1">
                <span className="font-semibold">
                  {prev.count} unfinished task{prev.count > 1 ? "s" : ""}
                </span>{" "}
                <span className="text-muted">
                  from {prev.date === yesterday ? "yesterday" : prettyDate(prev.date, { month: "short", day: "numeric" })}
                </span>
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  tasks
                    .filter((t) => t.date === prev.date && !t.done && !t.carriedTo)
                    .forEach((t) => updateTask(t.id, { carriedTo: "dismissed" }))
                }
              >
                Leave them
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
          )}
        </div>
      )}
    </section>
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

export default function Page() {
  return (
    <ClientOnly>
      <TodayPage />
    </ClientOnly>
  );
}
