import SwiftUI

/// The design tokens, ported from the web app's stylesheet.
///
/// Same names, same values, so a colour decided once is the same colour in
/// both places. Every value has a light and a dark form; nothing in the app
/// picks a raw colour.
enum Palette {
    // Surfaces
    static let canvas = adaptive(light: 0xF7F8FA, dark: 0x0C0F14)
    static let surface = adaptive(light: 0xFFFFFF, dark: 0x14181F)
    static let surfaceRaised = adaptive(light: 0xFFFFFF, dark: 0x1A1F28)
    static let surfaceSunken = adaptive(light: 0xF1F3F7, dark: 0x0F131A)

    // Text. Every value clears 4.5:1 on both canvas and surface.
    static let ink = adaptive(light: 0x0F1419, dark: 0xE8EBF0)
    static let inkMuted = adaptive(light: 0x4A5462, dark: 0xA3ADBB)
    static let inkSubtle = adaptive(light: 0x667085, dark: 0x8792A3)

    // Lines
    static let line = adaptive(light: 0xE4E7EC, dark: 0x232935)
    static let lineStrong = adaptive(light: 0xD0D5DD, dark: 0x313947)

    // Brand
    static let brand = adaptive(light: 0x2F63EA, dark: 0x3B6FF6)
    static let brandSoft = adaptive(light: 0xEEF2FE, dark: 0x161E33)
    static let brandText = adaptive(light: 0x2C5FE0, dark: 0x8CAAFF)
    static let onBrand = Color.white

    // Status. Always paired with an icon or a label, never colour alone.
    static let success = adaptive(light: 0x0F7A55, dark: 0x34C894)
    static let successSoft = adaptive(light: 0xE7F6EF, dark: 0x10231C)
    static let warning = adaptive(light: 0xA15C07, dark: 0xE5A640)
    static let warningSoft = adaptive(light: 0xFDF3E4, dark: 0x241C10)
    static let danger = adaptive(light: 0xB42318, dark: 0xFF8B82)
    static let dangerSoft = adaptive(light: 0xFDECEB, dark: 0x2A1513)

    private static func adaptive(light: UInt32, dark: UInt32) -> Color {
        Color(UIColor { traits in
            UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }
}

private extension UIColor {
    convenience init(hex: UInt32) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }
}

/// One spacing scale, so gaps are chosen from a list rather than invented.
enum Space {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 20
    static let xxl: CGFloat = 28
    static let xxxl: CGFloat = 40
}

/// The same corner-radius rule the web app follows: controls 10, surfaces 14,
/// pills fully round. No exceptions, so nothing looks borrowed.
enum Radius {
    static let control: CGFloat = 10
    static let surface: CGFloat = 14
    static let pill: CGFloat = 999
}

extension Font {
    /// Display sizes use rounded digits and tight tracking, matching the web
    /// app's headline treatment. Everything scales with Dynamic Type.
    static func display(_ size: CGFloat, weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .default)
    }

    /// Figures that should line up in columns: points, grades, timers.
    static func tabular(_ size: CGFloat, weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }
}

extension View {
    /// Standard screen padding, so every screen starts from the same margin.
    func screenPadding() -> some View {
        padding(.horizontal, Space.xl)
    }
}
