import { describe, expect, it } from "vitest";
import { authErrorMessage, safeRedirect, validatePassword } from "./errors";
import { de } from "@/i18n/locales/de";

/**
 * Authentication boundaries.
 *
 * `safeRedirect` is the one that matters most: `?next=` is attacker
 * controlled, and without this check a crafted login link would bounce a
 * freshly authenticated student to another origin.
 */

describe("safeRedirect", () => {
  it("allows same-site paths", () => {
    expect(safeRedirect("/dashboard")).toBe("/dashboard");
    expect(safeRedirect("/exams/123/results/456")).toBe("/exams/123/results/456");
    expect(safeRedirect("/settings?tab=privacy")).toBe("/settings?tab=privacy");
  });

  it("rejects absolute URLs to another origin", () => {
    expect(safeRedirect("https://evil.example/steal")).toBe("/dashboard");
    expect(safeRedirect("http://evil.example")).toBe("/dashboard");
  });

  it("rejects protocol-relative URLs", () => {
    // `//evil.example` is a valid URL that leaves the site while looking
    // like a path.
    expect(safeRedirect("//evil.example")).toBe("/dashboard");
    expect(safeRedirect("//evil.example/path")).toBe("/dashboard");
  });

  it("rejects non-path schemes", () => {
    expect(safeRedirect("javascript:alert(1)")).toBe("/dashboard");
    expect(safeRedirect("data:text/html,<script>")).toBe("/dashboard");
  });

  it("falls back when nothing is supplied", () => {
    expect(safeRedirect(null)).toBe("/dashboard");
    expect(safeRedirect("")).toBe("/dashboard");
  });

  it("honours an explicit fallback", () => {
    expect(safeRedirect(null, "/onboarding")).toBe("/onboarding");
  });
});

describe("authErrorMessage", () => {
  it("does not distinguish a wrong password from an unknown account", () => {
    // Distinguishing them would turn the login form into an account
    // enumeration oracle.
    const wrongPassword = authErrorMessage(
      { code: "invalid_credentials" },
      de,
    );
    const unknownAccount = authErrorMessage(
      { message: "Invalid login credentials" },
      de,
    );
    expect(wrongPassword).toBe(unknownAccount);
  });

  it("never returns the provider's raw message", () => {
    const message = authErrorMessage(
      { message: "PostgrestException: relation does not exist" },
      de,
    );
    expect(message).toBe(de.auth.errors.generic);
    expect(message).not.toContain("Postgrest");
  });

  it("maps the cases a student can act on", () => {
    expect(authErrorMessage({ code: "email_not_confirmed" }, de)).toBe(
      de.auth.errors.emailNotConfirmed,
    );
    expect(authErrorMessage({ code: "weak_password" }, de)).toBe(
      de.auth.errors.weakPassword,
    );
    expect(authErrorMessage({ code: "otp_expired" }, de)).toBe(
      de.auth.errors.expiredLink,
    );
    expect(authErrorMessage({ status: 429 }, de)).toBe(
      de.auth.errors.rateLimited,
    );
  });

  it("handles a null error", () => {
    expect(authErrorMessage(null, de)).toBe(de.auth.errors.generic);
  });
});

describe("validatePassword", () => {
  it("rejects passwords under eight characters", () => {
    expect(validatePassword("short", null, de)).toBe(
      de.auth.errors.weakPassword,
    );
    expect(validatePassword("12345678", null, de)).toBeNull();
  });

  it("rejects a mismatched confirmation", () => {
    expect(validatePassword("password123", "password124", de)).toBe(
      de.auth.errors.passwordMismatch,
    );
    expect(validatePassword("password123", "password123", de)).toBeNull();
  });

  it("skips the confirmation check when none is supplied", () => {
    expect(validatePassword("password123", null, de)).toBeNull();
  });
});
