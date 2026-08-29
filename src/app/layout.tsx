import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

import { I18nProvider } from "@/i18n/client";
import { getLocale } from "@/i18n/server";
import { dictionaryFor } from "@/i18n/server";
import { THEME_COOKIE, isTheme, themeAttribute } from "@/lib/theme";

/**
 * Geist and Geist Mono, self-hosted through next/font.
 *
 * Geist is a neutral, highly legible grotesque, which is what an exam-prep
 * tool needs: students read long German compound nouns on this for an hour at
 * a time. The mono face carries every number in the product (marks, grades,
 * timers) so digits stay tabular and columns do not shift as values change.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Studilly",
    template: "%s · Studilly",
  },
  description:
    "Studilly macht aus deinen Unterlagen realistische Übungsklausuren, korrigiert sie und zeigt dir, woran du arbeiten musst.",
  applicationName: "Studilly",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The exam runner needs a stable viewport; disabling zoom would fail
  // accessibility, so only the initial scale is fixed.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0f14" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, cookieStore] = await Promise.all([getLocale(), cookies()]);

  const themeCookie = cookieStore.get(THEME_COOKIE)?.value;
  const theme = isTheme(themeCookie) ? themeCookie : "system";
  const attribute = themeAttribute(theme);
  const dictionary = dictionaryFor(locale);

  return (
    <html
      lang={locale}
      // Resolved on the server, so there is no flash of the wrong theme and
      // no blocking inline script.
      {...(attribute ? { "data-theme": attribute } : {})}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <a
          href="#main"
          className="sr-only rounded-control bg-brand px-4 py-2 text-on-brand focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          {dictionary.common.skipToContent}
        </a>
        {/* The provider resolves the dictionary itself: it contains functions
            for interpolation, which cannot be passed across this boundary. */}
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
