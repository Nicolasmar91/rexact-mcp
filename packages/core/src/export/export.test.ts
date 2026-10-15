import { describe, expect, it } from "vitest";
import { exportTests } from "./index";
import type { ExportTestsInput, ExportTarget } from "./types";

function baseInput(
  target: ExportTarget,
  overrides: Partial<ExportTestsInput> = {},
): ExportTestsInput {
  return {
    pattern: "^\\d{4}-\\d{2}$",
    flags: "",
    flavor: "js",
    name: "date iso courte",
    target,
    cases: [
      { text: "2026-09", shouldMatch: true },
      { text: "abc", shouldMatch: false },
    ],
    ...overrides,
  };
}

describe("exportTests", () => {
  it("includes a one-line header with origin and date", () => {
    const { content } = exportTests(baseInput("vitest"));
    const firstLine = content.split("\n")[0];
    expect(firstLine).toContain("Rexact");
    expect(firstLine).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("includes the permalink in the header when provided", () => {
    const { content } = exportTests(baseInput("vitest", { permalink: "https://rexact.dev/p/abc" }));
    expect(content.split("\n")[0]).toContain("https://rexact.dev/p/abc");
  });

  it("says so when no permalink is available", () => {
    const { content } = exportTests(baseInput("pytest"));
    expect(content.split("\n")[0]).toContain("pas de permalien");
  });

  it("generates a .test.ts file for vitest", () => {
    const { filename, content } = exportTests(baseInput("vitest"));
    expect(filename).toBe("date_iso_courte.test.ts");
    expect(content).toContain('import { describe, expect, it } from "vitest"');
    expect(content).toContain("2026-09");
  });

  it("generates a jest file without importing test globals", () => {
    const { filename, content } = exportTests(baseInput("jest"));
    expect(filename).toBe("date_iso_courte.test.js");
    expect(content).not.toContain("require(");
    expect(content).not.toContain("import ");
  });

  it("generates a pytest file prefixed test_", () => {
    const { filename, content } = exportTests(baseInput("pytest"));
    expect(filename).toBe("test_date_iso_courte.py");
    expect(content).toContain("import re");
    expect(content).toContain("def test_case_1_matches():");
  });

  it("translates the i/m/s flags to Python re flags", () => {
    const { content } = exportTests(baseInput("pytest", { flags: "im" }));
    expect(content).toContain("re.IGNORECASE | re.MULTILINE");
  });

  it("generates a go-test file with a valid exported test function", () => {
    const { filename, content } = exportTests(baseInput("go-test"));
    expect(filename).toBe("date_iso_courte_test.go");
    expect(content).toContain("package regextest");
    expect(content).toMatch(/func Test[A-Z]\w*\(t \*testing\.T\)/);
  });

  it("prepends inline flags to the Go pattern (no separate flags mechanism)", () => {
    const { content } = exportTests(baseInput("go-test", { flags: "i" }));
    expect(content).toContain("(?i)^\\d{4}-\\d{2}$");
  });

  it("generates a PHPUnit file with an escaped delimiter-safe pattern", () => {
    const { filename, content } = exportTests(baseInput("phpunit"));
    expect(filename).toBe("DateIsoCourteTest.php");
    expect(content.startsWith("<?php")).toBe(true);
    expect(content).toContain("extends TestCase");
    expect(content).toContain("preg_match");
  });

  it("picks a PHP delimiter that is absent from the pattern", () => {
    const { content } = exportTests(
      baseInput("phpunit", { pattern: "a/b/c", cases: [{ text: "a/b/c", shouldMatch: true }] }),
    );
    // "/" apparaît dans le motif : le délimiteur choisi doit être différent.
    const match = /PATTERN = '(.)/.exec(content);
    expect(match?.[1]).not.toBe("/");
  });

  it("escapes a double quote and a backslash in the exported text (vitest)", () => {
    const { content } = exportTests(
      baseInput("vitest", { cases: [{ text: 'a"b\\c', shouldMatch: true }] }),
    );
    // Une chaîne JS valide générée par JSON.stringify contient les séquences échappées.
    expect(content).toContain('a\\"b\\\\c');
  });

  it("keeps a PHP double-quoted test string safe against $ interpolation", () => {
    const { content } = exportTests(
      baseInput("phpunit", { cases: [{ text: "$100 price", shouldMatch: true }] }),
    );
    expect(content).toContain("\\$100 price");
  });
});
