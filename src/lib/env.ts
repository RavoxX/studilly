import { z } from "zod";

/**
 * Public environment.
 *
 * Everything here is inlined into the client bundle by Next.js, so it must
 * contain nothing secret. Server-side secrets live in `env.server.ts`, which
 * is guarded by `server-only` and can never be imported from a Client
 * Component.
 *
 * Next.js only substitutes `process.env.NEXT_PUBLIC_*` when it appears as a
 * full static member expression, so each variable is referenced literally.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("https://studilly.ravoxx.dev"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  /** Empty means RevenueCat is not configured; the app falls back to
   *  local simulation mode and says so in the UI. */
  NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY: z.string().default(""),
});

export type PublicEnv = z.infer<typeof publicSchema>;

function readPublicEnv(): PublicEnv {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY:
      process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY,
  });

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((i) => i.path.join("."))
      .join(", ");
    throw new Error(
      `Invalid or missing public environment variables: ${missing}. ` +
        `Copy .env.example to .env.local and fill in the values.`,
    );
  }

  return parsed.data;
}

export const publicEnv: PublicEnv = readPublicEnv();

/** True when a RevenueCat public key is configured. */
export const isRevenueCatConfigured = publicEnv.NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY !== "";
