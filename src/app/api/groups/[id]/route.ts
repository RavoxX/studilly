import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  assertRateLimit,
  parseBody,
  withUserAndParams,
} from "@/lib/api/route";
import {
  deleteGroup,
  leaveGroup,
  postMessage,
  rotateInviteCode,
  shareResource,
  unshareResource,
} from "@/lib/groups/service";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("share"),
    resourceType: z.enum(["material", "exam"]),
    resourceId: z.uuid(),
    note: z.string().trim().max(500).default(""),
  }),
  z.object({ action: z.literal("unshare"), shareId: z.uuid() }),
  z.object({ action: z.literal("leave") }),
  z.object({ action: z.literal("rotate_code") }),
  z.object({
    action: z.literal("message"),
    body: z.string().trim().min(1).max(2000),
  }),
]);

export const POST = withUserAndParams<{ id: string }>(
  async ({ user, request, params }) => {
    assertRateLimit(user.id, "group-action", 40, 60_000);

    const body = await parseBody(request, actionSchema);

    switch (body.action) {
      case "share": {
        const result = await shareResource({
          userId: user.id,
          groupId: params.id,
          resourceType: body.resourceType,
          resourceId: body.resourceId,
          note: body.note,
        });
        if (!result.ok) {
          return result.reason === "forbidden"
            ? apiError("forbidden")
            : apiError("conflict", { reason: result.reason });
        }
        return apiSuccess(result.data, 201);
      }

      case "unshare": {
        const result = await unshareResource({
          userId: user.id,
          shareId: body.shareId,
        });
        if (!result.ok) {
          return result.reason === "forbidden"
            ? apiError("forbidden")
            : apiError("not_found");
        }
        return apiSuccess({ removed: true });
      }

      case "leave": {
        const result = await leaveGroup({
          userId: user.id,
          groupId: params.id,
        });
        if (!result.ok) {
          return result.reason === "owner_must_delete"
            ? apiError("conflict", { reason: "owner_must_delete" })
            : apiError("forbidden");
        }
        return apiSuccess({ left: true });
      }

      case "rotate_code": {
        const result = await rotateInviteCode({
          userId: user.id,
          groupId: params.id,
        });
        if (!result.ok) return apiError("forbidden");
        return apiSuccess(result.data);
      }

      case "message": {
        const result = await postMessage({
          userId: user.id,
          groupId: params.id,
          body: body.body,
        });
        if (!result.ok) return apiError("forbidden");
        return apiSuccess(result.data, 201);
      }
    }
  },
  { name: "groups.action" },
);

export const DELETE = withUserAndParams<{ id: string }>(
  async ({ user, params }) => {
    const result = await deleteGroup({ userId: user.id, groupId: params.id });
    if (!result.ok) {
      return result.reason === "forbidden"
        ? apiError("forbidden")
        : apiError("not_found");
    }
    return apiSuccess({ deleted: true });
  },
  { name: "groups.delete" },
);
