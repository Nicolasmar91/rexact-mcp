import type { ExplainKey } from "./explain-key";

function quantifierText(min: number, max: number, greedy: boolean): string {
  const lazy = greedy ? "" : " (paresseux : le moins de caractères possible)";
  if (min === 0 && max === Infinity) return `zéro fois ou plus${lazy}`;
  if (min === 1 && max === Infinity) return `une fois ou plus${lazy}`;
  if (min === 0 && max === 1) return `zéro ou une fois, optionnel${lazy}`;
  if (min === max) return `exactement ${min} fois`;
  if (max === Infinity) return `${min} fois ou plus${lazy}`;
  return `entre ${min} et ${max} fois${lazy}`;
}

export function explainFr(key: ExplainKey): string {
  switch (key.kind) {
    case "anchorStart":
      return key.multiline ? "début de chaîne (ou de ligne, drapeau m actif)" : "début de chaîne";
    case "anchorEnd":
      return key.multiline ? "fin de chaîne (ou de ligne, drapeau m actif)" : "fin de chaîne";
    case "wordBoundary":
      return key.negate
        ? "absence de limite de mot"
        : "limite de mot (transition entre un caractère de mot et un autre)";
    case "dot":
      return key.dotAll
        ? "n'importe quel caractère, y compris les retours à la ligne (drapeau s actif)"
        : "n'importe quel caractère sauf un retour à la ligne";
    case "digitClass":
      return key.negate ? "tout sauf un chiffre" : "un chiffre (0-9)";
    case "wordCharClass":
      return key.negate
        ? "tout sauf un caractère de mot"
        : "un caractère de mot (lettre, chiffre ou _)";
    case "spaceClass":
      return key.negate ? "tout sauf un espace" : "un espace (espace, tabulation, saut de ligne…)";
    case "unicodeProperty": {
      const label = key.value ? `${key.key}=${key.value}` : key.key;
      return key.negate
        ? `tout caractère hors de la propriété Unicode « ${label} »`
        : `un caractère de la propriété Unicode « ${label} »`;
    }
    case "characterClass":
      return key.negate ? `un caractère absent de ${key.raw}` : `un caractère parmi ${key.raw}`;
    case "literal":
      return key.text.length === 1
        ? `caractère littéral « ${key.text} »`
        : `texte littéral « ${key.text} »`;
    case "quantifier":
      return quantifierText(key.min, key.max, key.greedy);
    case "group":
      if (key.name) return `groupe de capture nommé « ${key.name} »`;
      if (key.capturing) return `groupe de capture n°${key.index}`;
      return "groupe non capturant (regroupe sans capturer)";
    case "lookahead":
      return key.negate
        ? "doit NE PAS être suivi de ce motif (lookahead négatif, ne consomme rien)"
        : "doit être suivi de ce motif (lookahead, ne consomme rien)";
    case "lookbehind":
      return key.negate
        ? "doit NE PAS être précédé de ce motif (lookbehind négatif, ne consomme rien)"
        : "doit être précédé de ce motif (lookbehind, ne consomme rien)";
    case "backreference":
      return typeof key.ref === "number"
        ? `référence arrière au groupe n°${key.ref}`
        : `référence arrière au groupe nommé « ${key.ref} »`;
    case "alternation":
      return "ou (l'une des alternatives séparées par |)";
  }
}
