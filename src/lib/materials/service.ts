import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSubscription } from "@/lib/subscription/service";
import { embed } from "@/lib/ai/client";
import { analyseMaterial, transcribeImages } from "@/lib/ai/service";
import { chunkText, embeddingTextFor } from "./chunk";
import { extractText, isImage, ExtractionError } from "./extract";
import { curriculumTopicsFor } from "@/lib/curriculum/service";
import type { Bundesland, EducationStage, SchoolType } from "@/config/education";

/**
 * Material processing pipeline.
 *
 * upload -> extract -> chunk -> embed -> analyse -> map to curriculum -> ready
 *
 * Runs entirely server-side after an upload has been registered. Each stage
 * updates `learning_materials.status`, so the UI can show what is happening
 * rather than an indeterminate spinner, and a failure leaves a specific
 * status plus an error message rather than a stuck row.
 *
 * Cost control: the whole document is chunked and embedded once, here. Exam
 * generation later retrieves only the passages it needs. Embedding a
 * 30-page script costs a fraction of a cent; re-sending it on every exam
 * would not.
 */

export type ProcessResult =
  | { ok: true; chunkCount: number; topicCount: number }
  | { ok: false; reason: string };

export async function processMaterial(args: {
  materialId: string;
  userId: string;
  education: {
    bundesland: Bundesland;
    schoolType: SchoolType;
    stage: EducationStage;
    grade: number;
  };
}): Promise<ProcessResult> {
  const admin = createAdminClient();

  // Ownership is checked here rather than assumed: this runs with the
  // service-role key, so RLS is not protecting us.
  const { data: material, error } = await admin
    .from("learning_materials")
    .select("id, user_id, title, storage_path, mime_type, subject_id")
    .eq("id", args.materialId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (error || !material) return { ok: false, reason: "not_found" };

  const fail = async (reason: string, message: string) => {
    await admin
      .from("learning_materials")
      .update({ status: "failed", error_message: message })
      .eq("id", material.id);
    return { ok: false as const, reason };
  };

  try {
    // --- Extract ----------------------------------------------------------
    await admin
      .from("learning_materials")
      .update({ status: "extracting", error_message: null })
      .eq("id", material.id);

    const download = await admin.storage
      .from("materials")
      .download(material.storage_path);

    if (download.error || !download.data) {
      return fail("download_failed", "Die Datei konnte nicht gelesen werden.");
    }

    const buffer = await download.data.arrayBuffer();
    const extraction = await extractText(buffer, material.mime_type);

    // Photos and scans have no text layer; they go to the model as images.
    const images: string[] = [];
    if (extraction.needsVision && isImage(material.mime_type)) {
      const base64 = Buffer.from(buffer).toString("base64");
      images.push(`data:${material.mime_type};base64,${base64}`);
    }

    if (extraction.text.trim().length === 0 && images.length === 0) {
      return fail(
        "no_text",
        "Aus dieser Datei ließ sich kein Text lesen.",
      );
    }

    // A photo has no text layer, so read it back as one. Without this the
    // upload ends up with topics and a summary but nothing to retrieve, and
    // every feature that searches the student's material — notebooks, exams
    // built from selected documents, practice — sees an empty file.
    let text = extraction.text;
    if (text.trim().length === 0 && images.length > 0) {
      const { plan: transcriptionPlan } = await getSubscription(args.userId);
      try {
        const transcription = await transcribeImages({
          plan: transcriptionPlan,
          filename: material.title,
          images,
        });
        text = transcription.data.text;
      } catch (error) {
        // Not fatal: the analysis below still reads the image directly, so the
        // upload keeps its topics even when transcription fails.
        console.error(
          "[studilly:materials] transcription failed:",
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    // --- Chunk and embed --------------------------------------------------
    const chunks = chunkText(text);

    if (chunks.length > 0) {
      const vectors = await embed(chunks.map(embeddingTextFor));

      await admin.from("material_chunks").delete().eq("material_id", material.id);

      const { error: chunkError } = await admin.from("material_chunks").insert(
        chunks.map((chunk, index) => ({
          material_id: material.id,
          user_id: args.userId,
          chunk_index: chunk.index,
          content: chunk.content,
          heading: chunk.heading,
          page_from: null,
          page_to: null,
          token_estimate: chunk.tokenEstimate,
          embedding: JSON.stringify(vectors[index] ?? []),
        })),
      );

      if (chunkError) {
        return fail("chunk_failed", "Die Datei konnte nicht verarbeitet werden.");
      }
    }

    // --- Analyse ----------------------------------------------------------
    await admin
      .from("learning_materials")
      .update({
        status: "analyzing",
        char_count: text.length,
        page_count: extraction.pageCount,
      })
      .eq("id", material.id);

    const [{ data: subjects }, curriculumTopics] = await Promise.all([
      admin.from("subjects").select("id, key, name_de"),
      curriculumTopicsFor({
        bundesland: args.education.bundesland,
        schoolType: args.education.schoolType,
        stage: args.education.stage,
        grade: args.education.grade,
        subjectId: material.subject_id,
      }),
    ]);

    const { plan } = await getSubscription(args.userId);
    const analysis = await analyseMaterial({
      plan,
      filename: material.title,
      text,
      images,
      subjectOptions: (subjects ?? []).map((s) => ({
        key: s.key,
        name: s.name_de,
      })),
      curriculumTopics: curriculumTopics.map((topic) => ({
        id: topic.id,
        title: topic.title_de,
      })),
    });

    // --- Store topics -----------------------------------------------------
    const validTopicIds = new Set(curriculumTopics.map((topic) => topic.id));

    await admin.from("material_topics").delete().eq("material_id", material.id);

    if (analysis.data.topics.length > 0) {
      await admin.from("material_topics").insert(
        analysis.data.topics.slice(0, 12).map((topic, index) => ({
          material_id: material.id,
          user_id: args.userId,
          title: topic.title.slice(0, 200),
          summary: topic.summary?.slice(0, 500) ?? null,
          // A model can return an id that does not exist. Only accept ids we
          // actually offered it.
          curriculum_topic_id:
            topic.curriculum_topic_id &&
            validTopicIds.has(topic.curriculum_topic_id)
              ? topic.curriculum_topic_id
              : null,
          match_confidence: clamp01(topic.match_confidence),
          position: index,
        })),
      );
    }

    // Adopt the detected subject only when the student did not choose one.
    let subjectId = material.subject_id;
    if (!subjectId && analysis.data.subject_key) {
      const match = (subjects ?? []).find(
        (s) => s.key === analysis.data.subject_key,
      );
      subjectId = match?.id ?? null;
    }

    await admin
      .from("learning_materials")
      .update({
        status: "ready",
        subject_id: subjectId,
        summary: analysis.data.summary.slice(0, 1000),
        detected_language: analysis.data.detected_language.slice(0, 10),
        processed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", material.id);

    return {
      ok: true,
      chunkCount: chunks.length,
      topicCount: analysis.data.topics.length,
    };
  } catch (caught) {
    if (caught instanceof ExtractionError) {
      return fail("extraction_failed", caught.message);
    }
    console.error(
      "[studilly:materials] processing failed:",
      caught instanceof Error ? caught.message : "unknown",
    );
    return fail("processing_failed", "Die Verarbeitung ist fehlgeschlagen.");
  }
}

/**
 * Retrieves the passages most relevant to a set of topics.
 *
 * One embedding call for the combined query, then a vector search scoped to
 * the student's own chunks. This is what keeps exam generation affordable.
 */
/**
 * A passage, with enough about where it came from to attribute it.
 *
 * `source` names the section within a document; `materialId` names the
 * document. Exams only ever needed the first, but a notebook citation has to
 * say which of the student's own uploads a claim came from.
 */
export type RetrievedChunk = {
  materialId: string;
  source: string;
  content: string;
};

export async function retrieveRelevantChunks(args: {
  userId: string;
  materialIds: readonly string[];
  topics: readonly string[];
  limit?: number;
}): Promise<RetrievedChunk[]> {
  const admin = createAdminClient();

  const query =
    args.topics.length > 0
      ? args.topics.join("\n")
      : "Zusammenfassung der wichtigsten Inhalte";

  const [queryVector] = await embed([query]);
  if (!queryVector) return [];

  const { data, error } = await admin.rpc("match_material_chunks", {
    query_embedding: JSON.stringify(queryVector),
    target_user: args.userId,
    // Omitted entirely rather than passed as null, so the SQL default applies
    // and the search covers every material the student owns.
    ...(args.materialIds.length > 0
      ? { material_ids: [...args.materialIds] }
      : {}),
    match_count: args.limit ?? 14,
    min_similarity: 0.1,
  });

  if (error || !data) {
    console.error("[studilly:materials] retrieval failed:", error?.message);
    return [];
  }

  return data.map((row) => ({
    materialId: row.material_id,
    source: row.heading ?? `Abschnitt ${row.chunk_index + 1}`,
    content: row.content,
  }));
}

/**
 * Falls back to the first chunks of each material when retrieval finds
 * nothing, so a student whose embeddings failed still gets an exam rather
 * than an error.
 */
export async function firstChunks(args: {
  userId: string;
  materialIds: readonly string[];
  limit?: number;
}): Promise<RetrievedChunk[]> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("material_chunks")
    .select("material_id, content, heading, chunk_index")
    .eq("user_id", args.userId)
    .in("material_id", [...args.materialIds])
    .order("chunk_index")
    .limit(args.limit ?? 10);

  return (data ?? []).map((row) => ({
    materialId: row.material_id,
    source: row.heading ?? `Abschnitt ${row.chunk_index + 1}`,
    content: row.content,
  }));
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(1, Math.max(0, value)) * 100) / 100;
}
