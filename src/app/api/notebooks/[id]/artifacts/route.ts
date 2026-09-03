import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { assertRateLimit, parseBody, withUserAndParams } from "@/lib/api/route";
import { generateArtifact } from "@/lib/notebooks/service";
import { ARTIFACT_KINDS } from "@/lib/notebooks/schemas";

const generateSchema = z.object({
  kind: z.enum(ARTIFACT_KINDS),
  instruction: z.string().trim().max(500).nullable(),
});

/**
 * Makes one Studio output from the notebook's sources.
 *
 * Generation is synchronous: it takes long enough to need a spinner but not
 * long enough to need a queue, and a student watching one deck appear wants
 * the result, not a job id. The allowance is refunded if the model fails.
 */
export const POST = withUserAndParams<{ id: string }>(
  async ({ user, request, params }) => {
    assertRateLimit(user.id, "notebook-artifact", 12, 60_000);

    const body = await parseBody(request, generateSchema);
    const result = await generateArtifact({
      userId: user.id,
      notebookId: params.id,
      kind: body.kind,
      instruction: body.instruction,
    });

    if (result.ok) return apiSuccess(result.data, 201);

    switch (result.reason) {
      case "not_found":
        return apiError("not_found");
      case "no_sources":
        return apiError("conflict", { reason: "no_sources" });
      case "limit_reached":
        return apiError("limit_reached", { metric: "notebook_artifact" });
      default:
        return apiError("ai_unavailable");
    }
  },
  { name: "notebooks.artifact" },
);
