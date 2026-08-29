"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { PlusIcon, SignInIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { useI18n } from "@/i18n/client";

export function GroupActions({
  subjects,
}: {
  subjects: { id: string; name_de: string; name_en: string }[];
}) {
  return (
    <div className="flex gap-2">
      <JoinDialog />
      <CreateDialog subjects={subjects} />
    </div>
  );
}

function CreateDialog({
  subjects,
}: {
  subjects: { id: string; name_de: string; name_en: string }[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);

    const response = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        name: name.trim(),
        description: description.trim(),
        subjectId: subjectId || null,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(
        body?.error === "limit_reached"
          ? t.subscription.limitReachedBody
          : t.errors.generic,
      );
      setPending(false);
      return;
    }

    const { groupId } = (await response.json()) as { groupId: string };
    setOpen(false);
    setPending(false);
    router.push(`/groups/${groupId}`);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button>
          <PlusIcon size={16} aria-hidden="true" />
          {t.groups.create}
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-surface border border-line bg-surface p-5 shadow-lg">
          <div className="mb-4 flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold text-ink">
              {t.groups.create}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="-mr-1 -mt-1 inline-flex size-9 items-center justify-center rounded-control text-ink-subtle"
                aria-label={t.common.close}
              >
                <XIcon size={18} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {error ? (
            <Alert tone="danger" className="mb-4">
              {error}
            </Alert>
          ) : null}

          <div className="space-y-4">
            <Field label={t.groups.name} required>
              {(props) => (
                <Input
                  {...props}
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                />
              )}
            </Field>

            <Field label={t.groups.description}>
              {(props) => (
                <Textarea
                  {...props}
                  value={description}
                  maxLength={500}
                  onChange={(e) => setDescription(e.target.value)}
                />
              )}
            </Field>

            <Field label={t.materials.subject}>
              {(props) => (
                <Select
                  {...props}
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                >
                  <option value="">{t.common.none}</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {locale === "de" ? subject.name_de : subject.name_en}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="ghost">{t.common.cancel}</Button>
            </Dialog.Close>
            <Button
              loading={pending}
              disabled={name.trim().length < 2}
              onClick={submit}
            >
              {t.common.create}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function JoinDialog() {
  const { t } = useI18n();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);

    const response = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", inviteCode: code.trim() }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        details?: { reason?: string };
      } | null;

      setError(
        body?.details?.reason === "already_member"
          ? t.groups.alreadyMember
          : body?.details?.reason === "group_full"
            ? t.groups.groupFull
            : body?.error === "limit_reached"
              ? t.subscription.limitReachedBody
              : t.groups.invalidCode,
      );
      setPending(false);
      return;
    }

    const { groupId } = (await response.json()) as { groupId: string };
    setOpen(false);
    setPending(false);
    router.push(`/groups/${groupId}`);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="secondary">
          <SignInIcon size={16} aria-hidden="true" />
          {t.groups.join}
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-surface border border-line bg-surface p-5 shadow-lg">
          <Dialog.Title className="text-lg font-semibold text-ink">
            {t.groups.join}
          </Dialog.Title>

          {error ? (
            <Alert tone="danger" className="mt-4">
              {error}
            </Alert>
          ) : null}

          <div className="mt-4">
            <Field label={t.groups.joinCode} hint={t.groups.joinCodeHint} required>
              {(props) => (
                <Input
                  {...props}
                  value={code}
                  maxLength={24}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="font-mono"
                  onChange={(e) => setCode(e.target.value)}
                />
              )}
            </Field>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="ghost">{t.common.cancel}</Button>
            </Dialog.Close>
            <Button
              loading={pending}
              disabled={code.trim().length < 4}
              onClick={submit}
            >
              {t.groups.join}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
