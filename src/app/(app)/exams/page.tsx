import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ExamIcon, PlusIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/feedback";
import { SkeletonList } from "@/components/ui/skeleton";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getT } from "@/i18n/server";
import { formatDate, formatPercent } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Klausuren" };

export default async function ExamsPage() {
  const t = await getT();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {t.exams.title}
          </h1>
          <p className="mt-1 max-w-[62ch] text-sm text-ink-muted">
            {t.exams.subtitle}
          </p>
        </div>
        <Button asChild>
          <Link href="/exams/new">
            <PlusIcon size={17} aria-hidden="true" />
            {t.exams.create}
          </Link>
        </Button>
      </div>

      <Suspense fallback={<SkeletonList count={3} />}>
        <ExamList />
      </Suspense>
    </div>
  );
}

async function ExamList() {
  const { user } = await requireOnboardedUser();
  const t = await getT();
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: exams } = await supabase
    .from("exams")
    .select(
      "id, title, status, total_points, duration_minutes, difficulty, created_at, subjects(name_de, name_en), exam_tasks(count), exam_attempts(id, status, percentage, grade_label, graded_at)",
    )
    .eq("user_id", user.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if ((exams ?? []).length === 0) {
    return (
      <EmptyState
        icon={<ExamIcon size={22} aria-hidden="true" />}
        title={t.exams.empty}
        description={t.exams.emptyBody}
        action={
          <Button asChild>
            <Link href="/exams/new">{t.exams.create}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ul className="space-y-3">
      {(exams ?? []).map((exam) => {
        const subject = exam.subjects as unknown as {
          name_de: string;
          name_en: string;
        } | null;
        const taskCount =
          (exam.exam_tasks as unknown as { count: number }[])?.[0]?.count ?? 0;

        const attempts = (exam.exam_attempts ?? []) as unknown as {
          id: string;
          status: string;
          percentage: number | null;
          grade_label: string | null;
          graded_at: string | null;
        }[];

        const running = attempts.find((a) => a.status === "in_progress");
        const graded = attempts
          .filter((a) => a.status === "graded")
          .sort((a, b) => (b.graded_at ?? "").localeCompare(a.graded_at ?? ""));
        const best = graded[0];

        return (
          <li
            key={exam.id}
            className="rounded-surface border border-line bg-surface p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/exams/${exam.id}`}
                    className="rounded-control text-sm font-medium text-ink hover:text-brand-text"
                  >
                    {exam.title}
                  </Link>
                  {subject ? (
                    <Badge tone="neutral">
                      {locale === "de" ? subject.name_de : subject.name_en}
                    </Badge>
                  ) : null}
                  {running ? (
                    <Badge tone="warning">{t.exams.resume}</Badge>
                  ) : null}
                </div>

                <p className="mt-1.5 text-xs text-ink-subtle">
                  {t.exams.tasks(taskCount)}
                  {" · "}
                  {t.exams.totalPoints(exam.total_points)}
                  {" · "}
                  {exam.duration_minutes} {t.common.minutesShort}
                  {" · "}
                  {formatDate(exam.created_at, locale)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-4">
                {best ? (
                  <Link
                    href={`/exams/${exam.id}/results/${best.id}`}
                    className="rounded-control text-right"
                  >
                    <p className="tabular text-sm font-semibold text-ink">
                      {best.grade_label}
                    </p>
                    <p className="tabular text-xs text-ink-subtle">
                      {formatPercent(Number(best.percentage ?? 0), locale)}%
                    </p>
                  </Link>
                ) : null}

                <Button variant={running ? "primary" : "secondary"} size="sm" asChild>
                  <Link href={`/exams/${exam.id}`}>
                    {running
                      ? t.exams.resume
                      : graded.length > 0
                        ? t.exams.startAgain
                        : t.exams.start}
                  </Link>
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
