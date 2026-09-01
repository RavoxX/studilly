import PhotosUI
import SwiftUI
import UniformTypeIdentifiers

@MainActor
@Observable
final class MaterialsModel {
    enum State: Equatable { case loading, loaded, failed(String) }

    var state: State = .loading
    var materials: [Material] = []
    var uploadingName: String?
    var errorMessage: String?

    /// Anything still being read or analysed. Polled while any exist, because
    /// extraction finishes on the server and the row changes without the app
    /// being told.
    var isProcessing: Bool {
        materials.contains { !$0.isReady && !$0.isFailed }
    }

    func load(session: SessionStore) async {
        do {
            let token = try await session.validToken()
            materials = try await StudillyAPI.materials(token: token)
            state = .loaded
        } catch {
            state = .failed((error as? APIError)?.errorDescription ?? L.errors.generic)
        }
    }

    /// Three steps, in the order the server expects: reserve a row and a
    /// signed URL, send the bytes straight to storage, then ask for it to be
    /// read. The bytes never pass through the web app, which would only be
    /// forwarding them.
    func upload(
        session: SessionStore, data: Data, filename: String, mimeType: String, subjectID: String?
    ) async {
        uploadingName = filename
        errorMessage = nil
        do {
            let token = try await session.validToken()
            let upload = try await BackendAPI.createMaterial(
                token: token,
                body: .init(
                    filename: filename,
                    mimeType: mimeType,
                    size: data.count,
                    subjectId: subjectID,
                    title: (filename as NSString).deletingPathExtension
                )
            )
            try await BackendAPI.uploadFile(
                to: upload.uploadUrl, uploadToken: upload.token,
                data: data, mimeType: mimeType
            )
            try await BackendAPI.processMaterial(token: token, materialID: upload.materialId)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            await load(session: session)
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? L.errors.generic
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
        uploadingName = nil
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
    @State private var photoItem: PhotosPickerItem?

    var body: some View {
        NavigationStack {
            Group {
                switch model.state {
                case .loading:
                    ScrollView {
                        VStack(spacing: Space.md) {
                            ForEach(0..<4, id: \.self) { _ in SkeletonBlock(height: 74) }
                        }
                        .screenPadding()
                        .padding(.top, Space.lg)
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
            .navigationTitle(L.materials.title)
            .toolbar { SettingsToolbarButton(isPresented: $showSettings) }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button { showFileImporter = true } label: {
                            Label(L.materials.pickFile, systemImage: "doc")
                        }
                        PhotosPicker(selection: $photoItem, matching: .images) {
                            Label(L.materials.pickPhoto, systemImage: "photo")
                        }
                    } label: {
                        Image(systemName: "plus")
                    }
                    .disabled(model.uploadingName != nil)
                }
            }
            .refreshable { await model.load(session: session) }
        }
        .sheet(isPresented: $showSettings) { SettingsView() }
        .task { await model.load(session: session) }
        .task(id: model.isProcessing) {
            while model.isProcessing, !Task.isCancelled {
                try? await Task.sleep(for: .seconds(4))
                await model.load(session: session)
            }
        }
        .fileImporter(
            isPresented: $showFileImporter,
            allowedContentTypes: [.pdf, .plainText, .rtf, .image],
            allowsMultipleSelection: false
        ) { result in
            guard case let .success(urls) = result, let url = urls.first else { return }
            Task { await handle(url: url) }
        }
        .onChange(of: photoItem) { _, item in
            guard let item else { return }
            Task {
                guard let data = try? await item.loadTransferable(type: Data.self) else { return }
                await model.upload(
                    session: session, data: data,
                    filename: "Foto-\(Int(Date().timeIntervalSince1970)).jpg",
                    mimeType: "image/jpeg", subjectID: nil
                )
                photoItem = nil
            }
        }
    }

    private var content: some View {
        ScrollView {
            VStack(spacing: Space.md) {
                if let name = model.uploadingName {
                    UploadingRow(name: name)
                        .transition(.opacity.combined(with: .move(edge: .top)))
                }

                if let error = model.errorMessage {
                    Banner(message: error, tone: .danger)
                }

                if model.materials.isEmpty && model.uploadingName == nil {
                    EmptyStateView(
                        icon: "tray.and.arrow.up",
                        title: L.materials.emptyTitle,
                        message: L.materials.emptyBody,
                        actionTitle: L.materials.pickFile
                    ) { showFileImporter = true }
                    .padding(.top, Space.xxl)
                } else {
                    ForEach(model.materials) { material in
                        MaterialRow(material: material) {
                            Task { await model.delete(session: session, material: material) }
                        }
                    }
                }
            }
            .screenPadding()
            .padding(.vertical, Space.lg)
            .animation(.spring(response: 0.35, dampingFraction: 0.85), value: model.uploadingName)
            .animation(.easeOut(duration: 0.25), value: model.materials)
        }
    }

    private func handle(url: URL) async {
        // Files from the picker live outside the sandbox until the security
        // scope is opened, and the scope has to be closed again.
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }

        guard let data = try? Data(contentsOf: url) else {
            model.errorMessage = L.errors.generic
            return
        }
        let mime = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType
            ?? "application/octet-stream"
        await model.upload(
            session: session, data: data,
            filename: url.lastPathComponent, mimeType: mime, subjectID: nil
        )
    }
}

private struct MaterialRow: View {
    let material: Material
    let onDelete: () -> Void

    var body: some View {
        Card(padding: Space.lg) {
            HStack(spacing: Space.lg) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundStyle(Palette.inkSubtle)
                    .frame(width: 26)

                VStack(alignment: .leading, spacing: 4) {
                    Text(material.title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Palette.ink)
                        .lineLimit(1)
                    HStack(spacing: Space.sm) {
                        Text(material.sizeLabel)
                            .font(.system(size: 13))
                            .foregroundStyle(Palette.inkSubtle)
                        Text("·").foregroundStyle(Palette.inkSubtle)
                        Text(material.createdAt.formatted(date: .abbreviated, time: .omitted))
                            .font(.system(size: 13))
                            .foregroundStyle(Palette.inkSubtle)
                    }
                }

                Spacer(minLength: 0)

                if material.isReady {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(Palette.success)
                } else if material.isFailed {
                    Badge(text: material.statusLabel, tone: .danger)
                } else {
                    HStack(spacing: 6) {
                        ProgressView().scaleEffect(0.7)
                        Text(material.statusLabel)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Palette.warning)
                    }
                }
            }
        }
        .contextMenu {
            Button(role: .destructive, action: onDelete) {
                Label(L.common.delete, systemImage: "trash")
            }
        }
    }

    private var icon: String {
        material.filename.lowercased().hasSuffix(".pdf") ? "doc.richtext" : "doc.text"
    }
}

private struct UploadingRow: View {
    let name: String

    var body: some View {
        Card(padding: Space.lg) {
            HStack(spacing: Space.lg) {
                ProgressView().frame(width: 26)
                VStack(alignment: .leading, spacing: 2) {
                    Text(name)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(Palette.ink)
                        .lineLimit(1)
                    Text(L.materials.uploading)
                        .font(.system(size: 13))
                        .foregroundStyle(Palette.inkSubtle)
                }
                Spacer(minLength: 0)
            }
        }
    }
}
