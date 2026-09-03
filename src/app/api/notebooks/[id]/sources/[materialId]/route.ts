import { apiSuccess } from "@/lib/api/response";
import { withUserAndParams } from "@/lib/api/route";
import { removeSource } from "@/lib/notebooks/service";

/**
 * Takes a source out of a notebook.
 *
 * The material itself is untouched: it stays in the library and in any other
 * notebook it belongs to. Only the link is removed.
 */
export const DELETE = withUserAndParams<{ id: string; materialId: string }>(
  async ({ user, params }) => {
    await removeSource({
      userId: user.id,
      notebookId: params.id,
      materialId: params.materialId,
    });
    return apiSuccess({ removed: true });
  },
  { name: "notebooks.sources.remove" },
);
