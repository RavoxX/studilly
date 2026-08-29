import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  assertRateLimit,
  parseBody,
  requireEducationContext,
  withUser,
} from "@/lib/api/route";
import { createExam } from "@/lib/exams/generate";

/**
 * Generates a practice exam.
 *
 * The schooling context is read from the database, never from the request:
 * a client that could send its own Bundesland and grade could ask for an
 * Abitur paper while in year 7, which would waste the student's quota on
 * something useless.
 */
const createSchema = z.object({
  title: z.string().trim().max(200).nullable(),
  subjectId: z.uuid(),
  materialIds: z.array(z.uuid()).max(10),
  topics: z.array(z.string().trim().min(1).max(200)).max(12),
  difficulty: z.enum(["einfach", "standard", "anspruchsvoll"]),
  durationMinutes: z.number().int().min(15).max(300),
  taskCount: z.number().int().min(2).max(15),
});

export const POST = withUser(async ({ user, request }) => {
  // Generation is the most expensive operation in the product. The monthly
  // quota bounds the cost; this bounds the burst.
  assertRateLimit(user.id, "exam-generate", 5, 60_000);

  const body = await parseBody(request, createSchema);
  const education = await requireEducationContext(user.id);

  const result = await createExam({
    userId: user.id,
    title: body.title,
    subjectId: body.subjectId,
    materialIds: body.materialIds,
    topics: body.topics,
    difficulty: body.difficulty,
    durationMinutes: body.durationMinutes,
    taskCount: body.taskCount,
    education,
  });

  if (!result.ok) {
    switch (result.reason) {
      case "limit_reached":
        return apiError("limit_reached", { metric: "exam_generation" });
      case "no_material":
        return apiError("invalid_input", { reason: "no_usable_material" });
      case "ai_failed":
        return apiError("ai_invalid_output");
      default:
        return apiError("server_error");
    }
  }

  return apiSuccess({ examId: result.examId }, 201);
}, { name: "exams.create" });
