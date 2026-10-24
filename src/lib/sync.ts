import { useStore } from "./store";

let syncTimeout: NodeJS.Timeout | null = null;
let isSyncing = false;

/**
 * Triggers a debounced background sync of the local store to Neon Postgres.
 * Never blocks the UI or main thread.
 */
export function queueDatabaseSync(delayMs = 1500) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    if (isSyncing) return;
    try {
      isSyncing = true;
      const state = useStore.getState();

      const payload = {
        categories: state.categories,
        tasks: state.tasks,
        sessions: state.sessions,
        journals: state.journals,
        settings: state.settings,
      };

      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // Offline or network error: fail silently and keep local-first state intact
      console.warn("[CloudSync] Background sync to Neon failed (retaining local state):", err);
    } finally {
      isSyncing = false;
    }
  }, delayMs);
}

/**
 * On first mount, if localStorage is completely fresh/empty, restore from Neon Postgres.
 */
export async function initializeDatabaseSync() {
  try {
    const local = useStore.getState();
    const isLocalEmpty = local.tasks.length === 0 && local.sessions.length === 0;

    if (isLocalEmpty) {
      const res = await fetch("/api/sync");
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

    // Otherwise push existing local data to ensure Neon is up-to-date
    queueDatabaseSync(800);
  } catch (err) {
    console.warn("[CloudSync] Initialization failed:", err);
  }
}
