import { publicEnv } from "@/lib/env";

/**
 * An absolute URL on the site's own public origin.
 *
 * Redirects cannot be built from `request.nextUrl.origin`. Behind a proxy that
 * does not rewrite the Host header, the origin the server sees is the internal
 * one it is listening on, so a signed-in student is sent to that address
 * instead of to the site. The public origin is configuration, not something to
 * infer from a request, and the app already has one place that holds it.
 *
 * `path` is expected to be a validated internal path; callers that take one
 * from a query parameter must run it through `safeRedirect` first.
 */
export function siteURL(path: string): URL {
  return new URL(path, publicEnv.NEXT_PUBLIC_SITE_URL);
}
