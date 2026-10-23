"use client";

import { ClientOnly } from "@/components/ClientOnly";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardCopy, NotebookPen, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useActiveSession, useNow, useToday } from "@/lib/hooks";
import { categoriesForDay, sessionsByTask, taskMs } from "@/lib/selectors";
import { addDays, formatDuration, formatTimeOfDay, prettyDate } from "@/lib/time";
import { solid, tint } from "@/lib/colors";
import { MOODS } from "@/lib/moods";
import { useUi } from "@/lib/ui-store";
import type { Category, Session, Task } from "@/lib/types";
import { DayBoard } from "@/components/DayBoard";
import { DayBreakdown } from "@/components/DayBreakdown";
import { Button, EmptyState, toast } from "@/components/ui";

function DayPage() {
  const params = useParams<{ date: string }>();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : "";
  const today = useToday();
  const [editing, setEditing] = useState(false);
  const active = useActiveSession();
  const now = useNow(!!active, 5000);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const categories = useStore((s) => s.categories);
  const dayCategories = useStore((s) => s.dayCategories);

  const dayTasks = useMemo(() => tasks.filter((t) => t.date === date), [tasks, date]);
  const byTask = useMemo(() => sessionsByTask(sessions), [sessions]);
  const cats = categoriesForDay(date, categories, tasks, dayCategories).filter((c) =>
    dayTasks.some((t) => t.categoryId === c.id),
  );
  const catTotals = new Map(
    cats.map((c) => [
      c.id,
      dayTasks.filter((t) => t.categoryId === c.id).reduce((s, t) => s + taskMs(t.id, byTask, now), 0),
    ]),
  );
  const total = Array.from(catTotals.values()).reduce((a, b) => a + b, 0);
  const daySessions = dayTasks.flatMap((t) => byTask.get(t.id) ?? []);

  if (!date) return <EmptyState emoji="🤔" title="That's not a date" text="Try picking a day from the calendar." />;

  const copySummary = () => {
    const lines = [`📅 ${prettyDate(date)} · ${formatDuration(total)}`];
    for (const c of cats) {
      lines.push(`\n${c.emoji} ${c.name} (${formatDuration(catTotals.get(c.id) ?? 0)})`);
      for (const t of dayTasks.filter((x) => x.categoryId === c.id)) {
        lines.push(`  ${t.done ? "✅" : "⬜"} ${t.title} · ${formatDuration(taskMs(t.id, byTask, now))}`);
      }
    }
    navigator.clipboard.writeText(lines.join("\n"));
    toast({ emoji: "📋", text: "Summary copied!" });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/day/${addDays(date, -1)}`} className="pop-btn grid h-10 w-10 place-items-center rounded-full bg-card">
          <ChevronLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-muted">{date === today ? "Today" : date === addDays(today, -1) ? "Yesterday" : "Day log"}</p>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{prettyDate(date)}</h1>
        </div>
        {date < today && (
          <Link href={`/day/${addDays(date, 1)}`} className="pop-btn grid h-10 w-10 place-items-center rounded-full bg-card">
            <ChevronRight size={20} />
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* totals */}
          <section className="card flex flex-wrap items-center gap-6 p-5">
            <div>
              <p className="text-sm font-bold text-muted">Total focus</p>
              <p className="font-display text-4xl font-bold">{formatDuration(total)}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-muted">Tasks done</p>
              <p className="font-display text-4xl font-bold">
                {dayTasks.filter((t) => t.done).length}
                <span className="text-xl text-muted">/{dayTasks.length}</span>
              </p>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="plain" onClick={copySummary} disabled={!dayTasks.length}>
                <ClipboardCopy size={16} /> Copy
              </Button>
              <Button variant={editing ? "mint" : "primary"} onClick={() => setEditing((e) => !e)}>
                {editing ? <Check size={16} /> : <Pencil size={16} />} {editing ? "Done editing" : "Edit log"}
              </Button>
            </div>
            {daySessions.length > 0 && <Timeline sessions={daySessions} tasks={dayTasks} categories={categories} now={now} />}
          </section>

          {editing ? (
            <DayBoard date={date} />
          ) : cats.length === 0 ? (
            <div className="card">
              <EmptyState emoji="🫥" title="Nothing logged" text="No tasks on this day. Hit “Edit log” to add some after the fact." />
            </div>
          ) : (
            cats.map((c) => (
              <SummaryCategory
                key={c.id}
                category={c}
                tasks={dayTasks.filter((t) => t.categoryId === c.id)}
                byTask={byTask}
                now={now}
                total={catTotals.get(c.id) ?? 0}
              />
            ))
          )}
        </div>

        <aside className="flex flex-col gap-5">
          <section className="card p-5">
            <h2 className="mb-3 font-display text-lg font-semibold">Split</h2>
            <DayBreakdown totals={catTotals} categories={categories} />
          </section>
          <JournalCard date={date} />
        </aside>
      </div>
    </div>
  );
}

function Timeline({ sessions, tasks, categories, now }: { sessions: Session[]; tasks: Task[]; categories: Category[]; now: number }) {
  const start = Math.min(...sessions.map((s) => s.start));
  const end = Math.max(...sessions.map((s) => s.end ?? now));
  const span = Math.max(end - start, 1);
  const catOf = (taskId: string) => {
    const t = tasks.find((x) => x.id === taskId);
    return categories.find((c) => c.id === t?.categoryId);
  };
  return (
    <div className="w-full">
      <p className="mb-1.5 text-sm font-bold text-muted">Timeline</p>
      <div className="relative h-8 overflow-hidden rounded-xl border-2 border-line bg-card-2">
        {sessions.map((s) => {
          const c = catOf(s.taskId);
          const t = tasks.find((x) => x.id === s.taskId);
          return (
            <div
              key={s.id}
              title={`${t?.title}: ${formatTimeOfDay(s.start)}–${s.end ? formatTimeOfDay(s.end) : "now"}`}
              className={`absolute inset-y-0 ${s.end === null ? "stripes" : ""}`}
              style={{
                left: `${((s.start - start) / span) * 100}%`,
                width: `max(3px, ${(((s.end ?? now) - s.start) / span) * 100}%)`,
                background: c ? solid(c.color) : "var(--accent)",
              }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs font-bold text-muted">
        <span>{formatTimeOfDay(start)}</span>
        <span>{formatTimeOfDay(end)}</span>
      </div>
    </div>
  );
}

function SummaryCategory({
  category,
  tasks,
  byTask,
  now,
  total,
}: {
  category: Category;
  tasks: Task[];
  byTask: Map<string, Session[]>;
  now: number;
  total: number;
}) {
  const [open, setOpen] = useState(true);
  const openTask = useUi((s) => s.openTask);
  return (
    <section className="card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-3 text-left"
        style={{ background: tint(category.color, 22) }}
      >
        <span className="pop-btn grid h-10 w-10 place-items-center rounded-2xl text-xl" style={{ background: solid(category.color) }}>
          {category.emoji}
        </span>
        <span className="flex-1 font-display text-xl font-semibold">{category.name}</span>
        <span className="font-display text-lg font-semibold">{formatDuration(total)}</span>
        <ChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t-2 border-line">
            {tasks.map((t) => {
              const ms = taskMs(t.id, byTask, now);
              return (
                <li key={t.id} className="border-b-2 border-soft-line last:border-b-0">
                  <button onClick={() => openTask(t.id)} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-card-2">
                    <span
                      className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${
                        t.done ? "border-line bg-[#7bd389] text-[#2b2240]" : "border-soft-line"
                      }`}
                    >
                      {t.done && <Check size={14} strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{t.title}</p>
                      {t.notes.trim() && (
                        <p className="mt-0.5 line-clamp-2 flex gap-1 text-sm text-muted">
                          <NotebookPen size={13} className="mt-0.5 shrink-0" /> {t.notes}
                        </p>
                      )}
                    </div>
                    <span className="font-display font-semibold tabular-nums">{ms ? formatDuration(ms) : "–"}</span>
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}

function JournalCard({ date }: { date: string }) {
  const journal = useStore((s) => s.journals[date]);
  const saveJournal = useStore((s) => s.saveJournal);
  return (
    <section className="card flex flex-col gap-4 p-5">
      <h2 className="font-display text-lg font-semibold">📓 Journal</h2>
      <div>
        <p className="mb-2 text-sm font-bold text-muted">How was the day?</p>
        <div className="flex justify-between gap-1">
          {MOODS.map((m) => (
            <motion.button
              key={m.value}
              whileHover={{ scale: 1.15, rotate: -6 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => saveJournal(date, { mood: journal?.mood === m.value ? null : m.value })}
              title={m.label}
              className={`grid h-12 w-12 place-items-center rounded-2xl text-2xl transition-all ${
                journal?.mood === m.value ? "border-2 border-line bg-[#f7c531] shadow-[0_3px_0_var(--line)]" : "grayscale-[60%] hover:grayscale-0"
              }`}
            >
              {m.emoji}
            </motion.button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-bold text-muted">Reflection</p>
        <textarea
          value={journal?.reflection ?? ""}
          onChange={(e) => saveJournal(date, { reflection: e.target.value })}
          rows={5}
          placeholder="What went well? What was hard? What did you learn?"
          className="w-full resize-y rounded-2xl border-2 border-line bg-card-2 p-3 leading-relaxed"
        />
      </div>
      <div>
        <p className="mb-2 text-sm font-bold text-muted">Plan for tomorrow 📌</p>
        <textarea
          value={journal?.plan ?? ""}
          onChange={(e) => saveJournal(date, { plan: e.target.value })}
          rows={4}
          placeholder={"- 3 graph problems\n- finish navbar"}
          className="w-full resize-y rounded-2xl border-2 border-line bg-[#fff4c2] p-3 leading-relaxed text-[#2b2240] dark:bg-[#3d3520] dark:text-[#f4efff]"
        />
        <p className="mt-1 text-xs font-semibold text-muted">This shows up on tomorrow&apos;s Today page. Autosaves ✨</p>
      </div>
    </section>
  );
}

export default function Page() {
  return (
    <ClientOnly>
      <DayPage />
    </ClientOnly>
  );
}
