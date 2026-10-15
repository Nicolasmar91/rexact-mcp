import type { CorpusCase, Flavor } from "../types";
import { todayIso } from "./escape";

export type ExportTarget = "vitest" | "jest" | "pytest" | "go-test" | "phpunit";

export interface ExportTestsInput {
  pattern: string;
  flags: string;
  flavor: Flavor;
  cases: CorpusCase[];
  name: string;
  target: ExportTarget;
  permalink?: string;
}

export interface ExportTestsResult {
  filename: string;
  content: string;
}

export function header(commentStart: string, input: ExportTestsInput): string {
  const link = input.permalink ?? "pas de permalien";
  return `${commentStart} Généré par Rexact — ${todayIso()} — ${link}\n`;
}
