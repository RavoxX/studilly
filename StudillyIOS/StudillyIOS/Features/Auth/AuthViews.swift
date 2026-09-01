import AuthenticationServices
import SwiftUI

/// Signing in to an existing account.
struct SignInView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var password = ""
    @State private var error: String?
    @State private var isWorking = false
    @State private var showReset = false
    @State private var resetSent = false
    @FocusState private var field: Field?

    private enum Field { case email, password }

    private var canSubmit: Bool {
        email.contains("@") && password.count >= 8
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.xxl) {
                VStack(alignment: .leading, spacing: Space.sm) {
                    Text(L.auth.loginTitle)
                        .font(.display(30))
                        .foregroundStyle(Palette.ink)
                    Text(L.auth.loginSubtitle)
                        .font(.system(size: 15))
                        .foregroundStyle(Palette.inkMuted)
                }

                if let error {
                    Banner(message: error, tone: .danger)
                }
                if resetSent {
                    Banner(
                        message: L.pick(
                            "Wenn es ein Konto mit dieser Adresse gibt, ist die E-Mail unterwegs.",
                            "If an account exists for that address, the email is on its way."
                        ),
                        tone: .success
                    )
                }


                GoogleButton(isBusy: $isWorking, onError: { error = $0 }) { auth in
                    await handleGoogle(auth)
                }

                LabelledDivider()
                VStack(spacing: Space.lg) {
                    StudillyField(label: L.auth.email, isRequired: true) {
                        FieldBox(isFocused: field == .email) {
                            TextField("", text: $email)
                                .font(.system(size: 17))
                                .foregroundStyle(Palette.ink)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .submitLabel(.next)
                                .focused($field, equals: .email)
                                .onSubmit { field = .password }
                        }
                    }

                    StudillyField(label: L.auth.password, isRequired: true) {
                        FieldBox(isFocused: field == .password) {
                            SecureField("", text: $password)
                                .font(.system(size: 17))
                                .foregroundStyle(Palette.ink)
                                .textContentType(.password)
                                .submitLabel(.go)
                                .focused($field, equals: .password)
                                .onSubmit { if canSubmit { submit() } }
                        }
                    }

                    HStack {
                        Spacer()
                        Button(L.auth.forgotPassword) { showReset = true }
                            .font(.system(size: 14))
                            .foregroundStyle(Palette.brandText)
                    }
                }

                StudillyButton(
                    title: L.auth.login,
                    isLoading: isWorking,
                    isEnabled: canSubmit
                ) { submit() }

                HStack(spacing: Space.xs) {
                    Text(L.auth.noAccount)
                        .font(.system(size: 15))
                        .foregroundStyle(Palette.inkMuted)
                    NavigationLink {
                        OnboardingView()
                    } label: {
                        Text(L.auth.register)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Palette.brandText)
                    }
                }
                .frame(maxWidth: .infinity)
            }
            .screenPadding()
            .padding(.top, Space.xl)
            .padding(.bottom, Space.xxxl)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Palette.canvas)
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .animation(.easeOut(duration: 0.2), value: error)
        .animation(.easeOut(duration: 0.2), value: resetSent)
        .alert(L.auth.forgotPassword, isPresented: $showReset) {
            Button(L.common.cancel, role: .cancel) {}
            Button(L.common.done) { Task { await sendReset() } }
        } message: {
            Text(L.pick(
                "Wir schicken dir einen Link an \(email.isEmpty ? "deine E-Mail-Adresse" : email).",
                "We will send a link to \(email.isEmpty ? "your email address" : email)."
            ))
        }
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { field = .email }
        }
    }

    private func submit() {
        error = nil
        isWorking = true
        Task {
            do {
                try await session.signIn(
                    email: email.trimmingCharacters(in: .whitespaces),
                    password: password
                )
            } catch {
                self.error = (error as? APIError)?.errorDescription ?? L.errors.generic
                UINotificationFeedbackGenerator().notificationOccurred(.error)
            }
            isWorking = false
        }
    }

    /// A Google session is a session: the profile decides where to go next,
    /// exactly as it does after an email sign-in.
    private func handleGoogle(_ auth: Supabase.Session) async {
        await session.adopt(auth)
    }

    private func sendReset() async {
        guard email.contains("@") else { return }
        // Always reported the same way, whether or not the address exists:
        // the response must not become a way to test which addresses do.
        try? await Supabase.resetPassword(email: email.trimmingCharacters(in: .whitespaces))
        resetSent = true
    }
}

/// Creating the account at the end of setup, then writing everything setup
/// collected.
struct SignUpView: View {
    let onboarding: OnboardingModel

    @Environment(SessionStore.self) private var session

    @State private var email = ""
    @State private var password = ""
    @State private var error: String?
    @State private var isWorking = false
    @State private var confirmationSentTo: String?
    @FocusState private var field: Field?

    private enum Field { case email, password }

    private var canSubmit: Bool { email.contains("@") && password.count >= 8 }

    var body: some View {
        Group {
            if let address = confirmationSentTo {
                ConfirmEmailView(email: address)
            } else {
                form
            }
        }
        .background(Palette.canvas)
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var form: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.xxl) {
                VStack(alignment: .leading, spacing: Space.sm) {
                    Text(L.onboarding.createAccountTitle)
                        .font(.display(30))
                        .foregroundStyle(Palette.ink)
                    Text(L.onboarding.createAccountBody)
                        .font(.system(size: 15))
                        .foregroundStyle(Palette.inkMuted)
                }

                SetupSummary(model: onboarding)

                if let error { Banner(message: error, tone: .danger) }


                GoogleButton(isBusy: $isWorking, onError: { error = $0 }) { auth in
                    await handleGoogle(auth)
                }

                LabelledDivider()
                VStack(spacing: Space.lg) {
                    StudillyField(label: L.auth.email, isRequired: true) {
                        FieldBox(isFocused: field == .email) {
                            TextField("", text: $email)
                                .font(.system(size: 17))
                                .foregroundStyle(Palette.ink)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .submitLabel(.next)
                                .focused($field, equals: .email)
                                .onSubmit { field = .password }
                        }
                    }

                    StudillyField(
                        label: L.auth.password,
                        hint: L.auth.passwordHint,
                        isRequired: true
                    ) {
                        FieldBox(isFocused: field == .password) {
                            SecureField("", text: $password)
                                .font(.system(size: 17))
                                .foregroundStyle(Palette.ink)
                                .textContentType(.newPassword)
                                .submitLabel(.go)
                                .focused($field, equals: .password)
                                .onSubmit { if canSubmit { submit() } }
                        }
                    }
                }

                StudillyButton(
                    title: L.auth.register,
                    isLoading: isWorking,
                    isEnabled: canSubmit
                ) { submit() }

                Text(L.auth.legalNote)
                    .font(.system(size: 12))
                    .foregroundStyle(Palette.inkSubtle)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
            }
            .screenPadding()
            .padding(.top, Space.xl)
            .padding(.bottom, Space.xxxl)
        }
        .scrollDismissesKeyboard(.interactively)
        .animation(.easeOut(duration: 0.2), value: error)
    }

    /// Signing up with Google skips the password but not the setup: the four
    /// answers still have to be written, and against the account that has just
    /// come back rather than one being created here.
    private func handleGoogle(_ auth: Supabase.Session) async {
        do {
            let (profile, education) = try await StudillyAPI.completeOnboarding(
                token: auth.accessToken,
                userID: auth.userID,
                displayName: onboarding.displayName.trimmingCharacters(in: .whitespaces),
                bundesland: onboarding.bundesland,
                stage: onboarding.stage,
                schoolType: onboarding.schoolType,
                grade: onboarding.grade ?? 0,
                oberstufePhase: onboarding.phase,
                subjectIDs: Array(onboarding.selectedSubjects),
                prioritySubjectIDs: Array(onboarding.prioritySubjects)
            )
            session.persistExternal(auth)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            session.markOnboarded(profile: profile, education: education)
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? L.errors.generic
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }

    private func submit() {
        error = nil
        isWorking = true

        Task {
            do {
                let name = onboarding.displayName.trimmingCharacters(in: .whitespaces)
                let auth = try await session.signUp(
                    email: email.trimmingCharacters(in: .whitespaces),
                    password: password,
                    displayName: name
                )

                guard let auth else {
                    // Confirmation is on. The answers cannot be written yet,
                    // so the student is told what to do next rather than being
                    // dropped into an app that will not load.
                    confirmationSentTo = email
                    isWorking = false
                    return
                }

                let (profile, education) = try await StudillyAPI.completeOnboarding(
                    token: auth.accessToken,
                    userID: auth.userID,
                    displayName: name,
                    bundesland: onboarding.bundesland,
                    stage: onboarding.stage,
                    schoolType: onboarding.schoolType,
                    grade: onboarding.grade ?? 0,
                    oberstufePhase: onboarding.phase,
                    subjectIDs: Array(onboarding.selectedSubjects),
                    prioritySubjectIDs: Array(onboarding.prioritySubjects)
                )

                UINotificationFeedbackGenerator().notificationOccurred(.success)
                session.markOnboarded(profile: profile, education: education)
            } catch {
                self.error = (error as? APIError)?.errorDescription ?? L.errors.generic
                UINotificationFeedbackGenerator().notificationOccurred(.error)
                isWorking = false
            }
        }
    }
}

/// What setup collected, shown back before the account is made, so the last
/// screen is a confirmation rather than a form out of nowhere.
private struct SetupSummary: View {
    let model: OnboardingModel

    var body: some View {
        Card(padding: Space.lg) {
            VStack(alignment: .leading, spacing: Space.md) {
                row(icon: "person", value: model.displayName)
                if let state = Education.state(model.bundesland) {
                    row(
                        icon: "building.columns",
                        value: "\(L.isGerman ? state.nameDe : state.nameEn) · \(schoolTypeName) · \(L.pick("Klasse", "Year")) \(model.grade ?? 0)"
                    )
                }
                row(
                    icon: "books.vertical",
                    value: L.pick(
                        "\(model.selectedSubjects.count) Fächer",
                        "\(model.selectedSubjects.count) subjects"
                    )
                )
            }
        }
    }

    private var schoolTypeName: String {
        guard let label = Education.schoolTypeLabels[model.schoolType] else { return model.schoolType }
        return L.isGerman ? label.de : label.en
    }

    private func row(icon: String, value: String) -> some View {
        HStack(spacing: Space.md) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(Palette.inkSubtle)
                .frame(width: 20)
            Text(value)
                .font(.system(size: 15))
                .foregroundStyle(Palette.ink)
                .lineLimit(2)
            Spacer(minLength: 0)
        }
    }
}

/// Shown when the project sends a confirmation mail instead of a session.
private struct ConfirmEmailView: View {
    let email: String
    @State private var appeared = false

    var body: some View {
        VStack(spacing: Space.xl) {
            Spacer()

            Image(systemName: "envelope.badge")
                .font(.system(size: 44, weight: .light))
                .foregroundStyle(Palette.brandText)
                .scaleEffect(appeared ? 1 : 0.7)
                .opacity(appeared ? 1 : 0)

            VStack(spacing: Space.md) {
                Text(L.auth.confirmEmailTitle)
                    .font(.display(24))
                    .foregroundStyle(Palette.ink)
                    .multilineTextAlignment(.center)
                Text(L.auth.confirmEmailBody(email))
                    .font(.system(size: 15))
                    .foregroundStyle(Palette.inkMuted)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 12)

            Spacer()
        }
        .screenPadding()
        .onAppear {
            withAnimation(.spring(response: 0.6, dampingFraction: 0.75)) { appeared = true }
        }
    }
}


/// Continue with Google.
///
/// The sheet is presented by the system from the app's own window, so the
/// button has to reach the active scene for an anchor rather than owning one.
struct GoogleButton: View {
    @Binding var isBusy: Bool
    let onError: (String) -> Void
    let onSuccess: (Supabase.Session) async -> Void

    var body: some View {
        Button {
            start()
        } label: {
            HStack(spacing: Space.md) {
                GoogleMark()
                Text(L.pick("Mit Google fortfahren", "Continue with Google"))
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Palette.ink)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(Palette.surface)
            .clipShape(RoundedRectangle(cornerRadius: Radius.control, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                    .strokeBorder(Palette.lineStrong, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .disabled(isBusy)
        .opacity(isBusy ? 0.5 : 1)
    }

    private func start() {
        guard
            let scene = UIApplication.shared.connectedScenes
                .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene,
            let window = scene.keyWindow ?? scene.windows.first
        else { return }

        isBusy = true
        Task {
            do {
                let auth = try await GoogleSignIn.start(anchor: window)
                await onSuccess(auth)
            } catch is CancellationError {
                // Dismissing the sheet is a decision, not a failure.
            } catch {
                onError((error as? APIError)?.errorDescription ?? L.errors.generic)
            }
            isBusy = false
        }
    }
}
