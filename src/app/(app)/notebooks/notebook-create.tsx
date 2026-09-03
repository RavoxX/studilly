"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { SourcePicker, type PickableMaterial } from "./[id]/source-picker";
import { useI18n } from "@/i18n/client";

/** A small, fixed set. A free-text emoji field invites pasted nonsense. */
const EMOJI = ["📓", "📐", "🧪", "🌍", "📚", "🧠", "⚗️", "🎼", "💻", "🏛️"];

/**
 * Creating a notebook.
 *
 * Sources are chosen here rather than after, because a notebook with none can
 * do nothing at all: the chat has nothing to read and the Studio has nothing
 * to make anything from. They can still be changed later.
 */
export function NotebookCreate({
  subjects,
  materials,
}: {
  subjects: { id: string; name_de: string; name_en: string }[];
  materials: PickableMaterial[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState(EMOJI[0]);
  const [subjectId, setSubjectId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const ready = useMemo(() => title.trim().length > 0, [title]);

  async function create() {
    setBusy(true);
    setFailed(false);

    const response = await fetch("/api/notebooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        emoji,
        subjectId: subjectId || null,
        materialIds: selected,
      }),
    });

    setBusy(false);

    if (!response.ok) {
      setFailed(true);
      return;
    }

    const body = (await response.json()) as { notebookId: string };
    setOpen(false);
    router.push(`/notebooks/${body.notebookId}`);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <Dialog.Trigger asChild>
        <Button>
          <PlusIcon size={16} weight="bold" aria-hidden="true" />
          {t.notebooks.create}
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-surface border border-line bg-surface shadow-lg">
          <div className="p-5 pb-0">
            <Dialog.Title className="text-base font-semibold text-ink">
              {t.notebooks.createTitle}
            </Dialog.Title>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            <Field label={t.notebooks.nameLabel} required>
              {(props) => (
                <Input
                  {...props}
                  value={title}
                  placeholder={t.notebooks.namePlaceholder}
                  maxLength={200}
                  onChange={(event) => setTitle(event.target.value)}
                />
              )}
            </Field>

            <div>
              <p className="mb-2 text-sm font-medium text-ink">
                {t.notebooks.emojiLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {EMOJI.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={emoji === option}
                    onClick={() => setEmoji(option)}
                    className={
                      emoji === option
                        ? "flex size-10 items-center justify-center rounded-control border-2 border-brand bg-brand-soft text-xl"
                        : "flex size-10 items-center justify-center rounded-control border border-line-strong text-xl transition-colors hover:bg-surface-sunken"
                    }
                  >
                    <span aria-hidden="true">{option}</span>
                  </button>
                ))}
              </div>
            </div>

            <Field label={t.notebooks.subjectLabel}>
              {(props) => (
                <Select
                  {...props}
                  value={subjectId}
                  onChange={(event) => setSubjectId(event.target.value)}
                >
                  <option value="">{t.notebooks.noSubject}</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {locale === "de" ? subject.name_de : subject.name_en}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <div>
              <p className="text-sm font-medium text-ink">
                {t.notebooks.sourcesLabel}
              </p>
              <p className="mt-1 mb-3 text-sm text-ink-muted">
                {t.notebooks.sourcesHint}
              </p>
              <SourcePicker
                materials={materials}
                selected={selected}
                onChange={setSelected}
              />
            </div>

            {failed ? (
              <Alert tone="danger">{t.notebooks.studio.failed}</Alert>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 border-t border-line p-5">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={busy}>
                {t.common.cancel}
              </Button>
            </Dialog.Close>
            <Button loading={busy} disabled={!ready} onClick={() => void create()}>
              {t.notebooks.create}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
