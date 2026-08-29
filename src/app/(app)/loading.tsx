import { Skeleton, SkeletonList, SkeletonStats } from "@/components/ui/skeleton";

/**
 * Route-level loading state for the app shell.
 *
 * Shaped like a typical page (heading, stat row, list) so the layout does not
 * shift when the real content arrives. Individual pages add their own
 * finer-grained Suspense boundaries on top of this.
 */
export default function AppLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-48" />
      <div className="mt-6">
        <SkeletonStats count={3} />
      </div>
      <div className="mt-8">
        <SkeletonList count={3} />
      </div>
    </div>
  );
}
