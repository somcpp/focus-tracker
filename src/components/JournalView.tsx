"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronLeft, ChevronRight, Lightbulb, ListChecks, Mountain, NotebookPen, PenLine, Trophy, type LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { emptyJournal, useStore } from "@/lib/store";
import { useActiveSession, useNow, useToday } from "@/lib/hooks";
import { categoryTotals, journalHasContent, journalStreak, sessionsByTask, taskMs } from "@/lib/selectors";
import { addDays, formatDuration, parseDayKey, prettyDate } from "@/lib/time";
import { CategoryIcon } from "@/lib/icons";
import { getMood, MOODS } from "@/lib/moods";
import type { Journal } from "@/lib/types";
import { AutoTextarea } from "./AutoTextarea";
import { MiniCalendar } from "./MiniCalendar";
import { PlanList } from "./PlanList";
import { Timeline } from "./Timeline";
import { Button, IconButton, PageHeader, SectionTitle } from "./ui";

type TextField = "wins" | "challenges" | "learnings" | "notes";

const SECTIONS: { key: TextField; label: string; hint: string; icon: LucideIcon; color: string }[] = [
  { key: "wins", label: "Wins", hint: "What went well today?", icon: Trophy, color: "#12b76a" },
  { key: "challenges", label: "Challenges", hint: "What was hard or slowed you down?", icon: Mountain, color: "#f97316" },
  { key: "learnings", label: "Learnings", hint: "What did you learn or figure out?", icon: Lightbulb, color: "#8b5cf6" },
  { key: "notes", label: "Notes", hint: "Anything else on your mind…", icon: PenLine, color: "#2f6bff" },
];

export function JournalView({ date }: { date: string }) {
  const today = useToday();
  const router = useRouter();
  const journal = useStore((s) => s.journals[date]) ?? emptyJournal(date);
  const saveJournal = useStore((s) => s.saveJournal);
  const label = date === today ? "Today" : date === addDays(today, -1) ? "Yesterday" : null;
  const go = (d: string) => router.push(d === today ? "/journal" : `/journal/${d}`);

  return (
    <>
      <PageHeader
        title="Journal"
        subtitle="Reflect on the day and plan the next one."
        actions={
          <>
            <IconButton label="Previous day" className="border border-line bg-card" onClick={() => go(addDays(date, -1))}>
              <ChevronLeft size={16} />
            </IconButton>
            <div className="min-w-40 text-center">
              <p className="text-sm font-semibold">{prettyDate(date, { weekday: "short", month: "short", day: "numeric" })}</p>
              {label && <p className="text-[11px] text-muted">{label}</p>}
            </div>
            <IconButton
              label="Next day"
              className="border border-line bg-card disabled:opacity-40"
              disabled={date >= today}
              onClick={() => go(addDays(date, 1))}
            >
              <ChevronRight size={16} />
            </IconButton>
            {date !== today && (
              <Button size="sm" variant="secondary" onClick={() => go(today)}>
                Today
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <DayGlance date={date} />

          <section className="card p-5">
            <SectionTitle right="Saved automatically">How did the day go?</SectionTitle>
            <div className="grid grid-cols-5 gap-2">
              {MOODS.map((m) => {
                const sel = journal.mood === m.value;
                const Icon = m.icon;
                return (
                  <button
                    key={m.value}
                    onClick={() => saveJournal(date, { mood: sel ? null : m.value })}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-[12.5px] font-semibold transition-all ${
                      sel ? "border-transparent shadow-sm" : "border-line text-muted hover:-translate-y-px hover:text-ink"
                    }`}
                    style={sel ? { color: m.color, background: `color-mix(in srgb, ${m.color} 13%, var(--card))` } : undefined}
                  >
                    <Icon size={24} style={{ color: m.color }} />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card divide-y divide-line">
            {SECTIONS.map(({ key, label: l, hint, icon: Icon, color }) => (
              <div key={key} className="flex gap-3.5 px-5 py-4">
                <span
                  className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                  style={{ color, background: `color-mix(in srgb, ${color} 12%, var(--card))` }}
                >
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold">{l}</p>
                  <AutoTextarea
                    value={journal[key]}
                    onChange={(e) => saveJournal(date, { [key]: e.target.value } as Partial<Journal>)}
                    placeholder={hint}
                    minRows={key === "notes" ? 3 : 2}
                    className="mt-1 w-full bg-transparent text-[14.5px] leading-relaxed placeholder:text-muted/80"
                  />
                </div>
              </div>
            ))}
          </section>

          <section className="card p-5">
            <div className="mb-1 flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400/15 text-amber-500">
                <ListChecks size={18} />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold">Plan for {prettyDate(addDays(date, 1), { weekday: "long" })}</h2>
                <p className="text-xs text-muted">Shows up on the next day&apos;s Today page. Turn items into tasks when you&apos;re ready.</p>
              </div>
            </div>
            <PlanList date={date} taskDate={addDays(date, 1)} editable />
          </section>
        </div>

        <aside className="flex flex-col gap-5">
          <JournalCalendar date={date} today={today} onSelect={go} />
          <PastEntries date={date} onSelect={go} />
        </aside>
      </div>
    </>
  );
}

/** Read-only summary of the day's work for context while writing */
function DayGlance({ date }: { date: string }) {
  const active = useActiveSession();
  const now = useNow(!!active, 5000);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const categories = useStore((s) => s.categories);
  const byTask = useMemo(() => sessionsByTask(sessions), [sessions]);
  const dayTasks = tasks.filter((t) => t.date === date);
  const daySessions = dayTasks.flatMap((t) => byTask.get(t.id) ?? []);
  const total = dayTasks.reduce((s, t) => s + taskMs(t.id, byTask, now), 0);
  const catTotals = categoryTotals(tasks, sessions, new Set([date]), now);
  const topId = [...catTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const top = categories.find((c) => c.id === topId);

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <p className="text-xs text-muted">Focus</p>
          <p className="text-xl font-bold tnum">{formatDuration(total)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Tasks done</p>
          <p className="text-xl font-bold tnum">
            {dayTasks.filter((t) => t.done).length}
            <span className="text-sm font-medium text-muted"> / {dayTasks.length}</span>
          </p>
        </div>
        {top && (
          <div>
            <p className="text-xs text-muted">Mostly</p>
            <p className="flex items-center gap-1.5 text-[15px] font-bold">
              <CategoryIcon icon={top.icon} color={top.color} size="xs" variant="solid" /> {top.name}
            </p>
          </div>
        )}
        <Link href={`/calendar?date=${date}`} className="ml-auto">
          <Button size="sm" variant="secondary">
            View day log <ArrowRight size={14} />
          </Button>
        </Link>
      </div>
      {daySessions.length > 0 ? (
        <Timeline sessions={daySessions} tasks={dayTasks} categories={categories} now={now} />
      ) : (
        <p className="text-sm text-muted">No time tracked on this day.</p>
      )}
    </section>
  );
}

function JournalCalendar({ date, today, onSelect }: { date: string; today: string; onSelect: (d: string) => void }) {
  const journals = useStore((s) => s.journals);
  const marks = useMemo(() => {
    const m = new Map<string, string>();
    for (const [d, j] of Object.entries(journals)) {
      if (journalHasContent(j)) m.set(d, getMood(j.mood)?.color ?? "var(--muted)");
    }
    return m;
  }, [journals]);
  const streak = journalStreak(journals, today);

  return (
    <>
      <section className="card p-5">
        <MiniCalendar title="Entries" today={today} selected={date} onSelect={onSelect} marks={marks} heat={false} />
        <p className="mt-3 text-[11px] text-muted">Dots mark days you wrote, colored by mood.</p>
      </section>
      <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] p-4 text-white shadow-[0_8px_20px_-10px_#7c3aed]">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20">
          <NotebookPen size={19} />
        </span>
        <div>
          <p className="text-[15px] font-bold tnum">
            {streak} day{streak === 1 ? "" : "s"} journaling
          </p>
          <p className="text-xs text-white/80">{streak ? "Keep the streak going" : "Write today to start a streak"}</p>
        </div>
      </div>
    </>
  );
}

function PastEntries({ date, onSelect }: { date: string; onSelect: (d: string) => void }) {
  const journals = useStore((s) => s.journals);
  const entries = Object.values(journals)
    .filter((j) => journalHasContent(j))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8);

  return (
    <section className="card p-5">
      <SectionTitle>Past entries</SectionTitle>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">Your entries will appear here.</p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {entries.map((j) => {
            const mood = getMood(j.mood);
            const Icon = mood?.icon;
            const excerpt =
              [j.wins, j.notes, j.learnings, j.challenges].map((t) => t.trim()).find(Boolean) ??
              (j.plan.length ? `${j.plan.length} plan item${j.plan.length > 1 ? "s" : ""}` : "Mood only");
            return (
              <li key={j.date}>
                <button
                  onClick={() => onSelect(j.date)}
                  className={`flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
                    j.date === date ? "bg-accent-soft" : "hover:bg-card-2"
                  }`}
                >
                  <span
                    className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                    style={mood ? { color: mood.color, background: `color-mix(in srgb, ${mood.color} 12%, var(--card))` } : undefined}
                  >
                    {Icon ? <Icon size={16} /> : <NotebookPen size={15} className="text-muted" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold">
                      {parseDayKey(j.date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <span className="line-clamp-2 text-xs text-muted">{excerpt}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
