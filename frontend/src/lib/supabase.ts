// Supabase client — Phase 2 (auth + cloud multi-save).
//
// Config-gated: if the NEXT_PUBLIC_SUPABASE_* env vars are absent, the whole
// cloud layer is INERT and the app runs exactly as before (local-only saves).
// This lets the code ship safely before the Supabase project exists — it
// activates the moment the env vars are set.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON);
}

/** Returns the singleton client, or null when cloud saves aren't configured. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(URL as string, ANON as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // completes magic-link / OAuth redirects
      },
    });
  }
  return client;
}
