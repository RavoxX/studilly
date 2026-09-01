// Generated from src/config/education.ts. Do not edit by hand: run
// `npx tsx .gen-swift.ts` in the web project to regenerate, so the app and the
// web app can never disagree about which school types exist in which state.

import Foundation

enum EducationStage: String, Codable, CaseIterable, Sendable {
    case sek1 = "sek_1"
    case sek2 = "sek_2"
}

struct StateProfile: Sendable {
    let code: String
    let nameDe: String
    let nameEn: String
    let sekITypes: [String]
    let sekIGrades: ClosedRange<Int>
    let sekIIGrades: ClosedRange<Int>
}

enum Education {
    static let schoolTypeLabels: [String: (de: String, en: String)] = [
        "gymnasium": (de: "Gymnasium", en: "Gymnasium"),
        "realschule": (de: "Realschule", en: "Realschule"),
        "hauptschule": (de: "Hauptschule", en: "Hauptschule"),
        "werkrealschule": (de: "Werkreal-/Hauptschule", en: "Werkreal-/Hauptschule"),
        "gesamtschule": (de: "Gesamtschule", en: "Gesamtschule (comprehensive)"),
        "oberschule": (de: "Oberschule", en: "Oberschule"),
        "mittelschule": (de: "Mittelschule", en: "Mittelschule"),
        "stadtteilschule": (de: "Stadtteilschule", en: "Stadtteilschule"),
        "sekundarschule": (de: "Sekundarschule", en: "Sekundarschule"),
        "gemeinschaftsschule": (de: "Gemeinschaftsschule", en: "Gemeinschaftsschule"),
        "regionale_schule": (de: "Regionale Schule", en: "Regionale Schule"),
        "regelschule": (de: "Regelschule", en: "Regelschule"),
        "realschule_plus": (de: "Realschule plus", en: "Realschule plus"),
        "integrierte_sekundarschule": (de: "Integrierte Sekundarschule", en: "Integrierte Sekundarschule"),
        "mittelstufenschule": (de: "Mittelstufenschule", en: "Mittelstufenschule"),
        "wirtschaftsschule": (de: "Wirtschaftsschule", en: "Wirtschaftsschule"),
        "berufliches_gymnasium": (de: "Berufliches Gymnasium", en: "Berufliches Gymnasium"),
    ]

    static let states: [StateProfile] = [
        StateProfile(
            code: "BW",
            nameDe: "Baden-Württemberg",
            nameEn: "Baden-Württemberg",
            sekITypes: ["gymnasium", "realschule", "werkrealschule", "gemeinschaftsschule"],
            sekIGrades: 5...10,
            sekIIGrades: 10...13
        ),
        StateProfile(
            code: "BY",
            nameDe: "Bayern",
            nameEn: "Bavaria",
            sekITypes: ["gymnasium", "realschule", "mittelschule", "wirtschaftsschule"],
            sekIGrades: 5...10,
            sekIIGrades: 11...13
        ),
        StateProfile(
            code: "BE",
            nameDe: "Berlin",
            nameEn: "Berlin",
            sekITypes: ["gymnasium", "integrierte_sekundarschule", "gemeinschaftsschule"],
            sekIGrades: 7...10,
            sekIIGrades: 11...13
        ),
        StateProfile(
            code: "BB",
            nameDe: "Brandenburg",
            nameEn: "Brandenburg",
            sekITypes: ["gymnasium", "oberschule", "gesamtschule"],
            sekIGrades: 7...10,
            sekIIGrades: 11...13
        ),
        StateProfile(
            code: "HB",
            nameDe: "Bremen",
            nameEn: "Bremen",
            sekITypes: ["gymnasium", "oberschule"],
            sekIGrades: 5...10,
            sekIIGrades: 11...13
        ),
        StateProfile(
            code: "HH",
            nameDe: "Hamburg",
            nameEn: "Hamburg",
            sekITypes: ["gymnasium", "stadtteilschule"],
            sekIGrades: 5...10,
            sekIIGrades: 10...13
        ),
        StateProfile(
            code: "HE",
            nameDe: "Hessen",
            nameEn: "Hesse",
            sekITypes: ["gymnasium", "realschule", "hauptschule", "gesamtschule", "mittelstufenschule"],
            sekIGrades: 5...10,
            sekIIGrades: 10...13
        ),
        StateProfile(
            code: "MV",
            nameDe: "Mecklenburg-Vorpommern",
            nameEn: "Mecklenburg-Western Pomerania",
            sekITypes: ["gymnasium", "regionale_schule", "gesamtschule"],
            sekIGrades: 5...10,
            sekIIGrades: 11...12
        ),
        StateProfile(
            code: "NI",
            nameDe: "Niedersachsen",
            nameEn: "Lower Saxony",
            sekITypes: ["gymnasium", "realschule", "hauptschule", "oberschule", "gesamtschule"],
            sekIGrades: 5...10,
            sekIIGrades: 11...13
        ),
        StateProfile(
            code: "NW",
            nameDe: "Nordrhein-Westfalen",
            nameEn: "North Rhine-Westphalia",
            sekITypes: ["gymnasium", "realschule", "hauptschule", "gesamtschule", "sekundarschule"],
            sekIGrades: 5...10,
            sekIIGrades: 10...13
        ),
        StateProfile(
            code: "RP",
            nameDe: "Rheinland-Pfalz",
            nameEn: "Rhineland-Palatinate",
            sekITypes: ["gymnasium", "realschule_plus", "gesamtschule"],
            sekIGrades: 5...10,
            sekIIGrades: 11...13
        ),
        StateProfile(
            code: "SL",
            nameDe: "Saarland",
            nameEn: "Saarland",
            sekITypes: ["gymnasium", "gemeinschaftsschule"],
            sekIGrades: 5...10,
            sekIIGrades: 10...13
        ),
        StateProfile(
            code: "SN",
            nameDe: "Sachsen",
            nameEn: "Saxony",
            sekITypes: ["gymnasium", "oberschule"],
            sekIGrades: 5...10,
            sekIIGrades: 11...12
        ),
        StateProfile(
            code: "ST",
            nameDe: "Sachsen-Anhalt",
            nameEn: "Saxony-Anhalt",
            sekITypes: ["gymnasium", "sekundarschule", "gemeinschaftsschule"],
            sekIGrades: 5...10,
            sekIIGrades: 11...12
        ),
        StateProfile(
            code: "SH",
            nameDe: "Schleswig-Holstein",
            nameEn: "Schleswig-Holstein",
            sekITypes: ["gymnasium", "gemeinschaftsschule"],
            sekIGrades: 5...10,
            sekIIGrades: 10...13
        ),
        StateProfile(
            code: "TH",
            nameDe: "Thüringen",
            nameEn: "Thuringia",
            sekITypes: ["gymnasium", "regelschule", "gemeinschaftsschule"],
            sekIGrades: 5...10,
            sekIIGrades: 11...12
        ),
    ]

    static func state(_ code: String) -> StateProfile? {
        states.first { $0.code == code }
    }

    /// The school types that actually exist in a state at a given stage.
    static func schoolTypes(in code: String, stage: EducationStage) -> [String] {
        guard let profile = state(code) else { return [] }
        switch stage {
        case .sek1: return profile.sekITypes
        case .sek2: return oberstufeTypes.filter { type in
            profile.sekITypes.contains(type) || type == "berufliches_gymnasium"
        }
        }
    }

    static func grades(in code: String, stage: EducationStage) -> [Int] {
        guard let profile = state(code) else { return [] }
        let range = stage == .sek1 ? profile.sekIGrades : profile.sekIIGrades
        return Array(range)
    }

    private static let oberstufeTypes = [
        "gymnasium", "gesamtschule", "gemeinschaftsschule",
        "stadtteilschule", "berufliches_gymnasium",
    ]
}
