import type { ColorKey } from "./types";

export const COLORS: Record<ColorKey, { solid: string; label: string }> = {
  blue: { solid: "#3b82f6", label: "Blue" },
  orange: { solid: "#f97316", label: "Orange" },
  green: { solid: "#10b981", label: "Green" },
  yellow: { solid: "#eab308", label: "Yellow" },
  purple: { solid: "#8b5cf6", label: "Purple" },
  pink: { solid: "#ec4899", label: "Pink" },
  red: { solid: "#ef4444", label: "Red" },
  teal: { solid: "#14b8a6", label: "Teal" },
};

export const COLOR_KEYS = Object.keys(COLORS) as ColorKey[];

export const solid = (c: ColorKey) => (COLORS[c] ?? COLORS.blue).solid;

/** A soft tint of the color that works on both light and dark surfaces */
export const tint = (c: ColorKey, pct = 12) =>
  `color-mix(in srgb, ${solid(c)} ${pct}%, var(--card))`;

/** Heatmap levels 0-4 */
export const HEAT = [
  "var(--heat-0)",
  "var(--heat-1)",
  "var(--heat-2)",
  "var(--heat-3)",
  "var(--heat-4)",
];

export function heatLevel(ms: number, goalMinutes: number): number {
  if (ms <= 0) return 0;
  const ratio = ms / (goalMinutes * 60000);
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 1) return 3;
  return 4;
}

export const DIFFICULTY = {
  easy: { label: "Easy", color: "#10b981" },
  medium: { label: "Medium", color: "#f59e0b" },
  hard: { label: "Hard", color: "#ef4444" },
} as const;
