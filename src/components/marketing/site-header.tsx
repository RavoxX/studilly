"use client";

import Link from "next/link";
import { useState } from "react";
import { ListIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

/**
 * Marketing header.
 *
 * Single line at desktop, 64px tall. Collapses to a disclosure below `md`
 * rather than shrinking the desktop layout.
 */
export function SiteHeader() {
  const t = useT();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/#how", label: t.marketing.navHowItWorks },
    { href: "/#features", label: t.marketing.navFeatures },
    { href: "/pricing", label: t.marketing.navPricing },
    { href: "/#faq", label: t.marketing.navFaq },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="rounded-control"
          aria-label="Studilly"
          onClick={() => setOpen(false)}
        >
          <Logo priority />
        </Link>

        <nav
          className="hidden items-center gap-7 md:flex"
          aria-label={t.a11y.mainNavigation}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-control text-sm text-ink-muted transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">{t.marketing.login}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">{t.marketing.getStarted}</Link>
          </Button>
        </div>

        <button
          type="button"
          className="-mr-2 inline-flex size-10 items-center justify-center rounded-control text-ink-muted md:hidden"
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? t.common.closeMenu : t.common.openMenu}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <XIcon size={20} /> : <ListIcon size={20} />}
        </button>
      </div>

      <div
        id="site-menu"
        className={cn(
          "border-t border-line bg-canvas md:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav className="mx-auto max-w-6xl px-4 py-3" aria-label={t.a11y.mainNavigation}>
          <ul className="divide-y divide-line">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block py-3 text-sm text-ink"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2 pb-2">
            <Button variant="secondary" asChild>
              <Link href="/login" onClick={() => setOpen(false)}>
                {t.marketing.login}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/register" onClick={() => setOpen(false)}>
                {t.marketing.getStarted}
              </Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
