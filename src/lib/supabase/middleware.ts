import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";
import { siteURL } from "@/lib/auth/site-url";

/** Routes that require a signed-in user. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/materials",
  "/exams",
  "/practice",
  "/learning",
  "/plan",
  "/groups",
  "/subscription",
  "/settings",
  "/onboarding",
] as const;

/** Routes a signed-in user should be redirected away from. */
const AUTH_ONLY_PREFIXES = ["/login", "/register"] as const;

function matches(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Refreshes the auth session on every request and enforces route access.
 *
 * The redirect here is a UX affordance, not the security boundary. Data
 * access is protected by Row Level Security and by explicit `requireUser()`
 * checks in every server route, so a bypassed middleware would not expose
 * anything.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() revalidates the JWT against Supabase. Do not swap this for
  // getSession(), which trusts the cookie without verifying it.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Built on the configured public origin rather than on the request's own:
  // behind a proxy the latter is the internal address the server listens on.
  if (!user && matches(pathname, PROTECTED_PREFIXES)) {
    const url = siteURL("/login");
    // Preserve where they were heading so login can return them there.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && matches(pathname, AUTH_ONLY_PREFIXES)) {
    return NextResponse.redirect(siteURL("/dashboard"));
  }

  return response;
}
