"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useT } from "@/i18n/client";

/**
 * Deletes the exam.
 *
 * Behind a confirmation because it takes the marking with it, and the
 * confirmation says so: the paper is reproducible, the feedback on what a
 * student got wrong is not.
 */
export function DeleteExamButton({ examId }: { examId: string }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    const response = await fetch(`/api/exams/${examId}`, { method: "DELETE" });
    if (!response.ok) {
      setPending(false);
      setOpen(false);
      return;
    }
    router.replace("/exams");
    router.refresh();
  }

  return (
    <>
      <Button
        variant="ghost"
        className="text-danger hover:bg-danger-soft"
        onClick={() => setOpen(true)}
      >
        <TrashIcon size={16} aria-hidden="true" />
        {t.common.delete}
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t.exams.deleteTitle}
        description={t.exams.deleteBody}
        confirmLabel={t.common.delete}
        destructive
        busy={pending}
        onConfirm={remove}
      />
    </>
  );
}
