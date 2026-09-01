import Foundation

/// Every read and write the app makes, in one place.
///
/// Each function is a single PostgREST call. Filtering is done by the database
/// and constrained by row-level security, so a query that forgot its user
/// filter still cannot return another student's rows: the app asks, the policy
/// decides.
enum StudillyAPI {

    // MARK: - Profile

    static func profile(token: String, userID: String) async throws -> Profile {
        let request = Supabase.dataRequest(
            "/profiles",
            query: [
                .init(name: "select", value: "id,display_name,onboarding_completed_at,theme"),
                .init(name: "id", value: "eq.\(userID)"),
                .init(name: "limit", value: "1"),
            ],
            token: token
        )
        let rows = try await HTTP.send(request, as: [Profile].self)
        guard let profile = rows.first else { throw APIError.notFound }
        return profile
    }

    static func educationProfile(token: String, userID: String) async throws -> EducationProfile? {
        let request = Supabase.dataRequest(
            "/education_profiles",
            query: [
                .init(name: "select", value: "bundesland,stage,school_type,grade,oberstufe_phase"),
                .init(name: "user_id", value: "eq.\(userID)"),
                .init(name: "limit", value: "1"),
            ],
            token: token
        )
        return try await HTTP.send(request, as: [EducationProfile].self).first
    }

    // MARK: - Subjects

    static func subjects(token: String) async throws -> [Subject] {
        let request = Supabase.dataRequest(
            "/subjects",
            query: [
                .init(name: "select", value: "id,key,name_de,name_en,category,position"),
                .init(name: "order", value: "position.asc"),
            ],
            token: token
        )
        return try await HTTP.send(request, as: [Subject].self)
    }

    // MARK: - Onboarding

    /// Writes everything the setup collected, then marks the profile complete.
    ///
    /// The completion stamp is written last on purpose: if any earlier write
    /// fails, the student lands back in setup with their answers rather than
    /// in an app with half a profile.
    static func completeOnboarding(
        token: String,
        userID: String,
        displayName: String,
        bundesland: String,
        stage: EducationStage,
        schoolType: String,
        grade: Int,
        oberstufePhase: String?,
        subjectIDs: [String],
        prioritySubjectIDs: [String]
    ) async throws -> (Profile, EducationProfile) {
        var education: [String: Any] = [
            "user_id": userID,
            "bundesland": bundesland,
            "stage": stage.rawValue,
            "school_type": schoolType,
            "grade": grade,
        ]
        education["oberstufe_phase"] = oberstufePhase ?? NSNull()

        try await HTTP.send(Supabase.dataRequest(
            "/education_profiles",
            query: [.init(name: "on_conflict", value: "user_id")],
            method: "POST",
            token: token,
            body: try JSONSerialization.data(withJSONObject: [education]),
            prefer: "resolution=merge-duplicates,return=minimal"
        ))

        if !subjectIDs.isEmpty {
            let rows = subjectIDs.map { id in
                [
                    "user_id": userID,
                    "subject_id": id,
                    "is_priority": prioritySubjectIDs.contains(id),
                ] as [String: Any]
            }
            try await HTTP.send(Supabase.dataRequest(
                "/user_subjects",
                query: [.init(name: "on_conflict", value: "user_id,subject_id")],
                method: "POST",
                token: token,
                body: try JSONSerialization.data(withJSONObject: rows),
                prefer: "resolution=merge-duplicates,return=minimal"
            ))
        }

        let stamp = ISO8601DateFormatter.studilly.string(from: Date())
        let updated = try await HTTP.send(
            Supabase.dataRequest(
                "/profiles",
                query: [.init(name: "id", value: "eq.\(userID)")],
                method: "PATCH",
                token: token,
                body: try JSONSerialization.data(withJSONObject: [
                    "display_name": displayName,
                    "onboarding_completed_at": stamp,
                ]),
                prefer: "return=representation"
            ),
            as: [Profile].self
        )

        guard let profile = updated.first else { throw APIError.server(nil) }
        let educationProfile = EducationProfile(
            bundesland: bundesland, stage: stage, schoolType: schoolType,
            grade: grade, oberstufePhase: oberstufePhase
        )
        return (profile, educationProfile)
    }

    static func updateDisplayName(token: String, userID: String, name: String) async throws -> Profile {
        let rows = try await HTTP.send(
            Supabase.dataRequest(
                "/profiles",
                query: [.init(name: "id", value: "eq.\(userID)")],
                method: "PATCH",
                token: token,
                body: try JSONSerialization.data(withJSONObject: ["display_name": name]),
                prefer: "return=representation"
            ),
            as: [Profile].self
        )
        guard let profile = rows.first else { throw APIError.server(nil) }
        return profile
    }

    // MARK: - Exams

    static func exams(token: String, limit: Int = 50) async throws -> [ExamSummary] {
        let request = Supabase.dataRequest(
            "/exams",
            query: [
                .init(name: "select", value: "id,title,status,total_points,created_at,duration_minutes"),
                .init(name: "order", value: "created_at.desc"),
                .init(name: "limit", value: String(limit)),
            ],
            token: token
        )
        return try await HTTP.send(request, as: [ExamSummary].self)
    }

    static func attempts(token: String, limit: Int = 100) async throws -> [AttemptSummary] {
        let request = Supabase.dataRequest(
            "/exam_attempts",
            query: [
                .init(name: "select", value: "id,exam_id,status,points_awarded,points_possible,percentage,grade_value,grade_label,time_spent_seconds,submitted_at,feedback_summary"),
                .init(name: "order", value: "created_at.desc"),
                .init(name: "limit", value: String(limit)),
            ],
            token: token
        )
        return try await HTTP.send(request, as: [AttemptSummary].self)
    }

    static func tasks(token: String, examID: String) async throws -> [ExamTask] {
        let request = Supabase.dataRequest(
            "/exam_tasks",
            query: [
                .init(name: "select", value: "id,label,prompt,operator,afb,points,position"),
                .init(name: "exam_id", value: "eq.\(examID)"),
                .init(name: "order", value: "position.asc"),
            ],
            token: token
        )
        return try await HTTP.send(request, as: [ExamTask].self)
    }

    static func evaluations(token: String, attemptID: String) async throws -> [AnswerEvaluation] {
        let request = Supabase.dataRequest(
            "/answer_evaluations",
            query: [
                .init(name: "select", value: "task_id,points_awarded,points_possible,verdict,criteria_results,improvement"),
                .init(name: "attempt_id", value: "eq.\(attemptID)"),
            ],
            token: token
        )
        return try await HTTP.send(request, as: [AnswerEvaluation].self)
    }

    static func answers(token: String, attemptID: String) async throws -> [ExamAnswer] {
        let request = Supabase.dataRequest(
            "/exam_answers",
            query: [
                .init(name: "select", value: "task_id,answer_text"),
                .init(name: "attempt_id", value: "eq.\(attemptID)"),
            ],
            token: token
        )
        return try await HTTP.send(request, as: [ExamAnswer].self)
    }

    // MARK: - Plan

    static func subscription(token: String, userID: String) async throws -> Subscription? {
        let request = Supabase.dataRequest(
            "/subscriptions",
            query: [
                .init(name: "select", value: "plan,status,current_period_end,auto_renew"),
                .init(name: "user_id", value: "eq.\(userID)"),
                .init(name: "limit", value: "1"),
            ],
            token: token
        )
        return try await HTTP.send(request, as: [Subscription].self).first
    }

    static func usage(token: String, userID: String) async throws -> [UsageRecord] {
        let start = Calendar(identifier: .gregorian).dateComponents([.year, .month], from: Date())
        var components = DateComponents()
        components.year = start.year
        components.month = start.month
        components.day = 1
        let periodStart = Calendar(identifier: .gregorian).date(from: components) ?? Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "UTC")

        let request = Supabase.dataRequest(
            "/usage_records",
            query: [
                .init(name: "select", value: "metric,used"),
                .init(name: "user_id", value: "eq.\(userID)"),
                .init(name: "period_start", value: "eq.\(formatter.string(from: periodStart))"),
            ],
            token: token
        )
        return try await HTTP.send(request, as: [UsageRecord].self)
    }
}
