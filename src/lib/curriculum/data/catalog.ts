/**
 * Curriculum seed catalogue.
 *
 * WHAT THIS IS
 * The competency areas below come from the KMK Bildungsstandards, which are
 * agreed nationwide and are therefore the same in every federal state. The
 * topic lists under them are the standard sequencing those competency areas
 * are taught through in German secondary schools.
 *
 * WHAT THIS IS NOT
 * This is not a transcription of any single state's curriculum document.
 * States differ in ordering, in which grade a topic lands in, and in emphasis.
 * Rows seeded from this catalogue are written with `is_official = false`,
 * which means: structurally sound, not yet verified line by line against the
 * state's own document. The seeder attaches each state's real curriculum
 * portal URL so that verification is a matter of checking, not of research.
 *
 * Studilly never shows an unverified row to a student as an official
 * requirement. The purpose here is to give exam generation the right
 * vocabulary, the right level and the right sequencing for a grade, which is
 * a large improvement over a prompt that only knows "Mathematik, Klasse 9".
 *
 * TO EXTEND
 * Add or correct entries here, then run `npm run seed:curriculum`. Set
 * `verified: true` on a catalogue entry once its topics have been checked
 * against the named state document; the seeder maps that to `is_official`.
 */

export type TopicSeed = {
  title: string;
  description?: string;
  /** Competency statements, phrased as the Bildungsstandards phrase them. */
  competencies?: string[];
  /** The Anforderungsbereich this topic is typically assessed at. */
  afb?: "I" | "II" | "III";
  /** Grade this usually lands in. Null means it spans the whole stage. */
  gradeHint?: number;
};

export type SubjectCatalog = {
  subjectKey: string;
  stage: "sek_1" | "sek_2";
  gradeMin: number;
  gradeMax: number;
  /** The KMK document the competency framing comes from. */
  source: { name: string; url: string; version: string };
  /** True only when the topic list has been checked against a state document. */
  verified: boolean;
  topics: TopicSeed[];
};

const KMK_URL =
  "https://www.kmk.org/themen/qualitaetssicherung-in-schulen/bildungsstandards.html";

// ---------------------------------------------------------------------------
// Mathematik
//
// The five Leitideen (L1 to L5) are KMK-defined and identical nationwide.
// ---------------------------------------------------------------------------

const MATHEMATIK_SEK_1: SubjectCatalog = {
  subjectKey: "mathematik",
  stage: "sek_1",
  gradeMin: 5,
  gradeMax: 10,
  source: {
    name: "KMK Bildungsstandards im Fach Mathematik für den Mittleren Schulabschluss",
    url: KMK_URL,
    version: "2022",
  },
  verified: false,
  topics: [
    {
      title: "Zahl und Operation",
      description: "Leitidee L1",
      competencies: [
        "Mit natürlichen, ganzen und rationalen Zahlen sicher rechnen",
        "Rechengesetze begründet anwenden",
        "Ergebnisse durch Überschlag prüfen",
      ],
      afb: "I",
      gradeHint: 6,
    },
    {
      title: "Bruchrechnung und Dezimalzahlen",
      competencies: [
        "Brüche erweitern, kürzen und vergleichen",
        "Zwischen Bruch, Dezimalzahl und Prozent wechseln",
      ],
      afb: "I",
      gradeHint: 6,
    },
    {
      title: "Prozent- und Zinsrechnung",
      competencies: [
        "Grundwert, Prozentwert und Prozentsatz bestimmen",
        "Zinsen für ein Jahr und für Teilzeiträume berechnen",
      ],
      afb: "II",
      gradeHint: 7,
    },
    {
      title: "Terme und Gleichungen",
      competencies: [
        "Terme aufstellen, umformen und zusammenfassen",
        "Lineare Gleichungen lösen und die Lösung überprüfen",
      ],
      afb: "II",
      gradeHint: 8,
    },
    {
      title: "Lineare Funktionen",
      description: "Leitidee L4",
      competencies: [
        "Zusammenhänge durch Terme, Tabellen und Graphen darstellen",
        "Steigung und y-Achsenabschnitt deuten",
        "Lineare Gleichungssysteme lösen",
      ],
      afb: "II",
      gradeHint: 8,
    },
    {
      title: "Quadratische Funktionen und Gleichungen",
      competencies: [
        "Parabeln aus Scheitelpunkt- und Normalform zeichnen",
        "Quadratische Gleichungen lösen und die Lösungsmenge deuten",
        "Sachsituationen durch quadratische Modelle beschreiben",
      ],
      afb: "II",
      gradeHint: 9,
    },
    {
      title: "Messen: Umfang, Flächen- und Rauminhalt",
      description: "Leitidee L2",
      competencies: [
        "Flächeninhalt und Umfang ebener Figuren berechnen",
        "Volumen und Oberfläche von Körpern bestimmen",
        "Mit Größen und Einheiten sachgerecht umgehen",
      ],
      afb: "II",
      gradeHint: 8,
    },
    {
      title: "Raum und Form",
      description: "Leitidee L3",
      competencies: [
        "Geometrische Figuren beschreiben und konstruieren",
        "Kongruenz und Ähnlichkeit erkennen und begründen",
        "Den Satz des Pythagoras anwenden",
      ],
      afb: "II",
      gradeHint: 9,
    },
    {
      title: "Trigonometrie am rechtwinkligen Dreieck",
      competencies: [
        "Sinus, Kosinus und Tangens zur Berechnung nutzen",
        "Trigonometrische Beziehungen auf Sachsituationen übertragen",
      ],
      afb: "II",
      gradeHint: 10,
    },
    {
      title: "Daten und Zufall",
      description: "Leitidee L5",
      competencies: [
        "Daten erheben, darstellen und Kennwerte bestimmen",
        "Wahrscheinlichkeiten mehrstufiger Zufallsversuche bestimmen",
        "Statistische Darstellungen kritisch beurteilen",
      ],
      afb: "III",
      gradeHint: 9,
    },
    {
      title: "Exponentielles Wachstum",
      competencies: [
        "Lineares und exponentielles Wachstum unterscheiden",
        "Wachstums- und Zerfallsprozesse modellieren",
      ],
      afb: "III",
      gradeHint: 10,
    },
  ],
};

const MATHEMATIK_SEK_2: SubjectCatalog = {
  subjectKey: "mathematik",
  stage: "sek_2",
  gradeMin: 10,
  gradeMax: 13,
  source: {
    name: "KMK Bildungsstandards im Fach Mathematik für die Allgemeine Hochschulreife",
    url: KMK_URL,
    version: "2012",
  },
  verified: false,
  topics: [
    {
      title: "Analysis: Grenzwert und Ableitung",
      competencies: [
        "Den Ableitungsbegriff als lokale Änderungsrate deuten",
        "Ableitungsregeln sicher anwenden",
      ],
      afb: "II",
      gradeHint: 11,
    },
    {
      title: "Analysis: Kurvendiskussion",
      competencies: [
        "Monotonie, Extrem- und Wendestellen bestimmen und begründen",
        "Den Verlauf eines Graphen aus den Ableitungen erschließen",
      ],
      afb: "II",
      gradeHint: 11,
    },
    {
      title: "Analysis: Extremwertprobleme und Modellierung",
      competencies: [
        "Sachsituationen als Funktion modellieren",
        "Optimale Lösungen bestimmen und im Sachkontext deuten",
      ],
      afb: "III",
      gradeHint: 12,
    },
    {
      title: "Analysis: Integralrechnung",
      competencies: [
        "Das Integral als Rekonstruktion und als Flächeninhalt deuten",
        "Stammfunktionen bestimmen und den Hauptsatz anwenden",
      ],
      afb: "II",
      gradeHint: 12,
    },
    {
      title: "Analytische Geometrie: Vektoren",
      competencies: [
        "Punkte, Geraden und Ebenen im Raum darstellen",
        "Lagebeziehungen untersuchen und begründen",
      ],
      afb: "II",
      gradeHint: 12,
    },
    {
      title: "Analytische Geometrie: Skalarprodukt und Abstände",
      competencies: [
        "Winkel und Abstände berechnen",
        "Geometrische Aussagen rechnerisch nachweisen",
      ],
      afb: "III",
      gradeHint: 12,
    },
    {
      title: "Stochastik: Wahrscheinlichkeitsverteilungen",
      competencies: [
        "Zufallsgrößen, Erwartungswert und Standardabweichung bestimmen",
        "Die Binomialverteilung anwenden und ihre Voraussetzungen prüfen",
      ],
      afb: "II",
      gradeHint: 12,
    },
    {
      title: "Stochastik: Hypothesentests",
      competencies: [
        "Ein- und zweiseitige Signifikanztests durchführen",
        "Fehler erster und zweiter Art im Sachkontext beurteilen",
      ],
      afb: "III",
      gradeHint: 13,
    },
  ],
};

// ---------------------------------------------------------------------------
// Deutsch
//
// The four Kompetenzbereiche are KMK-defined.
// ---------------------------------------------------------------------------

const DEUTSCH_SEK_1: SubjectCatalog = {
  subjectKey: "deutsch",
  stage: "sek_1",
  gradeMin: 5,
  gradeMax: 10,
  source: {
    name: "KMK Bildungsstandards im Fach Deutsch für den Mittleren Schulabschluss",
    url: KMK_URL,
    version: "2022",
  },
  verified: false,
  topics: [
    {
      title: "Umgang mit literarischen Texten",
      competencies: [
        "Handlung, Figuren und Erzählperspektive erfassen",
        "Sprachliche Gestaltungsmittel benennen und ihre Wirkung erklären",
      ],
      afb: "II",
      gradeHint: 8,
    },
    {
      title: "Umgang mit Sachtexten",
      competencies: [
        "Argumentationsstruktur eines Sachtextes herausarbeiten",
        "Absicht und Adressatenbezug erkennen",
      ],
      afb: "II",
      gradeHint: 9,
    },
    {
      title: "Argumentieren und Erörtern",
      competencies: [
        "Argumente mit Beleg und Beispiel aufbauen",
        "These, Gegenthese und begründetes Fazit entwickeln",
      ],
      afb: "III",
      gradeHint: 10,
    },
    {
      title: "Analyse von Kurzprosa",
      competencies: [
        "Eine Kurzgeschichte inhaltlich und sprachlich analysieren",
        "Eine Deutung am Text belegen",
      ],
      afb: "III",
      gradeHint: 10,
    },
    {
      title: "Lyrik: Form und Wirkung",
      competencies: [
        "Metrum, Reimschema und Bildlichkeit bestimmen",
        "Form und Inhalt aufeinander beziehen",
      ],
      afb: "II",
      gradeHint: 9,
    },
    {
      title: "Dramenanalyse",
      competencies: [
        "Dramatische Struktur und Figurenkonstellation beschreiben",
        "Eine Szene im Handlungszusammenhang deuten",
      ],
      afb: "II",
      gradeHint: 10,
    },
    {
      title: "Sprache und Sprachgebrauch untersuchen",
      competencies: [
        "Satzbau, Wortarten und Zeitformen sicher bestimmen",
        "Sprachliche Register unterscheiden",
      ],
      afb: "I",
      gradeHint: 7,
    },
    {
      title: "Schreibformen: Inhaltsangabe und Stellungnahme",
      competencies: [
        "Sachlich, im Präsens und in eigenen Worten zusammenfassen",
        "Eine eigene Position begründet formulieren",
      ],
      afb: "II",
      gradeHint: 8,
    },
  ],
};

const DEUTSCH_SEK_2: SubjectCatalog = {
  subjectKey: "deutsch",
  stage: "sek_2",
  gradeMin: 10,
  gradeMax: 13,
  source: {
    name: "KMK Bildungsstandards im Fach Deutsch für die Allgemeine Hochschulreife",
    url: KMK_URL,
    version: "2012",
  },
  verified: false,
  topics: [
    {
      title: "Interpretation epischer Texte",
      competencies: [
        "Erzähltechnik und Perspektivierung analysieren",
        "Eine textgestützte Deutungshypothese entwickeln und prüfen",
      ],
      afb: "III",
      gradeHint: 11,
    },
    {
      title: "Interpretation lyrischer Texte",
      competencies: [
        "Formale und sprachliche Mittel funktional deuten",
        "Ein Gedicht in einen literarhistorischen Kontext einordnen",
      ],
      afb: "III",
      gradeHint: 11,
    },
    {
      title: "Dramenanalyse und Szeneninterpretation",
      competencies: [
        "Eine Szene im Gesamtzusammenhang des Dramas deuten",
        "Figurenrede und dramatische Mittel analysieren",
      ],
      afb: "III",
      gradeHint: 12,
    },
    {
      title: "Erörterung literarischer und pragmatischer Texte",
      competencies: [
        "Positionen aus Texten herausarbeiten und abwägen",
        "Zu einem begründeten eigenen Urteil kommen",
      ],
      afb: "III",
      gradeHint: 12,
    },
    {
      title: "Materialgestütztes Schreiben",
      competencies: [
        "Informationen aus mehreren Materialien zusammenführen",
        "Adressaten- und situationsgerecht formulieren",
      ],
      afb: "III",
      gradeHint: 12,
    },
    {
      title: "Sprachwandel und Sprachkritik",
      competencies: [
        "Positionen zum Sprachwandel darstellen und beurteilen",
        "Spracherwerbstheorien vergleichen",
      ],
      afb: "III",
      gradeHint: 13,
    },
    {
      title: "Literaturgeschichtliche Epochen",
      competencies: [
        "Merkmale von Aufklärung, Sturm und Drang, Klassik und Romantik benennen",
        "Texte epochentypisch einordnen und die Zuordnung begründen",
      ],
      afb: "II",
      gradeHint: 11,
    },
  ],
};

// ---------------------------------------------------------------------------
// Englisch
// ---------------------------------------------------------------------------

const ENGLISCH_SEK_1: SubjectCatalog = {
  subjectKey: "englisch",
  stage: "sek_1",
  gradeMin: 5,
  gradeMax: 10,
  source: {
    name: "KMK Bildungsstandards für die erste Fremdsprache für den Mittleren Schulabschluss",
    url: KMK_URL,
    version: "2003",
  },
  verified: false,
  topics: [
    {
      title: "Reading comprehension",
      competencies: [
        "Hauptaussagen und Details eines Textes erfassen",
        "Informationen aus dem Text belegen",
      ],
      afb: "II",
      gradeHint: 9,
    },
    {
      title: "Listening comprehension",
      competencies: ["Gesprochene Texte global und selektiv verstehen"],
      afb: "II",
      gradeHint: 9,
    },
    {
      title: "Writing: letter, email and comment",
      competencies: [
        "Adressatengerecht und situationsangemessen schreiben",
        "Eine eigene Meinung begründet darstellen",
      ],
      afb: "II",
      gradeHint: 10,
    },
    {
      title: "Mediation",
      competencies: [
        "Inhalte sinngemäß zwischen Deutsch und Englisch übertragen",
        "Kulturelle Bezüge erläutern",
      ],
      afb: "III",
      gradeHint: 10,
    },
    {
      title: "Tenses and verb forms",
      competencies: [
        "Zeitformen situationsgerecht verwenden",
        "Aktiv und Passiv unterscheiden",
      ],
      afb: "I",
      gradeHint: 8,
    },
    {
      title: "Conditional clauses and reported speech",
      competencies: [
        "Bedingungssätze der Typen I bis III bilden",
        "Indirekte Rede korrekt verwenden",
      ],
      afb: "II",
      gradeHint: 9,
    },
    {
      title: "Vocabulary and word formation",
      competencies: ["Wortfelder erschließen und Wortbildungsregeln anwenden"],
      afb: "I",
      gradeHint: 8,
    },
  ],
};

const ENGLISCH_SEK_2: SubjectCatalog = {
  subjectKey: "englisch",
  stage: "sek_2",
  gradeMin: 10,
  gradeMax: 13,
  source: {
    name: "KMK Bildungsstandards für die fortgeführte Fremdsprache für die Allgemeine Hochschulreife",
    url: KMK_URL,
    version: "2012",
  },
  verified: false,
  topics: [
    {
      title: "Text analysis: fiction",
      competencies: [
        "Narrative technique, characterisation und Stilmittel analysieren",
        "Deutungen am Text belegen",
      ],
      afb: "III",
      gradeHint: 12,
    },
    {
      title: "Text analysis: non-fiction",
      competencies: [
        "Argumentation und rhetorische Mittel eines Sachtextes analysieren",
        "Intention und Wirkung beurteilen",
      ],
      afb: "III",
      gradeHint: 12,
    },
    {
      title: "Composition and comment",
      competencies: [
        "Eine strukturierte Stellungnahme mit Belegen verfassen",
        "Register und Kohäsionsmittel angemessen einsetzen",
      ],
      afb: "III",
      gradeHint: 12,
    },
    {
      title: "Mediation",
      competencies: [
        "Deutsche Ausgangstexte adressatengerecht ins Englische übertragen",
      ],
      afb: "III",
      gradeHint: 12,
    },
    {
      title: "Globalisation and technology",
      competencies: [
        "Chancen und Risiken globaler Entwicklungen erörtern",
      ],
      afb: "III",
      gradeHint: 12,
    },
    {
      title: "Postcolonial and Anglophone cultures",
      competencies: [
        "Kulturelle Identität und Diversität in anglophonen Gesellschaften diskutieren",
      ],
      afb: "III",
      gradeHint: 13,
    },
    {
      title: "The American Dream",
      competencies: [
        "Historische und gegenwärtige Ausprägungen darstellen und beurteilen",
      ],
      afb: "III",
      gradeHint: 13,
    },
  ],
};

// ---------------------------------------------------------------------------
// Biologie
// ---------------------------------------------------------------------------

const BIOLOGIE_SEK_1: SubjectCatalog = {
  subjectKey: "biologie",
  stage: "sek_1",
  gradeMin: 5,
  gradeMax: 10,
  source: {
    name: "KMK Bildungsstandards im Fach Biologie für den Mittleren Schulabschluss",
    url: KMK_URL,
    version: "2020",
  },
  verified: false,
  topics: [
    {
      title: "Zelle und Zellbestandteile",
      competencies: [
        "Bau von Tier- und Pflanzenzelle vergleichen",
        "Funktionen der Zellorganellen erklären",
      ],
      afb: "I",
      gradeHint: 7,
    },
    {
      title: "Fotosynthese und Zellatmung",
      competencies: [
        "Wortgleichungen aufstellen und die Prozesse gegenüberstellen",
        "Die Bedeutung für den Stoffkreislauf erläutern",
      ],
      afb: "II",
      gradeHint: 8,
    },
    {
      title: "Ökosysteme und Stoffkreisläufe",
      competencies: [
        "Nahrungsbeziehungen darstellen",
        "Eingriffe des Menschen in Ökosysteme beurteilen",
      ],
      afb: "III",
      gradeHint: 9,
    },
    {
      title: "Genetik: Vererbungsregeln",
      competencies: [
        "Mendelsche Regeln anwenden und Kreuzungen auswerten",
        "Erbgänge am Stammbaum analysieren",
      ],
      afb: "II",
      gradeHint: 10,
    },
    {
      title: "Evolution",
      competencies: [
        "Belege für Evolution nennen und einordnen",
        "Angepasstheiten evolutionsbiologisch erklären",
      ],
      afb: "II",
      gradeHint: 10,
    },
    {
      title: "Der menschliche Körper: Organsysteme",
      competencies: [
        "Bau und Funktion von Herz, Lunge und Verdauungssystem beschreiben",
      ],
      afb: "I",
      gradeHint: 8,
    },
    {
      title: "Immunbiologie",
      competencies: [
        "Spezifische und unspezifische Abwehr unterscheiden",
        "Die Wirkung einer Impfung erklären",
      ],
      afb: "II",
      gradeHint: 9,
    },
  ],
};

const BIOLOGIE_SEK_2: SubjectCatalog = {
  subjectKey: "biologie",
  stage: "sek_2",
  gradeMin: 10,
  gradeMax: 13,
  source: {
    name: "KMK Bildungsstandards in den naturwissenschaftlichen Fächern für die Allgemeine Hochschulreife",
    url: KMK_URL,
    version: "2020",
  },
  verified: false,
  topics: [
    {
      title: "Zellbiologie und Membranprozesse",
      competencies: [
        "Bau der Biomembran und Transportvorgänge erklären",
        "Experimente zur Osmose auswerten",
      ],
      afb: "II",
      gradeHint: 11,
    },
    {
      title: "Enzymatik",
      competencies: [
        "Enzymwirkung und Einflussfaktoren erklären",
        "Enzymkinetische Diagramme auswerten",
      ],
      afb: "II",
      gradeHint: 11,
    },
    {
      title: "Stoffwechsel: Fotosynthese und Zellatmung",
      competencies: [
        "Licht- und Dunkelreaktion beschreiben",
        "Energiebilanzen aufstellen und vergleichen",
      ],
      afb: "II",
      gradeHint: 12,
    },
    {
      title: "Molekulargenetik",
      competencies: [
        "Replikation, Transkription und Translation erklären",
        "Genregulation an Operonmodellen erläutern",
      ],
      afb: "II",
      gradeHint: 12,
    },
    {
      title: "Gentechnik und ihre Bewertung",
      competencies: [
        "Gentechnische Verfahren beschreiben",
        "Chancen und Risiken kriteriengeleitet beurteilen",
      ],
      afb: "III",
      gradeHint: 12,
    },
    {
      title: "Neurobiologie",
      competencies: [
        "Ruhe- und Aktionspotenzial erklären",
        "Synaptische Übertragung und Einflüsse von Stoffen analysieren",
      ],
      afb: "II",
      gradeHint: 13,
    },
    {
      title: "Evolution und Artbildung",
      competencies: [
        "Evolutionsfaktoren auf Populationen anwenden",
        "Stammbäume interpretieren und Hypothesen prüfen",
      ],
      afb: "III",
      gradeHint: 13,
    },
    {
      title: "Ökologie: Populationsdynamik",
      competencies: [
        "Wachstumsmodelle von Populationen auswerten",
        "Ökologische Nischen und Konkurrenz analysieren",
      ],
      afb: "III",
      gradeHint: 11,
    },
  ],
};

// ---------------------------------------------------------------------------
// Physik
// ---------------------------------------------------------------------------

const PHYSIK_SEK_1: SubjectCatalog = {
  subjectKey: "physik",
  stage: "sek_1",
  gradeMin: 5,
  gradeMax: 10,
  source: {
    name: "KMK Bildungsstandards im Fach Physik für den Mittleren Schulabschluss",
    url: KMK_URL,
    version: "2020",
  },
  verified: false,
  topics: [
    {
      title: "Mechanik: Bewegung und Geschwindigkeit",
      competencies: [
        "Weg-Zeit-Diagramme auswerten",
        "Gleichförmige und beschleunigte Bewegung unterscheiden",
      ],
      afb: "II",
      gradeHint: 8,
    },
    {
      title: "Kräfte und ihre Wirkungen",
      competencies: [
        "Kräfte zeichnerisch darstellen und zusammensetzen",
        "Das Hookesche Gesetz anwenden",
      ],
      afb: "II",
      gradeHint: 8,
    },
    {
      title: "Energie, Arbeit und Leistung",
      competencies: [
        "Energieformen unterscheiden und Umwandlungen beschreiben",
        "Den Energieerhaltungssatz anwenden",
      ],
      afb: "II",
      gradeHint: 9,
    },
    {
      title: "Elektrizitätslehre: Stromkreis",
      competencies: [
        "Schaltpläne lesen und zeichnen",
        "Das Ohmsche Gesetz auf Reihen- und Parallelschaltung anwenden",
      ],
      afb: "II",
      gradeHint: 9,
    },
    {
      title: "Optik",
      competencies: [
        "Reflexion und Brechung konstruieren",
        "Abbildungen an Linsen erklären",
      ],
      afb: "II",
      gradeHint: 7,
    },
    {
      title: "Wärmelehre",
      competencies: [
        "Temperatur und Wärme unterscheiden",
        "Aggregatzustandsänderungen mit dem Teilchenmodell erklären",
      ],
      afb: "II",
      gradeHint: 8,
    },
    {
      title: "Radioaktivität",
      competencies: [
        "Strahlungsarten und Halbwertszeit beschreiben",
        "Nutzen und Risiken beurteilen",
      ],
      afb: "III",
      gradeHint: 10,
    },
  ],
};

const PHYSIK_SEK_2: SubjectCatalog = {
  subjectKey: "physik",
  stage: "sek_2",
  gradeMin: 10,
  gradeMax: 13,
  source: {
    name: "KMK Bildungsstandards in den naturwissenschaftlichen Fächern für die Allgemeine Hochschulreife",
    url: KMK_URL,
    version: "2020",
  },
  verified: false,
  topics: [
    {
      title: "Mechanische Schwingungen und Wellen",
      competencies: [
        "Harmonische Schwingungen mathematisch beschreiben",
        "Interferenz und Beugung erklären",
      ],
      afb: "II",
      gradeHint: 11,
    },
    {
      title: "Elektrisches Feld",
      competencies: [
        "Feldstärke und Potenzial berechnen",
        "Bewegung geladener Teilchen im Feld analysieren",
      ],
      afb: "II",
      gradeHint: 12,
    },
    {
      title: "Magnetisches Feld und Induktion",
      competencies: [
        "Die Lorentzkraft anwenden",
        "Induktionsvorgänge quantitativ beschreiben",
      ],
      afb: "II",
      gradeHint: 12,
    },
    {
      title: "Quantenphysik",
      competencies: [
        "Den Fotoeffekt deuten und die Einsteingleichung anwenden",
        "Welle-Teilchen-Dualismus erläutern",
      ],
      afb: "III",
      gradeHint: 13,
    },
    {
      title: "Atom- und Kernphysik",
      competencies: [
        "Atommodelle vergleichen",
        "Kernreaktionen und Massendefekt berechnen",
      ],
      afb: "II",
      gradeHint: 13,
    },
  ],
};

// ---------------------------------------------------------------------------
// Chemie
// ---------------------------------------------------------------------------

const CHEMIE_SEK_1: SubjectCatalog = {
  subjectKey: "chemie",
  stage: "sek_1",
  gradeMin: 7,
  gradeMax: 10,
  source: {
    name: "KMK Bildungsstandards im Fach Chemie für den Mittleren Schulabschluss",
    url: KMK_URL,
    version: "2020",
  },
  verified: false,
  topics: [
    {
      title: "Stoffe und Stofftrennung",
      competencies: [
        "Stoffeigenschaften zur Identifikation nutzen",
        "Trennverfahren begründet auswählen",
      ],
      afb: "I",
      gradeHint: 7,
    },
    {
      title: "Atombau und Periodensystem",
      competencies: [
        "Den Aufbau der Atomhülle beschreiben",
        "Eigenschaften aus der Stellung im Periodensystem ableiten",
      ],
      afb: "II",
      gradeHint: 8,
    },
    {
      title: "Chemische Bindung",
      competencies: [
        "Ionen-, Atom- und Metallbindung unterscheiden",
        "Stoffeigenschaften aus dem Bindungstyp erklären",
      ],
      afb: "II",
      gradeHint: 9,
    },
    {
      title: "Chemische Reaktionen und Reaktionsgleichungen",
      competencies: [
        "Reaktionsgleichungen aufstellen und ausgleichen",
        "Stoffmengen und Massen berechnen",
      ],
      afb: "II",
      gradeHint: 9,
    },
    {
      title: "Säuren, Basen und Neutralisation",
      competencies: [
        "Den pH-Wert deuten",
        "Neutralisationsreaktionen formulieren",
      ],
      afb: "II",
      gradeHint: 10,
    },
    {
      title: "Redoxreaktionen",
      competencies: [
        "Oxidation und Reduktion als Elektronenübergang beschreiben",
        "Oxidationszahlen bestimmen",
      ],
      afb: "II",
      gradeHint: 10,
    },
  ],
};

const CHEMIE_SEK_2: SubjectCatalog = {
  subjectKey: "chemie",
  stage: "sek_2",
  gradeMin: 10,
  gradeMax: 13,
  source: {
    name: "KMK Bildungsstandards in den naturwissenschaftlichen Fächern für die Allgemeine Hochschulreife",
    url: KMK_URL,
    version: "2020",
  },
  verified: false,
  topics: [
    {
      title: "Chemisches Gleichgewicht",
      competencies: [
        "Das Massenwirkungsgesetz anwenden",
        "Das Prinzip von Le Chatelier auf Prozesse übertragen",
      ],
      afb: "II",
      gradeHint: 11,
    },
    {
      title: "Säure-Base-Gleichgewichte",
      competencies: [
        "pH-Werte starker und schwacher Säuren berechnen",
        "Titrationskurven auswerten und Puffer erklären",
      ],
      afb: "III",
      gradeHint: 12,
    },
    {
      title: "Elektrochemie",
      competencies: [
        "Galvanische Zellen und Elektrolyse beschreiben",
        "Zellspannungen mit der Nernstgleichung berechnen",
      ],
      afb: "III",
      gradeHint: 12,
    },
    {
      title: "Organische Chemie: Stoffklassen",
      competencies: [
        "Alkane, Alkene, Alkohole, Aldehyde und Carbonsäuren unterscheiden",
        "Eigenschaften aus funktionellen Gruppen ableiten",
      ],
      afb: "II",
      gradeHint: 11,
    },
    {
      title: "Reaktionsmechanismen",
      competencies: [
        "Substitution, Addition und Eliminierung erklären",
        "Mechanismen mit Elektronenverschiebungen darstellen",
      ],
      afb: "III",
      gradeHint: 12,
    },
    {
      title: "Kunststoffe und Makromoleküle",
      competencies: [
        "Polymerisation und Polykondensation unterscheiden",
        "Eigenschaften und Nachhaltigkeit beurteilen",
      ],
      afb: "III",
      gradeHint: 13,
    },
  ],
};

// ---------------------------------------------------------------------------
// Geschichte
//
// History curricula are the most state-specific of all: emphasis and period
// selection differ noticeably. The entries below are the periods common to
// nearly every state, kept deliberately broad.
// ---------------------------------------------------------------------------

const GESCHICHTE_SEK_1: SubjectCatalog = {
  subjectKey: "geschichte",
  stage: "sek_1",
  gradeMin: 6,
  gradeMax: 10,
  source: {
    name: "Gemeinsame Struktur der Länder-Lehrpläne, zu prüfen gegen das Landesdokument",
    url: KMK_URL,
    version: "2026",
  },
  verified: false,
  topics: [
    {
      title: "Antike: Griechenland und Rom",
      competencies: [
        "Herrschaftsformen der Antike beschreiben und vergleichen",
      ],
      afb: "I",
      gradeHint: 6,
    },
    {
      title: "Mittelalter: Herrschaft und Gesellschaft",
      competencies: [
        "Lehnswesen und Ständeordnung erklären",
        "Stadt und Land im Mittelalter vergleichen",
      ],
      afb: "II",
      gradeHint: 7,
    },
    {
      title: "Frühe Neuzeit: Reformation und Entdeckungen",
      competencies: [
        "Ursachen und Folgen der Reformation erläutern",
      ],
      afb: "II",
      gradeHint: 8,
    },
    {
      title: "Französische Revolution",
      competencies: [
        "Ursachen, Verlauf und Folgen darstellen",
        "Die Bedeutung der Menschenrechte beurteilen",
      ],
      afb: "II",
      gradeHint: 8,
    },
    {
      title: "Industrialisierung und soziale Frage",
      competencies: [
        "Ursachen der Industrialisierung erklären",
        "Lebensbedingungen der Arbeiterschaft beurteilen",
      ],
      afb: "II",
      gradeHint: 9,
    },
    {
      title: "Erster Weltkrieg und Weimarer Republik",
      competencies: [
        "Kriegsursachen analysieren",
        "Die Belastungen der Weimarer Republik erklären",
      ],
      afb: "III",
      gradeHint: 9,
    },
    {
      title: "Nationalsozialismus und Zweiter Weltkrieg",
      competencies: [
        "Aufstieg und Herrschaftssystem des Nationalsozialismus analysieren",
        "Ursachen und Folgen des Holocaust darstellen und beurteilen",
      ],
      afb: "III",
      gradeHint: 10,
    },
    {
      title: "Geteiltes Deutschland und Wiedervereinigung",
      competencies: [
        "Entwicklung von BRD und DDR vergleichen",
        "Den Weg zur Wiedervereinigung erklären",
      ],
      afb: "II",
      gradeHint: 10,
    },
  ],
};

const GESCHICHTE_SEK_2: SubjectCatalog = {
  subjectKey: "geschichte",
  stage: "sek_2",
  gradeMin: 10,
  gradeMax: 13,
  source: {
    name: "Gemeinsame Struktur der Länder-Lehrpläne, zu prüfen gegen das Landesdokument",
    url: KMK_URL,
    version: "2026",
  },
  verified: false,
  topics: [
    {
      title: "Quellenanalyse und Geschichtsdeutung",
      competencies: [
        "Quellen und Darstellungen unterscheiden und kritisch prüfen",
        "Perspektivität historischer Aussagen beurteilen",
      ],
      afb: "III",
      gradeHint: 11,
    },
    {
      title: "Nationalstaat und Nationalismus im 19. Jahrhundert",
      competencies: [
        "Wege zur Nationalstaatsbildung vergleichen",
        "Formen des Nationalismus beurteilen",
      ],
      afb: "III",
      gradeHint: 11,
    },
    {
      title: "Imperialismus und Erster Weltkrieg",
      competencies: [
        "Ursachenkomplexe analysieren",
        "Die Kriegsschuldfrage kontrovers erörtern",
      ],
      afb: "III",
      gradeHint: 12,
    },
    {
      title: "Nationalsozialismus: Herrschaft und Verbrechen",
      competencies: [
        "Herrschaftstechniken analysieren",
        "Verantwortung und Handlungsspielräume beurteilen",
      ],
      afb: "III",
      gradeHint: 12,
    },
    {
      title: "Kalter Krieg und deutsche Teilung",
      competencies: [
        "Blockbildung und Systemkonkurrenz analysieren",
        "Deutschlandpolitik beider Staaten vergleichen",
      ],
      afb: "III",
      gradeHint: 13,
    },
    {
      title: "Europäische Integration",
      competencies: [
        "Motive und Etappen der Integration darstellen",
        "Chancen und Konflikte der EU beurteilen",
      ],
      afb: "III",
      gradeHint: 13,
    },
  ],
};

export const CATALOG: readonly SubjectCatalog[] = [
  MATHEMATIK_SEK_1,
  MATHEMATIK_SEK_2,
  DEUTSCH_SEK_1,
  DEUTSCH_SEK_2,
  ENGLISCH_SEK_1,
  ENGLISCH_SEK_2,
  BIOLOGIE_SEK_1,
  BIOLOGIE_SEK_2,
  PHYSIK_SEK_1,
  PHYSIK_SEK_2,
  CHEMIE_SEK_1,
  CHEMIE_SEK_2,
  GESCHICHTE_SEK_1,
  GESCHICHTE_SEK_2,
];
