import { z } from "zod";

/**
 * What each Studio output is, as a shape rather than as rendered markup.
 *
 * Storing structure instead of HTML means the same deck can be redrawn when
 * the design changes, exported later, or read by the iOS app, without asking
 * the model again. It also means the renderer, not the model, decides how
 * anything looks: the model is never in a position to emit styling.
 *
 * Every schema is deliberately shallow. A model asked for deeply nested output
 * spends its budget on structure and produces less of the thing that matters.
 */

/** A short attribution back to the source a claim came from. */
export const citationSchema = z.object({
  materialTitle: z.string().max(200),
  quote: z.string().max(400),
});

// --- Presentation ----------------------------------------------------------

export const presentationSchema = z.object({
  title: z.string().max(120),
  subtitle: z.string().max(200),
  slides: z
    .array(
      z.object({
        heading: z.string().max(120),
        bullets: z.array(z.string().max(240)).min(1).max(6),
        /** One sentence a presenter would say but not put on the slide. */
        note: z.string().max(400),
      }),
    )
    .min(4)
    .max(14),
});

// --- Mind map --------------------------------------------------------------

/**
 * Two levels, not a tree of arbitrary depth.
 *
 * A radial map stops being readable past two rings, and a recursive schema
 * makes the model produce depth for its own sake.
 */
export const mindmapSchema = z.object({
  root: z.string().max(80),
  branches: z
    .array(
      z.object({
        label: z.string().max(80),
        children: z.array(z.string().max(80)).min(1).max(6),
      }),
    )
    .min(3)
    .max(8),
});

// --- Flashcards ------------------------------------------------------------

export const flashcardsSchema = z.object({
  title: z.string().max(120),
  cards: z
    .array(
      z.object({
        front: z.string().max(300),
        back: z.string().max(600),
      }),
    )
    .min(6)
    .max(30),
});

// --- Quiz ------------------------------------------------------------------

export const quizSchema = z.object({
  title: z.string().max(120),
  questions: z
    .array(
      z.object({
        prompt: z.string().max(400),
        options: z.array(z.string().max(200)).length(4),
        /** Index into `options`. An index cannot drift from its answer the
         *  way a repeated string can. */
        correctIndex: z.number().int().min(0).max(3),
        explanation: z.string().max(500),
      }),
    )
    .min(4)
    .max(15),
});

// --- Data table ------------------------------------------------------------

export const tableSchema = z.object({
  title: z.string().max(120),
  columns: z.array(z.string().max(60)).min(2).max(6),
  /** Row cells, in column order. Length is checked against `columns` after
   *  parsing, since Zod cannot express "as many as that array". */
  rows: z.array(z.array(z.string().max(300)).min(2).max(6)).min(2).max(30),
  note: z.string().max(400),
});

// --- Infographic -----------------------------------------------------------

/**
 * Facts and steps, not a picture.
 *
 * The model supplies figures and their meaning; the renderer draws them. Left
 * to describe an image it would produce something nobody can draw, and a
 * number without its unit and its source is not a fact.
 */
export const infographicSchema = z.object({
  title: z.string().max(120),
  summary: z.string().max(400),
  stats: z
    .array(
      z.object({
        value: z.string().max(24),
        label: z.string().max(80),
        detail: z.string().max(200),
      }),
    )
    .min(2)
    .max(6),
  steps: z
    .array(
      z.object({
        label: z.string().max(80),
        detail: z.string().max(240),
      }),
    )
    .min(0)
    .max(6),
});

// --- Report ----------------------------------------------------------------

export const reportSchema = z.object({
  title: z.string().max(160),
  summary: z.string().max(1200),
  sections: z
    .array(
      z.object({
        heading: z.string().max(120),
        body: z.string().max(3000),
      }),
    )
    .min(2)
    .max(8),
  takeaways: z.array(z.string().max(240)).min(2).max(6),
});

// --- Chat ------------------------------------------------------------------

export const chatAnswerSchema = z.object({
  answer: z.string().max(4000),
  citations: z.array(citationSchema).max(6),
  /** Offered under the answer, the way a good tutor asks the next question. */
  followUp: z.string().max(200),
});

export const ARTIFACT_KINDS = [
  "presentation",
  "mindmap",
  "flashcards",
  "quiz",
  "table",
  "infographic",
  "report",
] as const;

export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export const ARTIFACT_SCHEMAS = {
  presentation: presentationSchema,
  mindmap: mindmapSchema,
  flashcards: flashcardsSchema,
  quiz: quizSchema,
  table: tableSchema,
  infographic: infographicSchema,
  report: reportSchema,
} as const satisfies Record<ArtifactKind, z.ZodType>;

export type ArtifactContent = {
  presentation: z.infer<typeof presentationSchema>;
  mindmap: z.infer<typeof mindmapSchema>;
  flashcards: z.infer<typeof flashcardsSchema>;
  quiz: z.infer<typeof quizSchema>;
  table: z.infer<typeof tableSchema>;
  infographic: z.infer<typeof infographicSchema>;
  report: z.infer<typeof reportSchema>;
};
