import Foundation

/// The rows the app reads, named as the database names them.
///
/// Keys are snake_case because PostgREST returns the column names; mapping
/// them here rather than through a global key strategy keeps the mapping
/// visible next to the field it belongs to.

struct Profile: Codable, Equatable, Sendable {
    let id: String
    var displayName: String
    var onboardingCompletedAt: Date?
    var theme: String?

    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case onboardingCompletedAt = "onboarding_completed_at"
        case theme
    }
}

struct EducationProfile: Codable, Equatable, Sendable {
    var bundesland: String
    var stage: EducationStage
    var schoolType: String
    var grade: Int
    var oberstufePhase: String?

    enum CodingKeys: String, CodingKey {
        case bundesland, stage, grade
        case schoolType = "school_type"
        case oberstufePhase = "oberstufe_phase"
    }

    var stateName: String {
        guard let state = Education.state(bundesland) else { return bundesland }
        return L.isGerman ? state.nameDe : state.nameEn
    }

    var schoolTypeName: String {
        guard let label = Education.schoolTypeLabels[schoolType] else { return schoolType }
        return L.isGerman ? label.de : label.en
    }
}

struct Subject: Codable, Hashable, Identifiable, Sendable {
    let id: String
    let key: String
    let nameDe: String
    let nameEn: String
    let category: String
    let position: Int

    enum CodingKeys: String, CodingKey {
        case id, key, category, position
        case nameDe = "name_de"
        case nameEn = "name_en"
    }

    var name: String { L.isGerman ? nameDe : nameEn }
}

struct ExamSummary: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let title: String
    let status: String
    let totalPoints: Double?
    let createdAt: Date
    let durationMinutes: Int
    let subjectID: String?

    enum CodingKeys: String, CodingKey {
        case id, title, status
        case totalPoints = "total_points"
        case createdAt = "created_at"
        case durationMinutes = "duration_minutes"
        case subjectID = "subject_id"
    }
}

struct AttemptSummary: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let examID: String
    let status: String
    let pointsAwarded: Double?
    let pointsPossible: Double?
    let percentage: Double?
    let gradeValue: Double?
    let gradeLabel: String?
    let timeSpentSeconds: Int
    let submittedAt: Date?
    let feedbackSummary: FeedbackSummary?

    enum CodingKeys: String, CodingKey {
        case id, status, percentage
        case examID = "exam_id"
        case pointsAwarded = "points_awarded"
        case pointsPossible = "points_possible"
        case gradeValue = "grade_value"
        case gradeLabel = "grade_label"
        case timeSpentSeconds = "time_spent_seconds"
        case submittedAt = "submitted_at"
        case feedbackSummary = "feedback_summary"
    }

    var isGraded: Bool { status == "graded" }
}

struct FeedbackSummary: Codable, Equatable, Sendable {
    let summary: String?
    let strengths: [String]?
    let weaknesses: [String]?
}

struct ExamTask: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let label: String
    let prompt: String
    let operatorName: String?
    let afb: String?
    let points: Double
    let position: Int

    enum CodingKeys: String, CodingKey {
        case id, label, prompt, afb, points, position
        case operatorName = "operator"
    }
}

struct AnswerEvaluation: Codable, Equatable, Sendable {
    let taskID: String
    let pointsAwarded: Double
    let pointsPossible: Double
    let verdict: String
    let criteriaResults: [CriterionResult]?
    let improvement: String?

    enum CodingKeys: String, CodingKey {
        case taskID = "task_id"
        case pointsAwarded = "points_awarded"
        case pointsPossible = "points_possible"
        case verdict
        case criteriaResults = "criteria_results"
        case improvement
    }

    var tone: Tone {
        switch verdict {
        case "correct", "exceptional": .success
        case "partially_correct", "correct_incomplete": .warning
        default: .danger
        }
    }

    var verdictLabel: String {
        switch verdict {
        case "correct": L.pick("Korrekt", "Correct")
        case "exceptional": L.pick("Herausragend", "Exceptional")
        case "partially_correct": L.pick("Teilweise korrekt", "Partly correct")
        case "correct_incomplete": L.pick("Korrekt, aber unvollständig", "Correct but incomplete")
        default: L.pick("Nicht korrekt", "Incorrect")
        }
    }
}

struct CriterionResult: Codable, Equatable, Sendable {
    let criterion: String?
    let met: Bool
    let pointsAwarded: Double
    let pointsPossible: Double
    let note: String?

    enum CodingKeys: String, CodingKey {
        case criterion, met, note
        case pointsAwarded = "points_awarded"
        case pointsPossible = "points_possible"
    }
}

struct ExamAnswer: Codable, Equatable, Sendable {
    let taskID: String
    let answerText: String

    enum CodingKeys: String, CodingKey {
        case taskID = "task_id"
        case answerText = "answer_text"
    }
}

struct Subscription: Codable, Equatable, Sendable {
    let plan: String
    let status: String
    let currentPeriodEnd: Date?
    let autoRenew: Bool?

    enum CodingKeys: String, CodingKey {
        case plan, status
        case currentPeriodEnd = "current_period_end"
        case autoRenew = "auto_renew"
    }

    var planName: String {
        switch plan {
        case "pro": L.plans.pro
        case "ultra": L.plans.ultra
        default: L.plans.free
        }
    }

    /// Monthly allowances, mirroring config/plans.ts. Kept here so the app can
    /// show a used-of-total figure without another round trip; the server is
    /// still the only thing that enforces them.
    var examLimit: Int {
        switch plan {
        case "pro": 25
        case "ultra": 50
        default: 3
        }
    }
}

struct UsageRecord: Codable, Equatable, Sendable {
    let metric: String
    let used: Int
}


struct Material: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let title: String
    let filename: String
    let status: String
    let sizeBytes: Int
    let createdAt: Date
    let subjectID: String?
    let errorMessage: String?

    enum CodingKeys: String, CodingKey {
        case id, title, status
        case filename = "original_filename"
        case sizeBytes = "size_bytes"
        case createdAt = "created_at"
        case subjectID = "subject_id"
        case errorMessage = "error_message"
    }

    var isReady: Bool { status == "ready" }
    var isFailed: Bool { status == "failed" }

    var statusLabel: String {
        switch status {
        case "uploaded": L.pick("Hochgeladen", "Uploaded")
        case "extracting": L.pick("Wird gelesen", "Reading")
        case "analyzing": L.pick("Wird ausgewertet", "Analysing")
        case "ready": L.pick("Bereit", "Ready")
        default: L.pick("Fehlgeschlagen", "Failed")
        }
    }

    var statusTone: Tone {
        switch status {
        case "ready": .success
        case "failed": .danger
        default: .warning
        }
    }

    var sizeLabel: String {
        ByteCountFormatter.string(fromByteCount: Int64(sizeBytes), countStyle: .file)
    }
}

struct PracticeSet: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let title: String
    let status: String
    let topicLabel: String?
    let createdAt: Date
    let completedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, title, status
        case topicLabel = "topic_label"
        case createdAt = "created_at"
        case completedAt = "completed_at"
    }

    var isDone: Bool { completedAt != nil }
}

struct PracticeQuestion: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let prompt: String
    let operatorName: String?
    let afb: String?
    let points: Double
    let position: Int

    enum CodingKeys: String, CodingKey {
        case id, prompt, afb, points, position
        case operatorName = "operator"
    }
}

struct Weakness: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let topicLabel: String
    let severity: Double
    let trend: String
    let dimension: String
    let operatorName: String?

    enum CodingKeys: String, CodingKey {
        case id, severity, trend, dimension
        case topicLabel = "topic_label"
        case operatorName = "operator"
    }

    /// Worse first: a list of things to work on is useless in insertion order.
    var tone: Tone { severity >= 0.66 ? .danger : severity >= 0.33 ? .warning : .neutral }

    var trendLabel: String {
        switch trend {
        case "improving": L.pick("Wird besser", "Improving")
        case "worsening": L.pick("Wird schlechter", "Getting worse")
        default: L.pick("Unverändert", "Steady")
        }
    }

    var trendIcon: String {
        switch trend {
        case "improving": "arrow.down.right"
        case "worsening": "arrow.up.right"
        default: "arrow.right"
        }
    }
}
