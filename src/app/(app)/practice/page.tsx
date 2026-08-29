import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { TargetIcon } from "@phosphor-icons/react/dist/ssr";
import { Card, SectionHeader } from "@/components/ui/card";
import { Badge, EmptyState, Progress } from "@/components/ui/feedback";
import { SkeletonList } from "@/components/ui/skeleton";
import { GeneratePracticeButton } from "./generate-practice-button";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { topWeaknesses } from "@/lib/weakness/service";
import { getLocale, getT } from "@/i18n/server";
import { formatDate } from "@/lib/utils/format";
import { severityBand } from "@/lib/weakness/model";

export const metadata: Metadata = { title: "Übungen" };

export default async function PracticePage() {
  const t = await getT();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {t.practice.title}
        </h1>
        <p className="mt-1 max-w-[62ch] text-sm text-ink-muted">
          {t.practice.subtitle}
        </p>
      </div>

      <Suspense fallback={<SkeletonList count={3} />}>
        <FocusList />
      </Suspense>

      <div className="mt-10">
        <Suspense fallback={<SkeletonList count={2} />}>
          <PracticeSets />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * The weakness list, each row offering to generate practice for exactly that
 * problem. Practice is entered from a weakness rather than from a topic
 * picker, because that is what makes it targeted.
 */
async function FocusList() {
  const { user } = await requireOnboardedUser();
  const t = await getT();

  const weaknesses = await topWeaknesses({ userId: user.id, limit: 6 });

  if (weaknesses.length === 0) {
    return (
      <EmptyState
        icon={<TargetIcon size={22} aria-hidden="true" />}
        title={t.practice.empty}
        description={t.practice.emptyBody}
      />
    );
  }

  return (
    <section>
      <SectionHeader title={t.weakness.title} description={t.weakness.subtitle} />
      <ul className="space-y-3">
        {weaknesses.map((weakness) => {
          const severity = Number(weakness.severity);
          const band = severityBand(severity);

          return (
            <li
              key={weakness.id}
              className="rounded-surface border border-line bg-surface p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-ink">
                      {weakness.topic_label}
                    </p>
                    <Badge tone="neutral">
                      {t.weakness.dimension[weakness.dimension]}
                    </Badge>
                    {weakness.operator ? (
                      <Badge tone="neutral">{weakness.operator}</Badge>
                    ) : null}
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

                  <p className="mt-1.5 max-w-[64ch] text-sm text-ink-muted">
                    {t.weakness.dimensionHelp[weakness.dimension]}
                  </p>

                  <div className="mt-3 max-w-sm">
                    <Progress
                      value={severity * 100}
                      tone={band === "high" ? "danger" : "warning"}
                      label={t.weakness.severity}
                    />
                  </div>

                  <p className="mt-2 text-xs text-ink-subtle">
                    {t.weakness.evidence(weakness.evidence_count)}
                    {" · "}
                    {t.weakness.trend[weakness.trend]}
                  </p>
                </div>

                <GeneratePracticeButton weaknessId={weakness.id} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

async function PracticeSets() {
  const { user } = await requireOnboardedUser();
  const t = await getT();
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: sets } = await supabase
    .from("practice_sets")
    .select(
      "id, title, topic_label, created_at, status, practice_questions(count), subjects(name_de, name_en)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if ((sets ?? []).length === 0) return null;

  return (
    <section>
      <SectionHeader title={t.practice.title} />
      <ul className="divide-y divide-line rounded-surface border border-line bg-surface">
        {(sets ?? []).map((set) => {
          const subject = set.subjects as unknown as {
            name_de: string;
            name_en: string;
          } | null;
          const count =
            (set.practice_questions as unknown as { count: number }[])?.[0]
              ?.count ?? 0;

          return (
            <li key={set.id}>
              <Link
                href={`/practice/${set.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {set.title}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-subtle">
                    {subject
                      ? `${locale === "de" ? subject.name_de : subject.name_en} · `
                      : ""}
                    {t.practice.questionOf(count, count)}
                    {" · "}
                    {formatDate(set.created_at, locale)}
                  </p>
                </div>
                <Card className="shrink-0 border-0 bg-transparent p-0 text-sm text-brand-text">
                  {t.common.continue}
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
