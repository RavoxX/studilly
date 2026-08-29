"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/client";
import { publicEnv } from "@/lib/env";
import { useT } from "@/i18n/client";

export function ForgotPasswordForm() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
    });

    // Always report the same outcome, whether or not an account exists.
    // Reporting "no such account" here would let anyone test which email
    // addresses are registered.
    setSent(true);
    setPending(false);
  }

  return (
    <div>
      <h1 className="text-ink text-2xl font-semibold tracking-tight">
        {t.auth.resetTitle}
      </h1>
      <p className="text-ink-muted mt-2 text-sm">{t.auth.resetSubtitle}</p>

      {sent ? (
        <Alert tone="success" className="mt-6">
          {t.auth.resetSent}
        </Alert>
      ) : (
        <form
          // method="post" is a safety net, not decoration: a <form> with no
          // method defaults to GET, so if this component has not hydrated the
          // browser would submit the password in the query string, where it
          // lands in history, logs and Referer headers.
          method="post"
          onSubmit={handleSubmit}
          className="mt-6 space-y-5"
          noValidate
        >
          <Field label={t.auth.email} required>
            {(props) => (
              <Input
                {...props}
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>

          <Button type="submit" className="w-full" size="lg" loading={pending}>
            {t.auth.resetSubmit}
          </Button>
        </form>
      )}

      <p className="text-ink-muted mt-6 text-center text-sm">
        <Link
          href="/login"
          className="rounded-control text-brand-text font-medium hover:opacity-80"
        >
          {t.common.back}
        </Link>
      </p>
    </div>
  );
}
