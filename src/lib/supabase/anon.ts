import "server-only";

import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * A cookie-free client on the publishable key.
 *
 * Used for one job: verifying an access token sent by a native client. It
 * deliberately is not the service-role client, which would validate anything
 * handed to it; this fails closed on an expired or revoked token exactly as
 * the browser path does.
 */
export function createAnonClient() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
