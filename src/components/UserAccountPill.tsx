"use client";

import { Cloud } from "lucide-react";
import { useAuth } from "@/lib/auth-client";

export function UserAccountPill({ className = "" }: { className?: string }) {
  const user = useAuth((s) => s.user);
  const setModalOpen = useAuth((s) => s.setModalOpen);

  if (user) {
    const initial = (user.name || user.email || "U")[0].toUpperCase();
    const displayName = user.name || user.email.split("@")[0];

    return (
      <button
        onClick={() => setModalOpen(true)}
        className={`group flex items-center gap-2 rounded-full border border-line-strong bg-card-2 py-1 pl-1 pr-3 text-xs font-semibold text-ink shadow-xs transition hover:border-accent hover:bg-card active:scale-95 ${className}`}
        title={`Signed in as ${user.email} (Click to manage)`}
      >
        {user.image ? (
          <img
            src={user.image}
            alt={displayName}
            className="h-7 w-7 rounded-full border border-line object-cover"
          />
        ) : (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-[11.5px] font-bold text-white shadow-xs">
            {initial}
          </span>
        )}
        <div className="flex flex-col text-left leading-tight">
          <span className="max-w-[120px] truncate text-[12.5px] font-bold text-ink group-hover:text-accent">
            {displayName}
          </span>
          <span className="flex items-center gap-1 text-[10.5px] font-medium text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Synced
          </span>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => setModalOpen(true, "signin")}
      className={`flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:brightness-110 active:scale-95 ${className}`}
    >
      <Cloud size={14} className="text-white/90" />
      <span>Sign In / Sync</span>
    </button>
  );
}
