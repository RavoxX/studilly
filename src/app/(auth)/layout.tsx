import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitch } from "@/components/shared/locale-switch";
import { getT } from "@/i18n/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getT();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-4 py-5 sm:px-6">
        <Link href="/" className="inline-block rounded-control" aria-label="Studilly">
          <Logo priority />
        </Link>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-[26rem]">{children}</div>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <nav className="flex gap-5 text-sm text-ink-subtle">
          <Link href="/datenschutz" className="hover:text-ink">
            {t.marketing.footerPrivacy}
          </Link>
          <Link href="/agb" className="hover:text-ink">
            {t.marketing.footerTerms}
          </Link>
          <Link href="/impressum" className="hover:text-ink">
            {t.marketing.footerImprint}
          </Link>
        </nav>
        <LocaleSwitch />
      </footer>
    </div>
  );
}
