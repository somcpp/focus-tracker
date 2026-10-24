import { create } from "zustand";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  modalOpen: boolean;
  modalMode: "signin" | "signup";
  setModalOpen: (open: boolean, mode?: "signin" | "signup") => void;
  checkSession: () => Promise<AuthUser | null>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const STORAGE_KEY = "focus_auth_session_v1";

function loadSavedSession(): { user: AuthUser | null; token: string | null } {
  if (typeof window === "undefined") return { user: null, token: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: null };
    const parsed = JSON.parse(raw);
    return { user: parsed.user || null, token: parsed.token || null };
  } catch {
    return { user: null, token: null };
  }
}

function saveSession(user: AuthUser | null, token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.warn("Failed to persist auth session:", e);
  }
}

const initial = loadSavedSession();

export const useAuth = create<AuthState>((set, get) => ({
  user: initial.user,
  token: initial.token,
  loading: false,
  modalOpen: false,
  modalMode: "signin",

  setModalOpen: (open, mode = "signin") => set({ modalOpen: open, modalMode: mode }),

  checkSession: async () => {
    try {
      // Check for OAuth session verifier in URL params if returning from OAuth
      let verifierParam = "";
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const verifier = params.get("neon_auth_session_verifier");
        if (verifier) {
          verifierParam = `?neon_auth_session_verifier=${encodeURIComponent(verifier)}`;
        }
      }

      const saved = loadSavedSession();
      const headers: Record<string, string> = {};
      if (saved.token) {
        headers["Authorization"] = `Bearer ${saved.token}`;
      }

      const res = await fetch(`/api/auth/get-session${verifierParam}`, {
        credentials: "include",
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.user) {
          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name || data.user.email.split("@")[0],
            image: data.user.image,
          };
          const token = data.token || data.session?.token || saved.token;
          saveSession(authUser, token);
          set({ user: authUser, token, loading: false });

          // Clean up the verifier parameter from URL cleanly without page reload
          if (typeof window !== "undefined" && window.location.search.includes("neon_auth_session_verifier")) {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete("neon_auth_session_verifier");
            window.history.replaceState(window.history.state, "", cleanUrl.href);
          }

          return authUser;
        }
      }

      // If proxy get-session didn't find a cookie, but we have a saved user in localStorage,
      // keep the saved user active so UI doesn't drop the logged-in state!
      if (saved.user) {
        set({ user: saved.user, token: saved.token, loading: false });
        return saved.user;
      }

      set({ user: null, token: null, loading: false });
      return null;
    } catch (err) {
      console.warn("Failed to check auth session:", err);
      const saved = loadSavedSession();
      set({ user: saved.user, token: saved.token, loading: false });
      return saved.user;
    }
  },

  signInWithGoogle: async () => {
    try {
      const callbackURL = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const res = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          provider: "google",
          callbackURL,
        }),
      });

      const data = await res.json();
      if (data && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data?.message || "Failed to initiate Google sign-in");
      }
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      throw err;
    }
  },

  signInWithEmail: async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || data?.message) {
        return { error: data?.message || "Invalid email or password" };
      }

      if (data && data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name || email.split("@")[0],
          image: data.user.image,
        };
        saveSession(authUser, data.token || null);
        set({ user: authUser, token: data.token || null, modalOpen: false });
        return {};
      }

      return { error: "Authentication failed. Please try again." };
    } catch (err: any) {
      return { error: err.message || "Failed to sign in" };
    }
  },

  signUpWithEmail: async (name: string, email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok || data?.message) {
        return { error: data?.message || "Failed to create account" };
      }

      if (data && data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name || name,
          image: data.user.image,
        };
        saveSession(authUser, data.token || null);
        set({ user: authUser, token: data.token || null, modalOpen: false });
        return {};
      }

      return { error: "Registration failed. Please try again." };
    } catch (err: any) {
      return { error: err.message || "Failed to sign up" };
    }
  },

  signOut: async () => {
    try {
      saveSession(null, null);
      set({ user: null, token: null });
      await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
    } catch (err) {
      console.warn("Sign out failed:", err);
      saveSession(null, null);
      set({ user: null, token: null });
    }
  },
}));
