import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Stable, machine-readable error codes. The client maps these to translated
 * messages, which is why the API never sends prose a student would read.
 */
export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "invalid_input"
  | "limit_reached"
  | "plan_required"
  | "rate_limited"
  | "ai_unavailable"
  | "ai_invalid_output"
  | "not_configured"
  | "conflict"
  | "server_error";

const STATUS: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  invalid_input: 422,
  limit_reached: 402,
  plan_required: 402,
  rate_limited: 429,
  ai_unavailable: 503,
  ai_invalid_output: 502,
  not_configured: 503,
  conflict: 409,
  server_error: 500,
};

export type ApiErrorBody = {
  error: ApiErrorCode;
  /** Optional structured detail. Never contains stack traces, SQL, prompts
   *  or provider messages. */
  details?: Record<string, unknown>;
};

export function apiError(
  code: ApiErrorCode,
  details?: Record<string, unknown>,
): NextResponse<ApiErrorBody> {
  return NextResponse.json<ApiErrorBody>(
    details ? { error: code, details } : { error: code },
    { status: STATUS[code] },
  );
}

export function apiSuccess<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json<T>(data, { status });
}

/**
 * Converts a thrown value into a safe response.
 *
 * Internal detail is logged server-side and never returned. Student answers
 * and uploaded content must not end up in logs, so only the error's own
 * message is recorded.
 */
export function handleApiError(
  error: unknown,
  context: string,
): NextResponse<ApiErrorBody> {
  if (error instanceof ZodError) {
    return apiError("invalid_input", {
      issues: error.issues.map((i) => ({
        path: i.path.join("."),
        code: i.code,
      })),
    });
  }

  if (error instanceof ApiException) {
    return apiError(error.code, error.details);
  }

  console.error(
    `[studilly:${context}]`,
    error instanceof Error ? error.message : "unknown error",
  );
  return apiError("server_error");
}

/** Throw this from anywhere in a request to short-circuit with a known code. */
export class ApiException extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly details?: Record<string, unknown>,
  ) {
    super(code);
    this.name = "ApiException";
  }
}
