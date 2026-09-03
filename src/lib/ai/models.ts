import "server-only";

import { serverEnv } from "@/lib/env.server";
import type { PlanTier } from "@/config/plans";

/**
 * Model selection, in one place.
 *
 * Every AI capability names a TASK, not a model. This module is the only
 * place that decides which OpenAI model and reasoning effort a task gets, so
 * switching models later is a one-file change.
 *
 * Current OpenAI line-up and pricing per million tokens (verified August 2026
 * against https://developers.openai.com/api/docs/pricing):
 *
 *   gpt-5.6-sol     $4.00 in / $20.00 out   flagship
 *   gpt-5.6-terra   $2.00 in / $12.00 out   balanced
 *   gpt-5.6-luna    $0.20 in /  $1.20 out   high volume
 *
 * All three take `reasoning.effort` of none | low | medium | high | xhigh | max.
 *
 * Why each task lands where it does
 * ---------------------------------
 * LIGHT (luna, effort none/low)
 *   Titles, tags, summaries, flashcards. High volume, low judgement. Luna is
 *   20x cheaper than sol and the work does not reward reasoning.
 *
 * STANDARD (terra, effort low/medium)
 *   Material analysis, curriculum alignment, practice generation, learning
 *   plans. Needs real comprehension but tolerates a second pass if wrong.
 *
 * EXAM GENERATION (terra, effort medium)
 *   Quality-critical, but the output is heavily constrained by a JSON schema
 *   and then run through a deterministic quality gate, so the model does not
 *   have to get everything right unaided. Terra plus validation costs about a
 *   third of sol and measurably beats sol without validation.
 *
 * GRADING (sol, effort medium)
 *   The one place where being wrong damages trust directly. A student who
 *   loses marks unfairly stops believing the product. Worth the flagship.
 *
 * VALIDATION (luna, effort low)
 *   Reads a finished exam and flags pedagogical problems the deterministic
 *   checks cannot see. Cheap enough to run on every generation.
 *
 * Cost of one full exam cycle at these settings is roughly EUR 0.29, which is
 * what the plan limits in src/config/plans.ts are sized against.
 */

export type AiTask =
  | "material_summary"
  | "topic_extraction"
  | "curriculum_alignment"
  | "exam_generation"
  | "exam_validation"
  | "grading"
  | "practice_generation"
  | "flashcard_generation"
  | "weakness_analysis"
  | "learning_plan"
  | "explanation"
  | "notebook_chat"
  | "notebook_artifact";

export type ReasoningEffort =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";

export type ModelKind = "light" | "standard" | "advanced";

export type ModelConfig = {
  model: string;
  effort: ReasoningEffort;
  /** Hard cap on output tokens, so a runaway generation cannot bill forever. */
  maxOutputTokens: number;
};

const DEFAULT_LIGHT = "gpt-5.6-luna";
const DEFAULT_STANDARD = "gpt-5.6-terra";
const DEFAULT_ADVANCED = "gpt-5.6-sol";

/** Env overrides let the model be changed without a deploy. */
function tier(kind: ModelKind): string {
  const env = serverEnv();
  switch (kind) {
    case "light":
      return env.OPENAI_MODEL_LIGHT ?? DEFAULT_LIGHT;
    case "standard":
      return env.OPENAI_MODEL_STANDARD ?? DEFAULT_STANDARD;
    case "advanced":
      return env.OPENAI_MODEL_ADVANCED ?? DEFAULT_ADVANCED;
  }
}

const TASK_TIER: Record<
  AiTask,
  { kind: ModelKind; effort: ReasoningEffort; maxOutputTokens: number }
> = {
  material_summary: { kind: "light", effort: "none", maxOutputTokens: 1_500 },
  topic_extraction: { kind: "light", effort: "low", maxOutputTokens: 3_000 },
  flashcard_generation: { kind: "light", effort: "low", maxOutputTokens: 6_000 },
  explanation: { kind: "light", effort: "low", maxOutputTokens: 2_000 },

  curriculum_alignment: { kind: "standard", effort: "low", maxOutputTokens: 3_000 },
  practice_generation: { kind: "standard", effort: "medium", maxOutputTokens: 8_000 },
  weakness_analysis: { kind: "standard", effort: "medium", maxOutputTokens: 4_000 },
  learning_plan: { kind: "standard", effort: "medium", maxOutputTokens: 8_000 },
  exam_generation: { kind: "standard", effort: "medium", maxOutputTokens: 16_000 },

  // Answering inside a notebook is retrieval plus a paragraph, so it does not
  // need the flagship. Building a deck or a report is a longer piece of
  // reasoning over the whole source set and does.
  notebook_chat: { kind: "standard", effort: "low", maxOutputTokens: 4_000 },
  notebook_artifact: { kind: "standard", effort: "medium", maxOutputTokens: 14_000 },

  exam_validation: { kind: "light", effort: "low", maxOutputTokens: 2_500 },

  // Grading needs the most headroom of any task. `max_output_tokens` in the
  // Responses API covers REASONING tokens as well as visible output, so a
  // reasoning model at medium effort can spend several thousand before it
  // writes a single character of JSON. A cap that only fits the JSON makes
  // the response come back `incomplete`, which fails the whole marking run.
  // See gradingBudgetFor() for the per-exam calculation.
  grading: { kind: "advanced", effort: "medium", maxOutputTokens: 32_000 },
};

/**
 * Model access per plan.
 *
 * A plan caps how capable a model a task may reach. The task still names the
 * tier it WANTS; the plan lowers it if necessary. So grading always asks for
 * the flagship, and only Ultra actually gets it.
 *
 *   free   luna only
 *   pro    luna and terra
 *   ultra  everything, including sol
 *
 * Grading is the honest differentiator here and the reason this exists: every
 * plan is marked against the same Erwartungshorizont with the same criteria,
 * but a stronger model reads a nuanced answer more fairly. Nobody is given a
 * WRONG mark on a cheaper plan; a better model is simply better at spotting
 * that an unusual phrasing is still correct.
 */
const PLAN_CEILING: Record<PlanTier, ModelKind> = {
  free: "light",
  pro: "standard",
  ultra: "advanced",
};

const KIND_RANK: Record<ModelKind, number> = {
  light: 0,
  standard: 1,
  advanced: 2,
};

const EFFORT_RANK: Record<ReasoningEffort, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  xhigh: 4,
  max: 5,
};

/**
 * Highest reasoning effort a plan may use.
 *
 * Free is held to `medium`, which is what grading already asks for, so the
 * cap costs a free user nothing on the task where fairness matters and only
 * bites if a future task asks for `high` or above.
 */
const PLAN_MAX_EFFORT: Record<PlanTier, ReasoningEffort> = {
  free: "medium",
  pro: "high",
  ultra: "max",
};

/**
 * Resolves the model for a task on a plan.
 *
 * `plan` defaults to ultra so an internal caller that genuinely has no user
 * context (a script, a backfill) is not silently downgraded. Every request
 * path passes a real plan.
 */
export function modelFor(task: AiTask, plan: PlanTier = "ultra"): ModelConfig {
  const spec = TASK_TIER[task];

  const kind =
    KIND_RANK[spec.kind] <= KIND_RANK[PLAN_CEILING[plan]]
      ? spec.kind
      : PLAN_CEILING[plan];

  const effort =
    EFFORT_RANK[spec.effort] <= EFFORT_RANK[PLAN_MAX_EFFORT[plan]]
      ? spec.effort
      : PLAN_MAX_EFFORT[plan];

  return {
    model: tier(kind),
    effort,
    maxOutputTokens: spec.maxOutputTokens,
  };
}

/** The model a plan would use for a task. Used by the pricing copy. */
export function modelNameFor(task: AiTask, plan: PlanTier): string {
  return modelFor(task, plan).model;
}

/**
 * Output budget for marking one attempt.
 *
 * Scales with the work rather than using a fixed number, because an exam with
 * 5 tasks and 34 criteria needs far more room than one with 3 tasks and 9.
 * The budget has to cover reasoning tokens as well as the JSON, so it is
 * deliberately generous: running out costs an entire marking run, whereas
 * unused budget costs nothing (billing is on tokens actually produced).
 */
export function gradingBudgetFor(args: {
  taskCount: number;
  criterionCount: number;
}): number {
  const base = 6_000; // reasoning headroom before any output
  const perTask = 900; // explanation, improvement, strengths, signals
  const perCriterion = 160; // verdict, points, short note

  const estimate =
    base + args.taskCount * perTask + args.criterionCount * perCriterion;

  // Never below the task default, never above what the model will accept.
  return Math.min(120_000, Math.max(TASK_TIER.grading.maxOutputTokens, estimate));
}

export function embeddingModel(): string {
  return serverEnv().OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
}

/** Dimension of the embedding model above. Must match the `vector(1536)`
 *  column in material_chunks. */
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Approximate cost per million tokens, used only for internal accounting and
 * the cost figures quoted in plan sizing. Kept next to the model choice so it
 * cannot drift out of sync silently.
 */
export const MODEL_PRICING: Record<string, { inputPerM: number; outputPerM: number }> = {
  "gpt-5.6-sol": { inputPerM: 4.0, outputPerM: 20.0 },
  "gpt-5.6-terra": { inputPerM: 2.0, outputPerM: 12.0 },
  "gpt-5.6-luna": { inputPerM: 0.2, outputPerM: 1.2 },
  "text-embedding-3-small": { inputPerM: 0.02, outputPerM: 0 },
};

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = MODEL_PRICING[model];
  if (!price) return 0;
  return (
    (inputTokens / 1_000_000) * price.inputPerM +
    (outputTokens / 1_000_000) * price.outputPerM
  );
}
