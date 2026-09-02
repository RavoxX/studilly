import SwiftUI

// MARK: - Buttons

enum ButtonKind {
    case primary, secondary, ghost, danger
}

/// A `Button` wearing one of the app's styles.
///
/// The control itself is the system's, so the press behaviour, the
/// accessibility traits and the way it sits in a toolbar or a list row all
/// come from UIKit. Only the colours and the height are the app's, and those
/// live in the ButtonStyles next door.
struct StudillyButton: View {
    let title: String
    var kind: ButtonKind = .primary
    var icon: String? = nil
    var trailingIcon: String? = nil
    var isLoading: Bool = false
    var isEnabled: Bool = true
    var fullWidth: Bool = true
    let action: () -> Void

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        } label: {
            ButtonLabel(
                title: title, icon: icon,
                trailingIcon: trailingIcon, isLoading: isLoading
            )
        }
        .modifier(KindStyle(kind: kind, enabled: isEnabled && !isLoading, fullWidth: fullWidth))
    }
}

private struct KindStyle: ViewModifier {
    let kind: ButtonKind
    let enabled: Bool
    let fullWidth: Bool

    func body(content: Content) -> some View {
        switch kind {
        case .primary:
            content.primaryButton(enabled: enabled, fullWidth: fullWidth)
        case .secondary:
            content.secondaryButton(fullWidth: fullWidth).disabled(!enabled)
        case .ghost:
            content
                .buttonStyle(.plain)
                .foregroundStyle(Palette.inkMuted)
                .font(.system(size: 16, weight: .semibold))
                .disabled(!enabled)
                .opacity(enabled ? 1 : 0.45)
        case .danger:
            content
                .buttonStyle(.bordered)
                .tint(Palette.danger)
                .controlSize(.large)
                .disabled(!enabled)
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
