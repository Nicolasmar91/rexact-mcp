import type { CorpusCase, CorpusReport } from "@rexact/core";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

const HARD_TIMEOUT_MS = 100;

// Node charge ce script de worker_threads directement, mais CE fichier-ci
// est lui-même compilé par tsup (consommé depuis dist/ par apps/web et
// apps/mcp) : sa résolution via import.meta.url pointe alors vers
// dist/run-corpus-sandboxed.js, pas src/. Comme ce paquet n'est jamais
// publié (workspace pnpm interne, symlinké tel quel), src/ existe toujours
// à côté de dist/ — on essaie plusieurs candidats plutôt que de parier sur
// un seul environnement (Vitest en source, dist consommé par un autre
// paquet du monorepo).
//
// Volontairement PAS de `new URL("./chemin/litteral.mjs", import.meta.url)` :
// Next.js/webpack détecte statiquement ce motif comme une référence d'asset
// à bundler, et fait échouer le build entier dès que le premier chemin
// littéral testé n'existe pas physiquement (dist/workers/... n'existe pas
// tant que src/ n'a pas été copié). `fileURLToPath(import.meta.url)` seul,
// puis `path.join` en pur runtime, échappe à cette détection.
function workerScriptPath(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(moduleDir, "workers", "corpus-sandbox.worker.mjs"),
    path.join(moduleDir, "..", "src", "workers", "corpus-sandbox.worker.mjs"),
    path.join(process.cwd(), "packages", "generate", "src", "workers", "corpus-sandbox.worker.mjs"),
    path.join(process.cwd(), "src", "workers", "corpus-sandbox.worker.mjs"),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`corpus-sandbox.worker.mjs introuvable (essayé : ${candidates.join(", ")})`);
  }
  return found;
}

// Exception encadrée à l'invariant I2 (§3.1) : seul chemin de code serveur
// autorisé à compiler/exécuter une regex utilisateur, avec ces garde-fous
// cumulatifs — corpus ≤ 20 cas, chaînes ≤ 500 caractères (imposés par le
// schéma Zod de l'appelant), worker_threads isolé, terminate() après 100 ms.
// `null` en retour signifie "non vérifiable en toute sécurité" — jamais
// interprété comme un succès.
export function runCorpusSandboxed(
  pattern: string,
  flags: string,
  cases: CorpusCase[],
): Promise<CorpusReport | null> {
  return new Promise((resolve) => {
    let settled = false;
    const worker = new Worker(workerScriptPath(), { workerData: { pattern, flags, cases } });

    function finish(result: CorpusReport | null) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      resolve(result);
    }

    const timer = setTimeout(() => finish(null), HARD_TIMEOUT_MS);

    worker.once("message", (message: { ok: true; report: CorpusReport } | { ok: false }) => {
      finish(message.ok ? message.report : null);
    });

    worker.once("error", () => finish(null));
  });
}
