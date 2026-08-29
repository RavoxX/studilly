import "server-only";

import {
  MAX_FILE_BYTES,
  isImage,
} from "./constants";

/**
 * Text extraction from uploaded learning material.
 *
 * Students upload whatever they have: a PDF of a worksheet, a Word document, a
 * photo of a page of notes. Each path produces plain text plus a page count.
 *
 * Images and scanned PDFs have no extractable text layer and are handled by
 * the multimodal path in `vision.ts` instead; this module reports that case
 * rather than silently returning an empty string, so the caller can escalate.
 */

export type ExtractionResult = {
  text: string;
  pageCount: number | null;
  /** True when the file has no text layer and needs the vision path. */
  needsVision: boolean;
};

export class ExtractionError extends Error {}

// Shared with the browser through a module that carries no server-only
// import; see ./constants.
export {
  MAX_FILE_BYTES,
  SUPPORTED_MIME_TYPES,
  isImage,
  isSupportedMimeType,
  type SupportedMimeType,
} from "./constants";

/**
 * A PDF with almost no extractable text per page is a scan. Below this
 * threshold we route to vision rather than handing the model an empty string.
 */
const MIN_CHARS_PER_PAGE = 40;

export async function extractText(
  buffer: ArrayBuffer,
  mimeType: string,
): Promise<ExtractionResult> {
  if (buffer.byteLength === 0) {
    throw new ExtractionError("File is empty.");
  }
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new ExtractionError("File exceeds the size limit.");
  }

  if (isImage(mimeType)) {
    return { text: "", pageCount: 1, needsVision: true };
  }

  if (mimeType === "text/plain" || mimeType === "text/markdown") {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    return { text: normaliseWhitespace(text), pageCount: null, needsVision: false };
  }

  if (mimeType === "application/pdf") {
    return extractPdf(buffer);
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocx(buffer);
  }

  throw new ExtractionError(`Unsupported file type: ${mimeType}`);
}

async function extractPdf(buffer: ArrayBuffer): Promise<ExtractionResult> {
  // Imported lazily: unpdf pulls in a large pdf.js build we do not want in
  // every server bundle.
  const { extractText: unpdfExtract, getDocumentProxy } = await import("unpdf");

  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { totalPages, text } = await unpdfExtract(pdf, { mergePages: true });

    const merged = Array.isArray(text) ? text.join("\n\n") : text;
    const cleaned = normaliseWhitespace(merged);
    const pages = totalPages || 1;

    return {
      text: cleaned,
      pageCount: pages,
      needsVision: cleaned.length < pages * MIN_CHARS_PER_PAGE,
    };
  } catch (error) {
    throw new ExtractionError(
      error instanceof Error
        ? `Could not read the PDF: ${error.message}`
        : "Could not read the PDF.",
    );
  }
}

async function extractDocx(buffer: ArrayBuffer): Promise<ExtractionResult> {
  const mammoth = await import("mammoth");

  try {
    const result = await mammoth.extractRawText({
      buffer: Buffer.from(buffer),
    });
    const cleaned = normaliseWhitespace(result.value);
    return {
      text: cleaned,
      pageCount: null,
      needsVision: cleaned.length < MIN_CHARS_PER_PAGE,
    };
  } catch (error) {
    throw new ExtractionError(
      error instanceof Error
        ? `Could not read the document: ${error.message}`
        : "Could not read the document.",
    );
  }
}

/**
 * Tidies extracted text.
 *
 * PDF extraction produces ragged output: hard-wrapped lines mid-sentence,
 * runs of spaces from column layouts, page-break artefacts. Left alone these
 * fragment chunks badly and waste tokens.
 */
export function normaliseWhitespace(input: string): string {
  return (
    input
      // Normalise line endings.
      .replace(/\r\n?/g, "\n")
      // Rejoin words split across a line break by hyphenation.
      .replace(/(\p{Ll})-\n(\p{Ll})/gu, "$1$2")
      // Collapse runs of spaces and tabs.
      .replace(/[ \t]+/g, " ")
      // Trim trailing spaces on each line.
      .replace(/ +\n/g, "\n")
      // Collapse three or more blank lines into a paragraph break.
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/** Filename that is safe to use as a storage object key. */
export function sanitiseFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "datei";
  return (
    base
      .normalize("NFKD")
      // Keep letters, digits, dot, dash, underscore. Everything else becomes a
      // dash, which removes path traversal and control characters.
      .replace(/[^\p{L}\p{N}._-]+/gu, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^[-.]+/, "")
      .slice(0, 120) || "datei"
  );
}
