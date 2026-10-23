"use client";

import { solid } from "@/lib/colors";
import { plainText } from "@/lib/links";
import { formatTimeOfDay } from "@/lib/time";
import type { Category, Session, Task } from "@/lib/types";

/** Horizontal bar showing when each session happened during the day */
export function Timeline({
  sessions,
  tasks,
  categories,
  now,
}: {
  sessions: Session[];
  tasks: Task[];
  categories: Category[];
  now: number;
}) {
  if (sessions.length === 0) return null;
  const start = Math.min(...sessions.map((s) => s.start));
  const end = Math.max(...sessions.map((s) => s.end ?? now));
  const span = Math.max(end - start, 1);
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const catById = new Map(categories.map((c) => [c.id, c]));
  return (
    <div>
      <div className="relative h-5 overflow-hidden rounded-md bg-card-2">
        {sessions.map((s) => {
          const t = taskById.get(s.taskId);
          const c = t && catById.get(t.categoryId);
          return (
            <div
              key={s.id}
              title={`${t ? plainText(t.title) : ""}: ${formatTimeOfDay(s.start)} – ${s.end ? formatTimeOfDay(s.end) : "now"}`}
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
      <div className="mt-1 flex justify-between text-[11px] text-muted tnum">
        <span>{formatTimeOfDay(start)}</span>
        <span>{formatTimeOfDay(end)}</span>
      </div>
    </div>
  );
}
