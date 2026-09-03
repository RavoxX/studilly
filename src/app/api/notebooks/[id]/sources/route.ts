import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { assertRateLimit, parseBody, withUserAndParams } from "@/lib/api/route";
import { addSources } from "@/lib/notebooks/service";

const addSchema = z.object({
  materialIds: z.array(z.uuid()).min(1).max(50),
});

/**
 * Adds materials to a notebook.
 *
 * Rate-limited because adding the first sources also names the notebook, and
 * that is a model call. The response carries the name back when one was
 * chosen, so the header updates without another request.
 */
export const POST = withUserAndParams<{ id: string }>(
  async ({ user, request, params }) => {
    assertRateLimit(user.id, "notebook-sources", 30, 60_000);

    const body = await parseBody(request, addSchema);
    const result = await addSources({
      userId: user.id,
      notebookId: params.id,
      materialIds: body.materialIds,
    });

    if (!result.ok) return apiError("not_found");
    return apiSuccess(result.data);
  },
  { name: "notebooks.sources.add" },
);
