import { AppShell } from "@/components/app/app-shell";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getSubscription } from "@/lib/subscription/service";

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
  const subscription = await getSubscription(user.id);

  return (
    <AppShell displayName={profile.display_name} plan={subscription.plan}>
      {children}
    </AppShell>
  );
}
