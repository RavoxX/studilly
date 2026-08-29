import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Runs before every matched request.
 *
 * Refreshes the Supabase auth session so server components see a valid user,
 * and redirects signed-out visitors away from app routes.
 *
 * This is a UX affordance, not the security boundary. Data access is protected
 * by Row Level Security and by an explicit `requireUser()` check in every
 * server route, so bypassing this file exposes nothing.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets and images. The auth callback is
    // included on purpose, so the session cookie is written before the
    // redirect lands.
    "/((?!_next/static|_next/image|favicon.ico|logo.png|logo-mark.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
