import { toDoubleQuotedLiteral, toIdentifier } from "./escape";
import { header, type ExportTestsInput, type ExportTestsResult } from "./types";

// Pas d'import de "describe"/"test"/"expect" : Jest les expose en globals
// par défaut, donc ce fichier tourne sans configuration côté utilisateur.
export function generateJest(input: ExportTestsInput): ExportTestsResult {
  const patternLiteral = toDoubleQuotedLiteral(input.pattern);
  const flagsLiteral = toDoubleQuotedLiteral(input.flags);

  const lines = input.cases.map((testCase) => {
    const textLiteral = toDoubleQuotedLiteral(testCase.text);
    const verb = testCase.shouldMatch ? "matches" : "does not match";
    return [
      `  test(${toDoubleQuotedLiteral(`${verb}: ${testCase.text}`)}, () => {`,
      `    const regex = new RegExp(${patternLiteral}, ${flagsLiteral});`,
      `    expect(regex.test(${textLiteral})).toBe(${testCase.shouldMatch});`,
      `  });`,
    ].join("\n");
  });

  const content = [
    header("//", input),
    `describe(${toDoubleQuotedLiteral(input.name)}, () => {`,
    lines.join("\n\n"),
    `});`,
    "",
  ].join("\n");

  return { filename: `${toIdentifier(input.name)}.test.js`, content };
}
