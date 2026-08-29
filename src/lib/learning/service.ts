import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { AiError } from "@/lib/ai/client";
import { generateFlashcards } from "@/lib/ai/service";
import { consume, release } from "@/lib/subscription/service";
import { firstChunks } from "@/lib/materials/service";
import {
  initialCardState,
  orderReviewQueue,
  ratingFromValue,
  scheduleReview,
  type Rating,
} from "./srs";
import type { Bundesland, EducationStage, SchoolType } from "@/config/education";
import type { Database } from "@/types/database";

export type FlashcardRow = Database["public"]["Tables"]["flashcards"]["Row"];

export type GenerateCardsResult =
  | { ok: true; created: number }
  | { ok: false; reason: "limit_reached" | "no_source" | "ai_failed" | "failed" };

/**
 * Builds flashcards from a material or from recent mistakes.
 *
 * The "mistakes" source is the more valuable one: cards made from questions a
 * student actually got wrong target a real gap, rather than restating things
 * they already know.
 */
export async function createFlashcards(args: {
  userId: string;
  source: "material" | "mistakes";
  materialId: string | null;
  cardCount: number;
  education: {
    bundesland: Bundesland;
    schoolType: SchoolType;
    stage: EducationStage;
    grade: number;
  };
}): Promise<GenerateCardsResult> {
  const admin = createAdminClient();

  // Gather the source text before spending quota.
  let content = "";
  let subjectId: string | null = null;
  let subjectKey = "";
  let subjectName = "";

  if (args.source === "material") {
    if (!args.materialId) return { ok: false, reason: "no_source" };

    const { data: material } = await admin
      .from("learning_materials")
      .select("id, subject_id, status, subjects(key, name_de)")
      .eq("id", args.materialId)
      .eq("user_id", args.userId)
      .maybeSingle();

    if (!material || material.status !== "ready") {
      return { ok: false, reason: "no_source" };
    }

    subjectId = material.subject_id;
    const subject = material.subjects as unknown as {
      key: string;
      name_de: string;
    } | null;
    subjectKey = subject?.key ?? "";
    subjectName = subject?.name_de ?? "";

    const chunks = await firstChunks({
      userId: args.userId,
      materialIds: [material.id],
      limit: 8,
    });
    content = chunks.map((chunk) => chunk.content).join("\n\n");
  } else {
    // Recent evaluations where marks were lost, with the task they came from.
    const { data: evaluations } = await admin
      .from("answer_evaluations")
      .select(
        "explanation, missing_elements, misconceptions, exam_tasks(prompt, expected_solution, exams(subject_id, subjects(key, name_de)))",
      )
      .eq("user_id", args.userId)
      .lt("points_awarded", 999)
      .order("created_at", { ascending: false })
      .limit(12);

    const relevant = (evaluations ?? []).filter(
      (entry) =>
        entry.missing_elements.length > 0 || entry.misconceptions.length > 0,
    );

    if (relevant.length === 0) return { ok: false, reason: "no_source" };

    const first = relevant[0]?.exam_tasks as unknown as
      | {
          exams: {
            subject_id: string;
            subjects: { key: string; name_de: string } | null;
          } | null;
        }
      | undefined;

    subjectId = first?.exams?.subject_id ?? null;
    subjectKey = first?.exams?.subjects?.key ?? "";
    subjectName = first?.exams?.subjects?.name_de ?? "";

    content = relevant
      .map((entry) => {
        const task = entry.exam_tasks as unknown as {
          prompt: string;
          expected_solution: string | null;
        } | null;
        return [
          `Aufgabe: ${task?.prompt ?? ""}`,
          `Musterlösung: ${task?.expected_solution ?? ""}`,
          entry.missing_elements.length > 0
            ? `Gefehlt hat: ${entry.missing_elements.join("; ")}`
            : "",
          entry.misconceptions.length > 0
            ? `Denkfehler: ${entry.misconceptions.join("; ")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");
  }

  if (content.trim().length === 0) return { ok: false, reason: "no_source" };

  try {
    await consume(args.userId, "flashcard_generation");
  } catch {
    return { ok: false, reason: "limit_reached" };
  }

  try {
    const result = await generateFlashcards({
      context: {
        bundesland: args.education.bundesland,
        schoolType: args.education.schoolType,
        stage: args.education.stage,
        grade: args.education.grade,
        subjectKey,
        subjectName,
        contentLanguage: "Deutsch",
      },
      source: args.source,
      cardCount: args.cardCount,
      content,
    });

    const cards = result.data.cards.slice(0, args.cardCount);
    if (cards.length === 0) {
      await release(args.userId, "flashcard_generation");
      return { ok: false, reason: "ai_failed" };
    }

    const state = initialCardState();

    const { error } = await admin.from("flashcards").insert(
      cards.map((card) => ({
        user_id: args.userId,
        subject_id: subjectId,
        front: card.front.slice(0, 1000),
        back: card.back.slice(0, 4000),
        topic_label: card.topic_label.slice(0, 200),
        difficulty: card.difficulty,
        origin: args.source === "mistakes" ? "mistake" : "material",
        source_material_id: args.materialId,
        ease_factor: state.easeFactor,
        interval_days: state.intervalDays,
        repetitions: state.repetitions,
        // New cards are due immediately, so they enter the next session.
        due_at: new Date().toISOString(),
      })),
    );

    if (error) {
      await release(args.userId, "flashcard_generation");
      return { ok: false, reason: "failed" };
    }

    return { ok: true, created: cards.length };
  } catch (error) {
    await release(args.userId, "flashcard_generation");
    if (error instanceof AiError) return { ok: false, reason: "ai_failed" };
    console.error(
      "[studilly:learning] card generation failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return { ok: false, reason: "failed" };
  }
}

/** Cards due now, ordered so the ones at risk come first. */
export async function dueCards(args: {
  userId: string;
  limit?: number;
}): Promise<FlashcardRow[]> {
  const supabase = await createSessionClient();

  const { data } = await supabase
    .from("flashcards")
    .select("*")
    .eq("user_id", args.userId)
    .eq("suspended", false)
    .lte("due_at", new Date().toISOString())
    .limit(args.limit ?? 40);

  if (!data) return [];

  return orderReviewQueue(
    data.map((card) => ({
      ...card,
      dueAt: card.due_at,
      lapses: card.lapses,
      repetitions: card.repetitions,
      id: card.id,
    })),
  );
}

export type ReviewResult =
  | { ok: true; intervalDays: number; dueAt: string }
  | { ok: false; reason: "not_found" };

/**
 * Records a review and reschedules the card.
 *
 * Scheduling runs server-side so the SM-2 implementation lives in exactly one
 * place and cannot drift between the client and the database.
 */
export async function reviewCard(args: {
  userId: string;
  cardId: string;
  rating: Rating | number;
}): Promise<ReviewResult> {
  const admin = createAdminClient();

  const { data: card } = await admin
    .from("flashcards")
    .select("id, ease_factor, interval_days, repetitions, lapses")
    .eq("id", args.cardId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (!card) return { ok: false, reason: "not_found" };

  const rating =
    typeof args.rating === "number" ? ratingFromValue(args.rating) : args.rating;

  const next = scheduleReview({
    state: {
      easeFactor: Number(card.ease_factor),
      intervalDays: card.interval_days,
      repetitions: card.repetitions,
      lapses: card.lapses,
    },
    rating,
    cardId: card.id,
  });

  const now = new Date().toISOString();

  await Promise.all([
    admin
      .from("flashcards")
      .update({
        ease_factor: next.easeFactor,
        interval_days: next.intervalDays,
        repetitions: next.repetitions,
        lapses: next.lapses,
        due_at: next.dueAt.toISOString(),
        last_reviewed_at: now,
      })
      .eq("id", card.id),
    admin.from("flashcard_reviews").insert({
      card_id: card.id,
      user_id: args.userId,
      rating:
        rating === "again" ? 0 : rating === "hard" ? 1 : rating === "good" ? 2 : 3,
      previous_interval: card.interval_days,
      new_interval: next.intervalDays,
      reviewed_at: now,
    }),
  ]);

  return {
    ok: true,
    intervalDays: next.intervalDays,
    dueAt: next.dueAt.toISOString(),
  };
}
