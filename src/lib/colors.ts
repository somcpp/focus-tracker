import type { ColorKey } from "./types";

export const COLORS: Record<ColorKey, { solid: string; label: string }> = {
  tomato: { solid: "#ff6b6b", label: "Tomato" },
  tangerine: { solid: "#ff9f43", label: "Tangerine" },
  sunshine: { solid: "#f7c531", label: "Sunshine" },
  lime: { solid: "#7bd389", label: "Lime" },
  mint: { solid: "#2ec4b6", label: "Mint" },
  sky: { solid: "#4d96ff", label: "Sky" },
  grape: { solid: "#9b5de5", label: "Grape" },
  bubblegum: { solid: "#f15bb5", label: "Bubblegum" },
};

export const COLOR_KEYS = Object.keys(COLORS) as ColorKey[];

export const EMOJIS = [
  "🧠", "💻", "📚", "🎯", "🚀", "✍️", "🎨", "🧪",
  "📐", "🏋️", "🎧", "🌱", "🔥", "⚡", "🧩", "📝",
  "🎓", "💡", "🛠️", "📊", "🗣️", "🎸", "🧘", "☕",
];

export const solid = (c: ColorKey) => COLORS[c].solid;

/** A soft tint of the color that works on both light and dark cards */
export const tint = (c: ColorKey, pct = 18) =>
  `color-mix(in oklab, ${COLORS[c].solid} ${pct}%, var(--card))`;

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
