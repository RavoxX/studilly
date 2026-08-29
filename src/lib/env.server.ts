import "server-only";

import { z } from "zod";

/**
 * Server-only environment.
 *
 * The `server-only` import above makes the build fail if any Client Component
 * pulls this module in, which is the guarantee that keeps the service-role
 * key, the OpenAI key and the RevenueCat secret out of the browser bundle.
 *
 * Validation is lazy so that `next build` can prerender public marketing pages
 * on a machine that has no secrets configured. A route that actually needs a
 * secret fails loudly at request time instead.
 */
const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),

  OPENAI_MODEL_LIGHT: z.string().optional(),
  OPENAI_MODEL_STANDARD: z.string().optional(),
  OPENAI_MODEL_ADVANCED: z.string().optional(),
  OPENAI_EMBEDDING_MODEL: z.string().optional(),

  REVENUECAT_PROJECT_ID: z.string().default(""),
  REVENUECAT_SECRET_KEY: z.string().default(""),
  REVENUECAT_WEBHOOK_SECRET: z.string().default(""),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

/**
 * Returns the validated server environment.
 * Throws a descriptive error if a required secret is missing.
 */
export function serverEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(
      `Missing required server environment variables: ${missing}. ` +
        `See .env.example.`,
    );
  }

  cached = parsed.data;
  return cached;
}

/**
 * Non-throwing check used by health/diagnostic surfaces so we can render a
 * helpful "not configured yet" state instead of a crash.
 */
export function serverEnvStatus(): {
  supabase: boolean;
  openai: boolean;
  revenuecat: boolean;
} {
  return {
    supabase: Boolean(process.env.SUPABASE_SECRET_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    revenuecat: Boolean(
      process.env.REVENUECAT_SECRET_KEY && process.env.REVENUECAT_PROJECT_ID,
    ),
  };
}
