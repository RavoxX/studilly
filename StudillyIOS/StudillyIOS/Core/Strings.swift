import Foundation

/// The app's copy, in the same shape as the web app's dictionaries.
///
/// Studilly is a German product with an English interface option, and the two
/// are independent of the language of a student's material. The device locale
/// picks the interface language; nothing here touches content.
///
/// A struct rather than a string catalogue on purpose: the web app keeps its
/// copy in typed dictionaries, and matching that means a phrase can be changed
/// in both places by searching for the same key.
enum L {
    static var isGerman: Bool {
        (Locale.preferredLanguages.first ?? "de").hasPrefix("de")
    }

    static func pick(_ de: String, _ en: String) -> String { isGerman ? de : en }

    enum common {
        static var next: String { pick("Weiter", "Next") }
        static var back: String { pick("Zurück", "Back") }
        static var cancel: String { pick("Abbrechen", "Cancel") }
        static var save: String { pick("Speichern", "Save") }
        static var retry: String { pick("Erneut versuchen", "Try again") }
        static var optional: String { pick("Optional", "Optional") }
        static var none: String { pick("Keine Angabe", "Not set") }
        static var skip: String { pick("Überspringen", "Skip") }
        static var done: String { pick("Fertig", "Done") }
        static var loading: String { pick("Wird geladen", "Loading") }
        static var delete: String { pick("Löschen", "Delete") }
    }

    enum errors {
        static var generic: String {
            pick("Etwas ist schiefgelaufen. Versuche es noch einmal.",
                 "Something went wrong. Please try again.")
        }
        static var network: String {
            pick("Keine Verbindung zu Studilly. Prüfe deine Internetverbindung.",
                 "Could not reach Studilly. Check your connection.")
        }
        static var invalidInput: String {
            pick("Bitte prüfe deine Eingaben.", "Please check your entries.")
        }
        static var invalidCredentials: String {
            pick("E-Mail-Adresse oder Passwort stimmen nicht.",
                 "That email address or password is not right.")
        }
        static var emailInUse: String {
            pick("Für diese E-Mail-Adresse gibt es schon ein Konto.",
                 "An account with this email address already exists.")
        }
        static var weakPassword: String {
            pick("Das Passwort muss mindestens 8 Zeichen haben.",
                 "The password needs at least 8 characters.")
        }
    }

    enum onboarding {
        static var welcomeTitle: String { pick("Willkommen bei Studilly", "Welcome to Studilly") }
        static var welcomeBody: String {
            pick("Übe mit Klausuren, die deiner echten Prüfung entsprechen. Studilly macht aus deinen Unterlagen realistische Übungsklausuren, korrigiert sie und zeigt dir, woran du arbeiten musst.",
                 "Practise with exams that match the real thing. Studilly turns your own documents into realistic practice exams, marks them, and shows you what to work on.")
        }
        static var welcomeStart: String { pick("Los geht's", "Get started") }
        static var welcomeSignIn: String { pick("Ich habe schon ein Konto", "I already have an account") }

        static var title: String { pick("Kurz einrichten", "Quick setup") }
        static func stepOf(_ step: Int, _ total: Int) -> String {
            pick("Schritt \(step) von \(total)", "Step \(step) of \(total)")
        }
        static var intro: String {
            pick("Studilly erstellt Klausuren, die zu deinem Bundesland, deiner Schulform und deiner Klassenstufe passen. Dafür brauchen wir vier Angaben.",
                 "Studilly writes exams that match your federal state, your school type and your year group. We need four things for that.")
        }
        static var whyTitle: String { pick("Warum wir das fragen", "Why we ask") }
        static var whyBody: String {
            pick("Prüfungen unterscheiden sich zwischen den Bundesländern deutlich: Aufgabenformate, Operatoren und Bewertung sind nicht überall gleich. Ohne diese Angaben könnten wir nur allgemeine Aufgaben erzeugen statt realistischer Klausuren. Du kannst alles später in den Einstellungen ändern.",
                 "Exams differ a lot between federal states: task formats, operators and marking are not the same everywhere. Without this we could only produce generic questions instead of realistic exams. You can change all of it later in Settings.")
        }
        static var step1Title: String { pick("Wie heißt du?", "What should we call you?") }
        static var step2Title: String { pick("Wo gehst du zur Schule?", "Where do you go to school?") }
        static var step4Title: String { pick("Welche Fächer?", "Which subjects?") }
        static var step5Title: String { pick("Steht eine Prüfung an?", "Do you have an exam coming up?") }
        static var step5Subtitle: String {
            pick("Optional. Mit einem Termin erstellt Studilly dir einen Lernplan, der bis dahin trägt.",
                 "Optional. With a date, Studilly builds a study plan that runs up to it.")
        }
        static var displayName: String { pick("Anzeigename", "Display name") }
        static var displayNameHint: String {
            pick("Nur dein Vorname reicht. So sprechen wir dich an.",
                 "Your first name is enough. This is how we address you.")
        }
        static var bundesland: String { pick("Bundesland", "Federal state") }
        static var bundeslandPlaceholder: String { pick("Bundesland wählen", "Choose a state") }
        static var schoolType: String { pick("Schulform", "School type") }
        static var schoolTypePlaceholder: String { pick("Schulform wählen", "Choose a school type") }
        static var schoolTypeNote: String {
            pick("Angezeigt werden nur die Schulformen, die es in deinem Bundesland tatsächlich gibt.",
                 "Only the school types that actually exist in your state are shown.")
        }
        static var grade: String { pick("Klassenstufe", "Year group") }
        static var stage: String { pick("Schulstufe", "School stage") }
        static var stageSek1: String { pick("Sekundarstufe I", "Lower secondary") }
        static var stageSek2: String { pick("Sekundarstufe II (Oberstufe)", "Upper secondary") }
        static var phase: String { pick("Phase der Oberstufe", "Upper secondary phase") }
        static var phaseEinfuehrung: String { pick("Einführungsphase", "Introductory phase") }
        static var phaseQualifikation: String { pick("Qualifikationsphase", "Qualification phase") }
        static var subjectsHint: String {
            pick("Wähle die Fächer, für die du üben willst. Weitere kannst du jederzeit ergänzen.",
                 "Pick the subjects you want to practise. You can add more at any time.")
        }
        static var priorityHint: String {
            pick("Markiere Schwerpunkte mit einem Stern.", "Star the ones you want to focus on.")
        }
        static var examDate: String { pick("Prüfungstermin", "Exam date") }
        static var examSubject: String { pick("Fach", "Subject") }
        static var finish: String { pick("Einrichtung abschließen", "Finish setup") }
        static var almostDone: String { pick("Fast geschafft", "Almost there") }
        static var createAccountTitle: String { pick("Konto erstellen", "Create your account") }
        static var createAccountBody: String {
            pick("Deine Angaben werden mit deinem neuen Konto gespeichert.",
                 "Your answers are saved with your new account.")
        }
    }

    enum auth {
        static var loginTitle: String { pick("Anmelden", "Sign in") }
        static var loginSubtitle: String { pick("Melde dich an, um weiterzulernen.", "Sign in to keep studying.") }
        static var registerTitle: String { pick("Konto erstellen", "Create an account") }
        static var email: String { pick("E-Mail", "Email") }
        static var password: String { pick("Passwort", "Password") }
        static var passwordHint: String { pick("Mindestens 8 Zeichen.", "At least 8 characters.") }
        static var login: String { pick("Anmelden", "Sign in") }
        static var register: String { pick("Konto erstellen", "Create account") }
        static var forgotPassword: String { pick("Passwort vergessen?", "Forgot your password?") }
        static var noAccount: String { pick("Noch kein Konto?", "No account yet?") }
        static var haveAccount: String { pick("Schon ein Konto?", "Already have an account?") }
        static var confirmEmailTitle: String { pick("Bestätige deine E-Mail-Adresse", "Confirm your email") }
        static func confirmEmailBody(_ email: String) -> String {
            pick("Wir haben dir eine E-Mail an \(email) geschickt. Öffne den Link darin, dann kann es losgehen.",
                 "We sent an email to \(email). Open the link in it and you are ready to go.")
        }
        static var signOut: String { pick("Abmelden", "Sign out") }
        static var legalNote: String {
            pick("Mit dem Erstellen eines Kontos stimmst du den AGB und der Datenschutzerklärung zu.",
                 "By creating an account you agree to the terms and the privacy policy.")
        }
    }

    enum dashboard {
        static var title: String { pick("Übersicht", "Dashboard") }
        static func greeting(_ name: String) -> String {
            pick("Hallo, \(name)", "Hello, \(name)")
        }
        static var recentExams: String { pick("Letzte Klausuren", "Recent exams") }
        static var usage: String { pick("Verbrauch diesen Monat", "Usage this month") }
        static var noExamsTitle: String { pick("Noch keine Klausur", "No exams yet") }
        static var noExamsBody: String {
            pick("Lade deine Unterlagen hoch und erstelle daraus deine erste Übungsklausur.",
                 "Upload your documents and create your first practice exam from them.")
        }
    }

    enum exams {
        static var title: String { pick("Klausuren", "Exams") }
        static var result: String { pick("Ergebnis", "Result") }
        static var points: String { pick("Punkte", "Points") }
        static var percentage: String { pick("Prozent", "Percent") }
        static var duration: String { pick("Bearbeitungszeit", "Time taken") }
        static var gradePoints: String { pick("Notenpunkte", "Points on the 15-point scale") }
        static var taskByTask: String { pick("Aufgabe für Aufgabe", "Task by task") }
        static var yourAnswer: String { pick("Deine Antwort", "Your answer") }
        static var erwartungshorizont: String { pick("Erwartungshorizont", "Marking scheme") }
        static var improvement: String { pick("So holst du die Punkte", "How to get those points") }
        static var summary: String { pick("Zusammenfassung", "Summary") }
        static var strengths: String { pick("Das lief gut", "What went well") }
        static var weaknesses: String { pick("Daran solltest du arbeiten", "What to work on") }
        static var notGraded: String { pick("Noch nicht korrigiert", "Not marked yet") }
        static var noAttempt: String { pick("Noch nicht geschrieben", "Not written yet") }
        static var noResultsTitle: String { pick("Keine Klausuren", "No exams") }
        static var noResultsBody: String {
            pick("Erstelle deine erste Übungsklausur aus deinen Unterlagen.",
                 "Create your first practice exam from your documents.")
        }

        static var newTitle: String { pick("Neue Klausur", "New exam") }
        static var create: String { pick("Klausur erstellen", "Create exam") }
        static var subject: String { pick("Fach", "Subject") }
        static var subjectPlaceholder: String { pick("Fach wählen", "Choose a subject") }
        static var materials: String { pick("Unterlagen", "Documents") }
        static var noMaterials: String { pick("Keine Unterlagen bereit", "No documents ready") }
        static var noMaterialsBody: String {
            pick("Lade zuerst etwas unter Materialien hoch. Sobald es gelesen ist, kannst du daraus eine Klausur erstellen.",
                 "Upload something under Materials first. Once it has been read you can build an exam from it.")
        }
        static var difficulty: String { pick("Schwierigkeit", "Difficulty") }
        static var easy: String { pick("Einfach", "Easy") }
        static var standard: String { pick("Standard", "Standard") }
        static var hard: String { pick("Anspruchsvoll", "Demanding") }
        static var timeAllowed: String { pick("Bearbeitungszeit", "Time allowed") }
        static var taskCount: String { pick("Aufgaben", "Tasks") }
        static var generating: String { pick("Deine Klausur entsteht", "Writing your exam") }
        static var generatingNote: String {
            pick("Das dauert etwa eine halbe Minute. Du kannst den Bildschirm anlassen.",
                 "This takes about half a minute. You can leave the screen open.")
        }
        static var stageReading: String { pick("Unterlagen werden gelesen", "Reading your documents") }
        static var stageDrafting: String { pick("Aufgaben werden geschrieben", "Writing the tasks") }
        static var stageMarking: String { pick("Erwartungshorizont wird erstellt", "Building the marking scheme") }

        static var start: String { pick("Klausur schreiben", "Write the exam") }
        static var resume: String { pick("Weiterschreiben", "Continue writing") }
        static var preparing: String { pick("Klausur wird vorbereitet", "Preparing the exam") }
        static var leave: String { pick("Verlassen", "Leave") }
        static var leaveTitle: String { pick("Klausur verlassen?", "Leave the exam?") }
        static var leaveBody: String {
            pick("Deine Antworten sind gespeichert. Du kannst später weiterschreiben.",
                 "Your answers are saved. You can carry on later.")
        }
        static var leaveConfirm: String { pick("Verlassen", "Leave") }
        static var submit: String { pick("Abgeben", "Hand in") }
        static var submitTitle: String { pick("Klausur abgeben?", "Hand in the exam?") }
        static func submitBody(_ answered: Int, _ total: Int) -> String {
            pick("Du hast \(answered) von \(total) Aufgaben bearbeitet. Nach der Abgabe kannst du nichts mehr ändern.",
                 "You have answered \(answered) of \(total) tasks. After handing in, nothing can be changed.")
        }
        static var marking: String { pick("Deine Klausur wird korrigiert", "Marking your exam") }
        static var markingReading: String { pick("Antworten werden gelesen", "Reading your answers") }
        static var markingCriteria: String { pick("Kriterien werden geprüft", "Checking each criterion") }
        static var markingGrade: String { pick("Note wird berechnet", "Working out the grade") }
    }

    enum materials {
        static var title: String { pick("Materialien", "Materials") }
        static var pickFile: String { pick("Datei wählen", "Choose a file") }
        static var pickPhoto: String { pick("Foto wählen", "Choose a photo") }
        static var uploading: String { pick("Wird hochgeladen", "Uploading") }
        static var emptyTitle: String { pick("Noch keine Unterlagen", "No documents yet") }
        static var emptyBody: String {
            pick("Lade Hefteinträge, Arbeitsblätter oder Fotos deiner Notizen hoch. Studilly liest sie und erkennt die Themen.",
                 "Upload your notes, worksheets or photos of what you wrote. Studilly reads them and works out the topics.")
        }
    }

    enum practice {
        static var title: String { pick("Üben", "Practice") }
        static var focusAreas: String { pick("Deine Schwerpunkte", "Your focus areas") }
        static var sets: String { pick("Übungssets", "Practice sets") }
        static var practise: String { pick("Üben", "Practise") }
        static var check: String { pick("Antwort prüfen", "Check answer") }
        static var createSet: String { pick("Neues Übungsset", "New practice set") }
        static var done: String { pick("Erledigt", "Done") }
        static func questionOf(_ index: Int, _ total: Int) -> String {
            pick("Frage \(index) von \(total)", "Question \(index) of \(total)")
        }
        static var emptyTitle: String { pick("Noch keine Übungen", "No practice yet") }
        static var emptyBody: String {
            pick("Erstelle ein Set zu einem deiner Schwerpunkte.",
                 "Create a set for one of your focus areas.")
        }
        static var emptyBodyNoWeakness: String {
            pick("Schreibe zuerst eine Klausur. Aus der Korrektur entstehen die Übungen.",
                 "Write an exam first. The marking is what the practice is built from.")
        }
    }

    enum plan {
        static var cancelTitle: String { pick("Abo kündigen?", "Cancel your plan?") }
        static func cancelBody(_ date: String) -> String {
            pick("Dein Tarif bleibt bis zum \(date) vollständig aktiv. Danach wechselst du automatisch zu Free.",
                 "Your plan stays fully active until \(date). After that you move to Free automatically.")
        }
        static var cancel: String { pick("Abo kündigen", "Cancel plan") }
        static var resume: String { pick("Kündigung zurücknehmen", "Undo cancellation") }
        static var cancelled: String { pick("Gekündigt", "Cancelled") }
        static var cancelledNotice: String {
            pick("Gekündigt. Bis zum Ende der Laufzeit bleibt alles unverändert.",
                 "Cancelled. Everything stays as it is until the period ends.")
        }
        static var resumedNotice: String { pick("Dein Abo läuft weiter.", "Your plan continues.") }
        static var portal: String { pick("Abo-Verwaltung", "Manage plan") }
        static var manage: String { pick("Tarif und Verbrauch", "Plan and usage") }
        static func renewsOn(_ date: String) -> String {
            pick("Verlängert sich am \(date)", "Renews on \(date)")
        }
        static func endsOn(_ date: String) -> String { pick("Läuft am \(date) aus", "Ends on \(date)") }
        static var upgradeNote: String {
            pick("Der kostenlose Tarif reicht, um Studilly ernsthaft zu testen. Ein Upgrade läuft über die Kasse des Stores.",
                 "The free plan is enough to try Studilly properly. Upgrading goes through the store's checkout.")
        }
    }

    enum settings {
        static var title: String { pick("Einstellungen", "Settings") }
        static var account: String { pick("Konto", "Account") }
        static var education: String { pick("Schule", "School") }
        static var subscription: String { pick("Abo", "Plan") }
        static var legal: String { pick("Rechtliches", "Legal") }
        static var privacy: String { pick("Datenschutz", "Privacy") }
        static var terms: String { pick("AGB", "Terms") }
        static var imprint: String { pick("Impressum", "Imprint") }
        static var signOutConfirm: String { pick("Wirklich abmelden?", "Sign out?") }
        static var saved: String { pick("Gespeichert", "Saved") }
    }

    enum plans {
        static var free: String { "Studilly Free" }
        static var pro: String { "Studilly Pro" }
        static var ultra: String { "Studilly Ultra" }
        static var managePlanNote: String {
            pick("Dein Tarif wird im Browser verwaltet.", "Your plan is managed in the browser.")
        }
    }

    enum usage {
        static func metric(_ key: String) -> String {
            switch key {
            case "practice_exams": return pick("Übungsklausuren", "Practice exams")
            case "gradings": return pick("Korrekturen", "Markings")
            case "practice_sets": return pick("Übungssets", "Practice sets")
            case "flashcard_sets": return pick("Karteikartensätze", "Flashcard sets")
            case "uploads": return pick("Uploads", "Uploads")
            case "material_analyses": return pick("Materialanalysen", "Material analyses")
            case "study_plans": return pick("Lernpläne", "Study plans")
            default: return key
            }
        }
    }

    enum subjectCategory {
        static func label(_ key: String) -> String {
            switch key {
            case "sprachen": return pick("Sprachen", "Languages")
            case "mint": return pick("MINT", "STEM")
            case "gesellschaft": return pick("Gesellschaft", "Social sciences")
            case "kunst_musik": return pick("Kunst und Musik", "Arts")
            case "sonstige": return pick("Weitere", "Other")
            default: return key
            }
        }
    }
}
