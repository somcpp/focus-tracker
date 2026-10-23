"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Flame, Home, Moon, NotebookPen, Plus, Settings, Sun, Timer } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { useActiveSession, useMounted, useNow, useToday } from "@/lib/hooks";
import { dayTotals, streaks } from "@/lib/selectors";
import { formatClock } from "@/lib/time";
import { solid } from "@/lib/colors";
import { CategoryIcon } from "@/lib/icons";
import { Toaster } from "./ui";
import { TimerEffects } from "./TimerEffects";
import { TaskDetail } from "./TaskDetail";
import { CategoryForm } from "./CategoryForm";

const NAV = [
  { href: "/", label: "Today", icon: Home, color: "#2f6bff" },
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
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10 md:pt-8">{children}</main>
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
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#4f8bff] to-[#2456f5] text-white shadow-[0_6px_14px_-6px_#2f6bff]">
        <Timer size={19} strokeWidth={2.5} />
      </span>
      <span className="text-lg font-bold tracking-tight">Focus Tracker</span>
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
  const today = useToday();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const categories = useStore((s) => s.categories);
  const tasks = useStore((s) => s.tasks);
  const addCategory = useStore((s) => s.addCategory);
  const [creating, setCreating] = useState(false);
  const streak = useStreak();
  const todayCount = tasks.filter((t) => t.date === today).length;
  const countFor = (id: string) => tasks.filter((t) => t.categoryId === id).length;

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-line bg-card px-4 py-6 md:flex">
      <div className="px-2">
        <Logo />
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon, color }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors ${
                active ? "bg-accent-soft font-semibold text-accent" : "font-medium text-ink-2 hover:bg-card-2"
              }`}
            >
              <Icon size={19} strokeWidth={2.2} style={{ color: active ? "var(--accent)" : color }} />
              <span className="flex-1">{label}</span>
              {href === "/" && todayCount > 0 && (
                <span
                  className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold ${
                    active ? "bg-accent text-white" : "bg-card-2 text-muted"
                  }`}
                >
                  {todayCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mx-2 my-5 border-t border-line" />

      <div className="flex items-center justify-between px-3">
        <p className="text-[13px] font-semibold text-ink-2">Categories</p>
        <button
          onClick={() => setCreating(true)}
          aria-label="New category"
          className="grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-card-2 hover:text-ink"
        >
          <Plus size={16} />
        </button>
      </div>
      <ul className="mt-2 flex flex-col gap-0.5">
        {categories
          .filter((c) => !c.archived)
          .map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium text-ink-2">
              <CategoryIcon icon={c.icon} color={c.color} size="sm" variant="solid" />
              <span className="flex-1 truncate">{c.name}</span>
              <span className="text-xs text-muted tnum">{countFor(c.id)}</span>
            </li>
          ))}
      </ul>
      <CategoryForm open={creating} onClose={() => setCreating(false)} onSave={(v) => addCategory(v.name, v.icon, v.color)} />

      <div className="mt-auto flex flex-col gap-3 pt-6">
        <RunningCard />
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[#ff9a3c] to-[#ff5f45] p-3.5 text-white shadow-[0_8px_20px_-10px_#ff6a3d]">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20">
            <Flame size={19} className="fill-white/30" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold tnum">
              {streak.current} day streak
            </p>
            <p className="text-xs text-white/80">Best: {streak.best} days</p>
          </div>
        </div>
        <button
          onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted hover:bg-card-2 hover:text-ink"
        >
          {settings.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
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
    <div className="rounded-2xl border border-line bg-card-2 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Tracking now
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        {category && <CategoryIcon icon={category.icon} color={category.color} size="sm" variant="solid" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{task.title}</p>
          <p className="font-mono text-xs text-muted tnum">{formatClock(total)}</p>
        </div>
        <button
          onClick={() => pauseActive()}
          className="rounded-lg border border-line bg-card px-2 py-1 text-xs font-semibold hover:bg-subtle"
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
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-card/90 px-4 py-3 backdrop-blur md:hidden">
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
        <span className="flex items-center gap-1 rounded-full bg-gradient-to-br from-[#ff9a3c] to-[#ff5f45] px-2.5 py-1 text-xs font-bold text-white">
          <Flame size={13} /> {streak.current}
        </span>
      </div>
    </header>
  );
}

function MobileNav() {
  const isActive = useIsActive();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line bg-card/95 px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur md:hidden">
      {NAV.map(({ href, label, icon: Icon, color }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[11px] font-semibold ${active ? "text-ink" : "text-muted"}`}
          >
            <Icon size={21} style={{ color: active ? color : undefined }} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
