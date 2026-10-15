import { toDoubleQuotedLiteral, toIdentifier } from "./escape";
import { header, type ExportTestsInput, type ExportTestsResult } from "./types";

const FLAG_TO_PYTHON: Record<string, string> = {
  i: "re.IGNORECASE",
  m: "re.MULTILINE",
  s: "re.DOTALL",
};

function pythonFlags(flags: string): string {
  const mapped = [...flags].map((f) => FLAG_TO_PYTHON[f]).filter((f): f is string => !!f);
  return mapped.length > 0 ? `, ${mapped.join(" | ")}` : "";
}

export function generatePytest(input: ExportTestsInput): ExportTestsResult {
  // Chaîne normale (pas de r"...") : évite le piège de l'antislash final,
  // interdit dans une chaîne brute Python.
  const patternLiteral = toDoubleQuotedLiteral(input.pattern);

  const lines = input.cases.map((testCase, i) => {
    const textLiteral = toDoubleQuotedLiteral(testCase.text);
    const fnName = `test_case_${i + 1}_${testCase.shouldMatch ? "matches" : "does_not_match"}`;
    const assertion = testCase.shouldMatch
      ? `pattern.search(${textLiteral}) is not None`
      : `pattern.search(${textLiteral}) is None`;
    return [`def ${fnName}():`, `    assert ${assertion}`].join("\n");
  });

  const content = [
    header("#", input),
    "import re",
    "",
    `pattern = re.compile(${patternLiteral}${pythonFlags(input.flags)})`,
    "",
    lines.join("\n\n\n"),
    "",
  ].join("\n");

  return { filename: `test_${toIdentifier(input.name)}.py`, content };
}
