import { toGoStringLiteral, toIdentifier, toPascalCase } from "./escape";
import { header, type ExportTestsInput, type ExportTestsResult } from "./types";

const SUPPORTED_INLINE_FLAGS = new Set(["i", "m", "s"]);

function toGoPattern(pattern: string, flags: string): string {
  const inline = [...flags].filter((f) => SUPPORTED_INLINE_FLAGS.has(f)).join("");
  return inline.length > 0 ? `(?${inline})${pattern}` : pattern;
}

export function generateGoTest(input: ExportTestsInput): ExportTestsResult {
  const patternLiteral = toGoStringLiteral(toGoPattern(input.pattern, input.flags));

  const cases = input.cases
    .map(
      (testCase) =>
        `\t\t{${toGoStringLiteral(testCase.text)}, ${testCase.shouldMatch ? "true" : "false"}},`,
    )
    .join("\n");

  const content = [
    header("//", input),
    "package regextest",
    "",
    "import (",
    '\t"regexp"',
    '\t"testing"',
    ")",
    "",
    `var ${toIdentifier(input.name)}Pattern = regexp.MustCompile(${patternLiteral})`,
    "",
    `func Test${toPascalCase(input.name)}(t *testing.T) {`,
    "\tcases := []struct {",
    "\t\ttext        string",
    "\t\tshouldMatch bool",
    "\t}{",
    cases,
    "\t}",
    "\tfor _, c := range cases {",
    `\t\tif got := ${toIdentifier(input.name)}Pattern.MatchString(c.text); got != c.shouldMatch {`,
    '\t\t\tt.Errorf("MatchString(%q) = %v, want %v", c.text, got, c.shouldMatch)',
    "\t\t}",
    "\t}",
    "}",
    "",
  ].join("\n");

  return { filename: `${toIdentifier(input.name)}_test.go`, content };
}
