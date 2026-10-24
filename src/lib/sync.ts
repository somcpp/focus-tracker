import { create } from "zustand";
import { useStore } from "./store";
import { useAuth } from "./auth-client";

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
 * Triggers a debounced background sync of the local store to Neon Postgres.
 * Always syncs ALL data (categories, tasks, sessions, journals, settings) from localStorage.
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
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (auth.token) {
        headers["Authorization"] = `Bearer ${auth.token}`;
      }

      const res = await fetch("/api/sync", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.warn("[CloudSync] Sync returned non-200 status:", res.status);
      }
      useSyncStatus.getState().setSyncing(false);
    } catch (err) {
      // Offline or network error: fail silently and keep local-first state intact
      console.warn("[CloudSync] Background sync to Neon failed (retaining local state):", err);
      useSyncStatus.getState().setSyncing(false, "Sync failed");
    } finally {
      isSyncInProgress = false;
    }
  }, delayMs);
}

/**
 * Immediately pushes current localStorage data to Neon without waiting for debounce.
 */
export async function pushDatabaseSyncNow() {
  if (syncTimeout) clearTimeout(syncTimeout);
  return queueDatabaseSync(0);
}

/**
 * On first mount:
 * - If localStorage is completely fresh/empty, restore from Neon Postgres.
 * - If localStorage already contains data, push all existing categories, tasks,
 *   sessions, journals to Neon so cloud is fully up to date.
 */
export async function initializeDatabaseSync() {
  try {
    const local = useStore.getState();
    const auth = useAuth.getState();
    const isLocalEmpty = local.tasks.length === 0 && local.sessions.length === 0;

    const headers: Record<string, string> = {};
    if (auth.token) {
      headers["Authorization"] = `Bearer ${auth.token}`;
    }

    if (isLocalEmpty) {
      const res = await fetch("/api/sync", {
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.categories?.length > 0 || data.tasks?.length > 0) {
          useStore.setState({
            categories: data.categories.length > 0 ? data.categories : local.categories,
            tasks: data.tasks ?? [],
            sessions: data.sessions ?? [],
            journals: data.journals ?? {},
            settings: data.settings ? { ...local.settings, ...data.settings } : local.settings,
          });
          return;
        }
      }
    }

    // Push all existing local data immediately to ensure Neon is completely synchronized
    queueDatabaseSync(300);
  } catch (err) {
    console.warn("[CloudSync] Initialization failed:", err);
  }
}
