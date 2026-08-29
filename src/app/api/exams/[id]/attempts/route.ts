import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/response";
import { withUserAndParams } from "@/lib/api/route";

/**
 * Starts an attempt, or resumes the one already running.
 *
 * Returning the existing in-progress attempt rather than creating a second
 * one is what makes "Start exam" safe to press twice, and what lets a student
 * who closed the tab pick up exactly where they were.
 *
 * Attempts are created server-side because `exam_attempts` has no client
 * INSERT policy: the row carries the marks and the grade, so it must not be
 * forgeable.
 */
export const POST = withUserAndParams<{ id: string }>(
  async ({ user, params }) => {
    const admin = createAdminClient();

    const { data: exam } = await admin
      .from("exams")
      .select("id, status")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!exam) return apiError("not_found");
    if (exam.status !== "ready") {
      return apiError("conflict", { reason: "exam_not_ready" });
    }

    const { data: running } = await admin
      .from("exam_attempts")
      .select("id")
      .eq("exam_id", exam.id)
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .maybeSingle();

    if (running) {
      return apiSuccess({ attemptId: running.id, resumed: true });
    }

    const { data: attempt, error } = await admin
      .from("exam_attempts")
      .insert({
        exam_id: exam.id,
        user_id: user.id,
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !attempt) return apiError("server_error");

    // Seed a blank answer row per task. The exam runner then only ever
    // UPDATEs, which keeps autosave a single fast statement and lets the RLS
    // policy stay simple.
    const { data: tasks } = await admin
      .from("exam_tasks")
      .select("id")
      .eq("exam_id", exam.id);

    if (tasks && tasks.length > 0) {
      await admin.from("exam_answers").insert(
        tasks.map((task) => ({
          attempt_id: attempt.id,
          task_id: task.id,
          user_id: user.id,
          answer_text: "",
        })),
      );
    }

    return apiSuccess({ attemptId: attempt.id, resumed: false }, 201);
  },
  { name: "exams.attempts.create" },
);
