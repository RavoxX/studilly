import { apiSuccess } from "@/lib/api/response";
import { assertRateLimit, withUser } from "@/lib/api/route";
import { getUsage, syncFromRevenueCat } from "@/lib/subscription/service";

/**
 * Re-reads entitlements from RevenueCat and writes the resulting plan.
 *
 * Called by the client after a purchase completes. The client tells us that
 * SOMETHING happened; it never tells us what plan to grant. The server asks
 * RevenueCat directly, which is why a modified client cannot upgrade itself.
 */
export const POST = withUser(async ({ user }) => {
  assertRateLimit(user.id, "subscription-sync", 20, 60_000);

  const subscription = await syncFromRevenueCat(user.id);
  const usage = await getUsage(user.id);

  return apiSuccess({
    plan: subscription.plan,
    status: subscription.status,
    isSandbox: subscription.isSandbox,
    simulated: subscription.simulated,
    usage: usage.used,
  });
}, { name: "subscription.sync" });
