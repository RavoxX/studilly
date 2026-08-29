import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ExamRunner } from "./exam-runner";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Klausur",
  robots: { index: false, follow: false },
};

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id, attemptId } = await params;
  const { user } = await requireOnboardedUser();
  const supabase = await createClient();

  // RLS scopes every one of these to the caller.
  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("id, exam_id, status, started_at, time_spent_seconds")
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!attempt || attempt.exam_id !== id) notFound();

  // A finished attempt has nowhere to go but its results.
  if (attempt.status === "graded") {
    redirect(`/exams/${id}/results/${attemptId}`);
  }
  if (attempt.status === "submitted" || attempt.status === "grading") {
    redirect(`/exams/${id}/results/${attemptId}`);
  }

  const [{ data: exam }, { data: tasks }, { data: answers }] = await Promise.all([
    supabase
      .from("exams")
      .select("id, title, duration_minutes, total_points, instructions")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("exam_tasks")
      .select("id, label, prompt, stimulus, operator, afb, points")
      .eq("exam_id", id)
      .order("position"),
    supabase
      .from("exam_answers")
      .select("task_id, answer_text, is_flagged")
      .eq("attempt_id", attemptId),
  ]);

  if (!exam || !tasks || tasks.length === 0) notFound();

  const answerByTask = new Map(
    (answers ?? []).map((a) => [
      a.task_id,
      { text: a.answer_text, flagged: a.is_flagged },
    ]),
  );

  return (
    <ExamRunner
      exam={{
        id: exam.id,
        title: exam.title,
        durationMinutes: exam.duration_minutes,
        totalPoints: exam.total_points,
      }}
      attempt={{
        id: attempt.id,
        startedAt: attempt.started_at,
        // Server time, so a tampered client clock cannot extend the exam.
        serverNow: new Date().toISOString(),
      }}
      tasks={tasks.map((task) => ({
        id: task.id,
        label: task.label,
        prompt: task.prompt,
        stimulus: task.stimulus,
        operator: task.operator,
        afb: task.afb,
        points: task.points,
        answer: answerByTask.get(task.id)?.text ?? "",
        flagged: answerByTask.get(task.id)?.flagged ?? false,
      }))}
    />
  );
}
