import { AFB_DISTRIBUTION, findOperator } from "@/config/operators";
import type { EducationStage } from "@/config/education";
import type { AfbLevel } from "@/config/operators";
import type { ExamGeneration, GeneratedTask } from "./schemas";

/**
 * Deterministic quality gate for generated exams.
 *
 * A model that returns schema-valid JSON can still return a bad exam: points
 * that do not add up, an Erwartungshorizont that awards more marks than the
 * task is worth, two tasks that are the same question, an AFB distribution
 * that makes an Oberstufe paper read like a vocabulary test.
 *
 * Everything checkable by arithmetic or by rule is checked here, before a row
 * is written. Structural failures are errors and block the exam. Judgement
 * calls are warnings and are recorded on the exam so they can be inspected,
 * but do not block. The pedagogical checks a computer cannot make are handled
 * separately by the review model.
 *
 * This module is pure. It is the most heavily tested part of the AI layer.
 */

export type ValidationIssue = {
  severity: "error" | "warning";
  code: ValidationCode;
  taskLabel: string | null;
  message: string;
};

export type ValidationCode =
  | "no_tasks"
  | "missing_label"
  | "duplicate_label"
  | "empty_prompt"
  | "non_positive_points"
  | "non_integer_points"
  | "points_total_mismatch"
  | "missing_solution"
  | "missing_erwartungshorizont"
  | "criteria_points_mismatch"
  | "empty_criterion"
  | "unknown_operator"
  | "operator_afb_mismatch"
  | "afb_distribution"
  | "duplicate_task"
  | "implausible_duration"
  | "task_count_mismatch";

export type ValidationReport = {
  ok: boolean;
  issues: ValidationIssue[];
  stats: {
    taskCount: number;
    totalPoints: number;
    afbShare: Record<AfbLevel, number>;
    pointsPerMinute: number;
  };
};

/** Points may be whole or half. Anything finer is a generation artefact. */
function isValidPointValue(value: number): boolean {
  return Number.isFinite(value) && value > 0 && Math.abs(value * 2 - Math.round(value * 2)) < 1e-9;
}

/** Cheap similarity, used only to catch a model repeating itself. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function jaccard(a: string, b: string): number {
  const setA = new Set(normalise(a).split(" ").filter((w) => w.length > 3));
  const setB = new Set(normalise(b).split(" ").filter((w) => w.length > 3));
  if (setA.size === 0 || setB.size === 0) return 0;

  let shared = 0;
  for (const word of setA) if (setB.has(word)) shared += 1;
  return shared / (setA.size + setB.size - shared);
}

export function validateExam(args: {
  exam: ExamGeneration;
  stage: EducationStage;
  expectedTotalPoints: number;
  expectedTaskCount: number;
  durationMinutes: number;
  subjectKey: string;
}): ValidationReport {
  const issues: ValidationIssue[] = [];
  const tasks = args.exam.tasks;

  const push = (
    severity: ValidationIssue["severity"],
    code: ValidationCode,
    taskLabel: string | null,
    message: string,
  ) => issues.push({ severity, code, taskLabel, message });

  // --- Structure ----------------------------------------------------------

  if (tasks.length === 0) {
    push("error", "no_tasks", null, "The exam contains no tasks.");
    return {
      ok: false,
      issues,
      stats: {
        taskCount: 0,
        totalPoints: 0,
        afbShare: { I: 0, II: 0, III: 0 },
        pointsPerMinute: 0,
      },
    };
  }

  const seenLabels = new Set<string>();
  for (const task of tasks) {
    const label = task.label?.trim() ?? "";

    if (label === "") {
      push("error", "missing_label", null, "A task has no label.");
    } else if (seenLabels.has(label)) {
      push("error", "duplicate_label", label, `Label "${label}" is used twice.`);
    } else {
      seenLabels.add(label);
    }

    if (task.prompt.trim() === "") {
      push("error", "empty_prompt", label, "Task text is empty.");
    }

    // --- Points ----------------------------------------------------------

    if (!isValidPointValue(task.points)) {
      push(
        "error",
        task.points <= 0 ? "non_positive_points" : "non_integer_points",
        label,
        `Points must be a positive whole or half number, got ${task.points}.`,
      );
    }

    // --- Solutions and marking scheme ------------------------------------

    if (!task.expected_solution || task.expected_solution.trim() === "") {
      push("error", "missing_solution", label, "Task has no model solution.");
    }

    if (task.erwartungshorizont.length === 0) {
      push(
        "error",
        "missing_erwartungshorizont",
        label,
        "Task has no marking criteria.",
      );
    } else {
      const criteriaTotal = task.erwartungshorizont.reduce(
        (sum, c) => sum + c.points,
        0,
      );

      if (Math.abs(criteriaTotal - task.points) > 1e-6) {
        push(
          "error",
          "criteria_points_mismatch",
          label,
          `Marking criteria sum to ${criteriaTotal} but the task is worth ${task.points}.`,
        );
      }

      for (const criterion of task.erwartungshorizont) {
        if (criterion.criterion.trim() === "") {
          push("error", "empty_criterion", label, "A marking criterion is empty.");
        }
        if (!isValidPointValue(criterion.points)) {
          push(
            "error",
            "non_positive_points",
            label,
            `A marking criterion has invalid points: ${criterion.points}.`,
          );
        }
      }
    }

    // --- Operator and AFB -------------------------------------------------

    const operator = findOperator(task.operator ?? "");
    if (!operator) {
      push(
        "warning",
        "unknown_operator",
        label,
        `Operator "${task.operator}" is not in the catalogue.`,
      );
    } else if (operator.afb !== task.afb) {
      // Not an error: a task can legitimately sit one level above its
      // operator's usual home when the context demands more.
      push(
        "warning",
        "operator_afb_mismatch",
        label,
        `Operator "${operator.label}" is usually AFB ${operator.afb}, task claims AFB ${task.afb}.`,
      );
    }
  }

  // --- Totals -------------------------------------------------------------

  const totalPoints = tasks.reduce((sum, t) => sum + t.points, 0);

  if (Math.abs(totalPoints - args.expectedTotalPoints) > 1e-6) {
    push(
      "error",
      "points_total_mismatch",
      null,
      `Task points sum to ${totalPoints}, expected ${args.expectedTotalPoints}.`,
    );
  }

  // Task count is a request, not a contract. Being one or two off is fine.
  const countDelta = Math.abs(tasks.length - args.expectedTaskCount);
  if (countDelta > 2) {
    push(
      "warning",
      "task_count_mismatch",
      null,
      `Generated ${tasks.length} tasks, asked for ${args.expectedTaskCount}.`,
    );
  }

  // --- AFB distribution ---------------------------------------------------

  const afbPoints: Record<AfbLevel, number> = { I: 0, II: 0, III: 0 };
  for (const task of tasks) afbPoints[task.afb] += task.points;

  const afbShare: Record<AfbLevel, number> = {
    I: totalPoints > 0 ? afbPoints.I / totalPoints : 0,
    II: totalPoints > 0 ? afbPoints.II / totalPoints : 0,
    III: totalPoints > 0 ? afbPoints.III / totalPoints : 0,
  };

  const targets = AFB_DISTRIBUTION[args.stage];
  for (const level of ["I", "II", "III"] as const) {
    const share = afbShare[level];
    const bounds = targets[level];
    if (share < bounds.min || share > bounds.max) {
      push(
        "warning",
        "afb_distribution",
        null,
        `AFB ${level} holds ${Math.round(share * 100)} percent of marks, expected between ${Math.round(
          bounds.min * 100,
        )} and ${Math.round(bounds.max * 100)}.`,
      );
    }
  }

  // --- Duplicates ---------------------------------------------------------

  for (let i = 0; i < tasks.length; i += 1) {
    for (let j = i + 1; j < tasks.length; j += 1) {
      const a = tasks[i];
      const b = tasks[j];
      if (!a || !b) continue;
      if (jaccard(a.prompt, b.prompt) > 0.75) {
        push(
          "warning",
          "duplicate_task",
          b.label,
          `Task ${b.label} is very similar to task ${a.label}.`,
        );
      }
    }
  }

  // --- Duration plausibility ----------------------------------------------
  //
  // German written exams tend to land between roughly 0.4 and 1.2 marks per
  // minute of working time. Outside that, either the paper is unfinishable or
  // the student will be done in ten minutes.

  const pointsPerMinute =
    args.durationMinutes > 0 ? totalPoints / args.durationMinutes : 0;

  if (pointsPerMinute > 1.5) {
    push(
      "warning",
      "implausible_duration",
      null,
      `${totalPoints} marks in ${args.durationMinutes} minutes is very dense.`,
    );
  } else if (pointsPerMinute > 0 && pointsPerMinute < 0.25) {
    push(
      "warning",
      "implausible_duration",
      null,
      `${totalPoints} marks in ${args.durationMinutes} minutes is very sparse.`,
    );
  }

  return {
    ok: !issues.some((i) => i.severity === "error"),
    issues,
    stats: {
      taskCount: tasks.length,
      totalPoints,
      afbShare,
      pointsPerMinute,
    },
  };
}

/**
 * Repairs the small, unambiguous problems rather than throwing away a whole
 * generation over them.
 *
 * Only fixes where there is exactly one correct answer:
 *   - Labels that collide get suffixed.
 *   - Criteria that miss their task total by a rounding step are scaled onto
 *     it, with the remainder going to the largest criterion.
 *
 * Anything requiring judgement is left for validation to reject.
 */
export function repairExam(exam: ExamGeneration): ExamGeneration {
  const usedLabels = new Set<string>();

  const tasks: GeneratedTask[] = exam.tasks.map((task, index) => {
    // Unique labels.
    let label = task.label?.trim() || `${index + 1}`;
    if (usedLabels.has(label)) {
      let suffix = 2;
      while (usedLabels.has(`${label}.${suffix}`)) suffix += 1;
      label = `${label}.${suffix}`;
    }
    usedLabels.add(label);

    // Criteria that nearly add up.
    let criteria = task.erwartungshorizont;
    const criteriaTotal = criteria.reduce((sum, c) => sum + c.points, 0);
    const drift = task.points - criteriaTotal;

    if (
      criteria.length > 0 &&
      Math.abs(drift) > 1e-6 &&
      Math.abs(drift) <= Math.max(1, task.points * 0.25)
    ) {
      let largestIndex = 0;
      for (let i = 1; i < criteria.length; i += 1) {
        const current = criteria[i];
        const largest = criteria[largestIndex];
        if (current && largest && current.points > largest.points) {
          largestIndex = i;
        }
      }
      criteria = criteria.map((c, i) =>
        i === largestIndex
          ? { ...c, points: Math.max(0.5, c.points + drift) }
          : c,
      );
    }

    return { ...task, label, erwartungshorizont: criteria };
  });

  return { ...exam, tasks };
}
