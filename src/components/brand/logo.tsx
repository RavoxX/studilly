import Image from "next/image";
import { cn } from "@/lib/utils/cn";

/**
 * The Studilly mark.
 *
 * `logo-mark.png` is the supplied `logo.png` with its white surround removed
 * and the canvas cropped to the artwork. The mark itself, including its
 * blue-to-violet gradient, is untouched; only the background was made
 * transparent so it can sit on a dark header without a white square around it.
 * The original file is kept at `public/logo.png`.
 *
 * Never restyle the mark: no filters, no recolouring, no extra effects.
 */

export function LogoMark({
  size = 28,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo-mark.png"
      alt=""
      width={size}
      height={Math.round(size * (574 / 507))}
      className={cn("shrink-0 select-none", className)}
      priority={priority}
      aria-hidden="true"
    />
  );
}

/**
 * Mark plus wordmark. The wordmark is set in the interface typeface rather
 * than baked into an image, so it stays crisp and inherits the theme.
 */
export function Logo({
  size = 26,
  className,
  showWordmark = true,
  priority = false,
}: {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  priority?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} priority={priority} />
      {showWordmark ? (
        <span className="text-[1.0625rem] font-semibold tracking-tight text-ink">
          Studilly
        </span>
      ) : null}
      <span className="sr-only">Studilly</span>
    </span>
  );
}
