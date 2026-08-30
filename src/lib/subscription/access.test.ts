import { describe, expect, it } from "vitest";
import { effectiveAccess, isStillPaid, type SubscriptionFacts } from "./access";

/**
 * The cancellation boundary.
 *
 * Two failure modes matter and both are tested from each side: cutting a
 * student off before the period they paid for has ended, and letting a
 * cancelled plan run forever.
 */

const NOW = new Date("2026-09-15T12:00:00Z");
const inDays = (days: number) =>
  new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

function facts(overrides: Partial<SubscriptionFacts> = {}): SubscriptionFacts {
  return {
    plan: "pro",
    status: "active",
    currentPeriodEnd: inDays(20),
    autoRenew: true,
    ...overrides,
  };
}

describe("an active subscription", () => {
  it("keeps its plan and is not shown as ending", () => {
    const access = effectiveAccess(facts(), NOW);
    expect(access.plan).toBe("pro");
    expect(access.inGracePeriod).toBe(false);
    expect(access.accessEndsAt).toBeNull();
    expect(access.daysRemaining).toBeNull();
  });
});

describe("after cancelling", () => {
  it("keeps the full plan until the paid period ends", () => {
    // The whole point: cancelling does not take away what was paid for.
    const access = effectiveAccess(
      facts({ status: "cancelled", autoRenew: false, currentPeriodEnd: inDays(12) }),
      NOW,
    );
    expect(access.plan).toBe("pro");
    expect(access.inGracePeriod).toBe(true);
    expect(access.daysRemaining).toBe(12);
  });

  it("keeps Ultra at Ultra, not silently at Pro", () => {
    const access = effectiveAccess(
      facts({ plan: "ultra", status: "cancelled", autoRenew: false }),
      NOW,
    );
    expect(access.plan).toBe("ultra");
  });

  it("drops to free the moment the period ends", () => {
    const access = effectiveAccess(
      facts({
        status: "cancelled",
        autoRenew: false,
        currentPeriodEnd: inDays(-1),
      }),
      NOW,
    );
    expect(access.plan).toBe("free");
    expect(access.inGracePeriod).toBe(false);
    expect(access.daysRemaining).toBe(0);
  });

  it("holds access right up to the boundary and not past it", () => {
    const oneMinuteLeft = new Date(NOW.getTime() + 60_000).toISOString();
    expect(
      effectiveAccess(
        facts({ status: "cancelled", autoRenew: false, currentPeriodEnd: oneMinuteLeft }),
        NOW,
      ).plan,
    ).toBe("pro");

    const oneMinuteAgo = new Date(NOW.getTime() - 60_000).toISOString();
    expect(
      effectiveAccess(
        facts({ status: "cancelled", autoRenew: false, currentPeriodEnd: oneMinuteAgo }),
        NOW,
      ).plan,
    ).toBe("free");
  });

  it("treats auto_renew=false as ending even if status still says active", () => {
    // RevenueCat reports "will_not_renew" while the status is still active.
    const access = effectiveAccess(
      facts({ status: "active", autoRenew: false }),
      NOW,
    );
    expect(access.plan).toBe("pro");
    expect(access.inGracePeriod).toBe(true);
  });
});

describe("expiry", () => {
  it("drops an explicitly expired subscription to free", () => {
    expect(
      effectiveAccess(facts({ status: "expired" }), NOW).plan,
    ).toBe("free");
  });

  it("drops a subscription whose period has passed even if status lags", () => {
    // The status field can be stale between syncs; the date is authoritative.
    expect(
      effectiveAccess(facts({ status: "active", currentPeriodEnd: inDays(-3) }), NOW)
        .plan,
    ).toBe("free");
  });

  it("would keep a cancelled plan forever with no period end", () => {
    // Not a wish, a warning. The rule above (unknown end keeps access) means
    // a cancellation recorded without an end date never takes effect, which
    // is why cancelSubscription always stamps one before writing.
    const access = effectiveAccess(
      facts({ status: "cancelled", autoRenew: false, currentPeriodEnd: null }),
      NOW,
    );
    expect(access.plan).toBe("pro");
    expect(access.accessEndsAt).toBeNull();
  });

  it("keeps access when no period end is known", () => {
    // Erring toward keeping access: a brief RevenueCat outage must not
    // downgrade a paying customer.
    const access = effectiveAccess(facts({ currentPeriodEnd: null }), NOW);
    expect(access.plan).toBe("pro");
  });
});

describe("free plan", () => {
  it("has nothing to expire", () => {
    const access = effectiveAccess(
      facts({ plan: "free", status: "active", currentPeriodEnd: inDays(-99) }),
      NOW,
    );
    expect(access.plan).toBe("free");
    expect(access.inGracePeriod).toBe(false);
  });
});

describe("grace period from a billing issue", () => {
  it("keeps access while the payment is being retried", () => {
    const access = effectiveAccess(
      facts({ status: "grace_period", currentPeriodEnd: inDays(5) }),
      NOW,
    );
    expect(access.plan).toBe("pro");
  });
});

describe("isStillPaid", () => {
  it("agrees with effectiveAccess", () => {
    expect(isStillPaid(facts(), NOW)).toBe(true);
    expect(
      isStillPaid(facts({ status: "cancelled", autoRenew: false }), NOW),
    ).toBe(true);
    expect(isStillPaid(facts({ currentPeriodEnd: inDays(-1) }), NOW)).toBe(false);
    expect(isStillPaid(facts({ plan: "free" }), NOW)).toBe(false);
  });
});
