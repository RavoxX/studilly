import { describe, expect, it } from "vitest";
import { toStrictJsonSchema } from "./json-schema";
import {
  examGenerationSchema,
  gradingSchema,
  materialAnalysisSchema,
  practiceEvaluationSchema,
} from "./schemas";

/**
 * AI output validation.
 *
 * Two things are being protected here:
 *
 *   1. The JSON Schema actually sent to OpenAI must satisfy strict mode, or
 *      every call fails at request time rather than in a test.
 *
 *   2. Zod must reject malformed model output before it reaches the database.
 *      Strict mode makes bad output unlikely, not impossible.
 */

function walk(node: unknown, visit: (node: Record<string, unknown>) => void) {
  if (Array.isArray(node)) {
    for (const entry of node) walk(entry, visit);
    return;
  }
  if (node === null || typeof node !== "object") return;

  const record = node as Record<string, unknown>;
  visit(record);
  for (const value of Object.values(record)) walk(value, visit);
}

describe("strict JSON Schema generation", () => {
  const schemas = {
    exam: examGenerationSchema,
    grading: gradingSchema,
    material: materialAnalysisSchema,
  };

  it("marks every object as additionalProperties: false", () => {
    for (const [name, schema] of Object.entries(schemas)) {
      walk(toStrictJsonSchema(schema), (node) => {
        if (node["type"] === "object") {
          expect(node["additionalProperties"], name).toBe(false);
        }
      });
    }
  });

  it("lists every property as required", () => {
    // Strict mode has no optional keys. A schema that leaves one out is
    // rejected by the API, so this catches it at build time instead.
    for (const [name, schema] of Object.entries(schemas)) {
      walk(toStrictJsonSchema(schema), (node) => {
        const properties = node["properties"];
        if (properties && typeof properties === "object") {
          const keys = Object.keys(properties as Record<string, unknown>);
          expect(node["required"], name).toEqual(keys);
        }
      });
    }
  });

  it("strips constraint keywords the API may reject", () => {
    for (const schema of Object.values(schemas)) {
      walk(toStrictJsonSchema(schema), (node) => {
        expect(node).not.toHaveProperty("minimum");
        expect(node).not.toHaveProperty("maxLength");
        expect(node).not.toHaveProperty("pattern");
        expect(node).not.toHaveProperty("minItems");
      });
    }
  });

  it("drops $schema, which is not accepted inside the format payload", () => {
    expect(toStrictJsonSchema(examGenerationSchema)).not.toHaveProperty("$schema");
  });
});

describe("exam schema validation", () => {
  const validTask = {
    label: "1",
    prompt: "Erkläre den Zusammenhang.",
    operator: "erklären",
    afb: "II" as const,
    points: 6,
    stimulus: null,
    expected_solution: "Eine Musterlösung.",
    erwartungshorizont: [
      { criterion: "Nennt die Ursache", points: 3, required: true },
      { criterion: "Begründet den Zusammenhang", points: 3, required: true },
    ],
  };

  it("accepts a well-formed exam", () => {
    const result = examGenerationSchema.safeParse({
      title: "Übungsklausur",
      instructions: "Bearbeite alle Aufgaben.",
      tasks: [validTask],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an AFB outside I, II, III", () => {
    const result = examGenerationSchema.safeParse({
      title: "Test",
      instructions: "",
      tasks: [{ ...validTask, afb: "IV" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing marking scheme", () => {
    const { erwartungshorizont, ...withoutCriteria } = validTask;
    void erwartungshorizont;
    const result = examGenerationSchema.safeParse({
      title: "Test",
      instructions: "",
      tasks: [withoutCriteria],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-numeric points value", () => {
    const result = examGenerationSchema.safeParse({
      title: "Test",
      instructions: "",
      tasks: [{ ...validTask, points: "sechs" }],
    });
    expect(result.success).toBe(false);
  });

  it("keeps stimulus nullable rather than optional", () => {
    // Strict mode requires the key to be present; null is how absence is
    // expressed.
    const withNull = examGenerationSchema.safeParse({
      title: "Test",
      instructions: "",
      tasks: [{ ...validTask, stimulus: null }],
    });
    expect(withNull.success).toBe(true);

    const { stimulus, ...withoutStimulus } = validTask;
    void stimulus;
    const missing = examGenerationSchema.safeParse({
      title: "Test",
      instructions: "",
      tasks: [withoutStimulus],
    });
    expect(missing.success).toBe(false);
  });
});

describe("grading schema validation", () => {
  it("rejects a verdict outside the allowed set", () => {
    const result = gradingSchema.safeParse({
      evaluations: [
        {
          task_label: "1",
          criteria_results: [],
          verdict: "brilliant",
          missing_elements: [],
          misconceptions: [],
          strengths: [],
          explanation: "",
          improvement: "",
          skill_signals: [],
        },
      ],
      overall_strengths: [],
      overall_weaknesses: [],
      summary: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a skill signal with an unknown dimension", () => {
    // The dimension drives which practice gets generated, so an unknown one
    // must not reach the weakness model.
    const result = gradingSchema.safeParse({
      evaluations: [
        {
          task_label: "1",
          criteria_results: [],
          verdict: "correct",
          missing_elements: [],
          misconceptions: [],
          strengths: [],
          explanation: "",
          improvement: "",
          skill_signals: [
            {
              dimension: "vibes",
              topic_label: "Topic",
              severity: 0.5,
              evidence: "",
            },
          ],
        },
      ],
      overall_strengths: [],
      overall_weaknesses: [],
      summary: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a complete evaluation", () => {
    const result = gradingSchema.safeParse({
      evaluations: [
        {
          task_label: "1",
          criteria_results: [
            {
              criterion: "Nennt die Ursache",
              met: true,
              points_awarded: 3,
              note: null,
            },
          ],
          verdict: "partially_correct",
          missing_elements: ["Beleg am Material"],
          misconceptions: [],
          strengths: ["Richtiger Ansatz"],
          explanation: "Dein Ansatz stimmt.",
          improvement: "Belege die Aussage am Material.",
          skill_signals: [
            {
              dimension: "completeness",
              topic_label: "Marktmechanismus",
              severity: 0.4,
              evidence: "Kein Beleg genannt",
            },
          ],
        },
      ],
      overall_strengths: ["Sichere Fachsprache"],
      overall_weaknesses: ["Belege fehlen"],
      summary: "Insgesamt solide.",
    });
    expect(result.success).toBe(true);
  });
});

describe("practice evaluation schema", () => {
  it("requires a numeric award", () => {
    const result = practiceEvaluationSchema.safeParse({
      points_awarded: "drei",
      verdict: "correct",
      explanation: "",
      improvement: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("material analysis schema", () => {
  it("accepts a null curriculum match", () => {
    // Forcing a poor curriculum match is worse than admitting there is none.
    const result = materialAnalysisSchema.safeParse({
      detected_language: "de",
      summary: "Ein Text über Photosynthese.",
      suggested_title: "Photosynthese",
      subject_key: "biologie",
      topics: [
        {
          title: "Photosynthese",
          summary: "Lichtreaktion und Calvin-Zyklus.",
          curriculum_topic_id: null,
          match_confidence: 0,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing subject key rather than defaulting it", () => {
    const result = materialAnalysisSchema.safeParse({
      detected_language: "de",
      summary: "Text",
      suggested_title: "Titel",
      topics: [],
    });
    expect(result.success).toBe(false);
  });
});
