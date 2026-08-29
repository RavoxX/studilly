import type { Database } from "@/types/database";

export type AfbLevel = Database["public"]["Enums"]["afb_level"];

/**
 * German exam operators (Operatoren).
 *
 * Operators are the verbs that open a task and define exactly what a full-credit
 * answer must do. "Nennen" wants a list; "eroertern" wants a weighed argument
 * leading to a judgement. Students lose marks constantly by answering a lower
 * operator than the one printed, which is why Studilly models operators
 * explicitly, tracks them in the weakness model, and can generate practice for
 * a single operator.
 *
 * Each operator is anchored to the Anforderungsbereich it typically belongs to:
 *   AFB I   Reproduktion: reproducing and describing known material.
 *   AFB II  Reorganisation und Transfer: applying what was learned.
 *   AFB III Reflexion und Problemloesen: independent judgement and transfer.
 *
 * Source for the AFB definitions and the operator-to-AFB relationship:
 *   Kultusministerkonferenz, Bildungsstandards fuer die Allgemeine
 *   Hochschulreife (2012), and the operator catalogues published with them.
 *   https://www.kmk.org/themen/qualitaetssicherung-in-schulen/bildungsstandards.html
 *
 * Note: operator catalogues are subject-specific and vary slightly between
 * states. The mapping below is the common core; the curriculum layer can
 * refine it per subject later.
 */

export type OperatorDefinition = {
  key: string;
  /** The operator as printed on an exam. */
  label: string;
  afb: AfbLevel;
  /** What a full-credit answer has to deliver. Goes into the grading prompt,
   *  so the model marks against the operator rather than against vibes. */
  expectation: { de: string; en: string };
  /** Subjects where the operator is common. Empty means broadly applicable. */
  subjects?: readonly string[];
};

export const OPERATORS: readonly OperatorDefinition[] = [
  // --- AFB I: Reproduktion ------------------------------------------------
  {
    key: "nennen",
    label: "nennen",
    afb: "I",
    expectation: {
      de: "Elemente ohne Erläuterung aufzählen. Vollständigkeit zählt, Begründung nicht.",
      en: "List items without explanation. Completeness counts, justification does not.",
    },
  },
  {
    key: "benennen",
    label: "benennen",
    afb: "I",
    expectation: {
      de: "Sachverhalte mit dem korrekten Fachbegriff bezeichnen.",
      en: "Name the matter using the correct technical term.",
    },
  },
  {
    key: "wiedergeben",
    label: "wiedergeben",
    afb: "I",
    expectation: {
      de: "Bekannte Inhalte in eigenen Worten strukturiert darstellen.",
      en: "Restate known content in your own words, in a structured way.",
    },
  },
  {
    key: "beschreiben",
    label: "beschreiben",
    afb: "I",
    expectation: {
      de: "Merkmale, Aufbau oder Ablauf strukturiert und fachsprachlich darstellen, ohne zu deuten oder zu bewerten.",
      en: "Set out features, structure or sequence in technical language, without interpreting or judging.",
    },
  },
  {
    key: "zusammenfassen",
    label: "zusammenfassen",
    afb: "I",
    expectation: {
      de: "Kerngedanken eines Materials komprimiert und in eigenen Worten darstellen.",
      en: "Compress the core content of a source into your own words.",
    },
  },
  {
    key: "skizzieren",
    label: "skizzieren",
    afb: "I",
    expectation: {
      de: "Sachverhalt in seinen Grundzügen darstellen, grafisch oder sprachlich.",
      en: "Present the matter in its essentials, graphically or in words.",
    },
  },

  // --- AFB II: Reorganisation und Transfer ---------------------------------
  {
    key: "erklaeren",
    label: "erklären",
    afb: "II",
    expectation: {
      de: "Einen Sachverhalt auf Ursachen, Gesetzmäßigkeiten oder Zusammenhänge zurückführen, so dass er verständlich wird.",
      en: "Trace the matter back to causes, rules or relationships so that it becomes understandable.",
    },
  },
  {
    key: "erlaeutern",
    label: "erläutern",
    afb: "II",
    expectation: {
      de: "Wie erklären, zusätzlich mit Beispielen oder Belegen veranschaulichen. Ohne Beispiel fehlen Punkte.",
      en: "As with 'erklären', plus illustration through examples or evidence. Without an example, marks are missing.",
    },
  },
  {
    key: "berechnen",
    label: "berechnen",
    afb: "II",
    expectation: {
      de: "Ergebnis über einen nachvollziehbaren Rechenweg ermitteln. Ansatz, Rechenschritte und Einheit gehören dazu.",
      en: "Derive the result through a traceable calculation. Approach, steps and unit are all part of the answer.",
    },
    subjects: ["mathematik", "physik", "chemie", "wirtschaft"],
  },
  {
    key: "bestimmen",
    label: "bestimmen",
    afb: "II",
    expectation: {
      de: "Ergebnis mit einem passenden Verfahren ermitteln und den Lösungsweg dokumentieren.",
      en: "Determine the result with a suitable method and document the working.",
    },
    subjects: ["mathematik", "physik", "chemie"],
  },
  {
    key: "anwenden",
    label: "anwenden",
    afb: "II",
    expectation: {
      de: "Ein bekanntes Verfahren oder Konzept auf einen neuen Sachverhalt übertragen.",
      en: "Transfer a known method or concept to a new situation.",
    },
  },
  {
    key: "analysieren",
    label: "analysieren",
    afb: "II",
    expectation: {
      de: "Material systematisch unter einer Fragestellung untersuchen, Strukturen und Wirkungszusammenhänge herausarbeiten und am Material belegen.",
      en: "Examine the source systematically under a guiding question, work out structures and effects, and evidence them from the source.",
    },
  },
  {
    key: "vergleichen",
    label: "vergleichen",
    afb: "II",
    expectation: {
      de: "Nach vorher genannten Kriterien Gemeinsamkeiten UND Unterschiede herausarbeiten. Nur eine Seite reicht nicht.",
      en: "Work out both similarities AND differences against stated criteria. One side alone is not enough.",
    },
  },
  {
    key: "einordnen",
    label: "einordnen",
    afb: "II",
    expectation: {
      de: "Einen Sachverhalt in einen größeren Zusammenhang stellen und die Zuordnung begründen.",
      en: "Place the matter in a wider context and justify the placement.",
    },
  },
  {
    key: "begruenden",
    label: "begründen",
    afb: "II",
    expectation: {
      de: "Eine Aussage durch nachvollziehbare Argumente und Belege stützen.",
      en: "Support a claim with traceable arguments and evidence.",
    },
  },
  {
    key: "interpretieren",
    label: "interpretieren",
    afb: "II",
    expectation: {
      de: "Analyseergebnisse zu einer begründeten Deutung des Materials zusammenführen.",
      en: "Bring the results of analysis together into a justified reading of the source.",
    },
    subjects: ["deutsch", "englisch", "franzoesisch", "spanisch", "latein", "geschichte"],
  },

  // --- AFB III: Reflexion und Problemloesen --------------------------------
  {
    key: "beurteilen",
    label: "beurteilen",
    afb: "III",
    expectation: {
      de: "Zu einem begründeten Sachurteil auf fachlicher Grundlage kommen. Kriterien offenlegen, persönliche Wertung bleibt außen vor.",
      en: "Reach a justified judgement on subject-specific grounds. State the criteria; personal preference stays out.",
    },
  },
  {
    key: "bewerten",
    label: "bewerten",
    afb: "III",
    expectation: {
      de: "Wie beurteilen, zusätzlich mit offengelegtem eigenen Wertmaßstab. Das eigene Urteil muss begründet sein.",
      en: "As with 'beurteilen', plus your own declared value standard. The judgement itself must be justified.",
    },
  },
  {
    key: "eroertern",
    label: "erörtern",
    afb: "III",
    expectation: {
      de: "Pro- und Contra-Argumente entwickeln, gegeneinander abwägen und zu einem begründeten Fazit kommen. Ohne Fazit fehlen Punkte.",
      en: "Develop arguments for and against, weigh them, and reach a justified conclusion. Without a conclusion, marks are missing.",
    },
  },
  {
    key: "diskutieren",
    label: "diskutieren",
    afb: "III",
    expectation: {
      de: "Argumente zu einer These abwägend gegenüberstellen und zu einer eigenen begründeten Position kommen.",
      en: "Weigh arguments about a thesis against each other and arrive at your own justified position.",
    },
  },
  {
    key: "stellung_nehmen",
    label: "Stellung nehmen",
    afb: "III",
    expectation: {
      de: "Eine eigene Position formulieren und mit fachlichen Argumenten stützen.",
      en: "Formulate your own position and support it with subject-specific arguments.",
    },
  },
  {
    key: "entwickeln",
    label: "entwickeln",
    afb: "III",
    expectation: {
      de: "Eine eigene Lösung, Hypothese oder Konzeption schrittweise und begründet aufbauen.",
      en: "Build your own solution, hypothesis or design step by step, with justification.",
    },
  },
  {
    key: "beweisen",
    label: "beweisen",
    afb: "III",
    expectation: {
      de: "Eine Aussage mit einer lückenlosen, formal korrekten Argumentationskette belegen.",
      en: "Establish a claim with a gap-free, formally correct chain of argument.",
    },
    subjects: ["mathematik", "physik", "informatik"],
  },
  {
    key: "ueberpruefen",
    label: "überprüfen",
    afb: "III",
    expectation: {
      de: "Eine Aussage an Kriterien oder Daten messen und das Ergebnis begründet feststellen.",
      en: "Test a claim against criteria or data and state the outcome with justification.",
    },
  },
];

const BY_KEY = new Map(OPERATORS.map((op) => [op.key, op]));
const BY_LABEL = new Map(
  OPERATORS.map((op) => [op.label.toLowerCase(), op] as const),
);

export function findOperator(value: string): OperatorDefinition | null {
  const normalised = value.trim().toLowerCase();
  return BY_KEY.get(normalised) ?? BY_LABEL.get(normalised) ?? null;
}

/** Operators appropriate for a subject, used to constrain exam generation. */
export function operatorsForSubject(
  subjectKey: string,
): readonly OperatorDefinition[] {
  return OPERATORS.filter(
    (op) => !op.subjects || op.subjects.includes(subjectKey),
  );
}

export function operatorsForAfb(afb: AfbLevel): readonly OperatorDefinition[] {
  return OPERATORS.filter((op) => op.afb === afb);
}

/**
 * Target distribution of marks across the Anforderungsbereiche.
 *
 * The KMK guidance for the Abitur puts the centre of gravity in AFB II, with
 * AFB I and AFB III lighter on either side. Lower secondary leans further
 * toward AFB I and II. These are targets for generation and for the quality
 * gate, not hard legal requirements.
 */
export const AFB_DISTRIBUTION: Record<
  "sek_1" | "sek_2",
  Record<AfbLevel, { min: number; target: number; max: number }>
> = {
  sek_1: {
    I: { min: 0.25, target: 0.4, max: 0.55 },
    II: { min: 0.35, target: 0.45, max: 0.6 },
    III: { min: 0.0, target: 0.15, max: 0.3 },
  },
  sek_2: {
    I: { min: 0.15, target: 0.25, max: 0.4 },
    II: { min: 0.35, target: 0.5, max: 0.65 },
    III: { min: 0.1, target: 0.25, max: 0.4 },
  },
};

export const AFB_LABELS: Record<AfbLevel, { de: string; en: string }> = {
  I: { de: "Reproduktion", en: "Reproduction" },
  II: { de: "Reorganisation und Transfer", en: "Transfer" },
  III: { de: "Reflexion und Problemlösen", en: "Reflection and problem solving" },
};
