"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { create } from "zustand";

type Variant = "primary" | "ghost" | "plain" | "danger" | "mint" | "sun";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white",
  mint: "bg-[#2ec4b6] text-white",
  sun: "bg-[#f7c531] text-[#2b2240]",
  danger: "bg-[#ff6b6b] text-white",
  plain: "bg-card text-ink",
  ghost: "",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    variant === "ghost"
      ? "rounded-2xl px-3 py-2 text-muted hover:bg-card-2 hover:text-ink transition-colors"
      : `pop-btn rounded-2xl px-4 py-2 font-display font-semibold ${VARIANTS[variant]}`;
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 ${base} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconButton({
  className = "",
  children,
  label,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-card-2 hover:text-ink ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-[#2b2240]/40 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className={`card max-h-[90vh] w-full overflow-y-auto p-6 ${wide ? "max-w-2xl" : "max-w-md"}`}
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="font-display text-2xl font-semibold">{title}</h2>
              <IconButton label="Close" onClick={onClose}>
                <X size={18} />
              </IconButton>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- toasts ---------------- */

interface Toast {
  id: number;
  emoji: string;
  text: string;
  action?: { label: string; onClick: () => void };
}

const useToasts = create<{
  toasts: Toast[];
  push: (t: Omit<Toast, "id">, ms?: number) => void;
  dismiss: (id: number) => void;
}>((set, get) => ({
  toasts: [],
  push: (t, ms = 3500) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => get().dismiss(id), ms);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = (t: Omit<Toast, "id">, ms?: number) => useToasts.getState().push(t, ms);

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="card pointer-events-auto flex items-center gap-3 px-4 py-3"
          >
            <span className="text-2xl">{t.emoji}</span>
            <span className="font-semibold">{t.text}</span>
            {t.action && (
              <Button
                variant="sun"
                className="!px-3 !py-1 text-sm"
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </Button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Chip({
  children,
  color,
  className = "",
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border-2 border-line px-2.5 py-0.5 text-xs font-bold ${className}`}
      style={color ? { background: color } : undefined}
    >
      {children}
    </span>
  );
}

export function EmptyState({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <motion.div
        className="text-6xl"
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
      >
        {emoji}
      </motion.div>
      <p className="font-display text-xl font-semibold">{title}</p>
      <p className="max-w-xs text-muted">{text}</p>
    </div>
  );
}
