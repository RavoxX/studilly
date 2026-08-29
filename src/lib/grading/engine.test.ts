import { describe, expect, it } from "vitest";
import {
  calculateGrade,
  gradeForPercentage,
  GradingError,
  isPassing,
  noteToNotenpunkte,
  notenpunkteToNote,
  parseThresholds,
  percentageOf,
  totalPoints,
  type Threshold,
} from "./engine";

/**
 * The grading engine decides what a student sees as their result, so these
 * tests are deliberately picky about boundaries and about refusing to trust
 * inputs that came from a model.
 */

const NOTENPUNKTE: Threshold[] = [
  { min_percent: 95, value: 15, label: "1+" },
  { min_percent: 90, value: 14, label: "1" },
  { min_percent: 85, value: 13, label: "1-" },
  { min_percent: 80, value: 12, label: "2+" },
  { min_percent: 75, value: 11, label: "2" },
  { min_percent: 70, value: 10, label: "2-" },
  { min_percent: 65, value: 9, label: "3+" },
  { min_percent: 60, value: 8, label: "3" },
  { min_percent: 55, value: 7, label: "3-" },
  { min_percent: 50, value: 6, label: "4+" },
  { min_percent: 45, value: 5, label: "4" },
  { min_percent: 40, value: 4, label: "4-" },
  { min_percent: 33, value: 3, label: "5+" },
  { min_percent: 27, value: 2, label: "5" },
  { min_percent: 20, value: 1, label: "5-" },
  { min_percent: 0, value: 0, label: "6" },
];

const NOTE: Threshold[] = [
  { min_percent: 92, value: 1, label: "1" },
  { min_percent: 81, value: 2, label: "2" },
  { min_percent: 67, value: 3, label: "3" },
  { min_percent: 50, value: 4, label: "4" },
  { min_percent: 30, value: 5, label: "5" },
  { min_percent: 0, value: 6, label: "6" },
];

describe("parseThresholds", () => {
  it("sorts thresholds highest first", () => {
    const parsed = parseThresholds([
      { min_percent: 0, value: 6, label: "6" },
      { min_percent: 92, value: 1, label: "1" },
      { min_percent: 50, value: 4, label: "4" },
    ]);
    expect(parsed.map((t) => t.min_percent)).toEqual([92, 50, 0]);
  });

  it("rejects a scale that does not reach 0 percent", () => {
    expect(() =>
      parseThresholds([{ min_percent: 50, value: 4, label: "4" }]),
    ).toThrow(GradingError);
  });

  it("rejects empty and malformed scales", () => {
    expect(() => parseThresholds([])).toThrow(GradingError);
    expect(() => parseThresholds("nope")).toThrow(GradingError);
    expect(() =>
      parseThresholds([{ min_percent: "high", value: 1, label: "1" }]),
    ).toThrow(GradingError);
  });

  it("rejects percentages outside 0 to 100", () => {
    expect(() =>
      parseThresholds([
        { min_percent: 120, value: 1, label: "1" },
        { min_percent: 0, value: 6, label: "6" },
      ]),
    ).toThrow(GradingError);
  });
});

describe("totalPoints", () => {
  it("sums awarded and possible marks", () => {
    const result = totalPoints([
      { taskId: "a", label: "1", pointsAwarded: 4, pointsPossible: 6 },
      { taskId: "b", label: "2", pointsAwarded: 3.5, pointsPossible: 4 },
    ]);
    expect(result).toEqual({ awarded: 7.5, possible: 10 });
  });

  it("clamps a task that was awarded more than it is worth", () => {
    // A bad evaluation must never be able to inflate a result.
    const result = totalPoints([
      { taskId: "a", label: "1", pointsAwarded: 99, pointsPossible: 6 },
    ]);
    expect(result.awarded).toBe(6);
  });

  it("rejects negative points", () => {
    expect(() =>
      totalPoints([
        { taskId: "a", label: "1", pointsAwarded: -1, pointsPossible: 6 },
      ]),
    ).toThrow(GradingError);
  });

  it("returns zero for an empty exam", () => {
    expect(totalPoints([])).toEqual({ awarded: 0, possible: 0 });
  });
});

describe("percentageOf", () => {
  it("computes a percentage", () => {
    expect(percentageOf(45, 60)).toBe(75);
  });

  it("returns 0 rather than dividing by zero", () => {
    expect(percentageOf(0, 0)).toBe(0);
  });

  it("rounds to two decimals", () => {
    expect(percentageOf(1, 3)).toBe(33.33);
  });
});

describe("gradeForPercentage", () => {
  it("maps exact threshold boundaries to the higher grade", () => {
    // 95 percent is 15 points, not 14. Off-by-one here changes real grades.
    expect(gradeForPercentage(95, NOTENPUNKTE).value).toBe(15);
    expect(gradeForPercentage(94.99, NOTENPUNKTE).value).toBe(14);
    expect(gradeForPercentage(50, NOTENPUNKTE).value).toBe(6);
    expect(gradeForPercentage(49.99, NOTENPUNKTE).value).toBe(5);
  });

  it("maps the bottom of the scale", () => {
    expect(gradeForPercentage(0, NOTENPUNKTE).value).toBe(0);
    expect(gradeForPercentage(19.99, NOTENPUNKTE).value).toBe(0);
    expect(gradeForPercentage(20, NOTENPUNKTE).value).toBe(1);
  });

  it("maps marks 1 to 6", () => {
    expect(gradeForPercentage(100, NOTE).value).toBe(1);
    expect(gradeForPercentage(92, NOTE).value).toBe(1);
    expect(gradeForPercentage(91.9, NOTE).value).toBe(2);
    expect(gradeForPercentage(50, NOTE).value).toBe(4);
    expect(gradeForPercentage(29, NOTE).value).toBe(6);
  });

  it("clamps values outside 0 to 100", () => {
    expect(gradeForPercentage(150, NOTE).value).toBe(1);
    expect(gradeForPercentage(-10, NOTE).value).toBe(6);
  });

  it("returns the label, not just the number", () => {
    expect(gradeForPercentage(80, NOTENPUNKTE).label).toBe("2+");
  });
});

describe("isPassing", () => {
  it("treats mark 4 and better as passing", () => {
    expect(isPassing(4, "note")).toBe(true);
    expect(isPassing(5, "note")).toBe(false);
  });

  it("treats 5 Notenpunkte and better as passing", () => {
    // 5 points is "ausreichend"; 4 points is already "mangelhaft".
    expect(isPassing(5, "notenpunkte")).toBe(true);
    expect(isPassing(4, "notenpunkte")).toBe(false);
  });
});

describe("calculateGrade", () => {
  it("computes a full Oberstufe result", () => {
    const result = calculateGrade({
      scores: [
        { taskId: "1", label: "1", pointsAwarded: 8, pointsPossible: 10 },
        { taskId: "2", label: "2", pointsAwarded: 12, pointsPossible: 15 },
        { taskId: "3", label: "3", pointsAwarded: 4, pointsPossible: 5 },
      ],
      scale: { scale_type: "notenpunkte", thresholds: NOTENPUNKTE },
    });

    expect(result.pointsAwarded).toBe(24);
    expect(result.pointsPossible).toBe(30);
    expect(result.percentage).toBe(80);
    expect(result.gradeValue).toBe(12);
    expect(result.gradeLabel).toBe("2+");
    expect(result.passed).toBe(true);
  });

  it("computes a failing Sekundarstufe I result", () => {
    const result = calculateGrade({
      scores: [{ taskId: "1", label: "1", pointsAwarded: 6, pointsPossible: 20 }],
      scale: { scale_type: "note", thresholds: NOTE },
    });

    expect(result.percentage).toBe(30);
    expect(result.gradeValue).toBe(5);
    expect(result.passed).toBe(false);
  });

  it("handles a completely blank exam without dividing by zero", () => {
    const result = calculateGrade({
      scores: [{ taskId: "1", label: "1", pointsAwarded: 0, pointsPossible: 10 }],
      scale: { scale_type: "note", thresholds: NOTE },
    });
    expect(result.percentage).toBe(0);
    expect(result.gradeValue).toBe(6);
  });

  it("rejects an unknown scale type", () => {
    expect(() =>
      calculateGrade({
        scores: [],
        scale: { scale_type: "sterne", thresholds: NOTE },
      }),
    ).toThrow(GradingError);
  });
});

describe("Notenpunkte conversion", () => {
  it("follows the KMK relation Note = (17 - Punkte) / 3", () => {
    expect(notenpunkteToNote(15)).toBe(0.67);
    expect(notenpunkteToNote(14)).toBe(1);
    expect(notenpunkteToNote(11)).toBe(2);
    expect(notenpunkteToNote(8)).toBe(3);
    expect(notenpunkteToNote(5)).toBe(4);
    expect(notenpunkteToNote(2)).toBe(5);
    expect(notenpunkteToNote(0)).toBe(5.67);
  });

  it("inverts back to points", () => {
    expect(noteToNotenpunkte(1)).toBe(14);
    expect(noteToNotenpunkte(2)).toBe(11);
    expect(noteToNotenpunkte(4)).toBe(5);
  });

  it("clamps out-of-range input", () => {
    expect(notenpunkteToNote(99)).toBe(0.67);
    expect(notenpunkteToNote(-5)).toBe(5.67);
    expect(noteToNotenpunkte(0)).toBe(14);
  });
});
