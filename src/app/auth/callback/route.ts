import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/auth/errors";

/**
 * Auth callback.
 *
 * Handles both flows Supabase can send a user back through:
 *
 *   `?code=`             PKCE, used by email confirmation and OAuth. This is
 *                        the path any future OAuth provider will use too, so
 *                        adding one needs no changes here.
 *   `?token_hash&type=`  the older magic-link and recovery format.
 *
 * The exchange sets the session cookie server-side, then the user is
 * redirected. `next` is validated so a crafted link cannot bounce a
 * freshly-authenticated student to another origin.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeRedirect(searchParams.get("next"));

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "email" | "recovery" | "invite" | "email_change",
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Expired or already-used links land here. Send the user somewhere useful
  // rather than showing a raw provider error.
  return NextResponse.redirect(`${origin}/login?error=link_invalid`);
}
