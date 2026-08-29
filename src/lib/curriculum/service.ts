import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Bundesland, EducationStage, SchoolType } from "@/config/education";
import type { Database } from "@/types/database";

export type CurriculumRow = Database["public"]["Tables"]["curricula"]["Row"];
export type CurriculumTopicRow =
  Database["public"]["Tables"]["curriculum_topics"]["Row"];

/**
 * Curriculum lookup.
 *
 * Curriculum knowledge lives in the database rather than inside prompts, so
 * it can be corrected and extended without a deploy. Every row carries its
 * provenance: which document it came from, the URL, and whether it has been
 * verified against that document (`is_official`).
 *
 * Studilly never presents unverified rows to a student as an official
 * requirement. They exist to give exam generation the right vocabulary and
 * sequencing for a state and grade, which is a real improvement over a prompt
 * that only knows "Mathematik, Klasse 9".
 */

/** The curriculum matching a student's exact context, if one exists. */
export async function findCurriculum(args: {
  bundesland: Bundesland;
  schoolType: SchoolType;
  stage: EducationStage;
  grade: number;
  subjectId: string;
}): Promise<CurriculumRow | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("curricula")
    .select("*")
    .eq("bundesland", args.bundesland)
    .eq("school_type", args.schoolType)
    .eq("stage", args.stage)
    .eq("subject_id", args.subjectId)
    .lte("grade_min", args.grade)
    .gte("grade_max", args.grade)
    .maybeSingle();

  return data ?? null;
}

/**
 * Topics for a context, narrowed to the grade where the data says so.
 *
 * Falls back through progressively looser matches rather than returning
 * nothing: an exact match, then the same state and subject at any school
 * type, then nothing. A missing curriculum must degrade to a slightly less
 * tailored exam, never to a failure.
 */
export async function curriculumTopicsFor(args: {
  bundesland: Bundesland;
  schoolType: SchoolType;
  stage: EducationStage;
  grade: number;
  subjectId: string | null;
}): Promise<CurriculumTopicRow[]> {
  if (!args.subjectId) return [];

  const admin = createAdminClient();

  const exact = await findCurriculum({
    bundesland: args.bundesland,
    schoolType: args.schoolType,
    stage: args.stage,
    grade: args.grade,
    subjectId: args.subjectId,
  });

  let curriculumId = exact?.id ?? null;

  if (!curriculumId) {
    const { data: fallback } = await admin
      .from("curricula")
      .select("id")
      .eq("bundesland", args.bundesland)
      .eq("stage", args.stage)
      .eq("subject_id", args.subjectId)
      .lte("grade_min", args.grade)
      .gte("grade_max", args.grade)
      .limit(1)
      .maybeSingle();
    curriculumId = fallback?.id ?? null;
  }

  if (!curriculumId) return [];

  const { data: topics } = await admin
    .from("curriculum_topics")
    .select("*")
    .eq("curriculum_id", curriculumId)
    .order("position");

  if (!topics) return [];

  // Keep topics that are either grade-agnostic or within one year of the
  // student's grade. Teaching order varies, so a hard equality filter would
  // discard useful context.
  return topics.filter(
    (topic) =>
      topic.grade_hint === null || Math.abs(topic.grade_hint - args.grade) <= 1,
  );
}

/** Provenance for the UI, so a student can see where guidance came from. */
export async function curriculumSource(args: {
  bundesland: Bundesland;
  schoolType: SchoolType;
  stage: EducationStage;
  grade: number;
  subjectId: string;
}): Promise<{
  name: string;
  url: string | null;
  version: string | null;
  isOfficial: boolean;
} | null> {
  const curriculum = await findCurriculum(args);
  if (!curriculum) return null;

  return {
    name: curriculum.source_name,
    url: curriculum.source_url,
    version: curriculum.source_version,
    isOfficial: curriculum.is_official,
  };
}
