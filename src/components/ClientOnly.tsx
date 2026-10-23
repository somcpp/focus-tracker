"use client";

import type { ReactNode } from "react";
import { useMounted } from "@/lib/hooks";

/** Renders children only in the browser, since all app data lives in localStorage */
export function ClientOnly({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="animate-bounce text-6xl">⏱️</div>
      </div>
    );
  }
  return <>{children}</>;
}
