import { describe, expect, it } from "vitest";
import { repairExam, validateExam } from "./validation";
import type { ExamGeneration } from "./schemas";

/**
 * The quality gate is the thing standing between a model's output and a
 * student's screen. These tests cover the failures that actually happen:
 * points that do not add up, marking criteria that award more than the task is
 * worth, and a model repeating itself.
 */

function task(overrides: Partial<ExamGeneration["tasks"][number]> = {}) {
  return {
    label: "1",
    prompt: "Erkläre den Zusammenhang zwischen Angebot und Nachfrage.",
    operator: "erklären",
    afb: "II" as const,
    points: 6,
    stimulus: null,
    expected_solution: "Steigt das Angebot bei gleichbleibender Nachfrage, sinkt der Preis.",
    erwartungshorizont: [
      { criterion: "Nennt die Wirkungsrichtung", points: 3, required: true },
      { criterion: "Begründet mit dem Marktmechanismus", points: 3, required: true },
    ],
    ...overrides,
  };
}

function exam(tasks: ExamGeneration["tasks"]): ExamGeneration {
  return { title: "Übungsklausur", instructions: "Bearbeite alle Aufgaben.", tasks };
}

const baseArgs = {
  stage: "sek_2" as const,
  expectedTaskCount: 3,
  durationMinutes: 90,
  subjectKey: "wirtschaft",
};

describe("validateExam structure", () => {
  it("rejects an exam with no tasks", () => {
    const report = validateExam({
      ...baseArgs,
      exam: exam([]),
      expectedTotalPoints: 0,
    });
    expect(report.ok).toBe(false);
    expect(report.issues[0]?.code).toBe("no_tasks");
  });

  it("rejects duplicate labels", () => {
    const report = validateExam({
      ...baseArgs,
      exam: exam([task({ label: "1" }), task({ label: "1" })]),
      expectedTotalPoints: 12,
    });
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "duplicate_label")).toBe(true);
  });

  it("rejects an empty task prompt", () => {
    const report = validateExam({
      ...baseArgs,
      exam: exam([task({ prompt: "   " })]),
      expectedTotalPoints: 6,
    });
    expect(report.issues.some((i) => i.code === "empty_prompt")).toBe(true);
  });
});

describe("validateExam points arithmetic", () => {
  it("rejects a total that does not match what was requested", () => {
    const report = validateExam({
      ...baseArgs,
      exam: exam([task({ points: 6 }), task({ label: "2", points: 6 })]),
      expectedTotalPoints: 20,
    });
    expect(report.ok).toBe(false);
    const issue = report.issues.find((i) => i.code === "points_total_mismatch");
    expect(issue?.message).toContain("12");
  });

  it("rejects marking criteria that do not sum to the task's points", () => {
    const report = validateExam({
      ...baseArgs,
      exam: exam([
        task({
          points: 6,
          erwartungshorizont: [
            { criterion: "Erstes Kriterium", points: 2, required: true },
            { criterion: "Zweites Kriterium", points: 2, required: false },
          ],
        }),
      ]),
      expectedTotalPoints: 6,
    });
    expect(report.ok).toBe(false);
    expect(
      report.issues.some((i) => i.code === "criteria_points_mismatch"),
    ).toBe(true);
  });

  it("accepts half marks", () => {
    const report = validateExam({
      ...baseArgs,
      exam: exam([
        task({
          points: 5,
          erwartungshorizont: [
            { criterion: "Erstes Kriterium", points: 2.5, required: true },
            { criterion: "Zweites Kriterium", points: 2.5, required: true },
          ],
        }),
      ]),
      expectedTotalPoints: 5,
    });
    expect(report.issues.some((i) => i.code === "non_integer_points")).toBe(false);
  });

  it("rejects zero or negative task points", () => {
    const report = validateExam({
      ...baseArgs,
      exam: exam([task({ points: 0, erwartungshorizont: [] })]),
      expectedTotalPoints: 0,
    });
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "non_positive_points")).toBe(true);
  });
});

describe("validateExam marking scheme", () => {
  it("rejects a task with no model solution", () => {
    const report = validateExam({
      ...baseArgs,
      exam: exam([task({ expected_solution: "" })]),
      expectedTotalPoints: 6,
    });
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "missing_solution")).toBe(true);
  });

  it("rejects a task with no marking criteria", () => {
    const report = validateExam({
      ...baseArgs,
      exam: exam([task({ erwartungshorizont: [] })]),
      expectedTotalPoints: 6,
    });
    expect(report.ok).toBe(false);
    expect(
      report.issues.some((i) => i.code === "missing_erwartungshorizont"),
    ).toBe(true);
  });
});

describe("validateExam operators and AFB", () => {
  it("warns about an operator outside the catalogue", () => {
    const report = validateExam({
      ...baseArgs,
      exam: exam([task({ operator: "vibe-checken" })]),
      expectedTotalPoints: 6,
    });
    // A warning, not an error: an unknown operator is odd, not disqualifying.
    expect(report.ok).toBe(true);
    expect(report.issues.some((i) => i.code === "unknown_operator")).toBe(true);
  });

  it("warns when the operator's usual AFB does not match the claim", () => {
    const report = validateExam({
      ...baseArgs,
      exam: exam([task({ operator: "nennen", afb: "III" })]),
      expectedTotalPoints: 6,
    });
    expect(report.issues.some((i) => i.code === "operator_afb_mismatch")).toBe(
      true,
    );
  });

  it("warns when the AFB distribution is lopsided for the Oberstufe", () => {
    // All marks at AFB I is far outside the Sek II target band.
    const report = validateExam({
      ...baseArgs,
      exam: exam([
        task({ label: "1", operator: "nennen", afb: "I", points: 10,
          erwartungshorizont: [{ criterion: "Nennt alle Faktoren", points: 10, required: true }] }),
      ]),
      expectedTotalPoints: 10,
    });
    expect(report.issues.some((i) => i.code === "afb_distribution")).toBe(true);
    expect(report.stats.afbShare.I).toBe(1);
  });

  it("accepts a balanced Oberstufe distribution", () => {
    const report = validateExam({
      ...baseArgs,
      expectedTotalPoints: 20,
      exam: exam([
        task({ label: "1", operator: "nennen", afb: "I", points: 5,
          erwartungshorizont: [{ criterion: "Nennt die Faktoren", points: 5, required: true }] }),
        task({ label: "2", operator: "erklären", afb: "II", points: 10,
          erwartungshorizont: [{ criterion: "Erklärt den Mechanismus", points: 10, required: true }] }),
        task({ label: "3", operator: "erörtern", afb: "III", points: 5,
          erwartungshorizont: [{ criterion: "Wägt ab und kommt zu einem Fazit", points: 5, required: true }] }),
      ]),
    });
    expect(report.ok).toBe(true);
    expect(report.issues.some((i) => i.code === "afb_distribution")).toBe(false);
  });
});

describe("validateExam duplicates and duration", () => {
  it("flags two tasks that ask the same thing", () => {
    const shared =
      "Erkläre ausführlich den Zusammenhang zwischen Angebot Nachfrage und Preisbildung am Markt";
    const report = validateExam({
      ...baseArgs,
      expectedTotalPoints: 12,
      exam: exam([
        task({ label: "1", prompt: shared }),
        task({ label: "2", prompt: shared }),
      ]),
    });
    expect(report.issues.some((i) => i.code === "duplicate_task")).toBe(true);
  });

  it("does not flag genuinely different tasks", () => {
    const report = validateExam({
      ...baseArgs,
      expectedTotalPoints: 12,
      exam: exam([
        task({ label: "1", prompt: "Erkläre die Preisbildung am Markt." }),
        task({
          label: "2",
          prompt: "Beschreibe die Aufgaben der Europäischen Zentralbank.",
        }),
      ]),
    });
    expect(report.issues.some((i) => i.code === "duplicate_task")).toBe(false);
  });

  it("flags an unfinishable paper", () => {
    const report = validateExam({
      ...baseArgs,
      durationMinutes: 20,
      expectedTotalPoints: 60,
      exam: exam([
        task({
          points: 60,
          erwartungshorizont: [
            { criterion: "Vollständige Bearbeitung", points: 60, required: true },
          ],
        }),
      ]),
    });
    expect(report.issues.some((i) => i.code === "implausible_duration")).toBe(
      true,
    );
  });

  it("reports stats for a valid exam", () => {
    const report = validateExam({
      ...baseArgs,
      expectedTotalPoints: 6,
      exam: exam([task()]),
    });
    expect(report.stats.taskCount).toBe(1);
    expect(report.stats.totalPoints).toBe(6);
    expect(report.stats.pointsPerMinute).toBeCloseTo(6 / 90);
  });
});

describe("repairExam", () => {
  it("makes colliding labels unique", () => {
    const repaired = repairExam(
      exam([task({ label: "1" }), task({ label: "1" })]),
    );
    expect(repaired.tasks.map((t) => t.label)).toEqual(["1", "1.2"]);
  });

  it("fills a small gap in the marking criteria", () => {
    const repaired = repairExam(
      exam([
        task({
          points: 6,
          erwartungshorizont: [
            { criterion: "Grosses Kriterium", points: 4, required: true },
            { criterion: "Kleines Kriterium", points: 1, required: false },
          ],
        }),
      ]),
    );
    const criteria = repaired.tasks[0]?.erwartungshorizont ?? [];
    expect(criteria.reduce((s, c) => s + c.points, 0)).toBe(6);
    // The remainder goes to the largest criterion.
    expect(criteria[0]?.points).toBe(5);
  });

  it("leaves a large discrepancy alone for validation to reject", () => {
    const repaired = repairExam(
      exam([
        task({
          points: 20,
          erwartungshorizont: [
            { criterion: "Einziges Kriterium", points: 2, required: true },
          ],
        }),
      ]),
    );
    expect(repaired.tasks[0]?.erwartungshorizont[0]?.points).toBe(2);

    const report = validateExam({
      ...baseArgs,
      expectedTotalPoints: 20,
      exam: repaired,
    });
    expect(report.ok).toBe(false);
  });

  it("gives an unlabelled task a positional label", () => {
    const repaired = repairExam(exam([task({ label: "" })]));
    expect(repaired.tasks[0]?.label).toBe("1");
  });
});
