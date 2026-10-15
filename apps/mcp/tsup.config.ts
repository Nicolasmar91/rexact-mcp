import { defineConfig } from "tsup";

// Les paquets @rexact/* sont des workspaces internes, jamais publiés sur npm :
// on les embarque dans le bundle (noExternal). Leurs dépendances tierces
// (recheck, regexpp, zod) restent déclarées dans package.json et installées
// par npm chez l'utilisateur.
const internal = [/^@rexact\//];

export default defineConfig([
  {
    entry: ["src/stdio.ts", "src/http.ts"],
    format: ["esm"],
    dts: false,
    sourcemap: true,
    clean: false,
    noExternal: internal,
    banner: {
      // `bin: rexact-mcp` (package.json) pointe vers dist/stdio.js : exécutable
      // direct par un client MCP local (`npx`), pas seulement importable.
      js: "#!/usr/bin/env node",
    },
  },
  {
    // Script du bac à sable worker_threads (voir packages/generate/src/
    // run-corpus-sandboxed.ts) : Node le charge directement, il doit donc
    // être autonome et se trouver dans dist/workers/ à côté du bundle.
    entry: {
      "workers/corpus-sandbox.worker":
        "../../packages/generate/src/workers/corpus-sandbox.worker.mjs",
    },
    format: ["esm"],
    dts: false,
    clean: false,
    noExternal: internal,
    outExtension: () => ({ js: ".mjs" }),
  },
]);
