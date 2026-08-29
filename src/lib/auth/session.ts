import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type EducationProfile =
  Database["public"]["Tables"]["education_profiles"]["Row"];

/**
 * The current user, verified against Supabase rather than read from a cookie.
 * Wrapped in React `cache` so a page that asks several times in one render
 * only pays for one round trip.
 */
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * The authorisation primitive for every server route and page.
 *
 * Never take a user id from the request body, a query parameter or a header.
 * Take it from here.
 */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Same contract, but for API routes that must answer with 401 rather than
 *  redirect. Returns null instead of throwing so the caller controls shape. */
export async function getApiUser(): Promise<User | null> {
  return getUser();
}

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data;
});

export const getEducationProfile = cache(
  async (): Promise<EducationProfile | null> => {
    const user = await getUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("education_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    return data;
  },
);

/**
 * Guards the authenticated app shell: signed in AND finished onboarding.
 * Sends half-onboarded users back to finish rather than into an app that has
 * no Bundesland to work with.
 */
export async function requireOnboardedUser(): Promise<{
  user: User;
  profile: Profile;
  education: EducationProfile;
}> {
  const user = await requireUser();
  const [profile, education] = await Promise.all([
    getProfile(),
    getEducationProfile(),
  ]);

  if (!profile || !education || !profile.onboarding_completed_at) {
    redirect("/onboarding");
  }

  return { user, profile, education };
}
