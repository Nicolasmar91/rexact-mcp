// Description neutre (indépendante de la langue) de ce qu'il faut expliquer.
// Les deux catalogues (explanations.fr.ts / explanations.en.ts) partagent ce
// type pour rester en phase l'un avec l'autre.
export type ExplainKey =
  | { kind: "anchorStart"; multiline: boolean }
  | { kind: "anchorEnd"; multiline: boolean }
  | { kind: "wordBoundary"; negate: boolean }
  | { kind: "dot"; dotAll: boolean }
  | { kind: "digitClass"; negate: boolean }
  | { kind: "wordCharClass"; negate: boolean }
  | { kind: "spaceClass"; negate: boolean }
  | { kind: "unicodeProperty"; key: string; value: string | null; negate: boolean }
  | { kind: "characterClass"; raw: string; negate: boolean }
  | { kind: "literal"; text: string }
  | { kind: "quantifier"; min: number; max: number; greedy: boolean }
  | { kind: "group"; capturing: boolean; name: string | null; index: number | null }
  | { kind: "lookahead"; negate: boolean }
  | { kind: "lookbehind"; negate: boolean }
  | { kind: "backreference"; ref: number | string }
  | { kind: "alternation" };
