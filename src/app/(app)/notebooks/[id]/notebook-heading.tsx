"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Input } from "@/components/ui/field";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

/** A small, fixed set. A free-text emoji field invites pasted nonsense. */
const EMOJI = [
  "📓", "📐", "🧪", "🌍", "📚", "🧠",
  "⚗️", "🎼", "💻", "🏛️", "🧬", "📊",
];

/**
 * The notebook's name, in its header.
 *
 * Both halves are editable in place because both are guesses: the title and
 * the symbol were chosen by a model from the first thing the student added,
 * and a guess a student cannot correct is worse than no guess. Editing either
 * one also stops the automatic naming, so a title someone typed is never
 * replaced when they add another document.
 */
export function NotebookHeading({
  notebookId,
  title,
  emoji,
  onChange,
}: {
  notebookId: string;
  title: string;
  emoji: string;
  onChange: (next: { title?: string; emoji?: string }) => void;
}) {
  const t = useT();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  async function save(next: { title?: string; emoji?: string }) {
    // Shown immediately: a rename that waits for the network reads as a
    // field that swallowed what was typed.
    onChange(next);

    await fetch(`/api/notebooks/${notebookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    router.refresh();
  }

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === title) {
      setDraft(title);
      return;
    }
    void save({ title: trimmed });
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={t.notebooks.emojiLabel}
            className="flex size-9 shrink-0 items-center justify-center rounded-control text-xl transition-colors hover:bg-surface-sunken"
          >
            <span aria-hidden="true">{emoji}</span>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="z-50 grid grid-cols-6 gap-1 rounded-surface border border-line bg-surface p-2 shadow-lg"
          >
            {EMOJI.map((option) => (
              <DropdownMenu.Item
                key={option}
                aria-label={option}
                onSelect={() => void save({ emoji: option })}
                className={cn(
                  "flex size-9 cursor-pointer items-center justify-center rounded-control text-xl outline-none transition-colors",
                  emoji === option
                    ? "bg-brand-soft"
                    : "data-[highlighted]:bg-surface-sunken",
                )}
              >
                <span aria-hidden="true">{option}</span>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {editing ? (
        <Input
          ref={input}
          value={draft}
          maxLength={200}
          aria-label={t.notebooks.nameLabel}
          className="h-9 max-w-md text-lg font-semibold"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape") {
              setDraft(title);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          title={t.notebooks.rename}
          onClick={() => {
            setDraft(title);
            setEditing(true);
          }}
          className="min-w-0 truncate rounded-control px-1.5 py-1 text-lg font-semibold tracking-tight text-ink transition-colors hover:bg-surface-sunken"
        >
          {title}
        </button>
      )}
    </div>
  );
}
