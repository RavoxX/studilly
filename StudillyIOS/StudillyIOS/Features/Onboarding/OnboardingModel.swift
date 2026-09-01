import Foundation
import SwiftUI

/// The answers the setup collects, and the rules about when a step is done.
///
/// It runs before there is an account, so everything lives here until there is
/// somewhere to put it. Nothing is written until the student has signed up,
/// and then it is written in one go.
@MainActor
@Observable
final class OnboardingModel {
    static let totalSteps = 4

    var step = 1

    var displayName = ""
    var bundesland = ""
    var stage: EducationStage = .sek1
    var schoolType = ""
    var grade: Int?
    var phase: String?
    var selectedSubjects: Set<String> = []
    var prioritySubjects: Set<String> = []
    var examSubjectID: String?
    var examDate: Date?

    var subjects: [Subject] = []
    var subjectsState: LoadState = .idle
    var isSubmitting = false
    var errorMessage: String?

    enum LoadState: Equatable { case idle, loading, loaded, failed }

    // Options cascade: a state narrows the school types to the ones that exist
    // there, and the stage narrows the years. The database re-checks all of
    // it, so this is convenience rather than a guarantee.
    var availableSchoolTypes: [String] {
        bundesland.isEmpty ? [] : Education.schoolTypes(in: bundesland, stage: stage)
    }

    var availableGrades: [Int] {
        bundesland.isEmpty ? [] : Education.grades(in: bundesland, stage: stage)
    }

    func changeState(_ code: String) {
        bundesland = code
        schoolType = ""
        grade = nil
    }

    func changeStage(_ next: EducationStage) {
        stage = next
        schoolType = ""
        grade = nil
        phase = nil
    }

    func toggleSubject(_ id: String) {
        if selectedSubjects.contains(id) {
            selectedSubjects.remove(id)
            prioritySubjects.remove(id)
            if examSubjectID == id { examSubjectID = nil }
        } else {
            selectedSubjects.insert(id)
        }
    }

    func togglePriority(_ id: String) {
        if prioritySubjects.contains(id) { prioritySubjects.remove(id) }
        else { prioritySubjects.insert(id) }
    }

    var canAdvance: Bool {
        switch step {
        case 1: !displayName.trimmingCharacters(in: .whitespaces).isEmpty
        case 2: !bundesland.isEmpty && !schoolType.isEmpty && grade != nil
        case 3: !selectedSubjects.isEmpty
        default: true
        }
    }

    var groupedSubjects: [(category: String, subjects: [Subject])] {
        var order: [String] = []
        var groups: [String: [Subject]] = [:]
        for subject in subjects {
            if groups[subject.category] == nil { order.append(subject.category) }
            groups[subject.category, default: []].append(subject)
        }
        return order.map { ($0, groups[$0] ?? []) }
    }

    /// Subjects are public reference data, but the table is still read with a
    /// token, so this needs a session. Before signup there is none, which is
    /// why the list is fetched with the publishable key alone.
    func loadSubjects() async {
        guard subjectsState != .loaded else { return }
        subjectsState = .loading
        do {
            subjects = try await StudillyAPI.subjects(token: Config.supabasePublishableKey)
            subjectsState = .loaded
        } catch {
            subjectsState = .failed
        }
    }

    func next() {
        guard canAdvance, step < Self.totalSteps else { return }
        withAnimation(.spring(response: 0.42, dampingFraction: 0.86)) { step += 1 }
        UIImpactFeedbackGenerator(style: .soft).impactOccurred()
    }

    func back() {
        guard step > 1 else { return }
        withAnimation(.spring(response: 0.42, dampingFraction: 0.86)) { step -= 1 }
    }
}
