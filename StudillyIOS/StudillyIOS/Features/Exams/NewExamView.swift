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

    private var form: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.xl) {
                if let error { Banner(message: error, tone: .danger) }

                StudillyField(label: L.exams.subject, isRequired: true) {
                    PickerBox(
                        placeholder: L.exams.subjectPlaceholder,
                        selection: selectedSubject?.name
                    ) {
                        ForEach(subjects) { subject in
                            Button(subject.name) {
                                selectedSubject = subject
                                // A material tied to another subject cannot
                                // stay chosen once the subject changes.
                                selectedMaterials = selectedMaterials.filter { id in
                                    materials.first { $0.id == id }.map {
                                        $0.subjectID == nil || $0.subjectID == subject.id
                                    } ?? false
                                }
                            }
                        }
                    }
                }

                VStack(alignment: .leading, spacing: Space.md) {
                    HStack {
                        Text(L.exams.materials)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Palette.ink)
                        Text("*").foregroundStyle(Palette.danger)
                        Spacer()
                        if !selectedMaterials.isEmpty {
                            Text("\(selectedMaterials.count)")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(Palette.brandText)
                        }
                    }

                    if readyMaterials.isEmpty {
                        Banner(message: L.exams.noMaterialsBody, title: L.exams.noMaterials, tone: .warning)
                    } else {
                        VStack(spacing: Space.sm) {
                            ForEach(readyMaterials) { material in
                                MaterialPickRow(
                                    material: material,
                                    isSelected: selectedMaterials.contains(material.id)
                                ) {
                                    withAnimation(.spring(response: 0.28, dampingFraction: 0.8)) {
                                        if selectedMaterials.contains(material.id) {
                                            selectedMaterials.remove(material.id)
                                        } else if selectedMaterials.count < 10 {
                                            selectedMaterials.insert(material.id)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                StudillyField(label: L.exams.difficulty) {
                    SegmentedRow(
                        options: [
                            ("einfach", L.exams.easy),
                            ("standard", L.exams.standard),
                            ("anspruchsvoll", L.exams.hard),
                        ],
                        selection: difficulty
                    ) { difficulty = $0 }
                }

                StudillyField(label: L.exams.timeAllowed) {
                    StepperRow(
                        value: $durationMinutes, range: 15...300, step: 15,
                        format: { "\($0) min" }
                    )
                }

                StudillyField(label: L.exams.taskCount) {
                    StepperRow(value: $taskCount, range: 2...15, step: 1, format: { "\($0)" })
                }

                StudillyButton(
                    title: L.exams.create,
                    icon: "sparkles",
                    isEnabled: canCreate
                ) { Task { await create() } }
                .padding(.top, Space.sm)
            }
            .screenPadding()
            .padding(.vertical, Space.xl)
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

private struct MaterialPickRow: View {
    let material: Material
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: Space.md) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 20))
                    .foregroundStyle(isSelected ? Palette.brand : Palette.lineStrong)
                Text(material.title)
                    .font(.system(size: 15))
                    .foregroundStyle(Palette.ink)
                    .lineLimit(1)
                Spacer(minLength: 0)
                Text(material.sizeLabel)
                    .font(.system(size: 12))
                    .foregroundStyle(Palette.inkSubtle)
            }
            .padding(.horizontal, Space.lg)
            .padding(.vertical, Space.md)
            .background(isSelected ? Palette.brandSoft : Palette.surface)
            .clipShape(RoundedRectangle(cornerRadius: Radius.control, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                    .strokeBorder(isSelected ? Palette.brand : Palette.line, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

private struct StepperRow: View {
    @Binding var value: Int
    let range: ClosedRange<Int>
    let step: Int
    let format: (Int) -> String

    var body: some View {
        FieldBox {
            HStack {
                Text(format(value))
                    .font(.system(size: 17))
                    .foregroundStyle(Palette.ink)
                    .contentTransition(.numericText())
                Spacer()
                HStack(spacing: Space.xs) {
                    stepButton("minus") {
                        value = max(range.lowerBound, value - step)
                    }
                    stepButton("plus") {
                        value = min(range.upperBound, value + step)
                    }
                }
            }
        }
    }

    private func stepButton(_ icon: String, action: @escaping () -> Void) -> some View {
        Button {
            UISelectionFeedbackGenerator().selectionChanged()
            withAnimation(.snappy(duration: 0.2)) { action() }
        } label: {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Palette.ink)
                .frame(width: 34, height: 34)
                .background(Palette.surfaceSunken)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}
