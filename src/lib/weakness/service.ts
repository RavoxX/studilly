import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import {
  applySignal,
  applySuccess,
  priorityScore,
  selectPracticeFocus,
  type SkillDimension,
  type WeaknessState,
} from "./model";
import type { Database } from "@/types/database";

/**
 * Persists skill signals into the weakness model.
 *
 * Grading emits structured signals per task. This module folds them into the
 * durable `weaknesses` rows, keeps an evidence trail, and lets the student
 * recover: a task answered correctly on a topic that previously had a
 * weakness counts as positive evidence and pulls severity down.
 *
 * All writes go through the service-role client because `weaknesses` is
 * read-only to the browser. A student must not be able to edit their own
 * weakness profile, or targeted practice becomes meaningless.
 */

export type WeaknessRow = Database["public"]["Tables"]["weaknesses"]["Row"];

type IncomingSignal = {
  dimension: SkillDimension;
  topic_label: string;
  severity: number;
  evidence: string;
};

export async function recordSignals(args: {
  userId: string;
  subjectId: string;
  attemptId: string;
  evaluations: readonly {
    taskLabel: string;
    taskId: string | null;
    operator: string | null;
    signals: readonly IncomingSignal[];
    pointsLost: number;
  }[];
}): Promise<void> {
  const admin = createAdminClient();
  const now = new Date();

  // Existing weaknesses for this subject, so we update rather than duplicate.
  const { data: existing } = await admin
    .from("weaknesses")
    .select("*")
    .eq("user_id", args.userId)
    .eq("subject_id", args.subjectId);

  const byKey = new Map(
    (existing ?? []).map((row) => [
      keyOf(row.topic_label, row.dimension, row.operator),
      row,
    ]),
  );

  const touchedKeys = new Set<string>();

  for (const evaluation of args.evaluations) {
    for (const signal of evaluation.signals) {
      const topic = signal.topic_label.trim().slice(0, 200);
      if (topic.length === 0) continue;

      // The operator only identifies an operator-dimension weakness. Storing
      // it on every dimension would fragment the model.
      const operator =
        signal.dimension === "operator" ? evaluation.operator : null;
      const key = keyOf(topic, signal.dimension, operator);
      touchedKeys.add(key);

      const current = byKey.get(key);
      const recentSeverities = current
        ? await recentSeveritiesFor(current.id)
        : [];

      const next = applySignal({
        current: current ? toState(current) : null,
        signal: {
          topicLabel: topic,
          dimension: signal.dimension,
          severity: signal.severity,
          operator,
          evidence: signal.evidence,
          pointsLost: evaluation.pointsLost,
          occurredAt: now,
        },
        recentSeverities,
      });

      const { data: saved } = await admin
        .from("weaknesses")
        .upsert(
          {
            user_id: args.userId,
            subject_id: args.subjectId,
            topic_label: topic,
            curriculum_topic_id: null,
            dimension: signal.dimension,
            operator,
            severity: next.severity,
            confidence: next.confidence,
            evidence_count: next.evidenceCount,
            trend: next.trend,
            last_seen_at: next.lastSeenAt.toISOString(),
            resolved_at: null,
          },
          { onConflict: "user_id,subject_id,topic_label,dimension,operator" },
        )
        .select("id")
        .single();

      if (saved) {
        await admin.from("weakness_evidence").insert({
          weakness_id: saved.id,
          user_id: args.userId,
          attempt_id: args.attemptId,
          task_id: evaluation.taskId,
          note: signal.evidence.slice(0, 500),
          points_lost: Math.max(0, evaluation.pointsLost),
          occurred_at: now.toISOString(),
        });
      }
    }
  }

  // Recovery: a task on a known-weak topic that produced no signals at all is
  // evidence the student has improved. Without this the model only ever
  // accumulates and never shows progress.
  const topicsAnsweredWell = new Set(
    args.evaluations
      .filter((e) => e.signals.length === 0 && e.pointsLost <= 0.5)
      .flatMap((e) => e.taskLabel),
  );

  if (topicsAnsweredWell.size > 0) {
    for (const row of existing ?? []) {
      const key = keyOf(row.topic_label, row.dimension, row.operator);
      if (touchedKeys.has(key)) continue;
      if (row.resolved_at) continue;

      const recentSeverities = await recentSeveritiesFor(row.id);
      const next = applySuccess({
        current: toState(row),
        at: now,
        recentSeverities,
      });

      await admin
        .from("weaknesses")
        .update({
          severity: next.severity,
          confidence: next.confidence,
          evidence_count: next.evidenceCount,
          trend: next.trend,
          last_seen_at: next.lastSeenAt.toISOString(),
          resolved_at: next.resolvedAt?.toISOString() ?? null,
        })
        .eq("id", row.id);
    }
  }
}

/** The student's live weakness picture, ranked. */
export async function topWeaknesses(args: {
  userId: string;
  subjectId?: string;
  limit?: number;
}): Promise<(WeaknessRow & { priority: number })[]> {
  const supabase = await createSessionClient();

  let query = supabase
    .from("weaknesses")
    .select("*")
    .eq("user_id", args.userId)
    .is("resolved_at", null);

  if (args.subjectId) query = query.eq("subject_id", args.subjectId);

  const { data } = await query;
  if (!data) return [];

  const now = new Date();

  return data
    .map((row) => ({
      ...row,
      priority: priorityScore({
        severity: Number(row.severity),
        confidence: Number(row.confidence),
        lastSeenAt: new Date(row.last_seen_at),
        now,
      }),
    }))
    .filter((row) => row.priority > 0.03)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, args.limit ?? 10);
}

/** What the student should practise next, one focus per topic. */
export async function practiceFocus(args: {
  userId: string;
  limit?: number;
}): Promise<WeaknessRow[]> {
  const supabase = await createSessionClient();

  const { data } = await supabase
    .from("weaknesses")
    .select("*")
    .eq("user_id", args.userId)
    .is("resolved_at", null);

  if (!data) return [];

  const chosen = selectPracticeFocus(
    data.map((row) => ({
      id: row.id,
      topicLabel: row.topic_label,
      dimension: row.dimension,
      severity: Number(row.severity),
      confidence: Number(row.confidence),
      lastSeenAt: new Date(row.last_seen_at),
      row,
    })),
    args.limit ?? 3,
  );

  return chosen.map((entry) => entry.row);
}

/** Recent evidence for a weakness, used to explain it in the UI. */
export async function evidenceFor(
  weaknessId: string,
  limit = 5,
): Promise<{ note: string; occurredAt: string; pointsLost: number }[]> {
  const supabase = await createSessionClient();

  const { data } = await supabase
    .from("weakness_evidence")
    .select("note, occurred_at, points_lost")
    .eq("weakness_id", weaknessId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    note: row.note,
    occurredAt: row.occurred_at,
    pointsLost: Number(row.points_lost),
  }));
}

async function recentSeveritiesFor(weaknessId: string): Promise<number[]> {
  const admin = createAdminClient();

  // Severity is not stored per evidence row, so points lost stands in as a
  // proxy for how badly each occurrence went. Normalised to 0..1 against the
  // largest loss in the window.
  const { data } = await admin
    .from("weakness_evidence")
    .select("points_lost")
    .eq("weakness_id", weaknessId)
    .order("occurred_at", { ascending: false })
    .limit(8);

  if (!data || data.length === 0) return [];

  const losses = data.map((row) => Number(row.points_lost));
  const max = Math.max(...losses, 1);
  return losses.map((loss) => Math.min(1, loss / max));
}

function toState(row: WeaknessRow): WeaknessState {
  return {
    severity: Number(row.severity),
    confidence: Number(row.confidence),
    evidenceCount: row.evidence_count,
    trend: row.trend,
    lastSeenAt: new Date(row.last_seen_at),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
  };
}

function keyOf(
  topic: string,
  dimension: string,
  operator: string | null,
): string {
  return `${topic.toLowerCase()}::${dimension}::${operator ?? ""}`;
}
