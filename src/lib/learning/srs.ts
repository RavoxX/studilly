/**
 * Spaced repetition scheduling, SM-2 with the adjustments most modern
 * implementations make.
 *
 * The original SM-2 grades recall from 0 to 5, which is more resolution than
 * a student can meaningfully give while revising. Studilly asks a four-way
 * question instead (again, hard, good, easy) and maps it onto the algorithm.
 *
 * Why the deviations from textbook SM-2:
 *   - A lapse does not reset the ease factor to its floor, only nudges it
 *     down. Resetting makes one bad day permanently punish a card.
 *   - "Again" schedules within the same session rather than the next day, so
 *     a card the student just failed comes back while the correction is fresh.
 *   - Intervals get a small deterministic spread so a large batch learned on
 *     one day does not all come due on the same later day.
 *
 * Pure and side-effect free: the caller persists the result.
 */

export const RATINGS = ["again", "hard", "good", "easy"] as const;
export type Rating = (typeof RATINGS)[number];

/** Stored as a smallint 0..3 in flashcard_reviews.rating. */
export const RATING_VALUES: Record<Rating, number> = {
  again: 0,
  hard: 1,
  good: 2,
  easy: 3,
};

export function ratingFromValue(value: number): Rating {
  return RATINGS[value] ?? "good";
}

export type CardState = {
  /** SM-2 ease factor. Floor of 1.3, as in the original. */
  easeFactor: number;
  /** Days until the next review. 0 means "again this session". */
  intervalDays: number;
  /** Consecutive successful reviews. Reset by a lapse. */
  repetitions: number;
  lapses: number;
};

export type ScheduleResult = CardState & {
  dueAt: Date;
};

export const MIN_EASE_FACTOR = 1.3;
export const MAX_EASE_FACTOR = 3.0;
/** Beyond a year, further spacing adds nothing for exam preparation. */
export const MAX_INTERVAL_DAYS = 365;

const EASE_DELTA: Record<Rating, number> = {
  again: -0.2,
  hard: -0.15,
  good: 0,
  easy: 0.15,
};

/** How long a failed card waits before coming back, in minutes. */
const RELEARN_MINUTES = 10;

function clampEase(value: number): number {
  return Math.min(MAX_EASE_FACTOR, Math.max(MIN_EASE_FACTOR, round2(value)));
}

/**
 * Spreads intervals so a batch learned together does not all return together.
 * Deterministic in the card's identity, so repeated calls agree.
 */
function fuzz(intervalDays: number, seed: string): number {
  if (intervalDays < 4) return intervalDays;

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const spread = Math.max(1, Math.round(intervalDays * 0.05));
  const offset = (Math.abs(hash) % (spread * 2 + 1)) - spread;
  return Math.max(1, intervalDays + offset);
}

export function scheduleReview(args: {
  state: CardState;
  rating: Rating;
  /** Card id, used only to spread intervals deterministically. */
  cardId: string;
  now?: Date;
}): ScheduleResult {
  const now = args.now ?? new Date();
  const { state, rating } = args;

  const easeFactor = clampEase(state.easeFactor + EASE_DELTA[rating]);

  if (rating === "again") {
    // Lapse: relearn shortly, and lose the streak but not all progress.
    const dueAt = new Date(now.getTime() + RELEARN_MINUTES * 60_000);
    return {
      easeFactor,
      intervalDays: 0,
      repetitions: 0,
      lapses: state.lapses + 1,
      dueAt,
    };
  }

  const repetitions = state.repetitions + 1;
  let intervalDays: number;

  if (repetitions === 1) {
    intervalDays = rating === "easy" ? 3 : 1;
  } else if (repetitions === 2) {
    intervalDays = rating === "hard" ? 3 : rating === "easy" ? 10 : 6;
  } else {
    const previous = Math.max(1, state.intervalDays);
    const multiplier =
      rating === "hard" ? 1.2 : rating === "easy" ? easeFactor * 1.3 : easeFactor;
    intervalDays = Math.round(previous * multiplier);
  }

  // Spread first, then clamp: clamping first would let the spread push the
  // interval back over the maximum.
  intervalDays = fuzz(Math.max(1, intervalDays), args.cardId);
  intervalDays = Math.min(MAX_INTERVAL_DAYS, Math.max(1, intervalDays));

  const dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60_000);

  return { easeFactor, intervalDays, repetitions, lapses: state.lapses, dueAt };
}

/** State for a card that has never been reviewed. */
export function initialCardState(): CardState {
  return { easeFactor: 2.5, intervalDays: 0, repetitions: 0, lapses: 0 };
}

/**
 * Orders a review queue.
 *
 * Cards that lapsed come first because they are the ones actually at risk,
 * then the longest overdue, then new cards. Interleaving topics rather than
 * grouping them produces better retention, so the queue is not sorted by
 * topic.
 */
export function orderReviewQueue<
  T extends { dueAt: string; lapses: number; repetitions: number; id: string },
>(cards: readonly T[], now: Date = new Date()): T[] {
  return [...cards].sort((a, b) => {
    const aLapsed = a.lapses > 0 && a.repetitions === 0;
    const bLapsed = b.lapses > 0 && b.repetitions === 0;
    if (aLapsed !== bLapsed) return aLapsed ? -1 : 1;

    const aOverdue = now.getTime() - new Date(a.dueAt).getTime();
    const bOverdue = now.getTime() - new Date(b.dueAt).getTime();
    if (aOverdue !== bOverdue) return bOverdue - aOverdue;

    return a.id.localeCompare(b.id);
  });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
