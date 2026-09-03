import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BookOpenTextIcon } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { SkeletonList } from "@/components/ui/skeleton";
import { NotebookCreate } from "./notebook-create";
import { NotebookRowActions } from "./notebook-row-actions";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getT, getLocale } from "@/i18n/server";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Notebooks" };

export default async function NotebooksPage() {
  const t = await getT();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {t.notebooks.title}
          </h1>
          <p className="mt-1 max-w-[62ch] text-sm text-ink-muted">
            {t.notebooks.subtitle}
          </p>
        </div>
        <Suspense fallback={null}>
          <CreateControl />
        </Suspense>
      </div>

      <Suspense fallback={<SkeletonList count={3} />}>
        <NotebookList />
      </Suspense>
    </div>
  );
}

async function CreateControl() {
  const { user } = await requireOnboardedUser();
  const supabase = await createClient();

  const [{ data: subjects }, { data: materials }] = await Promise.all([
    supabase.from("subjects").select("id, name_de, name_en").order("position"),
    supabase
      .from("learning_materials")
      .select("id, title, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <NotebookCreate
      subjects={subjects ?? []}
      materials={materials ?? []}
    />
  );
}

async function NotebookList() {
  const { user } = await requireOnboardedUser();
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const supabase = await createClient();

  const { data: notebooks } = await supabase
    .from("notebooks")
    .select(
      "id, title, emoji, updated_at, subjects(name_de, name_en), notebook_sources(material_id)",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if ((notebooks ?? []).length === 0) {
    return (
      <EmptyState
        icon={<BookOpenTextIcon size={22} aria-hidden="true" />}
        title={t.notebooks.empty}
        description={t.notebooks.emptyBody}
      />
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {(notebooks ?? []).map((notebook) => {
        const subject = notebook.subjects as unknown as {
          name_de: string;
          name_en: string;
        } | null;
        const count = (notebook.notebook_sources ?? []).length;

        return (
          <li key={notebook.id}>
            <Card interactive className="relative h-full p-5">
              {/* The whole card is the link; the menu sits above it so its
                  own clicks do not navigate. */}
              <Link
                href={`/notebooks/${notebook.id}`}
                className="after:absolute after:inset-0 after:rounded-surface focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand"
              >
                <span className="text-2xl" aria-hidden="true">
                  {notebook.emoji}
                </span>
                <h2 className="mt-3 line-clamp-2 text-base font-semibold text-ink">
                  {notebook.title}
                </h2>
              </Link>

              <p className="mt-2 text-xs text-ink-subtle">
                {subject ? (
                  <span className="text-ink-muted">
                    {locale === "de" ? subject.name_de : subject.name_en}
                    {" · "}
                  </span>
                ) : null}
                {t.notebooks.sourceCount(count)}
              </p>
              <p className="mt-1 text-xs text-ink-subtle">
                {t.notebooks.updated(formatDate(notebook.updated_at, locale))}
              </p>

              <div className="absolute right-3 top-3 z-10">
                <NotebookRowActions
                  notebookId={notebook.id}
                  title={notebook.title}
                />
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
