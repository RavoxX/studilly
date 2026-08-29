import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarCheckIcon } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/feedback";
import { SkeletonList } from "@/components/ui/skeleton";
import { PlanBoard } from "./plan-board";
import { CreatePlanPanel } from "./create-plan-panel";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/i18n/server";

export const metadata: Metadata = { title: "Lernplan" };

export default async function PlanPage() {
  const t = await getT();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {t.plan.title}
        </h1>
        <p className="mt-1 max-w-[62ch] text-sm text-ink-muted">
          {t.plan.subtitle}
        </p>
      </div>

      <Suspense fallback={<SkeletonList count={4} />}>
        <Plans />
      </Suspense>
    </div>
  );
}

async function Plans() {
  const { user } = await requireOnboardedUser();
  const t = await getT();
  const supabase = await createClient();

  const [{ data: plans }, { data: userSubjects }] = await Promise.all([
    supabase
      .from("learning_plans")
      .select("id, title, exam_date, weekly_minutes, status, subjects(name_de, name_en)")
      .eq("user_id", user.id)
      .in("status", ["active", "generating"])
      .order("exam_date"),
    supabase
      .from("user_subjects")
      .select("subjects(id, name_de, name_en)")
      .eq("user_id", user.id),
  ]);

  const subjects = (userSubjects ?? [])
    .map((row) => row.subjects as unknown as {
      id: string;
      name_de: string;
      name_en: string;
    } | null)
    .filter((s): s is { id: string; name_de: string; name_en: string } => s !== null);

  if ((plans ?? []).length === 0) {
    return (
      <>
        <EmptyState
          icon={<CalendarCheckIcon size={22} aria-hidden="true" />}
          title={t.plan.empty}
          description={t.plan.emptyBody}
        />
        <div className="mt-6">
          <CreatePlanPanel subjects={subjects} />
        </div>
      </>
    );
  }

  // Items for every active plan, from today onwards plus anything overdue.
  const planIds = (plans ?? []).map((plan) => plan.id);
  const { data: items } = await supabase
    .from("learning_plan_items")
    .select(
      "id, plan_id, scheduled_for, title, description, activity, topic_label, estimated_minutes, status",
    )
    .eq("user_id", user.id)
    .in("plan_id", planIds)
    .order("scheduled_for")
    .order("position");

  return (
    <>
      <PlanBoard
        plans={(plans ?? []).map((plan) => {
          const subject = plan.subjects as unknown as {
            name_de: string;
            name_en: string;
          } | null;
          return {
            id: plan.id,
            title: plan.title,
            examDate: plan.exam_date,
            weeklyMinutes: plan.weekly_minutes,
            subjectDe: subject?.name_de ?? plan.title,
            subjectEn: subject?.name_en ?? plan.title,
          };
        })}
        items={(items ?? []).map((item) => ({
          id: item.id,
          planId: item.plan_id,
          scheduledFor: item.scheduled_for,
          title: item.title,
          description: item.description,
          activity: item.activity as
            | "read"
            | "flashcards"
            | "practice"
            | "exam"
            | "review",
          topicLabel: item.topic_label,
          estimatedMinutes: item.estimated_minutes,
          status: item.status as "pending" | "done" | "skipped",
        }))}
      />

      <div className="mt-10">
        <CreatePlanPanel subjects={subjects} />
      </div>
    </>
  );
}
