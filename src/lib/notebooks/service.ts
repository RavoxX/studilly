import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateStructured, AiError } from "@/lib/ai/client";
import { firstChunks, retrieveRelevantChunks } from "@/lib/materials/service";
import { consume, release, getSubscription } from "@/lib/subscription/service";
import { LimitReachedError } from "@/lib/subscription/service";
import {
  ARTIFACT_SCHEMAS,
  chatAnswerSchema,
  type ArtifactKind,
} from "./schemas";
import {
  artifactInput,
  artifactSystemPrompt,
  chatInput,
  chatSystemPrompt,
  NOTEBOOK_PROMPT_VERSION,
} from "./prompts";

/**
 * Notebooks.
 *
 * A notebook is a set of the student's own materials plus everything made from
 * them. Two operations cost a model call and are therefore metered: asking a
 * question, and producing a Studio output.
 *
 * Both are grounded the same way. The passages are retrieved from the
 * notebook's sources and only those, so an answer cannot quietly come from the
 * model's own knowledge of the topic: in a study tool that is worse than
 * saying "not in your notes", because the student cannot tell which half was
 * theirs.
 */

export type NotebookResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "not_found" | "no_sources" | "limit_reached" | "ai_failed" };

/** How much source text a single call is allowed to carry. */
const CHUNKS_FOR_CHAT = 12;
const CHUNKS_FOR_ARTIFACT = 24;

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/**
 * Loads a notebook the caller owns, along with which materials it holds.
 *
 * Through the session client, so the row-level policy decides ownership. A
 * notebook that is not the caller's reads as missing, which is the same answer
 * a genuinely missing one gives.
 */
export async function getNotebook(notebookId: string) {
  const supabase = await createClient();

  const { data: notebook } = await supabase
    .from("notebooks")
    .select("id, title, emoji, subject_id, created_at, updated_at")
    .eq("id", notebookId)
    .maybeSingle();

  if (!notebook) return null;

  const [{ data: sources }, { data: messages }, { data: artifacts }] =
    await Promise.all([
      supabase
        .from("notebook_sources")
        .select(
          "material_id, added_at, learning_materials(id, title, status, mime_type, size_bytes)",
        )
        .eq("notebook_id", notebookId)
        .order("added_at"),
      supabase
        .from("notebook_messages")
        .select("id, role, content, citations, created_at")
        .eq("notebook_id", notebookId)
        .order("created_at"),
      supabase
        .from("notebook_artifacts")
        .select("id, kind, title, status, content, error_message, created_at")
        .eq("notebook_id", notebookId)
        .order("created_at", { ascending: false }),
    ]);

  return {
    notebook,
    sources: sources ?? [],
    messages: messages ?? [],
    artifacts: artifacts ?? [],
  };
}

/** The readable sources of a notebook, with their titles. */
async function readySources(
  notebookId: string,
  userId: string,
): Promise<{ id: string; title: string }[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("notebook_sources")
    .select("material_id, learning_materials!inner(title, status)")
    .eq("notebook_id", notebookId)
    .eq("user_id", userId);

  return (data ?? []).flatMap((row) => {
    const material = row.learning_materials as unknown as {
      title: string;
      status: string;
    } | null;
    return material?.status === "ready"
      ? [{ id: row.material_id, title: material.title }]
      : [];
  });
}

/**
 * Passages for a question, labelled by the document they came from.
 *
 * A notebook citation has to name one of the student's own uploads, so each
 * passage is titled "<document> · <section>" rather than by section alone.
 * Vector search can come back empty when a question shares no vocabulary with
 * the material; rather than refuse, the notebook falls back to the opening of
 * each source, which is what a person flicking through would read first.
 */
async function passagesFor(args: {
  userId: string;
  sources: readonly { id: string; title: string }[];
  topics: readonly string[];
  limit: number;
}): Promise<{ title: string; content: string }[]> {
  const materialIds = args.sources.map((source) => source.id);
  const titles = new Map(args.sources.map((source) => [source.id, source.title]));

  let chunks = await retrieveRelevantChunks({
    userId: args.userId,
    materialIds,
    topics: args.topics,
    limit: args.limit,
  });

  if (chunks.length === 0) {
    chunks = await firstChunks({
      userId: args.userId,
      materialIds,
      limit: args.limit,
    });
  }

  return chunks.map((chunk) => ({
    title: `${titles.get(chunk.materialId) ?? chunk.source} · ${chunk.source}`,
    content: chunk.content,
  }));
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

export async function createNotebook(args: {
  userId: string;
  title: string;
  emoji: string;
  subjectId: string | null;
  materialIds: readonly string[];
}): Promise<NotebookResult<{ notebookId: string }>> {
  const admin = createAdminClient();

  const { data: notebook, error } = await admin
    .from("notebooks")
    .insert({
      user_id: args.userId,
      title: args.title,
      emoji: args.emoji,
      subject_id: args.subjectId,
    })
    .select("id")
    .single();

  if (error || !notebook) return { ok: false, reason: "not_found" };

  if (args.materialIds.length > 0) {
    await addSources({
      userId: args.userId,
      notebookId: notebook.id,
      materialIds: args.materialIds,
    });
  }

  return { ok: true, data: { notebookId: notebook.id } };
}

/**
 * Adds materials as sources.
 *
 * The insert is filtered to materials the student actually owns before it is
 * written, so a crafted request cannot attach somebody else's upload to a
 * notebook and then read it back through the chat.
 */
export async function addSources(args: {
  userId: string;
  notebookId: string;
  materialIds: readonly string[];
}): Promise<NotebookResult<{ added: number }>> {
  const admin = createAdminClient();

  const { data: owned } = await admin
    .from("learning_materials")
    .select("id")
    .eq("user_id", args.userId)
    .in("id", [...args.materialIds]);

  const { data: notebook } = await admin
    .from("notebooks")
    .select("id")
    .eq("id", args.notebookId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (!notebook) return { ok: false, reason: "not_found" };
  if (!owned || owned.length === 0) return { ok: true, data: { added: 0 } };

  await admin.from("notebook_sources").upsert(
    owned.map((material) => ({
      notebook_id: args.notebookId,
      material_id: material.id,
      user_id: args.userId,
    })),
    { onConflict: "notebook_id,material_id" },
  );

  await touch(args.notebookId);
  return { ok: true, data: { added: owned.length } };
}

export async function removeSource(args: {
  userId: string;
  notebookId: string;
  materialId: string;
}): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("notebook_sources")
    .delete()
    .eq("notebook_id", args.notebookId)
    .eq("material_id", args.materialId)
    .eq("user_id", args.userId);
  await touch(args.notebookId);
}

export async function deleteNotebook(args: {
  userId: string;
  notebookId: string;
}): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("notebooks")
    .delete({ count: "exact" })
    .eq("id", args.notebookId)
    .eq("user_id", args.userId);
  return (count ?? 0) > 0;
}

async function touch(notebookId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("notebooks")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", notebookId);
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export async function askNotebook(args: {
  userId: string;
  notebookId: string;
  question: string;
}): Promise<
  NotebookResult<{
    answer: string;
    citations: { materialTitle: string; quote: string }[];
    followUp: string;
  }>
> {
  const admin = createAdminClient();

  const { data: notebook } = await admin
    .from("notebooks")
    .select("id, title")
    .eq("id", args.notebookId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (!notebook) return { ok: false, reason: "not_found" };

  const sources = await readySources(args.notebookId, args.userId);
  if (sources.length === 0) return { ok: false, reason: "no_sources" };

  try {
    await consume(args.userId, "notebook_chat");
  } catch (error) {
    if (error instanceof LimitReachedError) return { ok: false, reason: "limit_reached" };
    throw error;
  }

  // The question is stored before the answer is attempted. A failed call
  // should not lose what the student typed.
  await admin.from("notebook_messages").insert({
    notebook_id: args.notebookId,
    user_id: args.userId,
    role: "user",
    content: args.question,
  });

  const { data: history } = await admin
    .from("notebook_messages")
    .select("role, content")
    .eq("notebook_id", args.notebookId)
    .order("created_at", { ascending: false })
    .limit(7);

  const passages = await passagesFor({
    userId: args.userId,
    sources,
    topics: [args.question],
    limit: CHUNKS_FOR_CHAT,
  });

  if (passages.length === 0) {
    await release(args.userId, "notebook_chat");
    return { ok: false, reason: "no_sources" };
  }

  const subscription = await getSubscription(args.userId);

  try {
    const result = await generateStructured({
      task: "notebook_chat",
      plan: subscription.plan,
      schemaName: "notebook_answer",
      schema: chatAnswerSchema,
      system: chatSystemPrompt(),
      input: chatInput({
        question: args.question,
        sources: passages,
        history: (history ?? []).reverse().slice(0, -1),
      }),
    });

    await admin.from("notebook_messages").insert({
      notebook_id: args.notebookId,
      user_id: args.userId,
      role: "assistant",
      content: result.data.answer,
      citations: result.data.citations,
    });

    await touch(args.notebookId);
    return { ok: true, data: result.data };
  } catch (error) {
    await release(args.userId, "notebook_chat");
    if (error instanceof AiError) {
      console.error("[studilly:notebooks] chat failed:", error.message);
      return { ok: false, reason: "ai_failed" };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Studio
// ---------------------------------------------------------------------------

export type GeneratedArtifact = {
  id: string;
  kind: ArtifactKind;
  title: string;
  content: unknown;
  created_at: string;
};

export async function generateArtifact(args: {
  userId: string;
  notebookId: string;
  kind: ArtifactKind;
  instruction: string | null;
}): Promise<NotebookResult<GeneratedArtifact>> {
  const admin = createAdminClient();

  const { data: notebook } = await admin
    .from("notebooks")
    .select("id, title")
    .eq("id", args.notebookId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (!notebook) return { ok: false, reason: "not_found" };

  const sources = await readySources(args.notebookId, args.userId);
  if (sources.length === 0) return { ok: false, reason: "no_sources" };

  try {
    await consume(args.userId, "notebook_artifact");
  } catch (error) {
    if (error instanceof LimitReachedError) return { ok: false, reason: "limit_reached" };
    throw error;
  }

  const passages = await passagesFor({
    userId: args.userId,
    sources,
    topics: [args.instruction ?? notebook.title],
    limit: CHUNKS_FOR_ARTIFACT,
  });

  if (passages.length === 0) {
    await release(args.userId, "notebook_artifact");
    return { ok: false, reason: "no_sources" };
  }

  const subscription = await getSubscription(args.userId);

  try {
    const result = await generateStructured({
      task: "notebook_artifact",
      plan: subscription.plan,
      schemaName: `notebook_${args.kind}`,
      schema: ARTIFACT_SCHEMAS[args.kind],
      system: artifactSystemPrompt(args.kind),
      input: artifactInput({
        notebookTitle: notebook.title,
        instruction: args.instruction,
        sources: passages,
      }),
    });

    const content = result.data as { title?: string; root?: string };
    const { data: artifact, error } = await admin
      .from("notebook_artifacts")
      .insert({
        notebook_id: args.notebookId,
        user_id: args.userId,
        kind: args.kind,
        // A mind map has a root rather than a title; everything else has one.
        title: content.title ?? content.root ?? notebook.title,
        status: "ready",
        content: result.data,
        model_used: `${result.usage.model} (${NOTEBOOK_PROMPT_VERSION})`,
      })
      .select("id, kind, title, content, created_at")
      .single();

    if (error || !artifact) {
      await release(args.userId, "notebook_artifact");
      return { ok: false, reason: "ai_failed" };
    }

    await touch(args.notebookId);
    return {
      ok: true,
      data: {
        id: artifact.id,
        kind: args.kind,
        title: artifact.title,
        content: artifact.content,
        created_at: artifact.created_at,
      },
    };
  } catch (error) {
    await release(args.userId, "notebook_artifact");
    if (error instanceof AiError) {
      console.error(
        `[studilly:notebooks] ${args.kind} failed:`,
        error.message,
      );
      return { ok: false, reason: "ai_failed" };
    }
    throw error;
  }
}

export async function deleteArtifact(args: {
  userId: string;
  artifactId: string;
}): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("notebook_artifacts")
    .delete({ count: "exact" })
    .eq("id", args.artifactId)
    .eq("user_id", args.userId);
  return (count ?? 0) > 0;
}
