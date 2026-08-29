import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, SectionHeader } from "@/components/ui/card";
import { Alert, Progress } from "@/components/ui/feedback";
import { SkeletonStats } from "@/components/ui/skeleton";
import { PlanPicker } from "./plan-picker";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getSubscription, getUsage } from "@/lib/subscription/service";
import { getLocale, getT } from "@/i18n/server";
import { USAGE_METRICS, isUnlimited } from "@/config/plans";
import { formatBytes, formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Abo" };

export default async function SubscriptionPage() {
  const t = await getT();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {t.subscription.title}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t.subscription.subtitle}</p>
      </div>

      <Suspense fallback={<SkeletonStats count={3} />}>
        <SubscriptionDetail />
      </Suspense>
    </div>
  );
}

async function SubscriptionDetail() {
  const { user } = await requireOnboardedUser();
  const t = await getT();
  const locale = await getLocale();

  const [subscription, usage] = await Promise.all([
    getSubscription(user.id),
    getUsage(user.id),
  ]);

  // Usage resets at the start of the next UTC month.
  const resetDate = new Date(usage.periodStart);
  resetDate.setUTCMonth(resetDate.getUTCMonth() + 1);

  return (
    <>
      {/* Sandbox is stated plainly, not hidden in a footnote. Anyone about to
          press a purchase button should know no money will move. */}
      {subscription.simulated ? (
        <Alert
          tone="warning"
          className="mb-6"
          title={t.subscription.simulationNoticeTitle}
        >
          {t.subscription.simulationNoticeBody}
        </Alert>
      ) : (
        <Alert
          tone="warning"
          className="mb-6"
          title={t.subscription.sandboxNoticeTitle}
        >
          {t.subscription.sandboxNoticeBody}
        </Alert>
      )}

      <section className="mb-8">
        <SectionHeader
          title={t.subscription.usage}
          description={t.subscription.usageResets(
            formatDate(resetDate, locale),
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {USAGE_METRICS.map((metric) => {
            const used = usage.used[metric];
            const limit = usage.limits[metric];
            const unlimited = isUnlimited(limit);
            const ratio = unlimited ? 0 : limit > 0 ? (used / limit) * 100 : 0;

            return (
              <Card key={metric} className="p-4">
                <p className="text-xs text-ink-subtle">
                  {t.usage.metric[metric]}
                </p>
                <p className="tabular mt-1 text-lg font-semibold text-ink">
                  {unlimited
                    ? t.subscription.unlimited
                    : t.subscription.used(used, limit)}
                </p>
                {!unlimited ? (
                  <Progress
                    value={ratio}
                    className="mt-3"
                    tone={ratio >= 90 ? "danger" : ratio >= 70 ? "warning" : "brand"}
                    label={t.usage.metric[metric]}
                  />
                ) : null}
              </Card>
            );
          })}

          <Card className="p-4">
            <p className="text-xs text-ink-subtle">{t.subscription.storage}</p>
            <p className="tabular mt-1 text-lg font-semibold text-ink">
              {formatBytes(usage.storageBytesUsed, locale)}
              <span className="text-ink-subtle">
                {" / "}
                {formatBytes(usage.storageBytesLimit, locale)}
              </span>
            </p>
            <Progress
              value={
                usage.storageBytesLimit > 0
                  ? (usage.storageBytesUsed / usage.storageBytesLimit) * 100
                  : 0
              }
              className="mt-3"
              tone="brand"
              label={t.subscription.storage}
            />
          </Card>
        </div>
      </section>

      <section>
        <SectionHeader title={t.subscription.changePlan} />
        <PlanPicker
          currentPlan={subscription.plan}
          simulated={subscription.simulated}
          appUserId={user.id}
        />
      </section>
    </>
  );
}
