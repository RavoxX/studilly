import SwiftUI

// MARK: - Buttons

enum ButtonKind {
    case primary, secondary, ghost, danger
}

/// The app's button.
///
/// One component covers every variant so padding, radius, disabled state and
/// the press animation are decided once. The press uses a scale rather than an
/// opacity change: on a phone the finger covers the control, and a shape that
/// gives slightly under pressure reads better than a colour that fades under
/// a thumb.
struct StudillyButton: View {
    let title: String
    var kind: ButtonKind = .primary
    var icon: String? = nil
    var trailingIcon: String? = nil
    var isLoading: Bool = false
    var isEnabled: Bool = true
    var fullWidth: Bool = true
    let action: () -> Void

    @State private var pressed = false

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        } label: {
            HStack(spacing: Space.sm) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(foreground)
                        .scaleEffect(0.85)
                } else if let icon {
                    Image(systemName: icon).font(.system(size: 15, weight: .semibold))
                }
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .lineLimit(1)
                if let trailingIcon, !isLoading {
                    Image(systemName: trailingIcon).font(.system(size: 14, weight: .semibold))
                }
            }
            .foregroundStyle(foreground)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .frame(height: 52)
            .padding(.horizontal, fullWidth ? Space.lg : Space.xl)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: Radius.control, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                    .strokeBorder(border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .disabled(!isEnabled || isLoading)
        .opacity(isEnabled ? 1 : 0.45)
        .scaleEffect(pressed ? 0.975 : 1)
        .animation(.spring(response: 0.25, dampingFraction: 0.7), value: pressed)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in if isEnabled && !isLoading { pressed = true } }
                .onEnded { _ in pressed = false }
        )
        .accessibilityLabel(title)
    }

    private var foreground: Color {
        switch kind {
        case .primary: Palette.onBrand
        case .secondary: Palette.ink
        case .ghost: Palette.inkMuted
        case .danger: Palette.danger
        }
    }

    private var background: Color {
        switch kind {
        case .primary: Palette.brand
        case .secondary: Palette.surface
        case .ghost: .clear
        case .danger: Palette.dangerSoft
        }
    }

    private var border: Color {
        switch kind {
        case .primary, .ghost: .clear
        case .secondary: Palette.lineStrong
        case .danger: Palette.danger.opacity(0.25)
        }
    }
}

// MARK: - Fields

/// A labelled text field.
///
/// The label sits above the field and stays there: a placeholder that doubles
/// as a label disappears exactly when someone needs it, which is while they
/// are typing. Errors appear below, where the eye already is.
struct StudillyField<Content: View>: View {
    let label: String
    var hint: String? = nil
    var error: String? = nil
    var isRequired: Bool = false
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: Space.sm) {
            HStack(spacing: 2) {
                Text(label)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Palette.ink)
                if isRequired {
                    Text("*").font(.system(size: 14)).foregroundStyle(Palette.danger)
                }
            }

            content

            if let error {
                Label(error, systemImage: "exclamationmark.circle.fill")
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.danger)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            } else if let hint {
                Text(hint)
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.inkSubtle)
            }
        }
        .animation(.easeOut(duration: 0.18), value: error)
    }
}

/// The text-input chrome, shared by every field so focus and error states look
/// the same everywhere.
struct FieldBox<Content: View>: View {
    var isFocused: Bool = false
    var hasError: Bool = false
    @ViewBuilder let content: Content

    var body: some View {
        content
            .padding(.horizontal, Space.lg)
            .frame(height: 52)
            .background(Palette.surface)
            .clipShape(RoundedRectangle(cornerRadius: Radius.control, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                    .strokeBorder(borderColor, lineWidth: isFocused || hasError ? 2 : 1)
            )
            .animation(.easeOut(duration: 0.15), value: isFocused)
            .animation(.easeOut(duration: 0.15), value: hasError)
    }

    private var borderColor: Color {
        if hasError { return Palette.danger }
        return isFocused ? Palette.brand : Palette.lineStrong
    }
}

// MARK: - Surfaces

struct Card<Content: View>: View {
    var padding: CGFloat = Space.xl
    @ViewBuilder let content: Content

    var body: some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.surface)
            .clipShape(RoundedRectangle(cornerRadius: Radius.surface, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Radius.surface, style: .continuous)
                    .strokeBorder(Palette.line, lineWidth: 1)
            )
    }
}

enum Tone {
    case neutral, brand, success, warning, danger

    var foreground: Color {
        switch self {
        case .neutral: Palette.inkMuted
        case .brand: Palette.brandText
        case .success: Palette.success
        case .warning: Palette.warning
        case .danger: Palette.danger
        }
    }

    var background: Color {
        switch self {
        case .neutral: Palette.surfaceSunken
        case .brand: Palette.brandSoft
        case .success: Palette.successSoft
        case .warning: Palette.warningSoft
        case .danger: Palette.dangerSoft
        }
    }

    var icon: String {
        switch self {
        case .neutral: "info.circle.fill"
        case .brand: "info.circle.fill"
        case .success: "checkmark.circle.fill"
        case .warning: "exclamationmark.triangle.fill"
        case .danger: "exclamationmark.octagon.fill"
        }
    }
}

struct Badge: View {
    let text: String
    var tone: Tone = .neutral

    var body: some View {
        Text(text)
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(tone.foreground)
            .padding(.horizontal, Space.md)
            .padding(.vertical, 5)
            .background(tone.background)
            .clipShape(Capsule())
    }
}

/// An inline message. Carries an icon as well as a colour, so the meaning does
/// not depend on being able to tell the colours apart.
struct Banner: View {
    let message: String
    var title: String? = nil
    var tone: Tone = .neutral

    var body: some View {
        HStack(alignment: .top, spacing: Space.md) {
            Image(systemName: tone.icon)
                .font(.system(size: 15))
                .foregroundStyle(tone.foreground)
                .padding(.top, 1)
            VStack(alignment: .leading, spacing: 3) {
                if let title {
                    Text(title)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Palette.ink)
                }
                Text(message)
                    .font(.system(size: 14))
                    .foregroundStyle(Palette.inkMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(Space.lg)
        .background(tone.background)
        .clipShape(RoundedRectangle(cornerRadius: Radius.control, style: .continuous))
        .transition(.opacity.combined(with: .move(edge: .top)))
    }
}

struct ProgressTrack: View {
    let value: Double
    var tone: Tone = .brand

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Palette.surfaceSunken)
                Capsule()
                    .fill(tone.foreground)
                    .frame(width: max(0, min(1, value)) * geo.size.width)
            }
        }
        .frame(height: 6)
        .animation(.spring(response: 0.45, dampingFraction: 0.85), value: value)
    }
}

// MARK: - States

/// Skeletons shaped like the content they stand in for, so the layout does not
/// jump when the real thing arrives.
struct SkeletonBlock: View {
    var height: CGFloat = 16
    var width: CGFloat? = nil
    @State private var shimmer = false

    var body: some View {
        RoundedRectangle(cornerRadius: 6, style: .continuous)
            .fill(Palette.surfaceSunken)
            .frame(width: width, height: height)
            .overlay(
                LinearGradient(
                    colors: [.clear, Palette.line.opacity(0.7), .clear],
                    startPoint: .leading, endPoint: .trailing
                )
                .offset(x: shimmer ? 220 : -220)
                .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
            )
            .onAppear {
                withAnimation(.linear(duration: 1.3).repeatForever(autoreverses: false)) {
                    shimmer = true
                }
            }
    }
}

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: Space.lg) {
            Image(systemName: icon)
                .font(.system(size: 34, weight: .light))
                .foregroundStyle(Palette.inkSubtle)
            VStack(spacing: Space.sm) {
                Text(title)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Palette.ink)
                Text(message)
                    .font(.system(size: 15))
                    .foregroundStyle(Palette.inkMuted)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if let actionTitle, let action {
                StudillyButton(title: actionTitle, kind: .secondary, fullWidth: false, action: action)
                    .padding(.top, Space.xs)
            }
        }
        .padding(Space.xxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.canvas)
    }
}

struct ErrorStateView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: Space.lg) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 32, weight: .light))
                .foregroundStyle(Palette.inkSubtle)
            Text(message)
                .font(.system(size: 15))
                .foregroundStyle(Palette.inkMuted)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
            StudillyButton(title: L.common.retry, kind: .secondary, fullWidth: false, action: retry)
        }
        .padding(Space.xxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.canvas)
    }
}


/// A rule with a word in it, separating two ways of doing the same thing.
struct LabelledDivider: View {
    var label: String = L.pick("oder", "or")

    var body: some View {
        HStack(spacing: Space.lg) {
            Rectangle().fill(Palette.line).frame(height: 1)
            Text(label)
                .font(.system(size: 13))
                .foregroundStyle(Palette.inkSubtle)
            Rectangle().fill(Palette.line).frame(height: 1)
        }
        .accessibilityHidden(true)
    }
}
