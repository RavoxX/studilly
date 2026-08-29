import "server-only";

import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client.
 *
 * This client BYPASSES Row Level Security. It exists for the writes that must
 * not be forgeable from a browser: exam points, grades, evaluations,
 * subscription plans and usage counters.
 *
 * Rules for using it:
 *   1. Never import this module from a Client Component. The `server-only`
 *      guard turns that into a build error.
 *   2. Always establish the caller's identity first with `requireUser()` and
 *      then filter every query by that id yourself. RLS is not protecting you
 *      here, so an unscoped query is an IDOR waiting to happen.
 *   3. Prefer the session-bound client from `./server` whenever RLS is
 *      sufficient. Reach for this one deliberately.
 */
let cached: ReturnType<typeof createClient<Database>> | null = null;

export function createAdminClient() {
  if (cached) return cached;

  cached = createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );

  return cached;
}
