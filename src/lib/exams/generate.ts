import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AiError } from "@/lib/ai/client";
import { generateExam, PROMPT_VERSION } from "@/lib/ai/service";
import { curriculumTopicsFor } from "@/lib/curriculum/service";
import {
  firstChunks,
  retrieveRelevantChunks,
} from "@/lib/materials/service";
import { consume, getSubscription, release } from "@/lib/subscription/service";
import type { Bundesland, EducationStage, SchoolType } from "@/config/education";

/**
 * Exam generation, end to end.
 *
 * Order matters here:
 *
 *   1. Reserve quota FIRST. A student must not be able to fire twenty
 *      concurrent generations and have them all pass the limit check.
 *   2. Retrieve only the relevant passages. Never send whole documents.
 *   3. Generate, repair, validate, review. See lib/ai/service.
 *   4. Write the exam and its tasks in one transaction-shaped sequence.
 *   5. Release the quota on ANY failure. A model timeout must not cost a
 *      student one of their monthly exams.
 */

export type GenerateExamInput = {
  userId: string;
  title: string | null;
  subjectId: string;
  materialIds: readonly string[];
  topics: readonly string[];
  difficulty: "einfach" | "standard" | "anspruchsvoll";
  durationMinutes: number;
  taskCount: number;
  education: {
    bundesland: Bundesland;
    schoolType: SchoolType;
    stage: EducationStage;
    grade: number;
  };
};

export type GenerateExamResult =
  | { ok: true; examId: string }
  | { ok: false; reason: "limit_reached" | "no_material" | "ai_failed" | "failed" };

/**
 * Total marks for an exam.
 *
 * German written exams are usually scaled so that working time in minutes is
 * roughly one to two times the mark total. 90 minutes at standard difficulty
 * lands near 60 marks, which is what teachers actually set.
 */
export function targetPointsFor(
  durationMinutes: number,
  difficulty: "einfach" | "standard" | "anspruchsvoll",
): number {
  const perMinute =
    difficulty === "einfach" ? 0.55 : difficulty === "standard" ? 0.7 : 0.85;
  const raw = durationMinutes * perMinute;
  // Round to the nearest 5 so totals look like a real paper.
  return Math.max(10, Math.round(raw / 5) * 5);
}

export async function createExam(
  input: GenerateExamInput,
): Promise<GenerateExamResult> {
  const admin = createAdminClient();

  // 1. Reserve quota before doing any expensive work.
  try {
    await consume(input.userId, "exam_generation");
  } catch {
    return { ok: false, reason: "limit_reached" };
  }

  const refund = () => release(input.userId, "exam_generation");

  try {
    // Ownership check: this runs with the service-role key, so RLS is not
    // filtering for us.
    const { data: materials } = await admin
      .from("learning_materials")
      .select("id, title, summary, detected_language, status")
      .eq("user_id", input.userId)
      .in("id", [...input.materialIds]);

    const usable = (materials ?? []).filter((m) => m.status === "ready");
    if (input.materialIds.length > 0 && usable.length === 0) {
      await refund();
      return { ok: false, reason: "no_material" };
    }

    const { data: subject } = await admin
      .from("subjects")
      .select("id, key, name_de")
      .eq("id", input.subjectId)
      .maybeSingle();

    if (!subject) {
      await refund();
      return { ok: false, reason: "failed" };
    }

    // 2. Retrieve the passages that matter, with a fallback so a student
    //    whose embeddings failed still gets an exam.
    const materialIds = usable.map((m) => m.id);
    let excerpts = await retrieveRelevantChunks({
      userId: input.userId,
      materialIds,
      topics: input.topics,
    });

    if (excerpts.length === 0 && materialIds.length > 0) {
      excerpts = await firstChunks({ userId: input.userId, materialIds });
    }

    const curriculumTopics = await curriculumTopicsFor({
      ...input.education,
      subjectId: input.subjectId,
    });

    // Content language comes from the material, not from the interface
    // language. An English worksheet produces an English exam even when the
    // student uses the German interface.
    const contentLanguage =
      usable.find((m) => m.detected_language)?.detected_language === "en"
        ? "Englisch"
        : "Deutsch";

    const totalPoints = targetPointsFor(input.durationMinutes, input.difficulty);

    // 3. Generate. The plan caps how capable a model this may reach.
    const { plan } = await getSubscription(input.userId);
    const outcome = await generateExam({
      plan,
      context: {
        bundesland: input.education.bundesland,
        schoolType: input.education.schoolType,
        stage: input.education.stage,
        grade: input.education.grade,
        subjectKey: subject.key,
        subjectName: subject.name_de,
        contentLanguage,
      },
      stage: input.education.stage,
      topics: input.topics,
      curriculumTopics: curriculumTopics.map((topic) => ({
        title: topic.title_de,
        competencies: topic.competencies,
      })),
      materialExcerpts: excerpts,
      difficulty: input.difficulty,
      durationMinutes: input.durationMinutes,
      targetTaskCount: input.taskCount,
      totalPoints,
      materialSummary:
        usable.map((m) => m.summary).filter(Boolean).join(" ").slice(0, 800) ||
        "Keine Zusammenfassung verfügbar.",
    });

    // 4. Persist. The default grading scale for the stage is attached now so
    //    results are reproducible even if the student changes it later.
    const { data: scale } = await admin
      .from("grading_scales")
      .select("id")
      .eq("stage", input.education.stage)
      .eq("is_default", true)
      .maybeSingle();

    const actualPoints = outcome.exam.tasks.reduce((sum, t) => sum + t.points, 0);

    const { data: exam, error: examError } = await admin
      .from("exams")
      .insert({
        user_id: input.userId,
        title: (input.title || outcome.exam.title).slice(0, 200),
        subject_id: input.subjectId,
        bundesland: input.education.bundesland,
        school_type: input.education.schoolType,
        stage: input.education.stage,
        grade: input.education.grade,
        difficulty: input.difficulty,
        duration_minutes: input.durationMinutes,
        total_points: Math.round(actualPoints),
        instructions: outcome.exam.instructions.slice(0, 2000),
        status: "ready",
        source_material_ids: materialIds,
        topic_selection: input.topics as unknown as never,
        grading_scale_id: scale?.id ?? null,
        validation_report: {
          issues: outcome.validation.issues,
          stats: outcome.validation.stats,
          review: outcome.review,
        } as unknown as never,
        model_used: outcome.model,
        prompt_version: PROMPT_VERSION,
      })
      .select("id")
      .single();

    if (examError || !exam) {
      await refund();
      return { ok: false, reason: "failed" };
    }

    const { error: taskError } = await admin.from("exam_tasks").insert(
      outcome.exam.tasks.map((task, index) => ({
        exam_id: exam.id,
        user_id: input.userId,
        parent_task_id: null,
        position: index,
        label: task.label.slice(0, 20),
        prompt: task.prompt,
        operator: task.operator?.slice(0, 60) ?? null,
        afb: task.afb,
        points: Math.round(task.points),
        stimulus: task.stimulus,
        expected_solution: task.expected_solution,
        erwartungshorizont: task.erwartungshorizont as unknown as never,
      })),
    );

    if (taskError) {
      // Do not leave a half-written exam behind.
      await admin.from("exams").delete().eq("id", exam.id);
      await refund();
      return { ok: false, reason: "failed" };
    }

    return { ok: true, examId: exam.id };
  } catch (error) {
    await refund();

    if (error instanceof AiError) {
      console.error("[studilly:exams] generation failed:", error.kind, error.message);
      return { ok: false, reason: "ai_failed" };
    }

    console.error(
      "[studilly:exams] generation failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return { ok: false, reason: "failed" };
  }
}
