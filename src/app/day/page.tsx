"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { dayKey } from "@/lib/time";

/** /day → today's journal */
export default function DayIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/day/${dayKey()}`);
  }, [router]);
  return null;
}
