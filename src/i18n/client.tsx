"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./config";
import { de, type Dictionary } from "./locales/de";
import { en } from "./locales/en";

/**
 * Dictionary access in Client Components.
 *
 * The provider takes only the LOCALE and resolves the dictionary itself.
 *
 * It cannot take the dictionary as a prop: entries that interpolate are
 * functions (`t.dashboard.greeting(name)`), and functions cannot cross the
 * server/client boundary. Passing the object down throws at runtime with
 * "Functions cannot be passed directly to Client Components".
 *
 * The cost is that both locales end up in the client bundle. They are plain
 * objects and small string tables, which is a fair trade for keeping
 * interpolation as ordinary typed function calls rather than a stringly-typed
 * `t("key", { name })` lookup.
 *
 * Server Components take the same dictionaries directly from `./server`.
 */
const DICTIONARIES: Record<Locale, Dictionary> = { de, en };

type I18nValue = {
  locale: Locale;
  t: Dictionary;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({ locale, t: DICTIONARIES[locale] }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used inside <I18nProvider>.");
  }
  return value;
}

/** Shorthand for the common case. */
export function useT(): Dictionary {
  return useI18n().t;
}
