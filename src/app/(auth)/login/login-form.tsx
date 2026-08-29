"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage, safeRedirect } from "@/lib/auth/errors";
import { useT } from "@/i18n/client";

export function LoginForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const next = safeRedirect(searchParams.get("next"));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authErrorMessage(authError, t));
      setPending(false);
      return;
    }

    // Full navigation so the proxy sees the new session cookie and the server
    // components render as the signed-in user.
    router.replace(next);
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-ink text-2xl font-semibold tracking-tight">
        {t.auth.loginTitle}
      </h1>
      <p className="text-ink-muted mt-2 text-sm">{t.auth.loginSubtitle}</p>

      {error ? (
        <Alert tone="danger" className="mt-6">
          {error}
        </Alert>
      ) : null}

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

        <Field label={t.auth.password} required>
          {(props) => (
            <Input
              {...props}
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="rounded-control text-brand-text text-sm hover:opacity-80"
          >
            {t.auth.forgotPassword}
          </Link>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={pending}>
          {t.auth.login}
        </Button>
      </form>

      <p className="text-ink-muted mt-6 text-center text-sm">
        {t.auth.noAccount}{" "}
        <Link
          href="/register"
          className="rounded-control text-brand-text font-medium hover:opacity-80"
        >
          {t.auth.register}
        </Link>
      </p>
    </div>
  );
}
