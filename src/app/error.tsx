"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

/**
 * Root error boundary.
 *
 * Shows a plain sentence, never the error message. A student seeing a stack
 * trace learns nothing and the trace may contain internal detail. The real
 * error goes to the console, where a developer can find it.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error("[studilly:boundary]", error.message, error.digest);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        {t.errors.title}
      </h1>
      <p className="mt-3 max-w-[46ch] text-sm text-ink-muted">
        {t.errors.generic}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>{t.common.retry}</Button>
        <Button variant="secondary" asChild>
          <Link href="/dashboard">{t.errors.backToDashboard}</Link>
        </Button>
      </div>
    </div>
  );
}
