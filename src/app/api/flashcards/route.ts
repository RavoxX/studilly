import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  assertRateLimit,
  parseBody,
  requireEducationContext,
  withUser,
} from "@/lib/api/route";
import { createFlashcards } from "@/lib/learning/service";

const createSchema = z.object({
  source: z.enum(["material", "mistakes"]),
  materialId: z.uuid().nullable(),
  cardCount: z.number().int().min(3).max(25).default(12),
});

export const POST = withUser(async ({ user, request }) => {
  assertRateLimit(user.id, "flashcards-generate", 8, 60_000);

  const body = await parseBody(request, createSchema);
  const education = await requireEducationContext(user.id);

  const result = await createFlashcards({
    userId: user.id,
    source: body.source,
    materialId: body.materialId,
    cardCount: body.cardCount,
    education,
  });

  if (!result.ok) {
    switch (result.reason) {
      case "limit_reached":
        return apiError("limit_reached", { metric: "flashcard_generation" });
      case "no_source":
        return apiError("invalid_input", { reason: "no_source" });
      case "ai_failed":
        return apiError("ai_unavailable");
      default:
        return apiError("server_error");
    }
  }

  return apiSuccess({ created: result.created }, 201);
}, { name: "flashcards.create" });
