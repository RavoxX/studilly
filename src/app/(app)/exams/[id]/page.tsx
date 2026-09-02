import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  ListNumbersIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Card, SectionHeader } from "@/components/ui/card";
import { Alert, Badge } from "@/components/ui/feedback";
import { StartExamButton } from "./start-exam-button";
import { DeleteExamButton } from "./delete-exam-button";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getT } from "@/i18n/server";
import { formatDate, formatDuration, formatPercent } from "@/lib/utils/format";
import { AFB_LABELS } from "@/config/operators";

export const metadata: Metadata = { title: "Klausur" };

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireOnboardedUser();
  const t = await getT();
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: exam } = await supabase
    .from("exams")
    .select(
      "id, title, status, instructions, total_points, duration_minutes, difficulty, stage, created_at, validation_report, subjects(name_de, name_en)",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!exam) notFound();

  const [{ data: tasks }, { data: attempts }] = await Promise.all([
    supabase
      .from("exam_tasks")
      .select("id, label, afb, points, operator")
      .eq("exam_id", exam.id)
      .order("position"),
    supabase
      .from("exam_attempts")
      .select(
        "id, status, percentage, grade_label, graded_at, started_at, time_spent_seconds",
      )
      .eq("exam_id", exam.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const subject = exam.subjects as unknown as {
    name_de: string;
    name_en: string;
  } | null;

  const running = (attempts ?? []).find((a) => a.status === "in_progress");
  const taskList = tasks ?? [];

  // Marks per Anforderungsbereich, so a student can see the paper's shape
  // before they start.
  const afbPoints = { I: 0, II: 0, III: 0 };
  for (const task of taskList) {
    if (task.afb) afbPoints[task.afb] += task.points;
  }

  return (
    <div>
      <Link
        href="/exams"
        className="inline-flex items-center gap-1.5 rounded-control text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeftIcon size={15} aria-hidden="true" />
        {t.exams.title}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {exam.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {subject ? (
              <Badge tone="neutral">
                {locale === "de" ? subject.name_de : subject.name_en}
              </Badge>
            ) : null}
            <Badge tone="neutral" icon={<ClockIcon size={12} aria-hidden="true" />}>
              {exam.duration_minutes} {t.common.minutesShort}
            </Badge>
            <Badge
              tone="neutral"
              icon={<ListNumbersIcon size={12} aria-hidden="true" />}
            >
              {t.exams.tasks(taskList.length)}
            </Badge>
            <Badge tone="neutral">{t.exams.totalPoints(exam.total_points)}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DeleteExamButton examId={exam.id} />
          <StartExamButton
            examId={exam.id}
            hasRunningAttempt={Boolean(running)}
            hasAnyAttempt={(attempts ?? []).length > 0}
          />
        </div>
      </div>

      <Alert
        tone="brand"
        className="mt-6"
        title={t.exams.beforeYouStartTitle}
      >
        {t.exams.beforeYouStart}
      </Alert>

      {exam.instructions ? (
        <Card className="mt-6 p-5">
          <SectionHeader title={t.exams.instructions} />
          <p className="plain-text max-w-[70ch] text-sm leading-relaxed text-ink-muted">
            {exam.instructions}
          </p>
        </Card>
      ) : null}

      <section className="mt-6">
        <SectionHeader
          title={t.exams.overview}
          description={t.exams.validationNoticeBody}
        />

        <div className="overflow-hidden rounded-surface border border-line bg-surface">
          <ul className="divide-y divide-line">
            {taskList.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="tabular w-8 shrink-0 text-sm font-semibold text-ink">
                    {task.label}
                  </span>
                  {task.operator ? (
                    <span className="truncate text-sm text-ink-muted">
                      {task.operator}
                    </span>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {task.afb ? (
                    <Badge tone="neutral">AFB {task.afb}</Badge>
                  ) : null}
                  <span className="tabular text-sm text-ink-subtle">
                    {task.points} {t.common.pointsShort}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {(["I", "II", "III"] as const).map((level) => (
            <div key={level} className="flex items-baseline gap-2">
              <dt className="text-xs text-ink-subtle">
                AFB {level} ({locale === "de" ? AFB_LABELS[level].de : AFB_LABELS[level].en})
              </dt>
              <dd className="tabular text-sm font-medium text-ink">
                {afbPoints[level]} {t.common.pointsShort}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {(attempts ?? []).length > 0 ? (
        <section className="mt-8">
          <SectionHeader title={t.exams.attempts} />
          <ul className="divide-y divide-line rounded-surface border border-line bg-surface">
            {(attempts ?? []).map((attempt) => (
              <li key={attempt.id}>
                {attempt.status === "graded" ? (
                  <Link
                    href={`/exams/${exam.id}/results/${attempt.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <CheckCircleIcon
                        size={17}
                        weight="fill"
                        className="shrink-0 text-success"
                        aria-hidden="true"
                      />
                      <span className="text-sm text-ink">
                        {attempt.graded_at
                          ? formatDate(attempt.graded_at, locale)
                          : ""}
                      </span>
                      <span className="text-xs text-ink-subtle">
                        {formatDuration(attempt.time_spent_seconds)}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="tabular text-sm font-semibold text-ink">
                        {attempt.grade_label}
                      </span>
                      <span className="tabular ml-2 text-xs text-ink-subtle">
                        {formatPercent(Number(attempt.percentage ?? 0), locale)}%
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <span className="text-sm text-ink-muted">
                      {formatDate(attempt.started_at, locale)}
                    </span>
                    <Badge
                      tone={attempt.status === "failed" ? "danger" : "warning"}
                    >
                      {attempt.status === "in_progress"
                        ? t.exams.resume
                        : attempt.status === "failed"
                          ? t.examRunner.gradingFailed
                          : t.examRunner.grading}
                    </Badge>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="mt-8 text-sm text-ink-subtle">{t.exams.noAttempts}</p>
      )}
    </div>
  );
}
