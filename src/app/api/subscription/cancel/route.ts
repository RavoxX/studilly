import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { assertRateLimit, parseBody, withUser } from "@/lib/api/route";
import {
  cancelSubscription,
  resumeSubscription,
} from "@/lib/subscription/service";

const bodySchema = z.object({
  action: z.enum(["cancel", "resume"]),
});

/**
 * Cancels a subscription, or undoes a cancellation.
 *
 * Cancelling never removes access immediately: the plan runs to the end of
 * the period the student already paid for, and only then drops to free. That
 * boundary is enforced in lib/subscription/access, not here.
 *
 * When the purchase is owned by a real store, cancellation has to happen at
 * that store. The response then carries the customer-portal URL instead of
 * reporting a success we did not actually perform.
 */
export const POST = withUser(async ({ user, request }) => {
  assertRateLimit(user.id, "subscription-cancel", 10, 60_000);

  const body = await parseBody(request, bodySchema);

  if (body.action === "resume") {
    const resumed = await resumeSubscription(user.id);
    if (!resumed) return apiError("conflict", { reason: "already_expired" });
    return apiSuccess({ resumed: true });
  }

  const result = await cancelSubscription(user.id);

  if (!result.ok) {
    if (result.reason === "not_subscribed") {
      return apiError("conflict", { reason: "not_subscribed" });
    }
    // The store owns billing. Send the student there rather than pretending.
    return apiSuccess({
      cancelled: false,
      usePortal: true,
      portalUrl: result.portalUrl ?? null,
    });
  }

  return apiSuccess({ cancelled: true, accessUntil: result.accessUntil });
}, { name: "subscription.cancel" });
