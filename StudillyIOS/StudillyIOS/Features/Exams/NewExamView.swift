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
                    // The three most recent, plus whatever is already ticked
                    // so a selection never disappears off the form. Everything
                    // else lives behind the picker, which has a search field:
                    // a term's worth of uploads is a scroll, not a chooser.
                    ForEach(shortlist) { material in
                        MaterialToggle(
                            material: material,
                            isSelected: selectedMaterials.contains(material.id),
                            action: { toggle(material) }
                        )
                    }

                    if readyMaterials.count > shortlist.count {
                        NavigationLink {
                            MaterialPicker(
                                materials: readyMaterials,
                                selection: $selectedMaterials
                            )
                        } label: {
                            LabeledContent(
                                L.exams.allMaterials,
                                value: String(readyMaterials.count)
                            )
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

    /// The three newest, with anything already chosen kept alongside so a
    /// tick never vanishes when the list is trimmed.
    private var shortlist: [Material] {
        let recent = readyMaterials.prefix(3)
        let chosen = readyMaterials.filter {
            selectedMaterials.contains($0.id) && !recent.contains($0)
        }
        return Array(recent) + chosen
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
/// It takes half a minute or so, which is long enough that a spinner reads as
/// a hang. The three stages are what is actually happening, ticked off as they
/// pass, so the wait has a shape and an end.
private struct GeneratingView: View {
    let subject: String
    @State private var stage = 0

    private var stages: [(String, String)] {
        [
            (L.exams.stageReading, "text.magnifyingglass"),
            (L.exams.stageDrafting, "pencil.and.list.clipboard"),
            (L.exams.stageMarking, "checklist"),
        ]
    }

    var body: some View {
        VStack(spacing: Space.xxl) {
            Spacer()

            ProgressView()
                .controlSize(.large)

            VStack(spacing: Space.sm) {
                Text(L.exams.generating)
                    .font(.title2.weight(.semibold))
                if !subject.isEmpty {
                    Text(subject)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            VStack(alignment: .leading, spacing: Space.lg) {
                ForEach(Array(stages.enumerated()), id: \.offset) { index, item in
                    HStack(spacing: Space.md) {
                        ZStack {
                            if index < stage {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(Palette.success)
                            } else if index == stage {
                                ProgressView().controlSize(.small)
                            } else {
                                Image(systemName: item.1)
                                    .foregroundStyle(.tertiary)
                            }
                        }
                        .frame(width: 22, height: 22)

                        Text(item.0)
                            .font(.subheadline)
                            .foregroundStyle(index <= stage ? Palette.ink : .secondary)

                        Spacer(minLength: 0)
                    }
                }
            }
            .padding(Space.xl)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.surface, in: .rect(cornerRadius: Radius.surface, style: .continuous))
            .padding(.horizontal, Space.xl)
            .animation(.easeInOut(duration: 0.3), value: stage)

            Spacer()

            Text(L.exams.generatingNote)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Space.xxl)
                .padding(.bottom, Space.xxl)
        }
        .task {
            // Timed rather than reported: the server answers once, at the end,
            // so these are an honest description of the order of the work and
            // not a claim about how far along it is.
            for delay in [9, 21] {
                try? await Task.sleep(for: .seconds(delay))
                stage += 1
            }
        }
    }
}

/// One document, ticked or not.
private struct MaterialToggle: View {
    let material: Material
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 1) {
                    Text(material.title)
                        .foregroundStyle(Palette.ink)
                        .lineLimit(1)
                    Text(material.createdAt.formatted(date: .abbreviated, time: .omitted))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark")
                        .foregroundStyle(Palette.brand)
                        .fontWeight(.semibold)
                }
            }
        }
    }
}

/// Everything, searchable.
private struct MaterialPicker: View {
    let materials: [Material]
    @Binding var selection: Set<String>
    @State private var search = ""

    private var results: [Material] {
        guard !search.isEmpty else { return materials }
        return materials.filter { $0.title.localizedCaseInsensitiveContains(search) }
    }

    var body: some View {
        List {
            ForEach(results) { material in
                MaterialToggle(
                    material: material,
                    isSelected: selection.contains(material.id)
                ) {
                    if selection.contains(material.id) {
                        selection.remove(material.id)
                    } else if selection.count < 10 {
                        selection.insert(material.id)
                    }
                }
            }
        }
        .searchable(text: $search, prompt: L.exams.searchMaterials)
        .navigationTitle(L.exams.materials)
        .navigationBarTitleDisplayMode(.inline)
        .overlay {
            if results.isEmpty { ContentUnavailableView.search(text: search) }
        }
    }
}
