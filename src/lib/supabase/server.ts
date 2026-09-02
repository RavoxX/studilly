import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Supabase client bound to the signed-in user's session.
 *
 * Every query made through this client is subject to Row Level Security, so
 * it is the right default for reading a student's own data. Use it in Server
 * Components, Server Actions and Route Handlers.
 *
 * A session arrives one of two ways. The browser sends cookies. The iOS app
 * sends a bearer token, and that token has to be forwarded to PostgREST as
 * well: without it the query runs as `anon`, row-level security returns
 * nothing, and the route concludes the student has no profile rather than
 * that it asked with the wrong identity. Verifying who the caller is and
 * querying as them are two separate things, and both have to follow the same
 * credential.
 */
export async function createClient() {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

  const authorization = headerStore.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization : undefined;

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      ...(bearer
        ? { global: { headers: { Authorization: bearer } } }
        : {}),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // The middleware refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}
