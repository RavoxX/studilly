import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PracticeRunner } from "./practice-runner";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Übung" };

export default async function PracticeSetPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const { user } = await requireOnboardedUser();
  const supabase = await createClient();

  const { data: set } = await supabase
    .from("practice_sets")
    .select("id, title, topic_label")
    .eq("id", setId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!set) notFound();

  const { data: questions } = await supabase
    .from("practice_questions")
    .select("id, prompt, operator, afb, points, hint")
    .eq("set_id", set.id)
    .order("position");

  if (!questions || questions.length === 0) notFound();

  return (
    <PracticeRunner
      set={{ id: set.id, title: set.title, topic: set.topic_label }}
      questions={questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        operator: question.operator,
        afb: question.afb,
        points: question.points,
        hint: question.hint,
      }))}
    />
  );
}
