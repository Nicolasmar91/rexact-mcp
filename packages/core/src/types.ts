export type Flavor = "js" | "pcre" | "python" | "re2" | "java" | "dotnet" | "grep";

export type Result<T, E = CoreError> = { ok: true; value: T } | { ok: false; error: E };

export interface LocalizedMessage {
  fr: string;
  en: string;
}

export type CoreError =
  | { kind: "parse"; message: LocalizedMessage; index: number }
  | { kind: "unsupported"; message: LocalizedMessage; flavor: Flavor }
  | { kind: "timeout"; message: LocalizedMessage };

export interface ParsedPattern {
  source: string;
  flags: string;
  flavor: Flavor;
  ast: unknown; // regexpp AST, never exposed to consumers
  featureSet: FeatureId[];
}

export type FeatureId =
  | "lookahead"
  | "lookbehind"
  | "negLookbehind"
  | "backreference"
  | "namedGroup"
  | "atomicGroup"
  | "possessive"
  | "recursion"
  | "unicodeProperty"
  | "unicodeSets"
  | "conditional"
  | "inlineFlags"
  | "lazyQuantifier"
  | "nestedQuantifier"
  // Non listé dans la spec d'origine : nécessaire pour représenter la règle
  // de compatibilité "\d est ASCII par défaut ici, Unicode là" (voir
  // compat-table.ts et DECISIONS.md).
  | "digitDefault";

export interface ExplainToken {
  start: number; // offset into source
  end: number;
  text: string;
  role: string; // 'anchor' | 'charClass' | 'quantifier' | 'group' | ...
  depth: number; // nesting depth, for display
  explanation: { fr: string; en: string };
}

export interface CompatIssue {
  flavor: Flavor;
  level: "ok" | "different" | "unsupported";
  feature: FeatureId;
  at: [number, number];
  message: { fr: string; en: string };
  suggestion?: string; // equivalent rewrite, when one exists
}

export interface CorpusCase {
  text: string;
  shouldMatch: boolean;
  note?: string;
}

export interface CaseResult {
  case: CorpusCase;
  matched: boolean;
  pass: boolean; // matched === shouldMatch
  ranges: Array<[number, number]>; // for highlighting
  groups: Array<{ name?: string; start: number; end: number }>;
  timedOut: boolean;
}

export interface CorpusReport {
  passed: number;
  total: number;
  results: CaseResult[];
  durationMs: number;
}

export interface RedosVerdict {
  status: "safe" | "vulnerable" | "unknown" | "timeout";
  complexity?: "linear" | "polynomial" | "exponential";
  attackString?: string;
  maxSteps?: number;
  hotspot?: [number, number]; // pattern zone responsible
}
