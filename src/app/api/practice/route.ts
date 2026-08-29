import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  assertRateLimit,
  parseBody,
  requireEducationContext,
  withUser,
} from "@/lib/api/route";
import { createPracticeSet } from "@/lib/practice/service";

const createSchema = z.object({
  weaknessId: z.uuid().nullable(),
  questionCount: z.number().int().min(3).max(10).default(5),
});

export const POST = withUser(async ({ user, request }) => {
  assertRateLimit(user.id, "practice-generate", 8, 60_000);

  const body = await parseBody(request, createSchema);
  const education = await requireEducationContext(user.id);

  const result = await createPracticeSet({
    userId: user.id,
    weaknessId: body.weaknessId,
    questionCount: body.questionCount,
    education,
  });

  if (!result.ok) {
    switch (result.reason) {
      case "limit_reached":
        return apiError("limit_reached", { metric: "practice_generation" });
      case "no_focus":
        // Not an error the student caused: there is simply nothing to
        // practise yet.
        return apiError("invalid_input", { reason: "no_weakness_yet" });
      case "ai_failed":
        return apiError("ai_unavailable");
      default:
        return apiError("server_error");
    }
  }

  return apiSuccess({ setId: result.setId }, 201);
}, { name: "practice.create" });
