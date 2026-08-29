import { z } from "zod";

type JsonSchemaNode = Record<string, unknown>;

/**
 * Converts a Zod schema into the JSON Schema dialect OpenAI Structured
 * Outputs accepts in strict mode.
 *
 * Strict mode has two rules that Zod's default output does not satisfy:
 *   1. Every object must carry `additionalProperties: false`.
 *   2. Every property must appear in `required`. There is no notion of an
 *      optional key; a value that may be absent is modelled as nullable.
 *
 * So the schemas in `schemas.ts` use `.nullable()` rather than `.optional()`,
 * and this function enforces both rules structurally rather than trusting
 * every schema author to remember them.
 */
export function toStrictJsonSchema(schema: z.ZodType): JsonSchemaNode {
  const raw = z.toJSONSchema(schema, {
    target: "draft-2020-12",
    io: "output",
    // Inline everything: OpenAI rejects external $refs, and $defs cycles are
    // not something our schemas need.
    reused: "inline",
  }) as JsonSchemaNode;

  return harden(raw);
}

/**
 * Keywords that constrain values rather than describe shape.
 *
 * Support for these varies across models and dialects, and a rejected payload
 * fails the whole call. They are stripped here and enforced two other ways
 * instead: stated in the prompt, where they actually steer the model, and
 * re-checked by Zod after parsing, which is authoritative.
 */
const CONSTRAINT_KEYWORDS = new Set([
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "pattern",
  "minItems",
  "maxItems",
  "uniqueItems",
  "format",
  "default",
]);

function harden(node: unknown): JsonSchemaNode {
  if (Array.isArray(node)) {
    return node.map(harden) as unknown as JsonSchemaNode;
  }
  if (node === null || typeof node !== "object") {
    return node as JsonSchemaNode;
  }

  const source = node as JsonSchemaNode;
  const out: JsonSchemaNode = {};

  for (const [key, value] of Object.entries(source)) {
    // `$schema` is not accepted inside the format payload.
    if (key === "$schema") continue;
    if (CONSTRAINT_KEYWORDS.has(key)) continue;
    out[key] = harden(value);
  }

  if (out["type"] === "object" || out["properties"] !== undefined) {
    out["additionalProperties"] = false;
    const properties = out["properties"];
    if (properties && typeof properties === "object") {
      out["required"] = Object.keys(properties as Record<string, unknown>);
    }
  }

  return out;
}

/** Builds the `text.format` payload for a Responses API call. */
export function responseFormat(name: string, schema: z.ZodType) {
  return {
    type: "json_schema" as const,
    name,
    strict: true,
    schema: toStrictJsonSchema(schema),
  };
}
