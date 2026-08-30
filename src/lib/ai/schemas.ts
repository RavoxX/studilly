import { z } from "zod";

/**
 * Structured output contracts.
 *
 * Two rules apply throughout:
 *
 *   1. No `.optional()`. OpenAI strict mode requires every property to be
 *      present, so anything that may be absent is `.nullable()`. See
 *      `json-schema.ts`.
 *
 *   2. Constraints (ranges, lengths) live here for validation but are stripped
 *      from the JSON Schema sent to the model. They are restated in prose in
 *      the prompts, which is where they actually influence generation. Zod is
 *      the enforcement point: a violation fails the parse and triggers a retry.
 */

/**
 * Normalises a task label for matching.
 *
 * The model has been seen returning "Aufgabe 1" where the exam calls the task
 * "1", which made every lookup miss and rejected the whole marking run as
 * incomplete. The prompt now states the label explicitly, but relying on that
 * alone would make correct marking hostage to prompt formatting, so matching
 * is tolerant too: prefixes, case, whitespace and trailing punctuation are
 * ignored.
 */
export function normaliseTaskLabel(label: string): string {
  return (
    label
      // Trim BEFORE stripping the prefix: the pattern is anchored at the start
      // of the string, so leading whitespace would stop it matching.
      .trim()
      .toLowerCase()
      .replace(/^(aufgabe|task|exercise|nr\.?|no\.?)\s*/u, "")
      .replace(/[\s.):]+$/u, "")
      .trim()
  );
}

const AFB = z.enum(["I", "II", "III"]);

// ---------------------------------------------------------------------------
// Material analysis
// ---------------------------------------------------------------------------

export const materialAnalysisSchema = z.object({
  /** Language of the DOCUMENT, which is independent of the UI language. */
  detected_language: z
    .string()
    .describe("ISO 639-1 code of the document language, e.g. de or en"),
  summary: z
    .string()
    .describe("Two to four sentences describing what this document covers"),
  suggested_title: z
    .string()
    .describe("A short descriptive title, at most 80 characters"),
  subject_key: z
    .string()
    .nullable()
    .describe("Best-matching subject key from the provided list, or null"),
  topics: z
    .array(
      z.object({
        title: z.string().describe("Topic name as a student would recognise it"),
        summary: z.string().describe("One sentence on what this topic covers"),
        curriculum_topic_id: z
          .string()
          .nullable()
          .describe(
            "Id of the matching curriculum topic from the provided list, or null when none fits",
          ),
        match_confidence: z
          .number()
          .describe("0 to 1. How well the curriculum topic matches."),
      }),
    )
    .describe("Between 1 and 12 distinct topics"),
});

export type MaterialAnalysis = z.infer<typeof materialAnalysisSchema>;

// ---------------------------------------------------------------------------
// Exam generation
// ---------------------------------------------------------------------------

const erwartungshorizontCriterion = z.object({
  criterion: z
    .string()
    .describe("One concrete thing the answer must contain to earn these marks"),
  points: z.number().describe("Bewertungseinheiten for this criterion"),
  required: z
    .boolean()
    .describe("True when the answer cannot be considered correct without it"),
});

const examTaskSchema = z.object({
  label: z
    .string()
    .describe("Task label as printed on a German exam, e.g. 1, 1a, 2b"),
  prompt: z
    .string()
    .describe("The task text, beginning with its operator"),
  operator: z
    .string()
    .describe("The operator used, exactly as given in the allowed list"),
  afb: AFB,
  points: z.number().describe("Marks for this task"),
  stimulus: z
    .string()
    .nullable()
    .describe(
      "Source text, data or context the task refers to, or null when none is needed",
    ),
  expected_solution: z
    .string()
    .describe("A model answer that would earn full marks"),
  erwartungshorizont: z
    .array(erwartungshorizontCriterion)
    .describe("Marking criteria whose points sum exactly to this task's points"),
});

export const examGenerationSchema = z.object({
  title: z.string().describe("Exam title, at most 120 characters"),
  instructions: z
    .string()
    .describe(
      "Instructions to the student, in the same language as the tasks. Mention time and total marks.",
    ),
  tasks: z.array(examTaskSchema).describe("The tasks, in the order presented"),
});

export type ExamGeneration = z.infer<typeof examGenerationSchema>;
export type GeneratedTask = z.infer<typeof examTaskSchema>;

// ---------------------------------------------------------------------------
// Exam review
//
// A second, cheap model pass that looks for pedagogical problems the
// deterministic checks in validation.ts cannot see: a task that cannot be
// answered from the material, an operator that does not match what the task
// actually asks for, a solution that contradicts the task.
// ---------------------------------------------------------------------------

export const examReviewSchema = z.object({
  verdict: z
    .enum(["pass", "revise", "reject"])
    .describe(
      "pass when the exam is usable, revise for fixable issues, reject when it is fundamentally unusable",
    ),
  issues: z
    .array(
      z.object({
        task_label: z
          .string()
          .nullable()
          .describe("Which task the issue concerns, or null when exam-wide"),
        severity: z.enum(["info", "warning", "error"]),
        kind: z.enum([
          "operator_mismatch",
          "unanswerable_from_material",
          "solution_contradicts_task",
          "erwartungshorizont_incomplete",
          "duplicate_task",
          "ambiguous_wording",
          "off_curriculum",
          "difficulty_mismatch",
        ]),
        detail: z.string().describe("One sentence describing the problem"),
      }),
    )
    .describe("Empty when nothing is wrong"),
});

export type ExamReview = z.infer<typeof examReviewSchema>;

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

const answerEvaluationSchema = z.object({
  task_label: z.string().describe("Must match a label from the exam exactly"),
  criteria_results: z
    .array(
      z.object({
        // Deliberately an INDEX, not the criterion text.
        //
        // Asking the model to copy each criterion back verbatim burned a large
        // share of the output budget for data the caller already has and
        // discards: grade.ts matches results to criteria positionally and uses
        // the stored definition. On an exam with 34 criteria that redundancy
        // was enough to hit the token cap and fail the whole marking run.
        criterion_index: z
          .number()
          .describe(
            "0-based position of this criterion in the task's Erwartungshorizont, in the order given",
          ),
        met: z.boolean(),
        points_awarded: z
          .number()
          .describe("Between 0 and the criterion's points. Half marks allowed."),
        note: z
          .string()
          .nullable()
          .describe("Why this criterion was or was not met, or null"),
      }),
    )
    .describe("One entry per Erwartungshorizont criterion, in the same order"),
  verdict: z.enum([
    "incorrect",
    "partially_correct",
    "correct_incomplete",
    "correct",
    "exceptional",
  ]),
  missing_elements: z
    .array(z.string())
    .describe("Concrete things the answer needed but did not have"),
  misconceptions: z
    .array(z.string())
    .describe("Specific wrong beliefs the answer reveals. Empty when none."),
  strengths: z.array(z.string()).describe("What the answer did well"),
  explanation: z
    .string()
    .describe("Two to four sentences addressed to the student, second person"),
  improvement: z
    .string()
    .describe("One concrete, actionable step to earn the missing marks"),
  /** Weakness signals. This is what feeds the persistent student model, so it
   *  is requested per task rather than inferred later from prose. */
  skill_signals: z
    .array(
      z.object({
        dimension: z.enum([
          "concept",
          "procedure",
          "operator",
          "completeness",
          "precision",
          "transfer",
        ]),
        topic_label: z
          .string()
          .describe("The specific topic this signal is about"),
        severity: z.number().describe("0 to 1. How badly this cost the student."),
        evidence: z
          .string()
          .describe("Short quote or description grounding the signal"),
      }),
    )
    .describe("Empty when the answer was fully correct"),
});

export const gradingSchema = z.object({
  evaluations: z.array(answerEvaluationSchema),
  overall_strengths: z
    .array(z.string())
    .describe("Two to four patterns that went well across the whole exam"),
  overall_weaknesses: z
    .array(z.string())
    .describe("Two to four patterns that cost marks across the whole exam"),
  summary: z
    .string()
    .describe(
      "Three to five sentences to the student. Direct, specific, encouraging without flattery. No grade: the backend calculates that.",
    ),
});

export type GradingResult = z.infer<typeof gradingSchema>;
export type AnswerEvaluation = z.infer<typeof answerEvaluationSchema>;

// ---------------------------------------------------------------------------
// Practice
// ---------------------------------------------------------------------------

export const practiceGenerationSchema = z.object({
  title: z.string().describe("Short title for the practice set"),
  questions: z.array(
    z.object({
      prompt: z.string(),
      operator: z.string().nullable(),
      afb: AFB,
      points: z.number(),
      expected_solution: z.string(),
      erwartungshorizont: z.array(erwartungshorizontCriterion),
      hint: z
        .string()
        .nullable()
        .describe("A nudge that does not give the answer away, or null"),
    }),
  ),
});

export type PracticeGeneration = z.infer<typeof practiceGenerationSchema>;

/** Marking a single free-text practice answer. */
export const practiceEvaluationSchema = z.object({
  points_awarded: z.number(),
  verdict: z.enum([
    "incorrect",
    "partially_correct",
    "correct_incomplete",
    "correct",
    "exceptional",
  ]),
  explanation: z.string().describe("Two to three sentences to the student"),
  improvement: z.string().describe("One concrete next step"),
});

export type PracticeEvaluation = z.infer<typeof practiceEvaluationSchema>;

// ---------------------------------------------------------------------------
// Flashcards
// ---------------------------------------------------------------------------

export const flashcardGenerationSchema = z.object({
  cards: z.array(
    z.object({
      front: z
        .string()
        .describe("A question or prompt. One idea only, at most 200 characters."),
      back: z
        .string()
        .describe("The answer. Complete but compact, at most 600 characters."),
      topic_label: z.string(),
      difficulty: z.enum(["einfach", "standard", "anspruchsvoll"]),
    }),
  ),
});

export type FlashcardGeneration = z.infer<typeof flashcardGenerationSchema>;

// ---------------------------------------------------------------------------
// Learning plan
// ---------------------------------------------------------------------------

export const learningPlanSchema = z.object({
  items: z.array(
    z.object({
      day_offset: z
        .number()
        .describe("Days from today. 0 is today. Must not exceed the exam date."),
      title: z.string(),
      description: z.string().describe("One or two sentences on what to do"),
      activity: z.enum(["read", "flashcards", "practice", "exam", "review"]),
      topic_label: z.string().nullable(),
      estimated_minutes: z.number(),
    }),
  ),
});

export type LearningPlanGeneration = z.infer<typeof learningPlanSchema>;

// ---------------------------------------------------------------------------
// Explanation
// ---------------------------------------------------------------------------

export const explanationSchema = z.object({
  explanation: z
    .string()
    .describe("A clear explanation pitched at the student's grade level"),
  key_points: z.array(z.string()).describe("Two to five takeaways"),
});

export type Explanation = z.infer<typeof explanationSchema>;
