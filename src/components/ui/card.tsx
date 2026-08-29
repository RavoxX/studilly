import { cn } from "@/lib/utils/cn";

/**
 * Card.
 *
 * Used where elevation communicates real grouping. Where it does not, prefer
 * a `divide-y` list or plain spacing: a page of nested cards reads as noise.
 *
 * Radius is 12px (`rounded-surface`), one step above controls, per the
 * project's shape rule.
 */

export function Card({
  className,
  interactive = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-surface border border-line bg-surface",
        interactive &&
          "transition-colors duration-150 hover:border-line-strong hover:bg-surface-raised",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pb-0", className)} {...props} />;
}

export function CardTitle({
  className,
  as: Component = "h3",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & {
  as?: "h2" | "h3" | "h4";
}) {
  return (
    <Component
      className={cn("text-base font-semibold text-ink", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("mt-1 text-sm text-ink-muted", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-line px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Section header used above content groups on app pages.
 * Kept as a plain heading plus optional action, not a card, so pages do not
 * become a stack of boxes.
 */
export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-end justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-[65ch] text-sm text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
