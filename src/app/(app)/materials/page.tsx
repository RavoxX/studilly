import type { Metadata } from "next";
import { Suspense } from "react";
import { BooksIcon } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/feedback";
import { SkeletonList } from "@/components/ui/skeleton";
import { MaterialUpload } from "./material-upload";
import { MaterialRow } from "./material-row";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/i18n/server";

export const metadata: Metadata = { title: "Materialien" };

export default async function MaterialsPage() {
  const t = await getT();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {t.materials.title}
          </h1>
          <p className="mt-1 max-w-[62ch] text-sm text-ink-muted">
            {t.materials.subtitle}
          </p>
        </div>
        <Suspense fallback={null}>
          <UploadControl />
        </Suspense>
      </div>

      <Suspense fallback={<SkeletonList count={4} />}>
        <MaterialList />
      </Suspense>
    </div>
  );
}

async function UploadControl() {
  const supabase = await createClient();
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name_de, name_en")
    .order("position");

  return <MaterialUpload subjects={subjects ?? []} />;
}

async function MaterialList() {
  const { user } = await requireOnboardedUser();
  const t = await getT();
  const supabase = await createClient();

  const { data: materials } = await supabase
    .from("learning_materials")
    .select(
      "id, title, status, mime_type, size_bytes, page_count, summary, created_at, subject_id, subjects(name_de, name_en)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if ((materials ?? []).length === 0) {
    return (
      <EmptyState
        icon={<BooksIcon size={22} aria-hidden="true" />}
        title={t.materials.empty}
        description={t.materials.emptyBody}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {(materials ?? []).map((material) => (
        <li key={material.id}>
          <MaterialRow
            material={{
              id: material.id,
              title: material.title,
              status: material.status,
              mimeType: material.mime_type,
              sizeBytes: Number(material.size_bytes),
              pageCount: material.page_count,
              summary: material.summary,
              createdAt: material.created_at,
              subject: material.subjects as unknown as {
                name_de: string;
                name_en: string;
              } | null,
            }}
          />
        </li>
      ))}
    </ul>
  );
}
