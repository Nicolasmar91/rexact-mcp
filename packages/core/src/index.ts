export * from "./types";
export type { Cache } from "./cache";
export { InMemoryCache } from "./cache";
export { checkCompat } from "./compat";
export { explain } from "./explain";
export { parse } from "./parse";
export { runCorpus } from "./corpus";
export { analyzeStaticRedos } from "./redos-static";
export type { StaticHotspot } from "./redos-static";
export { exportTests } from "./export";
export type { ExportTarget, ExportTestsInput, ExportTestsResult } from "./export";
export {
  choosePhpDelimiter,
  toDoubleQuotedLiteral,
  toGoStringLiteral,
  toPhpDoubleQuotedLiteral,
  toPhpSingleQuotedLiteral,
} from "./export/escape";

// analyze() (ReDoS) est volontairement absent de ce point d'entrée : il
// importe `recheck`, dont la dépendance `synckit` casse au SSR dès qu'elle
// est simplement chargée (même sans être appelée) dans un bundle Next.js.
// Voir "./redos" — un sous-chemin séparé, à importer uniquement là où
// l'analyse ReDoS est réellement exécutée (le Worker navigateur, un script
// serveur dédié), jamais depuis un composant rendu au SSR.
