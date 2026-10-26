"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Old route: a day's log now lives in the Calendar's day panel */
function Redirect() {
  const router = useRouter();
  const { date } = useParams<{ date: string }>();
  useEffect(() => {
    router.replace(`/calendar?date=${encodeURIComponent(date)}`);
  }, [router, date]);
  return null;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Redirect />
    </Suspense>
  );
}
