"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

/**
 * Creating a notebook.
 *
 * One button and no form. There is nothing worth asking before there are
 * sources: a name typed at this point describes an empty thing, and the
 * notebook names itself from the first material anyway. So this makes the
 * notebook and opens it, and the sources are added inside, where the student
 * can see what is already there.
 */
export function NotebookCreate({ placeholder }: { placeholder: string }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);

    const response = await fetch("/api/notebooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: placeholder }),
    });

    if (!response.ok) {
      setBusy(false);
      return;
    }

    const body = (await response.json()) as { notebookId: string };
    router.push(`/notebooks/${body.notebookId}`);
  }

  return (
    <Button loading={busy} onClick={() => void create()}>
      <PlusIcon size={16} weight="bold" aria-hidden="true" />
      {t.notebooks.create}
    </Button>
  );
}
