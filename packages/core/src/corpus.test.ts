import { describe, expect, it } from "vitest";
import { runCorpus } from "./corpus";
import type { CorpusCase } from "./types";

function cases(...entries: Array<[string, boolean]>): CorpusCase[] {
  return entries.map(([text, shouldMatch]) => ({ text, shouldMatch }));
}

describe("runCorpus", () => {
  it("passes matching and non-matching cases correctly", () => {
    const report = runCorpus("^\\d+$", "", cases(["123", true], ["abc", false]));
    expect(report.passed).toBe(2);
    expect(report.total).toBe(2);
    expect(report.results.every((r) => r.pass)).toBe(true);
  });

  it("reports a failing case honestly (matched !== shouldMatch)", () => {
    const report = runCorpus("^\\d+$", "", cases(["abc", true]));
    expect(report.passed).toBe(0);
    expect(report.results[0]).toMatchObject({ matched: false, pass: false });
  });

  it("collects only the first match without the g flag", () => {
    const report = runCorpus("\\d+", "", cases(["a1b22c333", true]));
    expect(report.results[0]?.ranges).toEqual([[1, 2]]);
  });

  it("collects every match with the g flag", () => {
    const report = runCorpus("\\d+", "g", cases(["a1b22c333", true]));
    expect(report.results[0]?.ranges).toEqual([
      [1, 2],
      [3, 5],
      [6, 9],
    ]);
  });

  it("never reuses lastIndex across cases with the g flag (no cross-case pollution)", () => {
    const report = runCorpus("a", "g", cases(["aaa", true], ["aaa", true]));
    expect(report.results[0]?.ranges).toHaveLength(3);
    expect(report.results[1]?.ranges).toHaveLength(3);
  });

  it("does not loop forever on a zero-width global match", () => {
    const report = runCorpus("a*", "g", cases(["aabaa", true]));
    expect(report.results[0]?.ranges.length).toBeGreaterThan(0);
    expect(report.results[0]?.ranges.length).toBeLessThan(20);
  });

  it("reports capturing group positions", () => {
    const report = runCorpus("(\\d{4})-(\\d{2})", "", cases(["2026-09", true]));
    expect(report.results[0]?.groups).toEqual([
      { start: 0, end: 4 },
      { start: 5, end: 7 },
    ]);
  });

  it("reports the name of named capturing groups", () => {
    const report = runCorpus("(?<year>\\d{4})-(?<month>\\d{2})", "", cases(["2026-09", true]));
    expect(report.results[0]?.groups).toEqual([
      { name: "year", start: 0, end: 4 },
      { name: "month", start: 5, end: 7 },
    ]);
  });

  it("skips a capturing group that did not participate in the match", () => {
    const report = runCorpus("(a)|(b)", "", cases(["b", true]));
    expect(report.results[0]?.groups).toEqual([{ start: 0, end: 1 }]);
  });

  it("returns exact UTF-16 offsets around an emoji (surrogate pair)", () => {
    // "😀" occupies 2 UTF-16 code units; "b" must be found at index 3, not 2.
    const report = runCorpus("b", "", cases(["a😀b", true]));
    expect(report.results[0]?.ranges).toEqual([[3, 4]]);
  });

  it("truncates a test string longer than 5000 characters", () => {
    const longText = "a".repeat(6000);
    const report = runCorpus("^a{5000}$", "", cases([longText, true]));
    expect(report.results[0]?.pass).toBe(true);
  });

  it("truncates a corpus longer than 200 cases", () => {
    const manyCases = Array.from({ length: 250 }, () => ({ text: "1", shouldMatch: true }));
    const report = runCorpus("1", "", manyCases);
    expect(report.total).toBe(200);
  });

  it("reports a duration", () => {
    const report = runCorpus("a", "", cases(["a", true]));
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("runs 60 cases in under 50ms", () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ text: `case-${i}`, shouldMatch: true }));
    const report = runCorpus("case-\\d+", "", many);
    expect(report.durationMs).toBeLessThan(50);
  });
});
