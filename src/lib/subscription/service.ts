import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env.server";
import {
  PLANS,
  USAGE_METRICS,
  highestPlan,
  isUnlimited,
  parseEntitlementIdMap,
  planForEntitlement,
  resolveEntitlementIds,
  type PlanLimits,
  type PlanTier,
  type UsageMetric,
} from "@/config/plans";
import { effectiveAccess, type SubscriptionFacts } from "./access";
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
  /**
   * The plan to ENFORCE against: limits, model tier, feature gates.
   *
   * Not necessarily the purchased tier. A cancelled subscription still
   * reports its paid plan until the period ends, and reports free after.
   * See lib/subscription/access.
   */
  plan: PlanTier;
  /** The tier that was purchased, even once it is running out. */
  purchasedPlan: PlanTier;
  status: SubscriptionRow["status"];
  limits: PlanLimits;
  isSandbox: boolean;
  currentPeriodEnd: string | null;
  cancelsAt: string | null;
  /** False once cancelled: runs to currentPeriodEnd, then stops. */
  autoRenew: boolean;
  /** True while a cancelled plan is running out its paid period. */
  inGracePeriod: boolean;
  /** Whole days of paid access left, when it is ending. */
  daysRemaining: number | null;
  /** Store the purchase came from: test_store, app_store, stripe. */
  store: string | null;
  /** The purchased product identifier. */
  productId: string | null;
  /** Customer portal for managing the subscription at the store, if any. */
  managementUrl: string | null;
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
  const purchasedPlan: PlanTier = data?.plan ?? "free";
  const autoRenew = data?.auto_renew ?? true;

  // A cancelled plan keeps working until the period it was paid for ends.
  const access = effectiveAccess({
    plan: purchasedPlan,
    // The column is `text` with a CHECK constraint, so the generated type is
    // `string`. Narrowed here rather than widening the pure module's input.
    status: (data?.status ?? "active") as SubscriptionFacts["status"],
    currentPeriodEnd: data?.current_period_end ?? null,
    autoRenew,
  });

  return {
    plan: access.plan,
    purchasedPlan,
    status: data?.status ?? "active",
    // Limits follow the ENFORCED plan, so they expire with it.
    limits: PLANS[access.plan].limits,
    isSandbox: data?.is_sandbox ?? true,
    currentPeriodEnd: data?.current_period_end ?? null,
    cancelsAt: data?.cancels_at ?? null,
    autoRenew,
    inGracePeriod: access.inGracePeriod,
    daysRemaining: access.daysRemaining,
    store: data?.store ?? null,
    productId: data?.product_id ?? null,
    managementUrl: data?.management_url ?? null,
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
 * Translates RevenueCat entitlement identifiers into our lookup keys.
 *
 * This exists because the two RevenueCat surfaces disagree about what
 * "entitlement_id" means:
 *
 *   Webhooks send the LOOKUP KEY   -> "studilly_pro"
 *   REST v2 sends the OBJECT ID    -> "entl77860406d2"
 *
 * `PLANS[].entitlementId` holds the lookup key, so an object id matches
 * nothing and the customer silently stays on the free plan. That is exactly
 * the bug this resolver fixes.
 *
 * Resolution is cached for the process lifetime: the mapping only changes
 * when someone edits the entitlement in the dashboard, and a lookup on every
 * sync would add a round trip to every purchase.
 */
let entitlementKeyCache: Map<string, string> | null = null;
let entitlementCacheAt = 0;
const ENTITLEMENT_CACHE_MS = 10 * 60_000;

async function resolveEntitlementKeys(
  ids: readonly string[],
): Promise<string[]> {
  // Anything that already looks like one of our lookup keys needs no work.
  const unresolved = ids.filter((id) => planForEntitlement(id) === null);
  if (unresolved.length === 0) return [...ids];

  const fresh =
    entitlementKeyCache !== null &&
    Date.now() - entitlementCacheAt < ENTITLEMENT_CACHE_MS;

  if (!fresh) {
    const env = serverEnv();
    try {
      const response = await fetch(
        `https://api.revenuecat.com/v2/projects/${encodeURIComponent(
          env.REVENUECAT_PROJECT_ID,
        )}/entitlements`,
        {
          headers: {
            Authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}`,
            Accept: "application/json",
          },
          cache: "no-store",
        },
      );

      if (response.ok) {
        const body = (await response.json()) as {
          items?: { id?: string; lookup_key?: string }[];
        };
        entitlementKeyCache = new Map(
          (body.items ?? [])
            .filter(
              (item): item is { id: string; lookup_key: string } =>
                typeof item.id === "string" &&
                typeof item.lookup_key === "string",
            )
            .map((item) => [item.id, item.lookup_key]),
        );
        entitlementCacheAt = Date.now();
      } else {
        // 403 means the secret key lacks
        // `project_configuration:entitlements:read`. Say so precisely: this
        // is the difference between a working upgrade and a silent downgrade.
        console.error(
          `[studilly:revenuecat] cannot resolve entitlement ids (HTTP ${response.status}). ` +
            `Grant the secret key "project_configuration:entitlements:read", ` +
            `or set REVENUECAT_ENTITLEMENT_IDS.`,
        );
      }
    } catch (error) {
      console.error(
        "[studilly:revenuecat] entitlement lookup failed:",
        error instanceof Error ? error.message : "unknown",
      );
    }
  }

  // Static fallback, so a key without the extra permission still works:
  // REVENUECAT_ENTITLEMENT_IDS="entl77860406d2=studilly_pro,entlab12=studilly_ultra"
  const staticMap = parseEntitlementIdMap(
    serverEnv().REVENUECAT_ENTITLEMENT_IDS || "",
  );

  const combined = new Map([
    ...staticMap,
    ...(entitlementKeyCache ?? new Map<string, string>()),
  ]);

  return resolveEntitlementIds(ids, combined);
}

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
  const rawIds = entitlements
    .map((e) => e.entitlement_id)
    .filter((id): id is string => typeof id === "string");

  // REST v2 reports object ids; our plans are keyed by lookup key.
  const ids = await resolveEntitlementKeys(rawIds);
  const plan = highestPlan(ids);

  // Find the raw entitlement whose RESOLVED key matches the winning plan, so
  // the expiry we store belongs to the right entitlement.
  const matchingIndex = ids.findIndex(
    (id) => id === PLANS[plan].entitlementId,
  );
  const matching = matchingIndex >= 0 ? entitlements[matchingIndex] : undefined;

  if (rawIds.length > 0 && plan === "free") {
    // The customer has entitlements that map to nothing we know about.
    // Without this line the symptom is a paid customer silently on free.
    console.error(
      `[studilly:revenuecat] customer ${userId} has entitlements ` +
        `[${rawIds.join(", ")}] that resolved to [${ids.join(", ")}], ` +
        `none matching a known plan. Check entitlement lookup keys.`,
    );
  }

  await writePlan(userId, plan, {
    entitlementId: PLANS[plan].entitlementId || null,
    expiresAt: matching?.expires_at
      ? new Date(matching.expires_at).toISOString()
      : null,
  });

  return getSubscription(userId);
}

async function writePlan(
  userId: string,
  plan: PlanTier,
  details: { entitlementId: string | null; expiresAt: string | null },
): Promise<void> {
  const admin = createAdminClient();

  // Billing detail comes from RevenueCat rather than being inferred, so the
  // subscription screen shows what actually governs access.
  const detail = await fetchSubscriptionDetail(userId);

  const { error } = await admin
    .from("subscriptions")
    .update({
      plan,
      entitlement_id: details.entitlementId,
      // RevenueCat's auto_renewal_status is what tells us a customer has
      // cancelled; without it a cancelled plan would look active until the
      // day it vanished.
      status: detail && !detail.autoRenew ? "cancelled" : "active",
      auto_renew: detail?.autoRenew ?? true,
      gives_access: detail?.givesAccess ?? plan !== "free",
      provider: "revenuecat",
      rc_customer_id: userId,
      rc_subscription_id: detail?.subscriptionId ?? null,
      store: detail?.store ?? null,
      product_id: detail?.productId ?? null,
      management_url: detail?.managementUrl ?? null,
      // Test Store purchases only in this build.
      is_sandbox: true,
      current_period_end: detail?.periodEnd ?? details.expiresAt,
      cancels_at:
        detail && !detail.autoRenew ? (detail.periodEnd ?? null) : null,
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
 * Pulls the customer's subscription detail from RevenueCat.
 *
 * Richer than the entitlements endpoint: it reports auto-renewal status, the
 * period boundary, the store, the product and a customer-portal URL. Those
 * are what a real subscription screen shows, and they come from RevenueCat
 * rather than being reconstructed here.
 */
async function fetchSubscriptionDetail(userId: string): Promise<{
  autoRenew: boolean;
  givesAccess: boolean;
  periodEnd: string | null;
  store: string | null;
  productId: string | null;
  managementUrl: string | null;
  subscriptionId: string | null;
} | null> {
  const env = serverEnv();

  try {
    const response = await fetch(
      `https://api.revenuecat.com/v2/projects/${encodeURIComponent(
        env.REVENUECAT_PROJECT_ID,
      )}/customers/${encodeURIComponent(userId)}/subscriptions`,
      {
        headers: {
          Authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) return null;

    const body = (await response.json()) as {
      items?: {
        id?: string;
        auto_renewal_status?: string;
        gives_access?: boolean;
        current_period_ends_at?: number | null;
        store?: string | null;
        product_id?: string | null;
        management_url?: string | null;
        status?: string;
      }[];
    };

    // A customer can have several subscriptions over time. The one that
    // matters is whichever currently grants access; otherwise the newest.
    const items = body.items ?? [];
    const active = items.find((item) => item.gives_access === true);
    const chosen =
      active ??
      [...items].sort(
        (a, b) =>
          (b.current_period_ends_at ?? 0) - (a.current_period_ends_at ?? 0),
      )[0];

    if (!chosen) return null;

    return {
      autoRenew: chosen.auto_renewal_status !== "will_not_renew",
      givesAccess: chosen.gives_access === true,
      periodEnd: chosen.current_period_ends_at
        ? new Date(chosen.current_period_ends_at).toISOString()
        : null,
      store: chosen.store ?? null,
      productId: chosen.product_id ?? null,
      managementUrl: chosen.management_url ?? null,
      subscriptionId: chosen.id ?? null,
    };
  } catch (error) {
    console.error(
      "[studilly:revenuecat] subscription lookup failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return null;
  }
}

export type CancelResult =
  | { ok: true; accessUntil: string | null }
  | { ok: false; reason: "not_subscribed" | "use_portal"; portalUrl?: string };

/**
 * Cancels the subscription, keeping access until the paid period ends.
 *
 * Where the cancellation actually has to happen depends on the setup:
 *
 *   Simulation (no RevenueCat): recorded locally and fully effective.
 *   RevenueCat: the store owns the billing relationship. If it gives us a
 *   customer portal URL we send the student there, because recording a
 *   cancellation locally while the store keeps charging them would be a
 *   billing lie, not a feature.
 *
 * Either way the plan keeps running to `current_period_end`.
 */
export async function cancelSubscription(
  userId: string,
): Promise<CancelResult> {
  const current = await getSubscription(userId);

  if (current.purchasedPlan === "free") {
    return { ok: false, reason: "not_subscribed" };
  }

  const admin = createAdminClient();

  if (isBillingConfigured()) {
    const detail = await fetchSubscriptionDetail(userId);

    // A real store subscription is cancelled at the store, never here.
    if (detail?.managementUrl) {
      return {
        ok: false,
        reason: "use_portal",
        portalUrl: detail.managementUrl,
      };
    }
  }

  // A cancellation must always carry an end date. Without one, access.ts
  // keeps granting the plan indefinitely (deliberately, so a RevenueCat
  // outage cannot downgrade a payer) and the cancellation would never take
  // effect. A month is the shortest plan sold, so this bound can only ever
  // err by less than one billing cycle, and always in the customer's favour.
  const accessUntil =
    current.currentPeriodEnd ??
    (await fetchSubscriptionDetail(userId))?.periodEnd ??
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Test Store and simulation: no portal exists, so record it ourselves.
  const { error } = await admin
    .from("subscriptions")
    .update({
      status: "cancelled",
      auto_renew: false,
      cancels_at: accessUntil,
      current_period_end: accessUntil,
    })
    .eq("user_id", userId);

  if (error) throw error;

  return { ok: true, accessUntil };
}

/** Undoes a cancellation while the plan is still running. */
export async function resumeSubscription(userId: string): Promise<boolean> {
  const current = await getSubscription(userId);

  // Once it has actually lapsed, resuming is a new purchase, not an undo.
  if (current.plan === "free") return false;

  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .update({ status: "active", auto_renew: true, cancels_at: null })
    .eq("user_id", userId);

  if (error) throw error;
  return true;
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

  // A simulated plan gets a real one-month period, so cancelling it exercises
  // the same grace-period path a real subscription would.
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { error } = await admin
    .from("subscriptions")
    .update({
      plan,
      entitlement_id: PLANS[plan].entitlementId || null,
      status: "active",
      auto_renew: true,
      gives_access: plan !== "free",
      provider: "none",
      store: plan === "free" ? null : "simulation",
      product_id: plan === "free" ? null : PLANS[plan].products.monthly,
      management_url: null,
      is_sandbox: true,
      current_period_end: plan === "free" ? null : periodEnd.toISOString(),
      cancels_at: null,
      last_sync_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw error;
  return getSubscription(userId);
}
