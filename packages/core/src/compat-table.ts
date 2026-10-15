import type { Flavor, FeatureId } from "./types";

export type CompatLevel = "ok" | "different" | "unsupported";

export interface CompatCell {
  level: CompatLevel;
  message: { fr: string; en: string };
  suggestion?: string;
}

type CompatRow = Record<Flavor, CompatCell>;

const ok = (fr: string, en: string): CompatCell => ({ level: "ok", message: { fr, en } });
const unsupported = (fr: string, en: string): CompatCell => ({
  level: "unsupported",
  message: { fr, en },
});
const different = (fr: string, en: string, suggestion?: string): CompatCell => ({
  level: "different",
  message: { fr, en },
  ...(suggestion !== undefined ? { suggestion } : {}),
});

// Chaque ligne couvre les 7 flavors pour un FeatureId. Sources générales :
// MDN (JS), pcre2syntax(3), Python re docs, RE2 wiki (Syntax), Oracle
// java.util.regex.Pattern javadoc, .NET "Regular Expression Language -
// Quick Reference", POSIX.1 ERE (grep -E, sans extension GNU \p ni lookaround).
export const compatTable: Record<FeatureId, CompatRow> = {
  lookahead: {
    js: ok("pris en charge nativement.", "supported natively."),
    pcre: ok("pris en charge nativement.", "supported natively."),
    python: ok("pris en charge par le module re.", "supported by the re module."),
    re2: unsupported(
      "non pris en charge : RE2 exclut le lookaround pour garantir un temps linéaire.",
      "unsupported: RE2 excludes lookaround to guarantee linear-time matching.",
    ),
    java: ok("pris en charge par java.util.regex.", "supported by java.util.regex."),
    dotnet: ok("pris en charge nativement.", "supported natively."),
    grep: unsupported(
      "non pris en charge : absent de la grammaire ERE (POSIX).",
      "unsupported: not part of the POSIX ERE grammar.",
    ),
  },
  lookbehind: {
    js: ok(
      "pris en charge, largeur variable (depuis ES2018).",
      "supported, variable-width (since ES2018).",
    ),
    pcre: ok(
      "pris en charge, mais chaque alternative doit être de largeur fixe.",
      "supported, but each alternative must be fixed-width.",
    ),
    python: different(
      "pris en charge, mais uniquement à largeur fixe (contrairement à JS).",
      "supported, but fixed-width only (unlike JS).",
    ),
    re2: unsupported(
      "non pris en charge : RE2 exclut le lookaround.",
      "unsupported: RE2 excludes lookaround.",
    ),
    java: ok("pris en charge, largeur bornée.", "supported, bounded-width."),
    dotnet: ok("pris en charge, largeur variable.", "supported, variable-width."),
    grep: unsupported(
      "non pris en charge : absent de la grammaire ERE (POSIX).",
      "unsupported: not part of the POSIX ERE grammar.",
    ),
  },
  negLookbehind: {
    js: ok(
      "pris en charge, largeur variable (depuis ES2018).",
      "supported, variable-width (since ES2018).",
    ),
    pcre: ok(
      "pris en charge, mais chaque alternative doit être de largeur fixe.",
      "supported, but each alternative must be fixed-width.",
    ),
    python: different(
      "pris en charge, mais uniquement à largeur fixe (contrairement à JS).",
      "supported, but fixed-width only (unlike JS).",
    ),
    re2: unsupported(
      "non pris en charge : RE2 exclut le lookaround.",
      "unsupported: RE2 excludes lookaround.",
    ),
    java: ok("pris en charge, largeur bornée.", "supported, bounded-width."),
    dotnet: ok("pris en charge, largeur variable.", "supported, variable-width."),
    grep: unsupported(
      "non pris en charge : absent de la grammaire ERE (POSIX).",
      "unsupported: not part of the POSIX ERE grammar.",
    ),
  },
  backreference: {
    js: ok("pris en charge nativement.", "supported natively."),
    pcre: ok("pris en charge nativement.", "supported natively."),
    python: ok("pris en charge par le module re.", "supported by the re module."),
    re2: unsupported(
      "non pris en charge : RE2 exclut les références arrière pour garantir un temps linéaire.",
      "unsupported: RE2 excludes backreferences to guarantee linear-time matching.",
    ),
    java: ok("pris en charge par java.util.regex.", "supported by java.util.regex."),
    dotnet: ok("pris en charge nativement.", "supported natively."),
    grep: unsupported(
      "non pris en charge en ERE (uniquement en BRE, la syntaxe historique de grep).",
      "unsupported in ERE (only in BRE, grep's legacy syntax).",
    ),
  },
  namedGroup: {
    js: ok('syntaxe "(?<nom>…)".', 'syntax "(?<name>…)".'),
    pcre: ok(
      'accepte "(?<nom>…)" et "(?P<nom>…)".',
      'accepts both "(?<name>…)" and "(?P<name>…)".',
    ),
    python: different(
      'nécessite la syntaxe "(?P<nom>…)".',
      'requires the "(?P<name>…)" syntax.',
      "(?P<name>…)",
    ),
    re2: different(
      'nécessite la syntaxe "(?P<nom>…)".',
      'requires the "(?P<name>…)" syntax.',
      "(?P<name>…)",
    ),
    java: ok('syntaxe "(?<nom>…)".', 'syntax "(?<name>…)".'),
    dotnet: ok('syntaxe "(?<nom>…)".', 'syntax "(?<name>…)".'),
    grep: unsupported(
      "non pris en charge : ERE n'a pas de groupes nommés.",
      "unsupported: ERE has no named groups.",
    ),
  },
  atomicGroup: {
    js: unsupported(
      'non pris en charge : pas de syntaxe "(?>…)" en JavaScript.',
      'unsupported: no "(?>…)" syntax in JavaScript.',
    ),
    pcre: ok('syntaxe "(?>…)".', 'syntax "(?>…)".'),
    python: unsupported(
      "non pris en charge par le module re standard (voir le module tiers regex).",
      "unsupported by the standard re module (see the third-party regex module).",
    ),
    re2: unsupported("non pris en charge.", "unsupported."),
    java: ok('syntaxe "(?>…)".', 'syntax "(?>…)".'),
    dotnet: ok('syntaxe "(?>…)".', 'syntax "(?>…)".'),
    grep: unsupported("non pris en charge.", "unsupported."),
  },
  possessive: {
    js: unsupported(
      'non pris en charge : pas de quantificateur possessif ("a++") en JavaScript.',
      'unsupported: no possessive quantifier ("a++") in JavaScript.',
    ),
    pcre: ok(
      'quantificateurs possessifs ("a++", "a*+"…) pris en charge.',
      'possessive quantifiers ("a++", "a*+"…) supported.',
    ),
    python: unsupported(
      "non pris en charge par le module re standard.",
      "unsupported by the standard re module.",
    ),
    re2: unsupported("non pris en charge.", "unsupported."),
    java: ok("quantificateurs possessifs pris en charge.", "possessive quantifiers supported."),
    dotnet: ok("quantificateurs possessifs pris en charge.", "possessive quantifiers supported."),
    grep: unsupported("non pris en charge.", "unsupported."),
  },
  recursion: {
    js: unsupported("non pris en charge.", "unsupported."),
    pcre: ok('syntaxe "(?R)", "(?1)"…', 'syntax "(?R)", "(?1)"…'),
    python: unsupported(
      "non pris en charge par le module re standard.",
      "unsupported by the standard re module.",
    ),
    re2: unsupported("non pris en charge.", "unsupported."),
    java: unsupported("non pris en charge par java.util.regex.", "unsupported by java.util.regex."),
    dotnet: unsupported("non pris en charge.", "unsupported."),
    grep: unsupported("non pris en charge.", "unsupported."),
  },
  unicodeProperty: {
    js: ok('syntaxe "\\p{…}" sous les drapeaux u ou v.', 'syntax "\\p{…}" under the u or v flag.'),
    pcre: ok(
      'syntaxe "\\p{…}" (nécessite PCRE_UCP selon le contexte).',
      'syntax "\\p{…}" (may require PCRE_UCP).',
    ),
    python: unsupported(
      "non pris en charge par le module re standard (utiliser [^\\x00-\\x7F] ou le module tiers regex).",
      "unsupported by the standard re module (use [^\\x00-\\x7F] or the third-party regex module).",
    ),
    re2: ok('syntaxe "\\p{…}" prise en charge.', 'syntax "\\p{…}" supported.'),
    java: ok('syntaxe "\\p{…}".', 'syntax "\\p{…}".'),
    dotnet: ok('syntaxe "\\p{…}".', 'syntax "\\p{…}".'),
    grep: unsupported(
      "non pris en charge : ERE n'a que les classes POSIX [[:alpha:]] etc.",
      "unsupported: ERE only has POSIX classes like [[:alpha:]].",
    ),
  },
  unicodeSets: {
    js: ok(
      "drapeau v (ES2024) : classes imbriquées, union/intersection/soustraction.",
      "v flag (ES2024): nested classes, union/intersection/subtraction.",
    ),
    pcre: unsupported(
      "pas d'équivalent direct aux opérations d'ensembles du drapeau v.",
      "no direct equivalent to the v flag's set operations.",
    ),
    python: unsupported("pas d'équivalent direct.", "no direct equivalent."),
    re2: unsupported("pas d'équivalent direct.", "no direct equivalent."),
    java: different(
      'syntaxe proche mais différente : intersection de classes via "[a-z&&[^aeiou]]".',
      'close but different syntax: class intersection via "[a-z&&[^aeiou]]".',
      "[a-z&&[^aeiou]]",
    ),
    dotnet: unsupported("pas d'équivalent direct.", "no direct equivalent."),
    grep: unsupported("pas d'équivalent direct.", "no direct equivalent."),
  },
  conditional: {
    js: unsupported("non pris en charge.", "unsupported."),
    pcre: ok('syntaxe "(?(1)oui|non)".', 'syntax "(?(1)yes|no)".'),
    python: unsupported(
      "non pris en charge par le module re standard.",
      "unsupported by the standard re module.",
    ),
    re2: unsupported("non pris en charge.", "unsupported."),
    java: unsupported("non pris en charge par java.util.regex.", "unsupported by java.util.regex."),
    dotnet: ok('syntaxe "(?(nom)oui|non)".', 'syntax "(?(name)yes|no)".'),
    grep: unsupported("non pris en charge.", "unsupported."),
  },
  inlineFlags: {
    js: unsupported(
      'non pris en charge : les drapeaux se posent hors motif en JavaScript, pas en "(?i)".',
      'unsupported: flags are set outside the pattern in JavaScript, not via "(?i)".',
    ),
    pcre: ok(
      'syntaxe "(?i)" (globale) et "(?i:…)" (portée).',
      'syntax "(?i)" (global) and "(?i:…)" (scoped).',
    ),
    python: ok(
      'syntaxe "(?i)" en début de motif, ou "(?i:…)" avec portée.',
      'syntax "(?i)" at the start of the pattern, or scoped "(?i:…)".',
    ),
    re2: ok('syntaxe "(?i)" et "(?i:…)".', 'syntax "(?i)" and "(?i:…)".'),
    java: ok('syntaxe "(?i)" et "(?i:…)".', 'syntax "(?i)" and "(?i:…)".'),
    dotnet: ok('syntaxe "(?i)" et "(?i:…)".', 'syntax "(?i)" and "(?i:…)".'),
    grep: unsupported(
      "non pris en charge : absent de la grammaire ERE.",
      "unsupported: not part of the ERE grammar.",
    ),
  },
  lazyQuantifier: {
    js: ok('suffixe "?" (ex. "+?", "*?").', 'suffix "?" (e.g. "+?", "*?").'),
    pcre: ok('suffixe "?".', 'suffix "?".'),
    python: ok('suffixe "?".', 'suffix "?".'),
    re2: ok('suffixe "?".', 'suffix "?".'),
    java: ok('suffixe "?".', 'suffix "?".'),
    dotnet: ok('suffixe "?".', 'suffix "?".'),
    grep: unsupported(
      "non pris en charge : ERE ne connaît que les quantificateurs gloutons.",
      "unsupported: ERE only has greedy quantifiers.",
    ),
  },
  nestedQuantifier: {
    // Composition syntaxique valide dans tous les moteurs ; le risque
    // ReDoS qu'elle peut introduire est analysé séparément par redos.ts,
    // pas par la matrice de compatibilité.
    js: ok("syntaxe valide.", "valid syntax."),
    pcre: ok("syntaxe valide.", "valid syntax."),
    python: ok("syntaxe valide.", "valid syntax."),
    re2: ok(
      "syntaxe valide ; RE2 compile en automate, sans backtracking exponentiel.",
      "valid syntax; RE2 compiles to an automaton, no exponential backtracking.",
    ),
    java: ok("syntaxe valide.", "valid syntax."),
    dotnet: ok("syntaxe valide.", "valid syntax."),
    grep: ok(
      "syntaxe valide ; les implémentations POSIX usuelles n'utilisent pas de backtracking exponentiel.",
      "valid syntax; typical POSIX implementations do not use exponential backtracking.",
    ),
  },
  digitDefault: {
    js: ok("\\d est ASCII (0-9) par défaut.", "\\d is ASCII (0-9) by default."),
    pcre: ok(
      "\\d est ASCII par défaut (sauf option Unicode explicite).",
      "\\d is ASCII by default (unless Unicode mode is set explicitly).",
    ),
    python: different(
      "\\d est Unicode par défaut sur les chaînes str (matche aussi les chiffres arabes-indiens…).",
      "\\d is Unicode-aware by default on str patterns (also matches Arabic-Indic digits, etc.).",
      "[0-9]",
    ),
    re2: ok("\\d est ASCII par défaut.", "\\d is ASCII by default."),
    java: ok(
      "\\d est ASCII par défaut (sauf UNICODE_CHARACTER_CLASS).",
      "\\d is ASCII by default (unless UNICODE_CHARACTER_CLASS is set).",
    ),
    dotnet: different(
      "\\d est Unicode par défaut (matche aussi les chiffres non-ASCII).",
      "\\d is Unicode-aware by default (also matches non-ASCII digits).",
      "[0-9]",
    ),
    grep: ok(
      "\\d (extension GNU) est ASCII dans la locale C.",
      "\\d (GNU extension) is ASCII in the C locale.",
    ),
  },
};
