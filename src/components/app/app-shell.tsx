"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { DotsThreeIcon, SignOutIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { Logo, LogoMark } from "@/components/brand/logo";
import { primaryNav, secondaryNav, type NavItem } from "./nav-config";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";
import type { PlanTier } from "@/config/plans";

/**
 * The authenticated shell.
 *
 * Desktop gets a persistent sidebar. Mobile gets a bottom tab bar with the
 * four routes a student actually taps, plus a sheet for the rest. The mobile
 * layout is built for the thumb rather than being the desktop sidebar
 * squeezed narrower.
 */
export function AppShell({
  displayName,
  plan,
  children,
}: {
  displayName: string;
  plan: PlanTier;
  children: React.ReactNode;
}) {
  const t = useT();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = primaryNav(t);
  const secondary = secondaryNav(t);
  const mobilePrimary = primary.filter((item) => item.primaryMobile);
  const mobileRest = [
    ...primary.filter((item) => !item.primaryMobile),
    ...secondary,
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
        <div className="px-5 py-5">
          <Link href="/dashboard" className="inline-block rounded-control" aria-label="Studilly">
            <Logo priority />
          </Link>
        </div>

        <nav className="flex-1 px-3" aria-label={t.a11y.mainNavigation}>
          <ul className="space-y-0.5">
            {primary.map((item) => (
              <li key={item.href}>
                <SidebarLink item={item} active={isActive(item.href)} />
              </li>
            ))}
          </ul>

          <div className="my-4 border-t border-line" />

          <ul className="space-y-0.5">
            {secondary.map((item) => (
              <li key={item.href}>
                <SidebarLink item={item} active={isActive(item.href)} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-control px-2 py-2">
            <Avatar name={displayName} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {displayName || t.nav.account}
              </p>
              <p className="text-xs text-ink-subtle">{t.plans[plan].name}</p>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex size-8 items-center justify-center rounded-control text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
                aria-label={t.nav.logout}
                title={t.nav.logout}
              >
                <SignOutIcon size={17} aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/90 px-4 backdrop-blur-sm lg:hidden">
        <Link href="/dashboard" className="rounded-control" aria-label="Studilly">
          <Logo size={24} priority />
        </Link>
        <div className="flex items-center gap-2">
          <Avatar name={displayName} />
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <main
          id="main"
          className="flex-1 px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8"
        >
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      {/* Mobile bottom bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 backdrop-blur-sm lg:hidden"
        aria-label={t.a11y.mainNavigation}
      >
        <ul className="grid grid-cols-5">
          {mobilePrimary.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[0.6875rem] font-medium transition-colors",
                  isActive(item.href) ? "text-brand-text" : "text-ink-subtle",
                )}
              >
                {item.icon}
                <span className="max-w-full truncate px-1">{item.label}</span>
              </Link>
            </li>
          ))}
          <li>
            <Dialog.Root open={moreOpen} onOpenChange={setMoreOpen}>
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  className="flex w-full flex-col items-center gap-1 py-2.5 text-[0.6875rem] font-medium text-ink-subtle"
                >
                  <DotsThreeIcon size={19} aria-hidden="true" />
                  <span>{t.common.moreOptions}</span>
                </button>
              </Dialog.Trigger>

              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
                <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-surface border-t border-line bg-surface p-4 pb-8">
                  <div className="mb-3 flex items-center justify-between">
                    <Dialog.Title className="text-base font-semibold text-ink">
                      {t.common.moreOptions}
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="inline-flex size-9 items-center justify-center rounded-control text-ink-subtle"
                        aria-label={t.common.close}
                      >
                        <XIcon size={18} aria-hidden="true" />
                      </button>
                    </Dialog.Close>
                  </div>

                  <ul className="divide-y divide-line">
                    {mobileRest.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          className="flex items-center gap-3 py-3.5 text-sm text-ink"
                        >
                          <span className="text-ink-subtle">{item.icon}</span>
                          {item.label}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <form action="/auth/signout" method="post">
                        <button
                          type="submit"
                          className="flex w-full items-center gap-3 py-3.5 text-sm text-ink"
                        >
                          <span className="text-ink-subtle">
                            <SignOutIcon size={19} aria-hidden="true" />
                          </span>
                          {t.nav.logout}
                        </button>
                      </form>
                    </li>
                  </ul>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </li>
        </ul>
      </nav>
    </div>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-brand-soft text-brand-text"
          : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
      )}
    >
      <span className={active ? "text-brand-text" : "text-ink-subtle"}>
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

/**
 * Initials rather than a generated avatar image. Study groups show only a
 * display name, so there is no photo to show and inventing one would be
 * fabricating identity.
 */
function Avatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-brand-soft text-xs font-semibold text-brand-text"
      aria-hidden="true"
    >
      {initials || <LogoMark size={16} />}
    </span>
  );
}
