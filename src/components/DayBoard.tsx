"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, NotebookPen, Pause, Play, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useActiveSession, useNow } from "@/lib/hooks";
import { categoriesForDay, sessionsByTask, taskMs } from "@/lib/selectors";
import { dayKey, formatClock, formatDuration } from "@/lib/time";
import { solid, tint } from "@/lib/colors";
import { useUi } from "@/lib/ui-store";
import { smallBurst } from "@/lib/celebrate";
import type { Category, Session, Task } from "@/lib/types";
import { CategoryForm } from "./CategoryForm";
import { Chip, EmptyState, IconButton } from "./ui";

const DIFF_COLORS = { easy: "#7bd389", medium: "#f7c531", hard: "#ff6b6b" } as const;

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
            emoji="🌱"
            title="Blank page, fresh start"
            text="Pick a category below (like DSA or Dev), then add what you're working on and hit play."
          />
        </div>
      )}
      <AnimatePresence initial={false}>
        {dayCats.map((cat) => (
          <motion.div
            key={cat.id}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
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
        className="flex w-full cursor-pointer select-none items-center gap-3 px-4 py-3 text-left md:px-5"
        style={{ background: tint(category.color, 22) }}
      >
        <span
          className={`pop-btn grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-2xl ${
            hasRunning ? "animate-wiggle" : ""
          }`}
          style={{ background: color }}
        >
          {category.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-xl font-semibold">{category.name}</h3>
          <p className="text-sm font-semibold text-muted">
            {tasks.length === 0 ? "Nothing yet" : `${doneCount}/${tasks.length} done`}
          </p>
        </div>
        <span className="rounded-full border-2 border-line bg-card px-3 py-1 font-display font-semibold tabular-nums">
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
            <X size={16} />
          </IconButton>
        )}
        <ChevronDown size={22} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 border-t-2 border-line p-3 md:p-4">
              <AnimatePresence initial={false}>
                {tasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    category={category}
                    ms={taskMs(t.id, byTask, now)}
                    running={t.id === activeTaskId}
                  />
                ))}
              </AnimatePresence>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(false);
                }}
                className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-soft-line px-3 py-1.5 focus-within:border-line"
              >
                <Plus size={18} className="shrink-0 text-muted" />
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`Add to ${category.name}… (Enter to add, ⇧Enter to add & start)`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.shiftKey) {
                      e.preventDefault();
                      submit(true);
                    }
                  }}
                  className="min-w-0 flex-1 bg-transparent py-1.5 font-semibold placeholder:font-normal placeholder:text-muted"
                />
                {title.trim() && (
                  <button
                    type="button"
                    onClick={() => submit(true)}
                    className="flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold text-white"
                    style={{ background: color }}
                  >
                    <Play size={14} className="fill-current" /> Start
                  </button>
                )}
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function TaskRow({
  task,
  category,
  ms,
  running,
}: {
  task: Task;
  category: Category;
  ms: number;
  running: boolean;
}) {
  const startTask = useStore((s) => s.startTask);
  const pauseActive = useStore((s) => s.pauseActive);
  const toggleDone = useStore((s) => s.toggleDone);
  const openTask = useUi((s) => s.openTask);
  const color = solid(category.color);
  // Timers only run on today's tasks; past days are edited via the task's sessions.
  const canPlay = running || task.date === dayKey();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl border-2 px-2.5 py-2 transition-colors ${
        running ? "border-line" : "border-transparent hover:border-soft-line"
      }`}
      style={running ? { background: tint(category.color, 26) } : undefined}
    >
      {running && <div className="stripes pointer-events-none absolute inset-0 opacity-60" />}

      {canPlay ? (
        <motion.button
          whileTap={{ scale: 0.85 }}
          aria-label={running ? "Pause" : "Start"}
          onClick={() => (running ? pauseActive() : startTask(task.id))}
          className="pop-btn relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-white"
          style={{ background: running ? "var(--ink)" : color }}
        >
          {running ? <Pause size={18} className="fill-current" /> : <Play size={18} className="ml-0.5 fill-current" />}
        </motion.button>
      ) : (
        <span className="h-3 w-3 shrink-0 rounded-full border-2 border-line" style={{ background: color }} />
      )}

      <button onClick={() => openTask(task.id)} className="relative min-w-0 flex-1 text-left">
        <p className={`truncate font-bold ${task.done ? "text-muted line-through decoration-2" : ""}`}>
          {task.title}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          {task.difficulty && (
            <Chip color={DIFF_COLORS[task.difficulty]} className="!py-0 !text-[10px] capitalize text-[#2b2240]">
              {task.difficulty}
            </Chip>
          )}
          {task.notes.trim() && (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-muted">
              <NotebookPen size={12} /> notes
            </span>
          )}
          {running && <span className="text-xs font-bold" style={{ color }}>● tracking</span>}
        </div>
      </button>

      <span
        className={`relative font-display text-lg font-semibold tabular-nums ${ms === 0 ? "text-muted" : ""}`}
      >
        {running ? formatClock(ms) : ms > 0 ? formatDuration(ms) : "–"}
      </span>

      <motion.button
        whileTap={{ scale: 0.8 }}
        aria-label={task.done ? "Mark not done" : "Finish"}
        title={task.done ? "Mark not done" : "Finish (stop timer & mark done)"}
        onClick={(e) => {
          if (!task.done) {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            smallBurst((r.left + r.width / 2) / window.innerWidth, r.top / window.innerHeight);
          }
          toggleDone(task.id);
        }}
        className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 transition-colors ${
          task.done ? "border-line bg-[#7bd389] text-[#2b2240]" : "border-soft-line text-muted hover:border-line"
        }`}
      >
        <Check size={18} strokeWidth={3} />
      </motion.button>
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
      <span className="mr-1 text-sm font-bold text-muted">Add a category:</span>
      {available.map((c) => (
        <motion.button
          key={c.id}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => addCategoryToDay(date, c.id)}
          className="flex items-center gap-1.5 rounded-full border-2 border-line px-3 py-1.5 font-display font-medium"
          style={{ background: tint(c.color, 30) }}
        >
          <span>{c.emoji}</span> {c.name}
        </motion.button>
      ))}
      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setFormOpen(true)}
        className="flex items-center gap-1 rounded-full border-2 border-dashed border-line px-3 py-1.5 font-display font-medium text-muted hover:text-ink"
      >
        <Plus size={16} /> New
      </motion.button>
      <CategoryForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={(v) => addCategoryToDay(date, addCategory(v.name, v.emoji, v.color))}
      />
    </div>
  );
}
