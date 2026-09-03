import { cookies } from "next/headers";
import { AppShell } from "@/components/app/app-shell";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getSubscription } from "@/lib/subscription/service";
import { SIDEBAR_COOKIE, isCollapsed } from "@/lib/sidebar";

/**
 * Guard for every authenticated route.
 *
 * `requireOnboardedUser` redirects a signed-out visitor to login and a
 * half-onboarded one to finish setup, because the rest of the app has nothing
 * useful to show without a Bundesland and a grade.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireOnboardedUser();
  const [subscription, cookieStore] = await Promise.all([
    getSubscription(user.id),
    cookies(),
  ]);

  return (
    <AppShell
      displayName={profile.display_name}
      avatarUrl={googleAvatar(user.user_metadata)}
      plan={subscription.plan}
      collapsed={isCollapsed(cookieStore.get(SIDEBAR_COOKIE)?.value)}
    >
      {children}
    </AppShell>
  );
}

/**
 * The picture from the identity provider, when there is one.
 *
 * Supabase copies the provider's claims into user_metadata, so a Google
 * sign-in already carries the avatar and no extra request is needed. Only
 * https URLs are accepted: the value comes from an external provider, and a
 * data: or javascript: URL in an <img src> is not something to pass through.
 */
function googleAvatar(metadata: Record<string, unknown> | undefined): string | null {
  const raw = metadata?.["avatar_url"] ?? metadata?.["picture"];
  if (typeof raw !== "string") return null;
  return raw.startsWith("https://") ? raw : null;
}
