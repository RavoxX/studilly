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
  notebookNameSchema,
  type ArtifactKind,
} from "./schemas";
import {
  artifactInput,
  artifactSystemPrompt,
  chatInput,
  chatSystemPrompt,
  nameInput,
  nameSystemPrompt,
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
  | {
      ok: false;
      reason:
        | "not_found"
        | "limit_reached"
        | "ai_failed"
        /** Nothing attached at all. */
        | "no_sources"
        /** Attached, but still being read. */
        | "sources_processing"
        /** Attached and finished, but nothing came out of them to search. */
        | "no_text";
    };

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

/**
 * What a notebook can actually read, and why it cannot when it cannot.
 *
 * The three failure states are genuinely different and used to collapse into
 * one message. A photo of a worksheet finishes processing and is marked
 * ready, but before transcription existed it produced no passages at all, so
 * a notebook holding one told the student to "add a source first" while
 * showing them the source they had added. Telling them which of the three it
 * is is the difference between a fixable situation and a broken app.
 */
async function readySources(
  notebookId: string,
  userId: string,
): Promise<
  | { ok: true; sources: { id: string; title: string }[] }
  | { ok: false; reason: "no_sources" | "sources_processing" | "no_text" }
> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("notebook_sources")
    .select("material_id, learning_materials!inner(title, status)")
    .eq("notebook_id", notebookId)
    .eq("user_id", userId);

  const rows = (data ?? []).map((row) => ({
    id: row.material_id,
    material: row.learning_materials as unknown as {
      title: string;
      status: string;
    } | null,
  }));

  if (rows.length === 0) return { ok: false, reason: "no_sources" };

  const ready = rows.flatMap((row) =>
    row.material?.status === "ready"
      ? [{ id: row.id, title: row.material.title }]
      : [],
  );

  if (ready.length === 0) return { ok: false, reason: "sources_processing" };

  // Ready is not the same as readable: a file can finish processing without
  // yielding a single passage.
  const { count } = await admin
    .from("material_chunks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("material_id", ready.map((source) => source.id));

  if ((count ?? 0) === 0) return { ok: false, reason: "no_text" };

  return { ok: true, sources: ready };
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

/**
 * Creates an empty notebook.
 *
 * There is nothing to ask for up front. A notebook without sources cannot be
 * described, so making someone name it before they have added anything asks
 * them to summarise a thing that does not exist yet; the name is chosen from
 * the material once there is material. Sources are added inside the notebook,
 * where the student can see what is already in it.
 */
export async function createNotebook(args: {
  userId: string;
  title: string;
  emoji: string;
  subjectId: string | null;
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
  return { ok: true, data: { notebookId: notebook.id } };
}

/**
 * Renames a notebook by hand.
 *
 * Setting `named_by_user` is the point: after this the automatic naming stops
 * touching it, so a title someone typed is never quietly replaced when they
 * add another document.
 */
export async function renameNotebook(args: {
  userId: string;
  notebookId: string;
  title?: string;
  emoji?: string;
}): Promise<boolean> {
  const admin = createAdminClient();

  const { count } = await admin
    .from("notebooks")
    .update(
      {
        ...(args.title !== undefined ? { title: args.title } : {}),
        ...(args.emoji !== undefined ? { emoji: args.emoji } : {}),
        named_by_user: true,
        updated_at: new Date().toISOString(),
      },
      { count: "exact" },
    )
    .eq("id", args.notebookId)
    .eq("user_id", args.userId);

  return (count ?? 0) > 0;
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
}): Promise<
  NotebookResult<{ added: number; title: string | null; emoji: string | null }>
> {
  const admin = createAdminClient();

  const { data: owned } = await admin
    .from("learning_materials")
    .select("id")
    .eq("user_id", args.userId)
    .in("id", [...args.materialIds]);

  const { data: notebook } = await admin
    .from("notebooks")
    .select("id, named_by_user")
    .eq("id", args.notebookId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (!notebook) return { ok: false, reason: "not_found" };
  if (!owned || owned.length === 0) {
    return { ok: true, data: { added: 0, title: null, emoji: null } };
  }

  await admin.from("notebook_sources").upsert(
    owned.map((material) => ({
      notebook_id: args.notebookId,
      material_id: material.id,
      user_id: args.userId,
    })),
    { onConflict: "notebook_id,material_id" },
  );

  // Naming happens here rather than at creation, because this is the first
  // moment there is anything to name it after. It keeps happening as sources
  // are added, so a notebook that started with one worksheet grows into a
  // title that covers all of it — until someone types their own.
  const named = notebook.named_by_user
    ? null
    : await autoName(args.userId, args.notebookId);

  await touch(args.notebookId);
  return {
    ok: true,
    data: {
      added: owned.length,
      title: named?.title ?? null,
      emoji: named?.emoji ?? null,
    },
  };
}

/**
 * Picks a title and a symbol from what the notebook holds.
 *
 * Reads the opening of each source rather than searching them: naming is not
 * a question, and the first page of a document is what a person glances at to
 * decide what to call it. The cheapest model, no reasoning — see
 * `notebook_title` in lib/ai/models.
 *
 * Failure is silent on purpose. The student asked to add a document, not to
 * name a notebook; if the model is unavailable they keep the placeholder and
 * the next add tries again.
 */
async function autoName(
  userId: string,
  notebookId: string,
): Promise<{ title: string; emoji: string } | null> {
  const admin = createAdminClient();

  const readable = await readySources(notebookId, userId);
  if (!readable.ok) return null;
  const sources = readable.sources;

  const opening = await firstChunks({
    userId,
    materialIds: sources.map((source) => source.id),
    limit: 4,
  });
  if (opening.length === 0) return null;

  const titles = new Map(sources.map((source) => [source.id, source.title]));

  try {
    const subscription = await getSubscription(userId);
    const result = await generateStructured({
      task: "notebook_title",
      plan: subscription.plan,
      schemaName: "notebook_name",
      schema: notebookNameSchema,
      system: nameSystemPrompt(),
      input: nameInput({
        sources: opening.map((chunk) => ({
          title: titles.get(chunk.materialId) ?? chunk.source,
          content: chunk.content,
        })),
      }),
    });

    await admin
      .from("notebooks")
      .update({ title: result.data.title, emoji: result.data.emoji })
      .eq("id", notebookId)
      .eq("user_id", userId)
      // Not if the student renamed it while this was in flight.
      .eq("named_by_user", false);

    return result.data;
  } catch (error) {
    console.error(
      "[studilly:notebooks] naming failed:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
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

  const readable = await readySources(args.notebookId, args.userId);
  if (!readable.ok) return { ok: false, reason: readable.reason };
  const sources = readable.sources;

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
    return { ok: false, reason: "no_text" };
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

  const readable = await readySources(args.notebookId, args.userId);
  if (!readable.ok) return { ok: false, reason: readable.reason };
  const sources = readable.sources;

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
    return { ok: false, reason: "no_text" };
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
