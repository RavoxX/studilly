import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarBlankIcon,
  CardsThreeIcon,
  TargetIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { Badge, EmptyState, Progress } from "@/components/ui/feedback";
import { SkeletonCard, SkeletonList } from "@/components/ui/skeleton";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { topWeaknesses } from "@/lib/weakness/service";
import { getLocale, getT } from "@/i18n/server";
import { daysUntil, formatDate, formatPercent } from "@/lib/utils/format";
import { severityBand } from "@/lib/weakness/model";

export const metadata: Metadata = { title: "Übersicht" };

/**
 * Dashboard.
 *
 * Answers one question: what should I do next. The single next action gets the
 * top of the page and everything else is secondary, rather than presenting
 * eight equally-weighted statistics and leaving the student to decide.
 *
 * Each section streams independently through Suspense, so a slow weakness
 * query does not hold up the whole page, and each has a skeleton shaped like
 * its real content.
 */
export default async function DashboardPage() {
  const { profile } = await requireOnboardedUser();
  const t = await getT();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        {t.dashboard.greeting(profile.display_name)}
      </h1>

      <div className="mt-6 space-y-8">
        <Suspense fallback={<SkeletonCard className="h-32" />}>
          <NextAction />
        </Suspense>

        <div className="grid gap-6 lg:grid-cols-2">
          <Suspense fallback={<SkeletonCard />}>
            <UpcomingWork />
          </Suspense>
          <Suspense fallback={<SkeletonCard />}>
            <RecentResults />
          </Suspense>
        </div>

        <Suspense fallback={<SkeletonList count={3} />}>
          <FocusAreas />
        </Suspense>

        <Suspense fallback={<SkeletonList count={2} />}>
          <RecentMaterials />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * The single most useful next step, chosen by a fixed priority order rather
 * than by whatever data happens to exist.
 */
async function NextAction() {
  const { user } = await requireOnboardedUser();
  const t = await getT();
  // Session-bound client: RLS already scopes these counts to the caller, so
  // there is no reason to reach for a key that bypasses it.
  const supabase = await createClient();

  const [{ count: materialCount }, { count: dueCards }, { count: examCount }] =
    await Promise.all([
      supabase
        .from("learning_materials")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "ready"),
      supabase
        .from("flashcards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("suspended", false)
        .lte("due_at", new Date().toISOString()),
      supabase
        .from("exams")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "ready"),
    ]);

  // No material yet: everything else is impossible, so this is the only
  // sensible next step.
  if ((materialCount ?? 0) === 0) {
    return (
      <EmptyState
        icon={<UploadSimpleIcon size={22} aria-hidden="true" />}
        title={t.dashboard.nextActionTitle}
        description={t.dashboard.nextActionEmpty}
        action={
          <Button asChild>
            <Link href="/materials">{t.dashboard.nextActionEmptyCta}</Link>
          </Button>
        }
      />
    );
  }

  if ((dueCards ?? 0) > 0) {
    return (
      <ActionCard
        icon={<CardsThreeIcon size={20} aria-hidden="true" />}
        eyebrow={t.dashboard.nextActionTitle}
        title={t.dashboard.dueCards(dueCards ?? 0)}
        href="/learning"
        cta={t.dashboard.reviewCards}
      />
    );
  }

  if ((examCount ?? 0) === 0) {
    return (
      <ActionCard
        icon={<TargetIcon size={20} aria-hidden="true" />}
        eyebrow={t.dashboard.nextActionTitle}
        title={t.exams.emptyBody}
        href="/exams/new"
        cta={t.exams.create}
      />
    );
  }

  return (
    <ActionCard
      icon={<TargetIcon size={20} aria-hidden="true" />}
      eyebrow={t.dashboard.nextActionTitle}
      title={t.dashboard.recommendedPractice}
      href="/practice"
      cta={t.dashboard.startPractice}
    />
  );
}

function ActionCard({
  icon,
  eyebrow,
  title,
  href,
  cta,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  href: string;
  cta: string;
}) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 border-brand/40 bg-brand-soft p-5">
      <div className="flex min-w-0 items-start gap-3.5">
        <span className="mt-0.5 text-brand-text">{icon}</span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-text">
            {eyebrow}
          </p>
          <p className="mt-1 max-w-[52ch] text-sm text-ink">{title}</p>
        </div>
      </div>
      <Button asChild>
        <Link href={href}>
          {cta}
          <ArrowRightIcon size={16} aria-hidden="true" />
        </Link>
      </Button>
    </Card>
  );
}

async function UpcomingWork() {
  const { user } = await requireOnboardedUser();
  const t = await getT();
  const locale = await getLocale();
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: plans }, { data: todayItems }] = await Promise.all([
    supabase
      .from("learning_plans")
      .select("id, title, exam_date, subject_id, subjects(name_de, name_en)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gte("exam_date", today)
      .order("exam_date")
      .limit(3),
    supabase
      .from("learning_plan_items")
      .select("id, title, activity, estimated_minutes, status")
      .eq("user_id", user.id)
      .eq("scheduled_for", today)
      .order("position")
      .limit(4),
  ]);

  const hasPlans = (plans ?? []).length > 0;
  const hasToday = (todayItems ?? []).length > 0;

  return (
    <Card className="p-5">
      <SectionHeader
        title={t.dashboard.upcomingExams}
        action={
          hasPlans ? (
            <Link
              href="/plan"
              className="rounded-control text-sm text-brand-text hover:opacity-80"
            >
              {t.dashboard.viewAll}
            </Link>
          ) : null
        }
      />

      {hasPlans ? (
        <ul className="divide-y divide-line">
          {(plans ?? []).map((plan) => {
            const days = daysUntil(plan.exam_date);
            const subject = plan.subjects as unknown as {
              name_de: string;
              name_en: string;
            } | null;
            return (
              <li key={plan.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {subject
                      ? locale === "de"
                        ? subject.name_de
                        : subject.name_en
                      : plan.title}
                  </p>
                  <p className="text-xs text-ink-subtle">
                    {formatDate(plan.exam_date, locale)}
                  </p>
                </div>
                <Badge tone={days <= 3 ? "warning" : "neutral"}>
                  {t.dashboard.daysLeft(days)}
                </Badge>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="py-2">
          <p className="text-sm text-ink-muted">
            {t.dashboard.upcomingExamsEmpty}
          </p>
          <Button variant="secondary" size="sm" className="mt-3" asChild>
            <Link href="/plan">
              <CalendarBlankIcon size={15} aria-hidden="true" />
              {t.dashboard.addExamDate}
            </Link>
          </Button>
        </div>
      )}

      {hasToday ? (
        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {t.dashboard.planToday}
          </p>
          <ul className="space-y-2">
            {(todayItems ?? []).map((item) => (
              <li key={item.id} className="flex items-center gap-2.5 text-sm">
                <span
                  className={
                    item.status === "done"
                      ? "text-success line-through"
                      : "text-ink-muted"
                  }
                >
                  {item.title}
                </span>
                <span className="tabular ml-auto shrink-0 text-xs text-ink-subtle">
                  {item.estimated_minutes} {t.common.minutesShort}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

async function RecentResults() {
  const { user } = await requireOnboardedUser();
  const t = await getT();
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select(
      "id, exam_id, percentage, grade_label, graded_at, exams(title, stage)",
    )
    .eq("user_id", user.id)
    .eq("status", "graded")
    .order("graded_at", { ascending: false })
    .limit(4);

  return (
    <Card className="p-5">
      <SectionHeader
        title={t.dashboard.recentResults}
        action={
          (attempts ?? []).length > 0 ? (
            <Link
              href="/exams"
              className="rounded-control text-sm text-brand-text hover:opacity-80"
            >
              {t.dashboard.viewAll}
            </Link>
          ) : null
        }
      />

      {(attempts ?? []).length === 0 ? (
        <p className="text-sm text-ink-muted">{t.dashboard.recentResultsEmpty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {(attempts ?? []).map((attempt) => {
            const exam = attempt.exams as unknown as {
              title: string;
              stage: string;
            } | null;
            const percentage = Number(attempt.percentage ?? 0);
            return (
              <li key={attempt.id}>
                <Link
                  href={`/exams/${attempt.exam_id}/results/${attempt.id}`}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {exam?.title ?? ""}
                    </p>
                    <p className="text-xs text-ink-subtle">
                      {attempt.graded_at
                        ? formatDate(attempt.graded_at, locale)
                        : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-sm font-semibold text-ink">
                      {attempt.grade_label}
                    </p>
                    <p className="tabular text-xs text-ink-subtle">
                      {formatPercent(percentage, locale)}%
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

async function FocusAreas() {
  const { user } = await requireOnboardedUser();
  const t = await getT();

  const weaknesses = await topWeaknesses({ userId: user.id, limit: 4 });

  if (weaknesses.length === 0) {
    return (
      <section>
        <SectionHeader title={t.dashboard.weakTopics} />
        <p className="text-sm text-ink-muted">{t.dashboard.weakTopicsEmpty}</p>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader
        title={t.dashboard.weakTopics}
        action={
          <Link
            href="/practice"
            className="rounded-control text-sm text-brand-text hover:opacity-80"
          >
            {t.weakness.practiceThis}
          </Link>
        }
      />
      <ul className="space-y-2.5">
        {weaknesses.map((weakness) => {
          const severity = Number(weakness.severity);
          const band = severityBand(severity);
          return (
            <li
              key={weakness.id}
              className="rounded-surface border border-line bg-surface p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">
                  {weakness.topic_label}
                </p>
                <Badge
                  tone={
                    band === "high"
                      ? "danger"
                      : band === "medium"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {band === "high"
                    ? t.weakness.severityHigh
                    : band === "medium"
                      ? t.weakness.severityMedium
                      : t.weakness.severityLow}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {t.weakness.dimensionHelp[weakness.dimension]}
              </p>
              <div className="mt-3">
                <Progress
                  value={severity * 100}
                  tone={band === "high" ? "danger" : "warning"}
                  label={t.weakness.severity}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

async function RecentMaterials() {
  const { user } = await requireOnboardedUser();
  const t = await getT();
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: materials } = await supabase
    .from("learning_materials")
    .select("id, title, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(4);

  if ((materials ?? []).length === 0) return null;

  return (
    <section>
      <SectionHeader
        title={t.dashboard.recentMaterials}
        action={
          <Link
            href="/materials"
            className="rounded-control text-sm text-brand-text hover:opacity-80"
          >
            {t.dashboard.viewAll}
          </Link>
        }
      />
      <ul className="divide-y divide-line rounded-surface border border-line bg-surface">
        {(materials ?? []).map((material) => (
          <li key={material.id}>
            <Link
              href={`/materials/${material.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <span className="truncate text-sm text-ink">{material.title}</span>
              <span className="shrink-0 text-xs text-ink-subtle">
                {formatDate(material.created_at, locale)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
