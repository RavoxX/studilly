import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { parseBody, withUserAndParams } from "@/lib/api/route";
import { deleteNotebook, renameNotebook } from "@/lib/notebooks/service";

const renameSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    emoji: z.string().trim().min(1).max(8).optional(),
  })
  .refine((body) => body.title !== undefined || body.emoji !== undefined, {
    message: "nothing to change",
  });

/**
 * Renames a notebook, or changes its symbol.
 *
 * Either can be sent alone: someone swapping the emoji has not retyped the
 * title and should not have to. Doing this also stops the automatic naming
 * from touching the notebook again.
 */
export const PATCH = withUserAndParams<{ id: string }>(
  async ({ user, request, params }) => {
    const body = await parseBody(request, renameSchema);
    const renamed = await renameNotebook({
      userId: user.id,
      notebookId: params.id,
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.emoji !== undefined ? { emoji: body.emoji } : {}),
    });

    if (!renamed) return apiError("not_found");
    return apiSuccess({ renamed: true });
  },
  { name: "notebooks.rename" },
);

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
