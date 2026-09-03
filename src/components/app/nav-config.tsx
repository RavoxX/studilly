import {
  BookOpenTextIcon,
  BooksIcon,
  CalendarCheckIcon,
  CardsThreeIcon,
  CreditCardIcon,
  ExamIcon,
  HouseIcon,
  TargetIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Dictionary } from "@/i18n/locales/de";

/**
 * Application navigation.
 *
 * Primary items are the ones a student uses in a normal week. Secondary items
 * are the ones they visit occasionally, so they live at the bottom of the
 * sidebar rather than competing for attention.
 *
 * Settings is not here. It belongs to the account rather than to the app, so
 * it sits in the menu behind the profile at the foot of the sidebar, next to
 * signing out — which is where people look for it.
 *
 * On mobile the primary list is trimmed to four plus a "more" sheet, because
 * a bottom bar with nine items is unusable at thumb size.
 */

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Shown in the mobile bottom bar. */
  primaryMobile?: boolean;
};

export function primaryNav(t: Dictionary): NavItem[] {
  return [
    {
      href: "/dashboard",
      label: t.nav.dashboard,
      icon: <HouseIcon size={19} aria-hidden="true" />,
      primaryMobile: true,
    },
    {
      href: "/materials",
      label: t.nav.materials,
      icon: <BooksIcon size={19} aria-hidden="true" />,
      primaryMobile: true,
    },
    {
      href: "/exams",
      label: t.nav.exams,
      icon: <ExamIcon size={19} aria-hidden="true" />,
      primaryMobile: true,
    },
    {
      href: "/notebooks",
      label: t.nav.notebooks,
      icon: <BookOpenTextIcon size={19} aria-hidden="true" />,
    },
    {
      href: "/practice",
      label: t.nav.practice,
      icon: <TargetIcon size={19} aria-hidden="true" />,
    },
    {
      href: "/learning",
      label: t.nav.learning,
      icon: <CardsThreeIcon size={19} aria-hidden="true" />,
      primaryMobile: true,
    },
    {
      href: "/groups",
      label: t.nav.groups,
      icon: <UsersThreeIcon size={19} aria-hidden="true" />,
    },
  ];
}

export function secondaryNav(t: Dictionary): NavItem[] {
  return [
    {
      href: "/plan",
      label: t.nav.plan,
      icon: <CalendarCheckIcon size={19} aria-hidden="true" />,
    },
    {
      href: "/subscription",
      label: t.nav.subscription,
      icon: <CreditCardIcon size={19} aria-hidden="true" />,
    },
  ];
}
