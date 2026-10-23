"use client";

import type { Category } from "@/lib/types";
import { solid } from "@/lib/colors";
import { CategoryIcon } from "@/lib/icons";
import { formatDuration } from "@/lib/time";

/** Stacked bar + legend of time per category */
export function DayBreakdown({
  totals,
  categories,
  emptyText = "Start a timer to see how your time splits across categories.",
}: {
  totals: Map<string, number>;
  categories: Category[];
  emptyText?: string;
}) {
  const rows = categories
    .map((c) => ({ c, ms: totals.get(c.id) ?? 0 }))
    .filter((r) => r.ms > 0)
    .sort((a, b) => b.ms - a.ms);
  const sum = rows.reduce((s, r) => s + r.ms, 0);

  if (sum === 0) return <p className="text-sm text-muted">{emptyText}</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        {rows.map(({ c, ms }) => (
          <div
            key={c.id}
            style={{ width: `${(ms / sum) * 100}%`, background: solid(c.color) }}
            className="h-full transition-[width] duration-500"
            title={c.name}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-2.5">
        {rows.map(({ c, ms }) => (
          <li key={c.id} className="flex items-center gap-2.5 text-sm">
            <CategoryIcon icon={c.icon} color={c.color} size="xs" />
            <span className="flex-1 truncate font-medium">{c.name}</span>
            <span className="text-xs text-muted tnum">{Math.round((ms / sum) * 100)}%</span>
            <span className="w-16 text-right font-medium tnum">{formatDuration(ms)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
