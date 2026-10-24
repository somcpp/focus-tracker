"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CalendarDays, Check, CheckCircle2, Clock3, FolderSearch, ListTodo, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { CategoryForm } from "@/components/CategoryForm";
import { RichText } from "@/components/RichText";
import { StatCard } from "@/components/StatCard";
import { Badge, Button, EmptyState, PageHeader, SectionTitle, toast } from "@/components/ui";
import { useStore } from "@/lib/store";
import { useActiveSession, useNow, useToday } from "@/lib/hooks";
import { sessionsByTask, taskMs, titleKey } from "@/lib/selectors";
import { addDays, formatDuration, formatHours, parseDayKey } from "@/lib/time";
import { DIFFICULTY, solid, tint } from "@/lib/colors";
import { CategoryIcon } from "@/lib/icons";
import { plainText } from "@/lib/links";
import { useUi } from "@/lib/ui-store";
import type { Difficulty, Task } from "@/lib/types";

type Filter = "all" | "open" | "done";

interface Group {
  key: string;
  latest: Task;
  ms: number;
  days: Set<string>;
  done: boolean;
}

const shortDate = (d: string, year = false) =>
  parseDayKey(d).toLocaleDateString([], { month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}) });

function CategoryPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const today = useToday();
  const category = useStore((s) => s.categories.find((c) => c.id === id));
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const { updateCategory, deleteCategory, addCategoryToDay } = useStore.getState();
  const openTask = useUi((s) => s.openTask);
  const active = useActiveSession();
  const now = useNow(!!active, 5000);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);

  const catTasks = useMemo(() => tasks.filter((t) => t.categoryId === id), [tasks, id]);
  const byTask = useMemo(() => sessionsByTask(sessions), [sessions]);

  // The same problem logged on several days (e.g. carried over) is one entry
  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const t of catTasks) {
      const k = titleKey(t.title);
      const g = map.get(k) ?? { key: k, latest: t, ms: 0, days: new Set<string>(), done: false };
      g.ms += taskMs(t.id, byTask, now);
      g.days.add(t.date);
      g.done ||= t.done;
      if (t.date > g.latest.date || (t.date === g.latest.date && t.createdAt > g.latest.createdAt)) g.latest = t;
      map.set(k, g);
    }
    return [...map.values()].sort((a, b) =>
      a.latest.date === b.latest.date ? b.latest.createdAt - a.latest.createdAt : a.latest.date < b.latest.date ? 1 : -1,
    );
  }, [catTasks, byTask, now]);

  if (!category) {
    return (
      <div className="card">
        <EmptyState icon={FolderSearch} title="Category not found" text="It may have been deleted. Pick another one from the sidebar." />
      </div>
    );
  }

  const color = solid(category.color);
  const totalMs = groups.reduce((s, g) => s + g.ms, 0);
  const doneCount = groups.filter((g) => g.done).length;
  const activeDays = new Set(catTasks.filter((t) => taskMs(t.id, byTask, now) > 0).map((t) => t.date)).size;
  const diffs = (Object.keys(DIFFICULTY) as Difficulty[]).map((d) => ({ d, n: groups.filter((g) => g.done && g.latest.difficulty === d).length }));
  const q = query.trim().toLowerCase();
  const visible = groups.filter(
    (g) =>
      (filter === "all" || (filter === "done" ? g.done : !g.done)) &&
      (!q || plainText(g.latest.title).toLowerCase().includes(q) || g.key.includes(q)),
  );
  const firstDate = catTasks.map((t) => t.date).sort()[0];

  // Last 12 weeks of time in this category
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const end = addDays(today, -7 * (11 - i));
    const start = addDays(end, -6);
    const ms = catTasks.filter((t) => t.date >= start && t.date <= end).reduce((s, t) => s + taskMs(t.id, byTask, now), 0);
    return { start, ms };
  });
  const maxWeek = Math.max(...weeks.map((w) => w.ms), 1);

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <CategoryIcon icon={category.icon} color={category.color} size="lg" variant="solid" />
            {category.name}
          </span>
        }
        subtitle={
          firstDate
            ? `${groups.length} task${groups.length === 1 ? "" : "s"} logged since ${shortDate(firstDate, true)}`
            : "Nothing logged yet"
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil size={14} /> Edit
            </Button>
            <Button
              variant="secondary"
              className="text-red-600 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => {
                if (confirm(`Delete "${category.name}" and all its tasks and tracked time?`)) {
                  deleteCategory(category.id);
                  toast({ tone: "success", text: `Category "${category.name}" deleted` });
                  router.push("/");
                }
              }}
            >
              <Trash2 size={14} /> Delete
            </Button>
            <Link
              href="/"
              onClick={() => {
                addCategoryToDay(today, category.id);
                toast({ tone: "success", text: `${category.name} added to today` });
              }}
            >
              <Button>
                <Plus size={15} /> Add to today
              </Button>
            </Link>
          </>
        }
      />
      <CategoryForm
        open={editing}
        initial={category}
        onClose={() => setEditing(false)}
        onSave={(v) => updateCategory(category.id, v)}
        onDelete={() => {
          deleteCategory(category.id);
          router.push("/");
        }}
      />

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Clock3} color={color} label="Total time" value={`${formatHours(totalMs)}h`} />
          <StatCard icon={ListTodo} color="#2f6bff" label="Tasks logged" value={String(groups.length)} />
          <StatCard
            icon={CheckCircle2}
            color="#12b76a"
            label="Completed"
            value={String(doneCount)}
            progress={groups.length ? doneCount / groups.length : 0}
          />
          <StatCard icon={CalendarDays} color="#f97316" label="Days worked" value={String(activeDays)} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="card p-5">
            <SectionTitle right="Last 12 weeks">Weekly time</SectionTitle>
            <div className="flex h-32 items-end gap-1.5">
              {weeks.map((w) => (
                <div
                  key={w.start}
                  title={`Week of ${shortDate(w.start)}: ${formatDuration(w.ms)}`}
                  className="flex-1 rounded-t-md transition-[height] duration-500"
                  style={{ height: `${Math.max(3, (w.ms / maxWeek) * 100)}%`, background: w.ms ? color : tint(category.color, 14) }}
                />
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-muted">
              <span>{shortDate(weeks[0].start)}</span>
              <span>This week</span>
            </div>
          </section>
          <section className="card p-5">
            <SectionTitle>Solved by difficulty</SectionTitle>
            {diffs.some((d) => d.n) ? (
              <div className="flex flex-col gap-2.5">
                {diffs.map(({ d, n }) => (
                  <div key={d} className="flex items-center gap-3">
                    <Badge color={DIFFICULTY[d].color} className="w-16 justify-center">
                      {DIFFICULTY[d].label}
                    </Badge>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-card-2">
                      <div className="h-full rounded-full" style={{ width: `${(n / Math.max(1, doneCount)) * 100}%`, background: DIFFICULTY[d].color }} />
                    </div>
                    <span className="w-6 text-right text-sm font-bold tnum">{n}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Set a difficulty on tasks (in their details) to see the split here.</p>
            )}
          </section>
        </div>

        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
            <div className="flex rounded-lg border border-line bg-card-2 p-0.5">
              {(["all", "open", "done"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                    filter === f ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"
                  }`}
                >
                  {f === "all" ? `All ${groups.length}` : f === "open" ? `Open ${groups.length - doneCount}` : `Done ${doneCount}`}
                </button>
              ))}
            </div>
            <div className="field ml-auto flex h-8 w-full items-center gap-2 px-2.5 sm:w-64">
              <Search size={14} className="text-muted" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks" className="w-full bg-transparent text-sm" />
            </div>
          </div>
          {visible.length === 0 ? (
            <EmptyState
              icon={FolderSearch}
              title={groups.length ? "No matches" : "Nothing here yet"}
              text={groups.length ? "Try a different filter or search." : `Add tasks to ${category.name} from the Today page.`}
            />
          ) : (
            <ul>
              {visible.map((g) => (
                <li key={g.key} className="border-b border-line last:border-b-0">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => openTask(g.latest.id)}
                    onKeyDown={(e) => e.target === e.currentTarget && e.key === "Enter" && openTask(g.latest.id)}
                    className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-subtle"
                  >
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px] ${
                        g.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-line-strong"
                      }`}
                    >
                      {g.done && <Check size={11} strokeWidth={3} />}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <span className="min-w-0 text-[14.5px] font-medium">
                        <RichText text={g.latest.title} />
                      </span>
                      {g.latest.difficulty && (
                        <Badge color={DIFFICULTY[g.latest.difficulty].color}>{DIFFICULTY[g.latest.difficulty].label}</Badge>
                      )}
                    </div>
                    <span className="hidden text-xs text-muted sm:block">
                      {shortDate(g.latest.date)}
                      {g.days.size > 1 && ` · ${g.days.size} days`}
                    </span>
                    <span className="w-16 text-right font-mono text-sm text-ink-2 tnum">{g.ms ? formatDuration(g.ms) : "—"}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <ClientOnly>
      <CategoryPage />
    </ClientOnly>
  );
}
