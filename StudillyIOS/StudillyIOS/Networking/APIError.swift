import Foundation

/// What can go wrong, in the terms the interface needs.
///
/// Every case maps to a sentence a student can act on. The underlying detail
/// is kept for logging but never shown: "PostgREST 42501" helps nobody.
enum APIError: LocalizedError, Equatable {
    case offline
    case unauthorized
    case invalidCredentials
    case emailInUse
    case weakPassword
    case notFound
    case server(String?)
    case decoding

    var errorDescription: String? {
        switch self {
        case .offline: L.errors.network
        case .invalidCredentials: L.errors.invalidCredentials
        case .emailInUse: L.errors.emailInUse
        case .weakPassword: L.errors.weakPassword
        case .unauthorized, .notFound, .server, .decoding: L.errors.generic
        }
    }

    /// Maps Supabase's error codes onto the cases above. Anything unrecognised
    /// falls through to the generic message rather than leaking raw text.
    static func from(supabaseCode code: String?, message: String?) -> APIError {
        switch code {
        case "invalid_credentials", "invalid_grant": .invalidCredentials
        case "user_already_exists", "email_exists": .emailInUse
        case "weak_password": .weakPassword
        default:
            if let message, message.lowercased().contains("already registered") {
                .emailInUse
            } else if let message, message.lowercased().contains("invalid login") {
                .invalidCredentials
            } else {
                .server(message)
            }
        }
    }
}
