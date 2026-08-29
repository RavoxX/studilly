import Link from "next/link";
import {
  ArrowRightIcon,
  BrainIcon,
  CalendarCheckIcon,
  ChartLineUpIcon,
  ClipboardTextIcon,
  LockKeyIcon,
  MapPinAreaIcon,
  NotePencilIcon,
  UploadSimpleIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { ExamPreview } from "@/components/marketing/exam-preview";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Faq } from "@/components/marketing/faq";
import { getLocale, getT } from "@/i18n/server";
import { AFB_LABELS } from "@/config/operators";

export default async function LandingPage() {
  const t = await getT();
  const locale = await getLocale();

  const steps = [
    {
      icon: <UploadSimpleIcon size={20} aria-hidden="true" />,
      title: t.marketing.how.uploadTitle,
      body: t.marketing.how.uploadBody,
    },
    {
      icon: <ClipboardTextIcon size={20} aria-hidden="true" />,
      title: t.marketing.how.generateTitle,
      body: t.marketing.how.generateBody,
    },
    {
      icon: <NotePencilIcon size={20} aria-hidden="true" />,
      title: t.marketing.how.writeTitle,
      body: t.marketing.how.writeBody,
    },
    {
      icon: <ChartLineUpIcon size={20} aria-hidden="true" />,
      title: t.marketing.how.feedbackTitle,
      body: t.marketing.how.feedbackBody,
    },
  ];

  return (
    <>
      {/* Hero: asymmetric split. Copy left, a real marked task right. */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:pb-24 lg:pt-20">
          {/* 7/5 rather than 6/6: German compound nouns need the extra width
              to keep the headline at two lines on desktop. */}
          <div className="lg:col-span-7">
            {/* Sized so the German headline lands on two lines. Compound
                nouns make it noticeably longer than the English, so the
                display size is planned around the copy rather than the copy
                being cut to fit a larger size. */}
            <h1 className="text-[2.125rem] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[2.5rem] lg:text-[2.75rem]">
              {t.marketing.heroTitle}
            </h1>
            <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-ink-muted">
              {t.marketing.heroBody}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href="/register">
                  {t.marketing.heroCta}
                  <ArrowRightIcon size={18} aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/pricing">{t.marketing.heroSecondary}</Link>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <ExamPreview />
          </div>
        </div>
      </section>

      {/* How it works: a connected step flow, not a row of equal cards. */}
      <section id="how" className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="max-w-[20ch] text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {t.marketing.howTitle}
          </h2>

          <ol className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step.title} className="relative">
                {/* Connector, drawn only between items on wide screens. */}
                {index < steps.length - 1 ? (
                  <span
                    className="absolute left-11 right-0 top-5 hidden h-px bg-line lg:block"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative flex size-10 items-center justify-center rounded-surface border border-line bg-canvas text-brand-text">
                  {step.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features: a bento grid with six cells for six features. */}
      <section id="features" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="max-w-[20ch] text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {t.marketing.featuresTitle}
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-6">
            <FeatureCell
              className="md:col-span-4 bg-brand-soft"
              icon={<MapPinAreaIcon size={20} aria-hidden="true" />}
              title={t.marketing.features.curriculumTitle}
              body={t.marketing.features.curriculumBody}
            />
            <FeatureCell
              className="md:col-span-2"
              icon={<ClipboardTextIcon size={20} aria-hidden="true" />}
              title={t.marketing.features.gradingTitle}
              body={t.marketing.features.gradingBody}
            />
            <FeatureCell
              className="md:col-span-2"
              icon={<BrainIcon size={20} aria-hidden="true" />}
              title={t.marketing.features.weaknessTitle}
              body={t.marketing.features.weaknessBody}
            />
            <FeatureCell
              className="md:col-span-2 bg-surface-sunken"
              icon={<ChartLineUpIcon size={20} aria-hidden="true" />}
              title={t.marketing.features.practiceTitle}
              body={t.marketing.features.practiceBody}
            />
            <FeatureCell
              className="md:col-span-2"
              icon={<CalendarCheckIcon size={20} aria-hidden="true" />}
              title={t.marketing.features.planTitle}
              body={t.marketing.features.planBody}
            />
            <FeatureCell
              className="md:col-span-6 bg-surface-sunken"
              icon={<UsersThreeIcon size={20} aria-hidden="true" />}
              title={t.marketing.features.groupsTitle}
              body={t.marketing.features.groupsBody}
            />
          </div>
        </div>
      </section>

      {/* Anforderungsbereiche: a definition row, a different layout family. */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="max-w-[24ch] text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {t.marketing.afbTitle}
          </h2>
          <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-ink-muted">
            {t.marketing.afbBody}
          </p>

          <dl className="mt-10 divide-y divide-line border-t border-line">
            {(["I", "II", "III"] as const).map((level) => (
              <div
                key={level}
                className="grid gap-2 py-5 sm:grid-cols-12 sm:gap-6"
              >
                <dt className="sm:col-span-3">
                  <span className="tabular text-sm font-semibold text-ink">
                    AFB {level}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-muted">
                    {locale === "de"
                      ? AFB_LABELS[level].de
                      : AFB_LABELS[level].en}
                  </span>
                </dt>
                <dd className="text-sm leading-relaxed text-ink-muted sm:col-span-9">
                  {t.exams.afbExplainer[level]}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Privacy: split text and a short list. */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-20">
          <div>
            <div className="mb-5 flex size-10 items-center justify-center rounded-surface border border-line text-brand-text">
              <LockKeyIcon size={20} aria-hidden="true" />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              {t.marketing.privacyTitle}
            </h2>
          </div>
          <div className="flex flex-col justify-center">
            <p className="max-w-[60ch] text-base leading-relaxed text-ink-muted">
              {t.marketing.privacyBody}
            </p>
            <Link
              href="/datenschutz"
              className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-control text-sm font-medium text-brand-text hover:opacity-80"
            >
              {t.marketing.privacyLink}
              <ArrowRightIcon size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {t.marketing.pricingTitle}
          </h2>
          <p className="mt-3 max-w-[56ch] text-base text-ink-muted">
            {t.marketing.pricingBody}
          </p>
          <div className="mt-10">
            <PricingTable />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-line">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {t.marketing.faqTitle}
          </h2>
          <div className="mt-8">
            <Faq />
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 lg:py-20">
          <h2 className="mx-auto max-w-[18ch] text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {t.marketing.ctaTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-[48ch] text-base text-ink-muted">
            {t.marketing.ctaBody}
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link href="/register">
              {t.marketing.heroCta}
              <ArrowRightIcon size={18} aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function FeatureCell({
  icon,
  title,
  body,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-surface border border-line p-6 ${className || "bg-surface"}`}
    >
      <div className="mb-4 text-brand-text">{icon}</div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-ink-muted">
        {body}
      </p>
    </div>
  );
}
