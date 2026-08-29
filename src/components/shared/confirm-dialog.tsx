"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

/**
 * Confirmation for actions that cannot be undone.
 *
 * The confirm button always names the action ("Delete") rather than saying
 * "OK", so a student reading only the button still knows what is about to
 * happen. Destructive actions get the danger variant, and the dialog cannot
 * be dismissed while the action is running.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  busy = false,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  /** Extra content, e.g. a confirmation input. */
  children?: React.ReactNode;
}) {
  const t = useT();

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => !busy && onOpenChange(next)}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-surface border border-line bg-surface p-5 shadow-lg"
          onInteractOutside={(event) => busy && event.preventDefault()}
          onEscapeKeyDown={(event) => busy && event.preventDefault()}
        >
          <Dialog.Title className="text-base font-semibold text-ink">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-ink-muted">
            {description}
          </Dialog.Description>

          {children ? <div className="mt-4">{children}</div> : null}

          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={busy}>
                {t.common.cancel}
              </Button>
            </Dialog.Close>
            <Button
              variant={destructive ? "danger" : "primary"}
              loading={busy}
              onClick={() => void onConfirm()}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
