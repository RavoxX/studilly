"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowClockwiseIcon,
  DotsThreeVerticalIcon,
  FilePdfIcon,
  FileTextIcon,
  ImageIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Badge } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useI18n } from "@/i18n/client";
import { formatBytes, formatDate } from "@/lib/utils/format";
import type { Database } from "@/types/database";

type MaterialStatus = Database["public"]["Enums"]["material_status"];

const STATUS_TONE: Record<MaterialStatus, "neutral" | "brand" | "success" | "danger"> =
  {
    uploaded: "neutral",
    extracting: "brand",
    analyzing: "brand",
    ready: "success",
    failed: "danger",
  };

export function MaterialRow({
  material,
}: {
  material: {
    id: string;
    title: string;
    status: MaterialStatus;
    mimeType: string;
    sizeBytes: number;
    pageCount: number | null;
    summary: string | null;
    createdAt: string;
    subject: { name_de: string; name_en: string } | null;
  };
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const inProgress =
    material.status === "uploaded" ||
    material.status === "extracting" ||
    material.status === "analyzing";

  async function reprocess() {
    setBusy(true);
    await fetch(`/api/materials/${material.id}/process`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    await fetch(`/api/materials/${material.id}`, { method: "DELETE" });
    setBusy(false);
    setConfirmOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-start gap-4 rounded-surface border border-line bg-surface p-4">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-sunken text-ink-subtle">
          <FileIcon mimeType={material.mimeType} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/materials/${material.id}`}
              className="rounded-control text-sm font-medium text-ink hover:text-brand-text"
            >
              {material.title}
            </Link>
            <Badge tone={STATUS_TONE[material.status]}>
              {t.materials.status[material.status]}
            </Badge>
            {material.subject ? (
              <Badge tone="neutral">
                {locale === "de"
                  ? material.subject.name_de
                  : material.subject.name_en}
              </Badge>
            ) : null}
          </div>

          {material.summary ? (
            <p className="mt-1.5 line-clamp-2 max-w-[70ch] text-sm text-ink-muted">
              {material.summary}
            </p>
          ) : null}

          <p className="mt-1.5 text-xs text-ink-subtle">
            {formatDate(material.createdAt, locale)}
            {" · "}
            {formatBytes(material.sizeBytes, locale)}
            {material.pageCount ? ` · ${t.materials.pages(material.pageCount)}` : ""}
          </p>
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              disabled={busy || inProgress}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-control text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-40"
              aria-label={t.common.moreOptions}
            >
              <DotsThreeVerticalIcon size={18} aria-hidden="true" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="z-50 min-w-44 rounded-surface border border-line bg-surface p-1 shadow-lg"
            >
              {material.status === "failed" ? (
                <DropdownMenu.Item
                  onSelect={() => void reprocess()}
                  className="flex cursor-default items-center gap-2.5 rounded-control px-3 py-2 text-sm text-ink outline-none data-[highlighted]:bg-surface-sunken"
                >
                  <ArrowClockwiseIcon size={16} aria-hidden="true" />
                  {t.materials.reprocess}
                </DropdownMenu.Item>
              ) : null}
              <DropdownMenu.Item
                onSelect={() => setConfirmOpen(true)}
                className="flex cursor-default items-center gap-2.5 rounded-control px-3 py-2 text-sm text-danger outline-none data-[highlighted]:bg-danger-soft"
              >
                <TrashIcon size={16} aria-hidden="true" />
                {t.common.delete}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t.materials.deleteConfirmTitle}
        description={t.materials.deleteConfirmBody}
        confirmLabel={t.common.delete}
        destructive
        busy={busy}
        onConfirm={remove}
      />
    </>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/pdf") {
    return <FilePdfIcon size={19} aria-hidden="true" />;
  }
  if (mimeType.startsWith("image/")) {
    return <ImageIcon size={19} aria-hidden="true" />;
  }
  return <FileTextIcon size={19} aria-hidden="true" />;
}
