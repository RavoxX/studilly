import SwiftUI

/// Setup, in four steps, each asking one thing.
///
/// This mirrors the web app deliberately: same four questions, same order,
/// same explanation of why the school context is needed, sitting in the step
/// that asks for it rather than buried in a policy. A single long form tests
/// worse on a phone and makes the question look bureaucratic.
///
/// It runs before there is an account. The answers are held until the student
/// signs up, then written in one go, so nobody fills in four screens to be
/// asked for an email address and lose them.
struct OnboardingView: View {
    @Environment(SessionStore.self) private var session
    @State private var model = OnboardingModel()
    @State private var showAuth = false
    @State private var showSignIn = false
    @FocusState private var nameFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            header

            ScrollView {
                VStack(alignment: .leading, spacing: Space.xxl) {
                    stepContent
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .offset(x: 28)),
                            removal: .opacity.combined(with: .offset(x: -28))
                        ))
                }
                .screenPadding()
                .padding(.top, Space.xl)
                .padding(.bottom, Space.xxxl)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .scrollDismissesKeyboard(.interactively)

            footer
        }
        .screenBackground()
        .task { await model.loadSubjects() }
        .navigationDestination(isPresented: $showAuth) {
            SignUpView(onboarding: model)
        }
        .navigationDestination(isPresented: $showSignIn) {
            SignInView()
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: Space.md) {
            HStack(alignment: .firstTextBaseline) {
                Text(L.onboarding.title)
                    .font(.display(26))
                    .foregroundStyle(Palette.ink)
                Spacer()
                Text(L.onboarding.stepOf(model.step, OnboardingModel.totalSteps))
                    .font(.system(size: 13, weight: .medium))
                    .monospacedDigit()
                    .foregroundStyle(Palette.inkSubtle)
                    .contentTransition(.numericText())
            }

            ProgressTrack(value: Double(model.step) / Double(OnboardingModel.totalSteps))
        }
        .screenPadding()
        .padding(.top, Space.sm)
        .padding(.bottom, Space.lg)
        .screenBackground()
    }

    // MARK: - Steps

    @ViewBuilder
    private var stepContent: some View {
        switch model.step {
        case 1: nameStep
        case 2: schoolStep
        case 3: subjectsStep
        default: examStep
        }
    }

    private var nameStep: some View {
        VStack(alignment: .leading, spacing: Space.xl) {
            Wordmark(size: 22)
                .padding(.bottom, Space.xs)

            StepHeading(title: L.onboarding.step1Title, subtitle: L.onboarding.intro)

            StudillyField(
                label: L.onboarding.displayName,
                hint: L.onboarding.displayNameHint,
                isRequired: true
            ) {
                FieldBox(isFocused: nameFocused) {
                    TextField("", text: $model.displayName)
                        .font(.system(size: 17))
                        .foregroundStyle(Palette.ink)
                        .textContentType(.givenName)
                        .autocorrectionDisabled()
                        .submitLabel(.next)
                        .focused($nameFocused)
                        .onSubmit { model.next() }
                }
            }

            Divider()
                .overlay(Palette.line)
                .padding(.vertical, Space.sm)

            HStack(spacing: Space.xs) {
                Text(L.auth.haveAccount)
                    .font(.system(size: 15))
                    .foregroundStyle(Palette.inkMuted)
                Button(L.auth.login) { showSignIn = true }
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Palette.brandText)
            }
            .frame(maxWidth: .infinity)
        }

    }

    private var schoolStep: some View {
        VStack(alignment: .leading, spacing: Space.xl) {
            StepHeading(title: L.onboarding.step2Title)

            Banner(message: L.onboarding.whyBody, title: L.onboarding.whyTitle, tone: .brand)

            VStack(spacing: Space.lg) {
                StudillyField(label: L.onboarding.bundesland, isRequired: true) {
                    PickerBox(
                        placeholder: L.onboarding.bundeslandPlaceholder,
                        selection: model.bundesland.isEmpty ? nil : stateName(model.bundesland)
                    ) {
                        ForEach(Education.states, id: \.code) { state in
                            Button(L.isGerman ? state.nameDe : state.nameEn) {
                                withAnimation(.easeOut(duration: 0.2)) { model.changeState(state.code) }
                            }
                        }
                    }
                }

                StudillyField(label: L.onboarding.stage, isRequired: true) {
                    SegmentedRow(
                        options: [
                            (EducationStage.sek1, L.onboarding.stageSek1),
                            (EducationStage.sek2, L.onboarding.stageSek2),
                        ],
                        selection: model.stage
                    ) { model.changeStage($0) }
                }

                StudillyField(
                    label: L.onboarding.schoolType,
                    hint: model.bundesland.isEmpty ? nil : L.onboarding.schoolTypeNote,
                    isRequired: true
                ) {
                    PickerBox(
                        placeholder: L.onboarding.schoolTypePlaceholder,
                        selection: model.schoolType.isEmpty ? nil : schoolTypeName(model.schoolType),
                        isEnabled: !model.bundesland.isEmpty
                    ) {
                        ForEach(model.availableSchoolTypes, id: \.self) { type in
                            Button(schoolTypeName(type)) {
                                withAnimation(.easeOut(duration: 0.2)) { model.schoolType = type }
                            }
                        }
                    }
                }

                StudillyField(label: L.onboarding.grade, isRequired: true) {
                    PickerBox(
                        placeholder: L.common.none,
                        selection: model.grade.map(String.init),
                        isEnabled: !model.bundesland.isEmpty
                    ) {
                        ForEach(model.availableGrades, id: \.self) { value in
                            Button(String(value)) {
                                withAnimation(.easeOut(duration: 0.2)) { model.grade = value }
                            }
                        }
                    }
                }

                if model.stage == .sek2 {
                    StudillyField(label: L.onboarding.phase) {
                        PickerBox(
                            placeholder: L.common.optional,
                            selection: phaseName(model.phase)
                        ) {
                            Button(L.common.optional) { model.phase = nil }
                            Button(L.onboarding.phaseEinfuehrung) { model.phase = "einfuehrungsphase" }
                            Button(L.onboarding.phaseQualifikation) { model.phase = "qualifikationsphase" }
                        }
                    }
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }
            }
            .animation(.spring(response: 0.35, dampingFraction: 0.85), value: model.stage)
        }
    }

    private var subjectsStep: some View {
        VStack(alignment: .leading, spacing: Space.xl) {
            StepHeading(title: L.onboarding.step4Title, subtitle: L.onboarding.subjectsHint)

            switch model.subjectsState {
            case .loading, .idle:
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Space.xxxl)
            case .failed:
                ContentUnavailableView {
                    Label(L.errors.title, systemImage: "wifi.exclamationmark")
                } description: {
                    Text(L.errors.network)
                } actions: {
                    Button(L.common.retry) {
                        Task { model.subjectsState = .idle; await model.loadSubjects() }
                    }
                    .buttonStyle(.borderedProminent)
                }
            case .loaded where model.subjects.isEmpty:
                ContentUnavailableView {
                    Label(L.pick("Keine Fächer verfügbar", "No subjects available"),
                          systemImage: "books.vertical")
                } description: {
                    Text(L.pick(
                        "Die Fächerliste konnte nicht geladen werden. Versuche es noch einmal.",
                        "The subject list could not be loaded. Please try again."
                    ))
                } actions: {
                    Button(L.common.retry) {
                        Task { model.subjectsState = .idle; await model.loadSubjects() }
                    }
                    .buttonStyle(.borderedProminent)
                }

            case .loaded:
                VStack(alignment: .leading, spacing: Space.xl) {
                    ForEach(model.groupedSubjects, id: \.category) { group in
                        VStack(alignment: .leading, spacing: Space.md) {
                            Text(L.subjectCategory.label(group.category).uppercased())
                                .font(.system(size: 11, weight: .semibold))
                                .tracking(0.6)
                                .foregroundStyle(Palette.inkSubtle)

                            FlowLayout(spacing: Space.sm) {
                                ForEach(group.subjects) { subject in
                                    SubjectChip(
                                        name: subject.name,
                                        isSelected: model.selectedSubjects.contains(subject.id),
                                        isPriority: model.prioritySubjects.contains(subject.id),
                                        onTap: {
                                            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                                model.toggleSubject(subject.id)
                                            }
                                        },
                                        onStar: {
                                            withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                                                model.togglePriority(subject.id)
                                            }
                                        }
                                    )
                                }
                            }
                        }
                    }

                    if !model.selectedSubjects.isEmpty {
                        Label(L.onboarding.priorityHint, systemImage: "star")
                            .font(.system(size: 13))
                            .foregroundStyle(Palette.inkSubtle)
                            .transition(.opacity)
                    }
                }
            }
        }
    }

    private var examStep: some View {
        VStack(alignment: .leading, spacing: Space.xl) {
            StepHeading(title: L.onboarding.step5Title, subtitle: L.onboarding.step5Subtitle)

            VStack(spacing: Space.lg) {
                StudillyField(label: L.onboarding.examSubject) {
                    PickerBox(
                        placeholder: L.common.optional,
                        selection: model.subjects.first { $0.id == model.examSubjectID }?.name
                    ) {
                        Button(L.common.optional) { model.examSubjectID = nil }
                        ForEach(model.subjects.filter { model.selectedSubjects.contains($0.id) }) { subject in
                            Button(subject.name) { model.examSubjectID = subject.id }
                        }
                    }
                }

                StudillyField(label: L.onboarding.examDate) {
                    DateBox(date: $model.examDate)
                }
            }

            Banner(message: L.onboarding.createAccountBody, title: L.onboarding.almostDone, tone: .neutral)
        }
    }

    // MARK: - Footer

    private var footer: some View {
        VStack(spacing: 0) {
            Divider().overlay(Palette.line)

            HStack(spacing: Space.md) {
                if model.step > 1 {
                    StudillyButton(
                        title: L.common.back, kind: .ghost, icon: "chevron.left",
                        fullWidth: false
                    ) { model.back() }
                    .transition(.opacity.combined(with: .scale(scale: 0.9)))
                }

                Spacer(minLength: 0)

                if model.step < OnboardingModel.totalSteps {
                    StudillyButton(
                        title: L.common.next, trailingIcon: "chevron.right",
                        isEnabled: model.canAdvance, fullWidth: false
                    ) { model.next() }
                } else {
                    StudillyButton(
                        title: L.onboarding.finish, trailingIcon: "chevron.right",
                        fullWidth: false
                    ) { showAuth = true }
                }
            }
            .screenPadding()
            .padding(.vertical, Space.md)
            .animation(.spring(response: 0.35, dampingFraction: 0.85), value: model.step)
        }
        .background(.bar)
    }

    // MARK: - Labels

    private func stateName(_ code: String) -> String {
        guard let state = Education.state(code) else { return code }
        return L.isGerman ? state.nameDe : state.nameEn
    }

    private func schoolTypeName(_ key: String) -> String {
        guard let label = Education.schoolTypeLabels[key] else { return key }
        return L.isGerman ? label.de : label.en
    }

    private func phaseName(_ key: String?) -> String? {
        switch key {
        case "einfuehrungsphase": L.onboarding.phaseEinfuehrung
        case "qualifikationsphase": L.onboarding.phaseQualifikation
        default: nil
        }
    }
}

// MARK: - Pieces

private struct StepHeading: View {
    let title: String
    var subtitle: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: Space.sm) {
            Text(title)
                .font(.display(22))
                .foregroundStyle(Palette.ink)
            if let subtitle {
                Text(subtitle)
                    .font(.system(size: 15))
                    .foregroundStyle(Palette.inkMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}
