import { generateGoTest } from "./go-test";
import { generateJest } from "./jest";
import { generatePhpunit } from "./phpunit";
import { generatePytest } from "./pytest";
import type { ExportTestsInput, ExportTestsResult } from "./types";
import { generateVitest } from "./vitest";

export type { ExportTarget, ExportTestsInput, ExportTestsResult } from "./types";

export function exportTests(input: ExportTestsInput): ExportTestsResult {
  switch (input.target) {
    case "vitest":
      return generateVitest(input);
    case "jest":
      return generateJest(input);
    case "pytest":
      return generatePytest(input);
    case "go-test":
      return generateGoTest(input);
    case "phpunit":
      return generatePhpunit(input);
  }
}
