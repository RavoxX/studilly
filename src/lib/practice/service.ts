import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AiError } from "@/lib/ai/client";
import { evaluatePracticeAnswer, generatePractice } from "@/lib/ai/service";
import { consume, getSubscription, release } from "@/lib/subscription/service";
import { evidenceFor, practiceFocus } from "@/lib/weakness/service";
import type { Bundesland, EducationStage, SchoolType } from "@/config/education";

/**
 * Targeted practice.
 *
 * The point of this module is that practice is generated FROM the weakness
 * model, not from a topic picker. If a student understands quadratic
 * functions but never fulfils the operator "eroertern", they get
 * operator-shaped tasks on content they already know, because that is what is
 * actually costing them marks.
 */

export type CreatePracticeResult =
  | { ok: true; setId: string }
  | { ok: false; reason: "limit_reached" | "no_focus" | "ai_failed" | "failed" };

export async function createPracticeSet(args: {
  userId: string;
  /** Explicit weakness to work on, or null to pick the most urgent. */
  weaknessId: string | null;
  questionCount: number;
  education: {
    bundesland: Bundesland;
    schoolType: SchoolType;
    stage: EducationStage;
    grade: number;
  };
}): Promise<CreatePracticeResult> {
  const admin = createAdminClient();

  // Choose the focus first: generating with nothing to work on would waste
  // the student's quota.
  let weakness;
  if (args.weaknessId) {
    const { data } = await admin
      .from("weaknesses")
      .select("*")
      .eq("id", args.weaknessId)
      .eq("user_id", args.userId)
      .maybeSingle();
    weakness = data ?? undefined;
  } else {
    const focus = await practiceFocus({ userId: args.userId, limit: 1 });
    weakness = focus[0];
  }

  if (!weakness) return { ok: false, reason: "no_focus" };

  const { data: subject } = await admin
    .from("subjects")
    .select("id, key, name_de")
    .eq("id", weakness.subject_id)
    .maybeSingle();

  if (!subject) return { ok: false, reason: "failed" };

  try {
    await consume(args.userId, "practice_generation");
  } catch {
    return { ok: false, reason: "limit_reached" };
  }

  const refund = () => release(args.userId, "practice_generation");

  try {
    const evidence = await evidenceFor(weakness.id, 3);

    const { plan } = await getSubscription(args.userId);
    const result = await generatePractice({
      plan,
      context: {
        bundesland: args.education.bundesland,
        schoolType: args.education.schoolType,
        stage: args.education.stage,
        grade: args.education.grade,
        subjectKey: subject.key,
        subjectName: subject.name_de,
        contentLanguage: "Deutsch",
      },
      focus: {
        topicLabel: weakness.topic_label,
        dimension: weakness.dimension,
        operator: weakness.operator,
        evidence: evidence.map((entry) => entry.note).filter(Boolean),
      },
      questionCount: args.questionCount,
    });

    const { data: set, error: setError } = await admin
      .from("practice_sets")
      .insert({
        user_id: args.userId,
        subject_id: subject.id,
        title: result.data.title.slice(0, 200),
        origin: "weakness",
        weakness_id: weakness.id,
        topic_label: weakness.topic_label,
        status: "ready",
        model_used: result.usage.model,
      })
      .select("id")
      .single();

    if (setError || !set) {
      await refund();
      return { ok: false, reason: "failed" };
    }

    const { error: questionError } = await admin
      .from("practice_questions")
      .insert(
        result.data.questions.map((question, index) => ({
          set_id: set.id,
          user_id: args.userId,
          position: index,
          prompt: question.prompt,
          operator: question.operator?.slice(0, 60) ?? null,
          afb: question.afb,
          points: Math.max(1, Math.round(question.points)),
          expected_solution: question.expected_solution,
          erwartungshorizont: question.erwartungshorizont as unknown as never,
          hint: question.hint,
        })),
      );

    if (questionError) {
      await admin.from("practice_sets").delete().eq("id", set.id);
      await refund();
      return { ok: false, reason: "failed" };
    }

    return { ok: true, setId: set.id };
  } catch (error) {
    await refund();
    if (error instanceof AiError) {
      return { ok: false, reason: "ai_failed" };
    }
    console.error(
      "[studilly:practice] generation failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return { ok: false, reason: "failed" };
  }
}

export type CheckAnswerResult =
  | {
      ok: true;
      pointsAwarded: number;
      pointsPossible: number;
      verdict: string;
      explanation: string;
      improvement: string;
      expectedSolution: string;
    }
  | { ok: false; reason: "not_found" | "ai_failed" | "failed" };

/**
 * Marks one practice answer.
 *
 * Uses the same per-criterion approach as exam marking, and the same rule
 * that the backend caps the award at what the question is worth.
 */
export async function checkPracticeAnswer(args: {
  userId: string;
  questionId: string;
  answer: string;
  education: {
    bundesland: Bundesland;
    schoolType: SchoolType;
    stage: EducationStage;
    grade: number;
  };
}): Promise<CheckAnswerResult> {
  const admin = createAdminClient();

  const { data: question } = await admin
    .from("practice_questions")
    .select(
      "id, prompt, operator, points, expected_solution, erwartungshorizont, set_id, practice_sets(subject_id, subjects(key, name_de))",
    )
    .eq("id", args.questionId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (!question) return { ok: false, reason: "not_found" };

  const set = question.practice_sets as unknown as {
    subject_id: string;
    subjects: { key: string; name_de: string } | null;
  } | null;

  try {
    const { plan } = await getSubscription(args.userId);
    const result = await evaluatePracticeAnswer({
      plan,
      context: {
        bundesland: args.education.bundesland,
        schoolType: args.education.schoolType,
        stage: args.education.stage,
        grade: args.education.grade,
        subjectKey: set?.subjects?.key ?? "",
        subjectName: set?.subjects?.name_de ?? "",
        contentLanguage: "Deutsch",
      },
      question: {
        prompt: question.prompt,
        operator: question.operator,
        points: question.points,
        expected_solution: question.expected_solution,
        erwartungshorizont: parseCriteria(question.erwartungshorizont),
      },
      answer: args.answer,
    });

    await admin.from("practice_attempts").insert({
      question_id: question.id,
      user_id: args.userId,
      answer_text: args.answer.slice(0, 20_000),
      points_awarded: result.data.points_awarded,
      points_possible: question.points,
      verdict: result.data.verdict,
      explanation: result.data.explanation,
      improvement: result.data.improvement,
    });

    return {
      ok: true,
      pointsAwarded: result.data.points_awarded,
      pointsPossible: question.points,
      verdict: result.data.verdict,
      explanation: result.data.explanation,
      improvement: result.data.improvement,
      expectedSolution: question.expected_solution,
    };
  } catch (error) {
    if (error instanceof AiError) return { ok: false, reason: "ai_failed" };
    console.error(
      "[studilly:practice] evaluation failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return { ok: false, reason: "failed" };
  }
}

function parseCriteria(raw: unknown): { criterion: string; points: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const record = entry as Record<string, unknown>;
    const criterion = record["criterion"];
    const points = record["points"];
    if (typeof criterion !== "string" || typeof points !== "number") return [];
    return [{ criterion, points }];
  });
}
