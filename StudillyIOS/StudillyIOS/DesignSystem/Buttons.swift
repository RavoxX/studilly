import SwiftUI

/// The app's buttons, built on the system's.
///
/// These are `ButtonStyle`s rather than a bespoke control, so `Button` keeps
/// everything UIKit already does well: the press animation, the accessibility
/// traits, the way it behaves inside a `List` row or a toolbar. Only the
/// colours and the height are the app's.
struct PrimaryButtonStyle: ButtonStyle {
    var isEnabled = true
    var fullWidth = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(Palette.onBrand)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .padding(.horizontal, fullWidth ? 0 : Space.xl)
            .frame(height: 52)
            .background(Palette.brand, in: .rect(cornerRadius: Radius.control, style: .continuous))
            .opacity(isEnabled ? (configuration.isPressed ? 0.85 : 1) : 0.45)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.snappy(duration: 0.18), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    var fullWidth = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(Palette.ink)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .padding(.horizontal, fullWidth ? 0 : Space.xl)
            .frame(height: 52)
            .background(Palette.surface, in: .rect(cornerRadius: Radius.control, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                    .strokeBorder(Palette.lineStrong, lineWidth: 1)
            )
            .opacity(configuration.isPressed ? 0.85 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.snappy(duration: 0.18), value: configuration.isPressed)
    }
}

extension View {
    func primaryButton(enabled: Bool = true, fullWidth: Bool = true) -> some View {
        buttonStyle(PrimaryButtonStyle(isEnabled: enabled, fullWidth: fullWidth))
            .disabled(!enabled)
    }

    func secondaryButton(fullWidth: Bool = true) -> some View {
        buttonStyle(SecondaryButtonStyle(fullWidth: fullWidth))
    }
}

/// A label that swaps for a spinner while work is in flight, so the button
/// keeps its size and the layout does not jump.
struct ButtonLabel: View {
    let title: String
    var icon: String? = nil
    var trailingIcon: String? = nil
    var isLoading: Bool = false

    var body: some View {
        HStack(spacing: Space.sm) {
            if isLoading {
                ProgressView().controlSize(.small).tint(Palette.onBrand)
            } else if let icon {
                Image(systemName: icon).font(.system(size: 15, weight: .semibold))
            }
            Text(title).lineLimit(1)
            if let trailingIcon, !isLoading {
                Image(systemName: trailingIcon).font(.system(size: 14, weight: .semibold))
            }
        }
    }
}
