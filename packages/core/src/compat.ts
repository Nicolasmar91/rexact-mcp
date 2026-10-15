import type { AST } from "@eslint-community/regexpp";
import { compatTable } from "./compat-table";
import { findFeatureOccurrences } from "./feature-occurrences";
import type { CompatIssue, Flavor, ParsedPattern } from "./types";

export function checkCompat(parsed: ParsedPattern, targets: Flavor[]): CompatIssue[] {
  const pattern = parsed.ast as AST.Pattern;
  const occurrences = findFeatureOccurrences(pattern, parsed.flags);

  const issues: CompatIssue[] = [];
  for (const occurrence of occurrences) {
    for (const flavor of targets) {
      const cell = compatTable[occurrence.feature][flavor];
      const issue: CompatIssue = {
        flavor,
        level: cell.level,
        feature: occurrence.feature,
        at: [occurrence.start, occurrence.end],
        message: cell.message,
      };
      if (cell.suggestion !== undefined) issue.suggestion = cell.suggestion;
      issues.push(issue);
    }
  }

  return issues;
}
