import Foundation

/// Supabase, spoken directly over HTTP.
///
/// Auth and ordinary reads and writes go straight to Supabase rather than
/// through the web app, because row-level security already decides what a
/// signed-in user may touch: putting a second server in front of it would add
/// a hop without adding a check. The web app is still where exam generation
/// and marking happen, since those need model keys that must not ship in an
/// app bundle.
///
/// No SDK: these are a dozen REST calls, and a dependency would be more to
/// maintain than the calls themselves.
enum Supabase {

    // MARK: - Auth

    struct Session: Codable, Equatable, Sendable {
        let accessToken: String
        let refreshToken: String
        let expiresAt: Date
        let userID: String
        let email: String

        enum CodingKeys: String, CodingKey {
            case accessToken = "access_token"
            case refreshToken = "refresh_token"
            case expiresIn = "expires_in"
            case expiresAt = "expires_at"
            case user
        }

        struct User: Codable { let id: String; let email: String? }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            accessToken = try container.decode(String.self, forKey: .accessToken)
            refreshToken = try container.decode(String.self, forKey: .refreshToken)
            if let epoch = try? container.decode(Double.self, forKey: .expiresAt) {
                expiresAt = Date(timeIntervalSince1970: epoch)
            } else {
                let seconds = (try? container.decode(Double.self, forKey: .expiresIn)) ?? 3600
                expiresAt = Date().addingTimeInterval(seconds)
            }
            let user = try container.decode(User.self, forKey: .user)
            userID = user.id
            email = user.email ?? ""
        }

        init(accessToken: String, refreshToken: String, expiresAt: Date, userID: String, email: String) {
            self.accessToken = accessToken
            self.refreshToken = refreshToken
            self.expiresAt = expiresAt
            self.userID = userID
            self.email = email
        }

        func encode(to encoder: Encoder) throws {
            var container = encoder.container(keyedBy: PersistKeys.self)
            try container.encode(accessToken, forKey: .accessToken)
            try container.encode(refreshToken, forKey: .refreshToken)
            try container.encode(expiresAt, forKey: .expiresAt)
            try container.encode(userID, forKey: .userID)
            try container.encode(email, forKey: .email)
        }

        private enum PersistKeys: String, CodingKey {
            case accessToken, refreshToken, expiresAt, userID, email
        }

        /// Refreshed a minute early, so a request never starts with a token
        /// that expires while it is in flight.
        var isExpired: Bool { expiresAt.timeIntervalSinceNow < 60 }
    }

    /// A stored session decodes from the flat shape written by `encode`, which
    /// differs from the token endpoint's payload.
    struct StoredSession: Codable {
        let accessToken: String
        let refreshToken: String
        let expiresAt: Date
        let userID: String
        let email: String

        var session: Session {
            Session(accessToken: accessToken, refreshToken: refreshToken,
                    expiresAt: expiresAt, userID: userID, email: email)
        }
    }

    static func signIn(email: String, password: String) async throws -> Session {
        var request = authRequest("/auth/v1/token?grant_type=password")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "email": email, "password": password,
        ])
        return try await HTTP.send(request, as: Session.self)
    }

    /// Signs up and returns a session when the project confirms addresses
    /// automatically, or nil when a confirmation mail was sent instead.
    static func signUp(email: String, password: String, displayName: String) async throws -> Session? {
        var request = authRequest("/auth/v1/signup")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "email": email,
            "password": password,
            "data": ["display_name": displayName],
        ])
        let (data, response) = try await HTTP.session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.server(nil) }
        guard (200..<300).contains(http.statusCode) else {
            let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            throw APIError.from(
                supabaseCode: payload?["error_code"] as? String,
                message: payload?["msg"] as? String ?? payload?["message"] as? String
            )
        }
        // Confirmation on: the response is a user without tokens.
        return try? HTTP.decoder.decode(Session.self, from: data)
    }

    static func refresh(refreshToken: String) async throws -> Session {
        var request = authRequest("/auth/v1/token?grant_type=refresh_token")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "refresh_token": refreshToken,
        ])
        return try await HTTP.send(request, as: Session.self)
    }

    static func resetPassword(email: String) async throws {
        var request = authRequest("/auth/v1/recover")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["email": email])
        try await HTTP.send(request)
    }

    static func signOut(accessToken: String) async {
        var request = authRequest("/auth/v1/logout")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        _ = try? await HTTP.session.data(for: request)
    }

    private static func authRequest(_ path: String) -> URLRequest {
        var request = URLRequest(url: Config.supabaseURL.appending(path: "").appendingPathComponent(""))
        request.url = URL(string: Config.supabaseURL.absoluteString + path)!
        request.httpMethod = "POST"
        request.setValue(Config.supabasePublishableKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return request
    }

    // MARK: - Data

    /// Builds a PostgREST request. The access token travels as a bearer token,
    /// which is what the database reads to decide, row by row, what this user
    /// is allowed to see.
    static func dataRequest(
        _ path: String,
        query: [URLQueryItem] = [],
        method: String = "GET",
        token: String,
        body: Data? = nil,
        prefer: String? = nil
    ) -> URLRequest {
        var components = URLComponents(
            url: Config.supabaseURL.appending(path: "/rest/v1\(path)"),
            resolvingAgainstBaseURL: false
        )!
        if !query.isEmpty { components.queryItems = query }

        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.setValue(Config.supabasePublishableKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let prefer { request.setValue(prefer, forHTTPHeaderField: "Prefer") }
        request.httpBody = body
        return request
    }
}
