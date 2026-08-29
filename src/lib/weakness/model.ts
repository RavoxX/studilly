import type { Database } from "@/types/database";

/**
 * The persistent student weakness model.
 *
 * A common shortcut is to save the model's feedback text and call that a
 * weakness system. That does not work: prose cannot be ranked, cannot be
 * compared over time, and cannot drive targeted practice.
 *
 * Instead, every graded answer emits structured SIGNALS (topic, dimension,
 * severity, evidence). Signals accumulate into weakness rows, and this module
 * owns the arithmetic that turns a stream of signals into a stable, ranked
 * picture of where a student is losing marks.
 *
 * Three numbers per weakness:
 *
 *   severity    0..1, how much this is costing right now. An exponential
 *               moving average, so recent performance dominates without a
 *               single good answer erasing a real problem.
 *
 *   confidence  0..1, how much to believe the severity. Grows with evidence
 *               and saturates. One data point is a hint, not a finding, and
 *               the UI shows low-confidence items differently.
 *
 *   trend       improving / stable / worsening, from comparing recent
 *               evidence against older evidence.
 *
 * Weaknesses also decay: a topic not seen for weeks becomes less urgent on its
 * own, because the student has probably moved on.
 *
 * Pure and side-effect free.
 */

export type SkillDimension = Database["public"]["Enums"]["skill_dimension"];
export type WeaknessTrend = Database["public"]["Enums"]["weakness_trend"];

export type SkillSignal = {
  topicLabel: string;
  dimension: SkillDimension;
  /** 0..1. How badly this instance cost the student. */
  severity: number;
  operator: string | null;
  evidence: string;
  pointsLost: number;
  occurredAt: Date;
};

export type WeaknessState = {
  severity: number;
  confidence: number;
  evidenceCount: number;
  trend: WeaknessTrend;
  lastSeenAt: Date;
  resolvedAt: Date | null;
};

/**
 * How much weight a new signal carries.
 *
 * Early signals move the estimate a lot because there is little to go on.
 * Once there is real history, a single answer should nudge rather than swing.
 */
function learningRate(evidenceCount: number): number {
  if (evidenceCount <= 0) return 1;
  return Math.max(0.2, 1 / (evidenceCount + 1));
}

/**
 * Confidence saturates: 1 signal is weak evidence, 5 is reasonable, and past
 * about 10 more data does not add much certainty.
 */
export function confidenceFor(evidenceCount: number): number {
  if (evidenceCount <= 0) return 0;
  return round2(1 - Math.exp(-evidenceCount / 3.5));
}

/**
 * Severity decays toward zero while a topic is not being assessed.
 *
 * Half-life of 30 days: a weakness untouched for a month counts for half as
 * much, which stops a dashboard filling up with problems from last term.
 */
export function decaySeverity(
  severity: number,
  lastSeenAt: Date,
  now: Date,
): number {
  const days = Math.max(
    0,
    (now.getTime() - lastSeenAt.getTime()) / (24 * 60 * 60_000),
  );
  if (days < 1) return severity;
  return round2(severity * Math.pow(0.5, days / 30));
}

/** Folds one new signal into an existing weakness. */
export function applySignal(args: {
  current: WeaknessState | null;
  signal: SkillSignal;
  /** Severities of prior evidence, newest first. Used for the trend. */
  recentSeverities: readonly number[];
}): WeaknessState {
  const { signal } = args;
  const clampedSignal = clamp01(signal.severity);

  if (!args.current) {
    return {
      severity: clampedSignal,
      confidence: confidenceFor(1),
      evidenceCount: 1,
      trend: "new",
      lastSeenAt: signal.occurredAt,
      resolvedAt: null,
    };
  }

  const decayed = decaySeverity(
    args.current.severity,
    args.current.lastSeenAt,
    signal.occurredAt,
  );

  const rate = learningRate(args.current.evidenceCount);
  const severity = clamp01(round2(decayed * (1 - rate) + clampedSignal * rate));
  const evidenceCount = args.current.evidenceCount + 1;

  return {
    severity,
    confidence: confidenceFor(evidenceCount),
    evidenceCount,
    trend: trendFrom([clampedSignal, ...args.recentSeverities]),
    lastSeenAt: signal.occurredAt,
    // A weakness that shows up again is no longer resolved.
    resolvedAt: null,
  };
}

/**
 * Records that the student handled this topic correctly.
 *
 * Recovery has to be possible, otherwise the model only ever accumulates and
 * the student never sees progress. A clean answer counts as a zero-severity
 * signal, and enough of them resolve the weakness.
 */
export function applySuccess(args: {
  current: WeaknessState;
  at: Date;
  recentSeverities: readonly number[];
}): WeaknessState {
  const decayed = decaySeverity(
    args.current.severity,
    args.current.lastSeenAt,
    args.at,
  );
  const rate = learningRate(args.current.evidenceCount);
  const severity = clamp01(round2(decayed * (1 - rate)));
  const evidenceCount = args.current.evidenceCount + 1;

  const resolved = severity < 0.15 && evidenceCount >= 3;

  return {
    severity,
    confidence: confidenceFor(evidenceCount),
    evidenceCount,
    trend: trendFrom([0, ...args.recentSeverities]),
    lastSeenAt: args.at,
    resolvedAt: resolved ? args.at : null,
  };
}

/**
 * Compares the newer half of the evidence against the older half.
 *
 * Needs at least four data points: below that, "trend" would be noise
 * dressed up as insight, so it stays "new".
 */
export function trendFrom(severities: readonly number[]): WeaknessTrend {
  if (severities.length < 4) return "new";

  const half = Math.floor(severities.length / 2);
  const recent = severities.slice(0, half);
  const older = severities.slice(half);

  const recentMean = mean(recent);
  const olderMean = mean(older);
  const delta = recentMean - olderMean;

  if (delta <= -0.12) return "improving";
  if (delta >= 0.12) return "worsening";
  return "stable";
}

/**
 * Ranks weaknesses for display and for choosing what to practise next.
 *
 * Priority balances how bad it is against how sure we are. A severe problem
 * seen once should not outrank a moderate problem seen five times, because
 * acting on the first might waste the student's time.
 *
 * Recency breaks ties: a topic from this week matters more than one from last
 * month, even at equal severity.
 */
export function priorityScore(args: {
  severity: number;
  confidence: number;
  lastSeenAt: Date;
  now?: Date;
}): number {
  const now = args.now ?? new Date();
  const daysSince = Math.max(
    0,
    (now.getTime() - args.lastSeenAt.getTime()) / (24 * 60 * 60_000),
  );
  const recency = Math.pow(0.5, daysSince / 21);

  return round3(args.severity * args.confidence * (0.6 + 0.4 * recency));
}

export function severityBand(severity: number): "low" | "medium" | "high" {
  if (severity >= 0.6) return "high";
  if (severity >= 0.3) return "medium";
  return "low";
}

/**
 * Picks what a student should work on next.
 *
 * Deliberately does not just return the top N by score: three practice sets
 * on the same topic in a row is demoralising and pedagogically worse than
 * spreading effort. At most one focus per topic.
 */
export function selectPracticeFocus<
  T extends {
    id: string;
    topicLabel: string;
    dimension: SkillDimension;
    severity: number;
    confidence: number;
    lastSeenAt: Date;
  },
>(weaknesses: readonly T[], limit: number, now: Date = new Date()): T[] {
  const ranked = [...weaknesses]
    .map((w) => ({ w, score: priorityScore({ ...w, now }) }))
    .filter(({ score }) => score > 0.05)
    .sort((a, b) => b.score - a.score);

  const seenTopics = new Set<string>();
  const chosen: T[] = [];

  for (const { w } of ranked) {
    const key = w.topicLabel.toLowerCase();
    if (seenTopics.has(key)) continue;
    seenTopics.add(key);
    chosen.push(w);
    if (chosen.length >= limit) break;
  }

  return chosen;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
