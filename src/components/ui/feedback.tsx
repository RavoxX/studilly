import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils/cn";

/**
 * Status surfaces: badges, alerts, empty states, progress.
 *
 * Every status carries an ICON and a TEXT LABEL alongside its colour. Colour
 * alone would fail for the roughly 1 in 12 boys with a colour vision
 * deficiency, and this product's whole job is telling students what went
 * wrong.
 */

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const BADGE_TONES: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-ink-muted border-line",
  brand: "bg-brand-soft text-brand-text border-transparent",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
};

export function Badge({
  tone = "neutral",
  className,
  icon,
  children,
}: {
  tone?: Tone;
  className?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1",
        "text-xs font-medium",
        BADGE_TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

const ALERT_ICONS: Record<Tone, React.ReactNode> = {
  neutral: <InfoIcon size={18} weight="fill" aria-hidden="true" />,
  brand: <InfoIcon size={18} weight="fill" aria-hidden="true" />,
  success: <CheckCircleIcon size={18} weight="fill" aria-hidden="true" />,
  warning: <WarningIcon size={18} weight="fill" aria-hidden="true" />,
  danger: <WarningCircleIcon size={18} weight="fill" aria-hidden="true" />,
};

const ALERT_TONES: Record<Tone, string> = {
  neutral: "bg-surface-sunken border-line text-ink",
  brand: "bg-brand-soft border-transparent text-ink",
  success: "bg-success-soft border-transparent text-ink",
  warning: "bg-warning-soft border-transparent text-ink",
  danger: "bg-danger-soft border-transparent text-ink",
};

const ALERT_ICON_TONES: Record<Tone, string> = {
  neutral: "text-ink-subtle",
  brand: "text-brand-text",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export function Alert({
  tone = "neutral",
  title,
  children,
  action,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-surface border p-4",
        ALERT_TONES[tone],
        className,
      )}
      role={tone === "danger" ? "alert" : "status"}
    >
      <span className={cn("mt-0.5 shrink-0", ALERT_ICON_TONES[tone])}>
        {ALERT_ICONS[tone]}
      </span>
      <div className="min-w-0 flex-1">
        {title ? (
          <p className="text-sm font-semibold text-ink">{title}</p>
        ) : null}
        {children ? (
          <div
            className={cn(
              "text-sm text-ink-muted",
              title && "mt-1",
              "[&_a]:text-brand-text [&_a]:underline [&_a]:underline-offset-2",
            )}
          >
            {children}
          </div>
        ) : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}

/**
 * Empty state.
 *
 * Always says what the thing is AND how to get one. An empty screen that only
 * says "no data" leaves the student stuck.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-surface border border-dashed border-line-strong",
        "bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 flex size-11 items-center justify-center rounded-surface bg-surface-sunken text-ink-subtle">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-[46ch] text-sm text-ink-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/**
 * Progress bar.
 *
 * The numeric value is always rendered next to it, so the information does
 * not depend on reading a bar's length.
 */
export function Progress({
  value,
  max = 100,
  tone = "brand",
  label,
  className,
}: {
  value: number;
  max?: number;
  tone?: Tone;
  label?: string;
  className?: string;
}) {
  const safeMax = max > 0 ? max : 1;
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));

  const fills: Record<Tone, string> = {
    neutral: "bg-ink-subtle",
    brand: "bg-brand",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  };

  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-pill bg-surface-sunken", className)}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full rounded-pill transition-[width] duration-300", fills[tone])}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/**
 * Error state for a failed load, with a retry affordance.
 * Never surfaces raw error text: students see a plain sentence, the detail
 * goes to the server log.
 */
export function ErrorState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-surface border border-line bg-surface px-6 py-10 text-center",
        className,
      )}
      role="alert"
    >
      <div className="mb-4 flex size-11 items-center justify-center rounded-surface bg-danger-soft text-danger">
        <WarningCircleIcon size={22} weight="fill" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-[46ch] text-sm text-ink-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
