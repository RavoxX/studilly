import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { serverEnv } from "@/lib/env.server";
import { applyWebhookEvent } from "@/lib/subscription/service";

/**
 * RevenueCat webhook.
 *
 * Authenticated by a shared secret sent in the Authorization header, which is
 * the mechanism RevenueCat provides. Without this check anyone who knew the
 * URL could grant themselves a plan, so an unset secret means the endpoint
 * refuses every request rather than accepting all of them.
 *
 * The comparison is timing-safe: a naive `===` on a secret leaks its prefix
 * to an attacker who can measure response times.
 *
 * Deliberately tolerant about the payload shape. RevenueCat adds fields over
 * time, and a schema that rejects unknown keys would start dropping renewals
 * the first time they ship a change.
 */

const eventSchema = z.object({
  event: z.object({
    type: z.string(),
    app_user_id: z.string().min(1),
    entitlement_ids: z.array(z.string()).nullable().optional(),
    entitlement_id: z.string().nullable().optional(),
    expiration_at_ms: z.number().nullable().optional(),
    environment: z.string().optional(),
  }),
});

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function POST(request: NextRequest) {
  const expected = serverEnv().REVENUECAT_WEBHOOK_SECRET;

  // Fail closed. An unconfigured secret must not mean "accept everything".
  if (!expected) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const provided = request.headers.get("authorization") ?? "";
  if (!timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const parsed = eventSchema.safeParse(payload);
  if (!parsed.success) {
    // Acknowledge rather than 400: RevenueCat retries on failure, and an
    // event shape we do not understand will never start parsing.
    console.warn("[studilly:revenuecat] unrecognised webhook payload");
    return NextResponse.json({ received: true });
  }

  const event = parsed.data.event;
  const entitlementIds =
    event.entitlement_ids ??
    (event.entitlement_id ? [event.entitlement_id] : []);

  try {
    await applyWebhookEvent({
      appUserId: event.app_user_id,
      entitlementIds,
      eventType: event.type,
      expiresAtMs: event.expiration_at_ms ?? null,
      // This build is Test Store only, so anything other than an explicit
      // PRODUCTION environment is treated as sandbox.
      isSandbox: event.environment !== "PRODUCTION",
      raw: payload,
    });
  } catch (error) {
    console.error(
      "[studilly:revenuecat] webhook handling failed:",
      error instanceof Error ? error.message : "unknown",
    );
    // 500 so RevenueCat retries.
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
