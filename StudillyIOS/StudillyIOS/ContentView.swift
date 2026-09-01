import SwiftUI

/// What the app shows, decided in one place.
///
/// Four states, one for each thing the student could be: still checking the
/// keychain, signed out, signed in but not set up, or in. Views below never
/// re-decide this; they render whichever branch they belong to.
struct RootView: View {
    @Environment(SessionStore.self) private var session

    var body: some View {
        ZStack {
            switch session.phase {
            case .restoring:
                LaunchView()
                    .transition(.opacity)

            case .signedOut:
                // Setup opens the app: four short questions about school are a
                // smaller ask than an email address and a password, and by the
                // time the account screen appears there is something to lose by
                // backing out. Anyone who already has an account leaves from
                // the link at the foot of the first step.
                NavigationStack { OnboardingView() }
                    .transition(.opacity.combined(with: .scale(scale: 1.02)))

            case .onboarding:
                // Reached by an account that exists but was never finished:
                // a signup interrupted, or one made on the web and abandoned.
                NavigationStack { OnboardingView() }
                    .transition(.opacity)

            case .signedIn:
                AppShell()
                    .transition(.opacity.combined(with: .scale(scale: 0.98)))
            }
        }
        .animation(.easeInOut(duration: 0.35), value: session.phase)
    }
}

/// Held while the keychain is read.
///
/// A returning student should not see the welcome screen flash past on the way
/// to their dashboard, so the app shows its own mark until it knows.
private struct LaunchView: View {
    @State private var appeared = false

    var body: some View {
        ZStack {
            Palette.canvas.ignoresSafeArea()
            Wordmark(size: 30)
                .opacity(appeared ? 1 : 0)
                .scaleEffect(appeared ? 1 : 0.94)
        }
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) { appeared = true }
        }
    }
}

/// The signed-in app.
struct AppShell: View {
    var body: some View {
        TabView {
            Tab(L.dashboard.title, systemImage: "house") {
                DashboardView()
            }
            Tab(L.exams.title, systemImage: "doc.text") {
                ExamsView()
            }
            Tab(L.settings.title, systemImage: "gearshape") {
                SettingsView()
            }
        }
    }
}
