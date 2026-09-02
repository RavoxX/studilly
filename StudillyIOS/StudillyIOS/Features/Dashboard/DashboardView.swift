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
    var subjects: [Subject] = []
    var weaknesses: [Weakness] = []

    /// An attempt that was started and never handed in, with its exam.
    var unfinished: (exam: ExamSummary, attempt: AttemptSummary)? {
        for attempt in attempts where attempt.status == "in_progress" {
            if let exam = exams.first(where: { $0.id == attempt.examID }) {
                return (exam, attempt)
            }
        }
        return nil
    }

    /// The average percentage across marked papers, which is the one number
    /// that says whether things are going in the right direction.
    var averagePercentage: Int? {
        let scored = gradedAttempts.compactMap(\.percentage)
        guard !scored.isEmpty else { return nil }
        return Int((scored.reduce(0, +) / Double(scored.count)).rounded())
    }

    /// Exams grouped by subject, in the subjects' own order, anything unfiled
    /// last. Sections are what keep a term's worth of papers findable.
    var sections: [(subject: Subject?, exams: [ExamSummary])] {
        var bySubject: [String: [ExamSummary]] = [:]
        var unfiled: [ExamSummary] = []
        for exam in exams {
            if let id = exam.subjectID { bySubject[id, default: []].append(exam) }
            else { unfiled.append(exam) }
        }
        var result = subjects.compactMap { subject -> (Subject?, [ExamSummary])? in
            guard let list = bySubject[subject.id], !list.isEmpty else { return nil }
            return (subject, list)
        }
        if !unfiled.isEmpty { result.append((nil, unfiled)) }
        return result
    }

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

    func delete(session: SessionStore, exam: ExamSummary) async {
        do {
            let token = try await session.validToken()
            try await StudillyAPI.deleteExam(token: token, examID: exam.id)
            exams.removeAll { $0.id == exam.id }
            attempts.removeAll { $0.examID == exam.id }
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch {
            state = .failed((error as? APIError)?.errorDescription ?? L.errors.generic)
        }
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
            async let subjects = StudillyAPI.subjects(token: token)
            async let weaknesses = StudillyAPI.weaknesses(token: token)

            self.exams = try await exams
            self.attempts = try await attempts
            self.subscription = try await subscription
            self.usage = try await usage
            self.subjects = try await subjects
            self.weaknesses = try await weaknesses
            state = .loaded
        } catch {
            state = .failed((error as? APIError)?.errorDescription ?? L.errors.generic)
        }
    }
}

struct DashboardView: View {
    @Environment(SessionStore.self) private var session
    let model: DashboardModel
    @State private var showSettings = false
    @State private var showNewExam = false
    @State private var openExamID: String?
    @State private var runningExam: ExamSummary?

    private var greeting: String {
        let name = session.currentSession?.profile.displayName ?? ""
        return name.isEmpty ? L.dashboard.title : L.dashboard.greeting(name)
    }

    var body: some View {
        NavigationStack {
            Group {
                switch model.state {
                case .loading:
                    loadingBody
                case let .failed(message):
                    ContentUnavailableView {
                        Label(L.errors.title, systemImage: "wifi.exclamationmark")
                    } description: {
                        Text(message)
                    } actions: {
                        Button(L.common.retry) {
                            Task { model.state = .loading; await model.load(session: session) }
                        }
                        .buttonStyle(.borderedProminent)
                    }
                case .loaded:
                    loadedBody
                }
            }
            .screenBackground()
            .navigationTitle(greeting)
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
        .fullScreenCover(item: $runningExam) { exam in
            ExamRunnerView(exam: exam)
        }
        .onChange(of: runningExam) { old, new in
            if old != nil && new == nil { Task { await model.load(session: session) } }
        }
        .task { await model.load(session: session) }
    }

    private var loadingBody: some View {
        ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var loadedBody: some View {
        List {
            if let unfinished = model.unfinished {
                Section(L.dashboard.continueTitle) {
                    Button { runningExam = unfinished.exam } label: {
                        HStack(spacing: Space.md) {
                            Image(systemName: "pencil.line")
                                .foregroundStyle(Palette.brand)
                                .frame(width: 24)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(unfinished.exam.title)
                                    .foregroundStyle(Palette.ink)
                                    .lineLimit(1)
                                Text(L.dashboard.continueBody)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer(minLength: 0)
                            Image(systemName: "chevron.right")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.tertiary)
                        }
                    }
                }
            }

            Section {
                Button { showNewExam = true } label: {
                    ButtonLabel(title: L.exams.create, icon: "sparkles")
                }
                .primaryButton()
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
            }

            if !model.gradedAttempts.isEmpty {
                Section(L.dashboard.atAGlance) {
                    LabeledContent(
                        L.dashboard.examsWritten,
                        value: String(model.gradedAttempts.count)
                    )
                    if let average = model.averagePercentage {
                        LabeledContent(L.dashboard.average, value: "\(average) %")
                    }
                }
            }

            if !model.weaknesses.isEmpty {
                Section(L.practice.focusAreas) {
                    ForEach(model.weaknesses.prefix(3)) { weakness in
                        HStack(spacing: Space.md) {
                            Circle()
                                .fill(weakness.tone.foreground)
                                .frame(width: 8, height: 8)
                            Text(weakness.topicLabel).lineLimit(1)
                            Spacer(minLength: 0)
                            Text(weakness.trendLabel)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            if !model.gradedAttempts.isEmpty {
                Section(L.dashboard.recentExams) {
                    ForEach(model.exams.prefix(5)) { exam in
                        if let attempt = model.latestAttemptByExam[exam.id], attempt.isGraded {
                            NavigationLink {
                                ResultView(exam: exam, attempt: attempt)
                            } label: {
                                ExamRow(exam: exam, attempt: attempt)
                            }
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .overlay {
            if model.exams.isEmpty {
                ContentUnavailableView {
                    Label(L.dashboard.noExamsTitle, systemImage: "doc.text.magnifyingglass")
                } description: {
                    Text(L.dashboard.noExamsBody)
                } actions: {
                    Button(L.exams.create) { showNewExam = true }
                        .buttonStyle(.borderedProminent)
                }
            }
        }
    }
}

/// One exam and how it went.
///
/// A plain row rather than a card: inside a `List` the system already draws
/// the surface, the separator and the disclosure chevron, and drawing them
/// again is both slower and slightly wrong in every way that matters.
struct ExamRow: View {
    let exam: ExamSummary
    let attempt: AttemptSummary?

    var body: some View {
        HStack(spacing: Space.md) {
            VStack(alignment: .leading, spacing: 3) {
                Text(exam.title)
                    .font(.body)
                    .foregroundStyle(Palette.ink)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: Space.sm)

            if let attempt, attempt.isGraded {
                GradePill(attempt: attempt)
            } else {
                Text(attempt == nil ? L.exams.noAttempt : L.exams.notGraded)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
    }

    private var subtitle: String {
        let date = exam.createdAt.formatted(date: .abbreviated, time: .omitted)
        guard let attempt, attempt.isGraded, let percentage = attempt.percentage else { return date }
        return "\(date) · \(Int(percentage.rounded())) %"
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
