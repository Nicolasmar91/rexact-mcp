import type { ExplainKey } from "./explain-key";

function quantifierText(min: number, max: number, greedy: boolean): string {
  const lazy = greedy ? "" : " (lazy: as few characters as possible)";
  if (min === 0 && max === Infinity) return `zero or more times${lazy}`;
  if (min === 1 && max === Infinity) return `one or more times${lazy}`;
  if (min === 0 && max === 1) return `zero or one time, optional${lazy}`;
  if (min === max) return `exactly ${min} times`;
  if (max === Infinity) return `${min} times or more${lazy}`;
  return `between ${min} and ${max} times${lazy}`;
}

export function explainEn(key: ExplainKey): string {
  switch (key.kind) {
    case "anchorStart":
      return key.multiline ? "start of string (or line, with the m flag)" : "start of string";
    case "anchorEnd":
      return key.multiline ? "end of string (or line, with the m flag)" : "end of string";
    case "wordBoundary":
      return key.negate
        ? "not a word boundary"
        : "word boundary (transition between a word character and another)";
    case "dot":
      return key.dotAll
        ? "any character, including line breaks (s flag active)"
        : "any character except a line break";
    case "digitClass":
      return key.negate ? "anything but a digit" : "a digit (0-9)";
    case "wordCharClass":
      return key.negate ? "anything but a word character" : "a word character (letter, digit or _)";
    case "spaceClass":
      return key.negate ? "anything but whitespace" : "whitespace (space, tab, line break…)";
    case "unicodeProperty": {
      const label = key.value ? `${key.key}=${key.value}` : key.key;
      return key.negate
        ? `any character outside the Unicode property "${label}"`
        : `a character in the Unicode property "${label}"`;
    }
    case "characterClass":
      return key.negate ? `a character not in ${key.raw}` : `a character in ${key.raw}`;
    case "literal":
      return key.text.length === 1
        ? `literal character "${key.text}"`
        : `literal text "${key.text}"`;
    case "quantifier":
      return quantifierText(key.min, key.max, key.greedy);
    case "group":
      if (key.name) return `named capturing group "${key.name}"`;
      if (key.capturing) return `capturing group #${key.index}`;
      return "non-capturing group (groups without capturing)";
    case "lookahead":
      return key.negate
        ? "must NOT be followed by this pattern (negative lookahead, consumes nothing)"
        : "must be followed by this pattern (lookahead, consumes nothing)";
    case "lookbehind":
      return key.negate
        ? "must NOT be preceded by this pattern (negative lookbehind, consumes nothing)"
        : "must be preceded by this pattern (lookbehind, consumes nothing)";
    case "backreference":
      return typeof key.ref === "number"
        ? `backreference to group #${key.ref}`
        : `backreference to named group "${key.ref}"`;
    case "alternation":
      return "or (one of the alternatives separated by |)";
  }
}
