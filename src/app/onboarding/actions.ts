"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import {
  SCHOOL_SYSTEM,
  gradesFor,
  schoolTypesFor,
  stageForGrade,
} from "@/config/education";
import { LOCALES } from "@/i18n/config";

/**
 * Onboarding submission.
 *
 * Validated twice over: Zod checks the shape, then the values are checked
 * against the school system data. A grade of 13 in Sachsen or a Stadtteilschule
 * in Bayern would pass a naive schema but does not exist, and letting either
 * through would produce exams for a school that is not real.
 */
const schema = z.object({
  displayName: z.string().trim().min(1).max(80),
  locale: z.enum(LOCALES),
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
  subjectIds: z.array(z.uuid()).min(1).max(20),
  prioritySubjectIds: z.array(z.uuid()).max(20),
  examDate: z.string().nullable(),
  examSubjectId: z.uuid().nullable(),
});

export type OnboardingInput = z.input<typeof schema>;

export type OnboardingResult = { ok: true } | { ok: false; error: string };

export async function completeOnboarding(
  input: OnboardingInput,
): Promise<OnboardingResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const data = parsed.data;

  // The school type must actually exist in that state at that stage.
  const allowedTypes = schoolTypesFor(data.bundesland, data.stage);
  if (!allowedTypes.includes(data.schoolType as (typeof allowedTypes)[number])) {
    return { ok: false, error: "invalid_school_type" };
  }

  // The grade must exist in that state at that stage.
  if (!gradesFor(data.bundesland, data.stage).includes(data.grade)) {
    return { ok: false, error: "invalid_grade" };
  }

  // Keep stage and grade consistent with each other.
  const derivedStage = stageForGrade(data.bundesland, data.grade);
  if (derivedStage !== data.stage) {
    return { ok: false, error: "stage_grade_mismatch" };
  }

  const supabase = await createClient();

  // RLS scopes all of these to the caller's own rows.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: data.displayName,
      ui_locale: data.locale,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) return { ok: false, error: "save_failed" };

  const { error: educationError } = await supabase
    .from("education_profiles")
    .upsert(
      {
        user_id: user.id,
        bundesland: data.bundesland,
        school_type: data.schoolType as never,
        stage: data.stage,
        grade: data.grade,
        oberstufe_phase: data.stage === "sek_2" ? data.oberstufePhase : null,
      },
      { onConflict: "user_id" },
    );

  if (educationError) return { ok: false, error: "save_failed" };

  // Replace the whole selection rather than merging, so unticking a subject
  // during onboarding actually removes it.
  await supabase.from("user_subjects").delete().eq("user_id", user.id);

  const priority = new Set(data.prioritySubjectIds);
  const { error: subjectsError } = await supabase.from("user_subjects").insert(
    data.subjectIds.map((subjectId) => ({
      user_id: user.id,
      subject_id: subjectId,
      is_priority: priority.has(subjectId),
    })),
  );

  if (subjectsError) return { ok: false, error: "save_failed" };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Called after a successful save, separately so the client can show state
 *  before navigating. */
export async function finishOnboarding(): Promise<never> {
  redirect("/dashboard");
}

/** Server-side lookup used by the onboarding form when the state changes. */
export async function optionsForState(
  bundesland: string,
  stage: "sek_1" | "sek_2",
): Promise<{ schoolTypes: string[]; grades: number[]; stateName: string }> {
  const code = bundesland as keyof typeof SCHOOL_SYSTEM;
  const profile = SCHOOL_SYSTEM[code];
  if (!profile) return { schoolTypes: [], grades: [], stateName: "" };

  return {
    schoolTypes: [...schoolTypesFor(code, stage)],
    grades: [...gradesFor(code, stage)],
    stateName: profile.nameDe,
  };
}
