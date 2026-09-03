"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  FileArrowUpIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert, Progress } from "@/components/ui/feedback";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";
// From ./constants, not ./extract: the latter is server-only and pulls in
// the PDF and DOCX parsers.
import {
  MAX_FILE_BYTES,
  SUPPORTED_MIME_TYPES,
} from "@/lib/materials/constants";

type Subject = { id: string; name_de: string; name_en: string };

type Stage = "idle" | "uploading" | "processing" | "done" | "error";

/** Matches the server's cap. Beyond this it is a document, not a worksheet. */
const MAX_FILES = 10;

/**
 * Upload flow.
 *
 * Files go straight from the browser to Supabase Storage using signed URLs
 * the API issues, so a 25 MB PDF never passes through the application server.
 * Three steps, each with visible state:
 *
 *   1. POST /api/materials       validate, reserve quota, get signed URLs
 *   2. PUT to each signed URL    the actual uploads, with progress
 *   3. POST .../process          extract, chunk, embed, analyse
 *
 * Several files can make up one material — the front and back of a worksheet,
 * three photos of one handout — because the model has to see them together
 * for a question that runs across two pages to make sense. Each file still
 * costs one upload from the monthly allowance.
 *
 * Step 3 is the slow one, so it gets its own labelled state rather than an
 * indeterminate spinner.
 */
export function MaterialUpload({ subjects }: { subjects: Subject[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function reset() {
    setFiles([]);
    setTitle("");
    setSubjectId("");
    setStage("idle");
    setProgress(0);
    setError(null);
  }

  /** Adds to the set rather than replacing it, so files can be picked in
   *  several goes — a camera roll rarely gives you both photos at once. */
  function chooseFiles(picked: FileList | File[] | null) {
    setError(null);
    if (!picked) return;

    const next = [...picked];
    if (next.length === 0) return;

    for (const file of next) {
      if (file.size > MAX_FILE_BYTES) {
        setError(t.materials.fileTooLarge);
        return;
      }
      if (!(SUPPORTED_MIME_TYPES as readonly string[]).includes(file.type)) {
        setError(t.materials.unsupportedType);
        return;
      }
    }

    const combined = [...files, ...next].slice(0, MAX_FILES);
    setFiles(combined);

    if (title.trim() === "" && combined[0]) {
      setTitle(combined[0].name.replace(/\.[^.]+$/, "").slice(0, 200));
    }
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setError(null);
    setStage("uploading");
    setProgress(0);

    try {
      const intentResponse = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: files.map((file) => ({
            filename: file.name,
            mimeType: file.type,
            size: file.size,
          })),
          subjectId: subjectId || null,
          title: title.trim() || null,
        }),
      });

      if (!intentResponse.ok) {
        const body = await intentResponse.json().catch(() => null);
        setError(errorMessage(body?.error, t));
        setStage("error");
        return;
      }

      const intent = (await intentResponse.json()) as {
        materialId: string;
        files: { uploadUrl: string; path: string }[];
      };

      // Sequential, so the progress bar means something: one bar across the
      // whole set, weighted by how many files are done.
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      let uploadedBytes = 0;

      for (const [index, file] of files.entries()) {
        const target = intent.files[index];
        if (!target) throw new Error("missing upload target");
        const before = uploadedBytes;

        // XHR rather than fetch: it reports upload progress, which fetch still
        // cannot do for request bodies.
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", target.uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              setProgress(
                Math.round(((before + event.loaded) / totalBytes) * 100),
              );
            }
          });
          xhr.addEventListener("load", () =>
            xhr.status >= 200 && xhr.status < 300
              ? resolve()
              : reject(new Error(`upload failed: ${xhr.status}`)),
          );
          xhr.addEventListener("error", () => reject(new Error("network")));
          xhr.send(file);
        });

        uploadedBytes += file.size;
      }

      setStage("processing");
      setProgress(100);

      const processResponse = await fetch(
        `/api/materials/${intent.materialId}/process`,
        { method: "POST" },
      );

      if (!processResponse.ok) {
        const body = await processResponse.json().catch(() => null);
        setError(errorMessage(body?.error, t));
        setStage("error");
        // The row exists and is marked failed, so the list still shows it with
        // a retry option.
        router.refresh();
        return;
      }

      setStage("done");
      router.refresh();
      setOpen(false);
      reset();
    } catch {
      setError(t.errors.network);
      setStage("error");
    }
  }

  const busy = stage === "uploading" || stage === "processing";

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <Button>
          <UploadSimpleIcon size={17} aria-hidden="true" />
          {t.materials.upload}
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-surface border border-line bg-surface p-5 shadow-lg"
          onInteractOutside={(event) => busy && event.preventDefault()}
          onEscapeKeyDown={(event) => busy && event.preventDefault()}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold text-ink">
              {t.materials.uploadTitle}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={busy}
                className="-mr-1 -mt-1 inline-flex size-9 items-center justify-center rounded-control text-ink-subtle disabled:opacity-40"
                aria-label={t.common.close}
              >
                <XIcon size={18} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {error ? (
            <Alert tone="danger" className="mb-4">
              {error}
            </Alert>
          ) : null}

          {busy ? (
            <div className="py-4">
              <p className="text-sm font-medium text-ink">
                {stage === "uploading"
                  ? t.materials.uploading
                  : t.materials.status.analyzing}
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                {stage === "processing"
                  ? t.exams.generatingHint
                  : t.materials.uploadingCount(files.length)}
              </p>
              <Progress
                value={stage === "processing" ? 100 : progress}
                className="mt-4"
                label={t.a11y.progress}
              />
            </div>
          ) : (
            <div className="space-y-5">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  chooseFiles(e.dataTransfer.files);
                }}
                className={cn(
                  "rounded-surface border border-dashed p-6 text-center transition-colors",
                  dragging
                    ? "border-brand bg-brand-soft"
                    : "border-line-strong bg-surface-sunken",
                )}
              >
                <FileArrowUpIcon
                  size={26}
                  className="mx-auto mb-3 text-ink-subtle"
                  aria-hidden="true"
                />
                <p className="text-sm text-ink-muted">{t.materials.dropzone}</p>
                <p className="mt-1 text-xs text-ink-subtle">
                  {t.materials.dropzoneHint}
                </p>
                <p className="mt-1 text-xs text-ink-subtle">
                  {t.materials.multiFileHint}
                </p>

                <input
                  ref={inputRef}
                  type="file"
                  className="sr-only"
                  multiple
                  accept={SUPPORTED_MIME_TYPES.join(",")}
                  onChange={(e) => {
                    chooseFiles(e.target.files);
                    // Cleared so picking the same file twice still fires.
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => inputRef.current?.click()}
                >
                  {t.materials.chooseFiles}
                </Button>
              </div>

              {files.length > 0 ? (
                <>
                  {/* Listed and removable: the order is the reading order, and
                      picking the wrong photo should not mean starting over. */}
                  <ul className="divide-y divide-line rounded-surface border border-line">
                    {files.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center gap-3 px-3 py-2 text-sm"
                      >
                        <span className="tabular w-5 shrink-0 text-xs text-ink-subtle">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-ink">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          aria-label={t.materials.removeFile(file.name)}
                          onClick={() => removeFile(index)}
                          className="shrink-0 rounded-control p-1 text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-danger"
                        >
                          <XIcon size={14} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  <Field label={t.materials.titleField} required>
                    {(props) => (
                      <Input
                        {...props}
                        value={title}
                        maxLength={200}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    )}
                  </Field>

                  <Field label={t.materials.subject}>
                    {(props) => (
                      <Select
                        {...props}
                        value={subjectId}
                        onChange={(e) => setSubjectId(e.target.value)}
                      >
                        <option value="">
                          {t.materials.subjectPlaceholder}
                        </option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {locale === "de" ? subject.name_de : subject.name_en}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </>
              ) : null}

              <div className="flex justify-end gap-3 border-t border-line pt-4">
                <Dialog.Close asChild>
                  <Button variant="ghost">{t.common.cancel}</Button>
                </Dialog.Close>
                <Button
                  onClick={handleUpload}
                  disabled={files.length === 0 || title.trim() === ""}
                >
                  {t.materials.upload}
                </Button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function errorMessage(
  code: string | undefined,
  t: ReturnType<typeof useI18n>["t"],
): string {
  switch (code) {
    case "limit_reached":
      return t.subscription.limitReachedBody;
    case "invalid_input":
      return t.materials.unsupportedType;
    case "ai_unavailable":
      return t.errors.aiUnavailable;
    case "rate_limited":
      return t.errors.rateLimited;
    default:
      return t.errors.generic;
  }
}
