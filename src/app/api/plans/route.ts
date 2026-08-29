import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  assertRateLimit,
  parseBody,
  requireEducationContext,
  withUser,
} from "@/lib/api/route";
import { createLearningPlan } from "@/lib/plans/service";

const createSchema = z.object({
  subjectId: z.uuid(),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weeklyMinutes: z.number().int().min(30).max(2520),
});

export const POST = withUser(async ({ user, request }) => {
  assertRateLimit(user.id, "plan-create", 5, 60_000);

  const body = await parseBody(request, createSchema);
  const education = await requireEducationContext(user.id);

  const result = await createLearningPlan({
    userId: user.id,
    subjectId: body.subjectId,
    examDate: body.examDate,
    weeklyMinutes: body.weeklyMinutes,
    education,
  });

  if (!result.ok) {
    switch (result.reason) {
      case "limit_reached":
        return apiError("limit_reached", { metric: "learning_plan" });
      case "invalid_date":
        return apiError("invalid_input", { reason: "exam_date_out_of_range" });
      case "ai_failed":
        return apiError("ai_unavailable");
      default:
        return apiError("server_error");
    }
  }

  return apiSuccess({ planId: result.planId }, 201);
}, { name: "plans.create" });
