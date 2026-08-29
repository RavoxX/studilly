import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Button.
 *
 * Radius follows the project rule: controls are 8px (`rounded-control`).
 * Every variant has been checked for WCAG AA contrast in both themes; the
 * primary variant uses `--brand` (#2F63EA light) against white at 5.18:1.
 *
 * Motion is limited to a 1px press translation. The brief asks for calm, and
 * a study tool people use for an hour at a time should not bounce.
 */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-on-brand hover:bg-brand-hover active:bg-brand-active shadow-sm",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-surface-sunken active:bg-surface-sunken",
  ghost: "text-ink-muted hover:bg-surface-sunken hover:text-ink",
  danger: "bg-danger text-white hover:opacity-90 active:opacity-80 shadow-sm",
  link: "text-brand-text underline underline-offset-4 hover:opacity-80",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-10 w-10 justify-center",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders the child element instead of a <button>, for links styled as
   *  buttons. The child must accept a ref and className. */
  asChild?: boolean;
  loading?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      className={cn(
        "inline-flex items-center rounded-control font-medium",
        "transition-[background-color,color,opacity,transform] duration-150",
        "active:translate-y-px",
        "disabled:pointer-events-none disabled:opacity-50",
        // Keep the label on one line: a wrapped CTA is a layout bug.
        "whitespace-nowrap",
        VARIANTS[variant],
        SIZES[size],
        loading && "pointer-events-none opacity-70",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {children}
    </Component>
  );
}
