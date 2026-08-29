/**
 * Upload constraints shared by the browser and the server.
 *
 * Deliberately NOT `server-only`: the upload dialog needs these to validate a
 * file before starting, and to tell the student why a file was rejected
 * without a round trip.
 *
 * The client-side check is a courtesy. The real enforcement happens twice on
 * the server: in the upload route, and again in the storage bucket's own
 * size limit and MIME allowlist. A client that lies about a file's type still
 * cannot store it.
 */

export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

/** 25 MiB, matching the storage bucket's own file_size_limit. */
export const MAX_FILE_BYTES = 26_214_400;

export function isSupportedMimeType(value: string): value is SupportedMimeType {
  return (SUPPORTED_MIME_TYPES as readonly string[]).includes(value);
}

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}
