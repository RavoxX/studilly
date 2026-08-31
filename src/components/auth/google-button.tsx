"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { safeRedirect } from "@/lib/auth/errors";
import { useT } from "@/i18n/client";
import { publicEnv } from "@/lib/env";

/**
 * Sign in with Google.
 *
 * Supabase performs the OAuth exchange, so nothing here handles a token and
 * the Google client secret never reaches the browser. The provider sends the
 * student back to /auth/callback with a PKCE `code`, which that route already
 * exchanges for a session, so no new callback handling was needed.
 *
 * `next` is passed through the redirect so a student who was sent to sign in
 * from somewhere lands back where they started, and it is validated by
 * safeRedirect first: the value comes from the URL and would otherwise be an
 * open redirect.
 */
export function GoogleButton({
  next,
  onError,
}: {
  next: string;
  onError: (message: string) => void;
}) {
  const t = useT();
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);

    const supabase = createClient();
    const target = new URL("/auth/callback", publicEnv.NEXT_PUBLIC_SITE_URL);
    target.searchParams.set("next", safeRedirect(next));

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: target.toString(),
        // Google only returns a refresh token when it is asked to, and only
        // the first time unless consent is requested again.
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });

    // On success the browser is already navigating to Google, so this only
    // runs when the redirect never started.
    if (error) {
      onError(t.auth.googleFailed);
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      className="w-full"
      loading={pending}
      onClick={() => void signIn()}
    >
      <GoogleMark />
      {t.auth.continueWithGoogle}
    </Button>
  );
}

/**
 * Google's mark, drawn inline.
 *
 * Normally an icon comes from the icon library, but brand marks are not in
 * icon sets and Google's sign-in branding guidelines require their own logo in
 * its official four colours, so this one is the exception.
 */
function GoogleMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

/** A labelled rule, so the two ways in read as alternatives rather than steps. */
export function AuthDivider() {
  const t = useT();

  return (
    <div className="my-6 flex items-center gap-4" aria-hidden="true">
      <span className="h-px flex-1 bg-line" />
      <span className="text-xs text-ink-subtle">{t.auth.or}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
