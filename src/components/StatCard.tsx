"use client";

import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        <span
          className="grid h-7 w-7 place-items-center rounded-lg"
          style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
        >
          <Icon size={15} strokeWidth={2.3} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tnum">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}
