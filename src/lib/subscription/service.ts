import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env.server";
import {
  PLANS,
  USAGE_METRICS,
  highestPlan,
  isUnlimited,
  type PlanLimits,
  type PlanTier,
  type UsageMetric,
} from "@/config/plans";
import type { Database } from "@/types/database";

/**
 * SubscriptionService.
 *
 * Everything to do with plans, entitlements and quota goes through here. UI
 * components never decide what a user is allowed to do; they render what this
 * service reports and the same service enforces it server-side.
 *
 * Trust model
 * -----------
 * The `subscriptions` row is the only thing the backend trusts. It is written
 * by this module alone, using the service-role client, from data fetched
 * directly from RevenueCat's REST API or delivered by a verified webhook.
 * The browser can read its own row (RLS allows SELECT) but cannot write it,
 * so a user cannot promote themselves by editing a request.
 *
 * Sandbox
 * -------
 * This build is wired to the RevenueCat Test Store. Purchases are simulated,
 * no payment details are collected and no money moves. `is_sandbox` records
 * that on every subscription row so the UI can say so plainly.
 */

export type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];

export type SubscriptionState = {
  plan: PlanTier;
  status: SubscriptionRow["status"];
  limits: PlanLimits;
  isSandbox: boolean;
  currentPeriodEnd: string | null;
  cancelsAt: string | null;
  /** True when RevenueCat is not configured and the app is simulating. */
  simulated: boolean;
};

export type UsageSnapshot = {
  periodStart: string;
  /** Used count per metric. Missing metrics have used 0. */
  used: Record<UsageMetric, number>;
  limits: PlanLimits;
  storageBytesUsed: number;
  storageBytesLimit: number;
};

export class LimitReachedError extends Error {
  constructor(
    readonly metric: UsageMetric | "storage_mb" | "study_groups",
    readonly limit: number,
    readonly used: number,
  ) {
    super(`limit reached for ${metric}`);
    this.name = "LimitReachedError";
  }
}

/**
 * True when RevenueCat credentials are present.
 *
 * Reads `process.env` directly rather than going through `serverEnv()`, which
 * validates the whole server environment and throws. Rendering the
 * subscription page must not require an OpenAI key to be configured.
 */
export function isBillingConfigured(): boolean {
  return Boolean(
    process.env.REVENUECAT_SECRET_KEY && process.env.REVENUECAT_PROJECT_ID,
  );
}

// ---------------------------------------------------------------------------
// Reading state
// ---------------------------------------------------------------------------

/**
 * Reads the caller's own subscription.
 *
 * Uses the session-bound client, not the service-role one: RLS already scopes
 * `subscriptions` to the caller for SELECT, so there is no reason to reach for
 * a key that bypasses it. This also means the app renders correctly before a
 * service-role key has been configured.
 */
export async function getSubscription(
  userId: string,
): Promise<SubscriptionState> {
  const supabase = await createSessionClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  // The signup trigger creates this row. A missing row means something went
  // wrong upstream; treat the user as free rather than failing their request.
  const plan: PlanTier = data?.plan ?? "free";

  return {
    plan,
    status: data?.status ?? "active",
    limits: PLANS[plan].limits,
    isSandbox: data?.is_sandbox ?? true,
    currentPeriodEnd: data?.current_period_end ?? null,
    cancelsAt: data?.cancels_at ?? null,
    simulated: !isBillingConfigured(),
  };
}

const ALL_METRICS = USAGE_METRICS;

function currentPeriodStart(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  )
    .toISOString()
    .slice(0, 10);
}

export async function getUsage(userId: string): Promise<UsageSnapshot> {
  const supabase = await createSessionClient();
  const periodStart = currentPeriodStart();
  const subscription = await getSubscription(userId);

  // Both reads go through RLS. Storage is summed from the material rows the
  // caller can see rather than through the SECURITY DEFINER helper, which
  // stays server-only precisely because it takes a user id.
  const [{ data: records, error }, { data: materials }] = await Promise.all([
    supabase
      .from("usage_records")
      .select("metric, used")
      .eq("user_id", userId)
      .eq("period_start", periodStart),
    supabase.from("learning_materials").select("size_bytes").eq("user_id", userId),
  ]);

  if (error) throw error;

  const storageBytes = (materials ?? []).reduce(
    (sum, row) => sum + Number(row.size_bytes),
    0,
  );

  const used = Object.fromEntries(
    ALL_METRICS.map((metric) => [metric, 0]),
  ) as Record<UsageMetric, number>;

  for (const record of records ?? []) {
    const metric = record.metric as UsageMetric;
    if (metric in used) used[metric] = record.used;
  }

  return {
    periodStart,
    used,
    limits: subscription.limits,
    storageBytesUsed: storageBytes,
    storageBytesLimit: subscription.limits.storage_mb * 1024 * 1024,
  };
}

// ---------------------------------------------------------------------------
// Enforcing limits
// ---------------------------------------------------------------------------

/**
 * Reserves quota for an operation, atomically.
 *
 * Delegates to the `consume_usage` SQL function, which does the check and the
 * increment in one statement. Doing it in two round trips would let two
 * concurrent requests both read "9 of 10 used" and both proceed.
 *
 * Throws LimitReachedError when the plan is exhausted. Nothing is written in
 * that case.
 */
export async function consume(
  userId: string,
  metric: UsageMetric,
  amount = 1,
): Promise<number> {
  const { limits } = await getSubscription(userId);
  const limit = limits[metric];

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_usage", {
    target_user: userId,
    target_metric: metric,
    max_allowed: limit,
    amount,
  });

  if (error) throw error;

  if (data === null) {
    const usage = await getUsage(userId);
    throw new LimitReachedError(metric, limit, usage.used[metric] ?? limit);
  }

  return data;
}

/**
 * Gives quota back when an operation failed after reserving it.
 *
 * A model timeout should not cost a student one of their monthly exams, so
 * every consuming route releases on failure.
 */
export async function release(
  userId: string,
  metric: UsageMetric,
  amount = 1,
): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("release_usage", {
    target_user: userId,
    target_metric: metric,
    amount,
  });
}

/** Checks a storage quota before accepting an upload. */
export async function assertStorageAvailable(
  userId: string,
  additionalBytes: number,
): Promise<void> {
  const usage = await getUsage(userId);
  if (isUnlimited(usage.limits.storage_mb)) return;

  if (usage.storageBytesUsed + additionalBytes > usage.storageBytesLimit) {
    throw new LimitReachedError(
      "storage_mb",
      usage.storageBytesLimit,
      usage.storageBytesUsed,
    );
  }
}

/** Checks the study-group cap before creating or joining one. */
export async function assertGroupSlotAvailable(userId: string): Promise<void> {
  const { limits } = await getSubscription(userId);
  if (isUnlimited(limits.study_groups)) return;

  const admin = createAdminClient();
  const { count, error } = await admin
    .from("study_group_members")
    .select("group_id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;

  if ((count ?? 0) >= limits.study_groups) {
    throw new LimitReachedError("study_groups", limits.study_groups, count ?? 0);
  }
}

// ---------------------------------------------------------------------------
// RevenueCat synchronisation
// ---------------------------------------------------------------------------

type RevenueCatEntitlement = {
  entitlement_id?: string;
  expires_at?: number | null;
};

/**
 * Reads the customer's entitlements straight from RevenueCat and writes the
 * resulting plan to the database.
 *
 * This is the authoritative path. The client SDK reports a purchase, but the
 * client is never believed: the server asks RevenueCat itself before granting
 * anything.
 */
export async function syncFromRevenueCat(
  userId: string,
): Promise<SubscriptionState> {
  if (!isBillingConfigured()) {
    return getSubscription(userId);
  }

  const env = serverEnv();
  const url = `https://api.revenuecat.com/v2/projects/${encodeURIComponent(
    env.REVENUECAT_PROJECT_ID,
  )}/customers/${encodeURIComponent(userId)}/active_entitlements`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  // A customer that has never purchased does not exist in RevenueCat yet.
  // That is a free user, not an error.
  if (response.status === 404) {
    await writePlan(userId, "free", { entitlementId: null, expiresAt: null });
    return getSubscription(userId);
  }

  if (!response.ok) {
    // Never downgrade someone because RevenueCat had a bad minute. Leave the
    // stored plan in place and report it.
    console.error(
      `[studilly:revenuecat] entitlement sync failed with ${response.status}`,
    );
    return getSubscription(userId);
  }

  const body = (await response.json()) as { items?: RevenueCatEntitlement[] };
  const entitlements = body.items ?? [];
  const ids = entitlements
    .map((e) => e.entitlement_id)
    .filter((id): id is string => typeof id === "string");

  const plan = highestPlan(ids);
  const matching = entitlements.find(
    (e) => e.entitlement_id === PLANS[plan].entitlementId,
  );

  await writePlan(userId, plan, {
    entitlementId: matching?.entitlement_id ?? null,
    expiresAt: matching?.expires_at ? new Date(matching.expires_at).toISOString() : null,
  });

  return getSubscription(userId);
}

async function writePlan(
  userId: string,
  plan: PlanTier,
  details: { entitlementId: string | null; expiresAt: string | null },
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("subscriptions")
    .update({
      plan,
      entitlement_id: details.entitlementId,
      status: plan === "free" ? "active" : "active",
      provider: "revenuecat",
      rc_customer_id: userId,
      // Test Store purchases only in this build.
      is_sandbox: true,
      current_period_end: details.expiresAt,
      last_sync_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw error;
}

/**
 * Applies a plan change from a verified webhook event.
 *
 * Separate from syncFromRevenueCat because a webhook carries the event type,
 * which tells us about cancellations and expiries that an entitlement lookup
 * alone would not distinguish.
 */
export async function applyWebhookEvent(args: {
  appUserId: string;
  entitlementIds: readonly string[];
  eventType: string;
  expiresAtMs: number | null;
  isSandbox: boolean;
  raw: unknown;
}): Promise<void> {
  const admin = createAdminClient();
  const plan = highestPlan(args.entitlementIds);

  const status: SubscriptionRow["status"] =
    args.eventType === "CANCELLATION"
      ? "cancelled"
      : args.eventType === "EXPIRATION"
        ? "expired"
        : args.eventType === "BILLING_ISSUE"
          ? "grace_period"
          : "active";

  const { error } = await admin
    .from("subscriptions")
    .update({
      plan: status === "expired" ? "free" : plan,
      entitlement_id: args.entitlementIds[0] ?? null,
      status,
      provider: "revenuecat",
      rc_customer_id: args.appUserId,
      is_sandbox: args.isSandbox,
      current_period_end: args.expiresAtMs
        ? new Date(args.expiresAtMs).toISOString()
        : null,
      last_sync_at: new Date().toISOString(),
      last_event: args.raw as Database["public"]["Tables"]["subscriptions"]["Update"]["last_event"],
    })
    .eq("user_id", args.appUserId);

  if (error) throw error;
}

/**
 * Local simulation, used only when RevenueCat is not configured.
 *
 * This exists so the plan-gated features can be exercised end to end during
 * development. It is refused outright once real credentials are present, so
 * it can never become a way to grant a paid plan in production.
 */
export async function simulatePlanChange(
  userId: string,
  plan: PlanTier,
): Promise<SubscriptionState> {
  if (isBillingConfigured()) {
    throw new Error(
      "Plan simulation is disabled because RevenueCat is configured.",
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .update({
      plan,
      entitlement_id: PLANS[plan].entitlementId || null,
      status: "active",
      provider: "none",
      is_sandbox: true,
      last_sync_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw error;
  return getSubscription(userId);
}
