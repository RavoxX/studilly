import SwiftUI

/// The wordmark: the product's own mark, followed by its name.
///
/// The mark is the asset from the website rather than something redrawn here,
/// so the app and the site are the same brand and not two interpretations of
/// it. It carries its own colour, which is why it is not tinted.
struct Wordmark: View {
    var size: CGFloat = 26
    var showsName: Bool = true

    var body: some View {
        HStack(spacing: size * 0.34) {
            Image("LogoMark")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(height: size * 1.16)

            if showsName {
                Text("Studilly")
                    .font(.system(size: size, weight: .bold))
                    .tracking(-0.5)
                    .foregroundStyle(Palette.ink)
            }
        }
        .accessibilityElement()
        .accessibilityLabel("Studilly")
    }
}
