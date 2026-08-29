"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  LightbulbIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, Badge, Progress } from "@/components/ui/feedback";
import { SkeletonText } from "@/components/ui/skeleton";
import { GeneratePracticeButton } from "../generate-practice-button";
import { useT } from "@/i18n/client";
import type { Database } from "@/types/database";

type Verdict = Database["public"]["Enums"]["answer_verdict"];

type Question = {
  id: string;
  prompt: string;
  operator: string | null;
  afb: "I" | "II" | "III" | null;
  points: number;
  hint: string | null;
};

type Feedback = {
  pointsAwarded: number;
  pointsPossible: number;
  verdict: Verdict;
  explanation: string;
  improvement: string;
  expectedSolution: string;
};

const VERDICT_TONE: Record<Verdict, "success" | "warning" | "danger" | "brand"> = {
  incorrect: "danger",
  partially_correct: "warning",
  correct_incomplete: "warning",
  correct: "success",
  exceptional: "brand",
};

/**
 * Practice runner.
 *
 * One question at a time, answer, check, see feedback, move on. Feedback
 * appears in place rather than at the end of the set, because the correction
 * is most useful while the student still remembers their reasoning.
 */
export function PracticeRunner({
  set,
  questions,
}: {
  set: { id: string; title: string; topic: string | null };
  questions: Question[];
}) {
  const t = useT();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [showHint, setShowHint] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = questions[index];
  if (!question) return null;

  const currentAnswer = answers[question.id] ?? "";
  const currentFeedback = feedback[question.id];
  const isLast = index === questions.length - 1;
  const answeredCount = Object.keys(feedback).length;

  async function check() {
    if (!question) return;
    setChecking(true);
    setError(null);

    const response = await fetch(`/api/practice/${question.id}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: currentAnswer }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(
        body?.error === "ai_unavailable"
          ? t.errors.aiUnavailable
          : t.errors.generic,
      );
      setChecking(false);
      return;
    }

    const result = (await response.json()) as Feedback;
    setFeedback((current) => ({ ...current, [question.id]: result }));
    setChecking(false);
  }

  function next() {
    setIndex((i) => Math.min(questions.length - 1, i + 1));
    setShowHint(false);
    setError(null);
  }

  const totalAwarded = Object.values(feedback).reduce(
    (sum, entry) => sum + entry.pointsAwarded,
    0,
  );
  const totalPossible = Object.values(feedback).reduce(
    (sum, entry) => sum + entry.pointsPossible,
    0,
  );

  // Every question answered: show the summary instead of the last question.
  if (answeredCount === questions.length && isLast && currentFeedback) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {t.practice.finished}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {t.practice.finishedBody(
            Object.values(feedback).filter(
              (entry) => entry.pointsAwarded >= entry.pointsPossible * 0.75,
            ).length,
            questions.length,
          )}
        </p>

        <Card className="mt-6 p-5">
          <p className="tabular text-3xl font-semibold text-ink">
            {totalAwarded}
            <span className="text-ink-subtle">/{totalPossible}</span>
          </p>
          <Progress
            value={totalPossible > 0 ? (totalAwarded / totalPossible) * 100 : 0}
            className="mt-4"
            tone="success"
            label={t.a11y.progress}
          />
        </Card>

        <div className="mt-6 flex flex-wrap gap-3">
          <GeneratePracticeButton label={t.practice.startAnother} />
          <Button variant="secondary" asChild>
            <Link href="/practice">{t.practice.title}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold tracking-tight text-ink">
          {set.title}
        </h1>
        <span className="tabular shrink-0 text-sm text-ink-subtle">
          {t.practice.questionOf(index + 1, questions.length)}
        </span>
      </div>
      <Progress
        value={index + (currentFeedback ? 1 : 0)}
        max={questions.length}
        className="mb-6"
        label={t.a11y.progress}
      />

      {error ? (
        <Alert tone="danger" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {question.afb ? <Badge tone="neutral">AFB {question.afb}</Badge> : null}
          {question.operator ? (
            <Badge tone="neutral">{question.operator}</Badge>
          ) : null}
          <span className="tabular ml-auto text-sm text-ink-subtle">
            {question.points} {t.common.pointsShort}
          </span>
        </div>

        <p className="plain-text max-w-[70ch] text-base leading-relaxed text-ink">
          {question.prompt}
        </p>

        {question.hint && !currentFeedback ? (
          <div className="mt-4">
            {showHint ? (
              <Alert tone="brand" title={t.practice.hint}>
                {question.hint}
              </Alert>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHint(true)}
              >
                <LightbulbIcon size={15} aria-hidden="true" />
                {t.practice.hint}
              </Button>
            )}
          </div>
        ) : null}

        <div className="mt-5">
          <label
            htmlFor={`practice-${question.id}`}
            className="mb-2 block text-sm font-medium text-ink"
          >
            {t.practice.yourAnswer}
          </label>
          <textarea
            id={`practice-${question.id}`}
            value={currentAnswer}
            disabled={Boolean(currentFeedback)}
            onChange={(event) =>
              setAnswers((current) => ({
                ...current,
                [question.id]: event.target.value,
              }))
            }
            className="min-h-40 w-full resize-y rounded-control border border-line-strong bg-surface p-3.5 text-base leading-relaxed text-ink placeholder:text-ink-subtle disabled:opacity-70"
            placeholder={t.examRunner.answerPlaceholder}
            spellCheck
          />
        </div>

        {checking ? (
          <div className="mt-5 border-t border-line pt-5">
            <p className="mb-3 text-sm text-ink-muted">{t.practice.checking}</p>
            <SkeletonText lines={3} />
          </div>
        ) : null}

        {currentFeedback ? (
          <div className="mt-5 border-t border-line pt-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={VERDICT_TONE[currentFeedback.verdict]}>
                {t.results.verdict[currentFeedback.verdict]}
              </Badge>
              <span className="tabular text-sm font-semibold text-ink">
                {currentFeedback.pointsAwarded}
                <span className="text-ink-subtle">
                  /{currentFeedback.pointsPossible}
                </span>
              </span>
            </div>

            <p className="plain-text mt-3 max-w-[70ch] text-sm leading-relaxed text-ink-muted">
              {currentFeedback.explanation}
            </p>

            {currentFeedback.improvement ? (
              <div className="mt-3 rounded-control bg-brand-soft p-3">
                <p className="text-xs font-semibold text-brand-text">
                  {t.results.improvement}
                </p>
                <p className="mt-1 text-sm text-ink">
                  {currentFeedback.improvement}
                </p>
              </div>
            ) : null}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-brand-text">
                {t.practice.showSolution}
              </summary>
              <p className="plain-text mt-2 max-w-[70ch] text-sm leading-relaxed text-ink-muted">
                {currentFeedback.expectedSolution}
              </p>
            </details>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3 border-t border-line pt-5">
          {currentFeedback ? (
            isLast ? (
              <Button asChild>
                <Link href="/practice">
                  <CheckCircleIcon size={16} aria-hidden="true" />
                  {t.common.finish}
                </Link>
              </Button>
            ) : (
              <Button onClick={next}>
                {t.practice.nextQuestion}
                <ArrowRightIcon size={16} aria-hidden="true" />
              </Button>
            )
          ) : (
            <Button
              onClick={check}
              loading={checking}
              disabled={currentAnswer.trim() === ""}
            >
              {t.practice.check}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
