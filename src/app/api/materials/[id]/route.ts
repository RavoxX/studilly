import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/response";
import { parseBody, withUserAndParams } from "@/lib/api/route";
import type { Database } from "@/types/database";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  subjectId: z.uuid().nullable().optional(),
});

/**
 * Renames a material or changes its subject.
 *
 * Goes through the API rather than a direct client write because
 * `learning_materials` has no client UPDATE policy: `size_bytes` lives on the
 * same row, and a forgeable size would defeat the storage quota. Only the two
 * fields below can be changed, and only on a row the caller owns.
 */
export const PATCH = withUserAndParams<{ id: string }>(
  async ({ user, request, params }) => {
    const body = await parseBody(request, patchSchema);
    const admin = createAdminClient();

    // Typed narrowly on purpose: only these two columns are ever writable
    // from a request, so a widened record cannot smuggle in `size_bytes`.
    const update: Database["public"]["Tables"]["learning_materials"]["Update"] =
      {};
    if (body.title !== undefined) update.title = body.title;
    if (body.subjectId !== undefined) update.subject_id = body.subjectId;

    if (Object.keys(update).length === 0) {
      return apiError("invalid_input", { reason: "nothing_to_update" });
    }

    const { data, error } = await admin
      .from("learning_materials")
      .update(update)
      .eq("id", params.id)
      // Ownership filter. The service-role client bypasses RLS, so this is the
      // only thing standing between a guessed id and someone else's row.
      .eq("user_id", user.id)
      .select("id, title, subject_id")
      .maybeSingle();

    if (error) return apiError("server_error");
    if (!data) return apiError("not_found");

    return apiSuccess(data);
  },
  { name: "materials.patch" },
);

/**
 * Deletes a material, its extracted chunks and the stored file.
 *
 * Chunks and topics cascade from the database row. The storage object does
 * not, so it is removed explicitly: leaving a student's uploaded schoolwork
 * in a bucket after they deleted it would be a real privacy failure, not a
 * tidiness one.
 */
export const DELETE = withUserAndParams<{ id: string }>(
  async ({ user, params }) => {
    const admin = createAdminClient();

    const { data: material } = await admin
      .from("learning_materials")
      .select("id, storage_path")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!material) return apiError("not_found");

    await admin.storage.from("materials").remove([material.storage_path]);

    const { error } = await admin
      .from("learning_materials")
      .delete()
      .eq("id", material.id)
      .eq("user_id", user.id);

    if (error) return apiError("server_error");

    return apiSuccess({ deleted: true });
  },
  { name: "materials.delete" },
);
