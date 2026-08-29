import type { Locale } from "@/i18n/config";

/**
 * Formatting helpers.
 *
 * All of these go through `Intl` with the active locale, so a German student
 * sees 28.08.2026 and 8,5 Punkte while an English one sees 28 Aug 2026 and
 * 8.5 points. Hand-rolled formatting would get the German decimal comma and
 * the date order wrong.
 */

const intlLocale = (locale: Locale) => (locale === "de" ? "de-DE" : "en-GB");

export function formatDate(
  value: string | Date,
  locale: Locale,
  style: "short" | "long" = "short",
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: style === "long" ? "long" : "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date, locale: Locale): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Whole days from today to a date. Negative when the date has passed. */
export function daysUntil(value: string | Date, from: Date = new Date()): number {
  const target = typeof value === "string" ? new Date(value) : value;
  const startOfTarget = Date.UTC(
    target.getUTCFullYear(),
    target.getUTCMonth(),
    target.getUTCDate(),
  );
  const startOfToday = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );
  return Math.round((startOfTarget - startOfToday) / (24 * 60 * 60 * 1000));
}

/** Numbers with the locale's decimal separator, trailing zeros trimmed. */
export function formatNumber(
  value: number,
  locale: Locale,
  maximumFractionDigits = 1,
): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    maximumFractionDigits,
  }).format(value);
}

export function formatPercent(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

/** A duration in seconds as mm:ss, or h:mm:ss past an hour. */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(secs)}`
    : `${pad(minutes)}:${pad(secs)}`;
}

export function formatBytes(bytes: number, locale: Locale): string {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${formatNumber(bytes / 1024, locale, 0)} KB`;
  if (mb < 1024) return `${formatNumber(mb, locale, 1)} MB`;
  return `${formatNumber(mb / 1024, locale, 2)} GB`;
}

/**
 * Renders a grade for display.
 *
 * The Oberstufe thinks in Notenpunkte but students also want the equivalent
 * mark, so both are shown. Sekundarstufe I just gets the mark.
 */
export function formatGrade(
  value: number,
  label: string,
  scaleType: "note" | "notenpunkte",
  locale: Locale,
): { primary: string; secondary: string | null } {
  if (scaleType === "notenpunkte") {
    const asNote = (17 - value) / 3;
    return {
      primary: `${value}`,
      secondary: `${locale === "de" ? "entspricht Note" : "equals mark"} ${formatNumber(asNote, locale, 1)}`,
    };
  }
  return { primary: label, secondary: null };
}
