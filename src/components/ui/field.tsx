"use client";

import { useId } from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils/cn";

/**
 * Form field primitives.
 *
 * The layout is fixed across the whole product: label above the control,
 * helper text below the label, error text below the control. Placeholders are
 * never used as labels, because they vanish the moment a student starts
 * typing and screen readers do not announce them reliably.
 *
 * `Field` wires up the id, `aria-describedby` and `aria-invalid` so every
 * control is announced with its label, its hint and its error.
 */

const CONTROL_BASE = cn(
  "w-full rounded-control border bg-surface px-3 text-sm text-ink",
  "placeholder:text-ink-subtle",
  "transition-[border-color,box-shadow] duration-150",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "aria-[invalid=true]:border-danger",
);

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  /** Receives the wiring it needs to be accessible. */
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean;
    required: boolean;
  }) => React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <LabelPrimitive.Root
        htmlFor={id}
        className="text-sm font-medium text-ink"
      >
        {label}
        {required ? (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </LabelPrimitive.Root>

      {hint ? (
        <p id={hintId} className="-mt-1 text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": Boolean(error),
        required: Boolean(required),
      })}

      {error ? (
        <p
          id={errorId}
          className="flex items-start gap-1.5 text-sm text-danger"
          // Announced when it appears, without stealing focus.
          role="alert"
        >
          <WarningCircleIcon
            size={16}
            weight="fill"
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(CONTROL_BASE, "h-10 border-line-strong", className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        CONTROL_BASE,
        "min-h-24 resize-y border-line-strong py-2.5 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Native select.
 *
 * Deliberately not a custom listbox: on mobile the native picker is faster,
 * more accessible and more familiar than anything we would build, and the
 * onboarding flow is mostly selects on a phone.
 */
export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          CONTROL_BASE,
          "h-10 appearance-none border-line-strong pr-9",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 6l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/**
 * Checkbox with its label, as one clickable unit.
 * Uses a native input so it works with form submission and assistive tech.
 */
export function Checkbox({
  label,
  description,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  description?: string;
}) {
  const id = useId();
  const descriptionId = description ? `${id}-desc` : undefined;

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={descriptionId}
        className={cn(
          "mt-0.5 size-4 shrink-0 rounded-[4px] border border-line-strong",
          "accent-[var(--brand)]",
          "disabled:opacity-60",
        )}
        {...props}
      />
      <div className="min-w-0">
        <LabelPrimitive.Root
          htmlFor={id}
          className="block text-sm font-medium text-ink"
        >
          {label}
        </LabelPrimitive.Root>
        {description ? (
          <p id={descriptionId} className="mt-0.5 text-sm text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** A switch-style toggle for settings, with an accessible label. */
export function Toggle({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const descriptionId = description ? `${id}-desc` : undefined;

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <LabelPrimitive.Root
          htmlFor={id}
          className="block text-sm font-medium text-ink"
        >
          {label}
        </LabelPrimitive.Root>
        {description ? (
          <p id={descriptionId} className="mt-0.5 max-w-[60ch] text-sm text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-pill border transition-colors duration-150",
          "disabled:cursor-not-allowed disabled:opacity-60",
          checked
            ? "border-brand bg-brand"
            : "border-line-strong bg-surface-sunken",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4.5 rounded-pill bg-white shadow-sm transition-transform duration-150",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
