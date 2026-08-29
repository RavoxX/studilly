import { apiError, apiSuccess } from "@/lib/api/response";
import { assertRateLimit, withUserAndParams } from "@/lib/api/route";
import { adaptPlan } from "@/lib/plans/service";

/**
 * Redistributes overdue sessions across the days that remain.
 *
 * Pure arithmetic, no model call, so it costs nothing and is not metered.
 */
export const POST = withUserAndParams<{ id: string }>(
  async ({ user, params }) => {
    assertRateLimit(user.id, "plan-adapt", 20, 60_000);

    const result = await adaptPlan({ userId: user.id, planId: params.id });
    if (!result.ok) return apiError("not_found");

    return apiSuccess({ moved: result.moved });
  },
  { name: "plans.adapt" },
);
