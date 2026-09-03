"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeftIcon,
  ArrowUpIcon,
  BookOpenTextIcon,
  ChartBarIcon,
  ChatCircleIcon,
  CardsThreeIcon,
  FileTextIcon,
  PlusIcon,
  PresentationChartIcon,
  QuestionIcon,
  SparkleIcon,
  TableIcon,
  TrashIcon,
  TreeStructureIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Textarea } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ArtifactView } from "./artifact-view";
import { NotebookHeading } from "./notebook-heading";
import { SourcePicker, type PickableMaterial } from "./source-picker";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";
import { ARTIFACT_KINDS, type ArtifactKind } from "@/lib/notebooks/schemas";

/**
 * The notebook workspace: sources, the conversation, and the Studio.
 *
 * Three panes side by side on a desktop, because the whole point is being
 * able to see what a notebook is made of while you question it. Below that
 * width they become three tabs rather than three stacked columns: a phone
 * showing all three at once shows none of them properly.
 *
 * Everything is held here rather than refetched. A student asks several
 * questions in a row and makes several outputs from the same sources, and a
 * full server round trip after each one would throw away the conversation's
 * scroll position for no gain.
 */

export type Source = {
  materialId: string;
  title: string;
  status: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: { materialTitle: string; quote: string }[];
};

export type Artifact = {
  id: string;
  kind: ArtifactKind;
  title: string;
  content: unknown;
};

type Pane = "sources" | "chat" | "studio";

const KIND_ICONS: Record<ArtifactKind, React.ReactNode> = {
  presentation: <PresentationChartIcon size={20} aria-hidden="true" />,
  mindmap: <TreeStructureIcon size={20} aria-hidden="true" />,
  flashcards: <CardsThreeIcon size={20} aria-hidden="true" />,
  quiz: <QuestionIcon size={20} aria-hidden="true" />,
  table: <TableIcon size={20} aria-hidden="true" />,
  infographic: <ChartBarIcon size={20} aria-hidden="true" />,
  report: <FileTextIcon size={20} aria-hidden="true" />,
};

export function NotebookWorkspace({
  notebookId,
  title,
  emoji,
  initialSources,
  initialMessages,
  initialArtifacts,
  library,
}: {
  notebookId: string;
  title: string;
  emoji: string;
  initialSources: Source[];
  initialMessages: Message[];
  initialArtifacts: Artifact[];
  library: PickableMaterial[];
}) {
  const t = useT();
  // A new notebook opens on its sources: it has none, and the first thing to
  // do is add one. An established one opens on the conversation.
  const [pane, setPane] = useState<Pane>(
    initialSources.length === 0 ? "sources" : "chat",
  );
  const [sources, setSources] = useState(initialSources);
  const [messages, setMessages] = useState(initialMessages);
  const [artifacts, setArtifacts] = useState(initialArtifacts);
  const [open, setOpen] = useState<Artifact | null>(null);
  const [name, setName] = useState({ title, emoji });

  const hasSources = sources.some((source) => source.status === "ready");

  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-[28rem] flex-col lg:h-[calc(100dvh-5rem)]">
      <header className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/notebooks" aria-label={t.notebooks.title}>
            <ArrowLeftIcon size={18} aria-hidden="true" />
          </Link>
        </Button>
        <NotebookHeading
          notebookId={notebookId}
          title={name.title}
          emoji={name.emoji}
          onChange={(next) => setName((current) => ({ ...current, ...next }))}
        />
      </header>

      {/* Tabs, below the three-column breakpoint only. */}
      <div
        role="tablist"
        aria-label={t.notebooks.title}
        className="mb-3 grid grid-cols-3 gap-1 rounded-surface bg-surface-sunken p-1 lg:hidden"
      >
        {(
          [
            ["sources", t.notebooks.sources.title],
            ["chat", t.notebooks.chat.title],
            ["studio", t.notebooks.studio.title],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={pane === value}
            onClick={() => setPane(value)}
            className={cn(
              "rounded-control px-3 py-1.5 text-sm font-medium transition-colors",
              pane === value
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[17rem_minmax(0,1fr)_21rem]">
        <SourcesPane
          hidden={pane !== "sources"}
          notebookId={notebookId}
          sources={sources}
          library={library}
          onChange={setSources}
          onNamed={(next) => setName(next)}
        />
        <ChatPane
          hidden={pane !== "chat"}
          notebookId={notebookId}
          messages={messages}
          hasSources={hasSources}
          onChange={setMessages}
        />
        <StudioPane
          hidden={pane !== "studio"}
          notebookId={notebookId}
          artifacts={artifacts}
          hasSources={hasSources}
          onChange={setArtifacts}
          onOpen={setOpen}
        />
      </div>

      <ArtifactDialog
        artifact={open}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}

// --- Sources ---------------------------------------------------------------

function SourcesPane({
  hidden,
  notebookId,
  sources,
  library,
  onChange,
  onNamed,
}: {
  hidden: boolean;
  notebookId: string;
  sources: Source[];
  library: PickableMaterial[];
  onChange: (next: Source[]) => void;
  onNamed: (name: { title: string; emoji: string }) => void;
}) {
  const t = useT();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Already-attached materials are not offered again.
  const available = library.filter(
    (material) => !sources.some((source) => source.materialId === material.id),
  );

  async function add() {
    setBusy(true);
    const response = await fetch(`/api/notebooks/${notebookId}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materialIds: selected }),
    });
    setBusy(false);

    if (!response.ok) return;

    onChange([
      ...sources,
      ...selected.flatMap((id) => {
        const material = library.find((item) => item.id === id);
        return material
          ? [{ materialId: id, title: material.title, status: material.status }]
          : [];
      }),
    ]);

    // Adding the first sources is also what names the notebook, and the
    // response carries the name it chose.
    const body = (await response.json().catch(() => null)) as {
      title?: string | null;
      emoji?: string | null;
    } | null;
    if (body?.title && body.emoji) {
      onNamed({ title: body.title, emoji: body.emoji });
    }

    setSelected([]);
    setAdding(false);
    router.refresh();
  }

  async function remove(materialId: string) {
    onChange(sources.filter((source) => source.materialId !== materialId));
    await fetch(`/api/notebooks/${notebookId}/sources/${materialId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  return (
    <Pane hidden={hidden}>
      <PaneHeader title={t.notebooks.sources.title}>
        <Button
          size="sm"
          variant="secondary"
          disabled={available.length === 0}
          onClick={() => setAdding(true)}
        >
          <PlusIcon size={14} weight="bold" aria-hidden="true" />
          {t.notebooks.sources.add}
        </Button>
      </PaneHeader>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {sources.length === 0 ? (
          <div className="px-2 py-6 text-center">
            <p className="text-sm text-ink-muted">
              {t.notebooks.sources.emptyBody}
            </p>
            {available.length > 0 ? (
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setAdding(true)}
              >
                <PlusIcon size={14} weight="bold" aria-hidden="true" />
                {t.notebooks.sources.add}
              </Button>
            ) : (
              <p className="mt-2 text-sm text-ink-subtle">
                {t.notebooks.sources.noneAvailable}
              </p>
            )}
          </div>
        ) : (
          <ul className="space-y-1">
            {sources.map((source) => (
              <li
                key={source.materialId}
                className="group flex items-center gap-2 rounded-control px-2 py-2 hover:bg-surface-sunken"
              >
                <BookOpenTextIcon
                  size={16}
                  aria-hidden="true"
                  className="shrink-0 text-ink-subtle"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{source.title}</p>
                  {source.status !== "ready" ? (
                    <p className="text-xs text-ink-subtle">
                      {t.notebooks.sources.processing}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label={t.notebooks.sources.removeLabel(source.title)}
                  onClick={() => void remove(source.materialId)}
                  className="shrink-0 rounded-control p-1 text-ink-subtle opacity-0 transition-opacity hover:bg-surface hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <XIcon size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog.Root open={adding} onOpenChange={(next) => !busy && setAdding(next)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-surface border border-line bg-surface shadow-lg">
            <Dialog.Title className="p-5 pb-3 text-base font-semibold text-ink">
              {t.notebooks.sources.addTitle}
            </Dialog.Title>
            <div className="min-h-0 flex-1 overflow-y-auto px-5">
              <SourcePicker
                materials={available}
                selected={selected}
                onChange={setSelected}
              />
            </div>
            <div className="flex justify-end gap-3 p-5">
              <Dialog.Close asChild>
                <Button variant="ghost" disabled={busy}>
                  {t.common.cancel}
                </Button>
              </Dialog.Close>
              <Button
                loading={busy}
                disabled={selected.length === 0}
                onClick={() => void add()}
              >
                {t.notebooks.sources.add}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Pane>
  );
}

// --- Chat ------------------------------------------------------------------

function ChatPane({
  hidden,
  notebookId,
  messages,
  hasSources,
  onChange,
}: {
  hidden: boolean;
  notebookId: string;
  messages: Message[];
  hasSources: boolean;
  onChange: (next: Message[]) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  // Follows the thread as it grows, the way every chat does.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, pending]);

  async function send() {
    const question = draft.trim();
    if (!question || pending) return;

    setDraft("");
    setError(null);
    setPending(true);

    // The question appears immediately. Waiting for the round trip to show
    // what you just typed makes the whole thing feel broken.
    const asked: Message = {
      id: `local-${Date.now()}`,
      role: "user",
      content: question,
      citations: [],
    };
    const thread = [...messages, asked];
    onChange(thread);

    const response = await fetch(`/api/notebooks/${notebookId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    setPending(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        details?: { reason?: string };
      } | null;

      setError(
        body?.error === "limit_reached"
          ? t.notebooks.chat.limitReached
          : body?.details?.reason === "no_sources"
            ? t.notebooks.chat.noSources
            : t.notebooks.chat.failed,
      );
      return;
    }

    const body = (await response.json()) as {
      answer: string;
      citations: { materialTitle: string; quote: string }[];
      followUp: string;
    };

    onChange([
      ...thread,
      {
        id: `local-${Date.now()}-a`,
        role: "assistant",
        content: body.answer,
        citations: body.citations,
      },
    ]);
  }

  return (
    <Pane hidden={hidden}>
      {/* Only for alignment: the other two panes have a header, and without
          one here the conversation starts higher than they do. On a phone the
          tab above already names the pane and the row does not exist, so the
          header would only cost a line of the thread. */}
      <PaneHeader title={t.notebooks.chat.title} className="hidden lg:flex" />

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex size-11 items-center justify-center rounded-surface bg-surface-sunken text-ink-subtle">
              <ChatCircleIcon size={22} aria-hidden="true" />
            </div>
            <p className="text-base font-semibold text-ink">
              {t.notebooks.chat.empty}
            </p>
            <p className="mt-2 max-w-[42ch] text-sm text-ink-muted">
              {t.notebooks.chat.emptyBody}
            </p>
          </div>
        ) : (
          <ul className="space-y-5">
            {messages.map((message) =>
              message.role === "user" ? (
                <li key={message.id} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-surface bg-brand px-4 py-2.5 text-sm leading-relaxed text-on-brand">
                    {message.content}
                  </p>
                </li>
              ) : (
                <li key={message.id}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                    {message.content}
                  </p>

                  {message.citations.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {message.citations.map((citation, i) => (
                        <li
                          key={i}
                          className="rounded-surface border border-line bg-surface-sunken px-3 py-2"
                        >
                          <p className="text-xs font-medium text-ink-muted">
                            {citation.materialTitle}
                          </p>
                          {/* The passage itself, quoted, so the claim can be
                              checked without opening the material. */}
                          <p className="mt-1 border-l-2 border-line-strong pl-2.5 text-xs italic leading-relaxed text-ink-subtle">
                            {citation.quote}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ),
            )}
          </ul>
        )}

        {pending ? (
          <p className="mt-5 flex items-center gap-2 text-sm text-ink-subtle">
            <SparkleIcon size={15} aria-hidden="true" className="animate-pulse" />
            {t.notebooks.chat.thinking}
          </p>
        ) : null}

        <div ref={bottom} />
      </div>

      <div className="border-t border-line p-3">
        {error ? (
          <Alert tone="danger" className="mb-3">
            {error}
          </Alert>
        ) : null}

        <div className="flex items-end gap-2">
          <Textarea
            rows={1}
            value={draft}
            disabled={!hasSources}
            placeholder={
              hasSources
                ? t.notebooks.chat.placeholder
                : t.notebooks.chat.noSources
            }
            aria-label={t.notebooks.chat.placeholder}
            className="min-h-10 max-h-40"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends; shift-enter is a newline. Standard for chat, and
              // the questions people ask here are one line.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <Button
            size="icon"
            aria-label={t.notebooks.chat.send}
            loading={pending}
            disabled={!hasSources || draft.trim().length === 0}
            onClick={() => void send()}
          >
            <ArrowUpIcon size={18} weight="bold" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Pane>
  );
}

// --- Studio ----------------------------------------------------------------

function StudioPane({
  hidden,
  notebookId,
  artifacts,
  hasSources,
  onChange,
  onOpen,
}: {
  hidden: boolean;
  notebookId: string;
  artifacts: Artifact[];
  hasSources: boolean;
  onChange: (next: Artifact[]) => void;
  onOpen: (artifact: Artifact) => void;
}) {
  const t = useT();
  const router = useRouter();
  const [asking, setAsking] = useState<ArtifactKind | null>(null);
  const [instruction, setInstruction] = useState("");
  const [running, setRunning] = useState<ArtifactKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Artifact | null>(null);

  async function generate(kind: ArtifactKind) {
    setAsking(null);
    setRunning(kind);
    setError(null);

    const response = await fetch(`/api/notebooks/${notebookId}/artifacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        instruction: instruction.trim() || null,
      }),
    });

    setRunning(null);
    setInstruction("");

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        details?: { reason?: string };
      } | null;

      setError(
        body?.error === "limit_reached"
          ? t.notebooks.studio.limitReached
          : body?.details?.reason === "no_sources"
            ? t.notebooks.studio.noSources
            : t.notebooks.studio.failed,
      );
      return;
    }

    const artifact = (await response.json()) as Artifact;
    onChange([artifact, ...artifacts]);
    // Straight into the thing that was just made: nobody asks for a deck in
    // order to look at a row in a list.
    onOpen(artifact);
    router.refresh();
  }

  async function remove(artifact: Artifact) {
    onChange(artifacts.filter((item) => item.id !== artifact.id));
    setConfirming(null);
    await fetch(`/api/notebooks/${notebookId}/artifacts/${artifact.id}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  return (
    <Pane hidden={hidden}>
      <PaneHeader title={t.notebooks.studio.title} />

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <ul className="grid grid-cols-2 gap-2">
          {ARTIFACT_KINDS.map((kind) => (
            <li key={kind}>
              <button
                type="button"
                disabled={!hasSources || running !== null}
                onClick={() => setAsking(kind)}
                className={cn(
                  "flex h-full w-full flex-col gap-1.5 rounded-surface border border-line bg-surface p-3 text-left transition-colors",
                  "hover:border-line-strong hover:bg-surface-sunken",
                  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-surface",
                  running === kind && "border-brand bg-brand-soft",
                )}
              >
                <span
                  className={cn(
                    "text-ink-subtle",
                    running === kind && "animate-pulse text-brand-text",
                  )}
                >
                  {KIND_ICONS[kind]}
                </span>
                <span className="text-sm font-medium text-ink">
                  {t.notebooks.kinds[kind]}
                </span>
                <span className="text-xs leading-snug text-ink-subtle">
                  {running === kind
                    ? t.notebooks.studio.generating
                    : t.notebooks.kindHints[kind]}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {error ? (
          <Alert tone="danger" className="mt-3">
            {error}
          </Alert>
        ) : null}

        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-ink-subtle">
            {t.notebooks.studio.subtitle}
          </p>

          {artifacts.length === 0 ? (
            <p className="px-1 py-4 text-sm text-ink-muted">
              {t.notebooks.studio.emptyBody}
            </p>
          ) : (
            <ul className="space-y-1">
              {artifacts.map((artifact) => (
                <li key={artifact.id} className="group flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(artifact)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-control px-2 py-2 text-left hover:bg-surface-sunken"
                  >
                    <span className="shrink-0 text-ink-subtle">
                      {KIND_ICONS[artifact.kind]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">
                        {artifact.title}
                      </span>
                      <span className="block text-xs text-ink-subtle">
                        {t.notebooks.kinds[artifact.kind]}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={t.notebooks.studio.deleteLabel(artifact.title)}
                    onClick={() => setConfirming(artifact)}
                    className="shrink-0 rounded-control p-1.5 text-ink-subtle opacity-0 transition-opacity hover:bg-surface-sunken hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <TrashIcon size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Asked once, before the call: the instruction is the difference
          between a deck about everything and a deck about chapter three. */}
      <Dialog.Root
        open={asking !== null}
        onOpenChange={(next) => !next && setAsking(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-surface border border-line bg-surface p-5 shadow-lg">
            <Dialog.Title className="text-base font-semibold text-ink">
              {asking ? t.notebooks.kinds[asking] : ""}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-ink-muted">
              {asking ? t.notebooks.kindHints[asking] : ""}
            </Dialog.Description>

            <label className="mt-4 block text-sm font-medium text-ink">
              {t.notebooks.studio.instructionLabel}
              <Textarea
                rows={2}
                value={instruction}
                className="mt-2 font-normal"
                placeholder={t.notebooks.studio.instructionPlaceholder}
                maxLength={500}
                onChange={(event) => setInstruction(event.target.value)}
              />
            </label>

            <div className="mt-5 flex justify-end gap-3">
              <Dialog.Close asChild>
                <Button variant="ghost">{t.common.cancel}</Button>
              </Dialog.Close>
              <Button onClick={() => asking && void generate(asking)}>
                {t.notebooks.studio.generate}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(next) => !next && setConfirming(null)}
        title={confirming?.title ?? ""}
        description={t.notebooks.studio.deleteLabel(confirming?.title ?? "")}
        confirmLabel={t.common.delete}
        destructive
        onConfirm={() => {
          if (confirming) void remove(confirming);
        }}
      />
    </Pane>
  );
}

// --- Shared ----------------------------------------------------------------

/**
 * A pane.
 *
 * Hidden with the `hidden` attribute rather than unmounted, so switching tabs
 * on a phone keeps the chat's scroll position and any half-typed question.
 * Above the breakpoint all three are shown regardless.
 */
function Pane({
  hidden,
  children,
}: {
  hidden: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-surface border border-line bg-surface",
        hidden ? "hidden lg:flex" : "flex",
      )}
    >
      {children}
    </section>
  );
}

function PaneHeader({
  title,
  children,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line px-3",
        className,
      )}
    >
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {children}
    </div>
  );
}

/** A generated output, full width, over the workspace. */
function ArtifactDialog({
  artifact,
  onClose,
}: {
  artifact: Artifact | null;
  onClose: () => void;
}) {
  const t = useT();

  return (
    <Dialog.Root open={artifact !== null} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-surface border border-line bg-surface shadow-lg">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line p-5">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold text-ink">
                {artifact?.title}
              </Dialog.Title>
              <p className="mt-0.5 text-xs text-ink-subtle">
                {artifact ? t.notebooks.kinds[artifact.kind] : ""}
              </p>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label={t.notebooks.studio.close}>
                <XIcon size={18} aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {artifact ? (
              <ArtifactView kind={artifact.kind} content={artifact.content} />
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
