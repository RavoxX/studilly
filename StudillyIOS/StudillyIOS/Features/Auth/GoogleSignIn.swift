import AuthenticationServices
import Foundation
import SwiftUI

/// Sign in with Google, through Supabase.
///
/// Supabase runs the exchange, so nothing here handles a Google client secret
/// and there is no Google SDK in the bundle. The app opens Supabase's
/// authorize endpoint in an `ASWebAuthenticationSession`, Google and Supabase
/// do the round trip, and the callback comes back on a private scheme carrying
/// the session in its fragment.
///
/// `ASWebAuthenticationSession` intercepts `callbackURLScheme` itself, so the
/// scheme does not need registering in Info.plist, and the sheet it presents
/// is outside the app's process: the app never sees the Google password.
@MainActor
enum GoogleSignIn {
    static let callbackScheme = "studilly"
    private static let callbackURL = "\(callbackScheme)://auth-callback"

    static func start(anchor: ASPresentationAnchor) async throws -> Supabase.Session {
        var components = URLComponents(
            url: Config.supabaseURL.appending(path: "/auth/v1/authorize"),
            resolvingAgainstBaseURL: false
        )!
        components.queryItems = [
            .init(name: "provider", value: "google"),
            .init(name: "redirect_to", value: callbackURL),
        ]

        let callback = try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: components.url!,
                callbackURLScheme: callbackScheme
            ) { url, error in
                if let url {
                    continuation.resume(returning: url)
                } else if let error = error as? ASWebAuthenticationSessionError,
                          error.code == .canceledLogin {
                    continuation.resume(throwing: CancellationError())
                } else {
                    continuation.resume(throwing: APIError.server(error?.localizedDescription))
                }
            }
            session.presentationContextProvider = ContextProvider.shared(anchor)
            // A fresh session each time: reusing the Safari cookie jar means a
            // shared device silently signs in as whoever used it last.
            session.prefersEphemeralWebBrowserSession = true
            session.start()
        }

        return try parse(callback)
    }

    /// Supabase returns the session in the URL fragment. An `error_description`
    /// there is the readable half of a misconfiguration, so it is surfaced
    /// rather than swallowed.
    private static func parse(_ url: URL) throws -> Supabase.Session {
        let fragment = url.fragment ?? ""
        var values: [String: String] = [:]
        for pair in fragment.split(separator: "&") {
            let parts = pair.split(separator: "=", maxSplits: 1)
            guard parts.count == 2 else { continue }
            values[String(parts[0])] = String(parts[1])
                .replacingOccurrences(of: "+", with: " ")
                .removingPercentEncoding ?? ""
        }

        if let description = values["error_description"] {
            throw APIError.server(description)
        }
        guard
            let accessToken = values["access_token"],
            let refreshToken = values["refresh_token"]
        else {
            throw APIError.server(nil)
        }

        let expiresIn = Double(values["expires_in"] ?? "3600") ?? 3600
        let claims = decodeClaims(accessToken)

        return Supabase.Session(
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresAt: Date().addingTimeInterval(expiresIn),
            userID: claims["sub"] as? String ?? "",
            email: claims["email"] as? String ?? ""
        )
    }

    /// Reads the claims out of the JWT payload.
    ///
    /// Not a verification: the token was just handed over by Supabase across
    /// TLS, and everything it is used for is checked again server-side. This
    /// only saves a round trip to learn the user's own id.
    private static func decodeClaims(_ token: String) -> [String: Any] {
        let parts = token.split(separator: ".")
        guard parts.count == 3 else { return [:] }

        var base64 = String(parts[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        base64 += String(repeating: "=", count: (4 - base64.count % 4) % 4)

        guard
            let data = Data(base64Encoded: base64),
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return [:] }
        return json
    }

    private final class ContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
        private static var instance: ContextProvider?
        private let anchor: ASPresentationAnchor

        private init(anchor: ASPresentationAnchor) { self.anchor = anchor }

        static func shared(_ anchor: ASPresentationAnchor) -> ContextProvider {
            let provider = ContextProvider(anchor: anchor)
            instance = provider  // held for the lifetime of the sheet
            return provider
        }

        func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
            anchor
        }
    }
}

/// Google's mark, in its four colours.
///
/// Drawn rather than taken from an icon set: Google's sign-in guidelines
/// require their own logo, and icon libraries do not carry brand marks.
struct GoogleMark: View {
    var size: CGFloat = 18

    var body: some View {
        Canvas { context, canvasSize in
            let scale = canvasSize.width / 18
            func path(_ build: (inout Path) -> Void) -> Path {
                var path = Path()
                build(&path)
                return path.applying(CGAffineTransform(scaleX: scale, y: scale))
            }

            context.fill(path { p in
                p.move(to: CGPoint(x: 17.64, y: 9.2))
                p.addCurve(to: CGPoint(x: 17.48, y: 7.36), control1: CGPoint(x: 17.64, y: 8.56), control2: CGPoint(x: 17.58, y: 7.95))
                p.addLine(to: CGPoint(x: 9, y: 7.36))
                p.addLine(to: CGPoint(x: 9, y: 10.84))
                p.addLine(to: CGPoint(x: 13.84, y: 10.84))
                p.addCurve(to: CGPoint(x: 12.04, y: 13.56), control1: CGPoint(x: 13.64, y: 11.97), control2: CGPoint(x: 13.0, y: 12.93))
                p.addLine(to: CGPoint(x: 14.96, y: 15.82))
                p.addCurve(to: CGPoint(x: 17.64, y: 9.2), control1: CGPoint(x: 16.66, y: 14.25), control2: CGPoint(x: 17.64, y: 11.94))
                p.closeSubpath()
            }, with: .color(Color(red: 0.26, green: 0.52, blue: 0.96)))

            context.fill(path { p in
                p.move(to: CGPoint(x: 9, y: 18))
                p.addCurve(to: CGPoint(x: 14.96, y: 15.82), control1: CGPoint(x: 11.43, y: 18), control2: CGPoint(x: 13.47, y: 17.2))
                p.addLine(to: CGPoint(x: 12.04, y: 13.56))
                p.addCurve(to: CGPoint(x: 9, y: 14.42), control1: CGPoint(x: 11.24, y: 14.1), control2: CGPoint(x: 10.2, y: 14.42))
                p.addCurve(to: CGPoint(x: 3.97, y: 10.72), control1: CGPoint(x: 6.66, y: 14.42), control2: CGPoint(x: 4.68, y: 12.84))
                p.addLine(to: CGPoint(x: 0.96, y: 13.05))
                p.addCurve(to: CGPoint(x: 9, y: 18), control1: CGPoint(x: 2.44, y: 15.98), control2: CGPoint(x: 5.48, y: 18))
                p.closeSubpath()
            }, with: .color(Color(red: 0.20, green: 0.66, blue: 0.33)))

            context.fill(path { p in
                p.move(to: CGPoint(x: 3.97, y: 10.72))
                p.addCurve(to: CGPoint(x: 3.97, y: 7.28), control1: CGPoint(x: 3.72, y: 9.6), control2: CGPoint(x: 3.72, y: 8.4))
                p.addLine(to: CGPoint(x: 0.96, y: 4.95))
                p.addCurve(to: CGPoint(x: 0.96, y: 13.05), control1: CGPoint(x: -0.32, y: 7.5), control2: CGPoint(x: -0.32, y: 10.5))
                p.closeSubpath()
            }, with: .color(Color(red: 0.98, green: 0.74, blue: 0.02)))

            context.fill(path { p in
                p.move(to: CGPoint(x: 9, y: 3.58))
                p.addCurve(to: CGPoint(x: 12.44, y: 4.93), control1: CGPoint(x: 10.32, y: 3.58), control2: CGPoint(x: 11.5, y: 4.04))
                p.addLine(to: CGPoint(x: 15.02, y: 2.35))
                p.addCurve(to: CGPoint(x: 9, y: 0), control1: CGPoint(x: 13.46, y: 0.9), control2: CGPoint(x: 11.43, y: 0))
                p.addCurve(to: CGPoint(x: 0.96, y: 4.95), control1: CGPoint(x: 5.48, y: 0), control2: CGPoint(x: 2.44, y: 2.02))
                p.addLine(to: CGPoint(x: 3.97, y: 7.28))
                p.addCurve(to: CGPoint(x: 9, y: 3.58), control1: CGPoint(x: 4.68, y: 5.16), control2: CGPoint(x: 6.66, y: 3.58))
                p.closeSubpath()
            }, with: .color(Color(red: 0.92, green: 0.26, blue: 0.21)))
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}
