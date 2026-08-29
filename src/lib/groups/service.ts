import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { assertGroupSlotAvailable, LimitReachedError } from "@/lib/subscription/service";

/**
 * Study groups.
 *
 * The rule that shapes this whole module: joining a group grants access to
 * the group, never to a member's library. Only resources deliberately shared
 * into a group become visible, and only inside that group.
 *
 * Membership writes happen here rather than from the browser because
 * `study_group_members` has no client INSERT policy. Without one, a user
 * cannot add themselves to a group id they guessed; they have to present a
 * valid invite code, and this module checks it.
 *
 * Every function that takes a group id also takes the caller's user id and
 * verifies membership, because the service-role client bypasses RLS.
 */

export type GroupResult<T> = { ok: true; data: T } | { ok: false; reason: string };

export async function createGroup(args: {
  userId: string;
  name: string;
  description: string;
  subjectId: string | null;
}): Promise<GroupResult<{ groupId: string; inviteCode: string }>> {
  try {
    await assertGroupSlotAvailable(args.userId);
  } catch (error) {
    if (error instanceof LimitReachedError) {
      return { ok: false, reason: "limit_reached" };
    }
    throw error;
  }

  const admin = createAdminClient();

  const { data: group, error } = await admin
    .from("study_groups")
    .insert({
      owner_id: args.userId,
      name: args.name,
      description: args.description,
      subject_id: args.subjectId,
    })
    .select("id, invite_code")
    .single();

  if (error || !group) return { ok: false, reason: "failed" };

  const { error: memberError } = await admin.from("study_group_members").insert({
    group_id: group.id,
    user_id: args.userId,
    role: "owner",
  });

  if (memberError) {
    await admin.from("study_groups").delete().eq("id", group.id);
    return { ok: false, reason: "failed" };
  }

  return {
    ok: true,
    data: { groupId: group.id, inviteCode: group.invite_code },
  };
}

export async function joinGroup(args: {
  userId: string;
  inviteCode: string;
}): Promise<GroupResult<{ groupId: string }>> {
  const admin = createAdminClient();

  // Look the group up by CODE, never by id. That is what makes an invite an
  // invite: knowing a group's id is not enough to join it.
  const { data: group } = await admin
    .from("study_groups")
    .select("id, member_limit")
    .eq("invite_code", args.inviteCode.trim().toLowerCase())
    .maybeSingle();

  if (!group) return { ok: false, reason: "invalid_code" };

  const { data: existing } = await admin
    .from("study_group_members")
    .select("group_id")
    .eq("group_id", group.id)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (existing) return { ok: false, reason: "already_member" };

  const { count } = await admin
    .from("study_group_members")
    .select("user_id", { count: "exact", head: true })
    .eq("group_id", group.id);

  if ((count ?? 0) >= group.member_limit) {
    return { ok: false, reason: "group_full" };
  }

  try {
    await assertGroupSlotAvailable(args.userId);
  } catch (error) {
    if (error instanceof LimitReachedError) {
      return { ok: false, reason: "limit_reached" };
    }
    throw error;
  }

  const { error } = await admin.from("study_group_members").insert({
    group_id: group.id,
    user_id: args.userId,
    role: "member",
  });

  if (error) return { ok: false, reason: "failed" };

  return { ok: true, data: { groupId: group.id } };
}

/** True when the caller is a member. Used before every group operation. */
export async function isMember(
  groupId: string,
  userId: string,
): Promise<{ member: boolean; owner: boolean }> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("study_group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  return { member: Boolean(data), owner: data?.role === "owner" };
}

/**
 * Shares a resource into a group.
 *
 * Two independent checks, both required: the caller must be a member of the
 * group, AND must own the resource. Skipping the second would turn sharing
 * into a way to expose someone else's material.
 */
export async function shareResource(args: {
  userId: string;
  groupId: string;
  resourceType: "material" | "exam";
  resourceId: string;
  note: string;
}): Promise<GroupResult<{ shareId: string }>> {
  const admin = createAdminClient();

  const { member } = await isMember(args.groupId, args.userId);
  if (!member) return { ok: false, reason: "forbidden" };

  // Ownership of the resource itself.
  if (args.resourceType === "material") {
    const { data } = await admin
      .from("learning_materials")
      .select("id")
      .eq("id", args.resourceId)
      .eq("user_id", args.userId)
      .maybeSingle();
    if (!data) return { ok: false, reason: "forbidden" };
  } else {
    const { data } = await admin
      .from("exams")
      .select("id")
      .eq("id", args.resourceId)
      .eq("user_id", args.userId)
      .maybeSingle();
    if (!data) return { ok: false, reason: "forbidden" };
  }

  const { data: share, error } = await admin
    .from("study_group_shares")
    .insert({
      group_id: args.groupId,
      shared_by: args.userId,
      resource_type: args.resourceType,
      material_id: args.resourceType === "material" ? args.resourceId : null,
      exam_id: args.resourceType === "exam" ? args.resourceId : null,
      note: args.note.slice(0, 500),
    })
    .select("id")
    .single();

  if (error || !share) {
    // The partial unique indexes make a repeat share a conflict rather than a
    // duplicate row.
    return { ok: false, reason: "already_shared" };
  }

  return { ok: true, data: { shareId: share.id } };
}

export async function unshareResource(args: {
  userId: string;
  shareId: string;
}): Promise<GroupResult<null>> {
  const admin = createAdminClient();

  const { data: share } = await admin
    .from("study_group_shares")
    .select("id, group_id, shared_by")
    .eq("id", args.shareId)
    .maybeSingle();

  if (!share) return { ok: false, reason: "not_found" };

  const { owner } = await isMember(share.group_id, args.userId);
  // The sharer can always withdraw; a group owner can remove anything.
  if (share.shared_by !== args.userId && !owner) {
    return { ok: false, reason: "forbidden" };
  }

  await admin.from("study_group_shares").delete().eq("id", share.id);
  return { ok: true, data: null };
}

export async function leaveGroup(args: {
  userId: string;
  groupId: string;
}): Promise<GroupResult<null>> {
  const admin = createAdminClient();

  const { member, owner } = await isMember(args.groupId, args.userId);
  if (!member) return { ok: false, reason: "not_member" };

  // A group without an owner cannot be administered, so the owner deletes the
  // group rather than leaving it.
  if (owner) {
    const { count } = await admin
      .from("study_group_members")
      .select("user_id", { count: "exact", head: true })
      .eq("group_id", args.groupId);

    if ((count ?? 0) > 1) return { ok: false, reason: "owner_must_delete" };

    await admin.from("study_groups").delete().eq("id", args.groupId);
    return { ok: true, data: null };
  }

  // Withdraw what this member shared: they should not keep exposing their own
  // material to a group they have left.
  await admin
    .from("study_group_shares")
    .delete()
    .eq("group_id", args.groupId)
    .eq("shared_by", args.userId);

  await admin
    .from("study_group_members")
    .delete()
    .eq("group_id", args.groupId)
    .eq("user_id", args.userId);

  return { ok: true, data: null };
}

export async function deleteGroup(args: {
  userId: string;
  groupId: string;
}): Promise<GroupResult<null>> {
  const admin = createAdminClient();

  const { data: group } = await admin
    .from("study_groups")
    .select("id, owner_id")
    .eq("id", args.groupId)
    .maybeSingle();

  if (!group) return { ok: false, reason: "not_found" };
  if (group.owner_id !== args.userId) return { ok: false, reason: "forbidden" };

  // Members, shares and messages cascade. Nobody's materials are touched.
  await admin.from("study_groups").delete().eq("id", group.id);
  return { ok: true, data: null };
}

export async function rotateInviteCode(args: {
  userId: string;
  groupId: string;
}): Promise<GroupResult<{ inviteCode: string }>> {
  const admin = createAdminClient();

  const { owner } = await isMember(args.groupId, args.userId);
  if (!owner) return { ok: false, reason: "forbidden" };

  const code = randomCode();

  const { data, error } = await admin
    .from("study_groups")
    .update({ invite_code: code })
    .eq("id", args.groupId)
    .select("invite_code")
    .single();

  if (error || !data) return { ok: false, reason: "failed" };
  return { ok: true, data: { inviteCode: data.invite_code } };
}

export async function postMessage(args: {
  userId: string;
  groupId: string;
  body: string;
}): Promise<GroupResult<{ messageId: string }>> {
  const admin = createAdminClient();

  const { member } = await isMember(args.groupId, args.userId);
  if (!member) return { ok: false, reason: "forbidden" };

  const { data, error } = await admin
    .from("study_group_messages")
    .insert({
      group_id: args.groupId,
      user_id: args.userId,
      body: args.body.trim().slice(0, 2000),
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, reason: "failed" };
  return { ok: true, data: { messageId: data.id } };
}

function randomCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
