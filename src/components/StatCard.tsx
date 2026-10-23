"use client";

import { motion } from "motion/react";

export function StatCard({ emoji, label, value, color }: { emoji: string; label: string; value: string; color: string }) {
  return (
    <motion.div whileHover={{ y: -3 }} className="card flex items-center gap-3 p-4">
      <span className="pop-btn grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: color }}>
        {emoji}
      </span>
      <div className="min-w-0">
        <p className="truncate font-display text-xl font-bold md:text-2xl">{value}</p>
        <p className="truncate text-xs font-bold text-muted">{label}</p>
      </div>
    </motion.div>
  );
}
