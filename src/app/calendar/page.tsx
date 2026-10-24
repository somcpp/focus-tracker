"use client";

import { ClientOnly } from "@/components/ClientOnly";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { CalendarCheck, Check, ChevronDown, Clock3, Inbox, NotebookPen, Pencil, Share2, Star, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useActiveSession, useNow, useToday } from "@/lib/hooks";
import { categoriesForDay, dayTotals, journalHasContent, sessionsByTask, taskMs } from "@/lib/selectors";
import { addDays, dayKey, formatDuration, formatHours, parseDayKey, prettyDate } from "@/lib/time";
import { DIFFICULTY, HEAT, solid } from "@/lib/colors";
import { CategoryIcon } from "@/lib/icons";
import { getMood } from "@/lib/moods";
import { useUi } from "@/lib/ui-store";
import type { Category, Session, Task } from "@/lib/types";
import { MiniCalendar, monthOf, type MonthRef } from "@/components/MiniCalendar";
import { StatCard } from "@/components/StatCard";
import { Timeline } from "@/components/Timeline";
import { DayBoard } from "@/components/DayBoard";
import { RichText } from "@/components/RichText";
import { Badge, Button, EmptyState, PageHeader } from "@/components/ui";

/** Day passed as ?date=YYYY-MM-DD (from the journal, today's mini calendar, old /day links) */
function initialDate(today: string) {
  const d = new URLSearchParams(window.location.search).get("date");
  return d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today ? d : today;
}

function CalendarPage() {
  const today = useToday();
  const [selected, setSelected] = useState(() => initialDate(today));
  const [month, setMonth] = useState<MonthRef>(() => monthOf(selected));
  const active = useActiveSession();
  const now = useNow(!!active, 10000);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const journals = useStore((s) => s.journals);
  const settings = useStore((s) => s.settings);

  // Keep the URL in sync so refresh / back keeps the selected day
  useEffect(() => {
    const url = selected === today ? "/calendar" : `/calendar?date=${selected}`;
    window.history.replaceState(null, "", url);
  }, [selected, today]);

  const totals = useMemo(() => dayTotals(tasks, sessions, now), [tasks, sessions, now]);
  const marks = useMemo(() => {
    const m = new Map<string, string>();
    for (const [d, j] of Object.entries(journals)) {
      if (journalHasContent(j)) m.set(d, getMood(j.mood)?.color ?? "var(--muted)");
    }
    return m;
  }, [journals]);

  // Stats for the month currently on screen (only days up to today count)
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => dayKey(new Date(month.y, month.m, i + 1))).filter(
    (d) => d <= today,
  );
  const monthMs = monthDays.reduce((s, d) => s + (totals.get(d) ?? 0), 0);
  const trackedDays = monthDays.filter((d) => (totals.get(d) ?? 0) > 0);
  const activeDays = monthDays.filter((d) => (totals.get(d) ?? 0) >= settings.streakMinMinutes * 60000).length;
  const bestDay = trackedDays.reduce<string | null>((b, d) => (!b || (totals.get(d) ?? 0) > (totals.get(b) ?? 0) ? d : b), null);
  const monthName = new Date(month.y, month.m, 1).toLocaleDateString([], { month: "long" });

  return (
    <>
      <PageHeader title="Calendar" subtitle="Browse any day to see what you worked on, or fix its log." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Clock3} color="#2f6bff" label={`Hours in ${monthName}`} value={`${formatHours(monthMs)}h`} />
        <StatCard
          icon={CalendarCheck}
          color="#12b76a"
          label="Active days"
          value={`${activeDays} / ${monthDays.length || daysInMonth}`}
          sub={`≥ ${formatDuration(settings.streakMinMinutes * 60000)} tracked`}
        />
        <StatCard
          icon={Star}
          color="#eab308"
          label="Best day"
          value={bestDay ? formatDuration(totals.get(bestDay) ?? 0) : "—"}
          sub={bestDay ? parseDayKey(bestDay).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : undefined}
        />
        <StatCard
          icon={TrendingUp}
          color="#8b5cf6"
          label="Daily average"
          value={formatDuration(trackedDays.length ? monthMs / trackedDays.length : 0)}
          sub="On days you tracked"
        />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="flex flex-col gap-5 lg:sticky lg:top-6">
          <section className="card p-5">
            <MiniCalendar
              title="Month"
              today={today}
              totals={totals}
              goalMinutes={settings.dailyGoalMinutes}
              selected={selected}
              onSelect={setSelected}
              month={month}
              onMonthChange={setMonth}
              marks={marks}
            />
            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-[11px] text-muted">
              <div className="flex items-center gap-1.5">
                Less
                {HEAT.map((h, i) => (
                  <span key={i} className="h-3 w-3 rounded-full" style={{ background: h }} />
                ))}
                More
                <span className="ml-auto">Goal {formatDuration(settings.dailyGoalMinutes * 60000)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Dot = journal entry, colored by mood
              </div>
            </div>
          </section>
        </div>

        <DayLog key={selected} date={selected} today={today} now={now} />
      </div>
    </>
  );
}

/** Full log for one day: summary, timeline, journal excerpt and tasks (editable) */
function DayLog({ date, today, now }: { date: string; today: string; now: number }) {
  const [editing, setEditing] = useState(false);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const categories = useStore((s) => s.categories);
  const dayCategories = useStore((s) => s.dayCategories);
  const journal = useStore((s) => s.journals[date]);
  const byTask = useMemo(() => sessionsByTask(sessions), [sessions]);
  const dayTasks = tasks.filter((t) => t.date === date);
  const daySessions = dayTasks.flatMap((t) => byTask.get(t.id) ?? []);
  const total = dayTasks.reduce((s, t) => s + taskMs(t.id, byTask, now), 0);
  const cats = categoriesForDay(date, categories, tasks, dayCategories).filter((c) => dayTasks.some((t) => t.categoryId === c.id));
  const openShare = useUi((s) => s.openShare);
  const mood = getMood(journal?.mood);
  const MoodIcon = mood?.icon;
  const label = date === today ? "Today" : date === addDays(today, -1) ? "Yesterday" : null;
  const journalHref = date === today ? "/journal" : `/journal/${date}`;
  const excerpts = journal
    ? (
        [
          ["Wins", journal.wins, "#12b76a"],
          ["Challenges", journal.challenges, "#f97316"],
          ["Learnings", journal.learnings, "#8b5cf6"],
          ["Notes", journal.notes, "#2f6bff"],
        ] as const
      ).filter(([, text]) => text.trim())
    : [];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{prettyDate(date)}</h2>
            <p className="text-sm text-muted">
              {label ? `${label} · ` : ""}
              <span className="font-semibold text-ink tnum">{formatDuration(total)}</span> focused ·{" "}
              {dayTasks.filter((t) => t.done).length}/{dayTasks.length} tasks · {daySessions.length} sessions
            </p>
          </div>
          <div className="flex items-center gap-2">
            {mood && MoodIcon && (
              <span
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ color: mood.color, background: `color-mix(in srgb, ${mood.color} 12%, var(--card))` }}
              >
                <MoodIcon size={14} /> {mood.label}
              </span>
            )}
            <Button size="sm" variant="secondary" onClick={() => openShare(date)}>
              <Share2 size={14} className="text-accent" /> Share
            </Button>
            <Link href={journalHref}>
              <Button size="sm" variant="secondary">
                <NotebookPen size={14} /> Journal
              </Button>
            </Link>
            <Button size="sm" variant={editing ? "success" : "primary"} onClick={() => setEditing((e) => !e)}>
              {editing ? <Check size={14} /> : <Pencil size={14} />} {editing ? "Done" : "Edit log"}
            </Button>
          </div>
        </div>

        {daySessions.length > 0 && (
          <div className="mt-4">
            <Timeline sessions={daySessions} tasks={dayTasks} categories={categories} now={now} />
          </div>
        )}

        {excerpts.length > 0 && (
          <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
            {excerpts.map(([title, text, color]) => (
              <div key={title}>
                <p className="mb-0.5 text-xs font-semibold" style={{ color }}>
                  {title}
                </p>
                <p className="line-clamp-3 whitespace-pre-wrap text-sm text-ink-2">{text}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {editing ? (
        <DayBoard date={date} />
      ) : cats.length === 0 ? (
        <div className="card">
          <EmptyState icon={Inbox} title="Nothing logged" text="No tasks on this day. Use “Edit log” to add work after the fact." />
        </div>
      ) : (
        cats.map((c) => (
          <CategoryLog key={c.id} category={c} tasks={dayTasks.filter((t) => t.categoryId === c.id)} byTask={byTask} now={now} />
        ))
      )}
    </div>
  );
}

function CategoryLog({ category, tasks, byTask, now }: { category: Category; tasks: Task[]; byTask: Map<string, Session[]>; now: number }) {
  const [open, setOpen] = useState(true);
  const openTask = useUi((s) => s.openTask);
  const total = tasks.reduce((s, t) => s + taskMs(t.id, byTask, now), 0);
  const done = tasks.filter((t) => t.done).length;
  return (
    <section className="card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-3 text-left"
        style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${solid(category.color)} 8%, var(--card)), var(--card) 65%)` }}
      >
        <CategoryIcon icon={category.icon} color={category.color} variant="solid" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{category.name}</p>
          <p className="text-xs text-muted">
            {done} of {tasks.length} completed
          </p>
        </div>
        <span className="text-sm font-bold tnum" style={{ color: total ? solid(category.color) : undefined }}>
          {formatDuration(total)}
        </span>
        <ChevronDown size={18} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-line"
          >
            {tasks.map((t) => {
              const ms = taskMs(t.id, byTask, now);
              return (
                <li key={t.id} className="border-b border-line last:border-b-0">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => openTask(t.id)}
                    onKeyDown={(e) => e.target === e.currentTarget && e.key === "Enter" && openTask(t.id)}
                    className="flex w-full cursor-pointer items-start gap-3 px-5 py-2.5 text-left hover:bg-subtle"
                  >
                    <span
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px] ${
                        t.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-line-strong"
                      }`}
                    >
                      {t.done && <Check size={11} strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          <RichText text={t.title} size="sm" />
                        </span>
                        {t.difficulty && <Badge color={DIFFICULTY[t.difficulty].color}>{DIFFICULTY[t.difficulty].label}</Badge>}
                      </div>
                      {t.notes.trim() && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                          <RichText text={t.notes} size="sm" />
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-sm text-ink-2 tnum">{ms ? formatDuration(ms) : "—"}</span>
                  </div>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}

export default function Page() {
  return (
    <ClientOnly>
      <CalendarPage />
    </ClientOnly>
  );
}
