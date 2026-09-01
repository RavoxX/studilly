import SwiftUI

struct SettingsView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.openURL) private var openURL

    @State private var displayName = ""
    @State private var isSaving = false
    @State private var savedAt: Date?
    @State private var showSignOut = false
    @FocusState private var nameFocused: Bool

    private var current: SessionStore.Session? { session.currentSession }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Space.xl) {
                    accountSection
                    if let education = current?.education { educationSection(education) }
                    planSection
                    legalSection
                    signOutButton
                }
                .screenPadding()
                .padding(.vertical, Space.lg)
            }
            .background(Palette.canvas)
            .navigationTitle(L.settings.title)
            .scrollDismissesKeyboard(.interactively)
        }
        .onAppear { displayName = current?.profile.displayName ?? "" }
        .confirmationDialog(
            L.settings.signOutConfirm,
            isPresented: $showSignOut,
            titleVisibility: .visible
        ) {
            Button(L.auth.signOut, role: .destructive) { Task { await session.signOut() } }
            Button(L.common.cancel, role: .cancel) {}
        }
    }

    private var accountSection: some View {
        Section(L.settings.account) {
            VStack(alignment: .leading, spacing: Space.lg) {
                StudillyField(label: L.onboarding.displayName) {
                    FieldBox(isFocused: nameFocused) {
                        TextField("", text: $displayName)
                            .font(.system(size: 17))
                            .foregroundStyle(Palette.ink)
                            .focused($nameFocused)
                            .submitLabel(.done)
                            .onSubmit { save() }
                    }
                }

                HStack(spacing: Space.md) {
                    Text(current?.auth.email ?? "")
                        .font(.system(size: 14))
                        .foregroundStyle(Palette.inkSubtle)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                    if savedAt != nil {
                        Label(L.settings.saved, systemImage: "checkmark.circle.fill")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Palette.success)
                            .transition(.opacity.combined(with: .scale(scale: 0.9)))
                    }
                }

                if hasNameChanged {
                    StudillyButton(title: L.common.save, isLoading: isSaving) { save() }
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
            }
            .animation(.spring(response: 0.3, dampingFraction: 0.85), value: hasNameChanged)
            .animation(.easeOut(duration: 0.2), value: savedAt)
        }
    }

    private func educationSection(_ education: EducationProfile) -> some View {
        Section(L.settings.education) {
            VStack(spacing: 0) {
                InfoRow(label: L.onboarding.bundesland, value: education.stateName)
                Divider().overlay(Palette.line)
                InfoRow(label: L.onboarding.schoolType, value: education.schoolTypeName)
                Divider().overlay(Palette.line)
                InfoRow(label: L.onboarding.grade, value: String(education.grade))
                Divider().overlay(Palette.line)
                InfoRow(
                    label: L.onboarding.stage,
                    value: education.stage == .sek1 ? L.onboarding.stageSek1 : L.onboarding.stageSek2
                )
            }
            .padding(.vertical, Space.xs)

            Text(L.pick(
                "Diese Angaben änderst du im Browser.",
                "Change these in the browser."
            ))
            .font(.system(size: 13))
            .foregroundStyle(Palette.inkSubtle)
            .padding(.top, Space.sm)
        }
    }

    private var planSection: some View {
        Section(L.settings.subscription) {
            VStack(alignment: .leading, spacing: Space.md) {
                Text(L.plans.managePlanNote)
                    .font(.system(size: 14))
                    .foregroundStyle(Palette.inkMuted)
                StudillyButton(
                    title: L.dashboard.openWeb,
                    kind: .secondary,
                    trailingIcon: "arrow.up.right"
                ) { openURL(Config.WebPage.pricing.url) }
            }
        }
    }

    private var legalSection: some View {
        Section(L.settings.legal) {
            VStack(spacing: 0) {
                LinkRow(title: L.settings.privacy) { openURL(Config.WebPage.privacy.url) }
                Divider().overlay(Palette.line)
                LinkRow(title: L.settings.terms) { openURL(Config.WebPage.terms.url) }
                Divider().overlay(Palette.line)
                LinkRow(title: L.settings.imprint) { openURL(Config.WebPage.imprint.url) }
            }
            .padding(.vertical, Space.xs)
        }
    }

    private var signOutButton: some View {
        StudillyButton(title: L.auth.signOut, kind: .danger) { showSignOut = true }
            .padding(.top, Space.sm)
    }

    private var hasNameChanged: Bool {
        let trimmed = displayName.trimmingCharacters(in: .whitespaces)
        return !trimmed.isEmpty && trimmed != current?.profile.displayName
    }

    private func save() {
        guard hasNameChanged, let current else { return }
        isSaving = true
        nameFocused = false
        Task {
            do {
                let token = try await session.validToken()
                let profile = try await StudillyAPI.updateDisplayName(
                    token: token,
                    userID: current.auth.userID,
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

/// A titled group. Named Section for familiarity, but it is a card rather than
/// a `List` row so the whole app can keep one surface treatment.
private struct Section<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    init(_ title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Space.md) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .tracking(0.6)
                .foregroundStyle(Palette.inkSubtle)
            Card { content }
        }
    }
}

private struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 15))
                .foregroundStyle(Palette.inkMuted)
            Spacer(minLength: Space.lg)
            Text(value)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Palette.ink)
                .multilineTextAlignment(.trailing)
        }
        .padding(.vertical, Space.md)
    }
}

private struct LinkRow: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Text(title)
                    .font(.system(size: 15))
                    .foregroundStyle(Palette.ink)
                Spacer()
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.inkSubtle)
            }
            .padding(.vertical, Space.md)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
