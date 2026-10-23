"use client";

import { Check, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { useUi } from "@/lib/ui-store";
import { dayKey, formatClock, formatDuration, fromTimeInput, prettyDate, toTimeInput } from "@/lib/time";
import { DIFFICULTY, solid, tint } from "@/lib/colors";
import { CategoryIcon } from "@/lib/icons";
import type { Difficulty, Task } from "@/lib/types";
import { Button, IconButton, Modal } from "./ui";
import { LinkChip, RichText } from "./RichText";
import { hasLink, plainText, splitLinks } from "@/lib/links";

/** Global modal for viewing / editing a task: title, notes, difficulty, time sessions */
export function TaskDetail() {
  const openTaskId = useUi((s) => s.openTaskId);
  const openTask = useUi((s) => s.openTask);
  const task = useStore((s) => s.tasks.find((t) => t.id === openTaskId));
  const close = () => openTask(null);

  return (
    <Modal open={!!task} onClose={close} wide title="Task details">
      {task && <Body key={task.id} task={task} onClose={close} />}
    </Modal>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-xs font-medium text-muted">{children}</p>;
}

function Body({ task, onClose }: { task: Task; onClose: () => void }) {
  const category = useStore((s) => s.categories.find((c) => c.id === task.categoryId));
  const allSessions = useStore((s) => s.sessions);
  const sessions = allSessions.filter((s) => s.taskId === task.id).sort((a, b) => a.start - b.start);
  const running = sessions.some((s) => s.end === null);
  const now = useNow(running);
  const { updateTask, deleteTask, startTask, pauseActive, toggleDone, updateSession, deleteSession, addManualSession } =
    useStore.getState();
  const [manual, setManual] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const titleHasLink = hasLink(task.title);
  const noteLinks = splitLinks(task.notes).flatMap((p) => (p.type === "link" ? [p.link] : []));
  const total = sessions.reduce((sum, s) => sum + ((s.end ?? now) - s.start), 0);
  const color = category ? solid(category.color) : "var(--accent)";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        {category && <CategoryIcon icon={category.icon} color={category.color} />}
        <div className="min-w-0 flex-1">
          {titleHasLink && !editingTitle ? (
            // Show links as chips; click anywhere else on the title to edit the raw text
            <div
              role="button"
              tabIndex={0}
              title="Click to edit"
              onClick={() => setEditingTitle(true)}
              onKeyDown={(e) => e.key === "Enter" && setEditingTitle(true)}
              className="-mx-1.5 flex min-h-9 cursor-text flex-wrap items-center gap-1 rounded-md px-1.5 py-0.5 text-lg font-semibold hover:bg-card-2"
            >
              <RichText text={task.title} />
              <Pencil size={13} className="ml-1 text-muted" />
            </div>
          ) : (
            <input
              value={task.title}
              autoFocus={editingTitle}
              onChange={(e) => updateTask(task.id, { title: e.target.value })}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
              placeholder="Task name or paste a link"
              className="-mx-1.5 w-full rounded-md bg-transparent px-1.5 py-0.5 text-lg font-semibold hover:bg-card-2 focus:bg-card-2"
            />
          )}
          <p className="text-xs text-muted">
            {category?.name} · {prettyDate(task.date, { weekday: "short", month: "short", day: "numeric" })}
          </p>
        </div>
      </div>

      <div
        className="flex items-center gap-4 rounded-xl border border-line px-4 py-3"
        style={{ background: category ? tint(category.color, 6) : undefined }}
      >
        {(running || task.date === dayKey()) && (
          <button
            onClick={() => (running ? pauseActive() : startTask(task.id))}
            className="grid h-11 w-11 place-items-center rounded-full text-white shadow-sm transition-transform hover:scale-105"
            style={{ background: color }}
            aria-label={running ? "Pause" : "Start"}
          >
            {running ? <Pause size={18} className="fill-current" /> : <Play size={18} className="ml-0.5 fill-current" />}
          </button>
        )}
        <div>
          <p className="text-xs text-muted">Time tracked</p>
          <p className="font-mono text-2xl font-semibold tnum">{formatClock(total)}</p>
        </div>
        <Button
          variant={task.done ? "success" : "secondary"}
          size="sm"
          className="ml-auto"
          onClick={() => toggleDone(task.id)}
        >
          <Check size={14} strokeWidth={3} /> {task.done ? "Completed" : "Mark complete"}
        </Button>
      </div>

      <div>
        <Label>Difficulty</Label>
        <div className="flex gap-2">
          {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => {
            const sel = task.difficulty === d;
            const c = DIFFICULTY[d].color;
            return (
              <button
                key={d}
                onClick={() => updateTask(task.id, { difficulty: sel ? null : d })}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  sel ? "border-transparent" : "border-line text-muted hover:text-ink"
                }`}
                style={sel ? { color: c, background: `color-mix(in srgb, ${c} 13%, transparent)` } : undefined}
              >
                {DIFFICULTY[d].label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>Notes</Label>
        <textarea
          value={task.notes}
          onChange={(e) => updateTask(task.id, { notes: e.target.value })}
          rows={5}
          placeholder="Approach, edge cases, links, what to revisit…"
          className="field w-full resize-y p-3 text-sm leading-relaxed"
        />
        {noteLinks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {noteLinks.map((l, i) => (
              <LinkChip key={`${l.url}-${i}`} link={l} />
            ))}
          </div>
        )}
      </div>

      <div>
        <Label>Sessions · {sessions.length}</Label>
        <div className="overflow-hidden rounded-xl border border-line">
          {sessions.length === 0 && <p className="px-3 py-2.5 text-sm text-muted">No time tracked yet.</p>}
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-sm last:border-b-0">
              <input
                type="time"
                value={toTimeInput(s.start)}
                onChange={(e) => e.target.value && updateSession(s.id, { start: fromTimeInput(s.start, e.target.value) })}
                className="rounded-md bg-transparent px-1 tnum hover:bg-card-2"
              />
              <span className="text-muted">–</span>
              {s.end === null ? (
                <span className="px-1 font-medium" style={{ color }}>
                  now
                </span>
              ) : (
                <input
                  type="time"
                  value={toTimeInput(s.end)}
                  onChange={(e) => e.target.value && updateSession(s.id, { end: fromTimeInput(s.end!, e.target.value) })}
                  className="rounded-md bg-transparent px-1 tnum hover:bg-card-2"
                />
              )}
              <span className="ml-auto font-mono text-xs text-muted tnum">{formatDuration((s.end ?? now) - s.start)}</span>
              <IconButton label="Delete session" onClick={() => deleteSession(s.id)} className="!h-7 !w-7">
                <Trash2 size={13} />
              </IconButton>
            </div>
          ))}
        </div>
        <form
          className="mt-2 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const m = parseInt(manual, 10);
            if (m > 0) addManualSession(task.id, m);
            setManual("");
          }}
        >
          <input
            type="number"
            min={1}
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Forgot the timer? Add minutes manually"
            className="field h-9 w-full px-3 text-sm"
          />
          <Button type="submit" variant="secondary">
            <Plus size={15} /> Add
          </Button>
        </form>
      </div>

      <div className="flex justify-between border-t border-line pt-4">
        <Button
          variant="ghost"
          className="!text-red-600 hover:!bg-red-50 dark:hover:!bg-red-950/40"
          onClick={() => {
            if (confirm(`Delete "${plainText(task.title)}" and its tracked time?`)) {
              deleteTask(task.id);
              onClose();
            }
          }}
        >
          <Trash2 size={15} /> Delete task
        </Button>
        <Button onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}
