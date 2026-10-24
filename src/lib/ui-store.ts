"use client";

import { create } from "zustand";

export type ShareScope = "day" | "month";

/** Ephemeral (non-persisted) UI state shared across components */
export const useUi = create<{
  breakUntil: number | null;
  breakTaskId: string | null;
  openTaskId: string | null;
  shareModalOpen: boolean;
  shareDate: string | null;
  shareScope: ShareScope;
  setBreak: (until: number | null, taskId?: string | null) => void;
  openTask: (id: string | null) => void;
  openShare: (date?: string, scope?: ShareScope) => void;
  closeShare: () => void;
}>((set) => ({
  breakUntil: null,
  breakTaskId: null,
  openTaskId: null,
  shareModalOpen: false,
  shareDate: null,
  shareScope: "day",
  setBreak: (until, taskId = null) => set({ breakUntil: until, breakTaskId: taskId }),
  openTask: (id) => set({ openTaskId: id }),
  openShare: (date, scope = "day") => set({ shareModalOpen: true, shareDate: date ?? null, shareScope: scope }),
  closeShare: () => set({ shareModalOpen: false, shareDate: null }),
}));
