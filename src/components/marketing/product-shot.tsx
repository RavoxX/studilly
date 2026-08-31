import Image from "next/image";
import { cookies } from "next/headers";
import { THEME_COOKIE, isTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";

/**
 * A real screenshot of the running product, in the reader's theme.
 *
 * These are captures of the actual app, not a UI redrawn in divs. Rebuilding
 * the product out of markup is both a lie and the single clearest sign a page
 * was generated rather than designed, so the marketing site shows the thing
 * itself. The content is one seeded example exam, labelled as such wherever it
 * is shown.
 *
 * Theme handling picks exactly one file rather than downloading both:
 * an explicit theme cookie is resolved here on the server, and "system" falls
 * through to a <picture> whose media query lets the browser fetch only the
 * variant it will display.
 */

const SHOTS = {
  results: { width: 2360, height: 1720 },
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
  const cookieStore = await cookies();
  const cookie = cookieStore.get(THEME_COOKIE)?.value;
  const theme: Theme = isTheme(cookie) ? cookie : "system";

  const { width, height } = SHOTS[name];
  const light = `/product/${name}-light.webp`;
  const dark = `/product/${name}-dark.webp`;

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
