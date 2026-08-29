"use client";

import { useTransition } from "react";
import { GlobeIcon } from "@phosphor-icons/react/dist/ssr";
import { setLocale } from "@/app/actions/preferences";
import { LOCALES, LOCALE_LABELS } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

/**
 * Interface language switch.
 *
 * A segmented control rather than a dropdown: there are exactly two options,
 * and a dropdown for two options is a needless extra interaction.
 */
export function LocaleSwitch({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      aria-busy={pending || undefined}
    >
      <GlobeIcon
        size={16}
        className="text-ink-subtle"
        aria-hidden="true"
      />
      <div
        className="inline-flex rounded-control border border-line p-0.5"
        role="group"
        aria-label={t.nav.language}
      >
        {LOCALES.map((option) => {
          const active = option === locale;
          return (
            <button
              key={option}
              type="button"
              aria-current={active ? "true" : undefined}
              disabled={pending}
              onClick={() => startTransition(() => setLocale(option))}
              className={cn(
                "rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-surface-sunken text-ink"
                  : "text-ink-subtle hover:text-ink",
              )}
            >
              {LOCALE_LABELS[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
