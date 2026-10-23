"use client";

import type { LucideIcon } from "lucide-react";

/** Pastel KPI card: tinted background, solid round icon, big number, colored label */
export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  progress,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  color: string;
  /** Optional 0..1 progress bar under the value */
  progress?: number;
}) {
  return (
    <div
      className="flex items-center gap-3.5 rounded-2xl border p-4"
      style={{
        background: `color-mix(in srgb, ${color} 8%, var(--card))`,
        borderColor: `color-mix(in srgb, ${color} 16%, var(--line))`,
      }}
    >
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white"
        style={{
          background: `linear-gradient(140deg, color-mix(in srgb, ${color} 75%, white), ${color})`,
          boxShadow: `0 6px 14px -6px ${color}`,
        }}
      >
        <Icon size={20} strokeWidth={2.4} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[22px] font-bold leading-tight tracking-tight tnum">{value}</p>
        <p className="truncate text-[13px] font-medium" style={{ color }}>
          {label}
        </p>
        {sub && <p className="truncate text-[11px] text-muted">{sub}</p>}
        {progress !== undefined && (
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: `color-mix(in srgb, ${color} 15%, var(--card))` }}>
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${Math.min(1, progress) * 100}%`, background: progress >= 1 ? "#12b76a" : color }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
