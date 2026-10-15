import {
  choosePhpDelimiter,
  toPascalCase,
  toPhpDoubleQuotedLiteral,
  toPhpSingleQuotedLiteral,
} from "./escape";
import { header, type ExportTestsInput, type ExportTestsResult } from "./types";

const SUPPORTED_MODIFIERS = new Set(["i", "m", "s", "u"]);

export function generatePhpunit(input: ExportTestsInput): ExportTestsResult {
  const { delimiter, pattern } = choosePhpDelimiter(input.pattern);
  const modifiers = [...input.flags].filter((f) => SUPPORTED_MODIFIERS.has(f)).join("");
  const patternLiteral = toPhpSingleQuotedLiteral(`${delimiter}${pattern}${delimiter}${modifiers}`);
  const className = `${toPascalCase(input.name)}Test`;

  const methods = input.cases.map((testCase, i) => {
    const textLiteral = toPhpDoubleQuotedLiteral(testCase.text);
    const verb = testCase.shouldMatch ? "matches" : "doesNotMatch";
    const expected = testCase.shouldMatch ? "1" : "0";
    return [
      `    public function test${verb.charAt(0).toUpperCase()}${verb.slice(1)}Case${i + 1}(): void`,
      "    {",
      `        $this->assertSame(${expected}, preg_match(self::PATTERN, ${textLiteral}));`,
      "    }",
    ].join("\n");
  });

  const content = [
    "<?php",
    "",
    header("//", input).trimEnd(),
    "",
    "use PHPUnit\\Framework\\TestCase;",
    "",
    `final class ${className} extends TestCase`,
    "{",
    `    private const PATTERN = ${patternLiteral};`,
    "",
    methods.join("\n\n"),
    "}",
    "",
  ].join("\n");

  return { filename: `${className}.php`, content };
}
