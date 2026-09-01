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
        ScrollView {
            VStack(alignment: .leading, spacing: Space.xl) {
                if isLoading {
                    ForEach(0..<3, id: \.self) { _ in SkeletonBlock(height: 110) }
                } else {
                    if let error { Banner(message: error, tone: .danger) }
                    if let notice { Banner(message: notice, tone: .success) }

                    planCard
                    usageCard
                    if subscription?.plan != "free" { cancelSection }
                }
            }
            .screenPadding()
            .padding(.vertical, Space.lg)
        }
        .screenBackground()
        .navigationTitle(L.settings.subscription)
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .animation(.easeOut(duration: 0.25), value: notice)
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

    private var planCard: some View {
        Card {
            VStack(alignment: .leading, spacing: Space.lg) {
                HStack {
                    Text(subscription?.planName ?? L.plans.free)
                        .font(.display(20))
                        .foregroundStyle(Palette.ink)
                    Spacer()
                    if isCancelled {
                        Badge(text: L.plan.cancelled, tone: .warning)
                    }
                }

                if let end = subscription?.currentPeriodEnd {
                    Text(isCancelled
                         ? L.plan.endsOn(end.formatted(date: .long, time: .omitted))
                         : L.plan.renewsOn(end.formatted(date: .long, time: .omitted)))
                        .font(.system(size: 14))
                        .foregroundStyle(Palette.inkMuted)
                }

                if subscription?.plan == "free" {
                    Text(L.plan.upgradeNote)
                        .font(.system(size: 14))
                        .foregroundStyle(Palette.inkMuted)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }

    private var usageCard: some View {
        Card {
            VStack(alignment: .leading, spacing: Space.lg) {
                Text(L.dashboard.usage)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Palette.ink)

                ForEach(metrics, id: \.self) { metric in
                    let used = usage.first { $0.metric == metric }?.used ?? 0
                    let limit = limitFor(metric)
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(L.usage.metric(metric))
                                .font(.system(size: 14))
                                .foregroundStyle(Palette.inkMuted)
                            Spacer()
                            Text("\(used) / \(limit)")
                                .font(.tabular(13, weight: .medium))
                                .foregroundStyle(Palette.ink)
                        }
                        ProgressTrack(
                            value: limit > 0 ? Double(used) / Double(limit) : 0,
                            tone: Double(used) / Double(max(limit, 1)) > 0.85 ? .warning : .brand
                        )
                    }
                }
            }
        }
    }

    private var cancelSection: some View {
        VStack(spacing: Space.md) {
            if isCancelled {
                StudillyButton(
                    title: L.plan.resume, kind: .secondary, isLoading: isWorking
                ) { Task { await change("resume") } }
            } else {
                StudillyButton(title: L.plan.cancel, kind: .danger) { showCancel = true }
            }
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
