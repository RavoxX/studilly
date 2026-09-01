import SwiftUI

/// The wordmark, drawn rather than shipped as an image.
///
/// It takes the theme with it, stays sharp at any size, and adds nothing to
/// the bundle. The glyph mirrors the mark on the web app.
struct Wordmark: View {
    var size: CGFloat = 26

    var body: some View {
        HStack(spacing: size * 0.3) {
            ZStack {
                RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [Palette.brand, Palette.brandText],
                            startPoint: .topLeading, endPoint: .bottomTrailing
                        )
                    )
                Image(systemName: "play.fill")
                    .font(.system(size: size * 0.42, weight: .bold))
                    .foregroundStyle(.white)
                    .offset(x: size * 0.03)
            }
            .frame(width: size * 1.24, height: size * 1.24)

            Text("Studilly")
                .font(.system(size: size, weight: .bold))
                .tracking(-0.5)
                .foregroundStyle(Palette.ink)
        }
        .accessibilityElement()
        .accessibilityLabel("Studilly")
    }
}
