import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getT } from "@/i18n/server";
import { LocaleSwitch } from "@/components/shared/locale-switch";

export async function SiteFooter() {
  const t = await getT();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-3 max-w-[38ch] text-sm text-ink-muted">
              {t.common.tagline}
            </p>
          </div>

          <nav aria-label={t.marketing.footerProduct}>
            <h2 className="text-sm font-semibold text-ink">
              {t.marketing.footerProduct}
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/#how" className="text-ink-muted hover:text-ink">
                  {t.marketing.navHowItWorks}
                </Link>
              </li>
              <li>
                <Link href="/#features" className="text-ink-muted hover:text-ink">
                  {t.marketing.navFeatures}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-ink-muted hover:text-ink">
                  {t.marketing.navPricing}
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="text-ink-muted hover:text-ink">
                  {t.marketing.navFaq}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={t.marketing.footerLegal}>
            <h2 className="text-sm font-semibold text-ink">
              {t.marketing.footerLegal}
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/datenschutz" className="text-ink-muted hover:text-ink">
                  {t.marketing.footerPrivacy}
                </Link>
              </li>
              <li>
                <Link href="/agb" className="text-ink-muted hover:text-ink">
                  {t.marketing.footerTerms}
                </Link>
              </li>
              <li>
                <Link href="/impressum" className="text-ink-muted hover:text-ink">
                  {t.marketing.footerImprint}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col-reverse items-start justify-between gap-4 border-t border-line pt-6 sm:flex-row sm:items-center">
          <p className="text-sm text-ink-subtle">
            {t.marketing.footerCopyright(year)}
          </p>
          <LocaleSwitch />
        </div>
      </div>
    </footer>
  );
}
