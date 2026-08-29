"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Browser Supabase client. Uses the publishable key, so every request is
 * still gated by Row Level Security.
 *
 * Used for auth flows and for the exam answer autosave path, where a direct
 * write keeps typing responsive. Everything that touches scoring or billing
 * goes through a server route instead.
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  browserClient ??= createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  return browserClient;
}
