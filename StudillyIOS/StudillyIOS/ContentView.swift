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
/// A returning student should not see the setup screen flash past on the way
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
///
/// Four tabs for the four things a student does: look at where they are, keep
/// their documents, write exams, practise what went wrong. Settings is not one
/// of them: it is a destination people visit rarely, and giving it a quarter of
/// the tab bar would make it look as important as the work.
struct AppShell: View {
    /// One model behind the two tabs that show the same rows.
    ///
    /// The dashboard and the exam list read the same exams, attempts and
    /// subjects. Giving each its own model meant switching tabs re-ran four
    /// queries to draw what was already on screen.
    @State private var exams = DashboardModel()

    var body: some View {
        TabView {
            Tab(L.dashboard.title, systemImage: "house") { DashboardView(model: exams) }
            Tab(L.materials.title, systemImage: "books.vertical") { MaterialsView() }
            Tab(L.exams.title, systemImage: "doc.text") { ExamsView(model: exams) }
            Tab(L.practice.title, systemImage: "target") { PracticeView() }
        }
    }
}

/// The settings button that sits in the top-right of every tab.
///
/// A plain toolbar item, so the system gives it the same glass treatment as
/// every other toolbar control and it keeps whatever that treatment becomes.
/// Drawing the material by hand would freeze it at one OS version.
struct SettingsToolbarButton: ToolbarContent {
    @Binding var isPresented: Bool

    var body: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Button {
                isPresented = true
            } label: {
                Image(systemName: "gearshape")
                    .accessibilityLabel(L.settings.title)
            }
        }
    }
}
