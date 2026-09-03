"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DotsThreeIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

/**
 * Deleting a notebook, from the card.
 *
 * The confirmation says plainly that the materials survive, because the card
 * shows a source count and someone about to delete a notebook holding twelve
 * uploads has every reason to think they are about to lose them.
 */
export function NotebookRowActions({
  notebookId,
  title,
}: {
  notebookId: string;
  title: string;
}) {
  const t = useT();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const response = await fetch(`/api/notebooks/${notebookId}`, {
      method: "DELETE",
    });
    setBusy(false);
    setConfirmOpen(false);
    if (response.ok) router.refresh();
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={t.notebooks.studio.deleteLabel(title)}
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-control",
              "text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink",
            )}
            onClick={(event) => event.preventDefault()}
          >
            <DotsThreeIcon size={18} weight="bold" aria-hidden="true" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 min-w-44 rounded-surface border border-line bg-surface p-1 shadow-lg"
          >
            <DropdownMenu.Item
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-control px-3 py-2 text-sm outline-none",
                "text-danger data-[highlighted]:bg-danger-soft",
              )}
              onSelect={(event) => {
                event.preventDefault();
                setConfirmOpen(true);
              }}
            >
              <TrashIcon size={15} aria-hidden="true" />
              {t.notebooks.delete}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t.notebooks.deleteConfirmTitle}
        description={t.notebooks.deleteConfirmBody}
        confirmLabel={t.common.delete}
        destructive
        busy={busy}
        onConfirm={remove}
      />
    </>
  );
}
