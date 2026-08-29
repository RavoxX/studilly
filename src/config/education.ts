import type { Database } from "@/types/database";

export type Bundesland = Database["public"]["Enums"]["bundesland"];
export type SchoolType = Database["public"]["Enums"]["school_type"];
export type EducationStage = Database["public"]["Enums"]["education_stage"];

/**
 * The German school system, as configuration.
 *
 * School structure genuinely differs between the 16 states: which school types
 * exist, when lower secondary starts, and how many years lead to the Abitur.
 * Getting this wrong makes generated exams feel foreign, so it is modelled
 * explicitly rather than left to a prompt.
 *
 * Sources
 *   Kultusministerkonferenz, "Sekundarstufe I":
 *     https://www.kmk.org/themen/allgemeinbildende-schulen/bildungswege-und-abschluesse/sekundarstufe-i.html
 *   Bundeszentrale fuer politische Bildung, "Schulsysteme der Bundeslaender":
 *     https://www.bpb.de/themen/bildung/dossier-bildung/256373/
 *   Each state's own curriculum portal, listed in SCHOOL_SYSTEM below.
 *
 * This describes school STRUCTURE, which is publicly documented and stable.
 * Curriculum CONTENT is a separate layer that carries its own provenance;
 * see src/lib/curriculum.
 */

export type StateProfile = {
  code: Bundesland;
  nameDe: string;
  nameEn: string;
  /** School types available for lower secondary in this state. */
  sekITypes: readonly SchoolType[];
  /** Grade range of lower secondary. Berlin and Brandenburg run primary
   *  school to grade 6, so their Sekundarstufe I starts at 7. */
  sekIGrades: { min: number; max: number };
  /** Grade range of the gymnasiale Oberstufe. States that lead to the Abitur
   *  after 12 years end at grade 12. */
  sekIIGrades: { min: number; max: number };
  /** Official curriculum portal. Used as provenance for curriculum rows. */
  curriculumPortal: { name: string; url: string };
};

const OBERSTUFE_TYPES: readonly SchoolType[] = [
  "gymnasium",
  "gesamtschule",
  "gemeinschaftsschule",
  "stadtteilschule",
  "berufliches_gymnasium",
];

export const SCHOOL_SYSTEM: Record<Bundesland, StateProfile> = {
  BW: {
    code: "BW",
    nameDe: "Baden-Württemberg",
    nameEn: "Baden-Württemberg",
    sekITypes: ["gymnasium", "realschule", "werkrealschule", "gemeinschaftsschule"],
    sekIGrades: { min: 5, max: 10 },
    sekIIGrades: { min: 10, max: 13 },
    curriculumPortal: {
      name: "Bildungspläne Baden-Württemberg",
      url: "https://www.bildungsplaene-bw.de/",
    },
  },
  BY: {
    code: "BY",
    nameDe: "Bayern",
    nameEn: "Bavaria",
    sekITypes: ["gymnasium", "realschule", "mittelschule", "wirtschaftsschule"],
    sekIGrades: { min: 5, max: 10 },
    sekIIGrades: { min: 11, max: 13 },
    curriculumPortal: {
      name: "LehrplanPLUS Bayern",
      url: "https://www.lehrplanplus.bayern.de/",
    },
  },
  BE: {
    code: "BE",
    nameDe: "Berlin",
    nameEn: "Berlin",
    sekITypes: ["gymnasium", "integrierte_sekundarschule", "gemeinschaftsschule"],
    // Grundschule runs to grade 6 in Berlin.
    sekIGrades: { min: 7, max: 10 },
    sekIIGrades: { min: 11, max: 13 },
    curriculumPortal: {
      name: "Rahmenlehrpläne Berlin",
      url: "https://www.berlin.de/sen/bildung/unterricht/faecher-rahmenlehrplaene/rahmenlehrplaene/",
    },
  },
  BB: {
    code: "BB",
    nameDe: "Brandenburg",
    nameEn: "Brandenburg",
    sekITypes: ["gymnasium", "oberschule", "gesamtschule"],
    // Grundschule runs to grade 6 in Brandenburg.
    sekIGrades: { min: 7, max: 10 },
    sekIIGrades: { min: 11, max: 13 },
    curriculumPortal: {
      name: "Rahmenlehrplan-Online Berlin-Brandenburg",
      url: "https://bildungsserver.berlin-brandenburg.de/rlp-online",
    },
  },
  HB: {
    code: "HB",
    nameDe: "Bremen",
    nameEn: "Bremen",
    sekITypes: ["gymnasium", "oberschule"],
    sekIGrades: { min: 5, max: 10 },
    sekIIGrades: { min: 11, max: 13 },
    curriculumPortal: {
      name: "Bildungspläne Bremen",
      url: "https://www.lis.bremen.de/schulqualitaet/bildungsplaene-21942",
    },
  },
  HH: {
    code: "HH",
    nameDe: "Hamburg",
    nameEn: "Hamburg",
    sekITypes: ["gymnasium", "stadtteilschule"],
    sekIGrades: { min: 5, max: 10 },
    sekIIGrades: { min: 10, max: 13 },
    curriculumPortal: {
      name: "Bildungspläne Hamburg",
      url: "https://www.hamburg.de/bildungsplaene/",
    },
  },
  HE: {
    code: "HE",
    nameDe: "Hessen",
    nameEn: "Hesse",
    sekITypes: [
      "gymnasium",
      "realschule",
      "hauptschule",
      "gesamtschule",
      "mittelstufenschule",
    ],
    sekIGrades: { min: 5, max: 10 },
    sekIIGrades: { min: 10, max: 13 },
    curriculumPortal: {
      name: "Kerncurricula Hessen",
      url: "https://kultus.hessen.de/unterricht/kerncurricula-und-lehrplaene/kerncurricula",
    },
  },
  MV: {
    code: "MV",
    nameDe: "Mecklenburg-Vorpommern",
    nameEn: "Mecklenburg-Western Pomerania",
    sekITypes: ["gymnasium", "regionale_schule", "gesamtschule"],
    sekIGrades: { min: 5, max: 10 },
    sekIIGrades: { min: 11, max: 12 },
    curriculumPortal: {
      name: "Rahmenpläne Mecklenburg-Vorpommern",
      url: "https://www.bildung-mv.de/unterricht/rahmenplaene/",
    },
  },
  NI: {
    code: "NI",
    nameDe: "Niedersachsen",
    nameEn: "Lower Saxony",
    sekITypes: [
      "gymnasium",
      "realschule",
      "hauptschule",
      "oberschule",
      "gesamtschule",
    ],
    sekIGrades: { min: 5, max: 10 },
    sekIIGrades: { min: 11, max: 13 },
    curriculumPortal: {
      name: "Curriculare Vorgaben Niedersachsen (CUVO)",
      url: "https://cuvo.nibis.de/",
    },
  },
  NW: {
    code: "NW",
    nameDe: "Nordrhein-Westfalen",
    nameEn: "North Rhine-Westphalia",
    sekITypes: [
      "gymnasium",
      "realschule",
      "hauptschule",
      "gesamtschule",
      "sekundarschule",
    ],
    sekIGrades: { min: 5, max: 10 },
    sekIIGrades: { min: 10, max: 13 },
    curriculumPortal: {
      name: "Lehrplannavigator NRW",
      url: "https://www.schulentwicklung.nrw.de/lehrplaene/",
    },
  },
  RP: {
    code: "RP",
    nameDe: "Rheinland-Pfalz",
    nameEn: "Rhineland-Palatinate",
    sekITypes: ["gymnasium", "realschule_plus", "gesamtschule"],
    sekIGrades: { min: 5, max: 10 },
    sekIIGrades: { min: 11, max: 13 },
    curriculumPortal: {
      name: "Lehrpläne Rheinland-Pfalz",
      url: "https://lehrplaene.bildung-rp.de/",
    },
  },
  SL: {
    code: "SL",
    nameDe: "Saarland",
    nameEn: "Saarland",
    sekITypes: ["gymnasium", "gemeinschaftsschule"],
    sekIGrades: { min: 5, max: 10 },
    sekIIGrades: { min: 10, max: 13 },
    curriculumPortal: {
      name: "Lehrpläne Saarland",
      url: "https://www.saarland.de/mbk/DE/portale/bildungsserver/unterricht-und-bildungsthemen/lehrplaenehandreichungen",
    },
  },
  SN: {
    code: "SN",
    nameDe: "Sachsen",
    nameEn: "Saxony",
    sekITypes: ["gymnasium", "oberschule"],
    sekIGrades: { min: 5, max: 10 },
    // Saxony leads to the Abitur after 12 years.
    sekIIGrades: { min: 11, max: 12 },
    curriculumPortal: {
      name: "Lehrplandatenbank Sachsen",
      url: "https://www.schulportal.sachsen.de/lplandb/",
    },
  },
  ST: {
    code: "ST",
    nameDe: "Sachsen-Anhalt",
    nameEn: "Saxony-Anhalt",
    sekITypes: ["gymnasium", "sekundarschule", "gemeinschaftsschule"],
    sekIGrades: { min: 5, max: 10 },
    sekIIGrades: { min: 11, max: 12 },
    curriculumPortal: {
      name: "Lehrpläne und Rahmenrichtlinien Sachsen-Anhalt",
      url: "https://lisa.sachsen-anhalt.de/schulqualitaet/lehrplaene-rahmenrichtlinien",
    },
  },
  SH: {
    code: "SH",
    nameDe: "Schleswig-Holstein",
    nameEn: "Schleswig-Holstein",
    sekITypes: ["gymnasium", "gemeinschaftsschule"],
    sekIGrades: { min: 5, max: 10 },
    sekIIGrades: { min: 10, max: 13 },
    curriculumPortal: {
      name: "Fachanforderungen Schleswig-Holstein",
      url: "https://fachportal.lernnetz.de/sh/fachanforderungen.html",
    },
  },
  TH: {
    code: "TH",
    nameDe: "Thüringen",
    nameEn: "Thuringia",
    sekITypes: ["gymnasium", "regelschule", "gemeinschaftsschule"],
    sekIGrades: { min: 5, max: 10 },
    // Thuringia leads to the Abitur after 12 years.
    sekIIGrades: { min: 11, max: 12 },
    curriculumPortal: {
      name: "Lehrpläne Thüringen",
      url: "https://www.schulportal-thueringen.de/lehrplaene",
    },
  },
};

export const BUNDESLAENDER: readonly Bundesland[] = Object.keys(
  SCHOOL_SYSTEM,
) as Bundesland[];

/** Display names for school types. Names are state-specific in practice, so
 *  only types that exist in a state are ever offered. */
export const SCHOOL_TYPE_LABELS: Record<
  SchoolType,
  { de: string; en: string }
> = {
  gymnasium: { de: "Gymnasium", en: "Gymnasium" },
  realschule: { de: "Realschule", en: "Realschule" },
  hauptschule: { de: "Hauptschule", en: "Hauptschule" },
  werkrealschule: { de: "Werkreal-/Hauptschule", en: "Werkreal-/Hauptschule" },
  gesamtschule: { de: "Gesamtschule", en: "Gesamtschule (comprehensive)" },
  oberschule: { de: "Oberschule", en: "Oberschule" },
  mittelschule: { de: "Mittelschule", en: "Mittelschule" },
  stadtteilschule: { de: "Stadtteilschule", en: "Stadtteilschule" },
  sekundarschule: { de: "Sekundarschule", en: "Sekundarschule" },
  gemeinschaftsschule: { de: "Gemeinschaftsschule", en: "Gemeinschaftsschule" },
  regionale_schule: { de: "Regionale Schule", en: "Regionale Schule" },
  regelschule: { de: "Regelschule", en: "Regelschule" },
  realschule_plus: { de: "Realschule plus", en: "Realschule plus" },
  integrierte_sekundarschule: {
    de: "Integrierte Sekundarschule",
    en: "Integrierte Sekundarschule",
  },
  mittelstufenschule: { de: "Mittelstufenschule", en: "Mittelstufenschule" },
  wirtschaftsschule: { de: "Wirtschaftsschule", en: "Wirtschaftsschule" },
  berufliches_gymnasium: {
    de: "Berufliches Gymnasium",
    en: "Berufliches Gymnasium",
  },
};

/** School types offered in a state for a given stage. */
export function schoolTypesFor(
  state: Bundesland,
  stage: EducationStage,
): readonly SchoolType[] {
  const profile = SCHOOL_SYSTEM[state];
  if (stage === "sek_1") return profile.sekITypes;

  // Upper secondary: only school types that carry an Oberstufe, plus the
  // vocational Gymnasium, which exists nationwide.
  const fromState = profile.sekITypes.filter((t) =>
    OBERSTUFE_TYPES.includes(t),
  );
  return [...new Set([...fromState, "berufliches_gymnasium" as const])];
}

/** Valid grades in a state for a given stage. */
export function gradesFor(
  state: Bundesland,
  stage: EducationStage,
): readonly number[] {
  const range =
    stage === "sek_1"
      ? SCHOOL_SYSTEM[state].sekIGrades
      : SCHOOL_SYSTEM[state].sekIIGrades;

  const grades: number[] = [];
  for (let g = range.min; g <= range.max; g += 1) grades.push(g);
  return grades;
}

/** Whether a school type leads into the Oberstufe. */
export function hasOberstufe(type: SchoolType): boolean {
  return OBERSTUFE_TYPES.includes(type);
}

/**
 * Derives the stage from a grade in a given state. Used to keep the profile
 * self-consistent when a student changes only their grade.
 */
export function stageForGrade(
  state: Bundesland,
  grade: number,
): EducationStage {
  return grade <= SCHOOL_SYSTEM[state].sekIGrades.max ? "sek_1" : "sek_2";
}

/**
 * In the Oberstufe, marks are recorded as Notenpunkte (0 to 15) rather than
 * as marks 1 to 6. This drives which grading scale applies by default.
 */
export function usesNotenpunkte(stage: EducationStage): boolean {
  return stage === "sek_2";
}
