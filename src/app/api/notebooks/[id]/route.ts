import { apiError, apiSuccess } from "@/lib/api/response";
import { withUserAndParams } from "@/lib/api/route";
import { deleteNotebook } from "@/lib/notebooks/service";

/**
 * Deletes a notebook.
 *
 * Only the notebook goes: its sources are a join, so the materials themselves
 * stay in the student's library and in any other notebook that holds them.
 * The conversation and everything the Studio made cascade away with it.
 */
export const DELETE = withUserAndParams<{ id: string }>(
  async ({ user, params }) => {
    const deleted = await deleteNotebook({
      userId: user.id,
      notebookId: params.id,
    });

    if (!deleted) return apiError("not_found");
    return apiSuccess({ deleted: true });
  },
  { name: "notebooks.delete" },
);
