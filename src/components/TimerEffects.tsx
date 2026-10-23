"use client";

import { useEffect, useState } from "react";
import { Coffee } from "lucide-react";
import { useStore } from "@/lib/store";
import { useActiveSession, useNow, useToday } from "@/lib/hooks";
import { useUi } from "@/lib/ui-store";
import { dayTotals } from "@/lib/selectors";
import { formatClock, formatDuration, formatTimeOfDay } from "@/lib/time";
import { chime } from "@/lib/celebrate";
import { Button, Modal, toast } from "./ui";

const GOAL_KEY = "grindlog-goal-celebrated";

/** Global timer side effects: tab title, idle check, pomodoro, goal confetti, shortcuts */
export function TimerEffects() {
  const active = useActiveSession();
  const breakUntil = useUi((s) => s.breakUntil);
  const now = useNow(!!active || !!breakUntil);
  const today = useToday();
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const settings = useStore((s) => s.settings);
  const pauseActive = useStore((s) => s.pauseActive);
  const startTask = useStore((s) => s.startTask);
  const setBreak = useUi((s) => s.setBreak);

  const task = active ? tasks.find((t) => t.id === active.taskId) : undefined;
  const elapsed = active ? now - active.start : 0;

  // --- tab title
  useEffect(() => {
    if (active && task) {
      const total = sessions
        .filter((s) => s.taskId === task.id)
        .reduce((sum, s) => sum + ((s.end ?? now) - s.start), 0);
      document.title = `▶ ${formatClock(total)} · ${task.title}`;
    } else if (breakUntil) {
      document.title = `☕ Break ${formatClock(breakUntil - now)}`;
    } else {
      document.title = "GrindLog";
    }
  }, [active, task, sessions, now, breakUntil]);

  // --- pomodoro: end focus block
  useEffect(() => {
    if (!active || !settings.pomodoro.enabled) return;
    if (elapsed >= settings.pomodoro.focusMinutes * 60000) {
      pauseActive(active.start + settings.pomodoro.focusMinutes * 60000);
      setBreak(Date.now() + settings.pomodoro.breakMinutes * 60000, active.taskId);
      chime();
      toast({ tone: "info", text: `Focus block complete. Take a ${settings.pomodoro.breakMinutes}-minute break.` }, 6000);
    }
  }, [active, elapsed, settings.pomodoro, pauseActive, setBreak]);

  // --- pomodoro: end break
  useEffect(() => {
    if (!breakUntil || now < breakUntil) return;
    const taskId = useUi.getState().breakTaskId;
    setBreak(null);
    chime();
    toast(
      {
        tone: "info",
        text: "Break is over.",
        action: taskId ? { label: "Resume", onClick: () => startTask(taskId) } : undefined,
      },
      15000,
    );
  }, [breakUntil, now, setBreak, startTask]);

  // A manual start cancels any running break
  useEffect(() => {
    if (active && breakUntil) setBreak(null);
  }, [active, breakUntil, setBreak]);

  // --- goal celebration (once per day)
  const todayMs = dayTotals(tasks, sessions, now).get(today) ?? 0;
  const goalHit = todayMs >= settings.dailyGoalMinutes * 60000;
  useEffect(() => {
    if (!goalHit || localStorage.getItem(GOAL_KEY) === today) return;
    localStorage.setItem(GOAL_KEY, today);
    chime();
    toast({ tone: "success", text: `Daily goal reached · ${formatDuration(todayMs)} tracked` }, 6000);
  }, [goalHit, today, todayMs]);

  // --- keyboard: Space toggles the most recent task
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.code !== "Space" || el.closest("input, textarea, button, [contenteditable]")) return;
      if (document.querySelector("[role=dialog]")) return;
      e.preventDefault();
      const st = useStore.getState();
      const running = st.sessions.find((s) => s.end === null);
      if (running) {
        st.pauseActive();
        return;
      }
      const last = [...st.sessions].sort((a, b) => b.start - a.start)[0];
      const lastTask = last && st.tasks.find((t) => t.id === last.taskId && !t.done);
      if (lastTask) st.startTask(lastTask.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <IdleCheck elapsed={elapsed} />
      {breakUntil && <BreakBanner until={breakUntil} now={now} onSkip={() => setBreak(null)} />}
    </>
  );
}

function IdleCheck({ elapsed }: { elapsed: number }) {
  const active = useActiveSession();
  const limitMin = useStore((s) => s.settings.idleLimitMinutes);
  const pauseActive = useStore((s) => s.pauseActive);
  const [snoozed, setSnoozed] = useState<{ id: string; until: number } | null>(null);

  if (!active || limitMin <= 0) return null;
  const threshold = snoozed?.id === active.id ? snoozed.until : limitMin * 60000;
  const open = elapsed >= threshold;

  const limitAt = active.start + threshold;
  return (
    <Modal open={open} onClose={() => setSnoozed({ id: active.id, until: elapsed + limitMin * 60000 })} title="Are you still working?">
      <p className="mb-5 text-sm text-muted">
        This timer has been running for <span className="font-semibold text-ink">{formatDuration(elapsed)}</span>.
        If you stepped away, you can stop it at the point you left.
      </p>
      <div className="flex flex-col gap-2">
        <Button onClick={() => setSnoozed({ id: active.id, until: elapsed + limitMin * 60000 })}>
          Yes, keep tracking
        </Button>
        <Button variant="secondary" onClick={() => pauseActive(limitAt)}>
          Stop at {formatTimeOfDay(limitAt)}
        </Button>
        <Button variant="ghost" onClick={() => pauseActive()}>
          Stop now
        </Button>
      </div>
    </Modal>
  );
}

function BreakBanner({ until, now, onSkip }: { until: number; now: number; onSkip: () => void }) {
  return (
    <div className="fixed left-1/2 top-4 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-line bg-card py-2 pl-3 pr-2 text-sm shadow-lg">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/12 text-amber-500">
        <Coffee size={15} />
      </span>
      <span className="font-medium">Break</span>
      <span className="font-mono tnum text-muted">{formatClock(until - now)}</span>
      <Button size="sm" variant="secondary" onClick={onSkip}>
        Skip
      </Button>
    </div>
  );
}
