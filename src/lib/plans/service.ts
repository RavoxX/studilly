import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AiError } from "@/lib/ai/client";
import { generateLearningPlan } from "@/lib/ai/service";
import { consume, getSubscription, release } from "@/lib/subscription/service";
import { topWeaknesses } from "@/lib/weakness/service";
import { daysUntil } from "@/lib/utils/format";
import type { Bundesland, EducationStage, SchoolType } from "@/config/education";

/**
 * Learning plans.
 *
 * A plan is generated once against an exam date and then ADAPTED rather than
 * regenerated: adapting keeps completed sessions completed, which is what
 * makes the plan feel like the student's own rather than something that
 * resets under them.
 */

export type CreatePlanResult =
  | { ok: true; planId: string }
  | { ok: false; reason: "limit_reached" | "invalid_date" | "ai_failed" | "failed" };

export async function createLearningPlan(args: {
  userId: string;
  subjectId: string;
  examDate: string;
  weeklyMinutes: number;
  education: {
    bundesland: Bundesland;
    schoolType: SchoolType;
    stage: EducationStage;
    grade: number;
  };
}): Promise<CreatePlanResult> {
  const admin = createAdminClient();

  const daysLeft = daysUntil(args.examDate);
  if (daysLeft < 0 || daysLeft > 365) {
    return { ok: false, reason: "invalid_date" };
  }

  const { data: subject } = await admin
    .from("subjects")
    .select("id, key, name_de")
    .eq("id", args.subjectId)
    .maybeSingle();

  if (!subject) return { ok: false, reason: "failed" };

  try {
    await consume(args.userId, "learning_plan");
  } catch {
    return { ok: false, reason: "limit_reached" };
  }

  const refund = () => release(args.userId, "learning_plan");

  try {
    // Topics come from what the student has actually uploaded, so the plan
    // references their own material rather than a generic syllabus.
    const { data: topics } = await admin
      .from("material_topics")
      .select("title, learning_materials!inner(subject_id, user_id)")
      .eq("user_id", args.userId)
      .eq("learning_materials.subject_id", args.subjectId)
      .limit(25);

    const weaknesses = await topWeaknesses({
      userId: args.userId,
      subjectId: args.subjectId,
      limit: 8,
    });

    const topicTitles = [
      ...new Set((topics ?? []).map((topic) => topic.title)),
    ].slice(0, 20);

    // Named planTier to avoid colliding with the learning_plans row below.
    const { plan: planTier } = await getSubscription(args.userId);
    const result = await generateLearningPlan({
      plan: planTier,
      context: {
        bundesland: args.education.bundesland,
        schoolType: args.education.schoolType,
        stage: args.education.stage,
        grade: args.education.grade,
        subjectKey: subject.key,
        subjectName: subject.name_de,
        contentLanguage: "Deutsch",
      },
      daysUntilExam: daysLeft,
      weeklyMinutes: args.weeklyMinutes,
      topics:
        topicTitles.length > 0
          ? topicTitles
          : [subject.name_de],
      weaknesses: weaknesses.map((weakness) => ({
        topic: weakness.topic_label,
        dimension: weakness.dimension,
        severity: Number(weakness.severity),
      })),
    });

    const { data: plan, error: planError } = await admin
      .from("learning_plans")
      .insert({
        user_id: args.userId,
        subject_id: args.subjectId,
        title: `${subject.name_de}`,
        exam_date: args.examDate,
        weekly_minutes: args.weeklyMinutes,
        status: "active",
        model_used: result.usage.model,
      })
      .select("id")
      .single();

    if (planError || !plan) {
      await refund();
      return { ok: false, reason: "failed" };
    }

    const today = new Date();
    const { error: itemsError } = await admin.from("learning_plan_items").insert(
      result.data.items.map((item, index) => ({
        plan_id: plan.id,
        user_id: args.userId,
        scheduled_for: addDays(today, item.day_offset),
        title: item.title.slice(0, 200),
        description: item.description.slice(0, 1000),
        activity: item.activity,
        topic_label: item.topic_label?.slice(0, 200) ?? null,
        estimated_minutes: clampMinutes(item.estimated_minutes),
        position: index,
        status: "pending",
      })),
    );

    if (itemsError) {
      await admin.from("learning_plans").delete().eq("id", plan.id);
      await refund();
      return { ok: false, reason: "failed" };
    }

    return { ok: true, planId: plan.id };
  } catch (error) {
    await refund();
    if (error instanceof AiError) return { ok: false, reason: "ai_failed" };
    console.error(
      "[studilly:plans] generation failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return { ok: false, reason: "failed" };
  }
}

/**
 * Redistributes the remaining work.
 *
 * Called when a student has fallen behind. Everything already done stays
 * done; only pending items in the past are moved forward, spread across the
 * days that are left rather than dumped on tomorrow.
 */
export async function adaptPlan(args: {
  userId: string;
  planId: string;
}): Promise<{ ok: boolean; moved: number }> {
  const admin = createAdminClient();

  const { data: plan } = await admin
    .from("learning_plans")
    .select("id, exam_date, weekly_minutes")
    .eq("id", args.planId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (!plan) return { ok: false, moved: 0 };

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  const { data: overdue } = await admin
    .from("learning_plan_items")
    .select("id, estimated_minutes")
    .eq("plan_id", plan.id)
    .eq("user_id", args.userId)
    .eq("status", "pending")
    .lt("scheduled_for", todayIso)
    .order("position");

  if (!overdue || overdue.length === 0) return { ok: true, moved: 0 };

  const daysLeft = Math.max(1, daysUntil(plan.exam_date, today));
  // Leave the day before the exam for review only.
  const usableDays = Math.max(1, daysLeft - 1);

  // Spread evenly rather than front-loading: a plan that demands six hours
  // tomorrow gets abandoned.
  const perDay = Math.ceil(overdue.length / usableDays);

  let moved = 0;
  for (let i = 0; i < overdue.length; i += 1) {
    const item = overdue[i];
    if (!item) continue;
    const offset = Math.min(usableDays - 1, Math.floor(i / perDay));

    await admin
      .from("learning_plan_items")
      .update({ scheduled_for: addDays(today, offset) })
      .eq("id", item.id)
      .eq("user_id", args.userId);

    moved += 1;
  }

  await admin
    .from("learning_plans")
    .update({ last_adapted_at: new Date().toISOString() })
    .eq("id", plan.id);

  return { ok: true, moved };
}

function addDays(from: Date, days: number): string {
  const date = new Date(from.getTime());
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) return 30;
  return Math.min(480, Math.max(5, Math.round(value)));
}
