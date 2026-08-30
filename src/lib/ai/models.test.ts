import { beforeAll, describe, expect, it } from "vitest";
import { modelFor, gradingBudgetFor } from "./models";
import type { AiTask } from "./models";
import type { PlanTier } from "@/config/plans";

/**
 * Plan-based model access.
 *
 * A plan caps how capable a model a task may reach. The task always asks for
 * the tier it wants; the plan lowers it. These tests pin the whole matrix,
 * because a silent change here would either overspend on free users or
 * quietly downgrade paying ones.
 */

beforeAll(() => {
  // modelFor reads the env for optional model overrides.
  process.env["SUPABASE_SECRET_KEY"] ??= "test";
  process.env["OPENAI_API_KEY"] ??= "test";
});

const LUNA = "gpt-5.6-luna";
const TERRA = "gpt-5.6-terra";
const SOL = "gpt-5.6-sol";

describe("model ceiling per plan", () => {
  it("holds free to luna for every task", () => {
    const tasks: AiTask[] = [
      "material_summary",
      "topic_extraction",
      "flashcard_generation",
      "explanation",
      "curriculum_alignment",
      "practice_generation",
      "weakness_analysis",
      "learning_plan",
      "exam_generation",
      "exam_validation",
      "grading",
    ];

    for (const task of tasks) {
      expect(modelFor(task, "free").model, task).toBe(LUNA);
    }
  });

  it("lets pro reach terra but no further", () => {
    // A task that only wants luna still gets luna: the ceiling is a cap, not
    // a floor, so pro does not overspend on cheap work.
    expect(modelFor("flashcard_generation", "pro").model).toBe(LUNA);
    expect(modelFor("exam_validation", "pro").model).toBe(LUNA);

    expect(modelFor("exam_generation", "pro").model).toBe(TERRA);
    expect(modelFor("practice_generation", "pro").model).toBe(TERRA);

    // Grading asks for the flagship and is capped to terra.
    expect(modelFor("grading", "pro").model).toBe(TERRA);
  });

  it("gives ultra the flagship where the task asks for it", () => {
    expect(modelFor("grading", "ultra").model).toBe(SOL);
    expect(modelFor("exam_generation", "ultra").model).toBe(TERRA);
    expect(modelFor("flashcard_generation", "ultra").model).toBe(LUNA);
  });

  it("never gives a lower plan a stronger model than a higher one", () => {
    const order: PlanTier[] = ["free", "pro", "ultra"];
    const rank: Record<string, number> = { [LUNA]: 0, [TERRA]: 1, [SOL]: 2 };
    const tasks: AiTask[] = ["grading", "exam_generation", "practice_generation"];

    for (const task of tasks) {
      const ranks = order.map((plan) => rank[modelFor(task, plan).model] ?? -1);
      expect(ranks[0]!).toBeLessThanOrEqual(ranks[1]!);
      expect(ranks[1]!).toBeLessThanOrEqual(ranks[2]!);
    }
  });
});

describe("reasoning effort per plan", () => {
  it("gives grading medium effort on every plan", () => {
    // The user-visible promise: marking reasons properly regardless of plan.
    // Only the model differs, never whether it thinks about the answer.
    for (const plan of ["free", "pro", "ultra"] as PlanTier[]) {
      expect(modelFor("grading", plan).effort, plan).toBe("medium");
    }
  });

  it("caps free at medium", () => {
    for (const task of ["exam_generation", "practice_generation"] as AiTask[]) {
      const effort = modelFor(task, "free").effort;
      expect(["none", "low", "medium"]).toContain(effort);
    }
  });

  it("leaves cheap tasks on their low default rather than inflating them", () => {
    expect(modelFor("material_summary", "ultra").effort).toBe("none");
    expect(modelFor("flashcard_generation", "ultra").effort).toBe("low");
  });
});

describe("defaults", () => {
  it("defaults to ultra when no plan is given", () => {
    // Internal callers with no user context must not be silently downgraded.
    expect(modelFor("grading").model).toBe(modelFor("grading", "ultra").model);
  });
});

describe("gradingBudgetFor", () => {
  /*
   * The 32,000 floor is deliberately generous: a real 5-task, 34-criterion
   * marking run produced 3,459 tokens, so the floor is roughly ten times what
   * a normal exam needs. Every ordinary exam therefore sits AT the floor, and
   * the per-task scaling only engages for outliers. Unused budget is free
   * (billing is on tokens produced) whereas running out costs a whole run, so
   * the asymmetry is intentional.
   */

  it("puts every realistically-sized exam at the floor", () => {
    expect(gradingBudgetFor({ taskCount: 1, criterionCount: 1 })).toBe(32_000);
    // The exam that originally failed.
    expect(gradingBudgetFor({ taskCount: 5, criterionCount: 34 })).toBe(32_000);
    expect(gradingBudgetFor({ taskCount: 12, criterionCount: 90 })).toBe(32_000);
  });

  it("scales past the floor once an exam is genuinely large", () => {
    const atFloor = gradingBudgetFor({ taskCount: 12, criterionCount: 90 });
    const huge = gradingBudgetFor({ taskCount: 40, criterionCount: 400 });
    expect(huge).toBeGreaterThan(atFloor);
  });

  it("stays within a sane ceiling", () => {
    expect(
      gradingBudgetFor({ taskCount: 500, criterionCount: 5000 }),
    ).toBeLessThanOrEqual(120_000);
  });
});
