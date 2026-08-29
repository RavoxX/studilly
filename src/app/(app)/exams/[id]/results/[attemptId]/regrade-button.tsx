"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useT } from "@/i18n/client";

/**
 * Retries marking.
 *
 * Two uses:
 *   - After a failure, as a button the student presses.
 *   - With `autoStart`, when an attempt was left mid-marking (a crash, a
 *     closed tab), so arriving on the page finishes the job rather than
 *     stranding the student on a spinner forever.
 *
 * The submit endpoint is idempotent: an already-marked attempt returns its
 * status instead of marking again, so a stray retry cannot double-charge.
 */
export function RegradeButton({
  attemptId,
  autoStart = false,
}: {
  attemptId: string;
  autoStart?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, setPending] = useState(autoStart);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  async function run() {
    setPending(true);
    setError(null);

    const response = await fetch(`/api/attempts/${attemptId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeSpentSeconds: 0 }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(
        body?.error === "limit_reached"
          ? t.subscription.limitReachedBody
          : body?.error === "ai_unavailable"
            ? t.errors.aiUnavailable
            : t.examRunner.gradingFailedBody,
      );
      setPending(false);
      return;
    }

    router.refresh();
  }

  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      void run();
    }
    // Intentionally runs once: retriggering on every render would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  if (pending) {
    return (
      <div className="space-y-4" aria-live="polite">
        <p className="text-sm text-ink-muted">{t.examRunner.gradingHint}</p>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div>
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      <Button onClick={run}>
        <ArrowClockwiseIcon size={16} aria-hidden="true" />
        {t.examRunner.retryGrading}
      </Button>
    </div>
  );
}
