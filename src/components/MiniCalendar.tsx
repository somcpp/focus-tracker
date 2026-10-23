"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { dayKey, formatDuration, parseDayKey } from "@/lib/time";
import { HEAT, heatLevel } from "@/lib/colors";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export type MonthRef = { y: number; m: number };

export const monthOf = (key: string): MonthRef => {
  const d = parseDayKey(key);
  return { y: d.getFullYear(), m: d.getMonth() };
};

/**
 * Compact month calendar. With `heat`, tracked days get a heat-colored
 * background; `marks` adds a small colored dot under a day. Today is a solid
 * accent circle. Clicking a day calls onSelect, or links to `hrefFor(day)`.
 * The visible month can be controlled via month/onMonthChange.
 */
export function MiniCalendar({
  today,
  totals,
  goalMinutes,
  selected,
  onSelect,
  hrefFor,
  marks,
  heat = true,
  month: monthProp,
  onMonthChange,
  title = "Calendar",
}: {
  today: string;
  totals?: Map<string, number>;
  goalMinutes?: number;
  selected?: string;
  onSelect?: (d: string) => void;
  hrefFor?: (d: string) => string;
  marks?: Map<string, string>;
  heat?: boolean;
  month?: MonthRef;
  onMonthChange?: (m: MonthRef) => void;
  title?: string;
}) {
  const [ownMonth, setOwnMonth] = useState(() => monthOf(selected ?? today));
  const month = monthProp ?? ownMonth;
  const setMonth = (m: MonthRef) => (onMonthChange ? onMonthChange(m) : setOwnMonth(m));

  const first = new Date(month.y, month.m, 1);
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => dayKey(new Date(month.y, month.m, i + 1))),
  ];
  const shift = (delta: number) => {
    const d = new Date(month.y, month.m + delta, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
  };

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
      <div className="grid grid-cols-7 gap-y-1.5 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-[11px] font-medium text-muted">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const ms = totals?.get(d) ?? 0;
          const lvl = heat && goalMinutes ? heatLevel(ms, goalMinutes) : 0;
          const isToday = d === today;
          const isSel = d === selected;
          const future = d > today;
          const mark = marks?.get(d);
          const cls = `relative mx-auto grid h-8 w-8 place-items-center rounded-full text-[12.5px] font-medium tnum transition-shadow ${
            isToday
              ? "bg-accent font-semibold text-white shadow-[0_4px_10px_-4px_var(--accent)]"
              : future
                ? "text-muted/60"
                : lvl >= 3
                  ? "font-semibold text-white"
                  : "text-ink-2 hover:bg-card-2"
          } ${isSel ? "ring-2 ring-accent ring-offset-2 ring-offset-card" : ""}`;
          const style = !isToday && lvl > 0 ? { background: HEAT[lvl] } : undefined;
          const tip = `${parseDayKey(d).toLocaleDateString([], { month: "short", day: "numeric" })}${totals ? ` · ${formatDuration(ms)}` : ""}`;
          const content = (
            <>
              {parseDayKey(d).getDate()}
              {mark && (
                <span className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full" style={{ background: mark }} />
              )}
            </>
          );
          if (future) {
            return (
              <span key={d} className={cls}>
                {content}
              </span>
            );
          }
          if (onSelect) {
            return (
              <button key={d} onClick={() => onSelect(d)} className={cls} style={style} title={tip}>
                {content}
              </button>
            );
          }
          return (
            <Link key={d} href={hrefFor ? hrefFor(d) : `/calendar?date=${d}`} className={cls} style={style} title={tip}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
