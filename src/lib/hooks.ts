"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useStore } from "./store";
import { dayKey, todayKey } from "./time";

const noopSubscribe = () => () => {};

/** false during SSR and the hydration pass, true afterwards */
export function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Current timestamp, re-rendering every `interval` ms while `active` */
export function useNow(active = true, interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [active, interval]);
  return now;
}

/** Today's active day key, updating dynamically after midnight or user's custom cutoff hour */
export function useToday() {
  const cutoffHour = useStore((s) => s.settings.dayCutoffHour ?? 0);
  const [today, setToday] = useState(() => todayKey(cutoffHour));
  useEffect(() => {
    const update = () => {
      const k = todayKey(cutoffHour);
      setToday((prev) => (prev === k ? prev : k));
    };
    update();
    const id = setInterval(update, 15000);
    return () => clearInterval(id);
  }, [cutoffHour]);
  return today;
}

export function useActiveSession() {
  return useStore((s) => s.sessions.find((x) => x.end === null) ?? null);
}
