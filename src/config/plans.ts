import type { Database } from "@/types/database";

export type PlanTier = Database["public"]["Enums"]["plan_tier"];

/**
 * Metered operations.
 *
 * Declared explicitly rather than derived from the database type: the column
 * is `text` with a CHECK constraint, so the generated type is `string` and
 * would give up all key safety here. The list below must stay in step with
 * that constraint; `USAGE_METRICS` is the single place to change it.
 */
export const USAGE_METRICS = [
  "exam_generation",
  "exam_grading",
  "practice_generation",
  "flashcard_generation",
  "material_upload",
  "material_analysis",
  "learning_plan",
] as const;

export type UsageMetric = (typeof USAGE_METRICS)[number];

/**
 * Plan definitions.
 *
 * These limits are the single source of truth. The backend enforces them via
 * `SubscriptionService.consume()`, and the UI reads the same numbers so the
 * two can never drift.
 *
 * Pricing rationale
 * -----------------
 * A full exam cycle (generate, validate, mark) costs roughly EUR 0.29 in model
 * usage at the model assignment in src/lib/ai/models.ts. Limits are set so
 * that even a subscriber at their monthly cap stays below the subscription
 * price:
 *
 *   Pro    25 exams  -> ~EUR 7.25 against EUR 8.99
 *   Ultra  50 exams  -> ~EUR 14.50 against EUR 17.99
 *
 * The free tier is a deliberate acquisition cost (~EUR 0.87 for a fully
 * active student) and is sized to be genuinely useful rather than a teaser:
 * three real exams with full marking is enough to judge the product.
 *
 * A negative limit means unlimited.
 */
export const UNLIMITED = -1;

export type PlanLimits = {
  /** Exams generated per calendar month. */
  exam_generation: number;
  /** Marking runs per calendar month. Slightly above exam count so a retry
   *  after a failed run does not cost the student an exam. */
  exam_grading: number;
  practice_generation: number;
  flashcard_generation: number;
  material_upload: number;
  material_analysis: number;
  learning_plan: number;
  /** Total stored bytes across all materials. */
  storage_mb: number;
  /** Study groups the student may belong to. */
  study_groups: number;
};

export type PlanPrice = {
  /** Cents, to avoid float money. */
  monthlyCents: number;
  yearlyCents: number;
  currency: "EUR";
};

export type PlanDefinition = {
  tier: PlanTier;
  /** RevenueCat entitlement identifier this plan maps to. Empty for free. */
  entitlementId: string;
  /** RevenueCat offering that sells this plan. Each paid tier has its own
   *  offering carrying a `$rc_monthly` and an `$rc_annual` package. */
  offeringId: string | null;
  /** RevenueCat product identifiers, Test Store. */
  products: {
    monthly: string | null;
    yearly: string | null;
  };
  price: PlanPrice;
  limits: PlanLimits;
  /** Ranking, used to decide whether a change is an upgrade. */
  rank: number;
};

export const PLANS: Record<PlanTier, PlanDefinition> = {
  free: {
    tier: "free",
    // Free is the absence of a paid entitlement, so it has no RevenueCat
    // entitlement of its own.
    entitlementId: "",
    offeringId: null,
    products: { monthly: null, yearly: null },
    price: { monthlyCents: 0, yearlyCents: 0, currency: "EUR" },
    rank: 0,
    limits: {
      exam_generation: 3,
      exam_grading: 5,
      practice_generation: 5,
      flashcard_generation: 5,
      material_upload: 5,
      material_analysis: 8,
      learning_plan: 1,
      storage_mb: 100,
      study_groups: 1,
    },
  },

  pro: {
    tier: "pro",
    entitlementId: "studilly_pro",
    offeringId: "pro",
    products: {
      monthly: "studilly_pro_monthly",
      yearly: "studilly_pro_yearly",
    },
    // EUR 8.99 / month, EUR 71.88 / year (equivalent to EUR 5.99 per month).
    price: { monthlyCents: 899, yearlyCents: 7188, currency: "EUR" },
    rank: 1,
    limits: {
      exam_generation: 25,
      exam_grading: 35,
      practice_generation: 60,
      flashcard_generation: 60,
      material_upload: 80,
      material_analysis: 120,
      learning_plan: 10,
      storage_mb: 2048,
      study_groups: 5,
    },
  },

  ultra: {
    tier: "ultra",
    entitlementId: "studilly_ultra",
    offeringId: "ultra",
    products: {
      monthly: "studilly_ultra_monthly",
      yearly: "studilly_ultra_yearly",
    },
    // EUR 17.99 / month, EUR 143.88 / year (equivalent to EUR 11.99 per month).
    price: { monthlyCents: 1799, yearlyCents: 14388, currency: "EUR" },
    rank: 2,
    limits: {
      exam_generation: 50,
      exam_grading: 70,
      practice_generation: UNLIMITED,
      flashcard_generation: UNLIMITED,
      material_upload: 250,
      material_analysis: UNLIMITED,
      learning_plan: UNLIMITED,
      storage_mb: 10240,
      study_groups: UNLIMITED,
    },
  },
};

export const PLAN_ORDER: readonly PlanTier[] = ["free", "pro", "ultra"];

/** Maps a RevenueCat entitlement identifier back to a plan. */
export function planForEntitlement(entitlementId: string): PlanTier | null {
  if (entitlementId === "") return null;
  const match = PLAN_ORDER.find(
    (tier) => PLANS[tier].entitlementId === entitlementId,
  );
  return match ?? null;
}

/**
 * Resolves RevenueCat entitlement identifiers to our lookup keys.
 *
 * RevenueCat is inconsistent about what "entitlement_id" means:
 *   webhooks  -> lookup key   ("studilly_pro")
 *   REST v2   -> object id    ("entl77860406d2")
 *
 * An unresolved object id matches no plan, so a paying customer silently
 * stays on free. Anything already recognisable as a lookup key is passed
 * through untouched; anything else is translated via `lookup`.
 *
 * Pure, so the mapping is unit-testable without touching the network.
 */
export function resolveEntitlementIds(
  ids: readonly string[],
  lookup: ReadonlyMap<string, string>,
): string[] {
  return ids.map((id) =>
    planForEntitlement(id) !== null ? id : (lookup.get(id) ?? id),
  );
}

/** Parses REVENUECAT_ENTITLEMENT_IDS ("entl1=studilly_pro,entl2=..."). */
export function parseEntitlementIdMap(raw: string): Map<string, string> {
  return new Map(
    raw
      .split(",")
      .map((pair) => pair.split("=").map((part) => part.trim()))
      .filter((parts): parts is [string, string] =>
        parts.length === 2 && parts[0] !== "" && parts[1] !== "",
      ),
  );
}

/** Maps a RevenueCat offering identifier back to a plan. */
export function planForOffering(offeringId: string): PlanTier | null {
  const match = PLAN_ORDER.find((tier) => PLANS[tier].offeringId === offeringId);
  return match ?? null;
}

/**
 * When several entitlements are active at once (which RevenueCat allows during
 * plan changes), the highest one wins.
 */
export function highestPlan(entitlementIds: readonly string[]): PlanTier {
  let best: PlanTier = "free";
  for (const id of entitlementIds) {
    const tier = planForEntitlement(id);
    if (tier && PLANS[tier].rank > PLANS[best].rank) best = tier;
  }
  return best;
}

export function limitFor(plan: PlanTier, metric: keyof PlanLimits): number {
  return PLANS[plan].limits[metric];
}

export function isUnlimited(limit: number): boolean {
  return limit < 0;
}

/** Yearly saving as a whole percentage, for the pricing table. */
export function yearlySavingPercent(plan: PlanTier): number {
  const { monthlyCents, yearlyCents } = PLANS[plan].price;
  if (monthlyCents === 0) return 0;
  const fullYear = monthlyCents * 12;
  return Math.round(((fullYear - yearlyCents) / fullYear) * 100);
}

/** Formats cents for display in the given locale. */
export function formatPrice(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
