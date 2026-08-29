"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import {
  ArrowsClockwiseIcon,
  CopyIcon,
  PaperPlaneTiltIcon,
  ShareNetworkIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Alert, Badge } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useI18n } from "@/i18n/client";
import { formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Share = {
  id: string;
  title: string;
  resourceType: "material" | "exam";
  resourceId: string;
  note: string;
  sharedBy: string;
  createdAt: string;
};

type Message = {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  displayName: string;
};

export function GroupPanel({
  groupId,
  isOwner,
  inviteCode,
  currentUserId,
  shares,
  messages,
  ownMaterials,
  ownExams,
}: {
  groupId: string;
  isOwner: boolean;
  inviteCode: string;
  currentUserId: string;
  shares: Share[];
  messages: Message[];
  ownMaterials: { id: string; title: string }[];
  ownExams: { id: string; title: string }[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();

  const [tab, setTab] = useState("shared");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Share form
  const [resourceType, setResourceType] = useState<"material" | "exam">(
    "material",
  );
  const [resourceId, setResourceId] = useState("");

  // Message form
  const [messageBody, setMessageBody] = useState("");

  async function act(payload: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/groups/${groupId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setBusy(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        details?: { reason?: string };
      } | null;
      setError(
        body?.details?.reason === "already_shared"
          ? t.groups.sharedEmpty
          : body?.error === "forbidden"
            ? t.errors.forbiddenBody
            : t.errors.generic,
      );
      return false;
    }

    router.refresh();
    return true;
  }

  return (
    <div>
      {error ? (
        <Alert tone="danger" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <Tabs.Root value={tab} onValueChange={setTab}>
        <Tabs.List className="mb-4 flex gap-1 border-b border-line">
          {[
            { value: "shared", label: t.groups.shared },
            { value: "discussion", label: t.groups.discussion },
            { value: "invite", label: t.groups.invite },
          ].map((entry) => (
            <Tabs.Trigger
              key={entry.value}
              value={entry.value}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                "data-[state=active]:border-brand data-[state=active]:text-ink",
                "data-[state=inactive]:border-transparent data-[state=inactive]:text-ink-subtle",
              )}
            >
              {entry.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Shared resources */}
        <Tabs.Content value="shared">
          <Card className="mb-4 p-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <Field label={t.groups.share}>
                {(props) => (
                  <Select
                    {...props}
                    value={resourceType}
                    onChange={(event) => {
                      setResourceType(
                        event.target.value as "material" | "exam",
                      );
                      setResourceId("");
                    }}
                  >
                    <option value="material">{t.groups.shareMaterial}</option>
                    <option value="exam">{t.groups.shareExam}</option>
                  </Select>
                )}
              </Field>

              <Field label={t.materials.titleField}>
                {(props) => (
                  <Select
                    {...props}
                    value={resourceId}
                    onChange={(event) => setResourceId(event.target.value)}
                  >
                    <option value="">{t.common.none}</option>
                    {(resourceType === "material" ? ownMaterials : ownExams).map(
                      (item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ),
                    )}
                  </Select>
                )}
              </Field>
            </div>

            <Button
              className="mt-4"
              size="sm"
              loading={busy}
              disabled={resourceId === ""}
              onClick={async () => {
                const ok = await act({
                  action: "share",
                  resourceType,
                  resourceId,
                  note: "",
                });
                if (ok) setResourceId("");
              }}
            >
              <ShareNetworkIcon size={15} aria-hidden="true" />
              {t.groups.share}
            </Button>
          </Card>

          {shares.length === 0 ? (
            <p className="rounded-surface border border-line bg-surface px-4 py-8 text-center text-sm text-ink-muted">
              {t.groups.sharedEmpty}
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-surface border border-line bg-surface">
              {shares.map((share) => (
                <li
                  key={share.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm text-ink">
                        {share.title}
                      </span>
                      <Badge tone="neutral">
                        {share.resourceType === "material"
                          ? t.nav.materials
                          : t.nav.exams}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-subtle">
                      {formatDateTime(share.createdAt, locale)}
                    </p>
                  </div>

                  {share.sharedBy === currentUserId || isOwner ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void act({ action: "unshare", shareId: share.id })
                      }
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-control text-ink-subtle hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                      aria-label={t.groups.unshare}
                      title={t.groups.unshare}
                    >
                      <TrashIcon size={15} aria-hidden="true" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Tabs.Content>

        {/* Discussion */}
        <Tabs.Content value="discussion">
          {messages.length === 0 ? (
            <p className="rounded-surface border border-line bg-surface px-4 py-8 text-center text-sm text-ink-muted">
              {t.groups.noMessages}
            </p>
          ) : (
            <ul className="space-y-3">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className="rounded-surface border border-line bg-surface p-4"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-ink">
                      {message.displayName || "?"}
                    </span>
                    <span className="shrink-0 text-xs text-ink-subtle">
                      {formatDateTime(message.createdAt, locale)}
                    </span>
                  </div>
                  {/* Rendered as text, never as HTML. */}
                  <p className="plain-text mt-1.5 text-sm text-ink-muted">
                    {message.body}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <Card className="mt-4 p-4">
            <Field label={t.groups.discussion}>
              {(props) => (
                <Textarea
                  {...props}
                  value={messageBody}
                  maxLength={2000}
                  placeholder={t.groups.messagePlaceholder}
                  onChange={(event) => setMessageBody(event.target.value)}
                />
              )}
            </Field>
            <Button
              className="mt-3"
              size="sm"
              loading={busy}
              disabled={messageBody.trim() === ""}
              onClick={async () => {
                const ok = await act({
                  action: "message",
                  body: messageBody.trim(),
                });
                if (ok) setMessageBody("");
              }}
            >
              <PaperPlaneTiltIcon size={15} aria-hidden="true" />
              {t.groups.send}
            </Button>
          </Card>
        </Tabs.Content>

        {/* Invite and membership */}
        <Tabs.Content value="invite">
          <Card className="p-5">
            <p className="text-sm text-ink-muted">{t.groups.inviteBody}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <code className="rounded-control border border-line bg-surface-sunken px-3 py-2 font-mono text-sm text-ink">
                {inviteCode}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <CopyIcon size={15} aria-hidden="true" />
                {copied ? t.common.copied : t.common.copy}
              </Button>

              {isOwner ? (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={busy}
                  onClick={() => void act({ action: "rotate_code" })}
                >
                  <ArrowsClockwiseIcon size={15} aria-hidden="true" />
                  {t.groups.regenerateCode}
                </Button>
              ) : null}
            </div>
          </Card>

          <div className="mt-6">
            {isOwner ? (
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                {t.groups.deleteGroup}
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setLeaveOpen(true)}>
                {t.groups.leave}
              </Button>
            )}
          </div>
        </Tabs.Content>
      </Tabs.Root>

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title={t.groups.leaveConfirmTitle}
        description={t.groups.leaveConfirmBody}
        confirmLabel={t.groups.leave}
        destructive
        busy={busy}
        onConfirm={async () => {
          const ok = await act({ action: "leave" });
          if (ok) router.push("/groups");
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t.groups.deleteConfirmTitle}
        description={t.groups.deleteConfirmBody}
        confirmLabel={t.common.delete}
        destructive
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          const response = await fetch(`/api/groups/${groupId}`, {
            method: "DELETE",
          });
          setBusy(false);
          if (response.ok) router.push("/groups");
        }}
      />
    </div>
  );
}
