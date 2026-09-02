import SwiftUI

/// Creating an exam.
///
/// The school context is not asked for: the server reads it from the profile
/// and refuses anything else, because a client that could send its own state
/// and year could ask for an Abitur paper while in year 7 and spend the
/// student's monthly quota on something useless.
struct NewExamView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.dismiss) private var dismiss

    let onCreated: (String) -> Void

    @State private var subjects: [Subject] = []
    @State private var materials: [Material] = []
    @State private var selectedSubject: Subject?
    @State private var selectedMaterials: Set<String> = []
    @State private var difficulty = "standard"
    @State private var durationMinutes = 90
    @State private var taskCount = 5
    @State private var isLoading = true
    @State private var isCreating = false
    @State private var error: String?

    private var readyMaterials: [Material] {
        materials.filter { $0.isReady && ($0.subjectID == nil || $0.subjectID == selectedSubject?.id) }
    }

    private var canCreate: Bool {
        selectedSubject != nil && !selectedMaterials.isEmpty && !isCreating
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    VStack(spacing: Space.lg) {
                        ForEach(0..<4, id: \.self) { _ in SkeletonBlock(height: 60) }
                        Spacer(minLength: 0)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                    .screenPadding()
                    .padding(.top, Space.xl)
                } else if isCreating {
                    GeneratingView(subject: selectedSubject?.name ?? "")
                } else {
                    form
                }
            }
            .screenBackground()
            .navigationTitle(L.exams.newTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if !isCreating {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(L.common.cancel) { dismiss() }
                    }
                }
            }
        }
        .interactiveDismissDisabled(isCreating)
        .task { await load() }
    }

    /// A native Form.
    ///
    /// Pickers, steppers and multi-select rows are all system controls here:
    /// they behave the way every other iOS form does, they inherit Dynamic
    /// Type and VoiceOver for free, and there is far less of the app's own
    /// code between the student and the setting they are changing.
    private var form: some View {
        Form {
            if let error {
                Section {
                    Label(error, systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(Palette.danger)
                }
            }

            Section(L.exams.subject) {
                Picker(L.exams.subject, selection: $selectedSubject) {
                    ForEach(subjects) { subject in
                        Text(subject.name).tag(Optional(subject))
                    }
                }
                .pickerStyle(.menu)
            }

            Section {
                if readyMaterials.isEmpty {
                    Label(L.exams.noMaterialsBody, systemImage: "info.circle")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(readyMaterials) { material in
                        Button {
                            toggle(material)
                        } label: {
                            HStack {
                                Text(material.title).foregroundStyle(Palette.ink)
                                Spacer()
                                if selectedMaterials.contains(material.id) {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(Palette.brand)
                                        .fontWeight(.semibold)
                                }
                            }
                        }
                    }
                }
            } header: {
                Text(L.exams.materials)
            } footer: {
                if !selectedMaterials.isEmpty {
                    Text(L.exams.selectedCount(selectedMaterials.count))
                }
            }

            Section(L.exams.difficulty) {
                Picker(L.exams.difficulty, selection: $difficulty) {
                    Text(L.exams.easy).tag("einfach")
                    Text(L.exams.standard).tag("standard")
                    Text(L.exams.hard).tag("anspruchsvoll")
                }
                .pickerStyle(.segmented)
                .labelsHidden()
            }

            Section {
                Stepper(value: $durationMinutes, in: 15...300, step: 15) {
                    LabeledContent(L.exams.timeAllowed, value: "\(durationMinutes) min")
                }
                Stepper(value: $taskCount, in: 2...15) {
                    LabeledContent(L.exams.taskCount, value: "\(taskCount)")
                }
            }

            Section {
                Button { Task { await create() } } label: {
                    ButtonLabel(title: L.exams.create, icon: "sparkles")
                }
                .primaryButton(enabled: canCreate)
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
            }
        }
    }

    private func toggle(_ material: Material) {
        if selectedMaterials.contains(material.id) {
            selectedMaterials.remove(material.id)
        } else if selectedMaterials.count < 10 {
            selectedMaterials.insert(material.id)
        }
    }

    private func load() async {
        do {
            let token = try await session.validToken()
            async let subjects = StudillyAPI.subjects(token: token)
            async let materials = StudillyAPI.materials(token: token)
            self.subjects = try await subjects
            self.materials = try await materials
            selectedSubject = self.subjects.first
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? L.errors.generic
        }
        isLoading = false
    }

    private func create() async {
        guard let subject = selectedSubject else { return }
        error = nil
        isCreating = true
        do {
            let token = try await session.validToken()
            let examID = try await BackendAPI.createExam(
                token: token,
                body: .init(
                    title: nil,
                    subjectId: subject.id,
                    materialIds: Array(selectedMaterials),
                    topics: [],
                    difficulty: difficulty,
                    durationMinutes: durationMinutes,
                    taskCount: taskCount
                )
            )
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            onCreated(examID)
            dismiss()
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? L.errors.generic
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            isCreating = false
        }
    }
}

/// Shown while the model writes the paper.
///
/// It takes tens of seconds, so the screen says what is happening in stages
/// rather than spinning: a spinner for a minute reads as a hang.
private struct GeneratingView: View {
    let subject: String
    @State private var stage = 0
    @State private var pulse = false

    private var stages: [String] {
        [
            L.exams.stageReading,
            L.exams.stageDrafting,
            L.exams.stageMarking,
        ]
    }

    var body: some View {
        VStack(spacing: Space.xxl) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Palette.brandSoft)
                    .frame(width: 96, height: 96)
                    .scaleEffect(pulse ? 1.08 : 0.95)
                Image(systemName: "sparkles")
                    .font(.system(size: 34, weight: .light))
                    .foregroundStyle(Palette.brandText)
            }

            VStack(spacing: Space.sm) {
                Text(L.exams.generating)
                    .font(.display(22))
                    .foregroundStyle(Palette.ink)
                Text(stages[min(stage, stages.count - 1)])
                    .font(.system(size: 15))
                    .foregroundStyle(Palette.inkMuted)
                    .contentTransition(.opacity)
                    .id(stage)
                    .transition(.opacity)
            }
            .multilineTextAlignment(.center)

            Spacer()

            Text(L.exams.generatingNote)
                .font(.system(size: 13))
                .foregroundStyle(Palette.inkSubtle)
                .multilineTextAlignment(.center)
                .screenPadding()
                .padding(.bottom, Space.xxl)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1.4).repeatForever(autoreverses: true)) {
                pulse = true
            }
        }
        .task {
            for delay in [9, 22] {
                try? await Task.sleep(for: .seconds(delay))
                withAnimation(.easeInOut(duration: 0.4)) { stage += 1 }
            }
        }
    }
}
