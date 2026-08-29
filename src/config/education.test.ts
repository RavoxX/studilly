import { describe, expect, it } from "vitest";
import {
  BUNDESLAENDER,
  SCHOOL_SYSTEM,
  SCHOOL_TYPE_LABELS,
  gradesFor,
  hasOberstufe,
  schoolTypesFor,
  stageForGrade,
  usesNotenpunkte,
} from "./education";

/**
 * The German school system model.
 *
 * These tests encode structural facts that differ between states, because
 * getting them wrong produces exams for a school that does not exist. The
 * specific cases below (Berlin's six-year primary school, Saxony's twelve-year
 * Abitur, Hamburg's two school types) are the ones a generic model gets wrong.
 */

describe("coverage", () => {
  it("covers all sixteen federal states", () => {
    expect(BUNDESLAENDER).toHaveLength(16);
    expect(new Set(BUNDESLAENDER).size).toBe(16);
  });

  it("gives every state a Gymnasium and a real portal URL", () => {
    for (const code of BUNDESLAENDER) {
      const state = SCHOOL_SYSTEM[code];
      expect(state.sekITypes).toContain("gymnasium");
      expect(state.curriculumPortal.url).toMatch(/^https:\/\//);
      expect(state.nameDe.length).toBeGreaterThan(0);
    }
  });

  it("labels every school type it can return", () => {
    for (const code of BUNDESLAENDER) {
      for (const type of SCHOOL_SYSTEM[code].sekITypes) {
        expect(SCHOOL_TYPE_LABELS[type]).toBeDefined();
      }
    }
  });
});

describe("state-specific structures", () => {
  it("starts lower secondary at grade 7 in Berlin and Brandenburg", () => {
    // Primary school runs to grade 6 in both, unlike everywhere else.
    expect(gradesFor("BE", "sek_1")[0]).toBe(7);
    expect(gradesFor("BB", "sek_1")[0]).toBe(7);
    expect(gradesFor("NW", "sek_1")[0]).toBe(5);
  });

  it("ends the Oberstufe at grade 12 where the Abitur takes twelve years", () => {
    for (const code of ["SN", "TH", "ST", "MV"] as const) {
      const grades = gradesFor(code, "sek_2");
      expect(grades[grades.length - 1]).toBe(12);
    }
    expect(gradesFor("NI", "sek_2")).toContain(13);
  });

  it("models the two-school-type states", () => {
    // Hamburg, Schleswig-Holstein, Saxony and Saarland each run two.
    expect(SCHOOL_SYSTEM.HH.sekITypes).toHaveLength(2);
    expect(SCHOOL_SYSTEM.HH.sekITypes).toContain("stadtteilschule");
    expect(SCHOOL_SYSTEM.SH.sekITypes).toHaveLength(2);
    expect(SCHOOL_SYSTEM.SN.sekITypes).toContain("oberschule");
    expect(SCHOOL_SYSTEM.SL.sekITypes).toContain("gemeinschaftsschule");
  });

  it("keeps state-specific school types out of other states", () => {
    // A Stadtteilschule exists in Hamburg and nowhere else.
    expect(SCHOOL_SYSTEM.BY.sekITypes).not.toContain("stadtteilschule");
    expect(SCHOOL_SYSTEM.BY.sekITypes).toContain("mittelschule");
    expect(SCHOOL_SYSTEM.NW.sekITypes).not.toContain("mittelschule");
    expect(SCHOOL_SYSTEM.RP.sekITypes).toContain("realschule_plus");
    expect(SCHOOL_SYSTEM.TH.sekITypes).toContain("regelschule");
  });
});

describe("schoolTypesFor", () => {
  it("returns the state's own types for lower secondary", () => {
    expect(schoolTypesFor("BW", "sek_1")).toEqual(SCHOOL_SYSTEM.BW.sekITypes);
  });

  it("narrows upper secondary to types that carry an Oberstufe", () => {
    const types = schoolTypesFor("BY", "sek_2");
    // A Realschule ends at grade 10, so it must not appear for Sek II.
    expect(types).not.toContain("realschule");
    expect(types).toContain("gymnasium");
  });

  it("offers the vocational Gymnasium for upper secondary everywhere", () => {
    for (const code of BUNDESLAENDER) {
      expect(schoolTypesFor(code, "sek_2")).toContain("berufliches_gymnasium");
    }
  });

  it("returns no duplicates", () => {
    for (const code of BUNDESLAENDER) {
      const types = schoolTypesFor(code, "sek_2");
      expect(new Set(types).size).toBe(types.length);
    }
  });
});

describe("gradesFor", () => {
  it("returns a contiguous ascending range", () => {
    for (const code of BUNDESLAENDER) {
      for (const stage of ["sek_1", "sek_2"] as const) {
        const grades = gradesFor(code, stage);
        expect(grades.length).toBeGreaterThan(0);
        for (let i = 1; i < grades.length; i += 1) {
          expect(grades[i]).toBe((grades[i - 1] ?? 0) + 1);
        }
      }
    }
  });
});

describe("stageForGrade", () => {
  it("derives the stage from the grade in that state", () => {
    expect(stageForGrade("NW", 9)).toBe("sek_1");
    expect(stageForGrade("NW", 11)).toBe("sek_2");
    // Berlin's Sek I still ends at 10 even though it starts at 7.
    expect(stageForGrade("BE", 10)).toBe("sek_1");
    expect(stageForGrade("BE", 11)).toBe("sek_2");
  });

  it("stays consistent with gradesFor", () => {
    // Every grade listed for a stage must derive back to that stage,
    // otherwise onboarding's consistency check would reject a valid choice.
    for (const code of BUNDESLAENDER) {
      for (const grade of gradesFor(code, "sek_1")) {
        expect(stageForGrade(code, grade)).toBe("sek_1");
      }
    }
  });
});

describe("stage helpers", () => {
  it("knows which school types lead to the Oberstufe", () => {
    expect(hasOberstufe("gymnasium")).toBe(true);
    expect(hasOberstufe("gesamtschule")).toBe(true);
    expect(hasOberstufe("realschule")).toBe(false);
    expect(hasOberstufe("hauptschule")).toBe(false);
  });

  it("uses Notenpunkte only in upper secondary", () => {
    expect(usesNotenpunkte("sek_2")).toBe(true);
    expect(usesNotenpunkte("sek_1")).toBe(false);
  });
});
