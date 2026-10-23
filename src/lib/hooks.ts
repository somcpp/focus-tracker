"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useStore } from "./store";
import { dayKey } from "./time";

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

/** Today's day key, updating after midnight */
export function useToday() {
  const [today, setToday] = useState(() => dayKey());
  useEffect(() => {
    const id = setInterval(() => {
      const k = dayKey();
      setToday((prev) => (prev === k ? prev : k));
    }, 30000);
    return () => clearInterval(id);
  }, []);
  return today;
}

export function useActiveSession() {
  return useStore((s) => s.sessions.find((x) => x.end === null) ?? null);
}
