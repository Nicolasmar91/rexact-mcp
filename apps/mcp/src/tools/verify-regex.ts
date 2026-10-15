import { parse } from "@rexact/core";
import { runCorpusSandboxed } from "@rexact/generate";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CorpusCaseSchema, CorpusReportSchema, toCorpusCase } from "../schemas";

const InputSchema = z.object({
  pattern: z.string().min(1).max(2000).describe("The regex source, without delimiters."),
  flags: z.string().max(10).default("").describe('JavaScript regex flags, e.g. "gi".'),
  cases: z
    .array(CorpusCaseSchema)
    .min(1)
    .max(100)
    .describe("Test cases to run the pattern against."),
});

// I2 : la seule exécution d'une regex arbitraire côté serveur passe par le
// même bac à sable worker_threads que la boucle de génération du lot 3
// (corpus plafonné, timeout dur, terminate() forcé) — jamais un
// `new RegExp().test()` direct.
export function registerVerifyRegex(server: McpServer): void {
  server.registerTool(
    "verify_regex",
    {
      title: "Verify a regex against test cases",
      description:
        "Runs a regular expression against a set of test cases in a sandboxed worker (never on the calling process) and returns a pass/fail report. Offline, no API key required.",
      inputSchema: InputSchema.shape,
      outputSchema: CorpusReportSchema.shape,
    },
    async ({ pattern, flags, cases }) => {
      const parsed = parse(pattern, flags, "js");
      if (!parsed.ok) {
        return {
          content: [
            { type: "text" as const, text: `Pattern does not compile: ${parsed.error.message.en}` },
          ],
          isError: true,
        };
      }

      const report = await runCorpusSandboxed(pattern, flags, cases.map(toCorpusCase));
      if (!report) {
        return {
          content: [
            {
              type: "text" as const,
              text: "The pattern could not be verified safely within the time budget (possible catastrophic backtracking). Try check_redos first.",
            },
          ],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(report, null, 2) }],
        // Cast d'interop SDK : CorpusReport (interface fermée) n'a pas de
        // signature d'index, requise par le type structurel de
        // `structuredContent`. Le contenu reste le même objet, non modifié.
        structuredContent: report as unknown as Record<string, unknown>,
      };
    },
  );
}
