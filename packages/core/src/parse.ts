import { RegExpParser } from "@eslint-community/regexpp";
import type { AST } from "@eslint-community/regexpp";
import { findFeatureOccurrences } from "./feature-occurrences";
import type {
  CoreError,
  FeatureId,
  Flavor,
  LocalizedMessage,
  ParsedPattern,
  Result,
} from "./types";

// Longueur maximale acceptée avant même de tenter un parsing (§1.2).
const MAX_PATTERN_LENGTH = 2000;

const parser = new RegExpParser();

function detectFeatures(pattern: AST.Pattern, flags: string): FeatureId[] {
  return [...new Set(findFeatureOccurrences(pattern, flags).map((o) => o.feature))];
}

function buildInlineFlagMessage(source: string, flavor: Flavor): LocalizedMessage | null {
  const match = /^\(\?([a-zA-Z]+)\)/.exec(source);
  if (!match) return null;
  const flags = match[1];
  return {
    fr:
      `Les drapeaux en ligne comme "(?${flags})" ne sont pas pris en charge par ` +
      `l'analyseur commun (grammaire JavaScript), même si ${flavor} les autorise ` +
      `habituellement en début de motif. Passe-les via le paramètre "flags".`,
    en:
      `Inline flags like "(?${flags})" are not supported by the common parser ` +
      `(JavaScript grammar), even though ${flavor} usually allows them at the start ` +
      `of a pattern. Pass them via the "flags" parameter instead.`,
  };
}

function errorIndex(error: unknown): number {
  const index = (error as { index?: unknown } | undefined)?.index;
  return typeof index === "number" ? index : 0;
}

// Les messages d'exception de regexpp lui-même (ex. "Unterminated group")
// sont un détail technique du parseur, jamais traduits par la bibliothèque —
// affichés identiquement dans les deux langues plutôt que traduits à la main
// (risque de contresens sur un message qu'on ne maîtrise pas).
function rawErrorMessage(error: unknown): LocalizedMessage {
  const text = error instanceof Error ? error.message : "Invalid pattern.";
  return { fr: text, en: text };
}

function toParseError(error: unknown, source: string, flavor: Flavor): CoreError {
  const message = buildInlineFlagMessage(source, flavor) ?? rawErrorMessage(error);
  return { kind: "parse", message, index: errorIndex(error) };
}

export function parse(source: string, flags: string, flavor: Flavor): Result<ParsedPattern> {
  try {
    if (source.length > MAX_PATTERN_LENGTH) {
      return {
        ok: false,
        error: {
          kind: "parse",
          message: {
            fr: `Le motif dépasse la longueur maximale acceptée (${MAX_PATTERN_LENGTH} caractères).`,
            en: `The pattern exceeds the maximum accepted length (${MAX_PATTERN_LENGTH} characters).`,
          },
          index: MAX_PATTERN_LENGTH,
        },
      };
    }

    if (flags.includes("u") && flags.includes("v")) {
      return {
        ok: false,
        error: {
          kind: "parse",
          message: {
            fr: 'Les drapeaux "u" et "v" sont mutuellement exclusifs.',
            en: 'The "u" and "v" flags are mutually exclusive.',
          },
          index: 0,
        },
      };
    }

    try {
      parser.parseFlags(flags, 0, flags.length);
    } catch (error) {
      return { ok: false, error: toParseError(error, source, flavor) };
    }

    const unicode = flags.includes("u");
    const unicodeSets = flags.includes("v");

    const pattern = parser.parsePattern(source, 0, source.length, { unicode, unicodeSets });

    return {
      ok: true,
      value: {
        source,
        flags,
        flavor,
        ast: pattern,
        featureSet: detectFeatures(pattern, flags),
      },
    };
  } catch (error) {
    return { ok: false, error: toParseError(error, source, flavor) };
  }
}
