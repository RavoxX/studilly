import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  MinusCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { Alert, Badge, Progress } from "@/components/ui/feedback";
import { RegradeButton } from "./regrade-button";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getT } from "@/i18n/server";
import {
  formatDuration,
  formatGrade,
  formatNumber,
  formatPercent,
} from "@/lib/utils/format";
import type { Database } from "@/types/database";

export const metadata: Metadata = { title: "Ergebnis" };

type Verdict = Database["public"]["Enums"]["answer_verdict"];

const VERDICT_TONE: Record<Verdict, "success" | "warning" | "danger" | "brand"> = {
  incorrect: "danger",
  partially_correct: "warning",
  correct_incomplete: "warning",
  correct: "success",
  exceptional: "brand",
};

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id, attemptId } = await params;
  const { user } = await requireOnboardedUser();
  const t = await getT();
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select(
      "id, exam_id, status, points_awarded, points_possible, percentage, grade_value, grade_label, feedback_summary, time_spent_seconds, error_message, grading_scale_id",
    )
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!attempt || attempt.exam_id !== id) notFound();

  const { data: exam } = await supabase
    .from("exams")
    .select("id, title, total_points, stage")
    .eq("id", id)
    .maybeSingle();

  if (!exam) notFound();

  // Marking still running, or it failed. Both need their own screen rather
  // than an empty results page.
  if (attempt.status !== "graded") {
    return (
      <PendingResult
        examId={id}
        attemptId={attemptId}
        status={attempt.status}
        message={attempt.error_message}
      />
    );
  }

  const [{ data: tasks }, { data: evaluations }, { data: answers }, { data: scale }] =
    await Promise.all([
      supabase
        .from("exam_tasks")
        .select("id, label, prompt, operator, afb, points, expected_solution")
        .eq("exam_id", id)
        .order("position"),
      supabase
        .from("answer_evaluations")
        .select(
          "task_id, points_awarded, points_possible, verdict, criteria_results, missing_elements, misconceptions, strengths, explanation, improvement",
        )
        .eq("attempt_id", attemptId),
      supabase
        .from("exam_answers")
        .select("task_id, answer_text")
        .eq("attempt_id", attemptId),
      supabase
        .from("grading_scales")
        .select("scale_type, name_de, name_en, source_note")
        .eq("id", attempt.grading_scale_id ?? "")
        .maybeSingle(),
    ]);

  const evaluationByTask = new Map(
    (evaluations ?? []).map((e) => [e.task_id, e]),
  );
  const answerByTask = new Map((answers ?? []).map((a) => [a.task_id, a.answer_text]));

  const summary = attempt.feedback_summary as unknown as {
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
  } | null;

  const scaleType = (scale?.scale_type ?? "note") as "note" | "notenpunkte";
  const grade = formatGrade(
    Number(attempt.grade_value ?? 0),
    attempt.grade_label ?? "",
    scaleType,
    locale,
  );

  const percentage = Number(attempt.percentage ?? 0);

  return (
    <div>
      <Link
        href={`/exams/${id}`}
        className="inline-flex items-center gap-1.5 rounded-control text-sm text-ink-muted hover:text-ink no-print"
      >
        <ArrowLeftIcon size={15} aria-hidden="true" />
        {exam.title}
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        {t.results.title}
      </h1>

      {/* Headline result */}
      <Card className="mt-6 p-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm text-ink-muted">
              {scaleType === "notenpunkte"
                ? t.results.gradePoints
                : t.results.yourGrade}
            </p>
            <p className="tabular mt-1 text-5xl font-semibold text-ink">
              {grade.primary}
            </p>
            {grade.secondary ? (
              <p className="mt-1 text-sm text-ink-subtle">{grade.secondary}</p>
            ) : null}
          </div>

          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <dt className="text-xs text-ink-subtle">{t.common.points}</dt>
              <dd className="tabular mt-0.5 text-lg font-semibold text-ink">
                {formatNumber(Number(attempt.points_awarded ?? 0), locale)}
                <span className="text-ink-subtle">
                  {" / "}
                  {formatNumber(Number(attempt.points_possible ?? 0), locale)}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-subtle">{t.results.percentage}</dt>
              <dd className="tabular mt-0.5 text-lg font-semibold text-ink">
                {formatPercent(percentage, locale)}%
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-subtle">{t.results.duration}</dt>
              <dd className="tabular mt-0.5 text-lg font-semibold text-ink">
                {formatDuration(attempt.time_spent_seconds)}
              </dd>
            </div>
          </dl>
        </div>

        <Progress
          value={percentage}
          className="mt-6"
          tone={percentage >= 50 ? "success" : "warning"}
          label={t.results.percentage}
        />

        {scale ? (
          <p className="mt-4 text-xs text-ink-subtle">
            {t.results.scaleUsed}:{" "}
            {locale === "de" ? scale.name_de : scale.name_en}.{" "}
            {t.results.scaleNotice}
          </p>
        ) : null}
      </Card>

      {summary?.summary ? (
        <Card className="mt-6 p-5">
          <SectionHeader title={t.results.summary} />
          <p className="plain-text max-w-[70ch] text-sm leading-relaxed text-ink-muted">
            {summary.summary}
          </p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {(summary.strengths ?? []).length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink">
                  {t.results.strengths}
                </h3>
                <ul className="space-y-1.5">
                  {(summary.strengths ?? []).map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-ink-muted">
                      <CheckCircleIcon
                        size={15}
                        weight="fill"
                        className="mt-0.5 shrink-0 text-success"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {(summary.weaknesses ?? []).length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink">
                  {t.results.weaknesses}
                </h3>
                <ul className="space-y-1.5">
                  {(summary.weaknesses ?? []).map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-ink-muted">
                      <MinusCircleIcon
                        size={15}
                        weight="fill"
                        className="mt-0.5 shrink-0 text-warning"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {/* Task by task */}
      <section className="mt-8">
        <SectionHeader title={t.results.taskByTask} />

        <div className="space-y-4">
          {(tasks ?? []).map((task) => {
            const evaluation = evaluationByTask.get(task.id);
            const answer = answerByTask.get(task.id) ?? "";
            const criteria = (evaluation?.criteria_results ?? []) as unknown as {
              criterion: string;
              met: boolean;
              points_awarded: number;
              points_possible: number;
              note: string | null;
            }[];

            return (
              <Card key={task.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="tabular text-sm font-semibold text-ink">
                      {t.examRunner.task} {task.label}
                    </span>
                    {task.afb ? <Badge tone="neutral">AFB {task.afb}</Badge> : null}
                    {task.operator ? (
                      <Badge tone="neutral">{task.operator}</Badge>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3">
                    {evaluation ? (
                      <Badge tone={VERDICT_TONE[evaluation.verdict]}>
                        {t.results.verdict[evaluation.verdict]}
                      </Badge>
                    ) : null}
                    <span className="tabular text-sm font-semibold text-ink">
                      {formatNumber(
                        Number(evaluation?.points_awarded ?? 0),
                        locale,
                      )}
                      <span className="text-ink-subtle">/{task.points}</span>
                    </span>
                  </div>
                </div>

                <p className="plain-text mt-3 max-w-[70ch] text-sm leading-relaxed text-ink">
                  {task.prompt}
                </p>

                <div className="mt-4">
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                    {t.results.yourAnswer}
                  </h3>
                  {answer.trim() === "" ? (
                    <p className="text-sm italic text-ink-subtle">
                      {t.results.noAnswer}
                    </p>
                  ) : (
                    <p className="plain-text rounded-control bg-surface-sunken p-3 text-sm leading-relaxed text-ink-muted">
                      {answer}
                    </p>
                  )}
                </div>

                {criteria.length > 0 ? (
                  <div className="mt-4">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                      {t.results.erwartungshorizont}
                    </h3>
                    <ul className="space-y-2">
                      {criteria.map((criterion, index) => (
                        <li key={index} className="flex items-start gap-2.5">
                          {criterion.met ? (
                            <CheckCircleIcon
                              size={16}
                              weight="fill"
                              className="mt-0.5 shrink-0 text-success"
                              aria-hidden="true"
                            />
                          ) : (
                            <XCircleIcon
                              size={16}
                              weight="fill"
                              className="mt-0.5 shrink-0 text-danger"
                              aria-hidden="true"
                            />
                          )}
                          <span className="min-w-0 flex-1 text-sm text-ink-muted">
                            {criterion.criterion}
                            {criterion.note ? (
                              <span className="block text-xs text-ink-subtle">
                                {criterion.note}
                              </span>
                            ) : null}
                          </span>
                          <span className="tabular shrink-0 text-sm text-ink-subtle">
                            {formatNumber(criterion.points_awarded, locale)}/
                            {formatNumber(criterion.points_possible, locale)}
                          </span>
                          <span className="sr-only">
                            {criterion.met
                              ? t.results.criterionMet
                              : t.results.criterionMissed}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {evaluation ? (
                  <div className="mt-4 space-y-3 border-t border-line pt-4">
                    {evaluation.explanation ? (
                      <p className="plain-text max-w-[70ch] text-sm leading-relaxed text-ink-muted">
                        {evaluation.explanation}
                      </p>
                    ) : null}

                    {evaluation.missing_elements.length > 0 ? (
                      <div>
                        <h4 className="text-xs font-semibold text-ink">
                          {t.results.missingElements}
                        </h4>
                        <ul className="mt-1 space-y-1 pl-4">
                          {evaluation.missing_elements.map((item) => (
                            <li
                              key={item}
                              className="list-disc text-sm text-ink-muted"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {evaluation.misconceptions.length > 0 ? (
                      <div>
                        <h4 className="text-xs font-semibold text-ink">
                          {t.results.misconceptions}
                        </h4>
                        <ul className="mt-1 space-y-1 pl-4">
                          {evaluation.misconceptions.map((item) => (
                            <li
                              key={item}
                              className="list-disc text-sm text-ink-muted"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {evaluation.improvement ? (
                      <div className="rounded-control bg-brand-soft p-3">
                        <h4 className="text-xs font-semibold text-brand-text">
                          {t.results.improvement}
                        </h4>
                        <p className="mt-1 text-sm text-ink">
                          {evaluation.improvement}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {task.expected_solution ? (
                  <details className="mt-4 border-t border-line pt-4">
                    <summary className="cursor-pointer text-sm font-medium text-brand-text">
                      {t.results.expectedSolution}
                    </summary>
                    <p className="plain-text mt-2 max-w-[70ch] text-sm leading-relaxed text-ink-muted">
                      {task.expected_solution}
                    </p>
                  </details>
                ) : null}
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-8 no-print">
        <SectionHeader title={t.results.nextSteps} />
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/practice">{t.results.practiceWeakest}</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href={`/exams/${id}`}>{t.results.retakeExam}</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/learning">{t.results.makeFlashcards}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

async function PendingResult({
  examId,
  attemptId,
  status,
  message,
}: {
  examId: string;
  attemptId: string;
  status: string;
  message: string | null;
}) {
  const t = await getT();

  if (status === "failed") {
    return (
      <div>
        <Link
          href={`/exams/${examId}`}
          className="inline-flex items-center gap-1.5 rounded-control text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeftIcon size={15} aria-hidden="true" />
          {t.exams.title}
        </Link>

        <Alert
          tone="danger"
          className="mt-6"
          title={t.examRunner.gradingFailed}
          action={<RegradeButton attemptId={attemptId} />}
        >
          {message ?? t.examRunner.gradingFailedBody}
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        {t.examRunner.grading}
      </h1>
      <p className="mt-2 text-sm text-ink-muted">{t.examRunner.gradingHint}</p>
      <div className="mt-6">
        <RegradeButton attemptId={attemptId} autoStart />
      </div>
    </div>
  );
}
