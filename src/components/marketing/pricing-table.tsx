"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";
import { useI18n } from "@/i18n/client";
import {
  PLANS,
  PLAN_ORDER,
  formatPrice,
  yearlySavingPercent,
  type PlanTier,
} from "@/config/plans";
import { cn } from "@/lib/utils/cn";

/**
 * Plan comparison.
 *
 * Prices and limits come from `src/config/plans.ts`, the same module the
 * backend enforces against, so the table cannot promise something the API
 * refuses.
 *
 * No dark patterns: the yearly saving is stated as a plain percentage, the
 * free tier is presented as a real option rather than a decoy, and there is no
 * countdown, no "most popular" pressure and no pre-selected upsell.
 */

type Period = "monthly" | "yearly";

export function PricingTable({
  currentPlan,
  onSelect,
  busyPlan,
}: {
  currentPlan?: PlanTier;
  /** When provided, the buttons purchase instead of linking to signup. */
  onSelect?: (plan: PlanTier, period: Period) => void;
  busyPlan?: PlanTier | null;
}) {
  const { t, locale } = useI18n();
  const [period, setPeriod] = useState<Period>("monthly");

  const featuresFor = (tier: PlanTier): string[] => {
    const limits = PLANS[tier].limits;
    const f = t.plans.features;

    const shared = [
      f.examsPerMonth(limits.exam_generation),
      f.practicePerMonth(limits.practice_generation),
      f.materialsPerMonth(limits.material_upload),
      f.storage(limits.storage_mb),
      f.studyGroups(limits.study_groups),
      // The model tier is a real, load-bearing difference between plans, so
      // it is listed rather than left implicit. See PLAN_CEILING in
      // src/lib/ai/models.ts.
      f.modelTier[tier],
    ];

    if (tier === "free") {
      return [...shared, f.flashcards, f.allSubjects];
    }
    if (tier === "pro") {
      return [
        ...shared,
        f.flashcards,
        f.weaknessRadar,
        f.learningPlans,
        f.advancedGrading,
      ];
    }
    return [
      ...shared,
      f.flashcards,
      f.weaknessRadar,
      f.learningPlans,
      f.advancedGrading,
      f.prioritySpeed,
      f.exportResults,
    ];
  };

  return (
    <div>
      <div className="mb-8 flex justify-center">
        <div
          className="inline-flex rounded-control border border-line bg-surface p-0.5"
          role="group"
          aria-label={t.subscription.changePlan}
        >
          {(["monthly", "yearly"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-current={period === option ? "true" : undefined}
              onClick={() => setPeriod(option)}
              className={cn(
                "rounded-[6px] px-4 py-1.5 text-sm font-medium transition-colors",
                period === option
                  ? "bg-surface-sunken text-ink"
                  : "text-ink-subtle hover:text-ink",
              )}
            >
              {t.subscription.period[option]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {PLAN_ORDER.map((tier) => {
          const plan = PLANS[tier];
          const isCurrent = currentPlan === tier;
          // Pro is highlighted because it is the plan most students will want,
          // not to pressure anyone off the free tier.
          const highlighted = tier === "pro";

          const cents =
            period === "yearly" ? plan.price.yearlyCents : plan.price.monthlyCents;
          const monthlyEquivalent =
            period === "yearly" && plan.price.yearlyCents > 0
              ? plan.price.yearlyCents / 12
              : null;

          return (
            <div
              key={tier}
              className={cn(
                "flex flex-col rounded-surface border bg-surface p-6",
                highlighted ? "border-brand" : "border-line",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-ink">
                    {t.plans[tier].name}
                  </h3>
                  <p className="mt-1 max-w-[32ch] text-sm text-ink-muted">
                    {t.plans[tier].tagline}
                  </p>
                </div>
                {isCurrent ? (
                  <Badge tone="brand">{t.subscription.currentPlanBadge}</Badge>
                ) : null}
              </div>

              <div className="mt-6">
                {cents === 0 ? (
                  <p className="text-3xl font-semibold tabular-nums text-ink">
                    {formatPrice(0, locale)}
                  </p>
                ) : (
                  <>
                    <p className="text-3xl font-semibold tabular-nums text-ink">
                      {formatPrice(
                        monthlyEquivalent ?? plan.price.monthlyCents,
                        locale,
                      )}
                      <span className="ml-1.5 text-sm font-normal text-ink-subtle">
                        {t.subscription.perMonth}
                      </span>
                    </p>
                    {period === "yearly" ? (
                      <p className="mt-1.5 text-sm text-ink-muted">
                        {t.subscription.billedYearly(
                          formatPrice(plan.price.yearlyCents, locale),
                        )}
                        <span className="ml-2 text-success">
                          {t.subscription.saveWithYearly(
                            yearlySavingPercent(tier),
                          )}
                        </span>
                      </p>
                    ) : null}
                  </>
                )}
              </div>

              <ul className="mt-6 flex-1 space-y-2.5">
                {featuresFor(tier).map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <CheckIcon
                      size={16}
                      weight="bold"
                      className="mt-0.5 shrink-0 text-success"
                      aria-hidden="true"
                    />
                    <span className="text-sm text-ink-muted">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                {isCurrent ? (
                  <Button variant="secondary" className="w-full" disabled>
                    {t.subscription.currentPlanBadge}
                  </Button>
                ) : onSelect ? (
                  <Button
                    className="w-full"
                    variant={highlighted ? "primary" : "secondary"}
                    loading={busyPlan === tier}
                    disabled={busyPlan !== null && busyPlan !== undefined}
                    onClick={() => onSelect(tier, period)}
                  >
                    {busyPlan === tier
                      ? t.subscription.processing
                      : t.subscription.selectPlan}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={highlighted ? "primary" : "secondary"}
                    asChild
                  >
                    <Link href="/register">
                      {tier === "free"
                        ? t.marketing.getStarted
                        : t.subscription.selectPlan}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stated plainly rather than hidden behind the feature bullet: the
          marking scheme is identical on every plan, only the model differs. */}
      <p className="mx-auto mt-6 max-w-[62ch] text-center text-xs leading-relaxed text-ink-subtle">
        {t.plans.features.modelTierNote}
      </p>
    </div>
  );
}
