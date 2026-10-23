"use client";

import { plainText } from "@/lib/links";
import { Check, Pause, Play } from "lucide-react";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useActiveSession, useNow } from "@/lib/hooks";
import { sessionsByTask, taskMs } from "@/lib/selectors";
import { formatClock } from "@/lib/time";
import { solid } from "@/lib/colors";
import { CategoryIcon } from "@/lib/icons";
import { toast } from "./ui";

/** Ring timer for the task currently being tracked (or a resume shortcut) */
export function FocusTimer({ today }: { today: string }) {
  const active = useActiveSession();
  const now = useNow(!!active);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const categories = useStore((s) => s.categories);
  const pomodoro = useStore((s) => s.settings.pomodoro);
  const updateSettings = useStore((s) => s.updateSettings);
  const { startTask, pauseActive, finishTask } = useStore.getState();
  const byTask = useMemo(() => sessionsByTask(sessions), [sessions]);

  const runningTask = active ? tasks.find((t) => t.id === active.taskId) : undefined;
  // When idle, offer the most recently tracked unfinished task from today
  const lastTask = !active
    ? [...sessions]
        .sort((a, b) => b.start - a.start)
        .map((s) => tasks.find((t) => t.id === s.taskId))
        .find((t) => t && !t.done && t.date === today)
    : undefined;
  const task = runningTask ?? lastTask;
  const cat = task ? categories.find((c) => c.id === task.categoryId) : undefined;
  const color = cat ? solid(cat.color) : "var(--accent)";

  const sessionElapsed = active ? now - active.start : 0;
  const cycle = pomodoro.enabled ? pomodoro.focusMinutes * 60000 : 3600000;
  const progress = active ? (pomodoro.enabled ? sessionElapsed / cycle : (sessionElapsed % cycle) / cycle) : 0;
  const display = pomodoro.enabled
    ? formatClock(Math.max(0, cycle - sessionElapsed))
    : formatClock(task ? taskMs(task.id, byTask, now) : 0);

  const size = 184;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Focus timer</h2>
        <div className="flex rounded-lg bg-card-2 p-0.5 text-[12px] font-semibold">
          {[
            { on: false, label: "Stopwatch" },
            { on: true, label: "Pomodoro" },
          ].map((m) => (
            <button
              key={m.label}
              onClick={() => updateSettings({ pomodoro: { ...pomodoro, enabled: m.on } })}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                pomodoro.enabled === m.on ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent-soft)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={active ? color : "var(--accent)"}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.min(1, active ? progress : 1))}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="font-mono text-[34px] font-bold leading-none tracking-tight tnum">{display}</span>
          <button
            disabled={!task}
            onClick={() => (active ? pauseActive() : task && startTask(task.id))}
            aria-label={active ? "Pause" : "Start"}
            className="grid h-11 w-11 place-items-center rounded-full text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
            style={{ background: active ? color : "var(--accent)", boxShadow: `0 8px 16px -8px ${active ? color : "var(--accent)"}` }}
          >
            {active ? <Pause size={18} className="fill-current" /> : <Play size={18} className="ml-0.5 fill-current" />}
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-xl bg-card-2 px-3 py-2.5">
        {task && cat ? (
          <>
            <CategoryIcon icon={cat.icon} color={cat.color} size="sm" variant="solid" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-muted">{active ? "Working on" : "Resume"}</p>
              <p className="truncate text-sm font-semibold">{plainText(task.title)}</p>
            </div>
            {active && runningTask && (
              <button
                onClick={() => {
                  finishTask(runningTask.id);
                  toast({ tone: "success", text: `Completed “${plainText(runningTask.title)}”` });
                }}
                title="Complete task"
                className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600"
              >
                <Check size={16} strokeWidth={3} />
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">Press play on any task to start tracking.</p>
        )}
      </div>
    </div>
  );
}
