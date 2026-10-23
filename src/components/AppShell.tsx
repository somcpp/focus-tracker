"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Flame, LayoutDashboard, Moon, NotebookPen, Settings, Sun, Timer } from "lucide-react";
import { useEffect, useMemo, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { useActiveSession, useMounted, useNow, useToday } from "@/lib/hooks";
import { dayTotals, streaks } from "@/lib/selectors";
import { formatClock } from "@/lib/time";
import { solid } from "@/lib/colors";
import { CategoryIcon } from "@/lib/icons";
import { Toaster } from "./ui";
import { TimerEffects } from "./TimerEffects";
import { TaskDetail } from "./TaskDetail";

const NAV = [
  { href: "/", label: "Today", icon: LayoutDashboard, color: "#3b82f6" },
  { href: "/day", label: "Journal", icon: NotebookPen, color: "#f97316" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, color: "#10b981" },
  { href: "/stats", label: "Insights", icon: BarChart3, color: "#8b5cf6" },
  { href: "/settings", label: "Settings", icon: Settings, color: "#64748b" },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

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
    <div className="flex min-h-screen">
      {mounted && <Sidebar />}
      <div className="flex min-w-0 flex-1 flex-col">
        {mounted && <MobileTopBar />}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10 md:pt-8">{children}</main>
      </div>
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

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
        <Timer size={17} strokeWidth={2.4} />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">GrindLog</span>
    </Link>
  );
}

function useStreak() {
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const minMinutes = useStore((s) => s.settings.streakMinMinutes);
  const now = useNow(true, 60000);
  const today = useToday();
  return useMemo(
    () => streaks(dayTotals(tasks, sessions, now), minMinutes, today),
    [tasks, sessions, now, minMinutes, today],
  );
}

function Sidebar() {
  const isActive = useIsActive();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const streak = useStreak();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-subtle px-3 py-5 md:flex">
      <div className="px-2">
        <Logo />
      </div>

      <nav className="mt-7 flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon, color }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                active ? "bg-card text-ink shadow-sm ring-1 ring-line" : "text-muted hover:bg-card-2 hover:text-ink"
              }`}
            >
              <span
                className="grid h-6 w-6 place-items-center rounded-md"
                style={{ color, background: `color-mix(in srgb, ${color} ${active ? 16 : 10}%, transparent)` }}
              >
                <Icon size={14} strokeWidth={2.3} />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <RunningCard />
        <div className="rounded-xl border border-line bg-card p-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500/12 text-orange-500">
              <Flame size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold tnum">
                {streak.current} day{streak.current === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-muted">Current streak · best {streak.best}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted hover:bg-card-2 hover:text-ink"
        >
          {settings.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          {settings.theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>
    </aside>
  );
}

function useRunning() {
  const active = useActiveSession();
  const task = useStore((s) => (active ? s.tasks.find((t) => t.id === active.taskId) : undefined));
  const category = useStore((s) => (task ? s.categories.find((c) => c.id === task.categoryId) : undefined));
  const sessions = useStore((s) => s.sessions);
  const now = useNow(!!active);
  if (!active || !task) return null;
  const total = sessions
    .filter((s) => s.taskId === task.id)
    .reduce((sum, s) => sum + ((s.end ?? now) - s.start), 0);
  return { task, category, total };
}

function RunningCard() {
  const running = useRunning();
  const pauseActive = useStore((s) => s.pauseActive);
  if (!running) return null;
  const { task, category, total } = running;
  return (
    <div className="rounded-xl border border-line bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Tracking
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        {category && <CategoryIcon icon={category.icon} color={category.color} size="sm" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{task.title}</p>
          <p className="font-mono text-xs text-muted tnum">{formatClock(total)}</p>
        </div>
        <button
          onClick={() => pauseActive()}
          className="rounded-md border border-line px-2 py-1 text-xs font-medium hover:bg-card-2"
        >
          Pause
        </button>
      </div>
    </div>
  );
}

function MobileTopBar() {
  const running = useRunning();
  const streak = useStreak();
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur md:hidden">
      <Logo />
      <div className="ml-auto flex items-center gap-2">
        {running && (
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-semibold text-white tnum"
            style={{ background: running.category ? solid(running.category.color) : "var(--accent)" }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            {formatClock(running.total)}
          </span>
        )}
        <span className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-semibold">
          <Flame size={13} className="text-orange-500" /> {streak.current}
        </span>
      </div>
    </header>
  );
}

function MobileNav() {
  const isActive = useIsActive();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line bg-bg/95 px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur md:hidden">
      {NAV.map(({ href, label, icon: Icon, color }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[11px] font-medium ${active ? "text-ink" : "text-muted"}`}
          >
            <Icon size={20} style={active ? { color } : undefined} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
