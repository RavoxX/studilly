import { cn } from "@/lib/utils/cn";

/**
 * Skeleton loading.
 *
 * The rule everywhere in Studilly: a skeleton mirrors the SHAPE of what is
 * coming, so the layout does not jump when content arrives and the student
 * can already see how much there will be. A spinner communicates none of that.
 *
 * The shimmer collapses to a static tint under `prefers-reduced-motion`; see
 * globals.css.
 */

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton h-4 w-full", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

/** A run of text lines, last one short like real prose. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3.5", index === lines - 1 && "w-3/5")}
        />
      ))}
    </div>
  );
}

/** Matches the Card component's padding and border. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-surface border border-line bg-surface p-5",
        className,
      )}
    >
      <Skeleton className="mb-3 h-4 w-1/3" />
      <SkeletonText lines={2} />
    </div>
  );
}

/**
 * A list of rows, e.g. materials or exams. `count` should match the page size
 * so the skeleton is the same height as the real list.
 */
export function SkeletonList({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-surface border border-line bg-surface p-4"
        >
          <Skeleton className="size-10 shrink-0 rounded-control" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0 rounded-control" />
        </div>
      ))}
    </div>
  );
}

/** Dashboard stat tiles. */
export function SkeletonStats({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-surface border border-line bg-surface p-5"
        >
          <Skeleton className="mb-3 h-3 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Exam-shaped skeleton: a task with its marks badge and answer field.
 * Used while an exam is being generated so the student sees what is coming.
 */
export function SkeletonExamTask() {
  return (
    <div className="rounded-surface border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-6 w-16 rounded-pill" />
      </div>
      <SkeletonText lines={3} className="mb-5" />
      <Skeleton className="h-28 w-full rounded-control" />
    </div>
  );
}
