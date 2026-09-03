"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DotsThreeIcon, SignOutIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

/**
 * Delete or leave, from the list.
 *
 * Both actions already existed, at the foot of the third tab inside a group,
 * which is a long way to go to get rid of one. They sit on the row now, where
 * someone looking at a list of groups they no longer want is actually looking.
 *
 * Which action is offered depends on who you are: an owner deletes the group
 * for everyone, a member only removes themselves. The server checks the same
 * thing again.
 */
export function GroupRowActions({
  groupId,
  groupName,
  isOwner,
}: {
  groupId: string;
  groupName: string;
  isOwner: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const response = isOwner
      ? await fetch(`/api/groups/${groupId}`, { method: "DELETE" })
      : await fetch(`/api/groups/${groupId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "leave" }),
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
            aria-label={t.groups.rowActions(groupName)}
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-control",
              "text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink",
            )}
            // The row is a link; without this the menu opens and navigates.
            onClick={(event) => event.preventDefault()}
          >
            <DotsThreeIcon size={20} weight="bold" aria-hidden="true" />
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
              {isOwner ? (
                <TrashIcon size={15} aria-hidden="true" />
              ) : (
                <SignOutIcon size={15} aria-hidden="true" />
              )}
              {isOwner ? t.groups.deleteGroup : t.groups.leave}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={isOwner ? t.groups.deleteConfirmTitle : t.groups.leaveConfirmTitle}
        description={isOwner ? t.groups.deleteConfirmBody : t.groups.leaveConfirmBody}
        confirmLabel={isOwner ? t.common.delete : t.groups.leave}
        destructive
        busy={busy}
        onConfirm={run}
      />
    </>
  );
}
