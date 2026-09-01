import SafariServices
import SwiftUI

/// Web content, shown inside the app.
///
/// The legal pages and the store's billing portal are genuinely web
/// documents, and keeping one copy of the legal text is the point of not
/// rebuilding them. Presented as a sheet rather than handed to Safari, so
/// nothing about it feels like leaving.
struct WebSheet: UIViewControllerRepresentable {
    let url: URL
    var title: String = ""

    func makeUIViewController(context: Context) -> SFSafariViewController {
        let configuration = SFSafariViewController.Configuration()
        configuration.entersReaderIfAvailable = false
        let controller = SFSafariViewController(url: url, configuration: configuration)
        controller.preferredControlTintColor = UIColor(Palette.brand)
        controller.dismissButtonStyle = .close
        return controller
    }

    func updateUIViewController(_ controller: SFSafariViewController, context: Context) {}
}
