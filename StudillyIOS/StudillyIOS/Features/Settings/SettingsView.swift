import SwiftUI

/// Settings, as a native Form.
///
/// A `Form` gives the grouped inset style, the row separators, the keyboard
/// handling and the swipe-back behaviour that every other iOS settings screen
/// has. The app used to draw all of that itself, which was more code for a
/// slightly worse result.
struct SettingsView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.dismiss) private var dismiss

    @State private var displayName = ""
    @State private var isSaving = false
    @State private var savedAt: Date?
    @State private var showSignOut = false
    @State private var webPage: URL?
    @FocusState private var nameFocused: Bool

    private var current: SessionStore.Session? { session.currentSession }

    private var hasNameChanged: Bool {
        let trimmed = displayName.trimmingCharacters(in: .whitespaces)
        return !trimmed.isEmpty && trimmed != current?.profile.displayName
    }

    var body: some View {
        NavigationStack {
            Form {
                Section(L.settings.account) {
                    TextField(L.onboarding.displayName, text: $displayName)
                        .focused($nameFocused)
                        .submitLabel(.done)
                        .onSubmit(save)
                    LabeledContent(L.auth.email, value: current?.auth.email ?? "")
                        .foregroundStyle(.secondary)

                    if hasNameChanged {
                        Button(L.common.save, action: save)
                            .disabled(isSaving)
                    }
                    if savedAt != nil {
                        Label(L.settings.saved, systemImage: "checkmark.circle.fill")
                            .foregroundStyle(Palette.success)
                    }
                }

                if let education = current?.education {
                    Section {
                        LabeledContent(L.onboarding.bundesland, value: education.stateName)
                        LabeledContent(L.onboarding.schoolType, value: education.schoolTypeName)
                        LabeledContent(L.onboarding.grade, value: String(education.grade))
                        LabeledContent(
                            L.onboarding.stage,
                            value: education.stage == .sek1 ? L.onboarding.stageSek1 : L.onboarding.stageSek2
                        )
                    } header: {
                        Text(L.settings.education)
                    } footer: {
                        Text(L.pick(
                            "Aus diesen Angaben ergibt sich, welche Aufgaben du bekommst.",
                            "These decide which tasks you are given."
                        ))
                    }
                }

                Section(L.settings.subscription) {
                    NavigationLink(L.plan.manage) { PlanView() }
                }

                Section(L.settings.legal) {
                    Button(L.settings.privacy) { webPage = Config.WebPage.privacy.url }
                    Button(L.settings.terms) { webPage = Config.WebPage.terms.url }
                    Button(L.settings.imprint) { webPage = Config.WebPage.imprint.url }
                }

                Section {
                    Button(L.auth.signOut, role: .destructive) { showSignOut = true }
                }
            }
            .navigationTitle(L.settings.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(L.common.done) { dismiss() }.fontWeight(.semibold)
                }
            }
        }
        .sheet(item: $webPage) { url in WebSheet(url: url) }
        .onAppear { displayName = current?.profile.displayName ?? "" }
        .confirmationDialog(
            L.settings.signOutConfirm, isPresented: $showSignOut, titleVisibility: .visible
        ) {
            Button(L.auth.signOut, role: .destructive) { Task { await session.signOut() } }
            Button(L.common.cancel, role: .cancel) {}
        }
    }

    private func save() {
        guard hasNameChanged, let current else { return }
        isSaving = true
        nameFocused = false
        Task {
            do {
                let token = try await session.validToken()
                let profile = try await StudillyAPI.updateDisplayName(
                    token: token, userID: current.auth.userID,
                    name: displayName.trimmingCharacters(in: .whitespaces)
                )
                session.updateProfile(profile)
                savedAt = Date()
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                try? await Task.sleep(for: .seconds(2))
                savedAt = nil
            } catch {
                displayName = current.profile.displayName
                UINotificationFeedbackGenerator().notificationOccurred(.error)
            }
            isSaving = false
        }
    }
}
