import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AiError } from "@/lib/ai/client";
import { gradeAttempt } from "@/lib/ai/service";
import { normaliseTaskLabel } from "@/lib/ai/schemas";
import { calculateGrade, type TaskScore } from "@/lib/grading/engine";
import { consume, release } from "@/lib/subscription/service";
import { recordSignals } from "@/lib/weakness/service";
import type { Database } from "@/types/database";

/**
 * Marks a submitted attempt.
 *
 * The division of labour is the point of this module:
 *
 *   The MODEL decides, per Erwartungshorizont criterion, whether the answer
 *   met it and how many of that criterion's marks it earned. That is a
 *   judgement about language and content, which is what a model is for.
 *
 *   The BACKEND sums those marks, computes the percentage, and maps it onto a
 *   grade through a configurable scale. That is arithmetic, and a model doing
 *   arithmetic on a student's grade is a liability.
 *
 * The model is told not to report a grade, and if it did, it would be ignored:
 * nothing here reads a grade field from the model's output.
 */

export type GradeResultOutcome =
  | { ok: true; attemptId: string }
  | {
      ok: false;
      reason: "not_found" | "wrong_status" | "limit_reached" | "ai_failed" | "failed";
    };

type ErwartungshorizontCriterion = {
  criterion: string;
  points: number;
  required: boolean;
};

export async function gradeExamAttempt(args: {
  attemptId: string;
  userId: string;
}): Promise<GradeResultOutcome> {
  const admin = createAdminClient();

  // Ownership check. Service-role client, so RLS is not filtering.
  const { data: attempt } = await admin
    .from("exam_attempts")
    .select("id, exam_id, user_id, status, started_at, time_spent_seconds")
    .eq("id", args.attemptId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (!attempt) return { ok: false, reason: "not_found" };

  // Only a submitted attempt can be marked. This also makes the route
  // idempotent: a double-click cannot mark twice.
  if (attempt.status !== "submitted" && attempt.status !== "failed") {
    return { ok: false, reason: "wrong_status" };
  }

  try {
    await consume(args.userId, "exam_grading");
  } catch {
    return { ok: false, reason: "limit_reached" };
  }

  const refund = () => release(args.userId, "exam_grading");

  await admin
    .from("exam_attempts")
    .update({ status: "grading", error_message: null })
    .eq("id", attempt.id);

  const markFailed = async (message: string) => {
    await admin
      .from("exam_attempts")
      .update({ status: "failed", error_message: message })
      .eq("id", attempt.id);
  };

  try {
    const [{ data: exam }, { data: tasks }, { data: answers }] =
      await Promise.all([
        admin
          .from("exams")
          .select(
            "id, bundesland, school_type, stage, grade, grading_scale_id, subject_id, subjects(key, name_de)",
          )
          .eq("id", attempt.exam_id)
          .single(),
        admin
          .from("exam_tasks")
          .select(
            "id, label, prompt, operator, afb, points, expected_solution, erwartungshorizont",
          )
          .eq("exam_id", attempt.exam_id)
          .order("position"),
        admin
          .from("exam_answers")
          .select("task_id, answer_text")
          .eq("attempt_id", attempt.id),
      ]);

    if (!exam || !tasks || tasks.length === 0) {
      await refund();
      await markFailed("Die Klausur konnte nicht geladen werden.");
      return { ok: false, reason: "not_found" };
    }

    const answerByTask = new Map(
      (answers ?? []).map((a) => [a.task_id, a.answer_text]),
    );

    const subject = exam.subjects as unknown as {
      key: string;
      name_de: string;
    } | null;

    const detectedLanguage = "Deutsch";

    // --- Ask the model to mark each criterion ------------------------------
    const grading = await gradeAttempt({
      context: {
        bundesland: exam.bundesland,
        schoolType: exam.school_type,
        stage: exam.stage,
        grade: exam.grade,
        subjectKey: subject?.key ?? "",
        subjectName: subject?.name_de ?? "",
        contentLanguage: detectedLanguage,
      },
      tasks: tasks.map((task) => ({
        label: task.label,
        prompt: task.prompt,
        operator: task.operator,
        afb: task.afb,
        points: task.points,
        expected_solution: task.expected_solution,
        erwartungshorizont: parseCriteria(task.erwartungshorizont),
      })),
      answers: tasks.map((task) => ({
        label: task.label,
        answer: answerByTask.get(task.id) ?? "",
      })),
    });

    // --- Compute the result ourselves --------------------------------------
    // Keyed by normalised label for the same reason as in ai/service.ts.
    const taskByLabel = new Map(
      tasks.map((task) => [normaliseTaskLabel(task.label), task]),
    );
    const scores: TaskScore[] = [];
    const evaluationRows: Database["public"]["Tables"]["answer_evaluations"]["Insert"][] =
      [];

    for (const evaluation of grading.data.evaluations) {
      const task = taskByLabel.get(normaliseTaskLabel(evaluation.task_label));
      if (!task) continue;

      const criteria = parseCriteria(task.erwartungshorizont);

      // Clamp every criterion to what it is actually worth, then sum. This is
      // where a model that awarded 8 of 6 marks gets corrected.
      //
      // The model returns criterion_index rather than the criterion text, so
      // results are matched by that index and fall back to array position.
      // Criterion text always comes from our stored definition, never from
      // the model, so it cannot be paraphrased or invented.
      let awarded = 0;
      const seenIndexes = new Set<number>();

      const criteriaResults = evaluation.criteria_results.map(
        (result, position) => {
          const index =
            Number.isInteger(result.criterion_index) &&
            result.criterion_index >= 0 &&
            result.criterion_index < criteria.length
              ? result.criterion_index
              : position;

          // A repeated index would let one criterion be paid twice.
          const unique = seenIndexes.has(index) ? position : index;
          seenIndexes.add(unique);

          const definition = criteria[unique];
          const max = definition?.points ?? 0;
          const points = Math.min(Math.max(0, result.points_awarded), max);
          awarded += points;

          return {
            criterion: definition?.criterion ?? "",
            met: result.met,
            points_awarded: points,
            points_possible: max,
            note: result.note,
          };
        },
      );

      awarded = Math.min(awarded, task.points);

      scores.push({
        taskId: task.id,
        label: task.label,
        pointsAwarded: awarded,
        pointsPossible: task.points,
      });

      evaluationRows.push({
        attempt_id: attempt.id,
        task_id: task.id,
        user_id: args.userId,
        points_awarded: round2(awarded),
        points_possible: task.points,
        verdict: evaluation.verdict,
        criteria_results: criteriaResults as unknown as never,
        missing_elements: evaluation.missing_elements.slice(0, 10),
        misconceptions: evaluation.misconceptions.slice(0, 10),
        strengths: evaluation.strengths.slice(0, 10),
        explanation: evaluation.explanation,
        improvement: evaluation.improvement,
      });
    }

    // --- Grade, from a configurable scale ----------------------------------
    const { data: scale } = await admin
      .from("grading_scales")
      .select("id, scale_type, thresholds")
      .eq("id", exam.grading_scale_id ?? "")
      .maybeSingle();

    const effectiveScale =
      scale ??
      (
        await admin
          .from("grading_scales")
          .select("id, scale_type, thresholds")
          .eq("stage", exam.stage)
          .eq("is_default", true)
          .single()
      ).data;

    if (!effectiveScale) {
      await refund();
      await markFailed("Kein Notenschlüssel gefunden.");
      return { ok: false, reason: "failed" };
    }

    const result = calculateGrade({
      scores,
      scale: {
        scale_type: effectiveScale.scale_type,
        thresholds: effectiveScale.thresholds,
      },
    });

    // --- Persist ------------------------------------------------------------
    await admin.from("answer_evaluations").delete().eq("attempt_id", attempt.id);
    if (evaluationRows.length > 0) {
      await admin.from("answer_evaluations").insert(evaluationRows);
    }

    await admin
      .from("exam_attempts")
      .update({
        status: "graded",
        graded_at: new Date().toISOString(),
        points_awarded: result.pointsAwarded,
        points_possible: result.pointsPossible,
        percentage: result.percentage,
        grade_value: result.gradeValue,
        grade_label: result.gradeLabel,
        grading_scale_id: effectiveScale.id,
        feedback_summary: {
          summary: grading.data.summary,
          strengths: grading.data.overall_strengths,
          weaknesses: grading.data.overall_weaknesses,
        } as unknown as never,
        model_used: grading.usage.model,
        error_message: null,
      })
      .eq("id", attempt.id);

    // --- Update the persistent weakness model -------------------------------
    // Best-effort: a student must still get their result if this fails.
    try {
      await recordSignals({
        userId: args.userId,
        subjectId: exam.subject_id,
        attemptId: attempt.id,
        evaluations: grading.data.evaluations.map((evaluation) => ({
          taskLabel: evaluation.task_label,
          taskId: taskByLabel.get(normaliseTaskLabel(evaluation.task_label))?.id ?? null,
          operator: taskByLabel.get(normaliseTaskLabel(evaluation.task_label))?.operator ?? null,
          signals: evaluation.skill_signals,
          pointsLost:
            (taskByLabel.get(normaliseTaskLabel(evaluation.task_label))?.points ?? 0) -
            (scores.find((s) => normaliseTaskLabel(s.label) === normaliseTaskLabel(evaluation.task_label))
              ?.pointsAwarded ?? 0),
        })),
      });
    } catch (error) {
      console.error(
        "[studilly:weakness] signal recording failed:",
        error instanceof Error ? error.message : "unknown",
      );
    }

    return { ok: true, attemptId: attempt.id };
  } catch (error) {
    await refund();

    if (error instanceof AiError) {
      // Log the kind AND the message. Without this the only symptom is a 503
      // and a German sentence in the database, which is not enough to tell a
      // token-budget failure from a provider outage.
      console.error(
        `[studilly:exams] grading failed for attempt ${attempt.id}: ` +
          `${error.kind}: ${error.message}`,
      );
      await markFailed(
        error.kind === "invalid_output"
          ? "Die Korrektur war unvollständig."
          : "Die Korrektur ist gerade nicht erreichbar.",
      );
      return { ok: false, reason: "ai_failed" };
    }

    console.error(
      "[studilly:exams] grading failed:",
      error instanceof Error ? error.message : "unknown",
    );
    await markFailed("Die Korrektur ist fehlgeschlagen.");
    return { ok: false, reason: "failed" };
  }
}

/** Reads the Erwartungshorizont JSON defensively: it came from a model. */
function parseCriteria(raw: unknown): ErwartungshorizontCriterion[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const record = entry as Record<string, unknown>;
    const criterion = record["criterion"];
    const points = record["points"];
    if (typeof criterion !== "string" || typeof points !== "number") return [];
    return [
      {
        criterion,
        points,
        required: record["required"] === true,
      },
    ];
  });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
