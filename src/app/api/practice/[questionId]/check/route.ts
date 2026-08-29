import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  assertRateLimit,
  parseBody,
  requireEducationContext,
  withUserAndParams,
} from "@/lib/api/route";
import { checkPracticeAnswer } from "@/lib/practice/service";

const checkSchema = z.object({
  answer: z.string().max(20_000),
});

export const POST = withUserAndParams<{ questionId: string }>(
  async ({ user, request, params }) => {
    assertRateLimit(user.id, "practice-check", 40, 60_000);

    const body = await parseBody(request, checkSchema);
    const education = await requireEducationContext(user.id);

    const result = await checkPracticeAnswer({
      userId: user.id,
      questionId: params.questionId,
      answer: body.answer,
      education,
    });

    if (!result.ok) {
      if (result.reason === "not_found") return apiError("not_found");
      if (result.reason === "ai_failed") return apiError("ai_unavailable");
      return apiError("server_error");
    }

    return apiSuccess(result);
  },
  { name: "practice.check" },
);
