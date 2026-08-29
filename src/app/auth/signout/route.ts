import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Sign out.
 *
 * POST only. A GET would let any page log a user out with an <img> tag, which
 * is a small but real CSRF nuisance.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.nextUrl.origin), {
    status: 303,
  });
}
