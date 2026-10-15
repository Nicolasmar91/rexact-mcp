import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { exportTests } from "./index";
import type { ExportTestsInput } from "./types";

// Vérifie que les fichiers générés sont *réellement* exécutables (critère
// d'acceptation du lot 1) : on les écrit sur disque et on les lance pour de
// vrai avec le runner de test cible, pas seulement une inspection du texte.

const SAMPLE: ExportTestsInput = {
  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
  flags: "",
  flavor: "js",
  name: "date iso",
  target: "vitest",
  cases: [
    { text: "2026-09-03", shouldMatch: true },
    { text: "not a date", shouldMatch: false },
    { text: 'a "quoted" \\backslash', shouldMatch: false },
  ],
};

describe("exported test suites actually pass", () => {
  it("the generated vitest file passes under vitest", () => {
    const dir = mkdtempSync(join(tmpdir(), "rexact-export-vitest-"));
    try {
      const { filename, content } = exportTests({ ...SAMPLE, target: "vitest" });
      writeFileSync(join(dir, filename), content, "utf8");
      writeFileSync(
        join(dir, "vitest.config.ts"),
        "export default { test: { root: '.' } };\n",
        "utf8",
      );
      // `filename` vient de toIdentifier() (alphanumérique + underscore) :
      // sûr à interpoler dans une commande shell, pas d'entrée externe ici.
      expect(() =>
        execSync(`npx --yes vitest run ${filename}`, { cwd: dir, stdio: "pipe" }),
      ).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60000);

  it("the generated pytest file passes under pytest", () => {
    const dir = mkdtempSync(join(tmpdir(), "rexact-export-pytest-"));
    try {
      const { filename, content } = exportTests({ ...SAMPLE, target: "pytest" });
      writeFileSync(join(dir, filename), content, "utf8");
      expect(() =>
        execFileSync("python", ["-m", "pytest", filename, "-q"], {
          cwd: dir,
          stdio: "pipe",
        }),
      ).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60000);
});
