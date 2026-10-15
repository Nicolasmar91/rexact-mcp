import { describe, expect, it } from "vitest";
import { runCorpusSandboxed } from "./run-corpus-sandboxed";

describe("runCorpusSandboxed", () => {
  it("runs a normal corpus and returns a report", async () => {
    const report = await runCorpusSandboxed("^\\d+$", "", [
      { text: "123", shouldMatch: true },
      { text: "abc", shouldMatch: false },
    ]);
    expect(report).not.toBeNull();
    expect(report?.passed).toBe(2);
    expect(report?.total).toBe(2);
  });

  it("returns null (never a false success) when the pattern times out", async () => {
    const evil = `${"a".repeat(35)}b`;
    const report = await runCorpusSandboxed("^(a+)+$", "", [{ text: evil, shouldMatch: false }]);
    expect(report).toBeNull();
  }, 10000);
});
