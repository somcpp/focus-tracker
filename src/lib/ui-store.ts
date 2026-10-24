"use client";

import { create } from "zustand";

/** Ephemeral (non-persisted) UI state shared across components */
export const useUi = create<{
  breakUntil: number | null;
  breakTaskId: string | null;
  openTaskId: string | null;
  shareModalOpen: boolean;
  shareDate: string | null;
  setBreak: (until: number | null, taskId?: string | null) => void;
  openTask: (id: string | null) => void;
  openShare: (date?: string) => void;
  closeShare: () => void;
}>((set) => ({
  breakUntil: null,
  breakTaskId: null,
  openTaskId: null,
  shareModalOpen: false,
  shareDate: null,
  setBreak: (until, taskId = null) => set({ breakUntil: until, breakTaskId: taskId }),
  openTask: (id) => set({ openTaskId: id }),
  openShare: (date) => set({ shareModalOpen: true, shareDate: date ?? null }),
  closeShare: () => set({ shareModalOpen: false, shareDate: null }),
}));
