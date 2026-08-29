import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { assertRateLimit, parseBody, withUser } from "@/lib/api/route";
import { createGroup, joinGroup } from "@/lib/groups/service";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(500).default(""),
    subjectId: z.uuid().nullable(),
  }),
  z.object({
    action: z.literal("join"),
    inviteCode: z.string().trim().min(4).max(24),
  }),
]);

export const POST = withUser(async ({ user, request }) => {
  // Joining is rate limited harder than creating: unbounded attempts would
  // let someone brute-force invite codes.
  assertRateLimit(user.id, "groups-write", 10, 60_000);

  const body = await parseBody(request, bodySchema);

  if (body.action === "create") {
    const result = await createGroup({
      userId: user.id,
      name: body.name,
      description: body.description,
      subjectId: body.subjectId,
    });

    if (!result.ok) {
      return result.reason === "limit_reached"
        ? apiError("limit_reached", { metric: "study_groups" })
        : apiError("server_error");
    }

    return apiSuccess(result.data, 201);
  }

  const result = await joinGroup({
    userId: user.id,
    inviteCode: body.inviteCode,
  });

  if (!result.ok) {
    switch (result.reason) {
      case "invalid_code":
        return apiError("not_found", { reason: "invalid_code" });
      case "already_member":
        return apiError("conflict", { reason: "already_member" });
      case "group_full":
        return apiError("conflict", { reason: "group_full" });
      case "limit_reached":
        return apiError("limit_reached", { metric: "study_groups" });
      default:
        return apiError("server_error");
    }
  }

  return apiSuccess(result.data);
}, { name: "groups.write" });
