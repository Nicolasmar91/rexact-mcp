import { visitRegExpAST } from "@eslint-community/regexpp";
import type { AST } from "@eslint-community/regexpp";
import type { FeatureId } from "./types";

export interface FeatureOccurrence {
  feature: FeatureId;
  start: number;
  end: number;
}

// Forme précise du risque ReDoS classique (a+)+ : un quantificateur non
// borné (max Infinity) qui répète un groupe dont TOUT le contenu (une
// alternative à un seul élément) est lui-même un quantificateur à largeur
// variable (min !== max). Volontairement strict : un groupe composé d'un
// littéral distinctif suivi d'un quantificateur (ex. (?:-[a-z0-9]+)*, où le
// "-" lève l'ambiguïté à chaque répétition) n'a pas cette forme et n'est pas
// signalé, même s'il "contient" un quantificateur.
export function isNestedQuantifier(node: AST.Quantifier): boolean {
  if (node.max !== Infinity) return false;
  const element = node.element;
  if (element.type !== "Group" && element.type !== "CapturingGroup") return false;
  return element.alternatives.some((alternative) => {
    if (alternative.elements.length !== 1) return false;
    const only = alternative.elements[0];
    return only?.type === "Quantifier" && only.min !== only.max;
  });
}

// Parcourt l'AST une seule fois et relève chaque occurrence de FeatureId,
// avec sa position. Réutilisé par parse.ts (featureSet dédupliqué) et par
// compat.ts (une CompatIssue par occurrence, positionnée pour le surlignage).
//
// Les FeatureId sans équivalent syntaxique en JS (atomicGroup, possessive,
// recursion, conditional, inlineFlags) ne peuvent jamais être détectés ici :
// un motif qui les utilise échoue au parsing avant d'atteindre cette
// fonction. Ils ne servent qu'à documenter la matrice de compatibilité.
export function findFeatureOccurrences(pattern: AST.Pattern, flags: string): FeatureOccurrence[] {
  const occurrences: FeatureOccurrence[] = [];

  visitRegExpAST(pattern, {
    onAssertionEnter(node) {
      if (node.kind === "lookahead") {
        occurrences.push({ feature: "lookahead", start: node.start, end: node.end });
      }
      if (node.kind === "lookbehind") {
        occurrences.push({
          feature: node.negate ? "negLookbehind" : "lookbehind",
          start: node.start,
          end: node.end,
        });
      }
    },
    onBackreferenceEnter(node) {
      occurrences.push({ feature: "backreference", start: node.start, end: node.end });
    },
    onCapturingGroupEnter(node) {
      if (node.name) {
        occurrences.push({ feature: "namedGroup", start: node.start, end: node.end });
      }
    },
    onCharacterSetEnter(node) {
      if (node.kind === "property") {
        occurrences.push({ feature: "unicodeProperty", start: node.start, end: node.end });
      }
      if (node.kind === "digit") {
        occurrences.push({ feature: "digitDefault", start: node.start, end: node.end });
      }
    },
    onQuantifierEnter(node) {
      if (!node.greedy) {
        occurrences.push({ feature: "lazyQuantifier", start: node.start, end: node.end });
      }
      if (isNestedQuantifier(node)) {
        occurrences.push({ feature: "nestedQuantifier", start: node.start, end: node.end });
      }
    },
  });

  if (flags.includes("v")) {
    occurrences.push({ feature: "unicodeSets", start: 0, end: pattern.end });
  }

  return occurrences;
}
