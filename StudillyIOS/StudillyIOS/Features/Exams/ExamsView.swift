import SwiftUI

struct ExamsView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.openURL) private var openURL
    @State private var model = DashboardModel()

    var body: some View {
        NavigationStack {
            Group {
                switch model.state {
                case .loading:
                    ScrollView {
                        VStack(spacing: Space.md) {
                            ForEach(0..<5, id: \.self) { _ in SkeletonBlock(height: 78) }
                        }
                        .screenPadding()
                        .padding(.top, Space.lg)
                    }
                case let .failed(message):
                    ErrorStateView(message: message) {
                        Task { model.state = .loading; await model.load(session: session) }
                    }
                case .loaded:
                    if model.exams.isEmpty {
                        EmptyStateView(
                            icon: "doc.text",
                            title: L.exams.noResultsTitle,
                            message: L.exams.noResultsBody,
                            actionTitle: L.dashboard.openWeb
                        ) { openURL(Config.apiBaseURL) }
                    } else {
                        ScrollView {
                            VStack(spacing: Space.md) {
                                ForEach(model.exams) { exam in
                                    let attempt = model.latestAttemptByExam[exam.id]
                                    if let attempt, attempt.isGraded {
                                        NavigationLink {
                                            ResultView(exam: exam, attempt: attempt)
                                        } label: {
                                            ExamRow(exam: exam, attempt: attempt)
                                        }
                                        .buttonStyle(.plain)
                                    } else {
                                        ExamRow(exam: exam, attempt: attempt)
                                    }
                                }
                            }
                            .screenPadding()
                            .padding(.vertical, Space.lg)
                        }
                    }
                }
            }
            .background(Palette.canvas)
            .navigationTitle(L.exams.title)
            .refreshable { await model.load(session: session) }
        }
        .task { await model.load(session: session) }
    }
}

/// A marked exam, task by task.
///
/// The order mirrors the web app's result page: the grade first, because that
/// is what the student came for, then the summary, then each task with its
/// marking scheme. The scheme is the point of the product, so it is shown in
/// full rather than folded away.
struct ResultView: View {
    let exam: ExamSummary
    let attempt: AttemptSummary

    @Environment(SessionStore.self) private var session
    @State private var tasks: [ExamTask] = []
    @State private var evaluations: [String: AnswerEvaluation] = [:]
    @State private var answers: [String: String] = [:]
    @State private var state: LoadState = .loading

    private enum LoadState: Equatable { case loading, loaded, failed(String) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.xl) {
                headline

                if let summary = attempt.feedbackSummary, summary.summary != nil {
                    summaryCard(summary)
                }

                switch state {
                case .loading:
                    VStack(spacing: Space.md) {
                        ForEach(0..<3, id: \.self) { _ in SkeletonBlock(height: 140) }
                    }
                case let .failed(message):
                    ErrorStateView(message: message) { Task { await load() } }
                case .loaded:
                    VStack(alignment: .leading, spacing: Space.md) {
                        Text(L.exams.taskByTask)
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(Palette.ink)

                        ForEach(tasks) { task in
                            TaskResultCard(
                                task: task,
                                evaluation: evaluations[task.id],
                                answer: answers[task.id]
                            )
                        }
                    }
                }
            }
            .screenPadding()
            .padding(.vertical, Space.lg)
        }
        .background(Palette.canvas)
        .navigationTitle(L.exams.result)
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private var headline: some View {
        Card {
            VStack(alignment: .leading, spacing: Space.lg) {
                Text(exam.title)
                    .font(.system(size: 15))
                    .foregroundStyle(Palette.inkMuted)
                    .lineLimit(2)

                HStack(alignment: .bottom, spacing: Space.xl) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(L.exams.gradePoints)
                            .font(.system(size: 13))
                            .foregroundStyle(Palette.inkMuted)
                        Text(attempt.gradeLabel ?? "–")
                            .font(.tabular(40, weight: .semibold))
                            .foregroundStyle(Palette.ink)
                    }

                    Spacer(minLength: 0)

                    VStack(alignment: .trailing, spacing: Space.sm) {
                        stat(L.exams.points, value: "\(format(attempt.pointsAwarded)) / \(format(attempt.pointsPossible))")
                        stat(L.exams.percentage, value: "\(Int((attempt.percentage ?? 0).rounded())) %")
                        stat(L.exams.duration, value: duration)
                    }
                }

                ProgressTrack(
                    value: (attempt.percentage ?? 0) / 100,
                    tone: (attempt.percentage ?? 0) >= 50 ? .success : .warning
                )
            }
        }
    }

    private func stat(_ label: String, value: String) -> some View {
        HStack(spacing: Space.sm) {
            Text(label)
                .font(.system(size: 12))
                .foregroundStyle(Palette.inkSubtle)
            Text(value)
                .font(.tabular(14, weight: .semibold))
                .foregroundStyle(Palette.ink)
        }
    }

    private func summaryCard(_ summary: FeedbackSummary) -> some View {
        Card {
            VStack(alignment: .leading, spacing: Space.lg) {
                Text(L.exams.summary)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Palette.ink)

                if let text = summary.summary {
                    Text(text)
                        .font(.system(size: 15))
                        .foregroundStyle(Palette.inkMuted)
                        .fixedSize(horizontal: false, vertical: true)
                }

                if let strengths = summary.strengths, !strengths.isEmpty {
                    bulletList(L.exams.strengths, items: strengths,
                               icon: "checkmark.circle.fill", tone: .success)
                }
                if let weaknesses = summary.weaknesses, !weaknesses.isEmpty {
                    bulletList(L.exams.weaknesses, items: weaknesses,
                               icon: "minus.circle.fill", tone: .warning)
                }
            }
        }
    }

    private func bulletList(_ title: String, items: [String], icon: String, tone: Tone) -> some View {
        VStack(alignment: .leading, spacing: Space.sm) {
            Text(title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Palette.ink)
            ForEach(items, id: \.self) { item in
                HStack(alignment: .top, spacing: Space.sm) {
                    Image(systemName: icon)
                        .font(.system(size: 13))
                        .foregroundStyle(tone.foreground)
                        .padding(.top, 2)
                    Text(item)
                        .font(.system(size: 14))
                        .foregroundStyle(Palette.inkMuted)
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                }
            }
        }
    }

    private var duration: String {
        let total = attempt.timeSpentSeconds
        return String(format: "%d:%02d:%02d", total / 3600, (total % 3600) / 60, total % 60)
    }

    private func format(_ value: Double?) -> String {
        guard let value else { return "–" }
        return value == value.rounded() ? String(Int(value)) : String(format: "%.1f", value)
    }

    private func load() async {
        state = .loading
        do {
            let token = try await session.validToken()
            async let tasks = StudillyAPI.tasks(token: token, examID: exam.id)
            async let evaluations = StudillyAPI.evaluations(token: token, attemptID: attempt.id)
            async let answers = StudillyAPI.answers(token: token, attemptID: attempt.id)

            self.tasks = try await tasks
            self.evaluations = Dictionary(
                uniqueKeysWithValues: try await evaluations.map { ($0.taskID, $0) }
            )
            self.answers = Dictionary(
                uniqueKeysWithValues: try await answers.map { ($0.taskID, $0.answerText) }
            )
            state = .loaded
        } catch {
            state = .failed((error as? APIError)?.errorDescription ?? L.errors.generic)
        }
    }
}

/// One task: what was asked, what was written, and how each criterion went.
private struct TaskResultCard: View {
    let task: ExamTask
    let evaluation: AnswerEvaluation?
    let answer: String?

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: Space.lg) {
                HStack(spacing: Space.sm) {
                    Text("\(L.pick("Aufgabe", "Task")) \(task.label)")
                        .font(.tabular(14, weight: .semibold))
                        .foregroundStyle(Palette.ink)
                    if let afb = task.afb { Badge(text: "AFB \(afb)") }
                    if let op = task.operatorName { Badge(text: op) }
                    Spacer(minLength: 0)
                    Text("\(format(evaluation?.pointsAwarded ?? 0))/\(format(task.points))")
                        .font(.tabular(14, weight: .semibold))
                        .foregroundStyle(Palette.ink)
                }

                if let evaluation {
                    Badge(text: evaluation.verdictLabel, tone: evaluation.tone)
                }

                Text(task.prompt)
                    .font(.system(size: 15))
                    .foregroundStyle(Palette.ink)
                    .fixedSize(horizontal: false, vertical: true)

                if let answer, !answer.isEmpty {
                    VStack(alignment: .leading, spacing: Space.sm) {
                        Text(L.exams.yourAnswer.uppercased())
                            .font(.system(size: 11, weight: .semibold))
                            .tracking(0.5)
                            .foregroundStyle(Palette.inkSubtle)
                        Text(answer)
                            .font(.system(size: 14))
                            .foregroundStyle(Palette.inkMuted)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(Space.md)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Palette.surfaceSunken)
                            .clipShape(RoundedRectangle(cornerRadius: Radius.control - 2, style: .continuous))
                    }
                }

                if let criteria = evaluation?.criteriaResults, !criteria.isEmpty {
                    VStack(alignment: .leading, spacing: Space.sm) {
                        Text(L.exams.erwartungshorizont.uppercased())
                            .font(.system(size: 11, weight: .semibold))
                            .tracking(0.5)
                            .foregroundStyle(Palette.inkSubtle)

                        ForEach(Array(criteria.enumerated()), id: \.offset) { _, criterion in
                            HStack(alignment: .top, spacing: Space.sm) {
                                Image(systemName: criterion.met ? "checkmark.circle.fill" : "xmark.circle.fill")
                                    .font(.system(size: 14))
                                    .foregroundStyle(criterion.met ? Palette.success : Palette.danger)
                                    .padding(.top, 1)
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(criterion.criterion ?? "")
                                        .font(.system(size: 14))
                                        .foregroundStyle(Palette.inkMuted)
                                        .fixedSize(horizontal: false, vertical: true)
                                    if let note = criterion.note, !note.isEmpty {
                                        Text(note)
                                            .font(.system(size: 12))
                                            .foregroundStyle(Palette.inkSubtle)
                                    }
                                }
                                Spacer(minLength: Space.sm)
                                Text("\(format(criterion.pointsAwarded))/\(format(criterion.pointsPossible))")
                                    .font(.tabular(13))
                                    .foregroundStyle(Palette.inkSubtle)
                            }
                        }
                    }
                }

                if let improvement = evaluation?.improvement, !improvement.isEmpty {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(L.exams.improvement)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Palette.brandText)
                        Text(improvement)
                            .font(.system(size: 14))
                            .foregroundStyle(Palette.inkMuted)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(Space.md)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Palette.brandSoft)
                    .clipShape(RoundedRectangle(cornerRadius: Radius.control - 2, style: .continuous))
                }
            }
        }
    }

    private func format(_ value: Double) -> String {
        value == value.rounded() ? String(Int(value)) : String(format: "%.1f", value)
    }
}
