import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { ProductShot } from "@/components/marketing/product-shot";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Faq } from "@/components/marketing/faq";
import { getLocale, getT } from "@/i18n/server";
import { BUNDESLAENDER, SCHOOL_SYSTEM } from "@/config/education";

/**
 * Marketing home.
 *
 * Composition notes, since they are the whole point of this file:
 *
 * Every section deliberately uses a different structure. A page where each
 * band is "centred heading over a row of equal cards" reads as generated no
 * matter how good the copy is, so the rhythm here goes split hero, hairline
 * fact row, numbered list, full-bleed dark block, asymmetric grid, definition
 * list, slim band, table, accordion. No two neighbours share a shape.
 *
 * The product is shown, not described: three real screenshots of the running
 * app carry the hero, the marking section and the writing feature. Nothing on
 * this page is a UI redrawn in markup.
 *
 * There are no eyebrow labels, no icon-in-a-rounded-square chips and no
 * decorative dots. Hierarchy comes from size, weight and ground colour.
 */

/** The stagger index a reveal-item reads from CSS. */
const order = (index: number) => ({ "--i": index }) as React.CSSProperties;

export default async function LandingPage() {
  const t = await getT();
  const locale = await getLocale();

  const steps: { title: string; body: string; shot?: boolean }[] = [
    { title: t.marketing.how.uploadTitle, body: t.marketing.how.uploadBody },
    { title: t.marketing.how.generateTitle, body: t.marketing.how.generateBody },
    { title: t.marketing.how.writeTitle, body: t.marketing.how.writeBody, shot: true },
    { title: t.marketing.how.feedbackTitle, body: t.marketing.how.feedbackBody },
  ];

  const facts = [
    {
      value: t.marketing.facts.laenderValue,
      label: t.marketing.facts.laenderLabel,
      note: t.marketing.facts.laenderNote,
    },
    {
      value: t.marketing.facts.afbValue,
      label: t.marketing.facts.afbLabel,
      note: t.marketing.facts.afbNote,
    },
    {
      value: t.marketing.facts.gradeValue,
      label: t.marketing.facts.gradeLabel,
      note: t.marketing.facts.gradeNote,
    },
  ];

  return (
    <>
      {/* Hero. Copy left, the app right, and the screenshot shown whole:
          the column is 7/12 rather than half so the capture can sit inside it
          at a readable size instead of being cropped to fit. Nothing runs off
          the edge, at any width. */}
      <section className="relative">
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:pb-24 lg:pt-20">
          <div className="lg:col-span-5">
            <h1 className="text-balance text-[2.375rem] font-semibold leading-[1.07] tracking-[-0.025em] text-ink sm:text-[2.75rem] lg:text-[2.875rem]">
              {t.marketing.heroTitle}
            </h1>
            <p className="mt-6 max-w-[44ch] text-[1.0625rem] leading-relaxed text-ink-muted">
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

          <figure className="parallax lg:col-span-7">
            <ProductShot
              name="results"
              alt={t.marketing.heroShotAlt}
              sizes="(max-width: 1024px) 100vw, 672px"
              priority
              className="overflow-hidden rounded-surface border border-line shadow-lg"
            />
            <figcaption className="mt-3 text-xs text-ink-subtle">
              {t.marketing.heroShotCaption}
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Three facts on hairlines. This is where a logo wall would go on a
          site that had customers to show; stating what the product actually
          does is the honest version of the same slot. */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-px overflow-hidden px-4 sm:px-6 md:grid-cols-3">
          {facts.map((fact, index) => (
            <div
              key={fact.label}
              style={order(index)}
              className="reveal-item py-10 md:border-l md:border-line md:px-8 md:first:border-l-0 md:first:pl-0 md:last:pr-0"
            >
              <p className="text-[2.75rem] font-semibold leading-none tracking-[-0.03em] text-ink">
                {fact.value}
              </p>
              <p className="mt-1 text-sm font-medium text-ink">{fact.label}</p>
              <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-ink-muted">
                {fact.note}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works: a numbered list against a held heading. The steps are
          genuinely sequential, so they read as a list rather than a card row. */}
      <section id="how" className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:py-28">
          <div className="reveal lg:col-span-5">
            {/* Held in place while the steps pass it: the heading is the frame
                for all four, not a label for the first one. */}
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.02em] text-ink md:text-[2.5rem] md:leading-[1.1] lg:sticky lg:top-28">
              {t.marketing.howTitle}
            </h2>
          </div>

          <ol className="lg:col-span-7 lg:pt-2">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="reveal-item grid grid-cols-[2.5rem_1fr] gap-x-5 border-t border-line py-7 first:border-t-0 first:pt-0 sm:grid-cols-[3.5rem_1fr]"
              >
                <span
                  className="tabular text-sm font-medium text-ink-subtle"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-[58ch] leading-relaxed text-ink-muted">
                    {step.body}
                  </p>
                  {/* One step gets a picture, and it is the step you can see:
                      writing the paper. Breaking the list here on purpose. */}
                  {step.shot ? (
                    <ProductShot
                      name="writing"
                      alt={t.marketing.writingShotAlt}
                      sizes="(max-width: 1024px) 100vw, 45vw"
                      className="reveal-media mt-5 overflow-hidden rounded-surface border border-line shadow-sm"
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The one dark block on the page, spent on the thing that separates
          Studilly from a chatbot: marking against a criterion list. */}
      <section className="border-y border-white/[0.07] bg-[#0d1117] text-[#e8ebf0]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:py-28">
          <div className="reveal lg:col-span-5">
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.02em] md:text-[2.5rem] md:leading-[1.1]">
              {t.marketing.markingTitle}
            </h2>
            <p className="mt-5 max-w-[46ch] leading-relaxed text-[#a3adbb]">
              {t.marketing.markingBody}
            </p>
            <ul className="mt-8 space-y-3.5">
              {[
                t.marketing.markingPoints.one,
                t.marketing.markingPoints.two,
                t.marketing.markingPoints.three,
              ].map((point) => (
                <li
                  key={point}
                  className="border-l border-[#8caaff]/40 pl-4 text-sm leading-relaxed text-[#c9d1dc]"
                >
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="parallax lg:col-span-7">
            <ProductShot
              name="marking"
              alt={t.marketing.markingShotAlt}
              scheme="dark"
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="reveal-media overflow-hidden rounded-surface border border-white/10 shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Features. Six cells for six features, with the grounds varied so it
          does not become six white boxes: one carries a screenshot, one the
          actual list of Länder, one a tinted panel. */}
      <section id="features" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <h2 className="reveal max-w-[16ch] text-balance text-3xl font-semibold tracking-[-0.02em] text-ink md:text-[2.5rem] md:leading-[1.1]">
            {t.marketing.featuresTitle}
          </h2>

          <div className="mt-12 grid gap-4 md:grid-cols-6">
            {/* Wide: the Länder are the claim, so they are printed out. */}
            <div style={order(0)} className="reveal-item rounded-surface border border-line bg-surface p-7 md:col-span-4">
              <h3 className="text-lg font-semibold text-ink">
                {t.marketing.features.curriculumTitle}
              </h3>
              <p className="mt-2 max-w-[54ch] leading-relaxed text-ink-muted">
                {t.marketing.features.curriculumBody}
              </p>
              <ul className="mt-6 flex flex-wrap gap-1.5">
                {BUNDESLAENDER.map((code) => (
                  <li
                    key={code}
                    className="rounded-pill border border-line px-2.5 py-1 text-xs text-ink-muted"
                  >
                    {locale === "de"
                      ? SCHOOL_SYSTEM[code].nameDe
                      : SCHOOL_SYSTEM[code].nameEn}
                  </li>
                ))}
              </ul>
            </div>

            {/* The claim that carries the product, so it gets the colour and
                a larger setting rather than another equal box. */}
            <div style={order(1)} className="reveal-item flex flex-col justify-center rounded-surface border border-line bg-brand-soft p-7 md:col-span-2">
              <h3 className="text-xl font-semibold text-ink">
                {t.marketing.features.gradingTitle}
              </h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-muted">
                {t.marketing.features.gradingBody}
              </p>
            </div>

            <div style={order(2)} className="reveal-item rounded-surface border border-line bg-surface p-7 md:col-span-3">
              <h3 className="text-lg font-semibold text-ink">
                {t.marketing.features.weaknessTitle}
              </h3>
              <p className="mt-2 leading-relaxed text-ink-muted">
                {t.marketing.features.weaknessBody}
              </p>
            </div>

            <div style={order(3)} className="reveal-item rounded-surface border border-line bg-surface p-7 md:col-span-3">
              <h3 className="text-lg font-semibold text-ink">
                {t.marketing.features.practiceTitle}
              </h3>
              <p className="mt-2 leading-relaxed text-ink-muted">
                {t.marketing.features.practiceBody}
              </p>
            </div>

            <div style={order(4)} className="reveal-item rounded-surface border border-line bg-surface p-7 md:col-span-2">
              <h3 className="text-lg font-semibold text-ink">
                {t.marketing.features.planTitle}
              </h3>
              <p className="mt-2 leading-relaxed text-ink-muted">
                {t.marketing.features.planBody}
              </p>
            </div>

            <div style={order(5)} className="reveal-item rounded-surface border border-line bg-surface-sunken p-7 md:col-span-4">
              <h3 className="text-lg font-semibold text-ink">
                {t.marketing.features.groupsTitle}
              </h3>
              <p className="mt-2 max-w-[62ch] leading-relaxed text-ink-muted">
                {t.marketing.features.groupsBody}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Anforderungsbereiche: a definition list, the one place on the page
          where a table-like shape is the right answer. */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <h2 className="reveal max-w-[22ch] text-balance text-3xl font-semibold tracking-[-0.02em] text-ink md:text-[2.5rem] md:leading-[1.1]">
            {t.marketing.afbTitle}
          </h2>
          <p className="reveal mt-5 max-w-[60ch] leading-relaxed text-ink-muted">
            {t.marketing.afbBody}
          </p>

          <dl className="mt-12">
            {(["I", "II", "III"] as const).map((level) => (
              <div
                key={level}
                className="reveal-item grid gap-3 border-t border-line py-7 sm:grid-cols-12 sm:gap-8"
              >
                <dt className="text-2xl font-semibold tracking-[-0.02em] text-ink sm:col-span-3">
                  AFB {level}
                </dt>
                <dd className="leading-relaxed text-ink-muted sm:col-span-9">
                  {t.exams.afbExplainer[level]}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Privacy as a slim band rather than a full section: it matters, but it
          is a promise, not a feature to browse. */}
      <section className="border-b border-line">
        <div className="reveal mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
          <div>
            <h2 className="text-xl font-semibold text-ink">
              {t.marketing.privacyTitle}
            </h2>
            <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-ink-muted">
              {t.marketing.privacyBody}
            </p>
          </div>
          <Link
            href="/datenschutz"
            className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-control text-sm font-medium text-brand-text transition-opacity hover:opacity-80"
          >
            {t.marketing.privacyLink}
            <ArrowRightIcon size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section id="pricing" className="border-b border-line bg-surface">
        <div className="reveal mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-ink md:text-[2.5rem] md:leading-[1.1]">
            {t.marketing.pricingTitle}
          </h2>
          <p className="mt-4 max-w-[54ch] leading-relaxed text-ink-muted">
            {t.marketing.pricingBody}
          </p>
          <div className="mt-12">
            <PricingTable />
          </div>
        </div>
      </section>

      <section id="faq" className="border-b border-line">
        <div className="reveal mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:py-28">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-ink md:text-[2.5rem] md:leading-[1.1] lg:col-span-4">
            {t.marketing.faqTitle}
          </h2>
          <div className="lg:col-span-8">
            <Faq />
          </div>
        </div>
      </section>

      {/* Closing. The only centred block on the page, so it lands. */}
      <section className="bg-surface">
        <div className="reveal mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
          <h2 className="mx-auto max-w-[16ch] text-balance text-3xl font-semibold tracking-[-0.02em] text-ink md:text-[2.75rem] md:leading-[1.1]">
            {t.marketing.ctaTitle}
          </h2>
          <p className="mx-auto mt-5 max-w-[46ch] leading-relaxed text-ink-muted">
            {t.marketing.ctaBody}
          </p>
          <Button size="lg" className="mt-9" asChild>
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
