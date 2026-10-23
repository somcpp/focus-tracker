import { Annoyed, Frown, Laugh, Meh, Smile, type LucideIcon } from "lucide-react";

export const MOODS: { value: number; label: string; icon: LucideIcon; color: string }[] = [
  { value: 1, label: "Rough", icon: Frown, color: "#ef4444" },
  { value: 2, label: "Meh", icon: Annoyed, color: "#f97316" },
  { value: 3, label: "Okay", icon: Meh, color: "#eab308" },
  { value: 4, label: "Good", icon: Smile, color: "#10b981" },
  { value: 5, label: "Great", icon: Laugh, color: "#3b82f6" },
];

export const getMood = (v: number | null | undefined) => MOODS.find((m) => m.value === v);
