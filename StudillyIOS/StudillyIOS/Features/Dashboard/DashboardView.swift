import SwiftUI

@MainActor
@Observable
final class DashboardModel {
    enum State: Equatable { case loading, loaded, failed(String) }

    var state: State = .loading
    var exams: [ExamSummary] = []
    var attempts: [AttemptSummary] = []
    var subscription: Subscription?
    var usage: [UsageRecord] = []

    /// The most recent attempt per exam, which is what a list of results wants
    /// to show: one row per exam, carrying its latest outcome.
    var latestAttemptByExam: [String: AttemptSummary] {
        var result: [String: AttemptSummary] = [:]
        for attempt in attempts where result[attempt.examID] == nil {
            result[attempt.examID] = attempt
        }
        return result
    }

    var gradedAttempts: [AttemptSummary] { attempts.filter(\.isGraded) }

    var examsUsed: Int {
        usage.first { $0.metric == "practice_exams" }?.used ?? 0
    }

    func load(session: SessionStore) async {
        do {
            let token = try await session.validToken()
            guard let userID = session.currentSession?.auth.userID else { return }

            // Fired together: they do not depend on each other, and four
            // sequential round trips is a visible wait on a phone.
            async let exams = StudillyAPI.exams(token: token)
            async let attempts = StudillyAPI.attempts(token: token)
            async let subscription = StudillyAPI.subscription(token: token, userID: userID)
            async let usage = StudillyAPI.usage(token: token, userID: userID)

            self.exams = try await exams
            self.attempts = try await attempts
            self.subscription = try await subscription
            self.usage = try await usage
            state = .loaded
        } catch {
            state = .failed((error as? APIError)?.errorDescription ?? L.errors.generic)
        }
    }
}

struct DashboardView: View {
    @Environment(SessionStore.self) private var session
    @State private var model = DashboardModel()
    @State private var showSettings = false
    @State private var showNewExam = false
    @State private var openExamID: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                switch model.state {
                case .loading:
                    loadingBody
                case let .failed(message):
                    ErrorStateView(message: message) {
                        Task { model.state = .loading; await model.load(session: session) }
                    }
                    .padding(.top, Space.xxxl)
                case .loaded:
                    loadedBody
                }
            }
            .screenBackground()
            .navigationTitle(L.dashboard.title)
            .toolbar { SettingsToolbarButton(isPresented: $showSettings) }
            .refreshable { await model.load(session: session) }
            .navigationDestination(item: $openExamID) { examID in
                ExamLoaderView(examID: examID)
            }
        }
        .sheet(isPresented: $showSettings) { SettingsView() }
        .sheet(isPresented: $showNewExam) {
            NewExamView { examID in openExamID = examID }
        }
        .task { await model.load(session: session) }
    }

    private var loadingBody: some View {
        VStack(alignment: .leading, spacing: Space.xl) {
            SkeletonBlock(height: 22, width: 180)
            SkeletonBlock(height: 96)
            SkeletonBlock(height: 14, width: 120)
            SkeletonBlock(height: 72)
            SkeletonBlock(height: 72)
        }
        .screenPadding()
        .padding(.top, Space.lg)
    }

    private var loadedBody: some View {
        VStack(alignment: .leading, spacing: Space.xxl) {
            if let name = session.currentSession?.profile.displayName, !name.isEmpty {
                Text(L.dashboard.greeting(name))
                    .font(.display(24))
                    .foregroundStyle(Palette.ink)
                    .screenPadding()
            }

            StudillyButton(title: L.exams.create, icon: "sparkles") { showNewExam = true }
                .screenPadding()

            if model.gradedAttempts.isEmpty {
                EmptyStateView(
                    icon: "doc.text.magnifyingglass",
                    title: L.dashboard.noExamsTitle,
                    message: L.dashboard.noExamsBody
                )
                .padding(.top, Space.lg)
            } else {
                VStack(alignment: .leading, spacing: Space.md) {
                    Text(L.dashboard.recentExams)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(Palette.ink)
                        .screenPadding()

                    VStack(spacing: Space.md) {
                        ForEach(model.exams.prefix(5)) { exam in
                            if let attempt = model.latestAttemptByExam[exam.id] {
                                NavigationLink {
                                    ResultView(exam: exam, attempt: attempt)
                                } label: {
                                    ExamRow(exam: exam, attempt: attempt)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    .screenPadding()
                }
            }
        }
        .padding(.top, Space.sm)
        .padding(.bottom, Space.xxxl)
    }
}

/// One exam and how it went. Kept to a single line of numbers: a row that
/// tries to show everything makes the grade harder to find, which is the one
/// thing anyone opens this list for.
struct ExamRow: View {
    let exam: ExamSummary
    let attempt: AttemptSummary?

    var body: some View {
        Card(padding: Space.lg) {
            HStack(spacing: Space.lg) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(exam.title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Palette.ink)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    HStack(spacing: Space.sm) {
                        Text(exam.createdAt.formatted(date: .abbreviated, time: .omitted))
                            .font(.system(size: 13))
                            .foregroundStyle(Palette.inkSubtle)

                        if let attempt, attempt.isGraded, let percentage = attempt.percentage {
                            Text("·").foregroundStyle(Palette.inkSubtle)
                            Text("\(Int(percentage.rounded())) %")
                                .font(.tabular(13))
                                .foregroundStyle(Palette.inkSubtle)
                        }
                    }
                }

                Spacer(minLength: 0)

                if let attempt, attempt.isGraded {
                    GradePill(attempt: attempt)
                } else {
                    Badge(
                        text: attempt == nil ? L.exams.noAttempt : L.exams.notGraded,
                        tone: .neutral
                    )
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Palette.inkSubtle)
            }
        }
    }
}

struct GradePill: View {
    let attempt: AttemptSummary

    private var tone: Tone {
        guard let percentage = attempt.percentage else { return .neutral }
        if percentage >= 75 { return .success }
        if percentage >= 45 { return .warning }
        return .danger
    }

    var body: some View {
        Text(attempt.gradeLabel ?? "–")
            .font(.tabular(14, weight: .semibold))
            .foregroundStyle(tone.foreground)
            .padding(.horizontal, Space.md)
            .padding(.vertical, 6)
            .background(tone.background)
            .clipShape(RoundedRectangle(cornerRadius: Radius.control - 2, style: .continuous))
    }
}
