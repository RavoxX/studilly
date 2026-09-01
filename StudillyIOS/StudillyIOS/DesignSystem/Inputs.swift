import SwiftUI

/// A menu that looks like a text field.
///
/// A native `Picker` in a form renders as a row with a chevron, which reads as
/// navigation rather than as an input. These sit in a column of text fields,
/// so they borrow the field's chrome and keep the column reading as one form.
struct PickerBox<Content: View>: View {
    let placeholder: String
    var selection: String?
    var isEnabled: Bool = true
    @ViewBuilder let content: Content

    var body: some View {
        Menu {
            content
        } label: {
            FieldBox {
                HStack {
                    Text(selection ?? placeholder)
                        .font(.system(size: 17))
                        .foregroundStyle(selection == nil ? Palette.inkSubtle : Palette.ink)
                        .lineLimit(1)
                    Spacer()
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Palette.inkSubtle)
                }
            }
        }
        .disabled(!isEnabled)
        .opacity(isEnabled ? 1 : 0.5)
        .animation(.easeOut(duration: 0.2), value: selection)
    }
}

/// Two or three mutually exclusive options, shown at once.
///
/// Used where a menu would hide the choice behind a tap: with only two school
/// stages, seeing both is faster than opening a list to find out what they are.
struct SegmentedRow<Value: Hashable>: View {
    let options: [(Value, String)]
    let selection: Value
    let onSelect: (Value) -> Void

    @Namespace private var highlight

    var body: some View {
        HStack(spacing: 4) {
            ForEach(options, id: \.0) { value, label in
                Button {
                    UISelectionFeedbackGenerator().selectionChanged()
                    withAnimation(.spring(response: 0.32, dampingFraction: 0.8)) { onSelect(value) }
                } label: {
                    Text(label)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(selection == value ? Palette.ink : Palette.inkMuted)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Space.md)
                        .background {
                            if selection == value {
                                RoundedRectangle(cornerRadius: Radius.control - 3, style: .continuous)
                                    .fill(Palette.surface)
                                    .shadow(color: .black.opacity(0.06), radius: 3, y: 1)
                                    .matchedGeometryEffect(id: "seg", in: highlight)
                            }
                        }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .background(Palette.surfaceSunken)
        .clipShape(RoundedRectangle(cornerRadius: Radius.control, style: .continuous))
    }
}

/// A date field that opens a wheel, and can be cleared again.
struct DateBox: View {
    @Binding var date: Date?
    @State private var showPicker = false
    @State private var draft = Date()

    var body: some View {
        Button {
            draft = date ?? Calendar.current.date(byAdding: .day, value: 14, to: Date()) ?? Date()
            showPicker = true
        } label: {
            FieldBox {
                HStack {
                    Text(date.map { $0.formatted(date: .long, time: .omitted) } ?? L.common.optional)
                        .font(.system(size: 17))
                        .foregroundStyle(date == nil ? Palette.inkSubtle : Palette.ink)
                    Spacer()
                    Image(systemName: "calendar")
                        .font(.system(size: 15))
                        .foregroundStyle(Palette.inkSubtle)
                }
            }
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showPicker) {
            NavigationStack {
                DatePicker("", selection: $draft, in: Date()..., displayedComponents: .date)
                    .datePickerStyle(.graphical)
                    .padding()
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button(L.common.cancel) { showPicker = false }
                        }
                        ToolbarItem(placement: .confirmationAction) {
                            Button(L.common.done) { date = draft; showPicker = false }
                                .fontWeight(.semibold)
                        }
                        if date != nil {
                            ToolbarItem(placement: .bottomBar) {
                                Button(L.common.none, role: .destructive) {
                                    date = nil; showPicker = false
                                }
                            }
                        }
                    }
            }
            .presentationDetents([.medium, .large])
        }
    }
}

/// A subject, and its focus star once it is chosen.
///
/// The star only appears after selection: an unselected subject cannot be a
/// focus, and showing a disabled star next to every subject would double the
/// controls on the screen for no gain.
struct SubjectChip: View {
    let name: String
    let isSelected: Bool
    let isPriority: Bool
    let onTap: () -> Void
    let onStar: () -> Void

    var body: some View {
        HStack(spacing: 0) {
            Button(action: onTap) {
                HStack(spacing: Space.xs + 2) {
                    if isSelected {
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .bold))
                            .transition(.scale.combined(with: .opacity))
                    }
                    Text(name)
                        .font(.system(size: 15, weight: .medium))
                        .lineLimit(1)
                }
                .foregroundStyle(isSelected ? Palette.brandText : Palette.inkMuted)
                .padding(.horizontal, Space.md + 2)
                .padding(.vertical, 10)
            }
            .buttonStyle(.plain)

            if isSelected {
                Rectangle()
                    .fill(Palette.brand.opacity(0.25))
                    .frame(width: 1)
                    .padding(.vertical, 6)

                Button(action: onStar) {
                    Image(systemName: isPriority ? "star.fill" : "star")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(isPriority ? Palette.onBrand : Palette.brandText)
                        .padding(.horizontal, Space.md)
                        .padding(.vertical, 11)
                        .background(isPriority ? Palette.brand : .clear)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(name): \(L.onboarding.priorityHint)")
                .transition(.opacity.combined(with: .scale(scale: 0.8, anchor: .leading)))
            }
        }
        .background(isSelected ? Palette.brandSoft : Palette.surface)
        .clipShape(RoundedRectangle(cornerRadius: Radius.control, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                .strokeBorder(isSelected ? Palette.brand : Palette.lineStrong, lineWidth: 1)
        )
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}

/// Wraps its children onto as many lines as they need.
///
/// Subject names vary from "Kunst" to "Wirtschaft und Recht", so a grid with
/// fixed columns would leave ragged gaps. This packs them the way text wraps.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, lineHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > width, x > 0 {
                x = 0
                y += lineHeight + spacing
                lineHeight = 0
            }
            x += size.width + spacing
            lineHeight = max(lineHeight, size.height)
        }
        return CGSize(width: width, height: y + lineHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, lineHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX
                y += lineHeight + spacing
                lineHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            lineHeight = max(lineHeight, size.height)
        }
    }
}
