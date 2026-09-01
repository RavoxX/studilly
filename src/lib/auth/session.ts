import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAnonClient } from "@/lib/supabase/anon";
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

/**
 * Same contract, but for API routes that must answer with 401 rather than
 * redirect. Returns null instead of throwing so the caller controls shape.
 *
 * Also accepts a bearer token, which is how the iOS app arrives: a native
 * client has no cookie jar, and asking it to mimic one would tie the app to
 * the exact cookie format @supabase/ssr happens to write. The token is
 * verified by Supabase, the same check the cookie path performs, so this adds
 * a second way in rather than a weaker one. Nothing downstream changes: routes
 * still take the user id from here and never from the request.
 */
export async function getApiUser(): Promise<User | null> {
  const authorization = (await headers()).get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return getBearerUser(authorization.slice(7));
  }
  return getUser();
}

/**
 * Verifies an access token with Supabase.
 *
 * Uses the anon-key client with the token attached rather than the
 * service-role client: `getUser` on a service-role client would happily
 * validate anything, and this must fail closed on an expired or revoked
 * token exactly as the browser path does.
 */
const getBearerUser = cache(async (token: string): Promise<User | null> => {
  const supabase = createAnonClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data.user;
});

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
