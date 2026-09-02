import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteURL } from "@/lib/auth/site-url";

/**
 * Sign out.
 *
 * POST only. A GET would let any page log a user out with an <img> tag, which
 * is a small but real CSRF nuisance.
 */
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(siteURL("/"), {
    status: 303,
  });
}
