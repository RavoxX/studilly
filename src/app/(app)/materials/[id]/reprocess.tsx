"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { useT } from "@/i18n/client";

/**
 * Runs the pipeline over this material again.
 *
 * Offered when processing failed, and when it finished but produced nothing
 * to search — a photo uploaded before transcription existed reads as ready
 * while being invisible to every feature that retrieves. Without this the
 * only way out was to delete the upload and add it again, which costs an
 * upload as well as an analysis.
 *
 * It spends an analysis from the monthly allowance, the same as the first
 * run, so it is a button rather than something that happens automatically.
 */
export function Reprocess({
  materialId,
  tone,
}: {
  materialId: string;
  tone: "failed" | "empty";
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setFailed(null);

    const response = await fetch(`/api/materials/${materialId}/process`, {
      method: "POST",
    });

    setBusy(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setFailed(
        body?.error === "limit_reached"
          ? t.materials.reprocessLimit
          : t.materials.processingFailed,
      );
      return;
    }

    router.refresh();
  }

  return (
    <Alert
      tone={tone === "failed" ? "danger" : "warning"}
      className="mt-6"
      title={
        tone === "failed" ? t.materials.status.failed : t.materials.noTextTitle
      }
      action={
        <Button size="sm" variant="secondary" loading={busy} onClick={() => void run()}>
          <ArrowClockwiseIcon size={15} aria-hidden="true" />
          {t.materials.reprocess}
        </Button>
      }
    >
      {failed ?? (tone === "failed" ? t.materials.processingFailed : t.materials.noTextBody)}
    </Alert>
  );
}
