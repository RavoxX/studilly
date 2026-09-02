import SwiftUI

/// The plan, managed here rather than in a browser.
///
/// There is no card form and no purchase button: purchases run through the
/// store's own checkout, and a form here that could not charge anything would
/// be theatre. What this screen does own is everything else about the plan,
/// including cancelling it.
struct PlanView: View {
    @Environment(SessionStore.self) private var session

    @State private var subscription: Subscription?
    @State private var usage: [UsageRecord] = []
    @State private var isLoading = true
    @State private var isWorking = false
    @State private var error: String?
    @State private var notice: String?
    @State private var portalURL: URL?
    @State private var showCancel = false

    private let metrics = [
        "practice_exams", "gradings", "practice_sets",
        "flashcard_sets", "uploads", "study_plans",
    ]

    var body: some View {
        Form {
            if isLoading {
                Section { ProgressView().frame(maxWidth: .infinity) }
            } else {
                if let error {
                    Section {
                        Label(error, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(Palette.danger)
                    }
                }
                if let notice {
                    Section {
                        Label(notice, systemImage: "checkmark.circle.fill")
                            .foregroundStyle(Palette.success)
                    }
                }

                Section {
                    LabeledContent(L.settings.subscription, value: subscription?.planName ?? L.plans.free)
                    if let end = subscription?.currentPeriodEnd {
                        LabeledContent(
                            isCancelled ? L.plan.endsLabel : L.plan.renewsLabel,
                            value: end.formatted(date: .abbreviated, time: .omitted)
                        )
                    }
                } footer: {
                    if subscription?.plan == "free" { Text(L.plan.upgradeNote) }
                }

                Section(L.dashboard.usage) {
                    ForEach(metrics, id: \.self) { metric in
                        let used = usage.first { $0.metric == metric }?.used ?? 0
                        let limit = limitFor(metric)
                        VStack(alignment: .leading, spacing: 6) {
                            LabeledContent(L.usage.metric(metric), value: "\(used) / \(limit)")
                            ProgressView(value: Double(used), total: Double(max(limit, 1)))
                                .tint(Double(used) / Double(max(limit, 1)) > 0.85 ? Palette.warning : Palette.brand)
                        }
                        .padding(.vertical, 2)
                    }
                }

                if subscription?.plan != "free" {
                    Section {
                        if isCancelled {
                            Button(L.plan.resume) { Task { await change("resume") } }
                                .disabled(isWorking)
                        } else {
                            Button(L.plan.cancel, role: .destructive) { showCancel = true }
                        }
                    }
                }
            }
        }
        .navigationTitle(L.settings.subscription)
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .confirmationDialog(
            L.plan.cancelTitle, isPresented: $showCancel, titleVisibility: .visible
        ) {
            Button(L.plan.cancel, role: .destructive) { Task { await change("cancel") } }
            Button(L.common.cancel, role: .cancel) {}
        } message: {
            Text(L.plan.cancelBody(endDateLabel))
        }
        .sheet(item: $portalURL) { url in
            WebSheet(url: url, title: L.plan.portal)
        }
    }

    private var isCancelled: Bool {
        subscription?.status == "cancelled" || subscription?.autoRenew == false
    }

    private var endDateLabel: String {
        subscription?.currentPeriodEnd?.formatted(date: .long, time: .omitted) ?? ""
    }

    /// Mirrors config/plans.ts. Shown so a used-of-total figure needs no extra
    /// round trip; the server is still the only thing that enforces them.
    private func limitFor(_ metric: String) -> Int {
        let plan = subscription?.plan ?? "free"
        switch (metric, plan) {
        case ("practice_exams", "pro"): return 25
        case ("practice_exams", "ultra"): return 50
        case ("practice_exams", _): return 3
        case ("gradings", "pro"): return 35
        case ("gradings", "ultra"): return 70
        case ("gradings", _): return 5
        case ("practice_sets", "pro"): return 60
        case ("practice_sets", "ultra"): return 150
        case ("practice_sets", _): return 5
        case ("flashcard_sets", "pro"): return 60
        case ("flashcard_sets", "ultra"): return 150
        case ("flashcard_sets", _): return 5
        case ("uploads", "pro"): return 80
        case ("uploads", "ultra"): return 250
        case ("uploads", _): return 5
        case ("study_plans", "pro"): return 10
        case ("study_plans", "ultra"): return 30
        case ("study_plans", _): return 1
        default: return 1
        }
    }

    private func load() async {
        do {
            let token = try await session.validToken()
            guard let userID = session.currentSession?.auth.userID else { return }
            async let subscription = StudillyAPI.subscription(token: token, userID: userID)
            async let usage = StudillyAPI.usage(token: token, userID: userID)
            self.subscription = try await subscription
            self.usage = try await usage
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? L.errors.generic
        }
        isLoading = false
    }

    private func change(_ action: String) async {
        isWorking = true
        error = nil
        notice = nil
        do {
            let token = try await session.validToken()
            let result = try await BackendAPI.changeSubscription(token: token, action: action)
            if result.usePortal == true {
                // Billing lives at the store. Opened in a sheet inside the app
                // rather than kicking the student out to Safari.
                portalURL = result.portalUrl.flatMap(URL.init(string:))
            } else {
                notice = action == "cancel" ? L.plan.cancelledNotice : L.plan.resumedNotice
                await load()
            }
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? L.errors.generic
        }
        isWorking = false
    }
}

extension URL: @retroactive Identifiable {
    public var id: String { absoluteString }
}
