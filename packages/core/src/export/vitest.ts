import { toDoubleQuotedLiteral, toIdentifier } from "./escape";
import { header, type ExportTestsInput, type ExportTestsResult } from "./types";

export function generateVitest(input: ExportTestsInput): ExportTestsResult {
  const patternLiteral = toDoubleQuotedLiteral(input.pattern);
  const flagsLiteral = toDoubleQuotedLiteral(input.flags);

  const lines = input.cases.map((testCase) => {
    const textLiteral = toDoubleQuotedLiteral(testCase.text);
    const verb = testCase.shouldMatch ? "matches" : "does not match";
    return [
      `  it(${toDoubleQuotedLiteral(`${verb}: ${testCase.text}`)}, () => {`,
      `    const regex = new RegExp(${patternLiteral}, ${flagsLiteral});`,
      `    expect(regex.test(${textLiteral})).toBe(${testCase.shouldMatch});`,
      `  });`,
    ].join("\n");
  });

  const content = [
    header("//", input),
    `import { describe, expect, it } from "vitest";`,
    "",
    `describe(${toDoubleQuotedLiteral(input.name)}, () => {`,
    lines.join("\n\n"),
    `});`,
    "",
  ].join("\n");

  return { filename: `${toIdentifier(input.name)}.test.ts`, content };
}
