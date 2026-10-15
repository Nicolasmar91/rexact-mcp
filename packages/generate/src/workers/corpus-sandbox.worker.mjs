// Script de worker_threads chargé par Node directement (jamais par un
// bundler — voir run-corpus-sandboxed.ts). JS pur, pas de TS : ce fichier
// doit être exécutable tel quel par Node au runtime.
import { parentPort, workerData } from "node:worker_threads";
import { runCorpus } from "@rexact/core";

try {
  const { pattern, flags, cases } = workerData;
  const report = runCorpus(pattern, flags, cases);
  parentPort.postMessage({ ok: true, report });
} catch (error) {
  parentPort.postMessage({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  });
}
