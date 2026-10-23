"use client";

import { ClientOnly } from "@/components/ClientOnly";
import { JournalView } from "@/components/JournalView";
import { useToday } from "@/lib/hooks";

function TodayJournal() {
  const today = useToday();
  return <JournalView date={today} />;
}

export default function Page() {
  return (
    <ClientOnly>
      <TodayJournal />
    </ClientOnly>
  );
}
