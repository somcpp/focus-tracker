"use client";

import { RichText } from "@/components/RichText";
import { ClientOnly } from "@/components/ClientOnly";
import Link from "next/link";
import { ArrowRight, CalendarCheck, Check, Clock3, Flame, Inbox, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useActiveSession, useNow, useToday } from "@/lib/hooks";
import { dayTotals, sessionsByTask, streaks, taskMs } from "@/lib/selectors";
import { dayKey, formatDuration, formatHours, parseDayKey, prettyDate } from "@/lib/time";
import { HEAT, solid } from "@/lib/colors";
import { CategoryIcon } from "@/lib/icons";
import { getMood } from "@/lib/moods";
import { MiniCalendar } from "@/components/MiniCalendar";
import { StatCard } from "@/components/StatCard";
import { Button, EmptyState, PageHeader, SectionTitle } from "@/components/ui";

function CalendarPage() {
  const today = useToday();
  const [selected, setSelected] = useState(today);
  const active = useActiveSession();
  const now = useNow(!!active, 10000);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const settings = useStore((s) => s.settings);

  const totals = useMemo(() => dayTotals(tasks, sessions, now), [tasks, sessions, now]);
  const st = streaks(totals, settings.streakMinMinutes, today);

  // This month's numbers
  const t = parseDayKey(today);
  const daysInMonth = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => dayKey(new Date(t.getFullYear(), t.getMonth(), i + 1)));
  const monthMs = monthDays.reduce((s, d) => s + (totals.get(d) ?? 0), 0);
  const activeDays = monthDays.filter((d) => (totals.get(d) ?? 0) >= settings.streakMinMinutes * 60000).length;

  return (
    <>
      <PageHeader title="Calendar" subtitle="Pick a day to see what you worked on." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Flame} color="#f97316" label="Current streak" value={`${st.current} day${st.current === 1 ? "" : "s"}`} />
        <StatCard icon={Trophy} color="#eab308" label="Best streak" value={`${st.best} day${st.best === 1 ? "" : "s"}`} />
        <StatCard icon={Clock3} color="#2f6bff" label="Hours this month" value={`${formatHours(monthMs)}h`} />
        <StatCard icon={CalendarCheck} color="#12b76a" label="Active days" value={`${activeDays} / ${daysInMonth}`} />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="card p-5">
          <MiniCalendar
            title="Month"
            today={today}
            totals={totals}
            goalMinutes={settings.dailyGoalMinutes}
            selected={selected}
            onSelect={setSelected}
          />
          <div className="mt-4 flex items-center gap-1.5 border-t border-line pt-4 text-[11px] text-muted">
            Less
            {HEAT.map((h, i) => (
              <span key={i} className="h-3 w-3 rounded-full" style={{ background: h }} />
            ))}
            More
            <span className="ml-auto">Goal {formatDuration(settings.dailyGoalMinutes * 60000)}</span>
          </div>
        </section>

        <DayPreview date={selected} now={now} />
      </div>
    </>
  );
}

function DayPreview({ date, now }: { date: string; now: number }) {
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const categories = useStore((s) => s.categories);
  const journal = useStore((s) => s.journals[date]);
  const byTask = useMemo(() => sessionsByTask(sessions), [sessions]);
  const dayTasks = tasks.filter((t) => t.date === date);
  const total = dayTasks.reduce((s, t) => s + taskMs(t.id, byTask, now), 0);
  const mood = getMood(journal?.mood);
  const MoodIcon = mood?.icon;

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{prettyDate(date)}</h2>
          <p className="text-sm text-muted">
            <span className="font-semibold text-ink tnum">{formatDuration(total)}</span> focused ·{" "}
            {dayTasks.filter((t) => t.done).length}/{dayTasks.length} tasks completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mood && MoodIcon && (
            <span
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ color: mood.color, background: `color-mix(in srgb, ${mood.color} 12%, var(--card))` }}
            >
              <MoodIcon size={14} /> {mood.label}
            </span>
          )}
          <Link href={`/day/${date}`}>
            <Button size="sm">
              Open day <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      </div>

      {dayTasks.length === 0 ? (
        <EmptyState icon={Inbox} title="Nothing logged" text="No tasks were tracked on this day." />
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {dayTasks.map((t) => {
            const c = categories.find((x) => x.id === t.categoryId);
            const ms = taskMs(t.id, byTask, now);
            return (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                {c && <CategoryIcon icon={c.icon} color={c.color} size="sm" variant="solid" />}
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${t.done ? "" : "text-ink-2"}`}>
                    <RichText text={t.title} size="sm" />
                  </p>
                  <p className="text-xs" style={{ color: c ? solid(c.color) : undefined }}>
                    {c?.name}
                  </p>
                </div>
                {t.done && (
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
                <span className="w-16 text-right font-mono text-sm text-ink-2 tnum">{ms ? formatDuration(ms) : "—"}</span>
              </li>
            );
          })}
        </ul>
      )}

      {(journal?.reflection?.trim() || journal?.plan?.trim()) && (
        <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
          {journal.reflection?.trim() && (
            <div>
              <SectionTitle>Reflection</SectionTitle>
              <p className="-mt-1 line-clamp-4 whitespace-pre-wrap text-sm text-ink-2">{journal.reflection}</p>
            </div>
          )}
          {journal.plan?.trim() && (
            <div>
              <SectionTitle>Plan for next day</SectionTitle>
              <p className="-mt-1 line-clamp-4 whitespace-pre-wrap text-sm text-ink-2">{journal.plan}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function Page() {
  return (
    <ClientOnly>
      <CalendarPage />
    </ClientOnly>
  );
}
