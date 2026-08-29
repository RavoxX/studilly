import { createAdminClient } from "@/lib/supabase/admin";
import { withUser } from "@/lib/api/route";

/**
 * Data export, for GDPR Art. 20 (portability) and Art. 15 (access).
 *
 * Returns everything Studilly holds about the caller as one JSON file: the
 * profile, schooling context, materials and their extracted text, exams,
 * answers, marking, the weakness model, flashcards, plans and group
 * memberships.
 *
 * Every query is filtered by the authenticated user id. The service-role
 * client is used because some of these tables are not client-readable in
 * full, which makes the explicit filter the only thing preventing an export
 * of somebody else's data.
 *
 * Embeddings are deliberately excluded: they are a derived internal
 * representation, meaningless outside the system, and would multiply the file
 * size for no benefit to the student.
 */
export const GET = withUser(async ({ user }) => {
  const admin = createAdminClient();
  const scoped = <T extends string>(table: T) =>
    admin.from(table as never).select("*").eq("user_id", user.id);

  const [
    profile,
    education,
    subjects,
    materials,
    chunks,
    topics,
    exams,
    tasks,
    attempts,
    answers,
    evaluations,
    weaknesses,
    evidence,
    practiceSets,
    practiceQuestions,
    practiceAttempts,
    flashcards,
    reviews,
    plans,
    planItems,
    memberships,
    shares,
    subscription,
    usage,
    notifications,
    notificationPrefs,
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    admin.from("education_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    scoped("user_subjects"),
    scoped("learning_materials"),
    admin
      .from("material_chunks")
      .select("id, material_id, chunk_index, content, heading, token_estimate")
      .eq("user_id", user.id),
    scoped("material_topics"),
    scoped("exams"),
    scoped("exam_tasks"),
    scoped("exam_attempts"),
    scoped("exam_answers"),
    scoped("answer_evaluations"),
    scoped("weaknesses"),
    scoped("weakness_evidence"),
    scoped("practice_sets"),
    scoped("practice_questions"),
    scoped("practice_attempts"),
    scoped("flashcards"),
    scoped("flashcard_reviews"),
    scoped("learning_plans"),
    scoped("learning_plan_items"),
    scoped("study_group_members"),
    admin.from("study_group_shares").select("*").eq("shared_by", user.id),
    admin.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
    scoped("usage_records"),
    scoped("notifications"),
    admin
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    format_version: 1,
    note:
      "Vollständiger Datenexport aus Studilly. Vektor-Embeddings sind nicht enthalten, " +
      "da sie eine interne Repräsentation ohne eigenständigen Informationswert sind.",
    account: {
      id: user.id,
      email: user.email ?? null,
      created_at: user.created_at,
    },
    profile: profile.data,
    education_profile: education.data,
    subjects: subjects.data,
    learning_materials: materials.data,
    material_text: chunks.data,
    material_topics: topics.data,
    exams: exams.data,
    exam_tasks: tasks.data,
    exam_attempts: attempts.data,
    exam_answers: answers.data,
    answer_evaluations: evaluations.data,
    weaknesses: weaknesses.data,
    weakness_evidence: evidence.data,
    practice_sets: practiceSets.data,
    practice_questions: practiceQuestions.data,
    practice_attempts: practiceAttempts.data,
    flashcards: flashcards.data,
    flashcard_reviews: reviews.data,
    learning_plans: plans.data,
    learning_plan_items: planItems.data,
    study_group_memberships: memberships.data,
    study_group_shares: shares.data,
    subscription: subscription.data,
    usage_records: usage.data,
    notifications: notifications.data,
    notification_preferences: notificationPrefs.data,
  };

  const filename = `studilly-export-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}, { name: "account.export" });
