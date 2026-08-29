import { describe, expect, it } from "vitest";
import {
  applySignal,
  applySuccess,
  confidenceFor,
  decaySeverity,
  priorityScore,
  selectPracticeFocus,
  severityBand,
  trendFrom,
  type SkillSignal,
  type WeaknessState,
} from "./model";

const AT = new Date("2026-08-28T10:00:00Z");
const daysAfter = (days: number) =>
  new Date(AT.getTime() + days * 24 * 60 * 60_000);

function signal(overrides: Partial<SkillSignal> = {}): SkillSignal {
  return {
    topicLabel: "Quadratische Funktionen",
    dimension: "concept",
    severity: 0.8,
    operator: null,
    evidence: "Scheitelpunktform nicht erkannt",
    pointsLost: 4,
    occurredAt: AT,
    ...overrides,
  };
}

describe("confidenceFor", () => {
  it("starts low and saturates", () => {
    expect(confidenceFor(0)).toBe(0);
    expect(confidenceFor(1)).toBeLessThan(0.35);
    expect(confidenceFor(5)).toBeGreaterThan(0.7);
    expect(confidenceFor(20)).toBeGreaterThan(0.99);
  });

  it("never exceeds 1", () => {
    expect(confidenceFor(1000)).toBeLessThanOrEqual(1);
  });
});

describe("decaySeverity", () => {
  it("leaves same-day severity untouched", () => {
    expect(decaySeverity(0.8, AT, AT)).toBe(0.8);
  });

  it("halves severity after 30 days", () => {
    expect(decaySeverity(0.8, AT, daysAfter(30))).toBeCloseTo(0.4, 2);
  });

  it("keeps decaying over longer gaps", () => {
    expect(decaySeverity(0.8, AT, daysAfter(60))).toBeCloseTo(0.2, 2);
  });
});

describe("applySignal", () => {
  it("creates a new weakness from the first signal", () => {
    const state = applySignal({
      current: null,
      signal: signal(),
      recentSeverities: [],
    });

    expect(state.severity).toBe(0.8);
    expect(state.evidenceCount).toBe(1);
    expect(state.trend).toBe("new");
    expect(state.confidence).toBeLessThan(0.35);
  });

  it("moves the estimate less as evidence accumulates", () => {
    // The same contradicting signal should move a well-evidenced weakness
    // less than a barely-evidenced one.
    const green: WeaknessState = {
      severity: 0.8,
      confidence: 0.3,
      evidenceCount: 1,
      trend: "new",
      lastSeenAt: AT,
      resolvedAt: null,
    };
    const seasoned: WeaknessState = { ...green, evidenceCount: 10 };

    const low = signal({ severity: 0.1 });
    const movedGreen = applySignal({ current: green, signal: low, recentSeverities: [] });
    const movedSeasoned = applySignal({ current: seasoned, signal: low, recentSeverities: [] });

    expect(movedGreen.severity).toBeLessThan(movedSeasoned.severity);
  });

  it("clamps out-of-range severities from the model", () => {
    const state = applySignal({
      current: null,
      signal: signal({ severity: 5 }),
      recentSeverities: [],
    });
    expect(state.severity).toBe(1);

    const negative = applySignal({
      current: null,
      signal: signal({ severity: -3 }),
      recentSeverities: [],
    });
    expect(negative.severity).toBe(0);
  });

  it("reopens a resolved weakness when it recurs", () => {
    const resolved: WeaknessState = {
      severity: 0.1,
      confidence: 0.8,
      evidenceCount: 5,
      trend: "improving",
      lastSeenAt: AT,
      resolvedAt: AT,
    };
    const state = applySignal({
      current: resolved,
      signal: signal({ occurredAt: daysAfter(3) }),
      recentSeverities: [0.1, 0.2],
    });
    expect(state.resolvedAt).toBeNull();
    expect(state.severity).toBeGreaterThan(0.1);
  });
});

describe("applySuccess", () => {
  it("lowers severity when the student gets it right", () => {
    const current: WeaknessState = {
      severity: 0.8,
      confidence: 0.5,
      evidenceCount: 2,
      trend: "stable",
      lastSeenAt: AT,
      resolvedAt: null,
    };
    const state = applySuccess({
      current,
      at: daysAfter(1),
      recentSeverities: [0.8, 0.7],
    });
    expect(state.severity).toBeLessThan(0.8);
  });

  it("resolves a weakness once severity is low and evidence sufficient", () => {
    let state: WeaknessState = {
      severity: 0.3,
      confidence: 0.6,
      evidenceCount: 3,
      trend: "improving",
      lastSeenAt: AT,
      resolvedAt: null,
    };

    for (let i = 1; i <= 4; i += 1) {
      state = applySuccess({
        current: state,
        at: daysAfter(i),
        recentSeverities: [0.3, 0.2, 0.1],
      });
    }

    expect(state.severity).toBeLessThan(0.15);
    expect(state.resolvedAt).not.toBeNull();
  });
});

describe("trendFrom", () => {
  it("refuses to call a trend on thin evidence", () => {
    expect(trendFrom([0.9])).toBe("new");
    expect(trendFrom([0.9, 0.1, 0.9])).toBe("new");
  });

  it("detects improvement", () => {
    // Newest first: recent values are much lower than older ones.
    expect(trendFrom([0.1, 0.2, 0.8, 0.9])).toBe("improving");
  });

  it("detects worsening", () => {
    expect(trendFrom([0.9, 0.8, 0.2, 0.1])).toBe("worsening");
  });

  it("reports stable when nothing much changed", () => {
    expect(trendFrom([0.5, 0.52, 0.48, 0.5])).toBe("stable");
  });
});

describe("priorityScore", () => {
  it("ranks a well-evidenced problem above a one-off", () => {
    const oneOff = priorityScore({
      severity: 0.9,
      confidence: confidenceFor(1),
      lastSeenAt: AT,
      now: AT,
    });
    const repeated = priorityScore({
      severity: 0.6,
      confidence: confidenceFor(8),
      lastSeenAt: AT,
      now: AT,
    });
    expect(repeated).toBeGreaterThan(oneOff);
  });

  it("prefers recent problems over stale ones at equal severity", () => {
    const recent = priorityScore({
      severity: 0.7,
      confidence: 0.8,
      lastSeenAt: AT,
      now: AT,
    });
    const stale = priorityScore({
      severity: 0.7,
      confidence: 0.8,
      lastSeenAt: AT,
      now: daysAfter(60),
    });
    expect(recent).toBeGreaterThan(stale);
  });
});

describe("severityBand", () => {
  it("bands severity for display", () => {
    expect(severityBand(0.75)).toBe("high");
    expect(severityBand(0.45)).toBe("medium");
    expect(severityBand(0.1)).toBe("low");
  });
});

describe("selectPracticeFocus", () => {
  const base = { confidence: 0.8, lastSeenAt: AT };

  it("returns the highest priority weaknesses", () => {
    const chosen = selectPracticeFocus(
      [
        { id: "a", topicLabel: "Ableitungen", dimension: "concept" as const, severity: 0.9, ...base },
        { id: "b", topicLabel: "Integrale", dimension: "procedure" as const, severity: 0.4, ...base },
      ],
      2,
      AT,
    );
    expect(chosen.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("does not stack several focuses on the same topic", () => {
    // Two dimensions of the same topic: practising both back to back is worse
    // than spreading across topics.
    const chosen = selectPracticeFocus(
      [
        { id: "a", topicLabel: "Ableitungen", dimension: "concept" as const, severity: 0.9, ...base },
        { id: "b", topicLabel: "Ableitungen", dimension: "procedure" as const, severity: 0.85, ...base },
        { id: "c", topicLabel: "Integrale", dimension: "concept" as const, severity: 0.5, ...base },
      ],
      2,
      AT,
    );
    expect(chosen.map((c) => c.topicLabel)).toEqual(["Ableitungen", "Integrale"]);
  });

  it("drops weaknesses that are no longer worth acting on", () => {
    const chosen = selectPracticeFocus(
      [
        {
          id: "a",
          topicLabel: "Alte Sache",
          dimension: "concept" as const,
          severity: 0.05,
          confidence: 0.2,
          lastSeenAt: AT,
        },
      ],
      3,
      AT,
    );
    expect(chosen).toHaveLength(0);
  });

  it("returns nothing when there are no weaknesses", () => {
    expect(selectPracticeFocus([], 3, AT)).toEqual([]);
  });
});
