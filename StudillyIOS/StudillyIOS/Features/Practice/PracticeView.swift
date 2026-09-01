import SwiftUI

@MainActor
@Observable
final class PracticeModel {
    enum State: Equatable { case loading, loaded, failed(String) }

    var state: State = .loading
    var sets: [PracticeSet] = []
    var weaknesses: [Weakness] = []
    var isCreating = false
    var error: String?

    func load(session: SessionStore) async {
        do {
            let token = try await session.validToken()
            async let sets = StudillyAPI.practiceSets(token: token)
            async let weaknesses = StudillyAPI.weaknesses(token: token)
            self.sets = try await sets
            self.weaknesses = try await weaknesses
            state = .loaded
        } catch {
            state = .failed((error as? APIError)?.errorDescription ?? L.errors.generic)
        }
    }

    func create(session: SessionStore, weaknessID: String?) async -> String? {
        isCreating = true
        error = nil
        defer { isCreating = false }
        do {
            let token = try await session.validToken()
            let setID = try await BackendAPI.createPracticeSet(
                token: token, weaknessID: weaknessID, questionCount: 5
            )
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            await load(session: session)
            return setID
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? L.errors.generic
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return nil
        }
    }
}

struct PracticeView: View {
    @Environment(SessionStore.self) private var session
    @State private var model = PracticeModel()
    @State private var showSettings = false
    @State private var openSetID: String?

    var body: some View {
        NavigationStack {
            Group {
                switch model.state {
                case .loading:
                    ScrollView {
                        VStack(spacing: Space.md) {
                            ForEach(0..<4, id: \.self) { _ in SkeletonBlock(height: 72) }
                        }
                        .screenPadding().padding(.top, Space.lg)
                    }
                case let .failed(message):
                    ErrorStateView(message: message) {
                        Task { model.state = .loading; await model.load(session: session) }
                    }
                case .loaded:
                    content
                }
            }
            .screenBackground()
            .navigationTitle(L.practice.title)
            .toolbar { SettingsToolbarButton(isPresented: $showSettings) }
            .refreshable { await model.load(session: session) }
            .navigationDestination(item: $openSetID) { setID in
                PracticeRunnerView(setID: setID)
            }
        }
        .sheet(isPresented: $showSettings) { SettingsView() }
        .task { await model.load(session: session) }
    }

    private var content: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.xl) {
                if let error = model.error { Banner(message: error, tone: .danger) }

                if !model.weaknesses.isEmpty {
                    VStack(alignment: .leading, spacing: Space.md) {
                        Text(L.practice.focusAreas)
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(Palette.ink)

                        ForEach(model.weaknesses.prefix(5)) { weakness in
                            WeaknessRow(weakness: weakness, isBusy: model.isCreating) {
                                Task { openSetID = await model.create(session: session, weaknessID: weakness.id) }
                            }
                        }
                    }
                }

                VStack(alignment: .leading, spacing: Space.md) {
                    HStack {
                        Text(L.practice.sets)
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(Palette.ink)
                        Spacer()
                    }

                    if model.sets.isEmpty {
                        EmptyStateView(
                            icon: "target",
                            title: L.practice.emptyTitle,
                            message: model.weaknesses.isEmpty
                                ? L.practice.emptyBodyNoWeakness : L.practice.emptyBody,
                            actionTitle: model.weaknesses.isEmpty ? nil : L.practice.createSet
                        ) {
                            Task { openSetID = await model.create(session: session, weaknessID: nil) }
                        }
                    } else {
                        ForEach(model.sets) { set in
                            Button { openSetID = set.id } label: { PracticeSetRow(set: set) }
                                .buttonStyle(.plain)
                        }
                    }
                }

                if !model.sets.isEmpty {
                    StudillyButton(
                        title: L.practice.createSet, kind: .secondary,
                        icon: "plus", isLoading: model.isCreating
                    ) {
                        Task { openSetID = await model.create(session: session, weaknessID: nil) }
                    }
                }
            }
            .screenPadding()
            .padding(.vertical, Space.lg)
        }
    }
}

private struct WeaknessRow: View {
    let weakness: Weakness
    let isBusy: Bool
    let onPractise: () -> Void

    var body: some View {
        Card(padding: Space.lg) {
            HStack(spacing: Space.lg) {
                VStack(alignment: .leading, spacing: 5) {
                    Text(weakness.topicLabel)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Palette.ink)
                        .lineLimit(2)
                    HStack(spacing: Space.xs) {
                        Image(systemName: weakness.trendIcon)
                            .font(.system(size: 11, weight: .semibold))
                        Text(weakness.trendLabel)
                            .font(.system(size: 13))
                    }
                    .foregroundStyle(weakness.tone.foreground)
                }
                Spacer(minLength: 0)
                Button(action: onPractise) {
                    Text(L.practice.practise)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Palette.brandText)
                        .padding(.horizontal, Space.lg)
                        .padding(.vertical, Space.sm)
                        .background(Palette.brandSoft)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .disabled(isBusy)
            }
        }
    }
}

private struct PracticeSetRow: View {
    let set: PracticeSet

    var body: some View {
        Card(padding: Space.lg) {
            HStack(spacing: Space.lg) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(set.title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Palette.ink)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    Text(set.createdAt.formatted(date: .abbreviated, time: .omitted))
                        .font(.system(size: 13))
                        .foregroundStyle(Palette.inkSubtle)
                }
                Spacer(minLength: 0)
                if set.isDone {
                    Badge(text: L.practice.done, tone: .success)
                }
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Palette.inkSubtle)
            }
        }
    }
}

/// Working through a practice set: one question at a time, checked as you go.
///
/// Unlike an exam, each answer is marked immediately: practice is for finding
/// out now, not at the end.
struct PracticeRunnerView: View {
    let setID: String

    @Environment(SessionStore.self) private var session
    @State private var questions: [PracticeQuestion] = []
    @State private var current = 0
    @State private var answer = ""
    @State private var result: BackendAPI.CheckResult?
    @State private var isChecking = false
    @State private var isLoading = true
    @State private var error: String?
    @FocusState private var focused: Bool

    private var question: PracticeQuestion? {
        questions.indices.contains(current) ? questions[current] : nil
    }

    var body: some View {
        Group {
            if isLoading {
                VStack(spacing: Space.lg) { ProgressView() }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error, questions.isEmpty {
                ErrorStateView(message: error) { Task { await load() } }
            } else if let question {
                content(question)
            }
        }
        .screenBackground()
        .navigationTitle(L.practice.title)
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func content(_ question: PracticeQuestion) -> some View {
        VStack(spacing: 0) {
            ProgressTrack(value: Double(current + 1) / Double(max(questions.count, 1)))
                .screenPadding()
                .padding(.vertical, Space.md)

            ScrollView {
                VStack(alignment: .leading, spacing: Space.xl) {
                    HStack(spacing: Space.sm) {
                        Text(L.practice.questionOf(current + 1, questions.count))
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Palette.inkSubtle)
                        if let afb = question.afb { Badge(text: "AFB \(afb)") }
                        if let op = question.operatorName { Badge(text: op) }
                    }

                    Text(question.prompt)
                        .font(.system(size: 17))
                        .foregroundStyle(Palette.ink)
                        .fixedSize(horizontal: false, vertical: true)

                    TextEditor(text: $answer)
                        .font(.system(size: 16))
                        .foregroundStyle(Palette.ink)
                        .scrollContentBackground(.hidden)
                        .frame(minHeight: 160)
                        .padding(Space.md)
                        .background(Palette.surface)
                        .clipShape(RoundedRectangle(cornerRadius: Radius.control, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                                .strokeBorder(focused ? Palette.brand : Palette.lineStrong,
                                              lineWidth: focused ? 2 : 1)
                        )
                        .focused($focused)
                        .disabled(result != nil)
                        .animation(.easeOut(duration: 0.15), value: focused)

                    if let result {
                        VStack(alignment: .leading, spacing: Space.md) {
                            Badge(text: result.label, tone: result.tone)
                            if let explanation = result.explanation, !explanation.isEmpty {
                                Text(explanation)
                                    .font(.system(size: 15))
                                    .foregroundStyle(Palette.inkMuted)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            if let improvement = result.improvement, !improvement.isEmpty {
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
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                    }
                }
                .screenPadding()
                .padding(.bottom, Space.xl)
                .id(question.id)
            }
            .scrollDismissesKeyboard(.interactively)
            .animation(.spring(response: 0.35, dampingFraction: 0.85), value: result)

            VStack(spacing: 0) {
                Divider().overlay(Palette.line)
                Group {
                    if result == nil {
                        StudillyButton(
                            title: L.practice.check,
                            isLoading: isChecking,
                            isEnabled: !answer.trimmingCharacters(in: .whitespaces).isEmpty
                        ) { Task { await check(question) } }
                    } else if current < questions.count - 1 {
                        StudillyButton(title: L.common.next, trailingIcon: "chevron.right") {
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                                current += 1
                                answer = ""
                                result = nil
                            }
                        }
                    } else {
                        StudillyButton(title: L.common.done) { }
                            .disabled(true)
                    }
                }
                .screenPadding()
                .padding(.vertical, Space.md)
            }
            .background(.bar)
        }
    }

    private func load() async {
        isLoading = true
        do {
            let token = try await session.validToken()
            questions = try await StudillyAPI.practiceQuestions(token: token, setID: setID)
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? L.errors.generic
        }
        isLoading = false
    }

    private func check(_ question: PracticeQuestion) async {
        isChecking = true
        focused = false
        do {
            let token = try await session.validToken()
            result = try await BackendAPI.checkPractice(
                token: token, questionID: question.id, answer: answer
            )
            UINotificationFeedbackGenerator().notificationOccurred(
                result?.tone == .success ? .success : .warning
            )
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? L.errors.generic
        }
        isChecking = false
    }
}
