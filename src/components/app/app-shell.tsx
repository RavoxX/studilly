"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  DotsThreeIcon,
  GearSixIcon,
  SidebarSimpleIcon,
  SignOutIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Logo, LogoMark } from "@/components/brand/logo";
import { primaryNav, secondaryNav, type NavItem } from "./nav-config";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";
import { SIDEBAR_COOKIE, SIDEBAR_COOKIE_MAX_AGE } from "@/lib/sidebar";
import type { PlanTier } from "@/config/plans";

/**
 * The authenticated shell.
 *
 * Desktop gets a persistent sidebar. Mobile gets a bottom tab bar with the
 * four routes a student actually taps, plus a sheet for the rest. The mobile
 * layout is built for the thumb rather than being the desktop sidebar
 * squeezed narrower.
 *
 * The sidebar collapses to icons. Its state is written to a cookie from here
 * rather than through a server action, so the toggle is instant and the
 * server still renders the right width on the next load: an expanded sidebar
 * that snaps shut after hydration shifts the whole page sideways.
 */
export function AppShell({
  displayName,
  avatarUrl,
  plan,
  collapsed: initialCollapsed,
  children,
}: {
  displayName: string;
  avatarUrl: string | null;
  plan: PlanTier;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  const t = useT();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = [
      `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}`,
      "path=/",
      `max-age=${SIDEBAR_COOKIE_MAX_AGE}`,
      "samesite=lax",
    ].join("; ");
  }

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
    <Tooltip.Provider delayDuration={300}>
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden flex-col border-r border-line bg-surface lg:flex",
          // Width is the only thing that animates. Fading the labels as well
          // reads as a page redrawing itself rather than a panel narrowing.
          "transition-[width] duration-200",
          collapsed ? "w-[4.5rem]" : "w-60",
        )}
      >
        <div
          className={cn(
            "flex items-center py-5",
            collapsed ? "justify-center px-3" : "justify-between px-5",
          )}
        >
          {collapsed ? (
            <Link href="/dashboard" className="rounded-control" aria-label="Studilly">
              <LogoMark size={26} />
            </Link>
          ) : (
            <Link href="/dashboard" className="inline-block rounded-control" aria-label="Studilly">
              <Logo priority />
            </Link>
          )}

          {!collapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={t.nav.collapseSidebar}
              title={t.nav.collapseSidebar}
              className="inline-flex size-8 items-center justify-center rounded-control text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              <SidebarSimpleIcon size={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <nav
          className={cn("flex-1", collapsed ? "px-3" : "px-3")}
          aria-label={t.a11y.mainNavigation}
        >
          <ul className="space-y-0.5">
            {primary.map((item) => (
              <li key={item.href}>
                <SidebarLink
                  item={item}
                  active={isActive(item.href)}
                  collapsed={collapsed}
                />
              </li>
            ))}
          </ul>

          <div className="my-4 border-t border-line" />

          <ul className="space-y-0.5">
            {secondary.map((item) => (
              <li key={item.href}>
                <SidebarLink
                  item={item}
                  active={isActive(item.href)}
                  collapsed={collapsed}
                />
              </li>
            ))}
          </ul>

          {/* Collapsed, the toggle moves into the nav column: there is no room
              for it beside a logo that is now the width of an icon. */}
          {collapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={t.nav.expandSidebar}
              title={t.nav.expandSidebar}
              className="mt-4 flex w-full items-center justify-center rounded-control py-2 text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              <SidebarSimpleIcon size={19} aria-hidden="true" />
            </button>
          ) : null}
        </nav>

        <div className="border-t border-line p-3">
          <ProfileMenu
            displayName={displayName}
            avatarUrl={avatarUrl}
            plan={plan}
            collapsed={collapsed}
          />
        </div>
      </aside>

      {/* Mobile header */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/90 px-4 backdrop-blur-sm lg:hidden">
        <Link href="/dashboard" className="rounded-control" aria-label="Studilly">
          <Logo size={24} priority />
        </Link>
        <div className="flex items-center gap-2">
          <Avatar name={displayName} url={avatarUrl} />
        </div>
      </header>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-[4.5rem]" : "lg:pl-60",
        )}
      >
        <main
          id="main"
          className="flex-1 px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8"
        >
          <div
            className={cn(
              "mx-auto w-full",
              // A collapsed sidebar is a request for more room, so the content
              // column widens with it rather than leaving the space empty.
              collapsed ? "max-w-6xl" : "max-w-5xl",
            )}
          >
            {children}
          </div>
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
                    {/* Settings left the nav list for the profile menu, which
                        the phone layout does not have, so it is named here
                        beside signing out. */}
                    <li>
                      <Link
                        href="/settings"
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-3 py-3.5 text-sm text-ink"
                      >
                        <span className="text-ink-subtle">
                          <GearSixIcon size={19} aria-hidden="true" />
                        </span>
                        {t.nav.settings}
                      </Link>
                    </li>
                    <li>
                      <form action="/auth/signout" method="post">
                        <button
                          type="submit"
                          className="flex w-full items-center gap-3 py-3.5 text-sm text-danger"
                        >
                          <SignOutIcon size={19} aria-hidden="true" />
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
    </Tooltip.Provider>
  );
}

/**
 * The account, and the two things you do with it.
 *
 * Settings used to be a nav item, which put a page about the account in a
 * list of places to study. Behind the profile is where people look for it,
 * and it shares that menu with signing out because both belong to the person
 * rather than to the app.
 */
function ProfileMenu({
  displayName,
  avatarUrl,
  plan,
  collapsed,
}: {
  displayName: string;
  avatarUrl: string | null;
  plan: PlanTier;
  collapsed: boolean;
}) {
  const t = useT();
  const signOut = useRef<HTMLFormElement>(null);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={t.nav.account}
          className={cn(
            "flex w-full items-center rounded-control py-2 text-left transition-colors hover:bg-surface-sunken",
            collapsed ? "justify-center px-0" : "gap-3 px-2",
          )}
        >
          <Avatar name={displayName} url={avatarUrl} />
          {!collapsed ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">
                {displayName || t.nav.account}
              </span>
              <span className="block text-xs text-ink-subtle">
                {t.plans[plan].name}
              </span>
            </span>
          ) : null}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={8}
          className="z-50 min-w-52 rounded-surface border border-line bg-surface p-1 shadow-lg"
        >
          <DropdownMenu.Item asChild>
            <Link
              href="/settings"
              className="flex cursor-pointer items-center gap-2.5 rounded-control px-3 py-2 text-sm text-ink outline-none data-[highlighted]:bg-surface-sunken"
            >
              <GearSixIcon size={16} aria-hidden="true" className="text-ink-subtle" />
              {t.nav.settings}
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-line" />

          {/* A real POST, so signing out cannot be triggered by a link
              someone else sends. The form lives outside the menu item and is
              submitted on select: Radix closes the menu when an item is
              chosen, which unmounted the form before its own click could
              reach it, so nothing happened. */}
          <form ref={signOut} action="/auth/signout" method="post" className="contents">
            <DropdownMenu.Item
              onSelect={(event) => {
                event.preventDefault();
                signOut.current?.requestSubmit();
              }}
              className="flex cursor-pointer items-center gap-2.5 rounded-control px-3 py-2 text-sm text-danger outline-none data-[highlighted]:bg-danger-soft"
            >
              <SignOutIcon size={16} aria-hidden="true" />
              {t.nav.logout}
            </DropdownMenu.Item>
          </form>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function SidebarLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      // Collapsed there is no visible label, so the icon needs a name of its
      // own; the tooltip is for the eye, this is for everything else.
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center rounded-control py-2 text-sm font-medium transition-colors",
        collapsed ? "justify-center px-0" : "gap-3 px-3",
        active
          ? "bg-brand-soft text-brand-text"
          : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
      )}
    >
      <span className={active ? "text-brand-text" : "text-ink-subtle"}>
        {item.icon}
      </span>
      {!collapsed ? item.label : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={8}
          className="z-50 rounded-control border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink shadow-lg"
        >
          {item.label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/**
 * The picture from the identity provider, or initials.
 *
 * A photo is shown only when the provider actually gave us one — signing in
 * with Google supplies it, an email account does not — because a generated
 * face for someone who never chose one would be inventing an identity. If the
 * URL stops resolving, which it does when a Google avatar is changed, the
 * initials come back rather than a broken image.
 */
function Avatar({ name, url }: { name: string; url?: string | null }) {
  const [failed, setFailed] = useState(false);

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (url && !failed) {
    return (
      <Image
        src={url}
        alt=""
        width={32}
        height={32}
        // Served through the optimiser, so the request stays same-origin: the
        // CSP allows no external images, and Google is not told which pages
        // the student is on.
        aria-hidden="true"
        onError={() => setFailed(true)}
        className="size-8 shrink-0 rounded-pill object-cover"
      />
    );
  }

  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-brand-soft text-xs font-semibold text-brand-text"
      aria-hidden="true"
    >
      {initials || <LogoMark size={16} />}
    </span>
  );
}
