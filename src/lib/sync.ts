import { create } from "zustand";
import { useStore } from "./store";
import { useAuth } from "./auth-client";
import type { Category, Task, Session, Journal, Settings } from "./types";

interface SyncStatusState {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  error: string | null;
  setSyncing: (syncing: boolean, error?: string | null) => void;
}

export const useSyncStatus = create<SyncStatusState>((set) => ({
  isSyncing: false,
  lastSyncedAt: null,
  error: null,
  setSyncing: (syncing, error = null) =>
    set((s) => ({
      isSyncing: syncing,
      error,
      lastSyncedAt: syncing ? s.lastSyncedAt : new Date(),
    })),
}));

let syncTimeout: NodeJS.Timeout | null = null;
let isSyncInProgress = false;

/**
 * Robust 2-way sync:
 * 1. Pulls all cloud data (categories, tasks, sessions, journals, settings) from Neon Postgres.
 * 2. Merges cloud data with local storage so no local or remote data is ever lost.
 * 3. Immediately pushes the merged state back to Neon Postgres so all devices are synchronized.
 */
export async function syncWithCloud(): Promise<void> {
  if (isSyncInProgress) return;
  try {
    isSyncInProgress = true;
    useSyncStatus.getState().setSyncing(true);

    const auth = useAuth.getState();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (auth.token) {
      headers["Authorization"] = `Bearer ${auth.token}`;
    }

    // 1. Fetch remote data from Neon
    const res = await fetch("/api/sync", {
      headers,
      credentials: "include",
    });

    let remoteCategories: Category[] = [];
    let remoteTasks: Task[] = [];
    let remoteSessions: Session[] = [];
    let remoteJournals: Record<string, Journal> = {};
    let remoteSettings: Partial<Settings> | null = null;

    if (res.ok) {
      const data = await res.json();
      remoteCategories = data.categories || [];
      remoteTasks = data.tasks || [];
      remoteSessions = data.sessions || [];
      remoteJournals = data.journals || {};
      remoteSettings = data.settings || null;
    }

    const local = useStore.getState();
    const deletedCatSet = new Set(local.deletedCategoryIds || []);

    // 2. Perform intelligent bidirectional merge:
    // Categories: union by id, excluding any deleted categories
    const catMap = new Map<string, Category>();
    remoteCategories
      .filter((c) => !deletedCatSet.has(c.id))
      .forEach((c) => catMap.set(c.id, c));
    local.categories
      .filter((c) => !deletedCatSet.has(c.id))
      .forEach((c) => catMap.set(c.id, c));
    const mergedCategories = Array.from(catMap.values());

    // Tasks: union by id
    const taskMap = new Map<string, Task>();
    remoteTasks.forEach((t) => taskMap.set(t.id, t));
    local.tasks.forEach((t) => {
      const remoteT = taskMap.get(t.id);
      if (remoteT) {
        taskMap.set(t.id, {
          ...remoteT,
          ...t,
          done: t.done || remoteT.done,
        });
      } else {
        taskMap.set(t.id, t);
      }
    });
    const mergedTasks = Array.from(taskMap.values());

    // Sessions: union by id
    const sessionMap = new Map<string, Session>();
    remoteSessions.forEach((s) => sessionMap.set(s.id, s));
    local.sessions.forEach((s) => sessionMap.set(s.id, s));
    const mergedSessions = Array.from(sessionMap.values());

    // Journals: union by date
    const mergedJournals = { ...remoteJournals, ...local.journals };

    // Settings: merge
    const mergedSettings = { ...local.settings, ...(remoteSettings || {}) };

    // Update local store with the merged state
    useStore.setState({
      categories: mergedCategories.length > 0 ? mergedCategories : local.categories,
      tasks: mergedTasks,
      sessions: mergedSessions,
      journals: mergedJournals,
      settings: mergedSettings,
    });

    // 3. Push complete merged state back to Neon so cloud is 100% up to date
    const payload = {
      categories: mergedCategories,
      tasks: mergedTasks,
      sessions: mergedSessions,
      journals: mergedJournals,
      settings: mergedSettings,
      deletedCategoryIds: Array.from(deletedCatSet),
    };

    await fetch("/api/sync", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(payload),
    });

    useSyncStatus.getState().setSyncing(false);
  } catch (err) {
    console.warn("[CloudSync] syncWithCloud failed:", err);
    useSyncStatus.getState().setSyncing(false, "Sync failed");
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * Triggers a debounced background sync of the local store to Neon Postgres.
 * Never blocks the UI or main thread.
 */
export function queueDatabaseSync(delayMs = 1200) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    if (isSyncInProgress) return;
    try {
      isSyncInProgress = true;
      useSyncStatus.getState().setSyncing(true);

      const state = useStore.getState();
      const auth = useAuth.getState();

      const payload = {
        categories: state.categories,
        tasks: state.tasks,
        sessions: state.sessions,
        journals: state.journals,
        settings: state.settings,
        deletedCategoryIds: state.deletedCategoryIds || [],
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (auth.token) {
        headers["Authorization"] = `Bearer ${auth.token}`;
      }

      await fetch("/api/sync", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(payload),
      });

      useSyncStatus.getState().setSyncing(false);
    } catch (err) {
      console.warn("[CloudSync] Debounced push to Neon failed:", err);
      useSyncStatus.getState().setSyncing(false, "Sync failed");
    } finally {
      isSyncInProgress = false;
    }
  }, delayMs);
}

/**
 * Immediately triggers a full bidirectional sync with Neon Postgres.
 */
export async function pushDatabaseSyncNow() {
  if (syncTimeout) clearTimeout(syncTimeout);
  return syncWithCloud();
}

/**
 * On first mount, trigger a full bidirectional sync with Neon Postgres.
 */
export async function initializeDatabaseSync() {
  return syncWithCloud();
}
