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

    func delete(session: SessionStore, set: PracticeSet) async {
        do {
            let token = try await session.validToken()
            try await StudillyAPI.deletePracticeSet(token: token, setID: set.id)
            sets.removeAll { $0.id == set.id }
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch let failure {
            error = (failure as? APIError)?.errorDescription ?? L.errors.generic
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
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
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
        List {
            if let error = model.error {
                Section {
                    Label(error, systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(Palette.danger)
                }
            }

            if !model.weaknesses.isEmpty {
                Section(L.practice.focusAreas) {
                    ForEach(model.weaknesses.prefix(5)) { weakness in
                        WeaknessRow(weakness: weakness, isBusy: model.isCreating) {
                            Task { openSetID = await model.create(session: session, weaknessID: weakness.id) }
                        }
                    }
                }
            }

            if !model.sets.isEmpty {
                Section(L.practice.sets) {
                    ForEach(model.sets) { set in
                        NavigationLink { PracticeRunnerView(setID: set.id) } label: {
                            PracticeSetRow(set: set)
                        }
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                Task { await model.delete(session: session, set: set) }
                            } label: {
                                Label(L.common.delete, systemImage: "trash")
                            }
                        }
                    }
                }
            }

            Section {
                Button {
                    Task { openSetID = await model.create(session: session, weaknessID: nil) }
                } label: {
                    ButtonLabel(title: L.practice.createSet, icon: "plus", isLoading: model.isCreating)
                }
                .primaryButton(enabled: !model.isCreating)
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
            }
        }
        .listStyle(.insetGrouped)
        .overlay {
            if model.sets.isEmpty && model.weaknesses.isEmpty {
                ContentUnavailableView {
                    Label(L.practice.emptyTitle, systemImage: "target")
                } description: {
                    Text(L.practice.emptyBodyNoWeakness)
                }
            }
        }
    }
}

private struct WeaknessRow: View {
    let weakness: Weakness
    let isBusy: Bool
    let onPractise: () -> Void

    var body: some View {
        HStack(spacing: Space.md) {
            VStack(alignment: .leading, spacing: 3) {
                Text(weakness.topicLabel).font(.body).lineLimit(2)
                Label(weakness.trendLabel, systemImage: weakness.trendIcon)
                    .font(.caption)
                    .foregroundStyle(weakness.tone.foreground)
            }
            Spacer(minLength: Space.sm)
            Button(L.practice.practise, action: onPractise)
                .buttonStyle(.bordered)
                .disabled(isBusy)
        }
        .padding(.vertical, 2)
    }
}

private struct PracticeSetRow: View {
    let set: PracticeSet

    var body: some View {
        HStack(spacing: Space.md) {
            VStack(alignment: .leading, spacing: 2) {
                Text(set.title).font(.body).lineLimit(2).multilineTextAlignment(.leading)
                Text(set.createdAt.formatted(date: .abbreviated, time: .omitted))
                    .font(.caption).foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
            if set.isDone {
                Image(systemName: "checkmark.circle.fill").foregroundStyle(Palette.success)
            }
        }
        .padding(.vertical, 2)
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
                ContentUnavailableView {
                    Label(L.errors.title, systemImage: "wifi.exclamationmark")
                } description: {
                    Text(error)
                } actions: {
                    Button(L.common.retry) { Task { await load() } }
                        .buttonStyle(.borderedProminent)
                }
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

                    // Same reason as the exam runner: a TextEditor is a
                    // scroll view, and nesting one inside another makes typing
                    // re-run both layouts.
                    TextField("", text: $answer, axis: .vertical)
                        .font(.system(size: 16))
                        .foregroundStyle(Palette.ink)
                        .lineLimit(6...)
                        .textInputAutocapitalization(.sentences)
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
