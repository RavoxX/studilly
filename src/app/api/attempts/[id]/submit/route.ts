import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  assertRateLimit,
  parseBody,
  withUserAndParams,
} from "@/lib/api/route";
import { gradeExamAttempt } from "@/lib/exams/grade";

const submitSchema = z.object({
  /** Wall-clock seconds the runner measured. Clamped server-side. */
  timeSpentSeconds: z.number().int().min(0).max(60 * 60 * 12),
});

/**
 * Submits an attempt and marks it.
 *
 * Submission flips the status first. That closes the answer-editing window
 * (the RLS policy on `exam_answers` only permits writes while the attempt is
 * `in_progress`), so a student cannot keep editing answers while marking runs.
 *
 * The reported time is cross-checked against the elapsed wall clock and the
 * smaller value wins, so a tampered client clock cannot claim a 20-minute
 * paper took 3 hours.
 */
export const POST = withUserAndParams<{ id: string }>(
  async ({ user, request, params }) => {
    assertRateLimit(user.id, "attempt-submit", 10, 60_000);

    const body = await parseBody(request, submitSchema);
    const admin = createAdminClient();

    const { data: attempt } = await admin
      .from("exam_attempts")
      .select("id, status, started_at")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!attempt) return apiError("not_found");

    // Already marked, or currently marking. Not an error: the client may have
    // retried. Report the current state instead of double-charging.
    if (attempt.status === "graded") {
      return apiSuccess({ attemptId: attempt.id, status: "graded" });
    }
    if (attempt.status === "grading") {
      return apiSuccess({ attemptId: attempt.id, status: "grading" });
    }

    if (attempt.status === "in_progress") {
      const elapsedSeconds = Math.max(
        0,
        Math.round(
          (Date.now() - new Date(attempt.started_at).getTime()) / 1000,
        ),
      );

      await admin
        .from("exam_attempts")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          time_spent_seconds: Math.min(body.timeSpentSeconds, elapsedSeconds),
        })
        .eq("id", attempt.id)
        // Only transition from in_progress, so two concurrent submits cannot
        // both proceed.
        .eq("status", "in_progress");
    }

    const result = await gradeExamAttempt({
      attemptId: attempt.id,
      userId: user.id,
    });

    if (!result.ok) {
      switch (result.reason) {
        case "limit_reached":
          return apiError("limit_reached", { metric: "exam_grading" });
        case "ai_failed":
          return apiError("ai_unavailable");
        case "not_found":
          return apiError("not_found");
        case "wrong_status":
          return apiError("conflict");
        default:
          return apiError("server_error");
      }
    }

    return apiSuccess({ attemptId: result.attemptId, status: "graded" });
  },
  { name: "attempts.submit" },
);
