import SwiftUI

@main
struct StudillyIOSApp: App {
    @State private var session = SessionStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .tint(Palette.brand)
                .task { await session.restore() }
        }
    }
}
