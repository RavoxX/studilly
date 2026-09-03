import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { parseBody, withUserAndParams } from "@/lib/api/route";
import { addSources } from "@/lib/notebooks/service";

const addSchema = z.object({
  materialIds: z.array(z.uuid()).min(1).max(50),
});

export const POST = withUserAndParams<{ id: string }>(
  async ({ user, request, params }) => {
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
