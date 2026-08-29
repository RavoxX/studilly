import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "./onboarding-flow";
import { requireUser, getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";

export const metadata: Metadata = { title: "Einrichten" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getProfile();

  // Already set up: nothing to do here.
  if (profile?.onboarding_completed_at) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: subjects }, locale] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, key, name_de, name_en, category, position")
      .order("position"),
    getLocale(),
  ]);

  return (
    <OnboardingFlow
      initialName={profile?.display_name || ""}
      initialLocale={locale}
      subjects={subjects ?? []}
      userEmail={user.email ?? ""}
    />
  );
}
