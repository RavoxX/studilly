import Combine
import SwiftUI

/// Writing the exam.
///
/// A distraction-free mode: no tab bar, no back button that could be pressed
/// by accident, one task at a time with a clock and a pager. Answers are saved
/// as they are written, so a phone call or a flat battery costs at most the
/// last sentence rather than the paper.
@MainActor
@Observable
final class ExamRunnerModel {
    var tasks: [ExamTask] = []
    var answers: [String: String] = [:]
    var current = 0
    var elapsed = 0
    var isSubmitting = false
    var isLoading = true
    var error: String?
    var attemptID: String?
    var finishedAttemptID: String?

    private var savingTask: Task<Void, Never>?

    var currentTask: ExamTask? {
        tasks.indices.contains(current) ? tasks[current] : nil
    }

    var answeredCount: Int {
        tasks.filter { !(answers[$0.id] ?? "").trimmingCharacters(in: .whitespaces).isEmpty }.count
    }

    func start(session: SessionStore, exam: ExamSummary) async {
        do {
            let token = try await session.validToken()
            let started = try await BackendAPI.startAttempt(token: token, examID: exam.id)
            attemptID = started.attemptId
            tasks = try await StudillyAPI.tasks(token: token, examID: exam.id)

            // Resuming: whatever was already written comes back with it.
            if started.resumed {
                let saved = try await StudillyAPI.answers(token: token, attemptID: started.attemptId)
                answers = Dictionary(uniqueKeysWithValues: saved.map { ($0.taskID, $0.answerText) })
            }
            isLoading = false
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? L.errors.generic
            isLoading = false
        }
    }

    /// Debounced: a save on every keystroke would be a request per character.
    func scheduleSave(session: SessionStore, taskID: String) {
        savingTask?.cancel()
        savingTask = Task {
            try? await Task.sleep(for: .seconds(1.2))
            guard !Task.isCancelled else { return }
            await save(session: session, taskID: taskID)
        }
    }

    func save(session: SessionStore, taskID: String) async {
        guard
            let attemptID,
            let userID = session.currentSession?.auth.userID,
            let text = answers[taskID]
        else { return }
        guard let token = try? await session.validToken() else { return }
        try? await StudillyAPI.saveAnswer(
            token: token, userID: userID, attemptID: attemptID, taskID: taskID, text: text
        )
    }

    func submit(session: SessionStore) async {
        guard let attemptID else { return }
        isSubmitting = true

        // Flush whatever is in the field before the window closes: the server
        // stops accepting answers the moment the attempt is submitted.
        savingTask?.cancel()
        if let taskID = currentTask?.id { await save(session: session, taskID: taskID) }

        do {
            let token = try await session.validToken()
            _ = try await BackendAPI.submitAttempt(
                token: token, attemptID: attemptID, timeSpentSeconds: elapsed
            )
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            finishedAttemptID = attemptID
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? L.errors.generic
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            isSubmitting = false
        }
    }
}

struct ExamRunnerView: View {
    let exam: ExamSummary

    @Environment(SessionStore.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model = ExamRunnerModel()
    @State private var showSubmit = false
    @State private var showLeave = false
    @FocusState private var answerFocused: Bool


    var body: some View {
        NavigationStack {
            Group {
                if model.isLoading {
                    VStack(spacing: Space.lg) {
                        ProgressView()
                        Text(L.exams.preparing)
                            .font(.system(size: 15))
                            .foregroundStyle(Palette.inkMuted)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if model.isSubmitting {
                    MarkingView()
                } else if let error = model.error, model.tasks.isEmpty {
                    ContentUnavailableView {
                        Label(L.errors.title, systemImage: "wifi.exclamationmark")
                    } description: {
                        Text(error)
                    } actions: {
                        Button(L.common.retry) { Task { model.isLoading = true; await model.start(session: session, exam: exam) } }
                            .buttonStyle(.borderedProminent)
                    }
                } else {
                    runner
                }
            }
            .screenBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 1) {
                        Text(exam.title)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Palette.ink)
                            .lineLimit(1)
                        // Only this label redraws each second. Ticking a
                        // property on the shared model instead invalidated the
                        // whole runner, text editor included, once a second.
                        ExamClock(model: model, limitSeconds: exam.durationMinutes * 60)
                    }
                }
                if !model.isSubmitting && !model.isLoading {
                    ToolbarItem(placement: .topBarLeading) {
                        Button(L.exams.leave) { showLeave = true }
                            .foregroundStyle(Palette.inkMuted)
                    }
                }
            }
        }
        .interactiveDismissDisabled()
        .task { await model.start(session: session, exam: exam) }
        .onChange(of: model.finishedAttemptID) { _, id in
            if id != nil { dismiss() }
        }
        .confirmationDialog(L.exams.leaveTitle, isPresented: $showLeave, titleVisibility: .visible) {
            Button(L.exams.leaveConfirm) { dismiss() }
            Button(L.common.cancel, role: .cancel) {}
        } message: {
            Text(L.exams.leaveBody)
        }
        .confirmationDialog(L.exams.submitTitle, isPresented: $showSubmit, titleVisibility: .visible) {
            Button(L.exams.submit) { Task { await model.submit(session: session) } }
            Button(L.common.cancel, role: .cancel) {}
        } message: {
            Text(L.exams.submitBody(model.answeredCount, model.tasks.count))
        }
    }

    private var runner: some View {
        VStack(spacing: 0) {
            TaskPager(
                tasks: model.tasks,
                current: model.current,
                answers: model.answers
            ) { index in
                answerFocused = false
                withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) { model.current = index }
            }

            Divider().overlay(Palette.line)

            ScrollView {
                if let task = model.currentTask {
                    VStack(alignment: .leading, spacing: Space.xl) {
                        HStack(spacing: Space.sm) {
                            Text("\(L.pick("Aufgabe", "Task")) \(task.label)")
                                .font(.tabular(15, weight: .semibold))
                                .foregroundStyle(Palette.ink)
                            if let afb = task.afb { Badge(text: "AFB \(afb)") }
                            if let op = task.operatorName { Badge(text: op) }
                            Spacer(minLength: 0)
                            Text("\(format(task.points)) \(L.pick("P.", "pts"))")
                                .font(.tabular(13))
                                .foregroundStyle(Palette.inkSubtle)
                        }

                        Text(task.prompt)
                            .font(.system(size: 17))
                            .foregroundStyle(Palette.ink)
                            .fixedSize(horizontal: false, vertical: true)

                        AnswerEditor(
                            taskID: task.id,
                            initialText: model.answers[task.id] ?? "",
                            isFocused: $answerFocused
                        ) { text in
                            model.answers[task.id] = text
                            model.scheduleSave(session: session, taskID: task.id)
                        }
                    }
                    .screenPadding()
                    .padding(.vertical, Space.xl)
                    .id(task.id)
                    .transition(.opacity)
                }
            }
            .scrollDismissesKeyboard(.interactively)

            footer
        }
    }

    private var footer: some View {
        VStack(spacing: 0) {
            Divider().overlay(Palette.line)
            HStack(spacing: Space.md) {
                StudillyButton(
                    title: L.common.back, kind: .ghost, icon: "chevron.left",
                    isEnabled: model.current > 0, fullWidth: false
                ) {
                    answerFocused = false
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) { model.current -= 1 }
                }

                Spacer(minLength: 0)

                if model.current < model.tasks.count - 1 {
                    StudillyButton(
                        title: L.common.next, trailingIcon: "chevron.right", fullWidth: false
                    ) {
                        answerFocused = false
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) { model.current += 1 }
                    }
                } else {
                    StudillyButton(title: L.exams.submit, fullWidth: false) { showSubmit = true }
                }
            }
            .screenPadding()
            .padding(.vertical, Space.md)
        }
        .background(.bar)
    }

    private func format(_ value: Double) -> String {
        value == value.rounded() ? String(Int(value)) : String(format: "%.1f", value)
    }
}

/// The task strip. Shows which are answered, so nothing is handed in blank by
/// accident.
private struct TaskPager: View {
    let tasks: [ExamTask]
    let current: Int
    let answers: [String: String]
    let onSelect: (Int) -> Void

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Space.sm) {
                    ForEach(Array(tasks.enumerated()), id: \.element.id) { index, task in
                        let answered = !(answers[task.id] ?? "")
                            .trimmingCharacters(in: .whitespaces).isEmpty
                        Button { onSelect(index) } label: {
                            HStack(spacing: 5) {
                                if answered {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 10, weight: .bold))
                                }
                                Text(task.label)
                                    .font(.tabular(14, weight: .medium))
                            }
                            .foregroundStyle(index == current ? Palette.onBrand
                                             : answered ? Palette.success : Palette.inkMuted)
                            .padding(.horizontal, Space.md)
                            .padding(.vertical, Space.sm)
                            .background(index == current ? Palette.brand
                                        : answered ? Palette.successSoft : Palette.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 9, style: .continuous)
                                    .strokeBorder(index == current ? .clear : Palette.line, lineWidth: 1)
                            )
                        }
                        .buttonStyle(.plain)
                        .id(index)
                    }
                }
                .screenPadding()
                .padding(.vertical, Space.md)
            }
            .onChange(of: current) { _, index in
                withAnimation(.easeOut(duration: 0.25)) { proxy.scrollTo(index, anchor: .center) }
            }
        }
    }
}

/// Shown while the paper is marked. The clock has already stopped.
private struct MarkingView: View {
    @State private var stage = 0
    @State private var pulse = false

    private var stages: [String] {
        [L.exams.markingReading, L.exams.markingCriteria, L.exams.markingGrade]
    }

    var body: some View {
        VStack(spacing: Space.xxl) {
            Spacer()
            ZStack {
                Circle().fill(Palette.brandSoft).frame(width: 96, height: 96)
                    .scaleEffect(pulse ? 1.08 : 0.95)
                Image(systemName: "checkmark.seal")
                    .font(.system(size: 34, weight: .light))
                    .foregroundStyle(Palette.brandText)
            }
            VStack(spacing: Space.sm) {
                Text(L.exams.marking)
                    .font(.display(22))
                    .foregroundStyle(Palette.ink)
                Text(stages[min(stage, stages.count - 1)])
                    .font(.system(size: 15))
                    .foregroundStyle(Palette.inkMuted)
                    .id(stage)
                    .transition(.opacity)
            }
            Spacer()
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1.4).repeatForever(autoreverses: true)) { pulse = true }
        }
        .task {
            for delay in [8, 18] {
                try? await Task.sleep(for: .seconds(delay))
                withAnimation(.easeInOut(duration: 0.4)) { stage += 1 }
            }
        }
    }
}

/// The running clock, isolated.
///
/// It owns its own timer and its own state, so a tick repaints six characters
/// rather than the screen behind them. The model is told the elapsed time only
/// when the paper is handed in, which is the one moment it matters.
private struct ExamClock: View {
    let model: ExamRunnerModel
    let limitSeconds: Int

    @State private var elapsed = 0
    private let tick = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        Text(label)
            .font(.system(size: 12, design: .monospaced))
            .foregroundStyle(elapsed > limitSeconds ? Palette.warning : Palette.inkSubtle)
            .onReceive(tick) { _ in
                guard !model.isSubmitting else { return }
                elapsed += 1
                model.elapsed = elapsed
            }
    }

    private var label: String {
        String(format: "%d:%02d:%02d", elapsed / 3600, (elapsed % 3600) / 60, elapsed % 60)
    }
}

/// The answer field.
///
/// It holds the text itself and hands it up on a pause rather than on every
/// keystroke. Writing each character straight into the model invalidated
/// everything observing it, including the task pager above, which reads the
/// answers to decide which tasks are ticked: typing one sentence rebuilt that
/// strip forty times.
private struct AnswerEditor: View {
    let taskID: String
    let initialText: String
    @FocusState.Binding var isFocused: Bool
    let onChange: (String) -> Void

    @State private var text = ""
    @State private var settle: Task<Void, Never>?

    var body: some View {
        VStack(alignment: .leading, spacing: Space.sm) {
            Text(L.exams.yourAnswer)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(Palette.ink)

            TextEditor(text: $text)
                .font(.system(size: 16))
                .foregroundStyle(Palette.ink)
                .scrollContentBackground(.hidden)
                .frame(minHeight: 220)
                .padding(Space.md)
                .background(Palette.surface)
                .clipShape(RoundedRectangle(cornerRadius: Radius.control, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                        .strokeBorder(isFocused ? Palette.brand : Palette.lineStrong,
                                      lineWidth: isFocused ? 2 : 1)
                )
                .focused($isFocused)
                .animation(.easeOut(duration: 0.15), value: isFocused)
        }
        .onAppear { text = initialText }
        .onChange(of: taskID) { _, _ in text = initialText }
        .onChange(of: text) { _, new in
            settle?.cancel()
            settle = Task {
                try? await Task.sleep(for: .milliseconds(400))
                guard !Task.isCancelled else { return }
                onChange(new)
            }
        }
        .onDisappear {
            settle?.cancel()
            onChange(text)
        }
    }
}
