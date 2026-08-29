import type { Dictionary } from "./de";

/**
 * English interface strings.
 *
 * Typed as `Dictionary`, so a missing or misnamed key fails the build. German
 * subject-matter terms that have no accurate English equivalent are kept in
 * German on purpose: a student searching for "Erwartungshorizont" should find
 * that word, not a lossy translation.
 */
export const en: Dictionary = {
  common: {
    appName: "Studilly",
    tagline: "Practise with exams that match the real thing.",
    save: "Save",
    saving: "Saving",
    saved: "Saved",
    cancel: "Cancel",
    back: "Back",
    next: "Next",
    continue: "Continue",
    finish: "Finish",
    close: "Close",
    delete: "Delete",
    remove: "Remove",
    edit: "Edit",
    rename: "Rename",
    create: "Create",
    retry: "Try again",
    loading: "Loading",
    search: "Search",
    optional: "optional",
    required: "required",
    all: "All",
    none: "None",
    yes: "Yes",
    no: "No",
    of: "of",
    minutes: "minutes",
    minutesShort: "min",
    points: "points",
    pointsShort: "pts",
    today: "Today",
    tomorrow: "Tomorrow",
    yesterday: "Yesterday",
    confirm: "Confirm",
    copy: "Copy",
    copied: "Copied",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    skipToContent: "Skip to content",
    moreOptions: "More options",
    logo: "Studilly logo",
  },

  nav: {
    dashboard: "Dashboard",
    materials: "Materials",
    exams: "Exams",
    practice: "Practice",
    learning: "Learning",
    groups: "Study groups",
    plan: "Study plan",
    subscription: "Plan",
    settings: "Settings",
    logout: "Sign out",
    account: "Account",
    theme: "Appearance",
    language: "Language",
  },

  theme: {
    system: "System",
    light: "Light",
    dark: "Dark",
  },

  auth: {
    loginTitle: "Sign in",
    loginSubtitle: "Sign in to pick up where you left off.",
    registerTitle: "Create account",
    registerSubtitle: "Start free. No payment details needed.",
    email: "Email",
    password: "Password",
    passwordConfirm: "Repeat password",
    displayName: "First name",
    displayNameHint: "How the app will address you.",
    login: "Sign in",
    register: "Create account",
    logout: "Sign out",
    forgotPassword: "Forgot your password?",
    noAccount: "No account yet?",
    hasAccount: "Already have an account?",
    passwordHint: "At least 8 characters.",
    resetTitle: "Reset password",
    resetSubtitle: "We will send you a link to set a new password.",
    resetSubmit: "Send link",
    resetSent:
      "If an account exists for that address, the link is on its way. Check your spam folder too.",
    newPasswordTitle: "Set a new password",
    newPasswordSubmit: "Save password",
    verifyTitle: "Confirm your email",
    verifySubtitle: (email: string) =>
      `We sent a confirmation link to ${email}. Open it to activate your account.`,
    verifyResend: "Send the link again",
    verifyResent: "New link sent.",
    errors: {
      invalidCredentials: "That email or password is not right.",
      emailInUse: "An account already exists for this email.",
      weakPassword: "Passwords need at least 8 characters.",
      passwordMismatch: "The passwords do not match.",
      invalidEmail: "That email address does not look valid.",
      emailNotConfirmed:
        "Confirm your email address first. The link is in your inbox.",
      rateLimited: "Too many attempts. Give it a moment.",
      generic: "That did not work. Please try again.",
      expiredLink: "This link has expired. Request a new one.",
    },
  },

  onboarding: {
    title: "Quick setup",
    intro:
      "Studilly builds exams that match your federal state, school type and grade. We need four details for that.",
    whyTitle: "Why we ask",
    whyBody:
      "Exams differ noticeably between German federal states: task formats, operators and marking are not the same everywhere. Without these details we could only produce generic questions instead of realistic exams. You can change all of it later in Settings.",
    stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
    step1Title: "What should we call you?",
    step2Title: "Where do you go to school?",
    step3Title: "Which grade?",
    step4Title: "Which subjects?",
    step5Title: "Any exam coming up?",
    step5Subtitle:
      "Optional. With a date, Studilly builds a study plan that reaches it.",
    bundesland: "Federal state",
    bundeslandPlaceholder: "Choose a state",
    schoolType: "School type",
    schoolTypePlaceholder: "Choose a school type",
    grade: "Grade",
    stage: "Stage",
    stageSek1: "Lower secondary (Sekundarstufe I)",
    stageSek2: "Upper secondary (gymnasiale Oberstufe)",
    phase: "Phase of upper secondary",
    phaseEinfuehrung: "Einführungsphase",
    phaseQualifikation: "Qualifikationsphase",
    subjects: "Subjects",
    subjectsHint:
      "Pick the subjects you want to practise. You can add more at any time.",
    subjectsMin: "Choose at least one subject.",
    priorityHint: "Star the ones you want to focus on.",
    examDate: "Exam date",
    examSubject: "Subject",
    addExamDate: "Add a date",
    finish: "Finish setup",
    schoolTypeNoteTitle: "School types differ by state",
    schoolTypeNote:
      "Only school types that actually exist in your state are listed.",
  },

  dashboard: {
    title: "Dashboard",
    greeting: (name: string) => (name ? `Hello ${name}` : "Welcome"),
    nextActionTitle: "Up next",
    nextActionEmpty:
      "Upload your first material and Studilly will turn it into a practice exam.",
    nextActionEmptyCta: "Upload material",
    upcomingExams: "Upcoming exams",
    upcomingExamsEmpty: "No date saved.",
    addExamDate: "Add exam date",
    daysLeft: (days: number) =>
      days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days left`,
    recentResults: "Recent results",
    recentResultsEmpty: "No exam written yet.",
    weakTopics: "What to work on",
    weakTopicsEmpty:
      "Once you have written an exam, your focus areas appear here.",
    recommendedPractice: "Recommended practice",
    recentMaterials: "Recently uploaded",
    studyStreak: "Day streak",
    dueCards: (count: number) =>
      count === 1 ? "1 card due" : `${count} cards due`,
    startPractice: "Practise",
    reviewCards: "Review cards",
    viewAll: "View all",
    planToday: "Today in your plan",
    planTodayEmpty: "Nothing scheduled for today.",
  },

  materials: {
    title: "Materials",
    subtitle:
      "Your documents. Studilly builds exams, practice and flashcards from them.",
    upload: "Upload material",
    uploadTitle: "Upload material",
    dropzone: "Drop a file here or choose one",
    dropzoneHint: "PDF, image, Word or text. Up to 25 MB.",
    chooseFile: "Choose file",
    uploading: "Uploading",
    empty: "No materials yet",
    emptyBody:
      "Upload class notes, worksheets, scripts or photos of your notebook. Studilly reads them and maps them to your curriculum.",
    subject: "Subject",
    subjectPlaceholder: "Choose a subject",
    titleField: "Title",
    status: {
      uploaded: "Queued",
      extracting: "Reading text",
      analyzing: "Finding topics",
      ready: "Ready",
      failed: "Failed",
    },
    topics: "Topics found",
    topicsEmpty: "No topics found for this material yet.",
    summary: "Summary",
    pages: (n: number) => (n === 1 ? "1 page" : `${n} pages`),
    createExam: "Create exam",
    createFlashcards: "Create flashcards",
    deleteConfirmTitle: "Delete this material?",
    deleteConfirmBody:
      "The file and every text passage taken from it will be deleted. Exams you already created stay.",
    reprocess: "Process again",
    processingFailed:
      "We could not read any text from this file. For photos, a sharper shot usually helps.",
    curriculumMatch: "Matches curriculum topic",
    fileTooLarge: "This file is larger than 25 MB.",
    unsupportedType: "That file type is not supported.",
  },

  exams: {
    title: "Exams",
    subtitle: "Practice exams in the format of your real ones.",
    create: "Create exam",
    createTitle: "New exam",
    empty: "No exams yet",
    emptyBody:
      "Turn your materials into a practice exam with a model solution and marking scheme.",
    fromMaterials: "From materials",
    selectMaterials: "Choose materials",
    selectMaterialsHint:
      "Studilly uses only the relevant passages, not whole files.",
    selectTopics: "Topics",
    selectTopicsHint: "Leave empty to include every topic found.",
    difficulty: "Difficulty",
    difficultyEasy: "Easy",
    difficultyStandard: "Standard",
    difficultyHard: "Demanding",
    duration: "Time allowed",
    taskCount: "Number of tasks",
    generate: "Create exam",
    generating: "Building your exam",
    generatingHint: "This usually takes under a minute.",
    steps: {
      retrieving: "Finding relevant passages",
      aligning: "Mapping topics to the curriculum",
      writing: "Writing tasks",
      solutions: "Building solutions",
      validating: "Checking the exam",
    },
    generationFailed: "The exam could not be created.",
    generationFailedBody:
      "Nothing was taken from your monthly allowance. Try again or pick different materials.",
    overview: "Overview",
    start: "Start exam",
    resume: "Resume",
    startAgain: "Write again",
    tasks: (n: number) => (n === 1 ? "1 task" : `${n} tasks`),
    totalPoints: (n: number) => `${n} points`,
    instructions: "Instructions",
    attempts: "Attempts",
    noAttempts: "Not written yet.",
    beforeYouStartTitle: "Before you start",
    beforeYouStart:
      "The clock starts when you do. Your answers save automatically, even if you reload the page.",
    afb: "Requirement level",
    afbExplainer: {
      I: "AFB I, reproduction: recall what you have learned.",
      II: "AFB II, transfer: apply what you have learned.",
      III: "AFB III, reflection: judge and transfer independently.",
    },
    operator: "Operator",
    deleteConfirmTitle: "Delete this exam?",
    deleteConfirmBody:
      "The exam and every attempt and result belonging to it will be deleted.",
    validationNotice: "Automatically checked",
    validationNoticeBody:
      "Point totals, solutions and the marking scheme were verified before this was shown.",
  },

  examRunner: {
    task: "Task",
    taskOf: (current: number, total: number) => `Task ${current} of ${total}`,
    yourAnswer: "Your answer",
    answerPlaceholder: "Write your answer here.",
    answered: "Answered",
    unanswered: "Open",
    flagged: "Flagged",
    flag: "Flag for review",
    unflag: "Remove flag",
    overview: "Task overview",
    timeLeft: "Time left",
    timeUp: "Time is up",
    timeUpBody:
      "You can keep adding to your answers and submit when ready. Going over time is noted in the result.",
    autosaved: "Saved automatically",
    saveFailed: "Not saved",
    saveFailedHint: "We are still retrying. Do not close the page yet.",
    submit: "Submit",
    submitTitle: "Submit this exam?",
    submitBody: (answered: number, total: number) =>
      answered === total
        ? "Every task is answered. Marking starts next."
        : `${total - answered} of ${total} tasks are still open. You can submit anyway.`,
    submitConfirm: "Submit now",
    exit: "Leave",
    exitTitle: "Leave this exam?",
    exitBody: "Your progress is saved. You can continue from the same place later.",
    grading: "Marking your answers",
    gradingHint: "Each task is checked against its marking scheme separately.",
    gradingFailed: "Marking failed.",
    gradingFailedBody:
      "Your answers are saved. You can start marking again.",
    retryGrading: "Start marking again",
    stimulus: "Source material",
  },

  results: {
    title: "Result",
    yourGrade: "Your grade",
    gradePoints: "Points on the 15-point scale",
    pointsAchieved: (awarded: number, total: number) =>
      `${awarded} of ${total} points`,
    percentage: "Percent",
    duration: "Time taken",
    scaleUsed: "Marking key",
    scaleNotice:
      "Percentage boundaries are set by your school. You can change the key in Settings.",
    summary: "Summary",
    strengths: "What went well",
    weaknesses: "What to work on",
    taskByTask: "Task by task",
    yourAnswer: "Your answer",
    noAnswer: "Not answered",
    expectedSolution: "Solution",
    erwartungshorizont: "Marking scheme (Erwartungshorizont)",
    criterionMet: "met",
    criterionMissed: "not met",
    missingElements: "What was missing",
    misconceptions: "Misconceptions",
    improvement: "How to get those points",
    verdict: {
      incorrect: "Not correct",
      partially_correct: "Partly correct",
      correct_incomplete: "Correct but incomplete",
      correct: "Correct",
      exceptional: "Very strong",
    },
    nextSteps: "What to do next",
    practiceWeakest: "Practise your weakest topic",
    makeFlashcards: "Flashcards from your mistakes",
    retakeExam: "Write this exam again",
    print: "Print",
  },

  practice: {
    title: "Practice",
    subtitle: "Targeted tasks for the gaps Studilly has found.",
    empty: "No practice yet",
    emptyBody:
      "Once Studilly knows where it gets difficult, matching tasks appear here. Write a practice exam to start.",
    generate: "Create practice",
    generating: "Building practice",
    forWeakness: (topic: string) => `Practice: ${topic}`,
    check: "Check",
    checking: "Checking",
    nextQuestion: "Next task",
    showSolution: "Show solution",
    hint: "Hint",
    yourAnswer: "Your answer",
    finished: "Practice complete",
    finishedBody: (correct: number, total: number) =>
      `${correct} of ${total} tasks solved.`,
    startAnother: "Another set",
    questionOf: (current: number, total: number) =>
      `Task ${current} of ${total}`,
  },

  weakness: {
    title: "Focus areas",
    subtitle: "What Studilly has learned from your exams and practice.",
    empty: "Nothing analysed yet",
    emptyBody: "Write a practice exam so there is something to work from.",
    severity: "Urgency",
    severityHigh: "High",
    severityMedium: "Medium",
    severityLow: "Low",
    confidence: "Confidence in this reading",
    evidence: (n: number) => (n === 1 ? "1 data point" : `${n} data points`),
    trend: {
      improving: "Improving",
      stable: "Unchanged",
      worsening: "Getting worse",
      new: "Newly spotted",
    },
    dimension: {
      concept: "Understanding",
      procedure: "Method",
      operator: "Operator",
      completeness: "Completeness",
      precision: "Accuracy",
      transfer: "Transfer",
    },
    dimensionHelp: {
      concept: "The concept itself has not landed yet.",
      procedure: "The idea is right, the working has errors.",
      operator: "The task asks for more than your answer delivers.",
      completeness: "Right thinking, too thin for full marks.",
      precision: "Avoidable slips.",
      transfer: "Applying this to unfamiliar contexts is hard.",
    },
    practiceThis: "Practise this",
    lastSeen: "Last seen",
  },

  learning: {
    title: "Learning",
    subtitle: "Flashcards and short tasks matched to where you are.",
    dueNow: "Due now",
    noneDue: "Nothing due",
    noneDueBody: "You are up to date. The next cards come round later.",
    empty: "No cards yet",
    emptyBody:
      "Flashcards come from your materials and from mistakes in your exams.",
    generateCards: "Create flashcards",
    generating: "Building cards",
    showAnswer: "Show answer",
    rating: {
      again: "Again",
      hard: "Hard",
      good: "Good",
      easy: "Easy",
    },
    ratingHint: "How solid was that answer?",
    nextReview: (days: number) =>
      days === 0
        ? "Again this session"
        : days === 1
          ? "Again tomorrow"
          : `Again in ${days} days`,
    sessionDone: "Session complete",
    sessionDoneBody: (n: number) =>
      n === 1 ? "1 card reviewed." : `${n} cards reviewed.`,
    cardCount: (n: number) => (n === 1 ? "1 card" : `${n} cards`),
    createCard: "New card",
    front: "Front",
    back: "Back",
    suspend: "Pause",
    unsuspend: "Resume",
  },

  plan: {
    title: "Study plan",
    subtitle: "A plan that reaches your exam date.",
    empty: "No study plan yet",
    emptyBody:
      "Add an exam date and Studilly spreads the topics across the time you have left.",
    create: "Create study plan",
    creating: "Building your plan",
    examDate: "Exam date",
    weeklyTime: "Time per week",
    weeklyTimeHint: "Be realistic. The plan is built around this.",
    subject: "Subject",
    today: "Today",
    thisWeek: "This week",
    dayView: "Day",
    weekView: "Week",
    markDone: "Done",
    markPending: "Not done after all",
    skip: "Skip",
    activity: {
      read: "Work through",
      flashcards: "Flashcards",
      practice: "Practice",
      exam: "Practice exam",
      review: "Review",
    },
    adapt: "Adapt plan",
    adapting: "Adapting your plan",
    adaptHint: "Rebuilds the plan around missed sessions and your current level.",
    behindTitle: "You are behind",
    behindBody: (n: number) =>
      `${n} sessions are still open. Studilly can redistribute them.`,
    daysUntilExam: (n: number) =>
      n === 0 ? "Exam is today" : n === 1 ? "1 day left" : `${n} days left`,
    progress: (done: number, total: number) => `${done} of ${total} done`,
  },

  groups: {
    title: "Study groups",
    subtitle: "Work together without handing over your whole library.",
    empty: "No study groups yet",
    emptyBody: "Create a group or join one with an invite code.",
    create: "Create group",
    join: "Join group",
    joinCode: "Invite code",
    joinCodeHint: "Six to twelve characters, from someone in the group.",
    name: "Group name",
    description: "Description",
    members: (n: number) => (n === 1 ? "1 member" : `${n} members`),
    memberList: "Members",
    owner: "Created by",
    invite: "Invite",
    inviteBody: "Share this code with the people who should join.",
    regenerateCode: "Generate a new code",
    shared: "Shared content",
    sharedEmpty: "Nothing has been shared yet.",
    share: "Share",
    shareMaterial: "Share material",
    shareExam: "Share exam",
    shareHint:
      "Only what you deliberately share here becomes visible to the group. The rest of your library stays private.",
    unshare: "Stop sharing",
    discussion: "Discussion",
    messagePlaceholder: "Message the group",
    send: "Send",
    noMessages: "No messages yet.",
    leave: "Leave group",
    leaveConfirmTitle: "Leave this group?",
    leaveConfirmBody:
      "You lose access to shared content. Anything you shared is removed.",
    deleteGroup: "Delete group",
    deleteConfirmTitle: "Delete this group?",
    deleteConfirmBody:
      "The group, all messages and all shares will be deleted. Members keep their own materials.",
    removeMember: "Remove",
    privacyNote: "Members only see your display name and what you share.",
    invalidCode: "That invite code does not exist.",
    alreadyMember: "You are already in this group.",
    groupFull: "This group is full.",
  },

  subscription: {
    title: "Plan",
    subtitle: "Your plan and your usage.",
    currentPlan: "Current plan",
    changePlan: "Change plan",
    usage: "Usage this month",
    usageResets: (date: string) => `Resets on ${date}`,
    unlimited: "Unlimited",
    used: (used: number, limit: number) => `${used} of ${limit}`,
    storage: "Storage",
    limitReachedTitle: "Monthly limit reached",
    limitReachedBody:
      "You have used your monthly allowance for this feature.",
    upgradePrompt: "Change plan",
    manage: "Manage subscription",
    sandboxNoticeTitle: "Test mode",
    sandboxNoticeBody:
      "Purchases run in test mode. No money is charged and no payment details are requested.",
    simulationNoticeTitle: "Billing not configured",
    simulationNoticeBody:
      "Plan changes are simulated locally so the features can be tried. Real purchases need RevenueCat set up.",
    period: {
      monthly: "monthly",
      yearly: "yearly",
    },
    perMonth: "per month",
    perYear: "per year",
    billedYearly: (price: string) => `${price} billed yearly`,
    saveWithYearly: (percent: number) => `Save ${percent}%`,
    selectPlan: "Choose",
    currentPlanBadge: "Current",
    processing: "Processing",
    purchaseFailed: "The purchase could not be completed.",
    purchaseCancelled: "Purchase cancelled.",
    downgradeNote: "A downgrade applies from the next billing period.",
  },

  plans: {
    free: {
      name: "Free",
      tagline: "For trying Studilly and occasional practice.",
    },
    pro: {
      name: "Studilly Pro",
      tagline: "For steady work across the school year.",
    },
    ultra: {
      name: "Studilly Ultra",
      tagline: "For exam season and intensive study.",
    },
    features: {
      examsPerMonth: (n: number) =>
        n < 0 ? "Unlimited practice exams" : `${n} practice exams per month`,
      practicePerMonth: (n: number) =>
        n < 0 ? "Unlimited practice sets" : `${n} practice sets per month`,
      materialsPerMonth: (n: number) =>
        n < 0 ? "Unlimited uploads" : `${n} uploads per month`,
      storage: (mb: number) =>
        mb >= 1024 ? `${mb / 1024} GB storage` : `${mb} MB storage`,
      flashcards: "Flashcards with spaced repetition",
      weaknessRadar: "Focus-area analysis",
      learningPlans: "Study plans up to your exam date",
      studyGroups: (n: number) =>
        n < 0
          ? "Unlimited study groups"
          : `${n} study ${n === 1 ? "group" : "groups"}`,
      advancedGrading: "Detailed marking against the Erwartungshorizont",
      prioritySpeed: "Priority processing",
      allSubjects: "All subjects",
      exportResults: "Print and export results",
    },
  },

  settings: {
    title: "Settings",
    account: "Account",
    education: "School",
    preferences: "Preferences",
    subscription: "Plan",
    privacy: "Privacy",
    displayName: "Display name",
    email: "Email",
    emailChangeHint: "A change must be confirmed from both addresses.",
    changePassword: "Change password",
    currentPassword: "Current password",
    newPassword: "New password",
    passwordChanged: "Password changed.",
    uiLanguage: "Interface language",
    uiLanguageHint:
      "Affects the interface only. Your materials and exams keep their own language.",
    theme: "Appearance",
    gradingScale: "Marking key",
    gradingScaleHint:
      "Pick the key your school uses. It decides how percentages become grades.",
    notifications: "Notifications",
    notificationTypes: {
      exam_reminders: "Exam date reminders",
      practice_reminders: "Practice reminders",
      plan_reminders: "Study plan reminders",
      group_activity: "Study group activity",
      usage_alerts: "Allowance warnings",
      subscription_updates: "Plan changes",
      achievements: "Progress and milestones",
    },
    notificationChannelNote:
      "Notifications currently appear in the app. Email delivery is not active yet.",
    dataExport: "Export your data",
    dataExportBody:
      "Download everything as a JSON file: profile, materials, exams, results, flashcards and study plans.",
    dataExportButton: "Download export",
    dataExportPreparing: "Preparing export",
    aiQualityReview: "Anonymous quality review",
    aiQualityReviewBody:
      "Lets Studilly keep individual generated tasks, without your answers, for quality review. Off by default.",
    deleteAccount: "Delete account",
    deleteAccountBody:
      "Permanently deletes your account and all data: materials, files, exams, results, flashcards, study plans and group memberships.",
    deleteAccountButton: "Delete account permanently",
    deleteAccountConfirmTitle: "Delete your account permanently?",
    deleteAccountConfirmBody:
      "This cannot be undone. Type DELETE to confirm.",
    deleteAccountConfirmWord: "DELETE",
    savedToast: "Changes saved.",
  },

  usage: {
    metric: {
      exam_generation: "Practice exams",
      exam_grading: "Markings",
      practice_generation: "Practice sets",
      flashcard_generation: "Flashcard sets",
      material_upload: "Uploads",
      material_analysis: "Material analyses",
      learning_plan: "Study plans",
    },
  },

  errors: {
    title: "Something went wrong",
    generic: "That did not work. Please try again.",
    network: "No connection. Check your network.",
    notFound: "Not found",
    notFoundBody: "This page does not exist, or you do not have access to it.",
    forbidden: "No access",
    forbiddenBody: "This content does not belong to your account.",
    unauthorized: "Please sign in",
    invalidInput: "Please check what you entered.",
    limitReached: "Monthly limit reached.",
    rateLimited: "Too many requests. Give it a moment.",
    aiUnavailable:
      "AI processing is unreachable right now. Your allowance was not charged.",
    aiInvalidOutput:
      "The result came back incomplete and was discarded. Please try again.",
    notConfigured: "This feature is not set up yet.",
    backToDashboard: "Back to dashboard",
    backHome: "Back to home",
  },

  marketing: {
    navFeatures: "Features",
    navHowItWorks: "How it works",
    navPricing: "Pricing",
    navFaq: "Questions",
    login: "Sign in",
    getStarted: "Start free",
    heroTitle: "Practise with exams that match the real thing.",
    heroBody:
      "Studilly turns your own documents into realistic practice exams, marks them, and shows you what to work on.",
    heroCta: "Start free",
    heroSecondary: "See pricing",

    howTitle: "From your notes to a marked exam",
    how: {
      uploadTitle: "Upload your documents",
      uploadBody:
        "Class notes, worksheets, scripts or photos of your notebook. Studilly reads them and finds the topics.",
      generateTitle: "Create the exam",
      generateBody:
        "Matched to your state, school type and grade, with real operators, a point breakdown and a marking scheme.",
      writeTitle: "Write it",
      writeBody:
        "A distraction-free exam mode with a timer, task overview and automatic saving.",
      feedbackTitle: "Marking and focus areas",
      feedbackBody:
        "Every task is checked against its marking scheme. Your mistakes become targeted practice.",
    },

    featuresTitle: "What Studilly handles for you",
    features: {
      curriculumTitle: "Tuned to your federal state",
      curriculumBody:
        "Exam formats differ between states. Studilly accounts for your state, school type and grade.",
      gradingTitle: "Marking with reasons",
      gradingBody:
        "Points per criterion rather than one blanket grade. You see exactly where marks are missing and why.",
      weaknessTitle: "Focus areas over time",
      weaknessBody:
        "Studilly tracks whether a topic is missing, a method is shaky, or an operator is not being answered.",
      practiceTitle: "Practice aimed at your gaps",
      practiceBody:
        "Detected weaknesses become tasks that work on exactly those.",
      planTitle: "A plan up to the exam",
      planBody:
        "Add the date and the time you have. Studilly spreads the topics and adapts as you go.",
      groupsTitle: "Study groups with clear limits",
      groupsBody:
        "Share single materials on purpose. The rest of your library stays private.",
    },

    afbTitle: "Tasks across the requirement levels",
    afbBody:
      "Studilly spreads tasks across Anforderungsbereiche I to III and uses the operators that are standard in your subject.",

    privacyTitle: "Your documents stay yours",
    privacyBody:
      "Files sit encrypted in private storage in the EU and are only reachable through short-lived links. No advertising, no selling data. You can delete your account and everything in it at any time.",
    privacyLink: "Read the privacy policy",

    pricingTitle: "Pricing",
    pricingBody: "The free plan is enough to test Studilly properly.",

    faqTitle: "Common questions",
    faq: {
      q1: "Who is Studilly for?",
      a1: "Students in German lower secondary education and the gymnasiale Oberstufe. You pick your state, school type and grade, and the tasks follow from that.",
      q2: "Where do the tasks come from?",
      a2: "From your own documents. Studilly reads them, places the topics, and writes tasks in the format of your exam. They are not real exam papers and not official requirements.",
      q3: "Does a Studilly grade replace a school grade?",
      a3: "No. The marking is an estimate for practice. Percentage boundaries are set by your school, which is why you can change the marking key in Settings.",
      q4: "Can I use Studilly on a phone?",
      a4: "Yes. The exam mode is built for small screens rather than scaled down from desktop.",
      q5: "What happens to my files?",
      a5: "They sit in private storage in the EU and are accessible only to you. You can delete individual materials or your whole account whenever you want.",
      q6: "Does it work with English material?",
      a6: "Yes. The interface language and the language of your documents are independent.",
    },

    ctaTitle: "Start with one exam",
    ctaBody: "Upload a file and see what Studilly makes of it.",

    footerProduct: "Product",
    footerLegal: "Legal",
    footerPrivacy: "Privacy",
    footerTerms: "Terms",
    footerImprint: "Imprint",
    footerCopyright: (year: number) => `${year} Studilly`,
  },

  legal: {
    privacyTitle: "Privacy Policy",
    termsTitle: "Terms of Service",
    imprintTitle: "Imprint",
    lastUpdated: (date: string) => `Last updated: ${date}`,
    placeholderNoticeTitle: "This version is incomplete",
    placeholderNoticeBody:
      "Everything marked [PLACEHOLDER] must be filled in by the operator. A legal review is required before production use. This text is not legal advice.",
  },

  a11y: {
    mainNavigation: "Main navigation",
    userMenu: "User menu",
    breadcrumb: "Breadcrumb",
    progress: "Progress",
    loadingContent: "Loading content",
    required: "required",
    externalLink: "Opens in a new tab",
    sortBy: "Sort by",
    filterBy: "Filter by",
    currentPage: "Current page",
    taskStatus: (label: string, status: string) => `${label}, ${status}`,
  },
};
