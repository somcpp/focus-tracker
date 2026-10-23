"use client";

import { ClientOnly } from "@/components/ClientOnly";
import Link from "next/link";
import { CalendarCheck, ChevronLeft, ChevronRight, Clock3, Flame, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useActiveSession, useNow, useToday } from "@/lib/hooks";
import { dayTotals, streaks } from "@/lib/selectors";
import { dayKey, formatDuration, formatHours, parseDayKey } from "@/lib/time";
import { HEAT, heatLevel } from "@/lib/colors";
import { getMood } from "@/lib/moods";
import { Button, IconButton, PageHeader } from "@/components/ui";
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
    <>
      <PageHeader title="Calendar" subtitle="Your consistency at a glance. Darker days mean more focus time." />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Flame} color="#f97316" label="Current streak" value={`${st.current} day${st.current === 1 ? "" : "s"}`} />
        <StatCard icon={Trophy} color="#eab308" label="Best streak" value={`${st.best} day${st.best === 1 ? "" : "s"}`} />
        <StatCard icon={Clock3} color="#3b82f6" label="Hours this month" value={`${formatHours(monthMs)}h`} />
        <StatCard icon={CalendarCheck} color="#10b981" label="Active days" value={`${activeDays} / ${daysInMonth}`} />
      </div>

      <section className="card p-4 md:p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="flex-1 text-base font-semibold">
            {first.toLocaleDateString([], { month: "long", year: "numeric" })}
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const d = parseDayKey(today);
              setMonth({ y: d.getFullYear(), m: d.getMonth() });
            }}
          >
            Today
          </Button>
          <IconButton label="Previous month" onClick={() => shift(-1)} className="border border-line">
            <ChevronLeft size={16} />
          </IconButton>
          <IconButton label="Next month" onClick={() => shift(1)} className="border border-line">
            <ChevronRight size={16} />
          </IconButton>
        </div>

        <div className="grid grid-cols-7 gap-1.5 md:gap-2">
          {WEEKDAYS.map((w) => (
            <div key={w} className="pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted">
              {w}
            </div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} />;
            const ms = totals.get(d) ?? 0;
            const lvl = heatLevel(ms, settings.dailyGoalMinutes);
            const future = d > today;
            const mood = getMood(journals[d]?.mood);
            const MoodIcon = mood?.icon;
            const onDark = lvl >= 3;
            return (
              <Link
                key={d}
                href={future ? "#" : `/day/${d}`}
                aria-disabled={future}
                className={`group relative flex aspect-square flex-col md:aspect-[1.7] justify-between rounded-lg p-1.5 transition-shadow hover:ring-2 hover:ring-accent/40 md:p-2 ${
                  d === today ? "ring-2 ring-accent" : ""
                } ${future ? "pointer-events-none opacity-40" : ""}`}
                style={{ background: HEAT[lvl] }}
                title={`${formatDuration(ms)} tracked`}
              >
                <div className="flex items-start justify-between">
                  <span className={`text-xs font-semibold tnum ${onDark ? "text-white" : "text-ink-2"}`}>
                    {parseDayKey(d).getDate()}
                  </span>
                  {MoodIcon && (
                    <MoodIcon size={14} className="hidden md:block" style={{ color: onDark ? "#fff" : mood.color }} />
                  )}
                </div>
                {ms > 0 && (
                  <span className={`self-end text-[10px] font-semibold tnum md:text-xs ${onDark ? "text-white" : "text-ink-2"}`}>
                    {formatHours(ms)}h
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            Less
            {HEAT.map((h, i) => (
              <span key={i} className="h-3 w-3 rounded-[3px]" style={{ background: h }} />
            ))}
            More
            <span className="ml-2">· Goal {formatDuration(settings.dailyGoalMinutes * 60000)}</span>
          </div>
          {bestDay && (
            <Link href={`/day/${bestDay}`} className="hover:text-ink">
              Best day:{" "}
              <span className="font-medium text-ink">
                {parseDayKey(bestDay).toLocaleDateString([], { month: "short", day: "numeric" })} ·{" "}
                {formatDuration(totals.get(bestDay) ?? 0)}
              </span>
            </Link>
          )}
        </div>
      </section>
    </>
  );
}

export default function Page() {
  return (
    <ClientOnly>
      <CalendarPage />
    </ClientOnly>
  );
}
