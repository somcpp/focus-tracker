"use client";

import { create } from "zustand";

/** Ephemeral (non-persisted) UI state shared across components */
export const useUi = create<{
  breakUntil: number | null;
  breakTaskId: string | null;
  openTaskId: string | null;
  setBreak: (until: number | null, taskId?: string | null) => void;
  openTask: (id: string | null) => void;
}>((set) => ({
  breakUntil: null,
  breakTaskId: null,
  openTaskId: null,
  setBreak: (until, taskId = null) => set({ breakUntil: until, breakTaskId: taskId }),
  openTask: (id) => set({ openTaskId: id }),
}));
