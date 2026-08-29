"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { SkeletonList } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n/client";

export function CreatePlanPanel({
  subjects,
}: {
  subjects: { id: string; name_de: string; name_en: string }[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();

  const [subjectId, setSubjectId] = useState("");
  const [examDate, setExamDate] = useState("");
  const [weeklyMinutes, setWeeklyMinutes] = useState(180);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  async function create() {
    setPending(true);
    setError(null);

    const response = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, examDate, weeklyMinutes }),
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

    setPending(false);
    router.refresh();
  }

  if (pending) {
    return (
      <Card className="p-5">
        <p className="mb-4 text-sm font-medium text-ink">{t.plan.creating}</p>
        <SkeletonList count={3} />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionHeader title={t.plan.create} />

      {error ? (
        <Alert tone="danger" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t.plan.subject} required>
          {(props) => (
            <Select
              {...props}
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
            >
              <option value="">{t.materials.subjectPlaceholder}</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {locale === "de" ? subject.name_de : subject.name_en}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label={t.plan.examDate} required>
          {(props) => (
            <Input
              {...props}
              type="date"
              value={examDate}
              min={tomorrow.toISOString().slice(0, 10)}
              onChange={(event) => setExamDate(event.target.value)}
            />
          )}
        </Field>

        <Field label={t.plan.weeklyTime} hint={t.plan.weeklyTimeHint}>
          {(props) => (
            <Select
              {...props}
              value={String(weeklyMinutes)}
              onChange={(event) => setWeeklyMinutes(Number(event.target.value))}
            >
              {[60, 120, 180, 300, 420, 600].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes < 60
                    ? `${minutes} ${t.common.minutesShort}`
                    : `${Math.round(minutes / 60)} h`}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <Button
        className="mt-5"
        onClick={create}
        disabled={subjectId === "" || examDate === ""}
      >
        <SparkleIcon size={16} aria-hidden="true" />
        {t.plan.create}
      </Button>
    </Card>
  );
}
