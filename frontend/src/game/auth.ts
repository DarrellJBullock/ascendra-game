// Auth store (Zustand) — Phase 2. Session state + magic-link / Google sign-in.
// Inert when Supabase isn't configured (ready=true, no user).

import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

import { getSupabase, isSupabaseConfigured } from "@/src/lib/supabase";

interface AuthStore {
  ready: boolean; // initial session check complete
  session: Session | null;
  user: User | null;
  init: () => void;
  signInWithEmail: (email: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

let initialized = false; // guard: subscribe to auth changes only once

export const useAuth = create<AuthStore>((set) => ({
  ready: !isSupabaseConfigured(), // nothing to wait for when cloud is off
  session: null,
  user: null,

  init: () => {
    if (initialized) return;
    initialized = true;
    const sb = getSupabase();
    if (!sb) {
      set({ ready: true });
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      set({ session: data.session, user: data.session?.user ?? null, ready: true });
    });
    sb.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },

  signInWithEmail: async (email) => {
    const sb = getSupabase();
    if (!sb) return { error: "Cloud saves aren't configured." };
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    return error ? { error: error.message } : {};
  },

  signInWithGoogle: async () => {
    const sb = getSupabase();
    if (!sb) return { error: "Cloud saves aren't configured." };
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    return error ? { error: error.message } : {};
  },

  signOut: async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    set({ session: null, user: null });
  },
}));
