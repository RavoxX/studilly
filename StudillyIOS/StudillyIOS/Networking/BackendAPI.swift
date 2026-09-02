import Foundation

/// The work that has to happen on a server.
///
/// Generating an exam and marking one need model keys that must never ship in
/// an app bundle, so those calls go to the Studilly web app rather than
/// straight to the database. Everything else the app does still goes to
/// Supabase directly; this is the smaller half on purpose.
///
/// The access token travels as a bearer token. The web app verifies it with
/// Supabase, the same check the browser's cookie goes through, and takes the
/// user id from the verified token rather than from anything the app sends.
enum BackendAPI {

    private static func request(
        _ path: String,
        method: String = "POST",
        token: String,
        body: Encodable? = nil
    ) throws -> URLRequest {
        var request = URLRequest(url: Config.apiBaseURL.appending(path: path))
        request.httpMethod = method
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let body { request.httpBody = try HTTP.encoder.encode(AnyEncodable(body)) }
        // Generation and marking are model calls: they take tens of seconds,
        // and the default timeout would give up while the server is still
        // working and the student's quota has already been spent.
        request.timeoutInterval = 180
        return request
    }

    // MARK: - Exams

    struct CreateExamBody: Encodable {
        let title: String?
        let subjectId: String
        let materialIds: [String]
        let topics: [String]
        let difficulty: String
        let durationMinutes: Int
        let taskCount: Int

        // JSONEncoder leaves a nil property out of the object entirely, and
        // the API's schema wants these keys present holding null. Written by
        // hand so the null is actually sent; the synthesised encoder cannot be
        // asked for it.
        enum CodingKeys: String, CodingKey {
            case title, subjectId, materialIds, topics, difficulty, durationMinutes, taskCount
        }

        func encode(to encoder: Encoder) throws {
            var container = encoder.container(keyedBy: CodingKeys.self)
            try container.encode(title, forKey: .title)
            try container.encode(subjectId, forKey: .subjectId)
            try container.encode(materialIds, forKey: .materialIds)
            try container.encode(topics, forKey: .topics)
            try container.encode(difficulty, forKey: .difficulty)
            try container.encode(durationMinutes, forKey: .durationMinutes)
            try container.encode(taskCount, forKey: .taskCount)
        }
    }

    struct CreatedExam: Decodable { let examId: String }

    static func createExam(token: String, body: CreateExamBody) async throws -> String {
        let response = try await HTTP.send(
            try request("/api/exams", token: token, body: body),
            as: CreatedExam.self
        )
        return response.examId
    }

    struct StartedAttempt: Decodable { let attemptId: String; let resumed: Bool }

    /// Starts an attempt, or hands back the one already running. The server
    /// decides which, so two devices cannot open two attempts at the same exam.
    static func startAttempt(token: String, examID: String) async throws -> StartedAttempt {
        try await HTTP.send(
            try request("/api/exams/\(examID)/attempts", token: token),
            as: StartedAttempt.self
        )
    }

    struct SubmitBody: Encodable { let timeSpentSeconds: Int }
    struct SubmitResult: Decodable { let attemptId: String; let status: String }

    static func submitAttempt(
        token: String, attemptID: String, timeSpentSeconds: Int
    ) async throws -> SubmitResult {
        try await HTTP.send(
            try request(
                "/api/attempts/\(attemptID)/submit",
                token: token,
                body: SubmitBody(timeSpentSeconds: timeSpentSeconds)
            ),
            as: SubmitResult.self
        )
    }

    // MARK: - Materials

    struct CreateMaterialBody: Encodable {
        let filename: String
        let mimeType: String
        let size: Int
        let subjectId: String?
        let title: String?

        // Same reason as above: an omitted key is not the same as a null one,
        // and the schema is asking for null.
        enum CodingKeys: String, CodingKey {
            case filename, mimeType, size, subjectId, title
        }

        func encode(to encoder: Encoder) throws {
            var container = encoder.container(keyedBy: CodingKeys.self)
            try container.encode(filename, forKey: .filename)
            try container.encode(mimeType, forKey: .mimeType)
            try container.encode(size, forKey: .size)
            try container.encode(subjectId, forKey: .subjectId)
            try container.encode(title, forKey: .title)
        }
    }

    struct MaterialUpload: Decodable {
        let materialId: String
        let uploadUrl: String
        let token: String
        let path: String
    }

    static func createMaterial(
        token: String, body: CreateMaterialBody
    ) async throws -> MaterialUpload {
        try await HTTP.send(
            try request("/api/materials", token: token, body: body),
            as: MaterialUpload.self
        )
    }

    /// Uploads the bytes to the signed URL the server just handed back.
    ///
    /// The file goes straight to storage rather than through the web app: a
    /// 20 MB PDF has no reason to pass through a server that would only
    /// forward it, and the signed URL is already scoped to this one object.
    static func uploadFile(
        to uploadURL: String, uploadToken: String, data: Data, mimeType: String
    ) async throws {
        guard let url = URL(string: uploadURL) else { throw APIError.server(nil) }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("Bearer \(uploadToken)", forHTTPHeaderField: "Authorization")
        request.setValue(mimeType, forHTTPHeaderField: "Content-Type")
        request.httpBody = data
        request.timeoutInterval = 120
        try await HTTP.send(request)
    }

    static func processMaterial(token: String, materialID: String) async throws {
        try await HTTP.send(try request("/api/materials/\(materialID)/process", token: token))
    }

    static func deleteMaterial(token: String, materialID: String) async throws {
        try await HTTP.send(
            try request("/api/materials/\(materialID)", method: "DELETE", token: token)
        )
    }

    // MARK: - Practice

    struct CreatePracticeBody: Encodable {
        let weaknessId: String?
        let questionCount: Int

        enum CodingKeys: String, CodingKey { case weaknessId, questionCount }

        func encode(to encoder: Encoder) throws {
            var container = encoder.container(keyedBy: CodingKeys.self)
            try container.encode(weaknessId, forKey: .weaknessId)
            try container.encode(questionCount, forKey: .questionCount)
        }
    }

    struct CreatedPracticeSet: Decodable { let setId: String }

    static func createPracticeSet(
        token: String, weaknessID: String?, questionCount: Int
    ) async throws -> String {
        let response = try await HTTP.send(
            try request(
                "/api/practice",
                token: token,
                body: CreatePracticeBody(weaknessId: weaknessID, questionCount: questionCount)
            ),
            as: CreatedPracticeSet.self
        )
        return response.setId
    }

    struct CheckBody: Encodable { let answer: String }

    struct CheckResult: Decodable, Equatable {
        let verdict: String
        let pointsAwarded: Double?
        let explanation: String?
        let improvement: String?

        var tone: Tone {
            switch verdict {
            case "correct", "exceptional": .success
            case "partially_correct", "correct_incomplete": .warning
            default: .danger
            }
        }

        var label: String {
            switch verdict {
            case "correct": L.pick("Richtig", "Correct")
            case "exceptional": L.pick("Herausragend", "Exceptional")
            case "partially_correct": L.pick("Teilweise richtig", "Partly correct")
            case "correct_incomplete": L.pick("Richtig, aber unvollständig", "Correct but incomplete")
            default: L.pick("Nicht richtig", "Not correct")
            }
        }
    }

    static func checkPractice(
        token: String, questionID: String, answer: String
    ) async throws -> CheckResult {
        try await HTTP.send(
            try request(
                "/api/practice/\(questionID)/check",
                token: token,
                body: CheckBody(answer: answer)
            ),
            as: CheckResult.self
        )
    }

    // MARK: - Plan

    struct CancelBody: Encodable { let action: String }
    struct CancelResult: Decodable {
        let cancelled: Bool?
        let resumed: Bool?
        let usePortal: Bool?
        let portalUrl: String?
    }

    static func changeSubscription(token: String, action: String) async throws -> CancelResult {
        try await HTTP.send(
            try request("/api/subscription/cancel", token: token, body: CancelBody(action: action)),
            as: CancelResult.self
        )
    }
}

/// Lets a heterogeneous body be encoded without making every call generic.
private struct AnyEncodable: Encodable {
    private let encode: (Encoder) throws -> Void
    init(_ wrapped: Encodable) { encode = wrapped.encode }
    func encode(to encoder: Encoder) throws { try encode(encoder) }
}
