import { apiError, apiSuccess } from "@/lib/api/response";
import { withUserAndParams } from "@/lib/api/route";
import { createClient } from "@/lib/supabase/server";

/**
 * Deletes an exam.
 *
 * The delete runs through the session client, so the row-level policy decides
 * whether it is the caller's to remove; the id in the path is never trusted on
 * its own. The foreign keys cascade, so the tasks, every attempt, the answers
 * and the marking go with it.
 */
export const DELETE = withUserAndParams<{ id: string }>(
  async ({ params }) => {
    const supabase = await createClient();

    const { error, count } = await supabase
      .from("exams")
      .delete({ count: "exact" })
      .eq("id", params.id);

    if (error) return apiError("server_error");
    // Nothing removed means the policy refused it or it never existed. Both
    // answer the same way, so the response cannot be used to find out which.
    if (!count) return apiError("not_found");

    return apiSuccess({ deleted: true });
  },
  { name: "exams.delete" },
);
