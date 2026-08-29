"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function GeneratePracticeButton({
  weaknessId = null,
  label,
}: {
  weaknessId?: string | null;
  label?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setPending(true);
    setError(null);

    const response = await fetch("/api/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weaknessId, questionCount: 5 }),
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
            : t.errors.generic,
      );
      setPending(false);
      return;
    }

    const { setId } = (await response.json()) as { setId: string };
    router.push(`/practice/${setId}`);
  }

  return (
    <div className="shrink-0">
      <Button size="sm" loading={pending} onClick={generate}>
        <SparkleIcon size={15} aria-hidden="true" />
        {label ?? t.weakness.practiceThis}
      </Button>
      {error ? (
        <p className="mt-1.5 max-w-48 text-xs text-danger">{error}</p>
      ) : null}
    </div>
  );
}
