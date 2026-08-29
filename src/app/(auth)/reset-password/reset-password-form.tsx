"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/client";
import {
  MIN_PASSWORD_LENGTH,
  authErrorMessage,
  validatePassword,
} from "@/lib/auth/errors";
import { useT } from "@/i18n/client";

/**
 * Sets a new password.
 *
 * Reached through the recovery link, which the auth callback has already
 * exchanged for a session. Without that session `updateUser` fails, which is
 * the check that stops anyone opening this page directly and changing a
 * password.
 */
export function ResetPasswordForm() {
  const t = useT();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    const { error: authError } = await supabase.auth.updateUser({ password });

    if (authError) {
      setError(authErrorMessage(authError, t));
      setPending(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-ink text-2xl font-semibold tracking-tight">
        {t.auth.newPasswordTitle}
      </h1>

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
        <Field label={t.auth.password} hint={t.auth.passwordHint} required>
          {(props) => (
            <Input
              {...props}
              type="password"
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
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          )}
        </Field>

        <Button type="submit" className="w-full" size="lg" loading={pending}>
          {t.auth.newPasswordSubmit}
        </Button>
      </form>
    </div>
  );
}
