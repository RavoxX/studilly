import { describe, expect, it } from "vitest";
import {
  PLANS,
  PLAN_ORDER,
  UNLIMITED,
  USAGE_METRICS,
  formatPrice,
  highestPlan,
  isUnlimited,
  limitFor,
  planForEntitlement,
  planForOffering,
  yearlySavingPercent,
} from "./plans";

/**
 * Entitlement and limit logic.
 *
 * These decide what a paying student is allowed to do, so the tests are
 * mostly about the awkward cases: several entitlements active at once during
 * a plan change, unknown entitlement ids, and unlimited being encoded as a
 * negative number rather than Infinity.
 */

describe("plan definitions", () => {
  it("defines a limit for every metered operation", () => {
    // A metric with no limit would silently be unlimited on every plan.
    for (const tier of PLAN_ORDER) {
      for (const metric of USAGE_METRICS) {
        expect(PLANS[tier].limits[metric]).toBeTypeOf("number");
      }
    }
  });

  it("never lets a higher tier offer less than a lower one", () => {
    for (const metric of USAGE_METRICS) {
      const free = PLANS.free.limits[metric];
      const pro = PLANS.pro.limits[metric];
      const ultra = PLANS.ultra.limits[metric];

      const rank = (value: number) => (isUnlimited(value) ? Infinity : value);

      expect(rank(pro)).toBeGreaterThanOrEqual(rank(free));
      expect(rank(ultra)).toBeGreaterThanOrEqual(rank(pro));
    }
  });

  it("orders tiers by rank", () => {
    expect(PLANS.free.rank).toBeLessThan(PLANS.pro.rank);
    expect(PLANS.pro.rank).toBeLessThan(PLANS.ultra.rank);
  });

  it("gives the free plan no entitlement and no products", () => {
    // Free is the absence of a paid entitlement, not an entitlement of its own.
    expect(PLANS.free.entitlementId).toBe("");
    expect(PLANS.free.products.monthly).toBeNull();
    expect(PLANS.free.price.monthlyCents).toBe(0);
  });

  it("gives every paid plan an entitlement, an offering and both products", () => {
    for (const tier of ["pro", "ultra"] as const) {
      expect(PLANS[tier].entitlementId).not.toBe("");
      expect(PLANS[tier].offeringId).not.toBeNull();
      expect(PLANS[tier].products.monthly).toBeTruthy();
      expect(PLANS[tier].products.yearly).toBeTruthy();
    }
  });

  it("prices yearly below twelve monthly payments", () => {
    for (const tier of ["pro", "ultra"] as const) {
      const { monthlyCents, yearlyCents } = PLANS[tier].price;
      expect(yearlyCents).toBeLessThan(monthlyCents * 12);
    }
  });
});

describe("planForEntitlement", () => {
  it("maps a known entitlement to its plan", () => {
    expect(planForEntitlement("studilly_pro")).toBe("pro");
    expect(planForEntitlement("studilly_ultra")).toBe("ultra");
  });

  it("returns null for an unknown entitlement", () => {
    // An entitlement we do not recognise must not silently grant anything.
    expect(planForEntitlement("studilly_enterprise")).toBeNull();
    expect(planForEntitlement("")).toBeNull();
  });
});

describe("planForOffering", () => {
  it("maps offerings back to plans", () => {
    expect(planForOffering("pro")).toBe("pro");
    expect(planForOffering("ultra")).toBe("ultra");
    expect(planForOffering("default")).toBeNull();
  });
});

describe("highestPlan", () => {
  it("defaults to free when nothing is active", () => {
    expect(highestPlan([])).toBe("free");
  });

  it("picks the highest when several entitlements overlap", () => {
    // RevenueCat can report both during an upgrade. Granting the lower one
    // would take away what the student just paid for.
    expect(highestPlan(["studilly_pro", "studilly_ultra"])).toBe("ultra");
    expect(highestPlan(["studilly_ultra", "studilly_pro"])).toBe("ultra");
  });

  it("ignores entitlements it does not know", () => {
    expect(highestPlan(["something_else"])).toBe("free");
    expect(highestPlan(["something_else", "studilly_pro"])).toBe("pro");
  });
});

describe("limits", () => {
  it("treats a negative limit as unlimited", () => {
    expect(isUnlimited(UNLIMITED)).toBe(true);
    expect(isUnlimited(-5)).toBe(true);
    expect(isUnlimited(0)).toBe(false);
    expect(isUnlimited(10)).toBe(false);
  });

  it("reads a limit for a plan and metric", () => {
    expect(limitFor("free", "exam_generation")).toBe(
      PLANS.free.limits.exam_generation,
    );
    expect(isUnlimited(limitFor("ultra", "practice_generation"))).toBe(true);
  });

  it("gives the free plan a genuinely usable allowance", () => {
    // A free tier that cannot produce one complete exam cycle is a teaser,
    // not a free tier.
    expect(PLANS.free.limits.exam_generation).toBeGreaterThanOrEqual(2);
    expect(PLANS.free.limits.exam_grading).toBeGreaterThanOrEqual(
      PLANS.free.limits.exam_generation,
    );
  });

  it("allows more markings than generations on every plan", () => {
    // So a failed marking run can be retried without costing an exam.
    for (const tier of PLAN_ORDER) {
      const limits = PLANS[tier].limits;
      if (isUnlimited(limits.exam_grading)) continue;
      expect(limits.exam_grading).toBeGreaterThan(limits.exam_generation);
    }
  });
});

describe("pricing display", () => {
  it("computes the yearly saving as a whole percentage", () => {
    const saving = yearlySavingPercent("pro");
    expect(saving).toBeGreaterThan(0);
    expect(saving).toBeLessThan(100);
  });

  it("reports no saving on the free plan", () => {
    expect(yearlySavingPercent("free")).toBe(0);
  });

  it("formats prices in the locale's convention", () => {
    // German uses a decimal comma; getting this wrong looks broken to the
    // audience this product is for.
    expect(formatPrice(899, "de")).toContain("8,99");
    expect(formatPrice(899, "en")).toContain("8.99");
  });
});
