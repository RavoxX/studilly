import Foundation

/// Every endpoint and key the app talks to, in one place.
///
/// Nothing here is exposed in the interface: there is no developer screen, no
/// hidden gesture, no build-time picker. Pointing the app at a different
/// environment is a source change, which is the only place it belongs.
///
/// The app talks to two hosts, and they do different jobs:
///
///   `apiBaseURL`   the Studilly web app. It owns the work that cannot happen
///                  on a phone: generating an exam and marking one, both of
///                  which need server-side model keys.
///
///   `supabaseURL`  the database and the auth service. Sign-in, the profile,
///                  subjects, exams and results are read and written straight
///                  from here, with row-level security doing the enforcing, so
///                  ordinary screens do not need the web app to be reachable.
enum Config {
    /// The Studilly web app. Change this one line to move environments.
    static let apiBaseURL = URL(string: "https://studilly.ravoxx.dev")!

    static let supabaseURL = URL(string: "https://zhvgfyvsjfzlamtplctv.supabase.co")!

    /// Publishable key. It is designed to sit in clients, it is already in
    /// every browser that loads the web app, and on its own it grants nothing:
    /// row-level security decides what any given signed-in user may read.
    static let supabasePublishableKey = "sb_publishable_0nTf_9rVRvJZXAHdk35OCA_XA6usjr6"

    /// Pages that live on the web and are opened in a browser rather than
    /// rebuilt here, so there is one copy of the legal text.
    enum WebPage: String {
        case privacy = "/datenschutz"
        case terms = "/agb"
        case imprint = "/impressum"
        case pricing = "/pricing"

        var url: URL { apiBaseURL.appending(path: rawValue) }
    }
}
