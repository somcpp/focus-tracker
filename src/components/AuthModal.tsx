"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-client";
import { Button, Modal } from "./ui";
import { Cloud, Laptop, LogOut, RefreshCw } from "lucide-react";
import { pushDatabaseSyncNow } from "@/lib/sync";
import { useUi } from "@/lib/ui-store";

export function AuthModal() {
  const { user, modalOpen, modalMode, setModalOpen, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut } =
    useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncingNow, setSyncingNow] = useState(false);

  const isSignUp = modalMode === "signup";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setError("Please enter your name");
          setLoading(false);
          return;
        }
        const res = await signUpWithEmail(name.trim(), email.trim(), password);
        if (res.error) setError(res.error);
      } else {
        const res = await signInWithEmail(email.trim(), password);
        if (res.error) setError(res.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start Google sign-in";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={user ? "Account & Cloud Sync" : ""}>
      <div className="relative">
        {user ? (
          /* User Profile & Cloud Sync Card */
          <div className="flex flex-col gap-5 py-2">
            <div className="flex items-center gap-3.5">
              {user.image ? (
                <img src={user.image} alt={user.name} className="h-12 w-12 rounded-full border border-line object-cover" />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
                  {(user.name || user.email || "U")[0].toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-ink">{user.name || "Focus User"}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <Cloud size={13} className="text-emerald-500" /> Synced to Neon Postgres
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-card-2 p-3.5 text-xs text-muted">
              All your existing local data (categories, tasks, timer sessions, and journals) is synchronized with Neon Cloud database.
            </div>

            <Button
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                useUi.getState().setDesktopPairOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 font-semibold py-2.5"
            >
              <Laptop size={15} className="text-indigo-400" />
              <span>Pair Desktop Island (6-Digit Code)</span>
            </Button>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  setSyncingNow(true);
                  await pushDatabaseSyncNow();
                  setTimeout(() => setSyncingNow(false), 600);
                }}
                className="flex-1"
                disabled={syncingNow}
              >
                <RefreshCw size={14} className={syncingNow ? "animate-spin" : ""} />
                {syncingNow ? "Syncing..." : "Sync Now"}
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  await signOut();
                  setModalOpen(false);
                }}
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <LogOut size={15} /> Sign Out
              </Button>
            </div>
          </div>
        ) : (
          /* Sign In / Sign Up Form */
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <span className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
                <Cloud size={22} />
              </span>
              <h2 className="text-xl font-bold tracking-tight">
                {isSignUp ? "Create your account" : "Sign in to Focus Tracker"}
              </h2>
              <p className="mt-1 text-xs text-muted">
                Sync tasks, timers, and streaks seamlessly across all your devices
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Google OAuth Button */}
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-card-2 hover:shadow disabled:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="relative my-1 flex items-center justify-center">
              <span className="w-full border-t border-line" />
              <span className="absolute bg-card px-2 text-[11px] uppercase tracking-wider text-muted">
                or with email
              </span>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {isSignUp && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink-2">Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="field w-full px-3 py-2 text-sm text-ink placeholder:text-muted"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-2">Email</label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field w-full px-3 py-2 text-sm text-ink placeholder:text-muted"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-2">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field w-full px-3 py-2 text-sm text-ink placeholder:text-muted"
                />
              </div>

              <Button type="submit" disabled={loading} className="mt-1 w-full justify-center">
                {loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
              </Button>
            </form>

            <div className="text-center text-xs text-muted">
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setModalOpen(true, "signin")}
                    className="font-semibold text-accent hover:underline"
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setModalOpen(true, "signup")}
                    className="font-semibold text-accent hover:underline"
                  >
                    Create one
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
