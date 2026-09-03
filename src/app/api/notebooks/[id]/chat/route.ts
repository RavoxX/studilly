import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { assertRateLimit, parseBody, withUserAndParams } from "@/lib/api/route";
import { askNotebook } from "@/lib/notebooks/service";

const askSchema = z.object({
  question: z.string().trim().min(1).max(2_000),
});

/**
 * Asks a question of the notebook's sources.
 *
 * The answer comes back with the passages it leaned on. A notebook with no
 * readable sources answers `conflict`, because there is nothing to ground an
 * answer in and a model asked anyway would simply invent one.
 */
export const POST = withUserAndParams<{ id: string }>(
  async ({ user, request, params }) => {
    assertRateLimit(user.id, "notebook-chat", 30, 60_000);

    const body = await parseBody(request, askSchema);
    const result = await askNotebook({
      userId: user.id,
      notebookId: params.id,
      question: body.question,
    });

    if (result.ok) return apiSuccess(result.data);

    switch (result.reason) {
      case "not_found":
        return apiError("not_found");
      case "no_sources":
      case "sources_processing":
      case "no_text":
        return apiError("conflict", { reason: result.reason });
      case "limit_reached":
        return apiError("limit_reached", { metric: "notebook_chat" });
      default:
        return apiError("ai_unavailable");
    }
  },
  { name: "notebooks.chat" },
);
