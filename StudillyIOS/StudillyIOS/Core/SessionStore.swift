import Foundation
import SwiftUI

/// Who is signed in, and what the app should therefore be showing.
///
/// One object owns the whole answer. Views read `phase` and render; they never
/// decide for themselves whether a token is still good.
@MainActor
@Observable
final class SessionStore {
    enum Phase: Equatable {
        /// Before the keychain has been consulted. Shown as a splash rather
        /// than as the signed-out state, so a returning student never sees the
        /// login screen flash past on launch.
        case restoring
        case signedOut
        case onboarding(Session)
        case signedIn(Session)
    }

    struct Session: Equatable {
        var auth: Supabase.Session
        var profile: Profile
        var education: EducationProfile?
    }

    private(set) var phase: Phase = .restoring

    private static let key = "session"

    // MARK: - Lifecycle

    func restore() async {
        guard
            let data = Keychain.read(Self.key),
            let stored = try? HTTP.decoder.decode(Supabase.StoredSession.self, from: data)
        else {
            phase = .signedOut
            return
        }

        var auth = stored.session
        if auth.isExpired {
            guard let refreshed = try? await Supabase.refresh(refreshToken: auth.refreshToken) else {
                // The refresh token is gone or revoked. Clear it: leaving a
                // dead token behind means retrying it on every launch.
                Keychain.delete(Self.key)
                phase = .signedOut
                return
            }
            auth = refreshed
            persist(auth)
        }

        await loadProfile(for: auth)
    }

    func signIn(email: String, password: String) async throws {
        let auth = try await Supabase.signIn(email: email, password: password)
        persist(auth)
        await loadProfile(for: auth)
    }

    /// Returns nil when the project sent a confirmation mail instead of a
    /// session, which the caller shows as a "check your inbox" screen.
    func signUp(email: String, password: String, displayName: String) async throws -> Supabase.Session? {
        guard let auth = try await Supabase.signUp(
            email: email, password: password, displayName: displayName
        ) else { return nil }
        persist(auth)
        return auth
    }

    /// Takes on a session obtained elsewhere, such as from the Google sheet,
    /// and works out from the profile whether setup is still owed.
    func adopt(_ auth: Supabase.Session) async {
        persist(auth)
        await loadProfile(for: auth)
    }

    /// Stores a session without deciding what to show yet, for the case where
    /// the caller is about to write the setup answers itself.
    func persistExternal(_ auth: Supabase.Session) {
        persist(auth)
        phase = .onboarding(
            Session(
                auth: auth,
                profile: Profile(id: auth.userID, displayName: "", onboardingCompletedAt: nil, theme: nil),
                education: nil
            )
        )
    }

    func signOut() async {
        if case let .signedIn(session) = phase {
            await Supabase.signOut(accessToken: session.auth.accessToken)
        } else if case let .onboarding(session) = phase {
            await Supabase.signOut(accessToken: session.auth.accessToken)
        }
        Keychain.delete(Self.key)
        withAnimation(.easeInOut(duration: 0.3)) { phase = .signedOut }
    }

    /// A valid token, refreshed first if it is close to expiry. Every data call
    /// goes through here so no screen has to think about token lifetime.
    func validToken() async throws -> String {
        guard let session = currentSession else { throw APIError.unauthorized }
        guard session.auth.isExpired else { return session.auth.accessToken }

        let refreshed = try await Supabase.refresh(refreshToken: session.auth.refreshToken)
        persist(refreshed)
        updateAuth(refreshed)
        return refreshed.accessToken
    }

    var currentSession: Session? {
        switch phase {
        case let .signedIn(session), let .onboarding(session): session
        default: nil
        }
    }

    // MARK: - Profile

    /// Decides between onboarding and the app itself. A profile without a
    /// completion date, or without a school profile, is not ready.
    func loadProfile(for auth: Supabase.Session) async {
        do {
            let profile = try await StudillyAPI.profile(token: auth.accessToken, userID: auth.userID)
            let education = try await StudillyAPI.educationProfile(
                token: auth.accessToken, userID: auth.userID
            )
            let session = Session(auth: auth, profile: profile, education: education)
            let ready = profile.onboardingCompletedAt != nil && education != nil
            withAnimation(.easeInOut(duration: 0.35)) {
                phase = ready ? .signedIn(session) : .onboarding(session)
            }
        } catch APIError.unauthorized {
            Keychain.delete(Self.key)
            phase = .signedOut
        } catch {
            // The profile row is created by a database trigger at signup, so a
            // failure here is a transport problem rather than a missing row.
            // Treating it as "needs onboarding" would wipe a real profile, so
            // the safer read is signed-out with the token kept.
            phase = .signedOut
        }
    }

    func markOnboarded(profile: Profile, education: EducationProfile) {
        guard let session = currentSession else { return }
        withAnimation(.easeInOut(duration: 0.4)) {
            phase = .signedIn(Session(auth: session.auth, profile: profile, education: education))
        }
    }

    func updateProfile(_ profile: Profile) {
        guard case let .signedIn(session) = phase else { return }
        phase = .signedIn(Session(auth: session.auth, profile: profile, education: session.education))
    }

    private func updateAuth(_ auth: Supabase.Session) {
        switch phase {
        case let .signedIn(session):
            phase = .signedIn(Session(auth: auth, profile: session.profile, education: session.education))
        case let .onboarding(session):
            phase = .onboarding(Session(auth: auth, profile: session.profile, education: session.education))
        default: break
        }
    }

    private func persist(_ auth: Supabase.Session) {
        if let data = try? HTTP.encoder.encode(auth) {
            Keychain.save(data, for: Self.key)
        }
    }
}
