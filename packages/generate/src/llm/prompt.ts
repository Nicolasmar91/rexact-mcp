import type { CorpusCase, Flavor } from "@rexact/core";

// Incrémenter à chaque modification du prompt : invalide le cache (§3.2 point 1).
export const PROMPT_VERSION = 1;

// Annexe D de SPEC-TECHNIQUE.md, reproduit tel quel (le prompt système ne
// varie pas avec la locale — seuls nos propres messages d'erreur le font).
export const SYSTEM_PROMPT = `Tu es un compilateur d'expressions régulières. Tu ne converses pas.

SORTIE : un unique objet JSON valide, rien d'autre. Pas de markdown, pas de
backticks, pas de texte avant ou après.

SCHÉMA :
{
  "pattern": string | null,
  "flags": string,
  "notes": string | null,
  "error": "out_of_scope" | null
}

RÈGLES :
- Le flavor cible est fourni par l'appelant. Ne produis jamais une syntaxe
  absente de ce flavor.
- Pour re2 et grep : aucun lookaround, aucune backreference.
- Interdit : quantificateur imbriqué (X+)+ ou (X*)* ; alternance dont les
  branches peuvent matcher la même entrée sous un quantificateur.
  Préfère toujours une forme à backtracking linéaire.
- N'ancre le pattern que si la demande implique une validation complète.
- Si la demande n'est pas une tâche de reconnaissance de motif textuel,
  réponds {"pattern": null, "flags": "", "notes": null, "error": "out_of_scope"}.
- "notes" est réservé à une contrainte technique non satisfaite, en une
  phrase, ou null.

CORRECTION : si des cas de test échoués sont fournis, produis un nouveau
pattern qui les satisfait tous sans casser les cas déjà satisfaits.`;

export interface GenerateContext {
  description: string;
  flavor: Flavor;
  cases: CorpusCase[];
}

export type Correction =
  | {
      kind: "failedCases";
      pattern: string;
      failures: Array<{ text: string; shouldMatch: boolean; matched: boolean }>;
    }
  | { kind: "redosVulnerable"; pattern: string; attackString?: string }
  | { kind: "invalidOutput" };

function formatCase(testCase: CorpusCase): string {
  const verb = testCase.shouldMatch ? "doit matcher" : "ne doit pas matcher";
  return `- ${verb} : "${testCase.text}"`;
}

function formatFailure(failure: { text: string; shouldMatch: boolean; matched: boolean }): string {
  const expected = failure.shouldMatch ? "devait matcher" : "ne devait pas matcher";
  const observed = failure.matched ? "a matché" : "n'a pas matché";
  return `- "${failure.text}" (${expected}, ${observed})`;
}

export function buildUserMessage(context: GenerateContext, correction?: Correction): string {
  const base = [
    `Description : ${context.description}`,
    `Flavor cible : ${context.flavor}`,
    "Cas de test :",
    ...context.cases.map(formatCase),
  ].join("\n");

  if (!correction) return base;

  if (correction.kind === "failedCases") {
    return [
      base,
      "",
      `Le pattern ${correction.pattern} a échoué sur :`,
      ...correction.failures.map(formatFailure),
    ].join("\n");
  }

  if (correction.kind === "redosVulnerable") {
    return [
      base,
      "",
      `Le pattern ${correction.pattern} présente un risque de ReDoS (backtracking catastrophique)` +
        (correction.attackString ? ` sur une entrée comme "${correction.attackString}"` : "") +
        `. Réécris-le sans quantificateur imbriqué ni alternance ambiguë sous quantificateur.`,
    ].join("\n");
  }

  return [
    base,
    "",
    "La réponse précédente n'était pas un JSON valide respectant le schéma. Réponds uniquement avec l'objet JSON demandé, rien d'autre.",
  ].join("\n");
}
