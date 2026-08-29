import "server-only";

import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";
import { getApiUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { apiError, handleApiError, ApiException } from "./response";
import type { Bundesland, EducationStage, SchoolType } from "@/config/education";

/**
 * Shared plumbing for API routes.
 *
 * Every route gets the same three things without restating them:
 *
 *   1. An authenticated user, taken from the verified session. A route never
 *      reads a user id from the body, a query parameter or a header.
 *   2. A parsed, validated body.
 *   3. Errors converted into safe responses, with the detail logged rather
 *      than returned.
 */

export type RouteContext = {
  user: User;
  request: NextRequest;
};

export function withUser(
  handler: (context: RouteContext) => Promise<Response>,
  options: { name: string },
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      const user = await getApiUser();
      if (!user) return apiError("unauthorized");
      return await handler({ user, request });
    } catch (error) {
      return handleApiError(error, options.name);
    }
  };
}

/** Same, for routes with a dynamic segment. */
export function withUserAndParams<P extends Record<string, string>>(
  handler: (context: RouteContext & { params: P }) => Promise<Response>,
  options: { name: string },
) {
  return async (
    request: NextRequest,
    segment: { params: Promise<P> },
  ): Promise<Response> => {
    try {
      const user = await getApiUser();
      if (!user) return apiError("unauthorized");
      const params = await segment.params;
      return await handler({ user, request, params });
    } catch (error) {
      return handleApiError(error, options.name);
    }
  };
}

/** Parses and validates a JSON body, throwing ApiException on failure. */
export async function parseBody<T extends z.ZodType>(
  request: NextRequest,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiException("invalid_input", { reason: "malformed_json" });
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ApiException("invalid_input", {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        code: issue.code,
      })),
    });
  }

  return result.data;
}

/**
 * Loads the caller's schooling context.
 *
 * Every AI feature needs it, and it must come from the database rather than
 * the request: a client that could send its own Bundesland could also send a
 * grade it is not in.
 */
export async function requireEducationContext(userId: string): Promise<{
  bundesland: Bundesland;
  schoolType: SchoolType;
  stage: EducationStage;
  grade: number;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("education_profiles")
    .select("bundesland, school_type, stage, grade")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) throw new ApiException("forbidden", { reason: "onboarding_incomplete" });

  return {
    bundesland: data.bundesland,
    schoolType: data.school_type,
    stage: data.stage,
    grade: data.grade,
  };
}

/**
 * In-process rate limiter.
 *
 * A second line of defence, not the primary one. Cost is bounded by the
 * database-backed monthly quotas in SubscriptionService, which survive
 * restarts and work across instances. This limiter exists to stop a single
 * client hammering an endpoint in a burst.
 *
 * NOTE FOR PRODUCTION: this is per-process memory. On more than one instance
 * it must move to Redis or Supabase to be effective across the fleet.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

/** Throws if the caller is over the burst limit. */
export function assertRateLimit(
  userId: string,
  action: string,
  limit: number,
  windowMs: number,
): void {
  if (!rateLimit(`${userId}:${action}`, limit, windowMs)) {
    throw new ApiException("rate_limited");
  }
}

// Periodically drop expired buckets so the map does not grow without bound.
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, 60_000);
  // Do not hold the process open during a graceful shutdown.
  timer.unref?.();
}
