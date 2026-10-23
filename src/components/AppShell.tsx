"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { BarChart3, CalendarDays, Flame, Moon, Settings, Sun, Timer } from "lucide-react";
import { useEffect, useMemo, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { useActiveSession, useMounted, useNow, useToday } from "@/lib/hooks";
import { dayTotals, streaks } from "@/lib/selectors";
import { formatClock } from "@/lib/time";
import { solid } from "@/lib/colors";
import { Toaster } from "./ui";
import { TimerEffects } from "./TimerEffects";
import { TaskDetail } from "./TaskDetail";

const NAV = [
  { href: "/", label: "Today", icon: Timer },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const theme = useStore((s) => s.settings.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Keep multiple open tabs in sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "grindlog-v1") useStore.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Pages gate themselves with <ClientOnly>; the chrome depends on stored data too.
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-28 md:px-6 md:pb-10">
      {mounted && <Header />}
      <main className="flex-1">{children}</main>
      {mounted && (
        <>
          <MobileNav />
          <TimerEffects />
          <TaskDetail />
          <Toaster />
        </>
      )}
    </div>
  );
}

function Header() {
  const pathname = usePathname();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const now = useNow(true, 60000);
  const today = useToday();
  const { current } = useMemo(
    () => streaks(dayTotals(tasks, sessions, now), settings.streakMinMinutes, today),
    [tasks, sessions, now, settings.streakMinMinutes, today],
  );

  return (
    <header className="sticky top-0 z-40 -mx-4 mb-6 flex items-center gap-3 bg-bg/80 px-4 py-4 backdrop-blur-md md:-mx-6 md:px-6">
      <Link href="/" className="flex items-center gap-2">
        <motion.span
          whileHover={{ rotate: [0, -12, 12, 0] }}
          className="pop-btn grid h-11 w-11 place-items-center rounded-2xl bg-accent text-2xl"
        >
          ⏱️
        </motion.span>
        <span className="font-display text-2xl font-bold tracking-tight">
          Grind<span className="text-accent">Log</span>
        </span>
      </Link>

      <nav className="ml-6 hidden items-center gap-1 rounded-full border-2 border-line bg-card p-1 md:flex">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-1.5 rounded-full px-4 py-1.5 font-display font-medium transition-colors ${
                active ? "text-bg" : "text-muted hover:text-ink"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-ink"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <Icon size={16} className="relative" />
              <span className="relative">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <RunningPill />
        <div
          title={`${current}-day streak`}
          className="flex items-center gap-1 rounded-full border-2 border-line bg-card px-3 py-1.5 font-display font-semibold"
        >
          <Flame size={18} className={current > 0 ? "fill-[#ff9f43] text-[#ff6b6b]" : "text-muted"} />
          {current}
        </div>
        <button
          aria-label="Toggle dark mode"
          onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
          className="grid h-10 w-10 place-items-center rounded-full border-2 border-line bg-card transition-transform hover:rotate-12"
        >
          {settings.theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}

function RunningPill() {
  const active = useActiveSession();
  const task = useStore((s) => (active ? s.tasks.find((t) => t.id === active.taskId) : undefined));
  const category = useStore((s) =>
    task ? s.categories.find((c) => c.id === task.categoryId) : undefined,
  );
  const sessions = useStore((s) => s.sessions);
  const now = useNow(!!active);
  if (!active || !task) return null;
  const total = sessions
    .filter((s) => s.taskId === task.id)
    .reduce((sum, s) => sum + ((s.end ?? now) - s.start), 0);
  return (
    <Link
      href="/"
      className="stripes hidden items-center gap-2 rounded-full border-2 border-line px-3 py-1.5 font-display font-semibold text-white sm:flex"
      style={{ backgroundColor: category ? solid(category.color) : "var(--accent)" }}
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
      <span className="max-w-32 truncate">{task.title}</span>
      <span className="tabular-nums">{formatClock(total)}</span>
    </Link>
  );
}

function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="card fixed inset-x-4 bottom-4 z-40 flex justify-around p-2 md:hidden">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-xs font-bold ${
              active ? "bg-ink text-bg" : "text-muted"
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
