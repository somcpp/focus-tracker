"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle, type LucideIcon } from "lucide-react";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { create } from "zustand";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white shadow-sm hover:brightness-110",
  success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
  secondary: "border border-line bg-card text-ink shadow-sm hover:bg-card-2",
  ghost: "text-muted hover:bg-card-2 hover:text-ink",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-3.5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
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
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-card-2 hover:text-ink ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-tight md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
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
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 p-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className={`max-h-[88vh] w-full overflow-y-auto rounded-2xl border border-line bg-card shadow-2xl ${wide ? "max-w-2xl" : "max-w-md"}`}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
              <h2 className="text-[15px] font-semibold">{title}</h2>
              <IconButton label="Close" onClick={onClose}>
                <X size={16} />
              </IconButton>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- toasts ---------------- */

type Tone = "success" | "info" | "warning" | "error";
const TONES: Record<Tone, { icon: LucideIcon; color: string }> = {
  success: { icon: CheckCircle2, color: "#10b981" },
  info: { icon: Info, color: "#3b82f6" },
  warning: { icon: AlertTriangle, color: "#f59e0b" },
  error: { icon: XCircle, color: "#ef4444" },
};

interface Toast {
  id: number;
  tone: Tone;
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
    <div className="pointer-events-none fixed bottom-20 right-4 z-[60] flex flex-col items-end gap-2 md:bottom-5 md:right-5">
      <AnimatePresence>
        {toasts.map((t) => {
          const { icon: Icon, color } = TONES[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-auto flex items-center gap-3 rounded-xl border border-line bg-card py-2.5 pl-3 pr-2 text-sm shadow-lg"
            >
              <Icon size={18} style={{ color }} />
              <span className="font-medium">{t.text}</span>
              {t.action && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </Button>
              )}
              <IconButton label="Dismiss" className="!h-6 !w-6" onClick={() => dismiss(t.id)}>
                <X size={14} />
              </IconButton>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function Badge({ children, color, className = "" }: { children: ReactNode; color: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-px text-[11px] font-semibold ${className}`}
      style={{ color, background: `color-mix(in srgb, ${color} 13%, transparent)` }}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  color = "#3b82f6",
  children,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  color?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span
        className="mb-1 grid h-12 w-12 place-items-center rounded-xl"
        style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
      >
        <Icon size={22} />
      </span>
      <p className="font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-muted">{text}</p>
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold">{children}</h2>
      {right && <div className="text-xs text-muted">{right}</div>}
    </div>
  );
}
