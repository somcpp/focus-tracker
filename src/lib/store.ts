"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Category,
  ColorKey,
  Journal,
  PlanItem,
  PersistedState,
  Session,
  Settings,
  Task,
} from "./types";
import { parseDayKey } from "./time";
import { EMOJI_TO_ICON } from "./icons";

const OLD_COLORS: Record<string, ColorKey> = {
  sky: "blue",
  tangerine: "orange",
  lime: "green",
  sunshine: "yellow",
  grape: "purple",
  bubblegum: "pink",
  tomato: "red",
  mint: "teal",
};

/** v1 categories used emoji + playful color names */
function migrateCategories(cats: (Category & { emoji?: string })[]): Category[] {
  return cats.map(({ emoji, ...c }) => ({
    ...c,
    icon: c.icon ?? (emoji && EMOJI_TO_ICON[emoji]) ?? "layers",
    color: OLD_COLORS[c.color] ?? c.color,
  }));
}

/** v2 journals had a single reflection text and a plan string */
type LegacyJournal = Partial<Journal> & { reflection?: string; plan?: string | PlanItem[] };
function migrateJournals(journals: Record<string, LegacyJournal>): Record<string, Journal> {
  const out: Record<string, Journal> = {};
  for (const [date, j] of Object.entries(journals ?? {})) {
    const plan = Array.isArray(j.plan)
      ? j.plan
      : (j.plan ?? "")
          .split("\n")
          .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)]|\[[ x]\])\s*/i, "").trim())
          .filter(Boolean)
          .map((text) => ({ id: uid(), text, done: false, taskId: null }));
    out[date] = {
      date,
      mood: j.mood ?? null,
      wins: j.wins ?? "",
      challenges: j.challenges ?? "",
      learnings: j.learnings ?? "",
      notes: j.notes ?? j.reflection ?? "",
      plan,
    };
  }
  return out;
}

export const emptyJournal = (date: string): Journal => ({
  date,
  mood: null,
  wins: "",
  challenges: "",
  learnings: "",
  notes: "",
  plan: [],
});

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const DEFAULT_SETTINGS: Settings = {
  name: "",
  dailyGoalMinutes: 360,
  streakMinMinutes: 60,
  idleLimitMinutes: 180,
  theme: "light",
  pomodoro: { enabled: false, focusMinutes: 25, breakMinutes: 5 },
  lastBackupAt: null,
  startDayDismissedOn: null,
};

const seedCategories = (): Category[] => [
  { id: uid(), name: "DSA", icon: "brain", color: "purple", archived: false, createdAt: Date.now() },
  { id: uid(), name: "Dev", icon: "code", color: "blue", archived: false, createdAt: Date.now() },
];

const initialData = (): PersistedState => ({
  categories: seedCategories(),
  tasks: [],
  sessions: [],
  journals: {},
  dayCategories: {},
  settings: DEFAULT_SETTINGS,
});

interface Actions {
  // categories
  addCategory: (name: string, icon: string, color: ColorKey) => string;
  updateCategory: (id: string, patch: Partial<Omit<Category, "id">>) => void;
  deleteCategory: (id: string) => void;
  /** Move a category up (-1) or down (+1) in the display order */
  moveCategory: (id: string, delta: -1 | 1) => void;
  addCategoryToDay: (date: string, categoryId: string) => void;
  removeCategoryFromDay: (date: string, categoryId: string) => void;
  // tasks
  addTask: (date: string, categoryId: string, title: string) => string;
  updateTask: (id: string, patch: Partial<Omit<Task, "id">>) => void;
  deleteTask: (id: string) => void;
  carryOver: (fromDate: string, toDate: string) => number;
  // timer
  startTask: (id: string) => void;
  pauseActive: (at?: number) => void;
  finishTask: (id: string) => void;
  toggleDone: (id: string) => void;
  // sessions
  addManualSession: (taskId: string, minutes: number) => void;
  updateSession: (id: string, patch: Partial<Pick<Session, "start" | "end">>) => void;
  deleteSession: (id: string) => void;
  // journal & settings
  saveJournal: (date: string, patch: Partial<Omit<Journal, "date" | "plan">>) => void;
  addPlanItem: (date: string, text: string) => void;
  updatePlanItem: (date: string, id: string, patch: Partial<Omit<PlanItem, "id">>) => void;
  removePlanItem: (date: string, id: string) => void;
  /** Turn a plan item from `journalDate` into a task on `taskDate` */
  planItemToTask: (journalDate: string, itemId: string, categoryId: string, taskDate: string) => string | null;
  updateSettings: (patch: Partial<Settings>) => void;
  importData: (data: PersistedState) => void;
  resetAll: () => void;
}

export type Store = PersistedState & Actions;

/** Close the running session (if any) */
const closeRunning = (sessions: Session[], at: number): Session[] =>
  sessions.map((s) => (s.end === null ? { ...s, end: Math.max(at, s.start) } : s));

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialData(),

      addCategory: (name, icon, color) => {
        const id = uid();
        set((st) => ({
          categories: [
            ...st.categories,
            { id, name: name.trim(), icon, color, archived: false, createdAt: Date.now() },
          ],
        }));
        return id;
      },
      updateCategory: (id, patch) =>
        set((st) => ({
          categories: st.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      deleteCategory: (id) => {
        set((st) => {
          const taskIds = new Set(st.tasks.filter((t) => t.categoryId === id).map((t) => t.id));
          const dayCategories: Record<string, string[]> = {};
          for (const [d, ids] of Object.entries(st.dayCategories)) {
            dayCategories[d] = ids.filter((x) => x !== id);
          }
          return {
            categories: st.categories.filter((c) => c.id !== id),
            tasks: st.tasks.filter((t) => !taskIds.has(t.id)),
            sessions: st.sessions.filter((s) => !taskIds.has(s.taskId)),
            dayCategories,
            deletedCategoryIds: Array.from(new Set([...(st.deletedCategoryIds || []), id])),
          };
        });

        // Trigger immediate cloud deletion
        if (typeof window !== "undefined") {
          try {
            fetch(`/api/sync?categoryId=${encodeURIComponent(id)}`, {
              method: "DELETE",
              credentials: "include",
            }).catch(() => {});
          } catch {
            // ignore
          }
        }
      },
      moveCategory: (id, delta) =>
        set((st) => {
          const i = st.categories.findIndex((c) => c.id === id);
          const j = i + delta;
          if (i < 0 || j < 0 || j >= st.categories.length) return {};
          const next = [...st.categories];
          [next[i], next[j]] = [next[j], next[i]];
          return { categories: next };
        }),
      addCategoryToDay: (date, categoryId) =>
        set((st) => {
          const cur = st.dayCategories[date] ?? [];
          if (cur.includes(categoryId)) return {};
          return { dayCategories: { ...st.dayCategories, [date]: [...cur, categoryId] } };
        }),
      removeCategoryFromDay: (date, categoryId) =>
        set((st) => ({
          dayCategories: {
            ...st.dayCategories,
            [date]: (st.dayCategories[date] ?? []).filter((x) => x !== categoryId),
          },
        })),

      addTask: (date, categoryId, title) => {
        const id = uid();
        get().addCategoryToDay(date, categoryId);
        set((st) => ({
          tasks: [
            ...st.tasks,
            {
              id,
              categoryId,
              date,
              title: title.trim(),
              notes: "",
              done: false,
              difficulty: null,
              createdAt: Date.now(),
              carriedTo: null,
            },
          ],
        }));
        return id;
      },
      updateTask: (id, patch) =>
        set((st) => ({ tasks: st.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTask: (id) =>
        set((st) => ({
          tasks: st.tasks.filter((t) => t.id !== id),
          sessions: st.sessions.filter((s) => s.taskId !== id),
        })),
      carryOver: (fromDate, toDate) => {
        const st = get();
        const pending = st.tasks.filter((t) => t.date === fromDate && !t.done && !t.carriedTo);
        if (!pending.length) return 0;
        const copies: Task[] = pending.map((t) => ({
          ...t,
          id: uid(),
          date: toDate,
          done: false,
          createdAt: Date.now(),
          carriedTo: null,
        }));
        const cats = Array.from(new Set(pending.map((t) => t.categoryId)));
        const cur = st.dayCategories[toDate] ?? [];
        set({
          tasks: [
            ...st.tasks.map((t) => (pending.includes(t) ? { ...t, carriedTo: toDate } : t)),
            ...copies,
          ],
          dayCategories: {
            ...st.dayCategories,
            [toDate]: [...cur, ...cats.filter((c) => !cur.includes(c))],
          },
        });
        return copies.length;
      },

      startTask: (id) =>
        set((st) => {
          const now = Date.now();
          const running = st.sessions.find((s) => s.end === null);
          if (running?.taskId === id) return {};
          return {
            sessions: [...closeRunning(st.sessions, now), { id: uid(), taskId: id, start: now, end: null }],
            tasks: st.tasks.map((t) => (t.id === id ? { ...t, done: false } : t)),
          };
        }),
      pauseActive: (at) => set((st) => ({ sessions: closeRunning(st.sessions, at ?? Date.now()) })),
      finishTask: (id) =>
        set((st) => {
          const now = Date.now();
          return {
            sessions: st.sessions.map((s) =>
              s.taskId === id && s.end === null ? { ...s, end: now } : s,
            ),
            tasks: st.tasks.map((t) => (t.id === id ? { ...t, done: true } : t)),
          };
        }),
      toggleDone: (id) => {
        const t = get().tasks.find((x) => x.id === id);
        if (!t) return;
        if (t.done) get().updateTask(id, { done: false });
        else get().finishTask(id);
      },

      addManualSession: (taskId, minutes) =>
        set((st) => {
          const task = st.tasks.find((t) => t.id === taskId);
          if (!task || minutes <= 0) return {};
          const ms = minutes * 60000;
          // On the task's own day the block ends now; on other days it starts at noon.
          const dayStart = parseDayKey(task.date).getTime();
          const now = Date.now();
          const isTaskDay = now >= dayStart && now - dayStart < 86400000;
          const end = isTaskDay ? now : dayStart + 12 * 3600000 + ms;
          return { sessions: [...st.sessions, { id: uid(), taskId, start: end - ms, end }] };
        }),
      updateSession: (id, patch) =>
        set((st) => ({
          sessions: st.sessions.map((s) => {
            if (s.id !== id) return s;
            const next = { ...s, ...patch };
            if (next.end !== null && next.end < next.start) next.end = next.start;
            return next;
          }),
        })),
      deleteSession: (id) => set((st) => ({ sessions: st.sessions.filter((s) => s.id !== id) })),

      saveJournal: (date, patch) =>
        set((st) => ({
          journals: { ...st.journals, [date]: { ...(st.journals[date] ?? emptyJournal(date)), ...patch } },
        })),
      addPlanItem: (date, text) =>
        set((st) => {
          const j = st.journals[date] ?? emptyJournal(date);
          const item: PlanItem = { id: uid(), text: text.trim(), done: false, taskId: null };
          return { journals: { ...st.journals, [date]: { ...j, plan: [...j.plan, item] } } };
        }),
      updatePlanItem: (date, id, patch) =>
        set((st) => {
          const j = st.journals[date];
          if (!j) return {};
          return {
            journals: { ...st.journals, [date]: { ...j, plan: j.plan.map((p) => (p.id === id ? { ...p, ...patch } : p)) } },
          };
        }),
      removePlanItem: (date, id) =>
        set((st) => {
          const j = st.journals[date];
          if (!j) return {};
          return { journals: { ...st.journals, [date]: { ...j, plan: j.plan.filter((p) => p.id !== id) } } };
        }),
      planItemToTask: (journalDate, itemId, categoryId, taskDate) => {
        const item = get().journals[journalDate]?.plan.find((p) => p.id === itemId);
        if (!item || item.taskId) return null;
        const taskId = get().addTask(taskDate, categoryId, item.text);
        get().updatePlanItem(journalDate, itemId, { taskId });
        return taskId;
      },
      updateSettings: (patch) => set((st) => ({ settings: { ...st.settings, ...patch } })),
      importData: (data) =>
        set({
          categories: migrateCategories(data.categories ?? []),
          tasks: data.tasks ?? [],
          sessions: data.sessions ?? [],
          journals: migrateJournals(data.journals ?? {}),
          dayCategories: data.dayCategories ?? {},
          settings: { ...DEFAULT_SETTINGS, ...data.settings },
        }),
      resetAll: () => set(initialData()),
    }),
    {
      name: "grindlog-v1",
      version: 3,
      migrate: (persisted) => {
        const p = persisted as PersistedState;
        return {
          ...p,
          categories: migrateCategories(p.categories ?? []),
          journals: migrateJournals(p.journals ?? {}),
        };
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (st): PersistedState => ({
        categories: st.categories,
        tasks: st.tasks,
        sessions: st.sessions,
        journals: st.journals,
        dayCategories: st.dayCategories,
        settings: st.settings,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedState>;
        return {
          ...current,
          ...p,
          settings: {
            ...DEFAULT_SETTINGS,
            ...p.settings,
            pomodoro: { ...DEFAULT_SETTINGS.pomodoro, ...p.settings?.pomodoro },
          },
        };
      },
    },
  ),
);
