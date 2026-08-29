import { describe, expect, it } from "vitest";
import {
  MAX_INTERVAL_DAYS,
  MIN_EASE_FACTOR,
  initialCardState,
  orderReviewQueue,
  ratingFromValue,
  scheduleReview,
  type CardState,
} from "./srs";

const NOW = new Date("2026-08-28T10:00:00Z");

function schedule(state: CardState, rating: Parameters<typeof scheduleReview>[0]["rating"]) {
  return scheduleReview({ state, rating, cardId: "card-1", now: NOW });
}

describe("scheduleReview progression", () => {
  it("schedules a new card one day out on the first success", () => {
    const result = schedule(initialCardState(), "good");
    expect(result.repetitions).toBe(1);
    expect(result.intervalDays).toBe(1);
  });

  it("jumps to six days on the second success", () => {
    const first = schedule(initialCardState(), "good");
    const second = schedule(first, "good");
    expect(second.repetitions).toBe(2);
    expect(second.intervalDays).toBe(6);
  });

  it("multiplies by the ease factor from the third success", () => {
    const state: CardState = {
      easeFactor: 2.5,
      intervalDays: 6,
      repetitions: 2,
      lapses: 0,
    };
    const result = schedule(state, "good");
    // 6 * 2.5 = 15, plus deterministic spread of at most 5 percent.
    expect(result.intervalDays).toBeGreaterThanOrEqual(14);
    expect(result.intervalDays).toBeLessThanOrEqual(16);
  });

  it("gives easy a longer interval than good", () => {
    const state: CardState = {
      easeFactor: 2.5,
      intervalDays: 10,
      repetitions: 3,
      lapses: 0,
    };
    expect(schedule(state, "easy").intervalDays).toBeGreaterThan(
      schedule(state, "good").intervalDays,
    );
  });

  it("gives hard a shorter interval than good", () => {
    const state: CardState = {
      easeFactor: 2.5,
      intervalDays: 10,
      repetitions: 3,
      lapses: 0,
    };
    expect(schedule(state, "hard").intervalDays).toBeLessThan(
      schedule(state, "good").intervalDays,
    );
  });
});

describe("scheduleReview lapses", () => {
  it("brings a failed card back within the same session", () => {
    const state: CardState = {
      easeFactor: 2.5,
      intervalDays: 30,
      repetitions: 5,
      lapses: 0,
    };
    const result = schedule(state, "again");

    expect(result.intervalDays).toBe(0);
    expect(result.repetitions).toBe(0);
    expect(result.lapses).toBe(1);
    // Ten minutes later, not tomorrow.
    expect(result.dueAt.getTime() - NOW.getTime()).toBeLessThan(60 * 60_000);
  });

  it("nudges the ease factor down rather than resetting it", () => {
    const state: CardState = {
      easeFactor: 2.5,
      intervalDays: 30,
      repetitions: 5,
      lapses: 0,
    };
    const result = schedule(state, "again");
    expect(result.easeFactor).toBe(2.3);
    expect(result.easeFactor).toBeGreaterThan(MIN_EASE_FACTOR);
  });

  it("never lets the ease factor fall below the floor", () => {
    let state: CardState = {
      easeFactor: 1.4,
      intervalDays: 1,
      repetitions: 0,
      lapses: 0,
    };
    for (let i = 0; i < 10; i += 1) state = schedule(state, "again");
    expect(state.easeFactor).toBe(MIN_EASE_FACTOR);
  });

  it("caps the ease factor at the top too", () => {
    let state = initialCardState();
    for (let i = 0; i < 20; i += 1) state = schedule(state, "easy");
    expect(state.easeFactor).toBeLessThanOrEqual(3.0);
  });
});

describe("scheduleReview bounds", () => {
  it("caps the interval at a year", () => {
    const state: CardState = {
      easeFactor: 3.0,
      intervalDays: 300,
      repetitions: 12,
      lapses: 0,
    };
    expect(schedule(state, "easy").intervalDays).toBeLessThanOrEqual(
      MAX_INTERVAL_DAYS,
    );
  });

  it("is deterministic for a given card", () => {
    const state: CardState = {
      easeFactor: 2.5,
      intervalDays: 20,
      repetitions: 4,
      lapses: 0,
    };
    const a = scheduleReview({ state, rating: "good", cardId: "x", now: NOW });
    const b = scheduleReview({ state, rating: "good", cardId: "x", now: NOW });
    expect(a.intervalDays).toBe(b.intervalDays);
  });

  it("spreads a batch of cards learned together", () => {
    const state: CardState = {
      easeFactor: 2.5,
      intervalDays: 20,
      repetitions: 4,
      lapses: 0,
    };
    const intervals = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map(
        (id) =>
          scheduleReview({ state, rating: "good", cardId: id, now: NOW })
            .intervalDays,
      ),
    );
    // Not all identical, so they do not all come due on the same day.
    expect(intervals.size).toBeGreaterThan(1);
  });
});

describe("ratingFromValue", () => {
  it("maps stored smallints back to ratings", () => {
    expect(ratingFromValue(0)).toBe("again");
    expect(ratingFromValue(2)).toBe("good");
    expect(ratingFromValue(3)).toBe("easy");
  });

  it("falls back safely on an out-of-range value", () => {
    expect(ratingFromValue(99)).toBe("good");
  });
});

describe("orderReviewQueue", () => {
  it("puts lapsed cards first", () => {
    const queue = orderReviewQueue(
      [
        { id: "old", dueAt: "2026-08-20T10:00:00Z", lapses: 0, repetitions: 3 },
        { id: "lapsed", dueAt: "2026-08-28T09:00:00Z", lapses: 2, repetitions: 0 },
      ],
      NOW,
    );
    expect(queue[0]?.id).toBe("lapsed");
  });

  it("orders the rest by how overdue they are", () => {
    const queue = orderReviewQueue(
      [
        { id: "recent", dueAt: "2026-08-27T10:00:00Z", lapses: 0, repetitions: 2 },
        { id: "ancient", dueAt: "2026-08-01T10:00:00Z", lapses: 0, repetitions: 2 },
      ],
      NOW,
    );
    expect(queue.map((c) => c.id)).toEqual(["ancient", "recent"]);
  });

  it("does not mutate the input", () => {
    const input = [
      { id: "a", dueAt: "2026-08-27T10:00:00Z", lapses: 0, repetitions: 1 },
      { id: "b", dueAt: "2026-08-01T10:00:00Z", lapses: 0, repetitions: 1 },
    ];
    orderReviewQueue(input, NOW);
    expect(input[0]?.id).toBe("a");
  });
});
