import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotebookWorkspace, type Message } from "./notebook-workspace";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getNotebook } from "@/lib/notebooks/service";
import { ARTIFACT_KINDS, type ArtifactKind } from "@/lib/notebooks/schemas";

export const metadata: Metadata = { title: "Notebook" };

export default async function NotebookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireOnboardedUser();

  const loaded = await getNotebook(id);
  // The query runs under the row-level policy, so somebody else's notebook
  // comes back empty and answers exactly as a deleted one does.
  if (!loaded) notFound();

  const supabase = await createClient();
  const { data: library } = await supabase
    .from("learning_materials")
    .select("id, title, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <NotebookWorkspace
      notebookId={loaded.notebook.id}
      title={loaded.notebook.title}
      emoji={loaded.notebook.emoji}
      library={library ?? []}
      initialSources={loaded.sources.flatMap((source) => {
        const material = source.learning_materials as unknown as {
          title: string;
          status: string;
        } | null;
        return material
          ? [
              {
                materialId: source.material_id,
                title: material.title,
                status: material.status,
              },
            ]
          : [];
      })}
      initialMessages={loaded.messages.map(
        (message): Message => ({
          id: message.id,
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.content,
          // Stored as jsonb, so its shape is checked here rather than trusted.
          citations: parseCitations(message.citations),
        }),
      )}
      initialArtifacts={loaded.artifacts
        .filter((artifact) => isArtifactKind(artifact.kind))
        .map((artifact) => ({
          id: artifact.id,
          kind: artifact.kind as ArtifactKind,
          title: artifact.title,
          content: artifact.content,
        }))}
    />
  );
}

function isArtifactKind(value: string): value is ArtifactKind {
  return (ARTIFACT_KINDS as readonly string[]).includes(value);
}

function parseCitations(
  value: unknown,
): { materialTitle: string; quote: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const { materialTitle, quote } = entry as Record<string, unknown>;
    return typeof materialTitle === "string" && typeof quote === "string"
      ? [{ materialTitle, quote }]
      : [];
  });
}
