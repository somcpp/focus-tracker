"use client";

import { Clock, Pause, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { useUi } from "@/lib/ui-store";
import { dayKey, formatClock, formatDuration, fromTimeInput, prettyDate, toTimeInput } from "@/lib/time";
import { solid, tint } from "@/lib/colors";
import type { Difficulty, Task } from "@/lib/types";
import { Button, IconButton, Modal } from "./ui";

const DIFFS: { key: Difficulty; label: string; color: string }[] = [
  { key: "easy", label: "Easy", color: "#7bd389" },
  { key: "medium", label: "Medium", color: "#f7c531" },
  { key: "hard", label: "Hard", color: "#ff6b6b" },
];

/** Global modal for viewing / editing a task: title, notes, difficulty, time sessions */
export function TaskDetail() {
  const openTaskId = useUi((s) => s.openTaskId);
  const openTask = useUi((s) => s.openTask);
  const task = useStore((s) => s.tasks.find((t) => t.id === openTaskId));
  const close = () => openTask(null);

  return (
    <Modal open={!!task} onClose={close} wide title={task ? "Task details" : ""}>
      {task && <Body key={task.id} task={task} onClose={close} />}
    </Modal>
  );
}

function Body({ task, onClose }: { task: Task; onClose: () => void }) {
  const category = useStore((s) => s.categories.find((c) => c.id === task.categoryId));
  const allSessions = useStore((s) => s.sessions);
  const sessions = allSessions.filter((s) => s.taskId === task.id).sort((a, b) => a.start - b.start);
  const running = sessions.some((s) => s.end === null);
  const now = useNow(running);
  const { updateTask, deleteTask, startTask, pauseActive, updateSession, deleteSession, addManualSession } =
    useStore.getState();
  const [manual, setManual] = useState("");
  const total = sessions.reduce((sum, s) => sum + ((s.end ?? now) - s.start), 0);
  const color = category ? solid(category.color) : "var(--accent)";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        {category && (
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-line text-xl"
            style={{ background: color }}
          >
            {category.emoji}
          </span>
        )}
        <input
          value={task.title}
          onChange={(e) => updateTask(task.id, { title: e.target.value })}
          className="w-full rounded-xl bg-transparent px-2 py-1 font-display text-2xl font-semibold hover:bg-card-2 focus:bg-card-2"
        />
      </div>

      <div
        className="flex items-center gap-4 rounded-2xl border-2 border-line p-4"
        style={{ background: category ? tint(category.color, 20) : undefined }}
      >
        {(running || task.date === dayKey()) && (
          <button
            onClick={() => (running ? pauseActive() : startTask(task.id))}
            className="pop-btn grid h-14 w-14 place-items-center rounded-full text-white"
            style={{ background: running ? "var(--ink)" : color }}
          >
            {running ? <Pause className="fill-current" /> : <Play className="ml-1 fill-current" />}
          </button>
        )}
        <div>
          <p className="text-sm font-bold text-muted">
            {category?.name} · {prettyDate(task.date, { month: "short", day: "numeric" })}
          </p>
          <p className="font-display text-3xl font-semibold tabular-nums">{formatClock(total)}</p>
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 font-bold">
          <input
            type="checkbox"
            checked={task.done}
            onChange={() => useStore.getState().toggleDone(task.id)}
            className="h-5 w-5 accent-[#7bd389]"
          />
          Done
        </label>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-muted">Difficulty (optional)</p>
        <div className="flex gap-2">
          {DIFFS.map((d) => (
            <button
              key={d.key}
              onClick={() => updateTask(task.id, { difficulty: task.difficulty === d.key ? null : d.key })}
              className={`rounded-full border-2 px-4 py-1.5 font-display font-semibold transition-all ${
                task.difficulty === d.key ? "border-line text-[#2b2240]" : "border-soft-line text-muted"
              }`}
              style={task.difficulty === d.key ? { background: d.color } : undefined}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-muted">Notes</p>
        <textarea
          value={task.notes}
          onChange={(e) => updateTask(task.id, { notes: e.target.value })}
          rows={5}
          placeholder="Approach, mistakes, links, what to revisit…"
          className="w-full resize-y rounded-2xl border-2 border-line bg-card-2 p-3 leading-relaxed"
        />
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1 text-sm font-bold text-muted">
          <Clock size={14} /> Sessions ({sessions.length})
        </p>
        <div className="flex flex-col gap-1.5">
          {sessions.length === 0 && <p className="text-sm text-muted">No time tracked yet.</p>}
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-xl bg-card-2 px-3 py-1.5">
              <input
                type="time"
                value={toTimeInput(s.start)}
                onChange={(e) => e.target.value && updateSession(s.id, { start: fromTimeInput(s.start, e.target.value) })}
                className="rounded-lg bg-transparent font-semibold"
              />
              <span className="text-muted">→</span>
              {s.end === null ? (
                <span className="font-bold" style={{ color }}>
                  running
                </span>
              ) : (
                <input
                  type="time"
                  value={toTimeInput(s.end)}
                  onChange={(e) => e.target.value && updateSession(s.id, { end: fromTimeInput(s.end!, e.target.value) })}
                  className="rounded-lg bg-transparent font-semibold"
                />
              )}
              <span className="ml-auto font-display font-semibold tabular-nums">
                {formatDuration((s.end ?? now) - s.start)}
              </span>
              <IconButton label="Delete session" onClick={() => deleteSession(s.id)} className="!h-7 !w-7">
                <Trash2 size={14} />
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
            placeholder="Forgot the timer? add minutes"
            className="w-full rounded-xl border-2 border-soft-line bg-transparent px-3 py-1.5 focus:border-line"
          />
          <Button type="submit" variant="plain" className="!py-1.5 shrink-0">
            <Plus size={16} /> Add
          </Button>
        </form>
      </div>

      <div className="flex justify-between border-t-2 border-soft-line pt-4">
        <Button
          variant="ghost"
          className="!text-[#ff6b6b]"
          onClick={() => {
            if (confirm(`Delete "${task.title}" and its tracked time?`)) {
              deleteTask(task.id);
              onClose();
            }
          }}
        >
          <Trash2 size={16} /> Delete task
        </Button>
        <Button onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}
