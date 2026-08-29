import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  negotiateLocale,
  type Locale,
} from "./config";
import { de, type Dictionary } from "./locales/de";
import { en } from "./locales/en";

const DICTIONARIES: Record<Locale, Dictionary> = { de, en };

/**
 * Resolves the interface language for the current request.
 *
 * Order of precedence:
 *   1. The locale cookie, which is written whenever the user picks a language
 *      (and kept in sync with their saved profile preference).
 *   2. The Accept-Language header, for a first visit.
 *   3. German.
 *
 * Note this is the INTERFACE language only. It never constrains the language
 * of a student's materials or of generated exam content.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  try {
    const headerList = await headers();
    return negotiateLocale(headerList.get("accept-language"));
  } catch {
    return DEFAULT_LOCALE;
  }
});

/** The dictionary for the current request. */
export const getDictionary = cache(async (): Promise<Dictionary> => {
  const locale = await getLocale();
  return DICTIONARIES[locale];
});

/** Convenience alias matching the `t` naming used in components. */
export const getT = getDictionary;

export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
