import Foundation

/// A thin URLSession wrapper.
///
/// No third-party networking: the app makes a handful of JSON calls and a
/// dependency would be more code to keep current than the twenty lines it
/// replaces. Every request goes through here, so headers, decoding and error
/// translation happen in one place.
struct HTTP {
    static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 20
        config.waitsForConnectivity = true
        return URLSession(configuration: config)
    }()

    static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let text = try decoder.singleValueContainer().decode(String.self)
            if let date = ISO8601DateFormatter.studilly.date(from: text) { return date }
            if let date = ISO8601DateFormatter.studillyPlain.date(from: text) { return date }
            throw DecodingError.dataCorruptedError(
                in: try decoder.singleValueContainer(),
                debugDescription: "Unrecognised date: \(text)"
            )
        }
        return decoder
    }()

    static let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    /// Performs a request and decodes the body, translating transport and
    /// status failures into APIError before they reach a view.
    static func send<T: Decodable>(_ request: URLRequest, as type: T.Type) async throws -> T {
        let (data, response) = try await perform(request)
        guard let http = response as? HTTPURLResponse else { throw APIError.server(nil) }
        try check(http, data: data)
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            #if DEBUG
            print("Decoding failed for \(T.self): \(error)")
            #endif
            throw APIError.decoding
        }
    }

    /// For calls whose body does not matter, only whether they worked.
    static func send(_ request: URLRequest) async throws {
        let (data, response) = try await perform(request)
        guard let http = response as? HTTPURLResponse else { throw APIError.server(nil) }
        try check(http, data: data)
    }

    private static func perform(_ request: URLRequest) async throws -> (Data, URLResponse) {
        do {
            return try await session.data(for: request)
        } catch let error as URLError {
            switch error.code {
            case .notConnectedToInternet, .networkConnectionLost, .timedOut,
                 .cannotConnectToHost, .cannotFindHost:
                throw APIError.offline
            default:
                throw APIError.server(error.localizedDescription)
            }
        }
    }

    private static func check(_ response: HTTPURLResponse, data: Data) throws {
        guard !(200..<300).contains(response.statusCode) else { return }

        let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        let code = payload?["error_code"] as? String ?? payload?["code"] as? String
        let message = payload?["msg"] as? String
            ?? payload?["message"] as? String
            ?? payload?["error_description"] as? String

        // The app's own API answers with a reason as well as a status, and
        // the reason is what a student can act on: an exhausted monthly
        // allowance is not something to retry, and an unfinished profile is
        // fixed in setup rather than by trying again.
        let reason = (payload?["details"] as? [String: Any])?["reason"] as? String
        let apiError = payload?["error"] as? String

        switch response.statusCode {
        case 402: throw APIError.limitReached
        case 403 where reason == "onboarding_incomplete": throw APIError.onboardingIncomplete
        case 401, 403: throw APIError.unauthorized
        case 404: throw APIError.notFound
        default:
            if apiError == "limit_reached" { throw APIError.limitReached }
            throw APIError.from(supabaseCode: code, message: message)
        }
    }
}

extension ISO8601DateFormatter {
    static let studilly: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    static let studillyPlain: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()
}
