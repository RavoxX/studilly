import type { Metadata } from "next";
import { SettingsPanel } from "./settings-panel";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getT } from "@/i18n/server";

export const metadata: Metadata = { title: "Einstellungen" };

export default async function SettingsPage() {
  const { user, profile, education } = await requireOnboardedUser();
  const t = await getT();
  const locale = await getLocale();
  const supabase = await createClient();

  const [{ data: subjects }, { data: userSubjects }, { data: prefs }] =
    await Promise.all([
      supabase
        .from("subjects")
        .select("id, key, name_de, name_en, category, position")
        .order("position"),
      supabase
        .from("user_subjects")
        .select("subject_id, is_priority")
        .eq("user_id", user.id),
      supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">
        {t.settings.title}
      </h1>

      <SettingsPanel
        email={user.email ?? ""}
        profile={{
          displayName: profile.display_name,
          theme: profile.theme as "system" | "light" | "dark",
          allowAiQualityReview: profile.allow_ai_quality_review,
        }}
        education={{
          bundesland: education.bundesland,
          stage: education.stage,
          schoolType: education.school_type,
          grade: education.grade,
          oberstufePhase: education.oberstufe_phase as
            | "einfuehrungsphase"
            | "qualifikationsphase"
            | null,
        }}
        subjects={subjects ?? []}
        selectedSubjects={(userSubjects ?? []).map((row) => ({
          id: row.subject_id,
          priority: row.is_priority,
        }))}
        notifications={{
          exam_reminders: prefs?.exam_reminders ?? true,
          practice_reminders: prefs?.practice_reminders ?? true,
          plan_reminders: prefs?.plan_reminders ?? true,
          group_activity: prefs?.group_activity ?? true,
          usage_alerts: prefs?.usage_alerts ?? true,
          subscription_updates: prefs?.subscription_updates ?? true,
          achievements: prefs?.achievements ?? true,
        }}
        locale={locale}
      />
    </div>
  );
}
