"use client";

import { useParams } from "next/navigation";
import { Inbox } from "lucide-react";
import { ClientOnly } from "@/components/ClientOnly";
import { JournalView } from "@/components/JournalView";
import { EmptyState } from "@/components/ui";

function DatedJournal() {
  const { date } = useParams<{ date: string }>();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return <EmptyState icon={Inbox} title="Invalid date" text="Pick a day from the journal calendar instead." />;
  }
  return <JournalView key={date} date={date} />;
}

export default function Page() {
  return (
    <ClientOnly>
      <DatedJournal />
    </ClientOnly>
  );
}
