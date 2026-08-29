import type { Metadata } from "next";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Alert } from "@/components/ui/feedback";
import { getT } from "@/i18n/server";
import { Faq } from "@/components/marketing/faq";

export const metadata: Metadata = {
  title: "Preise",
};

export default async function PricingPage() {
  const t = await getT();

  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <h1 className="text-4xl font-semibold tracking-tight text-ink md:text-5xl">
            {t.marketing.pricingTitle}
          </h1>
          <p className="mt-4 max-w-[56ch] text-lg text-ink-muted">
            {t.marketing.pricingBody}
          </p>

          <Alert
            tone="warning"
            title={t.subscription.sandboxNoticeTitle}
            className="mt-8 max-w-[70ch]"
          >
            {t.subscription.sandboxNoticeBody}
          </Alert>

          <div className="mt-10">
            <PricingTable />
          </div>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-3xl font-semibold tracking-tight text-ink">
            {t.marketing.faqTitle}
          </h2>
          <div className="mt-8">
            <Faq />
          </div>
        </div>
      </section>
    </>
  );
}
