"use client";

import { useTransition } from "react";
import {
  DesktopIcon,
  MoonIcon,
  SunIcon,
} from "@phosphor-icons/react/dist/ssr";
import { setTheme } from "@/app/actions/preferences";
import { THEMES, type Theme } from "@/lib/theme";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<Theme, React.ReactNode> = {
  system: <DesktopIcon size={15} aria-hidden="true" />,
  light: <SunIcon size={15} aria-hidden="true" />,
  dark: <MoonIcon size={15} aria-hidden="true" />,
};

export function ThemeSwitch({
  current,
  className,
}: {
  current: Theme;
  className?: string;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={cn("inline-flex rounded-control border border-line p-0.5", className)}
      role="group"
      aria-label={t.nav.theme}
      aria-busy={pending || undefined}
    >
      {THEMES.map((option) => {
        const active = option === current;
        return (
          <button
            key={option}
            type="button"
            aria-current={active ? "true" : undefined}
            disabled={pending}
            title={t.theme[option]}
            onClick={() => startTransition(() => setTheme(option))}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-surface-sunken text-ink"
                : "text-ink-subtle hover:text-ink",
            )}
          >
            {ICONS[option]}
            <span className="sr-only sm:not-sr-only">{t.theme[option]}</span>
          </button>
        );
      })}
    </div>
  );
}
