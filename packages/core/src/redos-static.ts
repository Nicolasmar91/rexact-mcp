import { visitRegExpAST } from "@eslint-community/regexpp";
import type { AST } from "@eslint-community/regexpp";
import { isNestedQuantifier } from "./feature-occurrences";
import type { ParsedPattern } from "./types";

export interface StaticHotspot {
  start: number;
  end: number;
  reason: "nestedQuantifier" | "overlappingAlternation" | "adjacentQuantifiers";
}

function hasOverlappingAlternation(element: AST.Element, source: string): boolean {
  if (element.type !== "Group" && element.type !== "CapturingGroup") return false;
  const raws = element.alternatives.map((alt) => source.slice(alt.start, alt.end));
  return new Set(raws).size !== raws.length;
}

function sameRepeatableUnit(a: AST.Element, b: AST.Element, source: string): boolean {
  if (a.type === "CharacterSet" && b.type === "CharacterSet" && a.kind === b.kind) {
    if (a.kind === "any") return true;
    return "negate" in a && "negate" in b && a.negate === b.negate;
  }
  return source.slice(a.start, a.end) === source.slice(b.start, b.end);
}

function isAdjacentAmbiguousQuantifier(node: AST.Quantifier, source: string): boolean {
  if (node.max !== Infinity) return false;
  const parent = node.parent;
  if (parent.type !== "Alternative") return false;
  const index = parent.elements.indexOf(node);
  const next = parent.elements[index + 1];
  if (!next || next.type !== "Quantifier" || next.max !== Infinity) return false;
  return sameRepeatableUnit(node.element, next.element, source);
}

// Détection statique bon marché (1er étage du §1.5) : quantificateur imbriqué
// (a+)+, alternance chevauchante sous quantificateur (a|a)*, quantificateurs
// adjacents ambigus (a*a*, \d+\d*). Une heuristique volontairement simple :
// détecter l'ambiguïté en toute généralité est indécidable, recheck (2e
// étage) fait le travail exhaustif ; ceci ne sert qu'à peupler `hotspot`
// rapidement et à titre indicatif.
export function findStaticHotspots(pattern: AST.Pattern, source: string): StaticHotspot[] {
  const hotspots: StaticHotspot[] = [];

  visitRegExpAST(pattern, {
    onQuantifierEnter(node) {
      if (isNestedQuantifier(node)) {
        hotspots.push({ start: node.start, end: node.end, reason: "nestedQuantifier" });
      }
      if (hasOverlappingAlternation(node.element, source)) {
        hotspots.push({ start: node.start, end: node.end, reason: "overlappingAlternation" });
      }
      if (isAdjacentAmbiguousQuantifier(node, source)) {
        const next =
          node.parent.type === "Alternative"
            ? node.parent.elements[node.parent.elements.indexOf(node) + 1]
            : undefined;
        hotspots.push({
          start: node.start,
          end: next ? next.end : node.end,
          reason: "adjacentQuantifiers",
        });
      }
    },
  });

  return hotspots;
}

// Enveloppe publique : `ParsedPattern.ast` est `unknown` dans l'API publique
// (types.ts) — seuls les modules internes de core savent qu'il s'agit d'un
// AST regexpp. Sert de garde-fou bon marché, sans exécution, avant même de
// lancer un corpus côté serveur (voir l'exception encadrée du lot 3.1).
export function analyzeStaticRedos(parsed: ParsedPattern): StaticHotspot[] {
  return findStaticHotspots(parsed.ast as AST.Pattern, parsed.source);
}
