import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  ClipboardTextIcon,
  LinkSimpleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { Alert, Badge } from "@/components/ui/feedback";
import { Reprocess } from "./reprocess";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getT } from "@/i18n/server";
import { formatBytes, formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Material" };

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireOnboardedUser();
  const t = await getT();
  const locale = await getLocale();
  const supabase = await createClient();

  // RLS restricts this to the caller's own materials, so a guessed id returns
  // nothing rather than someone else's schoolwork.
  const { data: material } = await supabase
    .from("learning_materials")
    .select(
      "id, title, status, summary, error_message, mime_type, size_bytes, page_count, detected_language, created_at, subject_id, subjects(name_de, name_en)",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!material) notFound();

  const [{ data: topics }, { count: chunkCount }] = await Promise.all([
    supabase
      .from("material_topics")
      .select(
        "id, title, summary, match_confidence, curriculum_topic_id, curriculum_topics(title_de)",
      )
      .eq("material_id", material.id)
      .order("position"),
    // Whether anything searchable came out of it. A material with topics but
    // no passages looks processed and answers nothing.
    supabase
      .from("material_chunks")
      .select("id", { count: "exact", head: true })
      .eq("material_id", material.id),
  ]);

  const subject = material.subjects as unknown as {
    name_de: string;
    name_en: string;
  } | null;

  return (
    <div>
      <Link
        href="/materials"
        className="inline-flex items-center gap-1.5 rounded-control text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeftIcon size={15} aria-hidden="true" />
        {t.materials.title}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {material.title}
          </h1>
          <p className="mt-1.5 text-sm text-ink-subtle">
            {formatDate(material.created_at, locale)}
            {" · "}
            {formatBytes(Number(material.size_bytes), locale)}
            {material.page_count
              ? ` · ${t.materials.pages(material.page_count)}`
              : ""}
            {subject
              ? ` · ${locale === "de" ? subject.name_de : subject.name_en}`
              : ""}
          </p>
        </div>

        {material.status === "ready" && material.subject_id ? (
          <Button asChild>
            <Link
              href={`/exams/new?material=${material.id}&subject=${material.subject_id}`}
            >
              <ClipboardTextIcon size={17} aria-hidden="true" />
              {t.materials.createExam}
            </Link>
          </Button>
        ) : null}
      </div>

      {material.status === "failed" ? (
        <Reprocess materialId={material.id} tone="failed" />
      ) : null}

      {/* Finished, but nothing came out of it. The upload looks fine in every
          list and is invisible to everything that searches, which is the most
          confusing state a material can be in, so it is named here. */}
      {material.status === "ready" && chunkCount === 0 ? (
        <Reprocess materialId={material.id} tone="empty" />
      ) : null}

      {material.status !== "ready" && material.status !== "failed" ? (
        <Alert tone="brand" className="mt-6">
          {t.materials.status[material.status]}
        </Alert>
      ) : null}

      {material.summary ? (
        <Card className="mt-6 p-5">
          <SectionHeader title={t.materials.summary} />
          <p className="max-w-[70ch] text-sm leading-relaxed text-ink-muted">
            {material.summary}
          </p>
        </Card>
      ) : null}

      <section className="mt-6">
        <SectionHeader title={t.materials.topics} />

        {(topics ?? []).length === 0 ? (
          <p className="text-sm text-ink-muted">{t.materials.topicsEmpty}</p>
        ) : (
          <ul className="divide-y divide-line rounded-surface border border-line bg-surface">
            {(topics ?? []).map((topic) => {
              const curriculum = topic.curriculum_topics as unknown as {
                title_de: string;
              } | null;
              return (
                <li key={topic.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-ink">{topic.title}</p>
                    {curriculum ? (
                      <Badge tone="brand" icon={<LinkSimpleIcon size={12} aria-hidden="true" />}>
                        {curriculum.title_de}
                      </Badge>
                    ) : null}
                  </div>
                  {topic.summary ? (
                    <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">
                      {topic.summary}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
