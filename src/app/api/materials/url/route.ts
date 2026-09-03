import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/response";
import { assertRateLimit, parseBody, withUser } from "@/lib/api/route";
import { importWebPage } from "@/lib/materials/web";
import {
  assertStorageAvailable,
  consume,
  release,
  LimitReachedError,
} from "@/lib/subscription/service";

const importSchema = z.object({
  url: z.string().trim().min(4).max(2_000),
  subjectId: z.uuid().nullable().default(null),
});

/**
 * Imports a web page as material.
 *
 * The page is fetched, reduced to its readable text, and stored as an
 * ordinary text material. Doing it that way rather than inventing a second
 * kind of source means a web page is chunked, embedded, analysed and
 * retrievable exactly like an upload: it shows up in Materials, it can back
 * an exam, and a notebook can cite it.
 *
 * It counts against the upload allowance and storage, because it costs the
 * same to process and to keep as a file of the same size would.
 */
export const POST = withUser(async ({ user, request }) => {
  // Fetching an arbitrary URL on the student's behalf is the one endpoint
  // that makes outbound requests, so it is the tightest limit in the app.
  assertRateLimit(user.id, "material-url", 10, 60_000);

  const body = await parseBody(request, importSchema);

  const page = await importWebPage(body.url);
  if (!page.ok) return apiError("invalid_input", { reason: page.reason });

  const bytes = new TextEncoder().encode(page.text);

  try {
    await assertStorageAvailable(user.id, bytes.byteLength);
  } catch (error) {
    if (error instanceof LimitReachedError) {
      return apiError("limit_reached", { metric: "storage_mb" });
    }
    throw error;
  }

  try {
    await consume(user.id, "material_upload");
  } catch (error) {
    if (error instanceof LimitReachedError) {
      return apiError("limit_reached", { metric: "material_upload" });
    }
    throw error;
  }

  const admin = createAdminClient();
  const materialId = crypto.randomUUID();
  const storagePath = `${user.id}/${materialId}/page.txt`;

  const upload = await admin.storage
    .from("materials")
    .upload(storagePath, bytes, { contentType: "text/plain" });

  if (upload.error) {
    await release(user.id, "material_upload");
    return apiError("server_error");
  }

  const { error: insertError } = await admin.from("learning_materials").insert({
    id: materialId,
    user_id: user.id,
    title: page.title.slice(0, 200),
    // The address it came from, kept as the filename so the origin of the
    // text is visible wherever the material is listed.
    original_filename: page.finalUrl.slice(0, 255),
    storage_path: storagePath,
    mime_type: "text/plain",
    size_bytes: bytes.byteLength,
    subject_id: body.subjectId,
    status: "uploaded",
  });

  if (insertError) {
    await admin.storage.from("materials").remove([storagePath]);
    await release(user.id, "material_upload");
    return apiError("server_error");
  }

  return apiSuccess({ materialId, title: page.title, url: page.finalUrl }, 201);
}, { name: "materials.url" });
