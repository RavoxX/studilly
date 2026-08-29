"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Alert } from "@/components/ui/feedback";
import { useT } from "@/i18n/client";
import { publicEnv } from "@/lib/env";
import { PLANS, type PlanTier } from "@/config/plans";

/**
 * Plan selection.
 *
 * Two paths, and the UI says which one is active:
 *
 *   RevenueCat configured: the Web SDK opens its checkout. With a Test Store
 *   key that is a simulated purchase, no payment details and no money. When
 *   it resolves, the server is asked to re-read entitlements from RevenueCat
 *   rather than being told what to grant.
 *
 *   Not configured: the plan change is simulated locally so the plan-gated
 *   features can be exercised. The API refuses this path as soon as real
 *   credentials exist.
 */
export function PlanPicker({
  currentPlan,
  simulated,
  appUserId,
}: {
  currentPlan: PlanTier;
  simulated: boolean;
  appUserId: string;
}) {
  const t = useT();
  const router = useRouter();

  const [busyPlan, setBusyPlan] = useState<PlanTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function select(plan: PlanTier, period: "monthly" | "yearly") {
    setBusyPlan(plan);
    setError(null);

    try {
      if (simulated || plan === "free") {
        const response = await fetch("/api/subscription/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });

        if (!response.ok) {
          setError(t.subscription.purchaseFailed);
          setBusyPlan(null);
          return;
        }

        router.refresh();
        setBusyPlan(null);
        return;
      }

      // Loaded lazily so the SDK is not in the bundle for students who never
      // open this page.
      const { Purchases } = await import("@revenuecat/purchases-js");

      const purchases = Purchases.configure({
        apiKey: publicEnv.NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY,
        appUserId,
      });

      const offerings = await purchases.getOfferings({ currency: "EUR" });
      const offeringId = PLANS[plan].offeringId;
      const offering = offeringId ? offerings.all[offeringId] : null;

      if (!offering) {
        setError(t.errors.notConfigured);
        setBusyPlan(null);
        return;
      }

      const rcPackage =
        period === "yearly" ? offering.annual : offering.monthly;

      if (!rcPackage) {
        setError(t.errors.notConfigured);
        setBusyPlan(null);
        return;
      }

      await purchases.purchase({ rcPackage });

      // The purchase result is NOT trusted. The server re-reads entitlements
      // from RevenueCat before granting anything.
      await fetch("/api/subscription/sync", { method: "POST" });
      router.refresh();
    } catch (caught) {
      // A cancelled checkout is a normal outcome, not a failure.
      const message =
        caught instanceof Error ? caught.message.toLowerCase() : "";
      setError(
        message.includes("cancel")
          ? t.subscription.purchaseCancelled
          : t.subscription.purchaseFailed,
      );
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <div>
      {error ? (
        <Alert tone="danger" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <PricingTable
        currentPlan={currentPlan}
        onSelect={(plan, period) => void select(plan, period)}
        busyPlan={busyPlan}
      />

      <p className="mt-4 text-xs text-ink-subtle">
        {t.subscription.downgradeNote}
      </p>
    </div>
  );
}
