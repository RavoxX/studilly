/**
 * Seeds the curriculum layer.
 *
 * Fans the catalogue in src/lib/curriculum/data/catalog.ts across every state
 * and every school type that actually exists in that state, attaching the
 * state's real curriculum portal as the source URL.
 *
 * Idempotent: re-running updates existing rows rather than duplicating them,
 * so correcting a topic is edit-then-rerun.
 *
 *   npm run seed:curriculum
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  SCHOOL_SYSTEM,
  gradesFor,
  schoolTypesFor,
  type Bundesland,
  type EducationStage,
} from "../src/config/education";
import { CATALOG } from "../src/lib/curriculum/data/catalog";
import type { Database } from "../src/types/database";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient<Database>(url, key, {
  auth: { persistSession: false },
});

async function main() {
  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, key");

  if (subjectsError || !subjects) {
    console.error("Could not read subjects:", subjectsError?.message);
    process.exit(1);
  }

  const subjectByKey = new Map(subjects.map((s) => [s.key, s.id]));

  let curriculaCount = 0;
  let topicCount = 0;
  let skipped = 0;

  for (const state of Object.keys(SCHOOL_SYSTEM) as Bundesland[]) {
    const profile = SCHOOL_SYSTEM[state];

    for (const entry of CATALOG) {
      const subjectId = subjectByKey.get(entry.subjectKey);
      if (!subjectId) {
        skipped += 1;
        continue;
      }

      const stage = entry.stage as EducationStage;
      const stateGrades = gradesFor(state, stage);
      if (stateGrades.length === 0) continue;

      // Clamp the catalogue's grade span to what this state actually has.
      // Berlin and Brandenburg start Sek I at 7; Sachsen and Thüringen end
      // the Oberstufe at 12.
      const gradeMin = Math.max(entry.gradeMin, Math.min(...stateGrades));
      const gradeMax = Math.min(entry.gradeMax, Math.max(...stateGrades));
      if (gradeMin > gradeMax) continue;

      for (const schoolType of schoolTypesFor(state, stage)) {
        const { data: curriculum, error } = await supabase
          .from("curricula")
          .upsert(
            {
              bundesland: state,
              school_type: schoolType,
              stage,
              subject_id: subjectId,
              grade_min: gradeMin,
              grade_max: gradeMax,
              title: `${entry.subjectKey} ${stage === "sek_1" ? "Sekundarstufe I" : "Sekundarstufe II"} (${profile.nameDe})`,
              // Provenance: the KMK framing the topics come from, plus the
              // state portal where the binding document lives.
              source_name: `${entry.source.name}. Landesvorgaben: ${profile.curriculumPortal.name}`,
              source_url: profile.curriculumPortal.url,
              source_version: entry.source.version,
              source_retrieved_at: new Date().toISOString().slice(0, 10),
              // False until the topics have been checked against the state's
              // own document. Nothing is presented to a student as official
              // while this is false.
              is_official: entry.verified,
            },
            {
              onConflict:
                "bundesland,school_type,stage,subject_id,grade_min,grade_max",
            },
          )
          .select("id")
          .single();

        if (error || !curriculum) {
          console.error(
            `  ${state}/${schoolType}/${entry.subjectKey}: ${error?.message}`,
          );
          continue;
        }

        curriculaCount += 1;

        // Replace topics wholesale so removing one from the catalogue removes
        // it from the database too.
        await supabase
          .from("curriculum_topics")
          .delete()
          .eq("curriculum_id", curriculum.id);

        const topics = entry.topics
          // Drop topics whose grade does not exist in this state.
          .filter(
            (topic) =>
              topic.gradeHint === undefined ||
              (topic.gradeHint >= gradeMin && topic.gradeHint <= gradeMax),
          )
          .map((topic, index) => ({
            curriculum_id: curriculum.id,
            parent_id: null,
            title_de: topic.title,
            title_en: null,
            description: topic.description ?? null,
            competencies: topic.competencies ?? [],
            typical_afb: topic.afb ?? null,
            grade_hint: topic.gradeHint ?? null,
            position: index,
          }));

        if (topics.length > 0) {
          const { error: topicError } = await supabase
            .from("curriculum_topics")
            .insert(topics);

          if (topicError) {
            console.error(`  topics failed: ${topicError.message}`);
          } else {
            topicCount += topics.length;
          }
        }
      }
    }

    console.log(`  ${profile.nameDe} done`);
  }

  console.log(
    `\nSeeded ${curriculaCount} curricula and ${topicCount} topics.` +
      (skipped > 0 ? ` Skipped ${skipped} entries with no matching subject.` : ""),
  );
  console.log(
    "All rows are marked is_official = false. Verify a subject against its " +
      "state document, then set verified: true in the catalogue and re-run.",
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
