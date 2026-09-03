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
/**
 * One material, one or more files.
 *
 * Two photos of the same worksheet belong to the same material: the model has
 * to see them together or the question continuing onto the second page has no
 * context. Every file still counts as one upload against the allowance,
 * because each one costs the same to store and to read.
 */
const fileSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  size: z.number().int().positive().max(MAX_FILE_BYTES),
});

/**
 * Both shapes are accepted.
 *
 * The single-file form is what the iOS app on people's phones is sending
 * right now, and an installed app cannot be updated in step with the server.
 * It is normalised to a one-element list immediately, so only one shape gets
 * past this line.
 */
const createSchema = z
  .union([
    z.object({
      files: z.array(fileSchema).min(1).max(10),
      subjectId: z.uuid().nullable(),
      title: z.string().trim().min(1).max(200).nullable(),
    }),
    fileSchema.extend({
      subjectId: z.uuid().nullable(),
      title: z.string().trim().min(1).max(200).nullable(),
    }),
  ])
  .transform((value) =>
    "files" in value
      ? value
      : {
          files: [
            {
              filename: value.filename,
              mimeType: value.mimeType,
              size: value.size,
            },
          ],
          subjectId: value.subjectId,
          title: value.title,
        },
  );

export const POST = withUser(async ({ user, request }) => {
  assertRateLimit(user.id, "material-upload", 20, 60_000);

  const body = await parseBody(request, createSchema);

  for (const file of body.files) {
    if (!isSupportedMimeType(file.mimeType)) {
      return apiError("invalid_input", { reason: "unsupported_type" });
    }
  }

  const totalBytes = body.files.reduce((sum, file) => sum + file.size, 0);

  try {
    await assertStorageAvailable(user.id, totalBytes);
  } catch (error) {
    if (error instanceof LimitReachedError) {
      return apiError("limit_reached", { metric: "storage_mb" });
    }
    throw error;
  }

  // One upload per file, even though they become one material: the allowance
  // measures work done, and two photos are two files to store and read.
  try {
    await consume(user.id, "material_upload", body.files.length);
  } catch (error) {
    if (error instanceof LimitReachedError) {
      return apiError("limit_reached", { metric: "material_upload" });
    }
    throw error;
  }

  const admin = createAdminClient();
  const materialId = crypto.randomUUID();
  const refund = () => release(user.id, "material_upload", body.files.length);

  const prepared: {
    storagePath: string;
    safeName: string;
    uploadUrl: string;
    token: string;
    mimeType: string;
    size: number;
    position: number;
  }[] = [];

  for (const [position, file] of body.files.entries()) {
    const safeName = sanitiseFilename(file.filename);
    // The leading segment is the owner id, which is what the storage policies
    // authorise on. It is taken from the session, never from the request.
    const storagePath = `${user.id}/${materialId}/${position}-${safeName}`;

    const { data: signed, error: signError } = await admin.storage
      .from("materials")
      .createSignedUploadUrl(storagePath);

    if (signError || !signed) {
      await refund();
      return apiError("server_error");
    }

    prepared.push({
      storagePath,
      safeName,
      uploadUrl: signed.signedUrl,
      token: signed.token,
      mimeType: file.mimeType,
      size: file.size,
      position,
    });
  }

  const first = prepared[0]!;

  const { error: insertError } = await admin.from("learning_materials").insert({
    id: materialId,
    user_id: user.id,
    title: (body.title ?? first.safeName.replace(/\.[^.]+$/, "")).slice(0, 200),
    // The material's own columns describe the set: the first file's name and
    // type, and the total size. The per-file detail lives in material_files.
    original_filename: first.safeName,
    storage_path: first.storagePath,
    mime_type: first.mimeType,
    size_bytes: totalBytes,
    subject_id: body.subjectId,
    status: "uploaded",
  });

  if (insertError) {
    await refund();
    return apiError("server_error");
  }

  const { error: filesError } = await admin.from("material_files").insert(
    prepared.map((file) => ({
      material_id: materialId,
      user_id: user.id,
      storage_path: file.storagePath,
      original_filename: file.safeName,
      mime_type: file.mimeType,
      size_bytes: file.size,
      position: file.position,
    })),
  );

  if (filesError) {
    await admin.from("learning_materials").delete().eq("id", materialId);
    await refund();
    return apiError("server_error");
  }

  return apiSuccess(
    {
      materialId,
      files: prepared.map((file) => ({
        uploadUrl: file.uploadUrl,
        token: file.token,
        path: file.storagePath,
      })),
      // The first file's URL, flat, for the single-file callers that predate
      // multi-file materials. Harmless for the rest.
      uploadUrl: first.uploadUrl,
      token: first.token,
      path: first.storagePath,
    },
    201,
  );
}, { name: "materials.create" });
