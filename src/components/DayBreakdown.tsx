"use client";

import { motion } from "motion/react";
import type { Category } from "@/lib/types";
import { solid } from "@/lib/colors";
import { formatDuration } from "@/lib/time";

/** Stacked bar + legend of time per category */
export function DayBreakdown({
  totals,
  categories,
}: {
  totals: Map<string, number>;
  categories: Category[];
}) {
  const rows = categories
    .map((c) => ({ c, ms: totals.get(c.id) ?? 0 }))
    .filter((r) => r.ms > 0)
    .sort((a, b) => b.ms - a.ms);
  const sum = rows.reduce((s, r) => s + r.ms, 0);

  if (sum === 0) {
    return <p className="text-sm text-muted">Start a timer and your split shows up here 🍰</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-5 overflow-hidden rounded-full border-2 border-line">
        {rows.map(({ c, ms }) => (
          <motion.div
            key={c.id}
            initial={{ width: 0 }}
            animate={{ width: `${(ms / sum) * 100}%` }}
            style={{ background: solid(c.color) }}
            className="h-full border-r-2 border-line last:border-r-0"
            title={c.name}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-1.5">
        {rows.map(({ c, ms }) => (
          <li key={c.id} className="flex items-center gap-2 font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-lg text-sm" style={{ background: solid(c.color) }}>
              {c.emoji}
            </span>
            <span className="flex-1 truncate">{c.name}</span>
            <span className="text-sm text-muted">{Math.round((ms / sum) * 100)}%</span>
            <span className="w-16 text-right font-display tabular-nums">{formatDuration(ms)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
