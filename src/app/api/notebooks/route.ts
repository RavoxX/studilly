import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { assertRateLimit, parseBody, withUser } from "@/lib/api/route";
import { createClient } from "@/lib/supabase/server";
import { createNotebook } from "@/lib/notebooks/service";

/**
 * A notebook is created empty and named later, so everything here is
 * optional: the placeholder title comes from the caller's interface language,
 * and the real one is chosen from the sources once there are any.
 */
const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  emoji: z.string().trim().min(1).max(8).default("📓"),
  subjectId: z.uuid().nullable().default(null),
});

/** The student's notebooks, newest activity first. */
export const GET = withUser(async () => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notebooks")
    .select("id, title, emoji, subject_id, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) return apiError("server_error");
  return apiSuccess({ notebooks: data ?? [] });
}, { name: "notebooks.list" });

export const POST = withUser(async ({ user, request }) => {
  assertRateLimit(user.id, "notebooks-create", 20, 60_000);

  const body = await parseBody(request, createSchema);
  const result = await createNotebook({
    userId: user.id,
    title: body.title,
    emoji: body.emoji,
    subjectId: body.subjectId,
  });

  if (!result.ok) return apiError("server_error");
  return apiSuccess(result.data, 201);
}, { name: "notebooks.create" });
