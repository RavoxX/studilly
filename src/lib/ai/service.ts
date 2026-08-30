import "server-only";

import { AiError, generateStructured, type AiResult } from "./client";
import {
  PROMPT_VERSION,
  examGenerationPrompt,
  examReviewPrompt,
  explanationPrompt,
  flashcardPrompt,
  gradingPrompt,
  learningPlanPrompt,
  materialAnalysisPrompt,
  practiceEvaluationPrompt,
  practiceGenerationPrompt,
  type StudentContext,
} from "./prompts";
import {
  examGenerationSchema,
  examReviewSchema,
  explanationSchema,
  flashcardGenerationSchema,
  gradingSchema,
  learningPlanSchema,
  materialAnalysisSchema,
  practiceEvaluationSchema,
  practiceGenerationSchema,
  type ExamGeneration,
  type ExamReview,
  type Explanation,
  type FlashcardGeneration,
  type GradingResult,
  type LearningPlanGeneration,
  type MaterialAnalysis,
  type PracticeEvaluation,
  type PracticeGeneration,
  normaliseTaskLabel,
} from "./schemas";
import { repairExam, validateExam, type ValidationReport } from "./validation";
import { gradingBudgetFor } from "./models";
import type { EducationStage } from "@/config/education";

/**
 * AIService.
 *
 * One capability per method. Each method owns its prompt, its schema and its
 * post-processing, so a caller never assembles a prompt or parses a model
 * response itself.
 *
 * Everything here is server-only. No route hands a model call to the browser.
 */

export { AiError, PROMPT_VERSION };
export type { StudentContext };

// ---------------------------------------------------------------------------
// Material analysis
// ---------------------------------------------------------------------------

export async function analyseMaterial(args: {
  filename: string;
  /** Extracted text. Empty when the file is a scan or photo. */
  text: string;
  /** Data URIs for pages that have no text layer. */
  images?: readonly string[];
  subjectOptions: readonly { key: string; name: string }[];
  curriculumTopics: readonly { id: string; title: string }[];
}): Promise<AiResult<MaterialAnalysis>> {
  // Analysis only needs enough of the document to characterise it. Sending a
  // whole script here would cost more than the exam it eventually produces.
  const excerpt = args.text.slice(0, 24_000);

  const { system, input } = materialAnalysisPrompt({
    filename: args.filename,
    excerpt:
      excerpt.length > 0
        ? excerpt
        : "(no text layer; analyse the attached images)",
    subjectOptions: args.subjectOptions,
    curriculumTopics: args.curriculumTopics,
  });

  return generateStructured({
    task: "topic_extraction",
    schemaName: "material_analysis",
    schema: materialAnalysisSchema,
    system,
    input,
    ...(args.images && args.images.length > 0 ? { images: args.images } : {}),
  });
}

// ---------------------------------------------------------------------------
// Exam generation
// ---------------------------------------------------------------------------

export type ExamGenerationOutcome = {
  exam: ExamGeneration;
  validation: ValidationReport;
  review: ExamReview | null;
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
  model: string;
  promptVersion: string;
};

/**
 * Generates an exam and puts it through the quality gate before returning.
 *
 * Pipeline:
 *   1. Generate.
 *   2. Repair the small unambiguous problems (label collisions, criteria that
 *      miss their total by a rounding step).
 *   3. Validate deterministically. Structural failures trigger one retry with
 *      the failures fed back, because a second attempt is far cheaper than
 *      showing a student a broken exam.
 *   4. Review with a cheap second model for the pedagogical problems
 *      arithmetic cannot catch.
 *
 * Throws AiError("invalid_output") when the exam still fails validation, so
 * the caller can release the student's quota.
 */
export async function generateExam(args: {
  context: StudentContext;
  stage: EducationStage;
  topics: readonly string[];
  curriculumTopics: readonly { title: string; competencies: readonly string[] }[];
  materialExcerpts: readonly { source: string; content: string }[];
  difficulty: "einfach" | "standard" | "anspruchsvoll";
  durationMinutes: number;
  targetTaskCount: number;
  totalPoints: number;
  materialSummary: string;
}): Promise<ExamGenerationOutcome> {
  const promptArgs = {
    context: args.context,
    topics: args.topics,
    curriculumTopics: args.curriculumTopics,
    materialExcerpts: args.materialExcerpts,
    difficulty: args.difficulty,
    durationMinutes: args.durationMinutes,
    targetTaskCount: args.targetTaskCount,
    totalPoints: args.totalPoints,
  };

  const { system, input } = examGenerationPrompt(promptArgs);

  let attempt = await generateStructured({
    task: "exam_generation",
    schemaName: "exam",
    schema: examGenerationSchema,
    system,
    input,
  });

  let exam = repairExam(attempt.data);
  let validation = validateExam({
    exam,
    stage: args.stage,
    expectedTotalPoints: args.totalPoints,
    expectedTaskCount: args.targetTaskCount,
    durationMinutes: args.durationMinutes,
    subjectKey: args.context.subjectKey,
  });

  let totalInput = attempt.usage.inputTokens;
  let totalOutput = attempt.usage.outputTokens;
  let totalCost = attempt.usage.costUsd;

  // One corrective retry. Telling the model exactly what failed is far more
  // effective than resampling and hoping.
  if (!validation.ok) {
    const failures = validation.issues
      .filter((i) => i.severity === "error")
      .map((i) => `- ${i.taskLabel ? `[${i.taskLabel}] ` : ""}${i.message}`)
      .join("\n");

    const retry = await generateStructured({
      task: "exam_generation",
      schemaName: "exam",
      schema: examGenerationSchema,
      system,
      input: `${input}

Ein vorheriger Versuch wurde wegen dieser Fehler abgelehnt. Erzeuge die Klausur
neu und vermeide sie:
${failures}`,
    });

    attempt = retry;
    exam = repairExam(retry.data);
    validation = validateExam({
      exam,
      stage: args.stage,
      expectedTotalPoints: args.totalPoints,
      expectedTaskCount: args.targetTaskCount,
      durationMinutes: args.durationMinutes,
      subjectKey: args.context.subjectKey,
    });

    totalInput += retry.usage.inputTokens;
    totalOutput += retry.usage.outputTokens;
    totalCost += retry.usage.costUsd;
  }

  if (!validation.ok) {
    throw new AiError(
      "invalid_output",
      `exam failed validation: ${validation.issues
        .filter((i) => i.severity === "error")
        .map((i) => i.code)
        .join(", ")}`,
    );
  }

  // Pedagogical review. A failure here must not lose a valid exam, so it is
  // best-effort.
  let review: ExamReview | null = null;
  try {
    const reviewPrompt = examReviewPrompt({
      context: args.context,
      exam: {
        title: exam.title,
        tasks: exam.tasks.map((t) => ({
          label: t.label,
          prompt: t.prompt,
          operator: t.operator,
          afb: t.afb,
          points: t.points,
          expected_solution: t.expected_solution,
        })),
      },
      materialSummary: args.materialSummary,
    });

    const reviewResult = await generateStructured({
      task: "exam_validation",
      schemaName: "exam_review",
      schema: examReviewSchema,
      system: reviewPrompt.system,
      input: reviewPrompt.input,
    });

    review = reviewResult.data;
    totalInput += reviewResult.usage.inputTokens;
    totalOutput += reviewResult.usage.outputTokens;
    totalCost += reviewResult.usage.costUsd;
  } catch (error) {
    console.warn(
      "[studilly:ai] exam review skipped:",
      error instanceof Error ? error.message : "unknown",
    );
  }

  if (review?.verdict === "reject") {
    throw new AiError("invalid_output", "exam rejected by review");
  }

  return {
    exam,
    validation,
    review,
    usage: {
      inputTokens: totalInput,
      outputTokens: totalOutput,
      costUsd: totalCost,
    },
    model: attempt.usage.model,
    promptVersion: PROMPT_VERSION,
  };
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

export async function gradeAttempt(args: {
  context: StudentContext;
  tasks: Parameters<typeof gradingPrompt>[0]["tasks"];
  answers: readonly { label: string; answer: string }[];
}): Promise<AiResult<GradingResult>> {
  const { system, input } = gradingPrompt(args);

  // Budget scales with the exam. A fixed cap failed on longer papers because
  // reasoning tokens share this allowance with the JSON output.
  const criterionCount = args.tasks.reduce(
    (sum, task) => sum + task.erwartungshorizont.length,
    0,
  );

  const result = await generateStructured({
    task: "grading",
    schemaName: "grading",
    schema: gradingSchema,
    system,
    input,
    maxOutputTokens: gradingBudgetFor({
      taskCount: args.tasks.length,
      criterionCount,
    }),
  });

  // The model returns one evaluation per task. A missing task would silently
  // drop marks, so the caller needs to know rather than discover it later.
  // Match on normalised labels so a cosmetic difference ("Aufgabe 1" vs "1")
  // cannot reject an otherwise correct marking run.
  const returned = new Set(
    result.data.evaluations.map((e) => normaliseTaskLabel(e.task_label)),
  );
  const missing = args.tasks.filter(
    (t) => !returned.has(normaliseTaskLabel(t.label)),
  );

  if (missing.length > 0) {
    throw new AiError(
      "invalid_output",
      `grading omitted tasks: ${missing.map((t) => t.label).join(", ")}`,
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Practice
// ---------------------------------------------------------------------------

export async function generatePractice(args: {
  context: StudentContext;
  focus: {
    topicLabel: string;
    dimension: string;
    operator: string | null;
    evidence: readonly string[];
  };
  questionCount: number;
}): Promise<AiResult<PracticeGeneration>> {
  const { system, input } = practiceGenerationPrompt(args);

  const result = await generateStructured({
    task: "practice_generation",
    schemaName: "practice_set",
    schema: practiceGenerationSchema,
    system,
    input,
  });

  if (result.data.questions.length === 0) {
    throw new AiError("invalid_output", "practice set contained no questions");
  }

  return result;
}

export async function evaluatePracticeAnswer(args: {
  context: StudentContext;
  question: Parameters<typeof practiceEvaluationPrompt>[0]["question"];
  answer: string;
}): Promise<AiResult<PracticeEvaluation>> {
  const { system, input } = practiceEvaluationPrompt(args);

  const result = await generateStructured({
    task: "grading",
    schemaName: "practice_evaluation",
    schema: practiceEvaluationSchema,
    system,
    input,
  });

  // Never let a model award more than the question is worth.
  const capped = Math.min(
    Math.max(0, result.data.points_awarded),
    args.question.points,
  );

  return {
    ...result,
    data: { ...result.data, points_awarded: capped },
  };
}

// ---------------------------------------------------------------------------
// Flashcards
// ---------------------------------------------------------------------------

export async function generateFlashcards(args: {
  context: StudentContext;
  source: "material" | "mistakes";
  cardCount: number;
  content: string;
}): Promise<AiResult<FlashcardGeneration>> {
  const { system, input } = flashcardPrompt({
    ...args,
    content: args.content.slice(0, 30_000),
  });

  return generateStructured({
    task: "flashcard_generation",
    schemaName: "flashcards",
    schema: flashcardGenerationSchema,
    system,
    input,
  });
}

// ---------------------------------------------------------------------------
// Learning plans
// ---------------------------------------------------------------------------

export async function generateLearningPlan(args: {
  context: StudentContext;
  daysUntilExam: number;
  weeklyMinutes: number;
  topics: readonly string[];
  weaknesses: readonly { topic: string; dimension: string; severity: number }[];
}): Promise<AiResult<LearningPlanGeneration>> {
  const { system, input } = learningPlanPrompt(args);

  const result = await generateStructured({
    task: "learning_plan",
    schemaName: "learning_plan",
    schema: learningPlanSchema,
    system,
    input,
  });

  // Drop anything scheduled past the exam rather than trusting the model to
  // have respected the bound.
  const items = result.data.items.filter(
    (item) => item.day_offset >= 0 && item.day_offset <= args.daysUntilExam,
  );

  if (items.length === 0) {
    throw new AiError("invalid_output", "learning plan had no usable items");
  }

  return { ...result, data: { items } };
}

// ---------------------------------------------------------------------------
// Explanations
// ---------------------------------------------------------------------------

export async function explain(args: {
  context: StudentContext;
  question: string;
  reference: string | null;
}): Promise<AiResult<Explanation>> {
  const { system, input } = explanationPrompt(args);

  return generateStructured({
    task: "explanation",
    schemaName: "explanation",
    schema: explanationSchema,
    system,
    input,
  });
}
