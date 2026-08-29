import { apiError, apiSuccess } from "@/lib/api/response";
import {
  assertRateLimit,
  requireEducationContext,
  withUserAndParams,
} from "@/lib/api/route";
import { processMaterial } from "@/lib/materials/service";
import {
  consume,
  release,
  LimitReachedError,
} from "@/lib/subscription/service";

/**
 * Runs the extraction and analysis pipeline for an uploaded material.
 *
 * Called by the client once the file has finished uploading to storage.
 * Safe to call again after a failure, which is how the "process again" button
 * in the UI works.
 */
export const POST = withUserAndParams<{ id: string }>(
  async ({ user, params }) => {
    assertRateLimit(user.id, "material-process", 10, 60_000);

    const education = await requireEducationContext(user.id);

    try {
      await consume(user.id, "material_analysis");
    } catch (error) {
      if (error instanceof LimitReachedError) {
        return apiError("limit_reached", { metric: "material_analysis" });
      }
      throw error;
    }

    const result = await processMaterial({
      materialId: params.id,
      userId: user.id,
      education,
    });

    if (!result.ok) {
      // Analysis that never produced anything usable should not be charged.
      await release(user.id, "material_analysis");

      if (result.reason === "not_found") return apiError("not_found");
      return apiError("server_error", { reason: result.reason });
    }

    return apiSuccess({
      chunkCount: result.chunkCount,
      topicCount: result.topicCount,
    });
  },
  { name: "materials.process" },
);
