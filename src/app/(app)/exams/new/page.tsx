import type { Metadata } from "next";
import { ExamCreateForm } from "./exam-create-form";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, getUsage } from "@/lib/subscription/service";

export const metadata: Metadata = { title: "Neue Klausur" };

export default async function NewExamPage({
  searchParams,
}: {
  searchParams: Promise<{ material?: string; subject?: string }>;
}) {
  const { user } = await requireOnboardedUser();
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: materials }, { data: subjects }, usage, subscription] =
    await Promise.all([
      supabase
        .from("learning_materials")
        .select(
          "id, title, subject_id, material_topics(title), subjects(name_de, name_en)",
        )
        .eq("user_id", user.id)
        .eq("status", "ready")
        .order("created_at", { ascending: false }),
      supabase
        .from("user_subjects")
        .select("subject_id, subjects(id, name_de, name_en)")
        .eq("user_id", user.id),
      getUsage(user.id),
      getSubscription(user.id),
    ]);

  const subjectOptions = (subjects ?? [])
    .map((row) => row.subjects as unknown as {
      id: string;
      name_de: string;
      name_en: string;
    } | null)
    .filter((s): s is { id: string; name_de: string; name_en: string } => s !== null);

  return (
    <ExamCreateForm
      materials={(materials ?? []).map((material) => ({
        id: material.id,
        title: material.title,
        subjectId: material.subject_id,
        topics: (
          (material.material_topics ?? []) as unknown as { title: string }[]
        ).map((topic) => topic.title),
      }))}
      subjects={subjectOptions}
      preselectedMaterialId={params.material ?? null}
      preselectedSubjectId={params.subject ?? null}
      remaining={{
        used: usage.used.exam_generation,
        limit: subscription.limits.exam_generation,
      }}
    />
  );
}
