import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { assertRateLimit, parseBody, withUser } from "@/lib/api/route";

const deleteSchema = z.object({
  // Typed confirmation, so a stray request cannot delete an account.
  confirmation: z.literal("DELETE"),
});

/**
 * Permanent account deletion, for GDPR Art. 17.
 *
 * Order matters. Storage objects are removed FIRST, because deleting the
 * auth user cascades the database rows away and with them the storage paths
 * needed to find the files. Reversing this would leave a student's uploaded
 * schoolwork in the bucket with nothing pointing at it: an orphaned copy of
 * exactly the data they asked to be erased.
 *
 * Everything else cascades from `auth.users` through the foreign keys.
 */
export const DELETE = withUser(async ({ user, request }) => {
  assertRateLimit(user.id, "account-delete", 3, 60_000);

  await parseBody(request, deleteSchema);

  const admin = createAdminClient();

  // 1. Storage, while the paths are still known.
  const { data: materials } = await admin
    .from("learning_materials")
    .select("storage_path")
    .eq("user_id", user.id);

  const paths = (materials ?? []).map((material) => material.storage_path);
  if (paths.length > 0) {
    const { error } = await admin.storage.from("materials").remove(paths);
    if (error) {
      // Refuse rather than proceed: a partial deletion that leaves files
      // behind is worse than a failed one the student can retry.
      console.error("[studilly:account] storage deletion failed:", error.message);
      return apiError("server_error", { reason: "storage_cleanup_failed" });
    }
  }

  // Anything the student shared into a group must stop being visible, even
  // though the group itself survives.
  await admin.from("study_group_shares").delete().eq("shared_by", user.id);

  // A group whose owner is leaving for good goes with them. Members keep
  // their own materials; only the group, its messages and its shares go.
  await admin.from("study_groups").delete().eq("owner_id", user.id);

  // 2. Sign out everywhere before the account disappears.
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });

  // 3. The auth user. Every user-owned table cascades from here.
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("[studilly:account] deletion failed:", error.message);
    return apiError("server_error");
  }

  return apiSuccess({ deleted: true });
}, { name: "account.delete" });
