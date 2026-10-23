"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, FolderPlus, NotebookPen, Pause, Play, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useActiveSession, useNow } from "@/lib/hooks";
import { categoriesForDay, sessionsByTask, taskMs } from "@/lib/selectors";
import { dayKey, formatClock, formatDuration } from "@/lib/time";
import { DIFFICULTY, solid, tint } from "@/lib/colors";
import { CategoryIcon } from "@/lib/icons";
import { useUi } from "@/lib/ui-store";
import type { Category, Session, Task } from "@/lib/types";
import { CategoryForm } from "./CategoryForm";
import { LinkChip, RichText } from "./RichText";
import { splitLinks } from "@/lib/links";
import { EmptyState, IconButton } from "./ui";

/** Pill tag in a color, like a label */
function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-px text-[11px] font-semibold"
      style={{ color, background: `color-mix(in srgb, ${color} 12%, var(--card))` }}
    >
      {children}
    </span>
  );
}

/** Category sections + tasks for a given day. Used by Today and the day log editor. */
export function DayBoard({ date }: { date: string }) {
  const categories = useStore((s) => s.categories);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const dayCategories = useStore((s) => s.dayCategories);
  const active = useActiveSession();
  const now = useNow(!!active);

  const dayCats = useMemo(
    () => categoriesForDay(date, categories, tasks, dayCategories),
    [date, categories, tasks, dayCategories],
  );
  const byTask = useMemo(() => sessionsByTask(sessions), [sessions]);

  return (
    <div className="flex flex-col gap-4">
      {dayCats.length === 0 && (
        <div className="card">
          <EmptyState
            icon={FolderPlus}
            title="Nothing planned yet"
            text="Pick a category below, add what you'll work on, and press play to start tracking."
          />
        </div>
      )}
      <AnimatePresence initial={false}>
        {dayCats.map((cat) => (
          <motion.div
            key={cat.id}
            layout="position"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <CategorySection
              date={date}
              category={cat}
              tasks={tasks.filter((t) => t.date === date && t.categoryId === cat.id)}
              byTask={byTask}
              now={now}
              activeTaskId={active?.taskId ?? null}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      <AddCategoryRow date={date} usedIds={dayCats.map((c) => c.id)} />
    </div>
  );
}

function CategorySection({
  date,
  category,
  tasks,
  byTask,
  now,
  activeTaskId,
}: {
  date: string;
  category: Category;
  tasks: Task[];
  byTask: Map<string, Session[]>;
  now: number;
  activeTaskId: string | null;
}) {
  const [open, setOpen] = useState(true);
  const [showDone, setShowDone] = useState(false);
  const [title, setTitle] = useState("");
  const addTask = useStore((s) => s.addTask);
  const startTask = useStore((s) => s.startTask);
  const removeCategoryFromDay = useStore((s) => s.removeCategoryFromDay);

  const total = tasks.reduce((sum, t) => sum + taskMs(t.id, byTask, now), 0);
  const doneCount = tasks.filter((t) => t.done).length;
  const hasRunning = tasks.some((t) => t.id === activeTaskId);
  const color = solid(category.color);

  const submit = (andStart: boolean) => {
    if (!title.trim()) return;
    const id = addTask(date, category.id, title);
    if (andStart) startTask(id);
    setTitle("");
  };

  return (
    <section className="card overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className="flex cursor-pointer select-none items-center gap-3 px-5 py-3.5"
        style={{ background: `linear-gradient(90deg, ${tint(category.color, 9)}, var(--card) 65%)` }}
      >
        <CategoryIcon icon={category.icon} color={category.color} variant="solid" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[16px] font-bold">{category.name}</h3>
            {tasks.length > 0 && (
              <Pill color={color}>
                {doneCount}/{tasks.length} done
              </Pill>
            )}
            {hasRunning && <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: color }} />}
          </div>
          {tasks.length > 0 ? (
            <div className="mt-1.5 h-1.5 w-full max-w-48 overflow-hidden rounded-full" style={{ background: tint(category.color, 16) }}>
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${(doneCount / tasks.length) * 100}%`, background: color }}
              />
            </div>
          ) : (
            <p className="text-xs text-muted">No tasks yet</p>
          )}
        </div>
        <span className="text-[15px] font-bold tnum" style={{ color: total ? color : undefined }}>
          {formatDuration(total)}
        </span>
        {tasks.length === 0 && (
          <IconButton
            label="Remove from this day"
            onClick={(e) => {
              e.stopPropagation();
              removeCategoryFromDay(date, category.id);
            }}
          >
            <X size={15} />
          </IconButton>
        )}
        <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="border-t border-line">
              <AnimatePresence initial={false}>
                {tasks
                  .filter((t) => !t.done || showDone)
                  .map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      category={category}
                      ms={taskMs(t.id, byTask, now)}
                      running={t.id === activeTaskId}
                    />
                  ))}
              </AnimatePresence>
              {doneCount > 0 && (
                <button
                  onClick={() => setShowDone((v) => !v)}
                  className="flex w-full items-center gap-2 border-b border-line px-5 py-2 text-left text-[12.5px] font-semibold text-muted hover:bg-subtle hover:text-ink"
                >
                  <Check size={14} className="text-emerald-500" strokeWidth={3} />
                  {showDone ? "Hide" : "Show"} {doneCount} completed
                  <ChevronDown size={14} className={`transition-transform ${showDone ? "rotate-180" : ""}`} />
                </button>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(false);
                }}
                className="flex items-center gap-3 px-5 py-3"
              >
                <span
                  className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-[1.5px] border-dashed"
                  style={{ borderColor: color, color }}
                >
                  <Plus size={12} strokeWidth={3} />
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`Add a task to ${category.name}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.shiftKey) {
                      e.preventDefault();
                      submit(true);
                    }
                  }}
                  className="min-w-0 flex-1 bg-transparent py-1 text-[14.5px] placeholder:text-muted"
                />
                {title.trim() ? (
                  <button
                    type="button"
                    onClick={() => submit(true)}
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ background: color }}
                  >
                    <Play size={11} className="fill-current" /> Add & start
                  </button>
                ) : (
                  <span className="hidden text-[11px] text-muted sm:block">Enter to add · Shift+Enter to start</span>
                )}
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function TaskRow({ task, category, ms, running }: { task: Task; category: Category; ms: number; running: boolean }) {
  const startTask = useStore((s) => s.startTask);
  const pauseActive = useStore((s) => s.pauseActive);
  const toggleDone = useStore((s) => s.toggleDone);
  const openTask = useUi((s) => s.openTask);
  const color = solid(category.color);
  // Timers only run on today's tasks; past days are edited via the task's sessions.
  const canPlay = running || task.date === dayKey();
  const noteLinks = splitLinks(task.notes).flatMap((p) => (p.type === "link" ? [p.link] : []));

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      className="group relative flex items-center gap-3 border-b border-line px-5 py-3"
      style={running ? { background: tint(category.color, 7) } : undefined}
    >
      {running && (
        <>
          <span className="absolute inset-y-0 left-0 w-1 rounded-r" style={{ background: color }} />
          <span className="running-sheen pointer-events-none absolute inset-0" />
        </>
      )}

      <button
        aria-label={task.done ? "Mark as not done" : "Mark as done"}
        title={task.done ? "Mark as not done" : "Complete (stops the timer)"}
        onClick={() => toggleDone(task.id)}
        className={`relative grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors ${
          task.done
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-line-strong text-transparent hover:border-emerald-500 hover:text-emerald-500"
        }`}
      >
        <Check size={13} strokeWidth={3} />
      </button>

      {/* div, not button: link chips inside must stay clickable */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => openTask(task.id)}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            openTask(task.id);
          }
        }}
        className="relative flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-x-2.5 gap-y-1 text-left"
      >
        <span className={`min-w-0 truncate text-[14.5px] font-medium ${task.done ? "text-muted line-through" : ""}`}>
          <RichText text={task.title} />
        </span>
        {task.difficulty && <Pill color={DIFFICULTY[task.difficulty].color}>{DIFFICULTY[task.difficulty].label}</Pill>}
        {noteLinks.slice(0, 2).map((l) => (
          <LinkChip key={l.url} link={l} size="sm" />
        ))}
        {task.notes.trim() && (
          <span className="flex items-center gap-1 text-[11px] text-muted">
            <NotebookPen size={11} /> Notes
          </span>
        )}
      </div>

      <span
        className={`relative font-mono text-[13.5px] tnum ${ms === 0 ? "text-muted" : running ? "font-bold" : "text-ink-2"}`}
        style={running ? { color } : undefined}
      >
        {running ? formatClock(ms) : ms > 0 ? formatDuration(ms) : "—"}
      </span>

      {canPlay ? (
        <button
          aria-label={running ? "Pause" : "Start"}
          title={running ? "Pause" : "Start timer"}
          onClick={() => (running ? pauseActive() : startTask(task.id))}
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform hover:scale-105 active:scale-95"
          style={
            running
              ? { background: color, color: "#fff", boxShadow: `0 6px 14px -6px ${color}` }
              : { background: tint(category.color, 13), color }
          }
        >
          {running ? <Pause size={15} className="fill-current" /> : <Play size={15} className="ml-0.5 fill-current" />}
        </button>
      ) : (
        <span className="w-9 shrink-0" />
      )}
    </motion.div>
  );
}

function AddCategoryRow({ date, usedIds }: { date: string; usedIds: string[] }) {
  const categories = useStore((s) => s.categories);
  const addCategory = useStore((s) => s.addCategory);
  const addCategoryToDay = useStore((s) => s.addCategoryToDay);
  const [formOpen, setFormOpen] = useState(false);
  const available = categories.filter((c) => !c.archived && !usedIds.includes(c.id));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[13px] font-semibold text-muted">Add category</span>
      {available.map((c) => (
        <button
          key={c.id}
          onClick={() => addCategoryToDay(date, c.id)}
          className="flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-3.5 text-sm font-semibold transition-transform hover:-translate-y-px"
          style={{ background: tint(c.color, 11), color: solid(c.color) }}
        >
          <CategoryIcon icon={c.icon} color={c.color} size="xs" variant="solid" />
          {c.name}
        </button>
      ))}
      <button
        onClick={() => setFormOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-dashed border-line-strong px-3 py-1.5 text-sm font-semibold text-muted hover:border-accent hover:text-accent"
      >
        <Plus size={14} /> New category
      </button>
      <CategoryForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={(v) => addCategoryToDay(date, addCategory(v.name, v.icon, v.color))}
      />
    </div>
  );
}
