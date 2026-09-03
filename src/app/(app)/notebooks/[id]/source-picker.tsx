"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { Input } from "@/components/ui/field";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

export type PickableMaterial = {
  id: string;
  title: string;
  status: string;
};

/**
 * Choosing materials.
 *
 * Only the newest few are listed until something is typed. A student with
 * eighty uploads should not have to scroll a wall of checkboxes to find the
 * three they mean, and a list that long is slower to render than it is to
 * search.
 *
 * Materials still being read are shown but not selectable: a notebook built
 * on one would have nothing to retrieve from it.
 */
const SHOWN_BEFORE_SEARCH = 6;

export function SourcePicker({
  materials,
  selected,
  onChange,
  className,
}: {
  materials: readonly PickableMaterial[];
  selected: readonly string[];
  onChange: (next: string[]) => void;
  className?: string;
}) {
  const t = useT();
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      // Anything already ticked stays visible, so a selection cannot scroll
      // out of sight and be lost track of.
      const head = materials.slice(0, SHOWN_BEFORE_SEARCH);
      const chosen = materials.filter(
        (m) => selected.includes(m.id) && !head.includes(m),
      );
      return [...head, ...chosen];
    }
    return materials.filter((m) => m.title.toLowerCase().includes(needle));
  }, [materials, query, selected]);

  if (materials.length === 0) {
    return (
      <p className={cn("text-sm text-ink-muted", className)}>
        {t.notebooks.sources.noneAvailable}
      </p>
    );
  }

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
    );
  }

  return (
    <div className={className}>
      {materials.length > SHOWN_BEFORE_SEARCH ? (
        <div className="relative mb-3">
          <MagnifyingGlassIcon
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
          />
          <Input
            type="search"
            value={query}
            className="pl-9"
            placeholder={t.notebooks.sources.search}
            aria-label={t.notebooks.sources.search}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      ) : null}

      <ul className="divide-y divide-line rounded-surface border border-line">
        {visible.map((material) => {
          const usable = material.status === "ready";
          const checked = selected.includes(material.id);

          return (
            <li key={material.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm",
                  usable ? "text-ink hover:bg-surface-sunken" : "cursor-not-allowed",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!usable}
                  onChange={() => toggle(material.id)}
                  className="size-4 shrink-0 accent-[var(--brand)]"
                />
                <span className="min-w-0 flex-1 truncate">{material.title}</span>
                {!usable ? (
                  <span className="shrink-0 text-xs text-ink-subtle">
                    {t.notebooks.sources.processing}
                  </span>
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>

      {selected.length > 0 ? (
        <p className="mt-2 text-xs text-ink-subtle">
          {t.notebooks.sources.selected(selected.length)}
        </p>
      ) : null}
    </div>
  );
}
