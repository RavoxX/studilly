import type { Dictionary } from "@/i18n/locales/de";

/**
 * Maps Supabase auth failures onto translated messages.
 *
 * Two rules:
 *
 *   1. Never surface the provider's raw message. It is English-only, changes
 *      without notice, and occasionally leaks internal detail.
 *
 *   2. Never confirm whether an email address exists. "Invalid login
 *      credentials" covers both a wrong password and an unknown account, and
 *      password reset always reports the same thing regardless. Distinguishing
 *      them would turn the login form into an account enumeration oracle.
 */
export function authErrorMessage(
  error: { message?: string; code?: string; status?: number } | null,
  t: Dictionary,
): string {
  if (!error) return t.auth.errors.generic;

  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "invalid_credentials" || message.includes("invalid login")) {
    return t.auth.errors.invalidCredentials;
  }
  if (code === "email_not_confirmed" || message.includes("not confirmed")) {
    return t.auth.errors.emailNotConfirmed;
  }
  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    message.includes("already registered")
  ) {
    return t.auth.errors.emailInUse;
  }
  if (code === "weak_password" || message.includes("password should be")) {
    return t.auth.errors.weakPassword;
  }
  if (code === "validation_failed" || message.includes("invalid email")) {
    return t.auth.errors.invalidEmail;
  }
  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    error.status === 429
  ) {
    return t.auth.errors.rateLimited;
  }
  if (
    code === "otp_expired" ||
    message.includes("expired") ||
    message.includes("invalid token")
  ) {
    return t.auth.errors.expiredLink;
  }

  return t.auth.errors.generic;
}

export const MIN_PASSWORD_LENGTH = 8;

/** Client-side pre-check so the student is not sent to the server to be told
 *  their password is too short. The server enforces this too. */
export function validatePassword(
  password: string,
  confirmation: string | null,
  t: Dictionary,
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return t.auth.errors.weakPassword;
  if (confirmation !== null && password !== confirmation) {
    return t.auth.errors.passwordMismatch;
  }
  return null;
}

/**
 * Keeps a redirect target inside the application.
 *
 * `?next=` comes from the URL, so it is attacker-controlled. Without this
 * check, a link like `/login?next=https://evil.example` would bounce a
 * freshly authenticated student straight off the site.
 */
export function safeRedirect(target: string | null, fallback = "/dashboard"): string {
  if (!target) return fallback;
  if (!target.startsWith("/")) return fallback;
  // Protocol-relative URLs also leave the site.
  if (target.startsWith("//")) return fallback;
  return target;
}
