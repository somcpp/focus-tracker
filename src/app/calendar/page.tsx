"use client";

import { ClientOnly } from "@/components/ClientOnly";
import Link from "next/link";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useActiveSession, useNow, useToday } from "@/lib/hooks";
import { dayTotals, streaks } from "@/lib/selectors";
import { dayKey, formatDuration, formatHours, parseDayKey } from "@/lib/time";
import { HEAT, heatLevel } from "@/lib/colors";
import { moodEmoji } from "@/lib/moods";
import { IconButton } from "@/components/ui";
import { StatCard } from "@/components/StatCard";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function CalendarPage() {
  const today = useToday();
  const [month, setMonth] = useState(() => {
    const d = parseDayKey(today);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const active = useActiveSession();
  const now = useNow(!!active, 10000);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const journals = useStore((s) => s.journals);
  const settings = useStore((s) => s.settings);

  const totals = useMemo(() => dayTotals(tasks, sessions, now), [tasks, sessions, now]);
  const st = streaks(totals, settings.streakMinMinutes, today);

  // Monday-first grid
  const first = new Date(month.y, month.m, 1);
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => dayKey(new Date(month.y, month.m, i + 1))),
  ];
  while (cells.length % 7) cells.push(null);

  const monthDays = cells.filter((c): c is string => !!c);
  const monthMs = monthDays.reduce((s, d) => s + (totals.get(d) ?? 0), 0);
  const activeDays = monthDays.filter((d) => (totals.get(d) ?? 0) >= settings.streakMinMinutes * 60000).length;
  const bestDay = monthDays.reduce<string | null>(
    (b, d) => ((totals.get(d) ?? 0) > (b ? totals.get(b) ?? 0 : 0) ? d : b),
    null,
  );

  const shift = (delta: number) =>
    setMonth(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard emoji="🔥" label="Current streak" value={`${st.current} day${st.current === 1 ? "" : "s"}`} color="#ff9f43" />
        <StatCard emoji="🏆" label="Best streak" value={`${st.best} day${st.best === 1 ? "" : "s"}`} color="#f7c531" />
        <StatCard emoji="⏱️" label="Hours this month" value={`${formatHours(monthMs)}h`} color="#4d96ff" />
        <StatCard emoji="✅" label="Active days" value={`${activeDays}/${daysInMonth}`} color="#7bd389" />
      </div>

      <section className="card p-4 md:p-6">
        <div className="mb-5 flex items-center gap-2">
          <h1 className="flex-1 font-display text-2xl font-bold md:text-3xl">
            {first.toLocaleDateString([], { month: "long", year: "numeric" })}
          </h1>
          <IconButton label="Previous month" onClick={() => shift(-1)} className="border-2 border-line">
            <ChevronLeft size={18} />
          </IconButton>
          <button
            onClick={() => {
              const d = parseDayKey(today);
              setMonth({ y: d.getFullYear(), m: d.getMonth() });
            }}
            className="rounded-full border-2 border-line px-3 py-1.5 text-sm font-bold"
          >
            Today
          </button>
          <IconButton label="Next month" onClick={() => shift(1)} className="border-2 border-line">
            <ChevronRight size={18} />
          </IconButton>
        </div>

        <div className="grid grid-cols-7 gap-1.5 md:gap-2.5">
          {WEEKDAYS.map((w) => (
            <div key={w} className="pb-1 text-center text-xs font-bold uppercase text-muted">
              {w}
            </div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} />;
            const ms = totals.get(d) ?? 0;
            const lvl = heatLevel(ms, settings.dailyGoalMinutes);
            const future = d > today;
            const mood = moodEmoji(journals[d]?.mood);
            return (
              <motion.div key={d} whileHover={future ? undefined : { scale: 1.06, rotate: -1.5 }}>
                <Link
                  href={future ? "#" : `/day/${d}`}
                  aria-disabled={future}
                  className={`relative flex aspect-square flex-col justify-between rounded-xl border-2 p-1.5 md:rounded-2xl md:p-2 ${
                    d === today ? "border-line shadow-[0_3px_0_var(--line)]" : "border-transparent"
                  } ${future ? "pointer-events-none opacity-40" : ""} ${lvl >= 3 ? "text-white" : ""}`}
                  style={{ background: HEAT[lvl] }}
                  title={`${formatDuration(ms)} tracked`}
                >
                  <span className="text-xs font-bold md:text-sm">{parseDayKey(d).getDate()}</span>
                  {mood && <span className="absolute right-1 top-1 text-xs md:text-base">{mood}</span>}
                  {ms > 0 && (
                    <span className="self-end font-display text-[10px] font-semibold md:text-sm">{formatHours(ms)}h</span>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-muted">
          <div className="flex items-center gap-1.5">
            Less
            {HEAT.map((h, i) => (
              <span key={i} className="h-4 w-4 rounded-md" style={{ background: h }} />
            ))}
            More
            <span className="ml-2">(goal: {formatDuration(settings.dailyGoalMinutes * 60000)})</span>
          </div>
          {bestDay && (
            <Link href={`/day/${bestDay}`} className="hover:text-ink">
              🌟 Best day: {parseDayKey(bestDay).toLocaleDateString([], { month: "short", day: "numeric" })} ·{" "}
              {formatDuration(totals.get(bestDay) ?? 0)}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <ClientOnly>
      <CalendarPage />
    </ClientOnly>
  );
}
