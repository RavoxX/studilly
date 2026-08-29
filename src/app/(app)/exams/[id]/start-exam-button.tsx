"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlayIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

/**
 * Starts or resumes an attempt.
 *
 * The API returns the in-progress attempt if one exists rather than creating
 * a second, so pressing this twice is safe.
 */
export function StartExamButton({
  examId,
  hasRunningAttempt,
  hasAnyAttempt,
}: {
  examId: string;
  hasRunningAttempt: boolean;
  hasAnyAttempt: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function start() {
    setPending(true);
    const response = await fetch(`/api/exams/${examId}/attempts`, {
      method: "POST",
    });

    if (!response.ok) {
      setPending(false);
      return;
    }

    const { attemptId } = (await response.json()) as { attemptId: string };
    router.push(`/exams/${examId}/attempt/${attemptId}`);
  }

  return (
    <Button size="lg" loading={pending} onClick={start}>
      <PlayIcon size={17} weight="fill" aria-hidden="true" />
      {hasRunningAttempt
        ? t.exams.resume
        : hasAnyAttempt
          ? t.exams.startAgain
          : t.exams.start}
    </Button>
  );
}
