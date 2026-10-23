"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { dayKey, formatDuration, parseDayKey } from "@/lib/time";
import { HEAT, heatLevel } from "@/lib/colors";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/**
 * Compact month calendar. Tracked days get a heat-colored background,
 * today is a solid accent circle. Clicking a day either opens its log or
 * calls onSelect when provided.
 */
export function MiniCalendar({
  today,
  totals,
  goalMinutes,
  selected,
  onSelect,
  title = "Calendar",
}: {
  today: string;
  totals: Map<string, number>;
  goalMinutes: number;
  selected?: string;
  onSelect?: (d: string) => void;
  title?: string;
}) {
  const [month, setMonth] = useState(() => {
    const d = parseDayKey(selected ?? today);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const first = new Date(month.y, month.m, 1);
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => dayKey(new Date(month.y, month.m, i + 1))),
  ];
  const shift = (delta: number) =>
    setMonth(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  return (
    <div>
      <div className="mb-3 flex items-center gap-1">
        <h2 className="flex-1 text-[15px] font-semibold">{title}</h2>
        <span className="mr-1 text-[13px] font-medium text-ink-2">
          {first.toLocaleDateString([], { month: "short", year: "numeric" })}
        </span>
        <button onClick={() => shift(-1)} aria-label="Previous month" className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-card-2 hover:text-ink">
          <ChevronLeft size={16} />
        </button>
        <button onClick={() => shift(1)} aria-label="Next month" className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-card-2 hover:text-ink">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-[11px] font-medium text-muted">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const ms = totals.get(d) ?? 0;
          const lvl = heatLevel(ms, goalMinutes);
          const isToday = d === today;
          const isSel = d === selected;
          const future = d > today;
          const cls = `mx-auto grid h-8 w-8 place-items-center rounded-full text-[12.5px] font-medium tnum transition-shadow ${
            isToday
              ? "bg-accent font-semibold text-white shadow-[0_4px_10px_-4px_var(--accent)]"
              : future
                ? "text-muted/60"
                : lvl >= 3
                  ? "font-semibold text-white"
                  : "text-ink-2 hover:ring-2 hover:ring-accent/30"
          } ${isSel && !isToday ? "ring-2 ring-accent" : ""}`;
          const style = !isToday && lvl > 0 ? { background: HEAT[lvl] } : undefined;
          const title = `${parseDayKey(d).toLocaleDateString([], { month: "short", day: "numeric" })} · ${formatDuration(ms)}`;
          const label = parseDayKey(d).getDate();
          if (future) {
            return (
              <span key={d} className={cls}>
                {label}
              </span>
            );
          }
          return onSelect ? (
            <button key={d} onClick={() => onSelect(d)} className={cls} style={style} title={title}>
              {label}
            </button>
          ) : (
            <Link key={d} href={`/day/${d}`} className={cls} style={style} title={title}>
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
