import { defineConfig } from "tsup";

export default defineConfig({
  // "redos" est un point d'entrée séparé : voir le commentaire dans
  // src/index.ts (recheck/synckit casse au SSR s'il est simplement présent
  // dans le même bundle que le reste, même sans être appelé).
  entry: ["src/index.ts", "src/redos.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
});
