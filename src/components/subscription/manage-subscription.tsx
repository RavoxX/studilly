"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowSquareOutIcon,
  CreditCardIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, Badge } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useI18n } from "@/i18n/client";
import { formatDate } from "@/lib/utils/format";
import { PLANS, formatPrice, type PlanTier } from "@/config/plans";

/**
 * Subscription management.
 *
 * Shows what actually governs the customer's access, all of it real: the tier,
 * what they pay, when it renews or ends, which store holds the purchase, and
 * which product. Nothing here is a mock-up of billing; every field is either
 * mirrored from RevenueCat or, in simulation mode, from a locally recorded
 * period.
 *
 * There is deliberately no card form. Studilly never sees card details: the
 * store's own checkout collects them. A form here that could not charge
 * anything would be theatre.
 */
export function ManageSubscription({
  plan,
  purchasedPlan,
  currentPeriodEnd,
  autoRenew,
  inGracePeriod,
  daysRemaining,
  store,
  productId,
  managementUrl,
  simulated,
}: {
  plan: PlanTier;
  purchasedPlan: PlanTier;
  currentPeriodEnd: string | null;
  autoRenew: boolean;
  inGracePeriod: boolean;
  daysRemaining: number | null;
  store: string | null;
  productId: string | null;
  managementUrl: string | null;
  simulated: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [portal, setPortal] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // The enforced plan decides. Once a cancelled plan has run out the student
  // is a free user again, and showing them a stale "Pro" card would be a lie.
  const isPaid = plan !== "free";
  const endDate = currentPeriodEnd ? formatDate(currentPeriodEnd, locale) : null;

  async function act(action: "cancel" | "resume") {
    setBusy(true);
    setNotice(null);
    setPortal(null);

    const response = await fetch("/api/subscription/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    setBusy(false);
    setConfirmOpen(false);

    if (!response.ok) return;

    const body = (await response.json()) as {
      cancelled?: boolean;
      usePortal?: boolean;
      portalUrl?: string | null;
      resumed?: boolean;
    };

    // The store owns billing: we did not cancel, so we do not claim to have.
    if (body.usePortal) {
      setPortal(body.portalUrl ?? "");
      return;
    }

    if (body.resumed) setNotice(t.subscription.resumed);
    router.refresh();
  }

  if (!isPaid) return null;

  return (
    <>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-ink">
                {t.plans[purchasedPlan].name}
              </h2>
              {inGracePeriod ? (
                <Badge tone="warning">{t.subscription.cancelled}</Badge>
              ) : null}
              {simulated ? (
                <Badge tone="neutral">
                  {t.subscription.simulationNoticeTitle}
                </Badge>
              ) : null}
            </div>

            <p className="mt-1 text-sm text-ink-muted">
              {endDate
                ? inGracePeriod || !autoRenew
                  ? t.subscription.endsOn(endDate)
                  : t.subscription.renewsOn(endDate)
                : null}
              {daysRemaining !== null ? (
                <span className="ml-2 text-ink-subtle">
                  {t.subscription.daysLeft(daysRemaining)}
                </span>
              ) : null}
            </p>
          </div>

          <p className="shrink-0 text-lg font-semibold text-ink">
            {/* Only the figure is tabular: the utility switches to the mono
                face, which the label should not inherit. */}
            <span className="tabular">
              {formatPrice(PLANS[purchasedPlan].price.monthlyCents, locale)}
            </span>
            <span className="ml-1.5 text-sm font-normal text-ink-subtle">
              {t.subscription.perMonth}
            </span>
          </p>
        </div>

        {/* Real billing facts, mirrored from the store. */}
        <dl className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          {store ? (
            <div>
              <dt className="text-xs text-ink-subtle">
                {t.subscription.paymentMethod}
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                <CreditCardIcon size={15} aria-hidden="true" />
                {t.subscription.paymentVia(storeLabel(store))}
              </dd>
            </div>
          ) : null}

          {productId ? (
            <div>
              <dt className="text-xs text-ink-subtle">
                {t.subscription.product}
              </dt>
              <dd className="mt-1 font-mono text-sm text-ink-muted">
                {productId}
              </dd>
            </div>
          ) : null}
        </dl>

        {inGracePeriod && endDate ? (
          <Alert tone="warning" className="mt-5" title={t.subscription.cancelled}>
            {t.subscription.cancelledBody(endDate)}
          </Alert>
        ) : null}

        {notice ? (
          <Alert tone="success" className="mt-5">
            {notice}
          </Alert>
        ) : null}

        {portal !== null ? (
          <Alert
            tone="brand"
            className="mt-5"
            title={t.subscription.portalTitle}
            action={
              portal ? (
                <Button size="sm" variant="secondary" asChild>
                  <a href={portal} target="_blank" rel="noopener noreferrer">
                    {t.subscription.portalLink}
                    <ArrowSquareOutIcon size={14} aria-hidden="true" />
                  </a>
                </Button>
              ) : undefined
            }
          >
            {t.subscription.portalBody}
          </Alert>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-4">
          {managementUrl ? (
            // Billing lives at the store, so send them straight there instead
            // of offering a cancel button that cannot actually cancel.
            <Button variant="secondary" asChild>
              <a href={managementUrl} target="_blank" rel="noopener noreferrer">
                {t.subscription.portalLink}
                <ArrowSquareOutIcon size={14} aria-hidden="true" />
              </a>
            </Button>
          ) : inGracePeriod ? (
            <Button variant="secondary" loading={busy} onClick={() => act("resume")}>
              {t.subscription.resumePlan}
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="text-danger hover:bg-danger-soft"
              onClick={() => setConfirmOpen(true)}
            >
              {t.subscription.cancelPlan}
            </Button>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t.subscription.cancelConfirmTitle}
        // Says plainly that access continues, so nobody cancels believing
        // they are losing something immediately.
        description={t.subscription.cancelConfirmBody(endDate ?? "")}
        confirmLabel={t.subscription.cancelPlan}
        destructive
        busy={busy}
        onConfirm={() => act("cancel")}
      />
    </>
  );
}

/** Store identifiers are machine-readable; these are the human names. */
function storeLabel(store: string): string {
  switch (store) {
    case "test_store":
      return "RevenueCat Test Store";
    case "app_store":
      return "App Store";
    case "play_store":
      return "Google Play";
    case "stripe":
      return "Stripe";
    case "simulation":
      return "Simulation";
    default:
      return store;
  }
}
