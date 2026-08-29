import type { Database } from "@/types/database";

/**
 * Deterministic grade calculation.
 *
 * The model marks individual criteria. It never decides a grade, a total or a
 * percentage: those are arithmetic, and arithmetic done by a language model is
 * a liability. Everything below is pure and takes its thresholds from data, so
 * a school with its own marking key is a configuration change rather than a
 * code change.
 *
 * Two scales are supported:
 *
 *   note         Sekundarstufe I, marks 1 (sehr gut) to 6 (ungenügend).
 *   notenpunkte  Sekundarstufe II, 15 down to 0, the KMK point scale used in
 *                the gymnasiale Oberstufe.
 *
 * On percentage boundaries: the KMK fixes the 15-point scale and its relation
 * to the marks 1 to 6, but it does NOT fix what percentage earns what. Schools
 * and individual teachers set that. The scales seeded in the database are
 * therefore widely-used defaults, labelled as such, and the student can pick a
 * different one in Settings. Studilly never claims a grade is official.
 */

export type GradingScaleRow = Database["public"]["Tables"]["grading_scales"]["Row"];

export type Threshold = {
  min_percent: number;
  value: number;
  label: string;
};

export type ScaleType = "note" | "notenpunkte";

export type TaskScore = {
  taskId: string;
  label: string;
  pointsAwarded: number;
  pointsPossible: number;
};

export type GradeResult = {
  pointsAwarded: number;
  pointsPossible: number;
  percentage: number;
  /** Numeric grade: 1..6 for `note`, 15..0 for `notenpunkte`. */
  gradeValue: number;
  /** Display label, e.g. "2" or "11" or "1+". */
  gradeLabel: string;
  scaleType: ScaleType;
  /** True when the result is at or above "ausreichend" / 5 Notenpunkte. */
  passed: boolean;
};

export class GradingError extends Error {}

/**
 * Parses and validates the thresholds stored on a grading scale row.
 * Thresholds must be sorted highest first and start from 0.
 */
export function parseThresholds(raw: unknown): Threshold[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new GradingError("Grading scale has no thresholds.");
  }

  const thresholds = raw.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new GradingError(`Threshold ${index} is not an object.`);
    }
    const record = entry as Record<string, unknown>;
    const min = record["min_percent"];
    const value = record["value"];
    const label = record["label"];

    if (typeof min !== "number" || typeof value !== "number") {
      throw new GradingError(`Threshold ${index} has non-numeric fields.`);
    }
    if (min < 0 || min > 100) {
      throw new GradingError(`Threshold ${index} is outside 0 to 100.`);
    }

    return {
      min_percent: min,
      value,
      label: typeof label === "string" ? label : String(value),
    };
  });

  const sorted = [...thresholds].sort((a, b) => b.min_percent - a.min_percent);

  const lowest = sorted[sorted.length - 1];
  if (!lowest || lowest.min_percent !== 0) {
    throw new GradingError("Grading scale must cover down to 0 percent.");
  }

  return sorted;
}

/**
 * Sums per-task scores.
 *
 * Guards against a task claiming more marks than it is worth, which would
 * otherwise let a bad evaluation inflate a result.
 */
export function totalPoints(scores: readonly TaskScore[]): {
  awarded: number;
  possible: number;
} {
  let awarded = 0;
  let possible = 0;

  for (const score of scores) {
    if (score.pointsPossible < 0 || score.pointsAwarded < 0) {
      throw new GradingError(`Task ${score.label} has negative points.`);
    }
    awarded += Math.min(score.pointsAwarded, score.pointsPossible);
    possible += score.pointsPossible;
  }

  return { awarded: round2(awarded), possible: round2(possible) };
}

export function percentageOf(awarded: number, possible: number): number {
  if (possible <= 0) return 0;
  return round2((awarded / possible) * 100);
}

/**
 * Maps a percentage onto a grade using the scale's thresholds.
 * Picks the first threshold the percentage reaches, scanning from the top.
 */
export function gradeForPercentage(
  percentage: number,
  thresholds: readonly Threshold[],
): { value: number; label: string } {
  const clamped = Math.max(0, Math.min(100, percentage));

  for (const threshold of thresholds) {
    if (clamped >= threshold.min_percent) {
      return { value: threshold.value, label: threshold.label };
    }
  }

  // parseThresholds guarantees a 0 percent entry, so this is unreachable in
  // practice. Fall back to the worst grade rather than throwing mid-result.
  const worst = thresholds[thresholds.length - 1];
  if (!worst) throw new GradingError("Grading scale is empty.");
  return { value: worst.value, label: worst.label };
}

/** "Ausreichend" or better: mark 4 or better, or 5 Notenpunkte or better. */
export function isPassing(value: number, scaleType: ScaleType): boolean {
  return scaleType === "note" ? value <= 4 : value >= 5;
}

/**
 * The whole calculation, end to end. This is what the grading route calls.
 */
export function calculateGrade(args: {
  scores: readonly TaskScore[];
  scale: Pick<GradingScaleRow, "scale_type" | "thresholds">;
}): GradeResult {
  const scaleType = args.scale.scale_type as ScaleType;
  if (scaleType !== "note" && scaleType !== "notenpunkte") {
    throw new GradingError(`Unknown scale type: ${args.scale.scale_type}`);
  }

  const thresholds = parseThresholds(args.scale.thresholds);
  const { awarded, possible } = totalPoints(args.scores);
  const percentage = percentageOf(awarded, possible);
  const grade = gradeForPercentage(percentage, thresholds);

  return {
    pointsAwarded: awarded,
    pointsPossible: possible,
    percentage,
    gradeValue: grade.value,
    gradeLabel: grade.label,
    scaleType,
    passed: isPassing(grade.value, scaleType),
  };
}

/**
 * Converts Notenpunkte to the equivalent mark using the KMK relation
 * Note = (17 - Punkte) / 3.
 *
 * Used to show "11 Punkte (entspricht 2)" on results, since students in the
 * Oberstufe think in both.
 */
export function notenpunkteToNote(points: number): number {
  const clamped = Math.max(0, Math.min(15, points));
  return round2((17 - clamped) / 3);
}

/** The reverse, for a student who knows the mark they are aiming at. */
export function noteToNotenpunkte(note: number): number {
  const clamped = Math.max(1, Math.min(6, note));
  return Math.round(17 - clamped * 3);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
