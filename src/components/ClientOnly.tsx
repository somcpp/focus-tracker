"use client";

import type { ReactNode } from "react";
import { useMounted } from "@/lib/hooks";

/** Renders children only in the browser, since all app data lives in localStorage */
export function ClientOnly({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
      </div>
    );
  }
  return <>{children}</>;
}
