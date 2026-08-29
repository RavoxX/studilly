import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/ssr";
import { Alert, Badge, EmptyState } from "@/components/ui/feedback";
import { SkeletonList } from "@/components/ui/skeleton";
import { GroupActions } from "./group-actions";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getT } from "@/i18n/server";

export const metadata: Metadata = { title: "Lerngruppen" };

export default async function GroupsPage() {
  const t = await getT();
  const supabase = await createClient();

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name_de, name_en")
    .order("position");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {t.groups.title}
          </h1>
          <p className="mt-1 max-w-[62ch] text-sm text-ink-muted">
            {t.groups.subtitle}
          </p>
        </div>
        <GroupActions subjects={subjects ?? []} />
      </div>

      <Alert tone="neutral" className="mb-6">
        {t.groups.privacyNote}
      </Alert>

      <Suspense fallback={<SkeletonList count={2} />}>
        <GroupList />
      </Suspense>
    </div>
  );
}

async function GroupList() {
  const { user } = await requireOnboardedUser();
  const t = await getT();
  const locale = await getLocale();
  const supabase = await createClient();

  // RLS on study_groups only returns groups the caller is a member of, so
  // this cannot leak anyone else's groups.
  const { data: groups } = await supabase
    .from("study_groups")
    .select(
      "id, name, description, owner_id, created_at, subjects(name_de, name_en), study_group_members(count), study_group_shares(count)",
    )
    .order("created_at", { ascending: false });

  if ((groups ?? []).length === 0) {
    return (
      <EmptyState
        icon={<UsersThreeIcon size={22} aria-hidden="true" />}
        title={t.groups.empty}
        description={t.groups.emptyBody}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {(groups ?? []).map((group) => {
        const subject = group.subjects as unknown as {
          name_de: string;
          name_en: string;
        } | null;
        const memberCount =
          (group.study_group_members as unknown as { count: number }[])?.[0]
            ?.count ?? 0;
        const shareCount =
          (group.study_group_shares as unknown as { count: number }[])?.[0]
            ?.count ?? 0;

        return (
          <li key={group.id}>
            <Link
              href={`/groups/${group.id}`}
              className="block rounded-surface border border-line bg-surface p-4 transition-colors hover:border-line-strong"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-ink">{group.name}</p>
                {subject ? (
                  <Badge tone="neutral">
                    {locale === "de" ? subject.name_de : subject.name_en}
                  </Badge>
                ) : null}
                {group.owner_id === user.id ? (
                  <Badge tone="brand">{t.groups.owner}</Badge>
                ) : null}
              </div>

              {group.description ? (
                <p className="mt-1.5 max-w-[70ch] text-sm text-ink-muted">
                  {group.description}
                </p>
              ) : null}

              <p className="mt-2 text-xs text-ink-subtle">
                {t.groups.members(memberCount)}
                {" · "}
                {shareCount} {t.groups.shared.toLowerCase()}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
