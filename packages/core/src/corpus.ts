import { RegExpParser, visitRegExpAST } from "@eslint-community/regexpp";
import type { CaseResult, CorpusCase, CorpusReport } from "./types";

const MAX_CASES = 200;
const MAX_TEXT_LENGTH = 5000;

function listCapturingGroupNames(source: string, flags: string): (string | undefined)[] {
  const names: (string | undefined)[] = [];
  try {
    const pattern = new RegExpParser().parsePattern(source, 0, source.length, {
      unicode: flags.includes("u"),
      unicodeSets: flags.includes("v"),
    });
    visitRegExpAST(pattern, {
      onCapturingGroupEnter(node) {
        names.push(node.name ?? undefined);
      },
    });
  } catch {
    // Précondition violée (motif invalide) : à la charge de l'appelant, qui
    // doit valider via parse() avant d'exécuter un corpus. On dégrade sans
    // planter, les groupes seront simplement rendus sans nom.
  }
  return names;
}

function extractGroups(
  match: RegExpExecArray,
  groupNames: (string | undefined)[],
): Array<{ name?: string; start: number; end: number }> {
  const groups: Array<{ name?: string; start: number; end: number }> = [];
  const indices = match.indices;
  if (!indices) return groups;

  for (let i = 1; i < indices.length; i += 1) {
    const range = indices[i];
    if (!range) continue;
    const name = groupNames[i - 1];
    groups.push(
      name !== undefined
        ? { name, start: range[0], end: range[1] }
        : { start: range[0], end: range[1] },
    );
  }
  return groups;
}

function runCase(
  pattern: string,
  flags: string,
  testCase: CorpusCase,
  groupNames: (string | undefined)[],
): CaseResult {
  const text = testCase.text.slice(0, MAX_TEXT_LENGTH);
  // Toujours une instance neuve : `lastIndex` est un piège avec le drapeau g
  // sur une regex réutilisée. `d` est ajouté pour obtenir les positions de
  // groupes (match.indices), sans changer la sémantique du matching.
  const execFlags = flags.includes("d") ? flags : `${flags}d`;
  const regex = new RegExp(pattern, execFlags);

  const ranges: Array<[number, number]> = [];
  const groups: Array<{ name?: string; start: number; end: number }> = [];
  let matched = false;

  if (flags.includes("g")) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      matched = true;
      ranges.push([match.index, match.index + match[0].length]);
      groups.push(...extractGroups(match, groupNames));
      if (match[0].length === 0) regex.lastIndex += 1;
    }
  } else {
    const match = regex.exec(text);
    if (match) {
      matched = true;
      ranges.push([match.index, match.index + match[0].length]);
      groups.push(...extractGroups(match, groupNames));
    }
  }

  return {
    case: testCase,
    matched,
    pass: matched === testCase.shouldMatch,
    ranges,
    groups,
    // L'isolation par timeout est la responsabilité de l'appelant (Worker,
    // lot 2) : cette fonction, synchrone et pure, ne peut pas s'interrompre
    // elle-même en cas de backtracking catastrophique.
    timedOut: false,
  };
}

export function runCorpus(pattern: string, flags: string, cases: CorpusCase[]): CorpusReport {
  const start = performance.now();
  const limitedCases = cases.slice(0, MAX_CASES);
  const groupNames = listCapturingGroupNames(pattern, flags);

  const results = limitedCases.map((testCase) => runCase(pattern, flags, testCase, groupNames));

  return {
    passed: results.filter((r) => r.pass).length,
    total: results.length,
    results,
    durationMs: performance.now() - start,
  };
}
