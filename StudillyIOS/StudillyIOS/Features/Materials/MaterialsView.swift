import PhotosUI
import SwiftUI
import UniformTypeIdentifiers

@MainActor
@Observable
final class MaterialsModel {
    enum State: Equatable { case loading, loaded, failed(String) }

    /// One file on its way up. Kept as a list so a batch shows its own
    /// progress rather than a single spinner that says nothing about which
    /// of nine photos is being handled.
    struct Pending: Identifiable, Equatable {
        let id = UUID()
        let name: String
        var state: Stage = .waiting
        enum Stage: Equatable { case waiting, uploading, failed(String) }
    }

    var state: State = .loading
    var materials: [Material] = []
    var subjects: [Subject] = []
    var pending: [Pending] = []
    var errorMessage: String?

    var isProcessing: Bool {
        materials.contains { !$0.isReady && !$0.isFailed }
    }

    /// Grouped by subject, subjects first in their own order, anything
    /// unfiled last. The list renders these as sections, which is what makes
    /// a growing pile of uploads findable again.
    var sections: [(subject: Subject?, materials: [Material])] {
        var bySubject: [String: [Material]] = [:]
        var unfiled: [Material] = []
        for material in materials {
            if let id = material.subjectID { bySubject[id, default: []].append(material) }
            else { unfiled.append(material) }
        }
        var result = subjects.compactMap { subject -> (Subject?, [Material])? in
            guard let list = bySubject[subject.id], !list.isEmpty else { return nil }
            return (subject, list)
        }
        if !unfiled.isEmpty { result.append((nil, unfiled)) }
        return result
    }

    func load(session: SessionStore) async {
        do {
            let token = try await session.validToken()
            async let materials = StudillyAPI.materials(token: token)
            async let subjects = StudillyAPI.subjects(token: token)
            self.materials = try await materials
            self.subjects = try await subjects
            state = .loaded
        } catch {
            state = .failed((error as? APIError)?.errorDescription ?? L.errors.generic)
        }
    }

    /// Uploads a batch one file at a time.
    ///
    /// Sequential on purpose: each file is its own material and its own charge
    /// against the monthly allowance, so if the allowance runs out mid-batch
    /// the ones already sent are kept and the rest stop cleanly, rather than
    /// nine parallel requests all failing halfway.
    func upload(session: SessionStore, files: [(data: Data, name: String, mime: String)], subjectID: String?) async {
        errorMessage = nil
        pending = files.map { Pending(name: $0.name) }

        for (index, file) in files.enumerated() {
            pending[index].state = .uploading
            do {
                let token = try await session.validToken()
                let upload = try await BackendAPI.createMaterial(
                    token: token,
                    body: .init(
                        filename: file.name, mimeType: file.mime, size: file.data.count,
                        subjectId: subjectID,
                        title: (file.name as NSString).deletingPathExtension
                    )
                )
                try await BackendAPI.uploadFile(
                    to: upload.uploadUrl, uploadToken: upload.token,
                    data: file.data, mimeType: file.mime
                )
                try await BackendAPI.processMaterial(token: token, materialID: upload.materialId)
                pending.remove(at: index >= pending.count ? pending.count - 1 : index)
                pending.insert(Pending(name: file.name, state: .waiting), at: index)
                pending[index].state = .waiting
            } catch {
                let message = (error as? APIError)?.errorDescription ?? L.errors.generic
                pending[index].state = .failed(message)
                // A spent allowance will not un-spend itself, so stop rather
                // than firing the rest of the batch at the same wall.
                if case APIError.limitReached = error {
                    errorMessage = message
                    break
                }
                errorMessage = message
            }
        }

        let failed = pending.filter { if case .failed = $0.state { return true } else { return false } }
        pending = []
        if failed.isEmpty { UINotificationFeedbackGenerator().notificationOccurred(.success) }
        else { UINotificationFeedbackGenerator().notificationOccurred(.error) }
        await load(session: session)
    }

    func delete(session: SessionStore, material: Material) async {
        do {
            let token = try await session.validToken()
            try await BackendAPI.deleteMaterial(token: token, materialID: material.id)
            materials.removeAll { $0.id == material.id }
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? L.errors.generic
        }
    }
}

struct MaterialsView: View {
    @Environment(SessionStore.self) private var session
    @State private var model = MaterialsModel()
    @State private var showSettings = false
    @State private var showFileImporter = false
    @State private var showCamera = false
    @State private var photoItems: [PhotosPickerItem] = []
    @State private var showPhotoPicker = false
    /// Files chosen but not yet sent, held while the subject is picked.
    @State private var staged: [(data: Data, name: String, mime: String)] = []

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
                    list
                }
            }
            .navigationTitle(L.materials.title)
            .toolbar {
                SettingsToolbarButton(isPresented: $showSettings)
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        if CameraPicker.isAvailable {
                            Button { showCamera = true } label: {
                                Label(L.materials.takePhoto, systemImage: "camera")
                            }
                        }
                        Button { showPhotoPicker = true } label: {
                            Label(L.materials.pickPhoto, systemImage: "photo.on.rectangle")
                        }
                        Button { showFileImporter = true } label: {
                            Label(L.materials.pickFile, systemImage: "doc")
                        }
                    } label: {
                        Image(systemName: "plus")
                    }
                    .disabled(!model.pending.isEmpty)
                }
            }
            .refreshable { await model.load(session: session) }
        }
        .sheet(isPresented: $showSettings) { SettingsView() }
        .sheet(isPresented: .init(get: { !staged.isEmpty }, set: { if !$0 { staged = [] } })) {
            FileDestinationSheet(files: staged.map(\.name), subjects: model.subjects) { subjectID in
                let files = staged
                staged = []
                Task { await model.upload(session: session, files: files, subjectID: subjectID) }
            } onCancel: {
                staged = []
            }
        }
        .task { await model.load(session: session) }
        .task(id: model.isProcessing) {
            // Extraction finishes server-side without telling the app, so poll
            // while anything is in flight and stop the moment nothing is.
            // Bounded: extraction takes seconds, so if it is still going
            // after two minutes something is wrong on the server and polling
            // forever only costs the student battery. Pull to refresh still
            // works.
            var attempts = 0
            while model.isProcessing, !Task.isCancelled, attempts < 30 {
                try? await Task.sleep(for: .seconds(4))
                await model.load(session: session)
                attempts += 1
            }
        }
        .photosPicker(
            isPresented: $showPhotoPicker,
            selection: $photoItems,
            maxSelectionCount: 10,
            matching: .images
        )
        .fullScreenCover(isPresented: $showCamera) {
            CameraPicker { data in
                staged = [(data, "Foto-\(Int(Date().timeIntervalSince1970)).jpg", "image/jpeg")]
            }
            .ignoresSafeArea()
        }
        .fileImporter(
            isPresented: $showFileImporter,
            allowedContentTypes: [.pdf, .plainText, .rtf, .image],
            allowsMultipleSelection: true
        ) { result in
            guard case let .success(urls) = result, !urls.isEmpty else { return }
            Task { await handle(urls: urls) }
        }
        .onChange(of: photoItems) { _, items in
            guard !items.isEmpty else { return }
            Task {
                var files: [(Data, String, String)] = []
                for (index, item) in items.enumerated() {
                    guard let data = try? await item.loadTransferable(type: Data.self) else { continue }
                    files.append((data, "Foto-\(Int(Date().timeIntervalSince1970))-\(index + 1).jpg", "image/jpeg"))
                }
                photoItems = []
                staged = files.map { (data: $0.0, name: $0.1, mime: $0.2) }
            }
        }
    }

    private var list: some View {
        List {
            if !model.pending.isEmpty {
                Section(L.materials.uploading) {
                    ForEach(model.pending) { item in
                        PendingRow(item: item)
                    }
                }
            }

            if let error = model.errorMessage {
                Section {
                    Label(error, systemImage: "exclamationmark.triangle.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(Palette.danger)
                }
            }

            ForEach(model.sections, id: \.subject?.id) { section in
                Section(section.subject?.name ?? L.materials.unfiled) {
                    ForEach(section.materials) { material in
                        MaterialRow(material: material)
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    Task { await model.delete(session: session, material: material) }
                                } label: {
                                    Label(L.common.delete, systemImage: "trash")
                                }
                            }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .overlay {
            if model.materials.isEmpty && model.pending.isEmpty {
                ContentUnavailableView {
                    Label(L.materials.emptyTitle, systemImage: "tray.and.arrow.up")
                } description: {
                    Text(L.materials.emptyBody)
                } actions: {
                    Button(CameraPicker.isAvailable ? L.materials.takePhoto : L.materials.pickFile) {
                        if CameraPicker.isAvailable { showCamera = true } else { showFileImporter = true }
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
        }
    }

    private func handle(urls: [URL]) async {
        var files: [(Data, String, String)] = []
        for url in urls {
            // Files from the picker sit outside the sandbox until the security
            // scope is opened, and the scope has to be closed again.
            let scoped = url.startAccessingSecurityScopedResource()
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            guard let data = try? Data(contentsOf: url) else { continue }
            let mime = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType
                ?? "application/octet-stream"
            files.append((data, url.lastPathComponent, mime))
        }
        guard !files.isEmpty else {
            model.errorMessage = L.errors.generic
            return
        }
        staged = files.map { (data: $0.0, name: $0.1, mime: $0.2) }
    }
}

private struct MaterialRow: View {
    let material: Material

    var body: some View {
        HStack(spacing: Space.md) {
            Image(systemName: material.filename.lowercased().hasSuffix(".pdf")
                  ? "doc.richtext" : "doc.text")
                .font(.system(size: 18))
                .foregroundStyle(Palette.inkSubtle)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(material.title)
                    .font(.body)
                    .lineLimit(1)
                Text("\(material.sizeLabel) · \(material.createdAt.formatted(date: .abbreviated, time: .omitted))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 0)

            if material.isReady {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(Palette.success)
            } else if material.isFailed {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(Palette.danger)
            } else {
                ProgressView().controlSize(.small)
            }
        }
    }
}

private struct PendingRow: View {
    let item: MaterialsModel.Pending

    var body: some View {
        HStack(spacing: Space.md) {
            switch item.state {
            case .waiting:
                Image(systemName: "clock").foregroundStyle(.secondary).frame(width: 24)
            case .uploading:
                ProgressView().controlSize(.small).frame(width: 24)
            case .failed:
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(Palette.danger).frame(width: 24)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(item.name).font(.body).lineLimit(1)
                if case let .failed(message) = item.state {
                    Text(message).font(.caption).foregroundStyle(Palette.danger).lineLimit(2)
                }
            }
            Spacer(minLength: 0)
        }
    }
}

/// Where the chosen files should go.
///
/// Asked once for the batch rather than per file: a student photographing six
/// pages of the same exercise book is filing one thing, not six. Skipping is
/// allowed, and those land under "no subject", which is still a section.
private struct FileDestinationSheet: View {
    let files: [String]
    let subjects: [Subject]
    let onConfirm: (String?) -> Void
    let onCancel: () -> Void

    @State private var subjectID: String?

    var body: some View {
        NavigationStack {
            Form {
                Section(L.materials.destination) {
                    Picker(L.exams.subject, selection: $subjectID) {
                        Text(L.materials.unfiled).tag(String?.none)
                        ForEach(subjects) { subject in
                            Text(subject.name).tag(Optional(subject.id))
                        }
                    }
                }

                Section(L.materials.filesToUpload(files.count)) {
                    ForEach(files, id: \.self) { name in
                        Label(name, systemImage: "doc")
                            .lineLimit(1)
                    }
                }
            }
            .navigationTitle(L.materials.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L.common.cancel, action: onCancel)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(L.materials.upload) { onConfirm(subjectID) }
                        .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
