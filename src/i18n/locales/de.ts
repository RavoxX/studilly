/**
 * German interface strings. This object is the source of truth for the
 * dictionary shape; `en.ts` must satisfy the same type.
 *
 * Access is by property path (`t.dashboard.title`), not by string key, so a
 * typo is a compile error and unused keys are visible to the type checker.
 * Values that need interpolation are functions.
 */
export const de = {
  common: {
    appName: "Studilly",
    tagline: "Übe mit Klausuren, die deiner echten Prüfung entsprechen.",
    save: "Speichern",
    saving: "Wird gespeichert",
    saved: "Gespeichert",
    cancel: "Abbrechen",
    back: "Zurück",
    next: "Weiter",
    continue: "Fortfahren",
    finish: "Abschließen",
    close: "Schließen",
    delete: "Löschen",
    remove: "Entfernen",
    edit: "Bearbeiten",
    rename: "Umbenennen",
    create: "Erstellen",
    retry: "Erneut versuchen",
    loading: "Wird geladen",
    search: "Suchen",
    optional: "optional",
    required: "Pflichtfeld",
    all: "Alle",
    none: "Keine",
    yes: "Ja",
    no: "Nein",
    of: "von",
    minutes: "Minuten",
    minutesShort: "Min.",
    points: "Punkte",
    pointsShort: "P.",
    today: "Heute",
    tomorrow: "Morgen",
    yesterday: "Gestern",
    confirm: "Bestätigen",
    copy: "Kopieren",
    copied: "Kopiert",
    openMenu: "Menü öffnen",
    closeMenu: "Menü schließen",
    skipToContent: "Zum Inhalt springen",
    moreOptions: "Weitere Optionen",
    logo: "Studilly Logo",
  },

  nav: {
    dashboard: "Übersicht",
    materials: "Materialien",
    exams: "Klausuren",
    practice: "Übungen",
    learning: "Lernen",
    groups: "Lerngruppen",
    plan: "Lernplan",
    subscription: "Abo",
    settings: "Einstellungen",
    logout: "Abmelden",
    account: "Konto",
    theme: "Darstellung",
    language: "Sprache",
  },

  theme: {
    system: "System",
    light: "Hell",
    dark: "Dunkel",
  },

  auth: {
    loginTitle: "Anmelden",
    loginSubtitle: "Melde dich an, um weiterzulernen.",
    registerTitle: "Konto erstellen",
    registerSubtitle: "Kostenlos starten. Keine Zahlungsdaten nötig.",
    email: "E-Mail",
    password: "Passwort",
    passwordConfirm: "Passwort wiederholen",
    displayName: "Vorname",
    displayNameHint: "So sprechen wir dich in der App an.",
    login: "Anmelden",
    register: "Konto erstellen",
    logout: "Abmelden",
    forgotPassword: "Passwort vergessen?",
    noAccount: "Noch kein Konto?",
    hasAccount: "Du hast schon ein Konto?",
    passwordHint: "Mindestens 8 Zeichen.",
    resetTitle: "Passwort zurücksetzen",
    resetSubtitle:
      "Wir senden dir einen Link, mit dem du ein neues Passwort setzen kannst.",
    resetSubmit: "Link senden",
    resetSent:
      "Wenn zu dieser Adresse ein Konto existiert, ist der Link unterwegs. Sieh auch im Spam-Ordner nach.",
    newPasswordTitle: "Neues Passwort setzen",
    newPasswordSubmit: "Passwort speichern",
    verifyTitle: "Bestätige deine E-Mail",
    verifySubtitle: (email: string) =>
      `Wir haben einen Bestätigungslink an ${email} geschickt. Öffne ihn, um dein Konto zu aktivieren.`,
    verifyResend: "Link erneut senden",
    verifyResent: "Neuer Link gesendet.",
    errors: {
      invalidCredentials: "E-Mail oder Passwort stimmt nicht.",
      emailInUse: "Zu dieser E-Mail gibt es bereits ein Konto.",
      weakPassword: "Das Passwort braucht mindestens 8 Zeichen.",
      passwordMismatch: "Die Passwörter stimmen nicht überein.",
      invalidEmail: "Diese E-Mail-Adresse sieht nicht gültig aus.",
      emailNotConfirmed:
        "Bestätige zuerst deine E-Mail-Adresse. Den Link findest du in deinem Postfach.",
      rateLimited: "Zu viele Versuche. Warte einen Moment.",
      generic: "Das hat nicht geklappt. Versuch es bitte noch einmal.",
      expiredLink:
        "Dieser Link ist abgelaufen. Fordere einen neuen an.",
    },
  },

  onboarding: {
    title: "Kurz einrichten",
    intro:
      "Studilly erstellt Klausuren, die zu deinem Bundesland, deiner Schulform und deiner Klassenstufe passen. Dafür brauchen wir vier Angaben.",
    whyTitle: "Warum wir das fragen",
    whyBody:
      "Prüfungen unterscheiden sich zwischen den Bundesländern deutlich: Aufgabenformate, Operatoren und Bewertung sind nicht überall gleich. Ohne diese Angaben könnten wir nur allgemeine Aufgaben erzeugen statt realistischer Klausuren. Du kannst alles später in den Einstellungen ändern.",
    stepOf: (current: number, total: number) => `Schritt ${current} von ${total}`,
    step1Title: "Wie heißt du?",
    step2Title: "Wo gehst du zur Schule?",
    step3Title: "Welche Klassenstufe?",
    step4Title: "Welche Fächer?",
    step5Title: "Steht eine Prüfung an?",
    step5Subtitle:
      "Optional. Mit einem Termin erstellt Studilly dir einen Lernplan, der bis dahin trägt.",
    bundesland: "Bundesland",
    bundeslandPlaceholder: "Bundesland wählen",
    schoolType: "Schulform",
    schoolTypePlaceholder: "Schulform wählen",
    grade: "Klassenstufe",
    stage: "Schulstufe",
    stageSek1: "Sekundarstufe I",
    stageSek2: "Sekundarstufe II (Oberstufe)",
    phase: "Phase der Oberstufe",
    phaseEinfuehrung: "Einführungsphase",
    phaseQualifikation: "Qualifikationsphase",
    subjects: "Fächer",
    subjectsHint:
      "Wähle die Fächer, für die du üben willst. Weitere kannst du jederzeit ergänzen.",
    subjectsMin: "Wähle mindestens ein Fach.",
    priorityHint: "Markiere Schwerpunkte mit einem Stern.",
    examDate: "Prüfungstermin",
    examSubject: "Fach",
    addExamDate: "Termin hinzufügen",
    finish: "Einrichtung abschließen",
    schoolTypeNoteTitle: "Schulformen unterscheiden sich je Bundesland",
    schoolTypeNote:
      "Angezeigt werden nur die Schulformen, die es in deinem Bundesland tatsächlich gibt.",
  },

  dashboard: {
    title: "Übersicht",
    greeting: (name: string) => (name ? `Hallo ${name}` : "Willkommen"),
    nextActionTitle: "Als Nächstes",
    nextActionEmpty:
      "Lade dein erstes Material hoch, dann erstellt Studilly daraus eine Übungsklausur.",
    nextActionEmptyCta: "Material hochladen",
    upcomingExams: "Anstehende Prüfungen",
    upcomingExamsEmpty: "Kein Termin eingetragen.",
    addExamDate: "Termin eintragen",
    daysLeft: (days: number) =>
      days === 0 ? "Heute" : days === 1 ? "Morgen" : `noch ${days} Tage`,
    recentResults: "Letzte Ergebnisse",
    recentResultsEmpty: "Noch keine Klausur geschrieben.",
    weakTopics: "Woran du arbeiten solltest",
    weakTopicsEmpty:
      "Sobald du eine Klausur geschrieben hast, siehst du hier deine Schwerpunkte.",
    recommendedPractice: "Empfohlene Übung",
    recentMaterials: "Zuletzt hochgeladen",
    studyStreak: "Lerntage in Folge",
    dueCards: (count: number) =>
      count === 1 ? "1 Karte fällig" : `${count} Karten fällig`,
    startPractice: "Üben",
    reviewCards: "Karten wiederholen",
    viewAll: "Alle ansehen",
    planToday: "Heute im Lernplan",
    planTodayEmpty: "Für heute ist nichts geplant.",
  },

  materials: {
    title: "Materialien",
    subtitle:
      "Deine Unterlagen. Aus ihnen erstellt Studilly Klausuren, Übungen und Karteikarten.",
    upload: "Material hochladen",
    uploadTitle: "Material hochladen",
    dropzone: "Datei hierher ziehen oder auswählen",
    dropzoneHint: "PDF, Bild, Word oder Text. Bis 25 MB.",
    chooseFile: "Datei auswählen",
    uploading: "Wird hochgeladen",
    empty: "Noch keine Materialien",
    emptyBody:
      "Lade Hefteinträge, Arbeitsblätter, Skripte oder Fotos deiner Notizen hoch. Studilly liest sie und ordnet sie deinem Lehrplan zu.",
    subject: "Fach",
    subjectPlaceholder: "Fach wählen",
    titleField: "Titel",
    status: {
      uploaded: "Wird eingelesen",
      extracting: "Text wird ausgelesen",
      analyzing: "Themen werden erkannt",
      ready: "Bereit",
      failed: "Fehlgeschlagen",
    },
    topics: "Erkannte Themen",
    topicsEmpty: "Für dieses Material wurden noch keine Themen erkannt.",
    summary: "Zusammenfassung",
    pages: (n: number) => (n === 1 ? "1 Seite" : `${n} Seiten`),
    createExam: "Klausur erstellen",
    createFlashcards: "Karteikarten erstellen",
    deleteConfirmTitle: "Material löschen?",
    deleteConfirmBody:
      "Die Datei und alle daraus erzeugten Textabschnitte werden gelöscht. Bereits erstellte Klausuren bleiben erhalten.",
    reprocess: "Erneut verarbeiten",
    processingFailed:
      "Wir konnten aus dieser Datei keinen Text lesen. Bei Fotos hilft oft eine schärfere Aufnahme.",
    curriculumMatch: "Passt zum Lehrplanthema",
    fileTooLarge: "Diese Datei ist größer als 25 MB.",
    unsupportedType: "Dieser Dateityp wird nicht unterstützt.",
  },

  exams: {
    title: "Klausuren",
    subtitle: "Übungsklausuren im Format deiner echten Prüfungen.",
    create: "Klausur erstellen",
    createTitle: "Neue Klausur",
    empty: "Noch keine Klausur",
    emptyBody:
      "Erstelle aus deinen Materialien eine Übungsklausur mit Erwartungshorizont und Bewertung.",
    fromMaterials: "Aus Materialien",
    selectMaterials: "Materialien auswählen",
    selectMaterialsHint:
      "Studilly nutzt nur die passenden Abschnitte, nicht die ganzen Dateien.",
    selectTopics: "Themen",
    selectTopicsHint: "Leer lassen, um alle erkannten Themen einzubeziehen.",
    difficulty: "Schwierigkeit",
    difficultyEasy: "Einfach",
    difficultyStandard: "Standard",
    difficultyHard: "Anspruchsvoll",
    duration: "Bearbeitungszeit",
    taskCount: "Anzahl der Aufgaben",
    generate: "Klausur erstellen",
    generating: "Klausur wird erstellt",
    generatingHint: "Das dauert meist unter einer Minute.",
    steps: {
      retrieving: "Passende Abschnitte werden gesucht",
      aligning: "Themen werden dem Lehrplan zugeordnet",
      writing: "Aufgaben werden geschrieben",
      solutions: "Lösungen werden erstellt",
      validating: "Klausur wird geprüft",
    },
    generationFailed: "Die Klausur konnte nicht erstellt werden.",
    generationFailedBody:
      "Es wurde nichts von deinem Kontingent verbraucht. Versuch es bitte erneut oder wähle andere Materialien.",
    overview: "Überblick",
    start: "Klausur starten",
    resume: "Fortsetzen",
    startAgain: "Erneut schreiben",
    tasks: (n: number) => (n === 1 ? "1 Aufgabe" : `${n} Aufgaben`),
    totalPoints: (n: number) => `${n} Punkte`,
    instructions: "Hinweise",
    attempts: "Versuche",
    noAttempts: "Noch nicht geschrieben.",
    beforeYouStartTitle: "Bevor du startest",
    beforeYouStart:
      "Die Zeit läuft ab dem Start. Deine Antworten werden automatisch gespeichert, auch wenn du die Seite neu lädst.",
    afb: "Anforderungsbereich",
    afbExplainer: {
      I: "Reproduktion: Bekanntes wiedergeben.",
      II: "Reorganisation und Transfer: Gelerntes anwenden.",
      III: "Reflexion und Problemlösen: Eigenständig beurteilen und übertragen.",
    },
    operator: "Operator",
    deleteConfirmTitle: "Klausur löschen?",
    deleteConfirmBody:
      "Die Klausur und alle zugehörigen Versuche und Ergebnisse werden gelöscht.",
    validationNotice: "Automatisch geprüft",
    validationNoticeBody:
      "Punktesumme, Lösungen und Erwartungshorizont wurden vor der Anzeige geprüft.",
  },

  examRunner: {
    task: "Aufgabe",
    taskOf: (current: number, total: number) => `Aufgabe ${current} von ${total}`,
    yourAnswer: "Deine Antwort",
    answerPlaceholder: "Schreib deine Antwort hier.",
    answered: "Beantwortet",
    unanswered: "Offen",
    flagged: "Markiert",
    flag: "Zum Nachsehen markieren",
    unflag: "Markierung entfernen",
    overview: "Aufgabenübersicht",
    timeLeft: "Verbleibend",
    timeUp: "Zeit abgelaufen",
    timeUpBody:
      "Du kannst deine Antworten weiter ergänzen und dann abgeben. Die Zeitüberschreitung wird im Ergebnis vermerkt.",
    autosaved: "Automatisch gespeichert",
    saveFailed: "Nicht gespeichert",
    saveFailedHint: "Wir versuchen es weiter. Schließe die Seite noch nicht.",
    submit: "Abgeben",
    submitTitle: "Klausur abgeben?",
    submitBody: (answered: number, total: number) =>
      answered === total
        ? "Alle Aufgaben sind beantwortet. Danach wird korrigiert."
        : `${total - answered} von ${total} Aufgaben sind noch offen. Du kannst trotzdem abgeben.`,
    submitConfirm: "Jetzt abgeben",
    exit: "Verlassen",
    exitTitle: "Klausur verlassen?",
    exitBody:
      "Dein Stand ist gespeichert. Du kannst später an derselben Stelle weitermachen.",
    grading: "Wird korrigiert",
    gradingHint: "Jede Aufgabe wird einzeln gegen den Erwartungshorizont geprüft.",
    gradingFailed: "Die Korrektur ist fehlgeschlagen.",
    gradingFailedBody: "Deine Antworten sind gespeichert. Du kannst die Korrektur erneut starten.",
    retryGrading: "Korrektur erneut starten",
    stimulus: "Material zur Aufgabe",
  },

  results: {
    title: "Ergebnis",
    yourGrade: "Deine Note",
    gradePoints: "Notenpunkte",
    pointsAchieved: (awarded: number, total: number) =>
      `${awarded} von ${total} Punkten`,
    percentage: "Prozent",
    duration: "Bearbeitungszeit",
    scaleUsed: "Notenschlüssel",
    scaleNotice:
      "Prozentgrenzen legt deine Schule fest. Du kannst den Schlüssel in den Einstellungen anpassen.",
    summary: "Zusammenfassung",
    strengths: "Das lief gut",
    weaknesses: "Daran solltest du arbeiten",
    taskByTask: "Aufgabe für Aufgabe",
    yourAnswer: "Deine Antwort",
    noAnswer: "Nicht beantwortet",
    expectedSolution: "Lösung",
    erwartungshorizont: "Erwartungshorizont",
    criterionMet: "erfüllt",
    criterionMissed: "nicht erfüllt",
    missingElements: "Was gefehlt hat",
    misconceptions: "Denkfehler",
    improvement: "So holst du die Punkte",
    verdict: {
      incorrect: "Nicht korrekt",
      partially_correct: "Teilweise korrekt",
      correct_incomplete: "Korrekt, aber unvollständig",
      correct: "Korrekt",
      exceptional: "Sehr stark",
    },
    nextSteps: "Was du jetzt tun kannst",
    practiceWeakest: "Schwächstes Thema üben",
    makeFlashcards: "Karteikarten aus Fehlern",
    retakeExam: "Klausur erneut schreiben",
    print: "Drucken",
  },

  practice: {
    title: "Übungen",
    subtitle: "Gezielte Aufgaben zu deinen Schwachstellen.",
    empty: "Noch keine Übungen",
    emptyBody:
      "Sobald Studilly weiß, wo es hakt, entstehen hier passende Aufgaben. Schreib dazu eine Übungsklausur.",
    generate: "Übung erstellen",
    generating: "Übung wird erstellt",
    forWeakness: (topic: string) => `Übung zu ${topic}`,
    check: "Prüfen",
    checking: "Wird geprüft",
    nextQuestion: "Nächste Aufgabe",
    showSolution: "Lösung zeigen",
    hint: "Tipp",
    yourAnswer: "Deine Antwort",
    finished: "Übung abgeschlossen",
    finishedBody: (correct: number, total: number) =>
      `${correct} von ${total} Aufgaben gelöst.`,
    startAnother: "Weitere Übung",
    questionOf: (current: number, total: number) =>
      `Aufgabe ${current} von ${total}`,
  },

  weakness: {
    title: "Schwerpunkte",
    subtitle: "Was Studilly aus deinen Klausuren und Übungen gelernt hat.",
    empty: "Noch keine Auswertung",
    emptyBody: "Schreib eine Übungsklausur, damit hier etwas entsteht.",
    severity: "Dringlichkeit",
    severityHigh: "Hoch",
    severityMedium: "Mittel",
    severityLow: "Gering",
    confidence: "Sicherheit der Einschätzung",
    evidence: (n: number) =>
      n === 1 ? "1 Beleg" : `${n} Belege`,
    trend: {
      improving: "Wird besser",
      stable: "Unverändert",
      worsening: "Wird schlechter",
      new: "Neu erkannt",
    },
    dimension: {
      concept: "Verständnis",
      procedure: "Rechenweg",
      operator: "Operator",
      completeness: "Vollständigkeit",
      precision: "Sorgfalt",
      transfer: "Übertragung",
    },
    dimensionHelp: {
      concept: "Das Konzept selbst sitzt noch nicht.",
      procedure: "Der Ansatz stimmt, der Weg enthält Fehler.",
      operator: "Die Aufgabe verlangt mehr, als deine Antwort liefert.",
      completeness: "Richtig gedacht, aber zu knapp für die volle Punktzahl.",
      precision: "Vermeidbare Flüchtigkeitsfehler.",
      transfer: "Anwendung auf unbekannte Zusammenhänge fällt schwer.",
    },
    practiceThis: "Dazu üben",
    lastSeen: "Zuletzt aufgetreten",
  },

  learning: {
    title: "Lernen",
    subtitle: "Karteikarten und kurze Aufgaben, passend zu deinem Stand.",
    dueNow: "Jetzt fällig",
    noneDue: "Nichts fällig",
    noneDueBody: "Du bist auf dem aktuellen Stand. Die nächsten Karten kommen später.",
    empty: "Noch keine Karten",
    emptyBody:
      "Karteikarten entstehen aus deinen Materialien und aus Fehlern in Klausuren.",
    generateCards: "Karteikarten erstellen",
    generating: "Karten werden erstellt",
    showAnswer: "Antwort zeigen",
    rating: {
      again: "Nochmal",
      hard: "Schwer",
      good: "Gut",
      easy: "Leicht",
    },
    ratingHint: "Wie sicher war die Antwort?",
    nextReview: (days: number) =>
      days === 0
        ? "Wieder in dieser Sitzung"
        : days === 1
          ? "Wieder morgen"
          : `Wieder in ${days} Tagen`,
    sessionDone: "Sitzung abgeschlossen",
    sessionDoneBody: (n: number) =>
      n === 1 ? "1 Karte wiederholt." : `${n} Karten wiederholt.`,
    cardCount: (n: number) => (n === 1 ? "1 Karte" : `${n} Karten`),
    createCard: "Karte anlegen",
    front: "Vorderseite",
    back: "Rückseite",
    suspend: "Pausieren",
    unsuspend: "Fortsetzen",
  },

  plan: {
    title: "Lernplan",
    subtitle: "Ein Plan, der zu deinem Prüfungstermin passt.",
    empty: "Noch kein Lernplan",
    emptyBody:
      "Trage einen Prüfungstermin ein, dann verteilt Studilly die Themen auf die verbleibende Zeit.",
    create: "Lernplan erstellen",
    creating: "Lernplan wird erstellt",
    examDate: "Prüfungstermin",
    weeklyTime: "Zeit pro Woche",
    weeklyTimeHint: "Realistisch schätzen. Der Plan richtet sich danach.",
    subject: "Fach",
    today: "Heute",
    thisWeek: "Diese Woche",
    dayView: "Tag",
    weekView: "Woche",
    markDone: "Erledigt",
    markPending: "Doch nicht erledigt",
    skip: "Überspringen",
    activity: {
      read: "Durcharbeiten",
      flashcards: "Karteikarten",
      practice: "Übung",
      exam: "Übungsklausur",
      review: "Wiederholung",
    },
    adapt: "Plan anpassen",
    adapting: "Plan wird angepasst",
    adaptHint:
      "Passt den Plan an verpasste Termine und deinen aktuellen Stand an.",
    behindTitle: "Du hinkst hinterher",
    behindBody: (n: number) =>
      `${n} Einheiten sind offen. Studilly kann den Plan neu verteilen.`,
    daysUntilExam: (n: number) =>
      n === 0 ? "Prüfung ist heute" : n === 1 ? "Noch 1 Tag" : `Noch ${n} Tage`,
    progress: (done: number, total: number) => `${done} von ${total} erledigt`,
  },

  groups: {
    title: "Lerngruppen",
    subtitle: "Gemeinsam lernen, ohne deine Unterlagen aus der Hand zu geben.",
    empty: "Noch keine Lerngruppe",
    emptyBody:
      "Erstelle eine Gruppe oder tritt mit einem Einladungscode bei.",
    create: "Gruppe erstellen",
    join: "Gruppe beitreten",
    joinCode: "Einladungscode",
    joinCodeHint: "Sechs bis zwölf Zeichen, die du von einem Mitglied bekommst.",
    name: "Name der Gruppe",
    description: "Beschreibung",
    members: (n: number) => (n === 1 ? "1 Mitglied" : `${n} Mitglieder`),
    memberList: "Mitglieder",
    owner: "Erstellt von",
    invite: "Einladen",
    inviteBody: "Teile diesen Code mit den Personen, die beitreten sollen.",
    regenerateCode: "Neuen Code erzeugen",
    shared: "Geteilte Inhalte",
    sharedEmpty: "Es wurde noch nichts geteilt.",
    share: "Teilen",
    shareMaterial: "Material teilen",
    shareExam: "Klausur teilen",
    shareHint:
      "Nur was du hier bewusst teilst, wird für die Gruppe sichtbar. Deine übrigen Unterlagen bleiben privat.",
    unshare: "Nicht mehr teilen",
    discussion: "Austausch",
    messagePlaceholder: "Nachricht an die Gruppe",
    send: "Senden",
    noMessages: "Noch keine Nachrichten.",
    leave: "Gruppe verlassen",
    leaveConfirmTitle: "Gruppe verlassen?",
    leaveConfirmBody:
      "Du verlierst den Zugriff auf geteilte Inhalte. Was du selbst geteilt hast, wird entfernt.",
    deleteGroup: "Gruppe löschen",
    deleteConfirmTitle: "Gruppe löschen?",
    deleteConfirmBody:
      "Die Gruppe, alle Nachrichten und alle Freigaben werden gelöscht. Die Materialien der Mitglieder bleiben unberührt.",
    removeMember: "Entfernen",
    privacyNote: "Mitglieder sehen nur deinen Anzeigenamen und was du teilst.",
    invalidCode: "Diesen Einladungscode gibt es nicht.",
    alreadyMember: "Du bist bereits in dieser Gruppe.",
    groupFull: "Diese Gruppe ist voll.",
  },

  subscription: {
    title: "Abo",
    subtitle: "Dein Tarif und dein Verbrauch.",
    currentPlan: "Aktueller Tarif",
    changePlan: "Tarif wechseln",
    usage: "Verbrauch diesen Monat",
    usageResets: (date: string) => `Zurücksetzung am ${date}`,
    unlimited: "Unbegrenzt",
    used: (used: number, limit: number) => `${used} von ${limit}`,
    storage: "Speicher",
    limitReachedTitle: "Kontingent erreicht",
    limitReachedBody:
      "Du hast dein monatliches Kontingent für diese Funktion aufgebraucht.",
    upgradePrompt: "Tarif wechseln",
    manage: "Abo verwalten",
    sandboxNoticeTitle: "Testmodus",
    sandboxNoticeBody:
      "Käufe laufen im Testmodus. Es wird kein Geld abgebucht und keine Zahlungsdaten werden verlangt.",
    simulationNoticeTitle: "Abo-Anbindung nicht konfiguriert",
    simulationNoticeBody:
      "Tarifwechsel werden lokal simuliert, damit die Funktionen testbar sind. Für echte Käufe muss RevenueCat eingerichtet werden.",
    period: {
      monthly: "monatlich",
      yearly: "jährlich",
    },
    perMonth: "pro Monat",
    perYear: "pro Jahr",
    billedYearly: (price: string) => `${price} jährlich abgerechnet`,
    saveWithYearly: (percent: number) => `${percent} % günstiger`,
    selectPlan: "Auswählen",
    currentPlanBadge: "Aktuell",
    processing: "Wird verarbeitet",
    purchaseFailed: "Der Kauf konnte nicht abgeschlossen werden.",
    purchaseCancelled: "Kauf abgebrochen.",
    downgradeNote:
      "Ein Wechsel nach unten gilt ab der nächsten Abrechnungsperiode.",
  },

  plans: {
    free: {
      name: "Free",
      tagline: "Zum Ausprobieren und für gelegentliches Üben.",
    },
    pro: {
      name: "Studilly Pro",
      tagline: "Für regelmäßiges Lernen über das Schuljahr.",
    },
    ultra: {
      name: "Studilly Ultra",
      tagline: "Für Prüfungsphasen und intensives Arbeiten.",
    },
    features: {
      examsPerMonth: (n: number) =>
        n < 0 ? "Unbegrenzt Übungsklausuren" : `${n} Übungsklausuren pro Monat`,
      practicePerMonth: (n: number) =>
        n < 0 ? "Unbegrenzt Übungssets" : `${n} Übungssets pro Monat`,
      materialsPerMonth: (n: number) =>
        n < 0 ? "Unbegrenzt Uploads" : `${n} Uploads pro Monat`,
      storage: (mb: number) =>
        mb >= 1024 ? `${mb / 1024} GB Speicher` : `${mb} MB Speicher`,
      flashcards: "Karteikarten mit Wiederholungssystem",
      weaknessRadar: "Schwerpunktanalyse",
      learningPlans: "Lernpläne bis zum Prüfungstermin",
      studyGroups: (n: number) =>
        n < 0
          ? "Unbegrenzt Lerngruppen"
          : `${n} ${n === 1 ? "Lerngruppe" : "Lerngruppen"}`,
      advancedGrading: "Ausführliche Korrektur mit Erwartungshorizont",
      prioritySpeed: "Bevorzugte Verarbeitung",
      allSubjects: "Alle Fächer",
      exportResults: "Ergebnisse drucken und exportieren",
    },
  },

  settings: {
    title: "Einstellungen",
    account: "Konto",
    education: "Schule",
    preferences: "Präferenzen",
    subscription: "Abo",
    privacy: "Datenschutz",
    displayName: "Anzeigename",
    email: "E-Mail",
    emailChangeHint:
      "Eine Änderung muss über beide Adressen bestätigt werden.",
    changePassword: "Passwort ändern",
    currentPassword: "Aktuelles Passwort",
    newPassword: "Neues Passwort",
    passwordChanged: "Passwort geändert.",
    uiLanguage: "Sprache der Oberfläche",
    uiLanguageHint:
      "Betrifft nur die Bedienoberfläche. Deine Materialien und Klausuren bleiben in ihrer eigenen Sprache.",
    theme: "Darstellung",
    gradingScale: "Notenschlüssel",
    gradingScaleHint:
      "Wähle den Schlüssel, den deine Schule verwendet. Er bestimmt, wie Prozent in Noten umgerechnet werden.",
    notifications: "Benachrichtigungen",
    notificationTypes: {
      exam_reminders: "Erinnerung an Prüfungstermine",
      practice_reminders: "Erinnerung ans Üben",
      plan_reminders: "Erinnerung an Lernplan-Einheiten",
      group_activity: "Aktivität in Lerngruppen",
      usage_alerts: "Hinweis bei erreichtem Kontingent",
      subscription_updates: "Änderungen am Abo",
      achievements: "Fortschritte und Meilensteine",
    },
    notificationChannelNote:
      "Benachrichtigungen erscheinen derzeit in der App. E-Mail-Versand ist noch nicht aktiv.",
    dataExport: "Daten exportieren",
    dataExportBody:
      "Lade alle deine Daten als JSON-Datei herunter: Profil, Materialien, Klausuren, Ergebnisse, Karteikarten und Lernpläne.",
    dataExportButton: "Export herunterladen",
    dataExportPreparing: "Export wird vorbereitet",
    aiQualityReview: "Anonyme Qualitätsprüfung",
    aiQualityReviewBody:
      "Erlaubt Studilly, einzelne erzeugte Aufgaben ohne deine Antworten zur Qualitätsprüfung zu speichern. Standardmäßig aus.",
    deleteAccount: "Konto löschen",
    deleteAccountBody:
      "Löscht dein Konto und alle Daten unwiderruflich: Materialien, Dateien, Klausuren, Ergebnisse, Karteikarten, Lernpläne und Gruppenmitgliedschaften.",
    deleteAccountButton: "Konto endgültig löschen",
    deleteAccountConfirmTitle: "Konto endgültig löschen?",
    deleteAccountConfirmBody:
      "Das lässt sich nicht rückgängig machen. Tippe DELETE, um zu bestätigen.",
    deleteAccountConfirmWord: "DELETE",
    savedToast: "Änderungen gespeichert.",
  },

  usage: {
    metric: {
      exam_generation: "Übungsklausuren",
      exam_grading: "Korrekturen",
      practice_generation: "Übungssets",
      flashcard_generation: "Karteikarten-Sets",
      material_upload: "Uploads",
      material_analysis: "Materialanalysen",
      learning_plan: "Lernpläne",
    },
  },

  errors: {
    title: "Etwas ist schiefgelaufen",
    generic: "Das hat nicht geklappt. Versuch es bitte noch einmal.",
    network: "Keine Verbindung. Prüf dein Netzwerk.",
    notFound: "Nicht gefunden",
    notFoundBody: "Diese Seite gibt es nicht oder du hast keinen Zugriff darauf.",
    forbidden: "Kein Zugriff",
    forbiddenBody: "Dieser Inhalt gehört nicht zu deinem Konto.",
    unauthorized: "Bitte anmelden",
    invalidInput: "Bitte prüf deine Eingaben.",
    limitReached: "Kontingent erreicht.",
    rateLimited: "Zu viele Anfragen. Warte einen Moment.",
    aiUnavailable:
      "Die KI-Verarbeitung ist gerade nicht erreichbar. Dein Kontingent wurde nicht belastet.",
    aiInvalidOutput:
      "Das Ergebnis war unvollständig und wurde verworfen. Versuch es bitte erneut.",
    notConfigured: "Diese Funktion ist noch nicht eingerichtet.",
    backToDashboard: "Zur Übersicht",
    backHome: "Zur Startseite",
  },

  marketing: {
    navFeatures: "Funktionen",
    navHowItWorks: "So funktioniert es",
    navPricing: "Preise",
    navFaq: "Fragen",
    login: "Anmelden",
    getStarted: "Kostenlos starten",
    heroTitle: "Übe mit Klausuren, die deiner echten Prüfung entsprechen.",
    heroBody:
      "Studilly macht aus deinen Unterlagen realistische Übungsklausuren, korrigiert sie und zeigt dir, woran du arbeiten musst.",
    heroCta: "Kostenlos starten",
    heroSecondary: "Preise ansehen",

    howTitle: "Von deinen Unterlagen zur korrigierten Klausur",
    how: {
      uploadTitle: "Unterlagen hochladen",
      uploadBody:
        "Hefteinträge, Arbeitsblätter, Skripte oder Fotos deiner Notizen. Studilly liest den Inhalt und erkennt die Themen.",
      generateTitle: "Klausur erstellen",
      generateBody:
        "Passend zu Bundesland, Schulform und Klassenstufe, mit echten Operatoren, Punkteverteilung und Erwartungshorizont.",
      writeTitle: "Klausur schreiben",
      writeBody:
        "Ablenkungsfreier Prüfungsmodus mit Zeit, Aufgabenübersicht und automatischem Speichern.",
      feedbackTitle: "Korrektur und Schwerpunkte",
      feedbackBody:
        "Jede Aufgabe wird gegen den Erwartungshorizont geprüft. Aus den Fehlern entstehen gezielte Übungen.",
    },

    featuresTitle: "Was Studilly für dich übernimmt",
    features: {
      curriculumTitle: "Auf dein Bundesland abgestimmt",
      curriculumBody:
        "Prüfungsformate unterscheiden sich zwischen den Ländern. Studilly berücksichtigt Bundesland, Schulform und Klassenstufe.",
      gradingTitle: "Korrektur mit Begründung",
      gradingBody:
        "Punkte pro Kriterium statt einer pauschalen Note. Du siehst genau, wo Punkte fehlen und warum.",
      weaknessTitle: "Schwerpunkte über die Zeit",
      weaknessBody:
        "Studilly merkt sich, ob dir ein Thema fehlt, ein Rechenweg wackelt oder ein Operator nicht bedient wird.",
      practiceTitle: "Übungen gegen deine Lücken",
      practiceBody:
        "Aus erkannten Schwächen entstehen Aufgaben, die genau dort ansetzen.",
      planTitle: "Lernplan bis zur Prüfung",
      planBody:
        "Termin eintragen, verfügbare Zeit angeben. Studilly verteilt die Themen und passt den Plan an.",
      groupsTitle: "Lerngruppen mit klaren Grenzen",
      groupsBody:
        "Teile einzelne Materialien bewusst. Der Rest deiner Unterlagen bleibt privat.",
    },

    afbTitle: "Aufgaben nach den Anforderungsbereichen",
    afbBody:
      "Studilly verteilt Aufgaben über die Anforderungsbereiche I bis III und nutzt die Operatoren, die in deinem Fach üblich sind.",

    privacyTitle: "Deine Unterlagen bleiben deine",
    privacyBody:
      "Dateien liegen verschlüsselt in einem privaten Speicher in der EU und sind nur über kurzlebige Links erreichbar. Keine Werbung, kein Weiterverkauf von Daten. Du kannst dein Konto und alle Daten jederzeit löschen.",
    privacyLink: "Zur Datenschutzerklärung",

    pricingTitle: "Preise",
    pricingBody: "Der kostenlose Tarif reicht, um Studilly ernsthaft zu testen.",

    faqTitle: "Häufige Fragen",
    faq: {
      q1: "Für wen ist Studilly gedacht?",
      a1: "Für Schülerinnen und Schüler der Sekundarstufe I und der gymnasialen Oberstufe in Deutschland. Du wählst Bundesland, Schulform und Klassenstufe, und die Aufgaben richten sich danach.",
      q2: "Woher kommen die Aufgaben?",
      a2: "Aus deinen eigenen Unterlagen. Studilly liest sie, ordnet die Themen ein und schreibt daraus Aufgaben im Format deiner Prüfung. Es sind keine echten Prüfungsaufgaben und keine amtlichen Vorgaben.",
      q3: "Ersetzt die Note von Studilly eine Schulnote?",
      a3: "Nein. Die Bewertung ist eine Einschätzung zum Üben. Prozentgrenzen legt deine Schule fest, deshalb kannst du den Notenschlüssel in den Einstellungen anpassen.",
      q4: "Kann ich Studilly auf dem Handy nutzen?",
      a4: "Ja. Der Prüfungsmodus ist eigens für kleine Bildschirme gebaut, nicht nur verkleinert.",
      q5: "Was passiert mit meinen Dateien?",
      a5: "Sie liegen in einem privaten Speicher in der EU und sind nur für dich zugänglich. Du kannst einzelne Materialien oder dein ganzes Konto jederzeit löschen.",
      q6: "Funktioniert das auch mit englischsprachigem Material?",
      a6: "Ja. Die Sprache der Oberfläche und die Sprache deiner Unterlagen sind unabhängig voneinander.",
    },

    ctaTitle: "Fang mit einer Klausur an",
    ctaBody: "Lade eine Datei hoch und sieh, was Studilly daraus macht.",

    footerProduct: "Produkt",
    footerLegal: "Rechtliches",
    footerPrivacy: "Datenschutz",
    footerTerms: "AGB",
    footerImprint: "Impressum",
    footerCopyright: (year: number) => `${year} Studilly`,
  },

  legal: {
    privacyTitle: "Datenschutzerklärung",
    termsTitle: "Allgemeine Geschäftsbedingungen",
    imprintTitle: "Impressum",
    lastUpdated: (date: string) => `Stand: ${date}`,
    placeholderNoticeTitle: "Diese Fassung ist unvollständig",
    placeholderNoticeBody:
      "Die mit [PLATZHALTER] markierten Angaben müssen vom Betreiber ergänzt werden. Vor dem Produktivbetrieb ist eine rechtliche Prüfung erforderlich. Dieser Text ist keine Rechtsberatung.",
  },

  a11y: {
    mainNavigation: "Hauptnavigation",
    userMenu: "Benutzermenü",
    breadcrumb: "Brotkrumenpfad",
    progress: "Fortschritt",
    loadingContent: "Inhalt wird geladen",
    required: "erforderlich",
    externalLink: "Öffnet in neuem Tab",
    sortBy: "Sortieren nach",
    filterBy: "Filtern nach",
    currentPage: "Aktuelle Seite",
    taskStatus: (label: string, status: string) => `${label}, ${status}`,
  },
};

/**
 * The dictionary shape.
 *
 * Deliberately NOT `as const`: literal types would make every English string a
 * type error against its German counterpart. Widening to `string` keeps the
 * structure enforced (a missing or misnamed key still fails the build) while
 * letting each locale supply its own text.
 */
export type Dictionary = typeof de;
