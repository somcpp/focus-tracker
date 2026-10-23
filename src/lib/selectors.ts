import type { Category, Session, Task } from "./types";
import { addDays, dayKey } from "./time";

export const sessionMs = (s: Session, now: number) => (s.end ?? now) - s.start;

export function sessionsByTask(sessions: Session[]): Map<string, Session[]> {
  const map = new Map<string, Session[]>();
  for (const s of sessions) {
    const arr = map.get(s.taskId);
    if (arr) arr.push(s);
    else map.set(s.taskId, [s]);
  }
  return map;
}

export function taskMs(taskId: string, byTask: Map<string, Session[]>, now: number): number {
  return (byTask.get(taskId) ?? []).reduce((sum, s) => sum + sessionMs(s, now), 0);
}

/** Total tracked ms per day key (time is attributed to the task's day) */
export function dayTotals(tasks: Task[], sessions: Session[], now: number): Map<string, number> {
  const taskDate = new Map(tasks.map((t) => [t.id, t.date]));
  const totals = new Map<string, number>();
  for (const s of sessions) {
    const d = taskDate.get(s.taskId);
    if (!d) continue;
    totals.set(d, (totals.get(d) ?? 0) + sessionMs(s, now));
  }
  return totals;
}

/** Total ms per category for the given set of day keys */
export function categoryTotals(
  tasks: Task[],
  sessions: Session[],
  days: Set<string> | null,
  now: number,
): Map<string, number> {
  const taskCat = new Map<string, string>();
  for (const t of tasks) if (!days || days.has(t.date)) taskCat.set(t.id, t.categoryId);
  const totals = new Map<string, number>();
  for (const s of sessions) {
    const c = taskCat.get(s.taskId);
    if (!c) continue;
    totals.set(c, (totals.get(c) ?? 0) + sessionMs(s, now));
  }
  return totals;
}

export function streaks(totals: Map<string, number>, minMinutes: number, today = dayKey()) {
  const hit = (d: string) => (totals.get(d) ?? 0) >= minMinutes * 60000;
  // Current streak: today counts if met, otherwise start counting from yesterday.
  let current = 0;
  let cursor = hit(today) ? today : addDays(today, -1);
  while (hit(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  // Best streak across history
  const days = Array.from(totals.keys()).filter(hit).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best: Math.max(best, current), todayHit: hit(today) };
}

/** Categories that should appear on a given day, in display order */
export function categoriesForDay(
  date: string,
  categories: Category[],
  tasks: Task[],
  dayCategories: Record<string, string[]>,
): Category[] {
  const ids = [...(dayCategories[date] ?? [])];
  for (const t of tasks) if (t.date === date && !ids.includes(t.categoryId)) ids.push(t.categoryId);
  const byId = new Map(categories.map((c) => [c.id, c]));
  return ids.map((id) => byId.get(id)).filter((c): c is Category => !!c);
}
