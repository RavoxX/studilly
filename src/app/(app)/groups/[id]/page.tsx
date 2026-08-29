import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { Card, SectionHeader } from "@/components/ui/card";
import { Alert, Badge } from "@/components/ui/feedback";
import { GroupPanel } from "./group-panel";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getT } from "@/i18n/server";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Lerngruppe" };

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireOnboardedUser();
  const t = await getT();
  const locale = await getLocale();
  const supabase = await createClient();

  // RLS returns nothing unless the caller is a member, so this is the
  // membership check as well as the fetch.
  const { data: group } = await supabase
    .from("study_groups")
    .select(
      "id, name, description, owner_id, invite_code, member_limit, subjects(name_de, name_en)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!group) notFound();

  const [
    { data: members },
    { data: shares },
    { data: messages },
    { data: ownMaterials },
    { data: ownExams },
  ] = await Promise.all([
    supabase
      .from("study_group_members")
      .select("user_id, role, joined_at, profiles(display_name)")
      .eq("group_id", group.id)
      .order("joined_at"),
    supabase
      .from("study_group_shares")
      .select(
        "id, resource_type, note, created_at, shared_by, material_id, exam_id, learning_materials(title), exams(title)",
      )
      .eq("group_id", group.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("study_group_messages")
      .select("id, body, created_at, user_id, profiles(display_name)")
      .eq("group_id", group.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("learning_materials")
      .select("id, title")
      .eq("user_id", user.id)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("exams")
      .select("id, title")
      .eq("user_id", user.id)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const subject = group.subjects as unknown as {
    name_de: string;
    name_en: string;
  } | null;
  const isOwner = group.owner_id === user.id;

  return (
    <div>
      <Link
        href="/groups"
        className="inline-flex items-center gap-1.5 rounded-control text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeftIcon size={15} aria-hidden="true" />
        {t.groups.title}
      </Link>

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {group.name}
          </h1>
          {subject ? (
            <Badge tone="neutral">
              {locale === "de" ? subject.name_de : subject.name_en}
            </Badge>
          ) : null}
        </div>
        {group.description ? (
          <p className="mt-2 max-w-[70ch] text-sm text-ink-muted">
            {group.description}
          </p>
        ) : null}
      </div>

      <Alert tone="neutral" className="mt-6">
        {t.groups.shareHint}
      </Alert>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GroupPanel
            groupId={group.id}
            isOwner={isOwner}
            inviteCode={group.invite_code}
            currentUserId={user.id}
            shares={(shares ?? []).map((share) => {
              const material = share.learning_materials as unknown as {
                title: string;
              } | null;
              const exam = share.exams as unknown as { title: string } | null;
              return {
                id: share.id,
                title: material?.title ?? exam?.title ?? "",
                resourceType: share.resource_type as "material" | "exam",
                resourceId: share.material_id ?? share.exam_id ?? "",
                note: share.note,
                sharedBy: share.shared_by,
                createdAt: share.created_at,
              };
            })}
            messages={(messages ?? [])
              .map((message) => ({
                id: message.id,
                body: message.body,
                createdAt: message.created_at,
                userId: message.user_id,
                displayName:
                  (message.profiles as unknown as { display_name: string } | null)
                    ?.display_name ?? "",
              }))
              .reverse()}
            ownMaterials={ownMaterials ?? []}
            ownExams={ownExams ?? []}
          />
        </div>

        <aside>
          <Card className="p-5">
            <SectionHeader title={t.groups.memberList} />
            <ul className="space-y-2.5">
              {(members ?? []).map((member) => {
                const profile = member.profiles as unknown as {
                  display_name: string;
                } | null;
                return (
                  <li
                    key={member.user_id}
                    className="flex items-center justify-between gap-2"
                  >
                    {/* Only the display name is exposed. No email, no profile,
                        no learning data. */}
                    <span className="truncate text-sm text-ink">
                      {profile?.display_name || "?"}
                    </span>
                    {member.role === "owner" ? (
                      <Badge tone="brand">{t.groups.owner}</Badge>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 border-t border-line pt-3 text-xs text-ink-subtle">
              {t.groups.members((members ?? []).length)}
              {" · "}
              {formatDate(
                (members ?? [])[0]?.joined_at ?? new Date().toISOString(),
                locale,
              )}
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
