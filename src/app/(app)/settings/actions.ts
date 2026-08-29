"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import {
  gradesFor,
  schoolTypesFor,
  stageForGrade,
  type Bundesland,
} from "@/config/education";

/**
 * Settings mutations.
 *
 * Everything a student changed during onboarding stays changeable here, which
 * is the point: a student who moves state, changes school or starts the
 * Oberstufe must not have to make a new account.
 *
 * All writes go through the session-bound client, so Row Level Security
 * scopes them to the caller. None of these actions accept a user id.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
});

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName })
    .eq("id", user.id);

  if (error) return { ok: false, error: "save_failed" };

  revalidatePath("/", "layout");
  return { ok: true };
}

const educationSchema = z.object({
  bundesland: z.enum([
    "BW", "BY", "BE", "BB", "HB", "HH", "HE", "MV",
    "NI", "NW", "RP", "SL", "SN", "ST", "SH", "TH",
  ]),
  stage: z.enum(["sek_1", "sek_2"]),
  schoolType: z.string().min(1),
  grade: z.coerce.number().int().min(5).max(13),
  oberstufePhase: z
    .enum(["einfuehrungsphase", "qualifikationsphase"])
    .nullable(),
});

export async function updateEducation(input: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = educationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const data = parsed.data;

  // Same three consistency checks as onboarding: a school type and grade that
  // do not exist in that state would produce exams for a school that is not
  // real.
  const state = data.bundesland as Bundesland;
  const allowedTypes = schoolTypesFor(state, data.stage);
  if (!allowedTypes.includes(data.schoolType as (typeof allowedTypes)[number])) {
    return { ok: false, error: "invalid_school_type" };
  }
  if (!gradesFor(state, data.stage).includes(data.grade)) {
    return { ok: false, error: "invalid_grade" };
  }
  if (stageForGrade(state, data.grade) !== data.stage) {
    return { ok: false, error: "stage_grade_mismatch" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("education_profiles")
    .update({
      bundesland: state,
      school_type: data.schoolType as never,
      stage: data.stage,
      grade: data.grade,
      oberstufe_phase: data.stage === "sek_2" ? data.oberstufePhase : null,
    })
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "save_failed" };

  revalidatePath("/", "layout");
  return { ok: true };
}

const subjectsSchema = z.object({
  subjectIds: z.array(z.uuid()).min(1).max(20),
  prioritySubjectIds: z.array(z.uuid()).max(20),
});

export async function updateSubjects(input: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = subjectsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createClient();
  const priority = new Set(parsed.data.prioritySubjectIds);

  // Replace rather than merge, so unticking a subject removes it.
  await supabase.from("user_subjects").delete().eq("user_id", user.id);

  const { error } = await supabase.from("user_subjects").insert(
    parsed.data.subjectIds.map((subjectId) => ({
      user_id: user.id,
      subject_id: subjectId,
      is_priority: priority.has(subjectId),
    })),
  );

  if (error) return { ok: false, error: "save_failed" };

  revalidatePath("/", "layout");
  return { ok: true };
}

const notificationSchema = z.object({
  exam_reminders: z.boolean(),
  practice_reminders: z.boolean(),
  plan_reminders: z.boolean(),
  group_activity: z.boolean(),
  usage_alerts: z.boolean(),
  subscription_updates: z.boolean(),
  achievements: z.boolean(),
});

export async function updateNotifications(input: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = notificationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_preferences")
    .update(parsed.data)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "save_failed" };
  return { ok: true };
}

const privacySchema = z.object({
  allowAiQualityReview: z.boolean(),
});

export async function updatePrivacy(input: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = privacySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ allow_ai_quality_review: parsed.data.allowAiQualityReview })
    .eq("id", user.id);

  if (error) return { ok: false, error: "save_failed" };
  return { ok: true };
}

const passwordSchema = z.object({
  newPassword: z.string().min(8).max(200),
});

/**
 * Changes the password.
 *
 * Supabase requires a live session for `updateUser`, and by default requires
 * the session to be recent for a password change. Re-authentication is
 * therefore handled by Supabase rather than reimplemented here.
 */
export async function changePassword(input: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "weak_password" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (error) return { ok: false, error: error.code ?? "save_failed" };
  return { ok: true };
}
