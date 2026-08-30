import { PLANS, type PlanTier } from "@/config/plans";

/**
 * Deciding which plan actually applies right now.
 *
 * Cancelling is not the same as losing access. A student who cancels on the
 * 3rd has paid through to the end of the period and keeps everything until
 * then; only after that do they drop to free. Getting this wrong in either
 * direction is bad: cutting access early takes away something already paid
 * for, and extending it forever gives the product away.
 *
 * Pure and clock-injectable, so the boundary is testable rather than
 * something we hope holds.
 */

export type SubscriptionFacts = {
  /** The tier the customer bought. */
  plan: PlanTier;
  status: "active" | "trialing" | "grace_period" | "expired" | "cancelled";
  /** When the paid period runs out. Null means no paid period is known. */
  currentPeriodEnd: string | null;
  /** False once cancelled: the plan runs to the period end and stops. */
  autoRenew: boolean;
};

export type EffectiveAccess = {
  /** The plan to actually enforce limits and model tiers against. */
  plan: PlanTier;
  /** True while a cancelled plan is still running out its paid period. */
  inGracePeriod: boolean;
  /** When access ends, if it is going to. */
  accessEndsAt: Date | null;
  /** Whole days remaining, or null when the plan is not ending. */
  daysRemaining: number | null;
};

export function effectiveAccess(
  facts: SubscriptionFacts,
  now: Date = new Date(),
): EffectiveAccess {
  // Free has nothing to expire.
  if (facts.plan === "free" || PLANS[facts.plan].rank === 0) {
    return {
      plan: "free",
      inGracePeriod: false,
      accessEndsAt: null,
      daysRemaining: null,
    };
  }

  const endsAt = facts.currentPeriodEnd
    ? new Date(facts.currentPeriodEnd)
    : null;
  const expired = endsAt !== null && endsAt.getTime() <= now.getTime();

  // Explicitly expired, or the paid period has run out: drop to free.
  if (facts.status === "expired" || expired) {
    return {
      plan: "free",
      inGracePeriod: false,
      accessEndsAt: endsAt,
      daysRemaining: 0,
    };
  }

  const daysRemaining = endsAt
    ? Math.max(
        0,
        Math.ceil((endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
      )
    : null;

  // Cancelled but still inside the paid period: keep the plan. This is the
  // whole point of the module.
  const ending = facts.status === "cancelled" || !facts.autoRenew;

  return {
    plan: facts.plan,
    inGracePeriod: ending,
    accessEndsAt: ending ? endsAt : null,
    daysRemaining: ending ? daysRemaining : null,
  };
}

/**
 * A subscription with no known period end is treated as still running.
 *
 * The alternative, defaulting to expired, would downgrade a paying customer
 * whenever RevenueCat was briefly unreachable and we had no date to compare
 * against. Erring toward keeping access is the cheaper mistake.
 */
export function isStillPaid(
  facts: SubscriptionFacts,
  now: Date = new Date(),
): boolean {
  return effectiveAccess(facts, now).plan !== "free";
}
