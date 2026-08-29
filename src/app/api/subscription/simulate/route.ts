import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { assertRateLimit, parseBody, withUser } from "@/lib/api/route";
import {
  isBillingConfigured,
  simulatePlanChange,
} from "@/lib/subscription/service";

const bodySchema = z.object({
  plan: z.enum(["free", "pro", "ultra"]),
});

/**
 * Local plan simulation.
 *
 * Exists only so the plan-gated features can be exercised when RevenueCat is
 * not configured. It refuses outright as soon as real credentials are present,
 * so it can never become a way to grant a paid plan in a deployed
 * environment. That check lives in the service, and this route surfaces it as
 * a 503 rather than an error.
 */
export const POST = withUser(async ({ user, request }) => {
  assertRateLimit(user.id, "subscription-simulate", 10, 60_000);

  if (isBillingConfigured()) {
    return apiError("not_configured", { reason: "simulation_disabled" });
  }

  const body = await parseBody(request, bodySchema);
  const subscription = await simulatePlanChange(user.id, body.plan);

  return apiSuccess({
    plan: subscription.plan,
    simulated: true,
  });
}, { name: "subscription.simulate" });
