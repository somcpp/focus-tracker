"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Old route: the journal now lives at /journal */
export default function DayIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/journal");
  }, [router]);
  return null;
}
