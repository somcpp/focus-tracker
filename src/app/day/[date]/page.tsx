"use client";

import { RichText } from "@/components/RichText";
import { hasLink, plainText, splitLinks } from "@/lib/links";
import { ClientOnly } from "@/components/ClientOnly";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardCopy, Inbox, NotebookPen, Pencil, Pin } from "lucide-react";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useActiveSession, useNow, useToday } from "@/lib/hooks";
import { categoriesForDay, sessionsByTask, taskMs } from "@/lib/selectors";
import { addDays, formatDuration, formatTimeOfDay, prettyDate } from "@/lib/time";
import { DIFFICULTY, solid } from "@/lib/colors";
import { CategoryIcon } from "@/lib/icons";
import { MOODS } from "@/lib/moods";
import { useUi } from "@/lib/ui-store";
import type { Category, Session, Task } from "@/lib/types";
import { DayBoard } from "@/components/DayBoard";
import { DayBreakdown } from "@/components/DayBreakdown";
import { Badge, Button, EmptyState, IconButton, PageHeader, SectionTitle, toast } from "@/components/ui";

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

  if (!date) return <EmptyState icon={Inbox} title="Invalid date" text="Pick a day from the calendar instead." />;

  const copySummary = () => {
    const lines = [`${prettyDate(date)} · ${formatDuration(total)}`];
    for (const c of cats) {
      lines.push(`\n${c.name} (${formatDuration(catTotals.get(c.id) ?? 0)})`);
      for (const t of dayTasks.filter((x) => x.categoryId === c.id)) {
        lines.push(`  [${t.done ? "x" : " "}] ${plainText(t.title)}${hasLink(t.title) ? ` (${splitLinks(t.title).flatMap((p) => (p.type === "link" ? [p.link.url] : [])).join(", ")})` : ""} · ${formatDuration(taskMs(t.id, byTask, now))}`);
      }
    }
    navigator.clipboard.writeText(lines.join("\n"));
    toast({ tone: "success", text: "Summary copied to clipboard" });
  };

  const label = date === today ? "Today" : date === addDays(today, -1) ? "Yesterday" : "Daily review";

  return (
    <>
      <PageHeader
        title={prettyDate(date, { weekday: "long", month: "long", day: "numeric" })}
        subtitle={label}
        actions={
          <>
            <Link href={`/day/${addDays(date, -1)}`}>
              <IconButton label="Previous day" className="border border-line">
                <ChevronLeft size={16} />
              </IconButton>
            </Link>
            {date < today && (
              <Link href={`/day/${addDays(date, 1)}`}>
                <IconButton label="Next day" className="border border-line">
                  <ChevronRight size={16} />
                </IconButton>
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="card p-5">
            <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
              <div>
                <p className="text-xs text-muted">Total focus</p>
                <p className="text-3xl font-semibold tracking-tight tnum">{formatDuration(total)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Tasks completed</p>
                <p className="text-3xl font-semibold tracking-tight tnum">
                  {dayTasks.filter((t) => t.done).length}
                  <span className="text-lg text-muted"> / {dayTasks.length}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Sessions</p>
                <p className="text-3xl font-semibold tracking-tight tnum">{daySessions.length}</p>
              </div>
              <div className="ml-auto flex gap-2">
                <Button variant="secondary" onClick={copySummary} disabled={!dayTasks.length}>
                  <ClipboardCopy size={15} /> Copy
                </Button>
                <Button variant={editing ? "success" : "primary"} onClick={() => setEditing((e) => !e)}>
                  {editing ? <Check size={15} /> : <Pencil size={15} />} {editing ? "Done" : "Edit log"}
                </Button>
              </div>
            </div>
            {daySessions.length > 0 && (
              <Timeline sessions={daySessions} tasks={dayTasks} categories={categories} now={now} />
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

        <aside className="flex flex-col gap-4">
          <JournalCard date={date} />
          <section className="card p-4">
            <SectionTitle>Time by category</SectionTitle>
            <DayBreakdown totals={catTotals} categories={categories} emptyText="No time tracked on this day." />
          </section>
        </aside>
      </div>
    </>
  );
}

function Timeline({ sessions, tasks, categories, now }: { sessions: Session[]; tasks: Task[]; categories: Category[]; now: number }) {
  const start = Math.min(...sessions.map((s) => s.start));
  const end = Math.max(...sessions.map((s) => s.end ?? now));
  const span = Math.max(end - start, 1);
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const catById = new Map(categories.map((c) => [c.id, c]));
  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="mb-2 text-xs font-medium text-muted">Timeline</p>
      <div className="relative h-6 overflow-hidden rounded-md bg-card-2">
        {sessions.map((s) => {
          const t = taskById.get(s.taskId);
          const c = t && catById.get(t.categoryId);
          return (
            <div
              key={s.id}
              title={`${t?.title}: ${formatTimeOfDay(s.start)} – ${s.end ? formatTimeOfDay(s.end) : "now"}`}
              className="absolute inset-y-0 border-x border-card"
              style={{
                left: `${((s.start - start) / span) * 100}%`,
                width: `max(3px, ${(((s.end ?? now) - s.start) / span) * 100}%)`,
                background: c ? solid(c.color) : "var(--accent)",
              }}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted tnum">
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
  const done = tasks.filter((t) => t.done).length;
  return (
    <section className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-subtle">
        <CategoryIcon icon={category.icon} color={category.color} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{category.name}</p>
          <p className="text-xs text-muted">
            {done} of {tasks.length} completed
          </p>
        </div>
        <span className="text-sm font-semibold tnum">{formatDuration(total)}</span>
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
                    className="flex w-full cursor-pointer items-start gap-3 px-4 py-2.5 text-left hover:bg-subtle"
                  >
                    <span
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                        t.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-line-strong"
                      }`}
                    >
                      {t.done && <Check size={11} strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          <RichText text={t.title} size="sm" />
                        </p>
                        {t.difficulty && <Badge color={DIFFICULTY[t.difficulty].color}>{DIFFICULTY[t.difficulty].label}</Badge>}
                      </div>
                      {t.notes.trim() && (
                        <p className="mt-0.5 line-clamp-2 flex gap-1.5 text-xs text-muted">
                          <NotebookPen size={12} className="mt-px shrink-0" />
                          <span>
                            <RichText text={t.notes} size="sm" />
                          </span>
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

function JournalCard({ date }: { date: string }) {
  const journal = useStore((s) => s.journals[date]);
  const saveJournal = useStore((s) => s.saveJournal);
  return (
    <section className="card flex flex-col gap-4 p-4">
      <SectionTitle right="Saved automatically">Journal</SectionTitle>
      <div>
        <p className="mb-2 text-xs font-medium text-muted">How did the day go?</p>
        <div className="grid grid-cols-5 gap-1.5">
          {MOODS.map((m) => {
            const sel = journal?.mood === m.value;
            const Icon = m.icon;
            return (
              <button
                key={m.value}
                onClick={() => saveJournal(date, { mood: sel ? null : m.value })}
                className={`flex flex-col items-center gap-1 rounded-lg border py-2 text-[11px] font-medium transition-colors ${
                  sel ? "border-transparent" : "border-line text-muted hover:text-ink"
                }`}
                style={sel ? { color: m.color, background: `color-mix(in srgb, ${m.color} 12%, transparent)` } : undefined}
              >
                <Icon size={18} style={{ color: m.color }} />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted">Reflection</p>
        <textarea
          value={journal?.reflection ?? ""}
          onChange={(e) => saveJournal(date, { reflection: e.target.value })}
          rows={5}
          placeholder="What went well? What was difficult? What did you learn?"
          className="field w-full resize-y p-3 text-sm leading-relaxed"
        />
      </div>
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
          <Pin size={12} className="text-amber-500" /> Plan for tomorrow
        </p>
        <textarea
          value={journal?.plan ?? ""}
          onChange={(e) => saveJournal(date, { plan: e.target.value })}
          rows={4}
          placeholder={"- 3 graph problems\n- Finish the navbar"}
          className="field w-full resize-y p-3 text-sm leading-relaxed"
        />
        <p className="mt-1 text-[11px] text-muted">Shown at the top of tomorrow&apos;s Today page.</p>
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
