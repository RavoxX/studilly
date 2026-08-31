import Image from "next/image";
import { cookies } from "next/headers";
import { THEME_COOKIE, isTheme, type Theme } from "@/lib/theme";
import { getLocale } from "@/i18n/server";
import { cn } from "@/lib/utils/cn";

/**
 * A real screenshot of the running product, in the reader's language and theme.
 *
 * These are captures of the actual app, not a UI redrawn in divs. Rebuilding
 * the product out of markup is both a lie and the clearest sign a page was
 * generated rather than designed, so the marketing site shows the thing itself.
 * The content is one seeded example exam, labelled as an example wherever it
 * appears.
 *
 * Four variants exist per shot: two interface languages by two themes. The
 * exam content inside them stays German in both, because the interface
 * language and the language of a student's material are independent: an
 * English-speaking user still sits a German Klausur.
 *
 * Exactly one file is ever fetched. The theme cookie is resolved here on the
 * server, and "system" falls through to a <picture> whose media query lets the
 * browser pick without downloading the other.
 */

const SHOTS = {
  results: { width: 2080, height: 1320 },
  marking: { width: 1752, height: 926 },
  writing: { width: 2360, height: 1440 },
} as const;

export type ShotName = keyof typeof SHOTS;

export async function ProductShot({
  name,
  alt,
  sizes,
  priority = false,
  scheme,
  className,
  imageClassName,
}: {
  name: ShotName;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Pins the variant. Used by sections that keep one ground in both themes. */
  scheme?: "light" | "dark";
  className?: string;
  imageClassName?: string;
}) {
  const [cookieStore, locale] = await Promise.all([cookies(), getLocale()]);
  const cookie = cookieStore.get(THEME_COOKIE)?.value;
  const theme: Theme = isTheme(cookie) ? cookie : "system";

  const { width, height } = SHOTS[name];
  const light = `/product/${name}-${locale}-light.webp`;
  const dark = `/product/${name}-${locale}-dark.webp`;

  const image = (src: string) => (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      quality={90}
      className={cn("h-auto w-full", imageClassName)}
    />
  );

  const resolved = scheme ?? (theme === "system" ? null : theme);
  if (resolved === "dark") return <div className={className}>{image(dark)}</div>;
  if (resolved === "light") return <div className={className}>{image(light)}</div>;

  // Following the system: let the browser choose, and download only that one.
  return (
    <div className={className}>
      <picture>
        <source srcSet={dark} media="(prefers-color-scheme: dark)" />
        {image(light)}
      </picture>
    </div>
  );
}
