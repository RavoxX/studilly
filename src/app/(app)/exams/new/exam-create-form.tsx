"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckIcon, SparkleIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert, Badge } from "@/components/ui/feedback";
import { SkeletonExamTask } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n/client";
import { isUnlimited } from "@/config/plans";
import { cn } from "@/lib/utils/cn";

type Material = {
  id: string;
  title: string;
  subjectId: string | null;
  topics: string[];
};

type Subject = { id: string; name_de: string; name_en: string };

const GENERATION_STEPS = [
  "retrieving",
  "aligning",
  "writing",
  "solutions",
  "validating",
] as const;

/**
 * Exam creation.
 *
 * Generation takes most of a minute, which is long enough that an
 * indeterminate spinner feels broken. The waiting state instead names the
 * stage and shows a skeleton in the shape of an exam task, so the student can
 * see what is being built.
 *
 * The stage labels advance on a timer rather than from real backend progress.
 * That is a deliberate, honest simplification: the pipeline genuinely runs
 * those stages in that order, and streaming per-stage progress would need a
 * job queue this release does not have. The timing is conservative so the
 * labels do not run ahead of the work.
 */
export function ExamCreateForm({
  materials,
  subjects,
  preselectedMaterialId,
  preselectedSubjectId,
  remaining,
}: {
  materials: Material[];
  subjects: Subject[];
  preselectedMaterialId: string | null;
  preselectedSubjectId: string | null;
  remaining: { used: number; limit: number };
}) {
  const { t, locale } = useI18n();
  const router = useRouter();

  const [subjectId, setSubjectId] = useState(preselectedSubjectId ?? "");
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(
    new Set(preselectedMaterialId ? [preselectedMaterialId] : []),
  );
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [difficulty, setDifficulty] = useState<
    "einfach" | "standard" | "anspruchsvoll"
  >("standard");
  const [duration, setDuration] = useState(90);
  const [taskCount, setTaskCount] = useState(5);
  const [title, setTitle] = useState("");

  const [generating, setGenerating] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const relevantMaterials = useMemo(
    () =>
      subjectId
        ? materials.filter(
            (m) => m.subjectId === subjectId || m.subjectId === null,
          )
        : materials,
    [materials, subjectId],
  );

  const availableTopics = useMemo(() => {
    const topics = new Set<string>();
    for (const material of relevantMaterials) {
      if (!selectedMaterials.has(material.id)) continue;
      for (const topic of material.topics) topics.add(topic);
    }
    return [...topics];
  }, [relevantMaterials, selectedMaterials]);

  const atLimit =
    !isUnlimited(remaining.limit) && remaining.used >= remaining.limit;

  function toggle(set: Set<string>, value: string): Set<string> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    setStepIndex(0);

    // Advance the stage labels on a conservative timer. Cleared on completion.
    const timer = setInterval(() => {
      setStepIndex((index) => Math.min(index + 1, GENERATION_STEPS.length - 1));
    }, 7_000);

    try {
      const response = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          subjectId,
          materialIds: [...selectedMaterials],
          topics: [...selectedTopics],
          difficulty,
          durationMinutes: duration,
          taskCount,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        setError(
          body?.error === "limit_reached"
            ? t.subscription.limitReachedBody
            : body?.error === "ai_invalid_output"
              ? t.errors.aiInvalidOutput
              : body?.error === "ai_unavailable"
                ? t.errors.aiUnavailable
                : body?.error === "rate_limited"
                  ? t.errors.rateLimited
                  : t.exams.generationFailedBody,
        );
        setGenerating(false);
        return;
      }

      const { examId } = (await response.json()) as { examId: string };
      router.push(`/exams/${examId}`);
    } catch {
      setError(t.errors.network);
      setGenerating(false);
    } finally {
      clearInterval(timer);
    }
  }

  if (generating) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {t.exams.generating}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">{t.exams.generatingHint}</p>

        <ol className="mt-6 space-y-2.5" aria-live="polite">
          {GENERATION_STEPS.map((step, index) => (
            <li
              key={step}
              className={cn(
                "flex items-center gap-2.5 text-sm",
                index < stepIndex
                  ? "text-ink-muted"
                  : index === stepIndex
                    ? "font-medium text-ink"
                    : "text-ink-subtle",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-pill border",
                  index < stepIndex
                    ? "border-success bg-success-soft text-success"
                    : index === stepIndex
                      ? "border-brand text-brand-text"
                      : "border-line",
                )}
              >
                {index < stepIndex ? (
                  <CheckIcon size={11} weight="bold" aria-hidden="true" />
                ) : null}
              </span>
              {t.exams.steps[step]}
            </li>
          ))}
        </ol>

        <div className="mt-8 space-y-4" aria-hidden="true">
          <SkeletonExamTask />
          <SkeletonExamTask />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        {t.exams.createTitle}
      </h1>

      {error ? (
        <Alert tone="danger" className="mt-6" title={t.exams.generationFailed}>
          {error}
        </Alert>
      ) : null}

      {atLimit ? (
        <Alert
          tone="warning"
          className="mt-6"
          title={t.subscription.limitReachedTitle}
          action={
            <Button size="sm" asChild>
              <Link href="/subscription">{t.subscription.upgradePrompt}</Link>
            </Button>
          }
        >
          {t.subscription.limitReachedBody}
        </Alert>
      ) : null}

      <div className="mt-6 space-y-6">
        <Card className="p-5">
          <Field label={t.materials.subject} required>
            {(props) => (
              <Select
                {...props}
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setSelectedMaterials(new Set());
                  setSelectedTopics(new Set());
                }}
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
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-medium text-ink">
            {t.exams.selectMaterials}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {t.exams.selectMaterialsHint}
          </p>

          {relevantMaterials.length === 0 ? (
            <p className="mt-4 text-sm text-ink-subtle">
              {t.materials.emptyBody}
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {relevantMaterials.map((material) => {
                const selected = selectedMaterials.has(material.id);
                return (
                  <button
                    key={material.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setSelectedMaterials((s) => toggle(s, material.id))
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-control border px-3 py-2 text-sm transition-colors",
                      selected
                        ? "border-brand bg-brand-soft font-medium text-brand-text"
                        : "border-line-strong bg-surface text-ink-muted hover:text-ink",
                    )}
                  >
                    {selected ? (
                      <CheckIcon size={14} weight="bold" aria-hidden="true" />
                    ) : null}
                    {material.title}
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {availableTopics.length > 0 ? (
          <Card className="p-5">
            <h2 className="text-sm font-medium text-ink">
              {t.exams.selectTopics}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {t.exams.selectTopicsHint}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {availableTopics.map((topic) => {
                const selected = selectedTopics.has(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedTopics((s) => toggle(s, topic))}
                    className={cn(
                      "rounded-pill border px-3 py-1.5 text-sm transition-colors",
                      selected
                        ? "border-brand bg-brand-soft font-medium text-brand-text"
                        : "border-line-strong bg-surface text-ink-muted hover:text-ink",
                    )}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          </Card>
        ) : null}

        <Card className="p-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t.exams.difficulty}>
              {(props) => (
                <Select
                  {...props}
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(
                      e.target.value as "einfach" | "standard" | "anspruchsvoll",
                    )
                  }
                >
                  <option value="einfach">{t.exams.difficultyEasy}</option>
                  <option value="standard">{t.exams.difficultyStandard}</option>
                  <option value="anspruchsvoll">{t.exams.difficultyHard}</option>
                </Select>
              )}
            </Field>

            <Field label={t.exams.duration}>
              {(props) => (
                <Select
                  {...props}
                  value={String(duration)}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  {[45, 60, 90, 120, 180, 240].map((value) => (
                    <option key={value} value={value}>
                      {value} {t.common.minutes}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label={t.exams.taskCount}>
              {(props) => (
                <Select
                  {...props}
                  value={String(taskCount)}
                  onChange={(e) => setTaskCount(Number(e.target.value))}
                >
                  {[3, 4, 5, 6, 8, 10].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label={t.materials.titleField} hint={t.common.optional}>
              {(props) => (
                <Input
                  {...props}
                  value={title}
                  maxLength={200}
                  onChange={(e) => setTitle(e.target.value)}
                />
              )}
            </Field>
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-4">
          {!isUnlimited(remaining.limit) ? (
            <Badge tone="neutral">
              {t.subscription.used(remaining.used, remaining.limit)}
            </Badge>
          ) : (
            <span />
          )}

          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={subjectId === "" || atLimit}
          >
            <SparkleIcon size={17} aria-hidden="true" />
            {t.exams.generate}
          </Button>
        </div>
      </div>
    </div>
  );
}
