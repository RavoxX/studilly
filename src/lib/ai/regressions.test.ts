import { describe, expect, it } from "vitest";
import { normaliseTaskLabel } from "./schemas";
import {
  highestPlan,
  parseEntitlementIdMap,
  resolveEntitlementIds,
} from "@/config/plans";

/**
 * Regression tests for two production failures.
 *
 * Both had the same signature from the outside (a 503 or a silently wrong
 * result) and neither would have been caught by the existing suite, so they
 * are pinned here explicitly.
 */

describe("regression: grading rejected every task over a label prefix", () => {
  /*
   * The grading prompt rendered task headers as "=== Aufgabe 1 ===", so the
   * model returned task_label "Aufgabe 1" while the exam called the task "1".
   * Every lookup missed, the run was rejected as "grading omitted tasks", and
   * the student got a 503 after ~47 seconds with no marks.
   */

  it("matches a prefixed label against the bare one", () => {
    expect(normaliseTaskLabel("Aufgabe 1")).toBe(normaliseTaskLabel("1"));
    expect(normaliseTaskLabel("Task 2b")).toBe(normaliseTaskLabel("2b"));
    expect(normaliseTaskLabel("Nr. 3")).toBe(normaliseTaskLabel("3"));
  });

  it("ignores case, padding and trailing punctuation", () => {
    expect(normaliseTaskLabel("  AUFGABE 1.  ")).toBe(normaliseTaskLabel("1"));
    expect(normaliseTaskLabel("1)")).toBe(normaliseTaskLabel("1"));
    expect(normaliseTaskLabel("1:")).toBe(normaliseTaskLabel("1"));
  });

  it("still tells genuinely different tasks apart", () => {
    // The fix must not make everything match everything.
    expect(normaliseTaskLabel("1a")).not.toBe(normaliseTaskLabel("1b"));
    expect(normaliseTaskLabel("1")).not.toBe(normaliseTaskLabel("2"));
    expect(normaliseTaskLabel("Aufgabe 1a")).not.toBe(
      normaliseTaskLabel("Aufgabe 1"),
    );
  });

  it("reproduces the exact failing case", () => {
    const examLabels = ["1", "2", "3", "4", "5"];
    const modelReturned = [
      "Aufgabe 1",
      "Aufgabe 2",
      "Aufgabe 3",
      "Aufgabe 4",
      "Aufgabe 5",
    ];

    const returned = new Set(modelReturned.map(normaliseTaskLabel));
    const missing = examLabels.filter(
      (label) => !returned.has(normaliseTaskLabel(label)),
    );

    // Before the fix this was all five, which threw and produced the 503.
    expect(missing).toEqual([]);
  });
});

describe("regression: paid customers stayed on the free plan", () => {
  /*
   * RevenueCat reports entitlements differently per surface:
   *   webhooks -> lookup key  "studilly_pro"
   *   REST v2  -> object id   "entl77860406d2"
   * The sync path read REST v2, matched nothing, and wrote plan = free even
   * though the purchase had succeeded and was visible in the dashboard.
   */

  const map = parseEntitlementIdMap(
    "entl77860406d2=studilly_pro,entla81e59752f=studilly_ultra",
  );

  it("parses the id mapping", () => {
    expect(map.get("entl77860406d2")).toBe("studilly_pro");
    expect(map.size).toBe(2);
  });

  it("ignores malformed entries rather than throwing", () => {
    const messy = parseEntitlementIdMap("good=studilly_pro,,broken,=x,y=");
    expect(messy.get("good")).toBe("studilly_pro");
    expect(messy.size).toBe(1);
  });

  it("grants the plan for an object id, which is the actual bug", () => {
    const fromRest = ["entl77860406d2"];

    // Before: no mapping, so nothing matched.
    expect(highestPlan(fromRest)).toBe("free");

    // After: resolved first, then matched.
    expect(highestPlan(resolveEntitlementIds(fromRest, map))).toBe("pro");
  });

  it("still works for lookup keys, which is what webhooks send", () => {
    expect(highestPlan(resolveEntitlementIds(["studilly_pro"], map))).toBe("pro");
    expect(highestPlan(resolveEntitlementIds(["studilly_ultra"], map))).toBe(
      "ultra",
    );
  });

  it("picks the higher plan when both are active during a change", () => {
    expect(
      highestPlan(
        resolveEntitlementIds(["entl77860406d2", "entla81e59752f"], map),
      ),
    ).toBe("ultra");
  });

  it("leaves genuinely unknown ids on free rather than guessing", () => {
    expect(highestPlan(resolveEntitlementIds(["entl_unknown"], map))).toBe(
      "free",
    );
    expect(highestPlan(resolveEntitlementIds([], map))).toBe("free");
  });
});
