"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/feedback";
import { useT } from "@/i18n/client";

/**
 * Error boundary for the authenticated app.
 *
 * Scoped inside the shell, so navigation stays usable and the student can go
 * somewhere else rather than being dropped onto a blank page.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error("[studilly:app-boundary]", error.message, error.digest);
  }, [error]);

  return (
    <ErrorState
      title={t.errors.title}
      description={t.errors.generic}
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>{t.common.retry}</Button>
          <Button variant="secondary" asChild>
            <Link href="/dashboard">{t.errors.backToDashboard}</Link>
          </Button>
        </div>
      }
    />
  );
}
