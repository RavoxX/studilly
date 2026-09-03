import { apiError, apiSuccess } from "@/lib/api/response";
import { withUserAndParams } from "@/lib/api/route";
import { deleteArtifact } from "@/lib/notebooks/service";

export const DELETE = withUserAndParams<{ id: string; artifactId: string }>(
  async ({ user, params }) => {
    const deleted = await deleteArtifact({
      userId: user.id,
      artifactId: params.artifactId,
    });

    if (!deleted) return apiError("not_found");
    return apiSuccess({ deleted: true });
  },
  { name: "notebooks.artifact.delete" },
);
