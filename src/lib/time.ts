const pad = (n: number) => String(n).padStart(2, "0");

/** Local-time YYYY-MM-DD key */
export function dayKey(d: Date | number = new Date()): string {
  const date = typeof d === "number" ? new Date(d) : d;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Computes the active day key taking into account the user's custom day cutoff hour (0-12).
 * e.g., if cutoffHour = 4, timestamps between 00:00 and 03:59:59 still belong to the previous calendar day.
 */
export function todayKey(cutoffHour = 0, now: number = Date.now()): string {
  const adjusted = new Date(now - cutoffHour * 3600000);
  return dayKey(adjusted);
}

/** Formats a cutoff hour into user-friendly time, e.g. 0 -> "12:00 AM (Midnight)", 4 -> "4:00 AM" */
export function formatCutoffTime(hour: number): string {
  if (hour === 0) return "12:00 AM (Midnight)";
  if (hour === 12) return "12:00 PM (Noon)";
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const minStr = m > 0 ? `:${pad(m)}` : ":00";
  return `${h}${minStr} AM`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, delta: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + delta);
  return dayKey(d);
}

/** 3725000 -> "1:02:05" */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** 3725000 -> "1h 2m" */
export function formatDuration(ms: number): string {
  const totalMin = Math.floor(Math.max(0, ms) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatHours(ms: number): string {
  const h = ms / 3600000;
  return h >= 10 ? h.toFixed(0) : h.toFixed(1);
}

export function formatTimeOfDay(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function prettyDate(key: string, opts?: Intl.DateTimeFormatOptions): string {
  return parseDayKey(key).toLocaleDateString(
    [],
    opts ?? { weekday: "long", month: "long", day: "numeric" },
  );
}

/** "HH:MM" for <input type="time"> */
export function toTimeInput(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromTimeInput(base: number, value: string): number {
  const [h, m] = value.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
