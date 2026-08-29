"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/client";
import {
  MIN_PASSWORD_LENGTH,
  authErrorMessage,
  validatePassword,
} from "@/lib/auth/errors";
import { publicEnv } from "@/lib/env";
import { useT } from "@/i18n/client";

export function RegisterForm() {
  const t = useT();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const passwordError = validatePassword(password, confirmation, t);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setPending(true);
    const supabase = createClient();

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Picked up by the handle_new_user trigger to seed the profile.
        data: { display_name: displayName.trim() },
        emailRedirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/onboarding`,
      },
    });

    if (authError) {
      setError(authErrorMessage(authError, t));
      setPending(false);
      return;
    }

    // With email confirmation on, signUp returns a user but no session.
    if (data.session) {
      router.replace("/onboarding");
      router.refresh();
      return;
    }

    setAwaitingConfirmation(true);
    setPending(false);
  }

  if (awaitingConfirmation) {
    return (
      <div className="text-center">
        <div className="rounded-surface bg-brand-soft text-brand-text mx-auto mb-5 flex size-12 items-center justify-center">
          <EnvelopeSimpleIcon size={24} aria-hidden="true" />
        </div>
        <h1 className="text-ink text-2xl font-semibold tracking-tight">
          {t.auth.verifyTitle}
        </h1>
        <p className="text-ink-muted mt-3 text-sm leading-relaxed">
          {t.auth.verifySubtitle(email.trim())}
        </p>
        <Button variant="secondary" className="mt-6" asChild>
          <Link href="/login">{t.auth.login}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-ink text-2xl font-semibold tracking-tight">
        {t.auth.registerTitle}
      </h1>
      <p className="text-ink-muted mt-2 text-sm">{t.auth.registerSubtitle}</p>

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
        <Field label={t.auth.displayName} hint={t.auth.displayNameHint} required>
          {(props) => (
            <Input
              {...props}
              name="displayName"
              autoComplete="given-name"
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
        </Field>

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

        <Field label={t.auth.password} hint={t.auth.passwordHint} required>
          {(props) => (
            <Input
              {...props}
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>

        <Field label={t.auth.passwordConfirm} required>
          {(props) => (
            <Input
              {...props}
              type="password"
              name="passwordConfirm"
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          )}
        </Field>

        <Button type="submit" className="w-full" size="lg" loading={pending}>
          {t.auth.register}
        </Button>

        <p className="text-ink-subtle text-center text-xs leading-relaxed">
          <Link
            href="/agb"
            className="hover:text-ink-muted underline underline-offset-2"
          >
            {t.marketing.footerTerms}
          </Link>
          {" · "}
          <Link
            href="/datenschutz"
            className="hover:text-ink-muted underline underline-offset-2"
          >
            {t.marketing.footerPrivacy}
          </Link>
        </p>
      </form>

      <p className="text-ink-muted mt-6 text-center text-sm">
        {t.auth.hasAccount}{" "}
        <Link
          href="/login"
          className="rounded-control text-brand-text font-medium hover:opacity-80"
        >
          {t.auth.login}
        </Link>
      </p>
    </div>
  );
}
