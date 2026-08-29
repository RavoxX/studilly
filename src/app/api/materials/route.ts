import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/response";
import { assertRateLimit, parseBody, withUser } from "@/lib/api/route";
import {
  MAX_FILE_BYTES,
  isSupportedMimeType,
  sanitiseFilename,
} from "@/lib/materials/extract";
import {
  assertStorageAvailable,
  consume,
  release,
  LimitReachedError,
} from "@/lib/subscription/service";

/**
 * Registers an upload and returns a signed URL to PUT the file to.
 *
 * The file never passes through this route. The browser uploads straight to
 * Supabase Storage with a short-lived signed URL, which keeps a 25 MB PDF off
 * the application server entirely.
 *
 * What is enforced here, before any URL is handed out:
 *   - the MIME type is on the allowlist
 *   - the declared size is within the per-file cap
 *   - the student has storage quota left
 *   - the student has upload quota left this month
 *
 * The storage bucket independently enforces its own size cap and MIME
 * allowlist, so a client that lies about `size` or `mimeType` here still
 * cannot smuggle in an oversized or executable file.
 */
const createSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  size: z.number().int().positive().max(MAX_FILE_BYTES),
  subjectId: z.uuid().nullable(),
  title: z.string().trim().min(1).max(200).nullable(),
});

export const POST = withUser(async ({ user, request }) => {
  assertRateLimit(user.id, "material-upload", 20, 60_000);

  const body = await parseBody(request, createSchema);

  if (!isSupportedMimeType(body.mimeType)) {
    return apiError("invalid_input", { reason: "unsupported_type" });
  }

  try {
    await assertStorageAvailable(user.id, body.size);
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
  const safeName = sanitiseFilename(body.filename);
  const materialId = crypto.randomUUID();
  // The leading segment is the owner id, which is what the storage policies
  // authorise on. It is taken from the session, never from the request.
  const storagePath = `${user.id}/${materialId}/${safeName}`;

  const { data: signed, error: signError } = await admin.storage
    .from("materials")
    .createSignedUploadUrl(storagePath);

  if (signError || !signed) {
    await release(user.id, "material_upload");
    return apiError("server_error");
  }

  const { error: insertError } = await admin.from("learning_materials").insert({
    id: materialId,
    user_id: user.id,
    title: (body.title ?? safeName.replace(/\.[^.]+$/, "")).slice(0, 200),
    original_filename: safeName,
    storage_path: storagePath,
    mime_type: body.mimeType,
    size_bytes: body.size,
    subject_id: body.subjectId,
    status: "uploaded",
  });

  if (insertError) {
    await release(user.id, "material_upload");
    return apiError("server_error");
  }

  return apiSuccess(
    {
      materialId,
      uploadUrl: signed.signedUrl,
      token: signed.token,
      path: storagePath,
    },
    201,
  );
}, { name: "materials.create" });
