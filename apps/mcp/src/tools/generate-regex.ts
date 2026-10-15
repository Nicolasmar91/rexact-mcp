import { AnthropicProvider, runCorpusSandboxed, runGenerateLoop } from "@rexact/generate";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  CorpusCaseSchema,
  CorpusReportSchema,
  ExplainTokenSchema,
  FlavorSchema,
  RedosVerdictSchema,
  toCorpusCase,
} from "../schemas";

const InputSchema = z.object({
  description: z
    .string()
    .min(1)
    .max(2000)
    .describe("Natural-language description of the pattern to generate."),
  flavor: FlavorSchema.describe("Target regex flavor for the generated pattern."),
  cases: z
    .array(CorpusCaseSchema)
    .min(1)
    .max(50)
    .describe("Test cases the generated pattern must satisfy."),
});

const OutputSchema = z.object({
  pattern: z.string(),
  flags: z.string(),
  flavor: FlavorSchema,
  report: CorpusReportSchema,
  redos: RedosVerdictSchema,
  explanation: z.array(ExplainTokenSchema),
  attempts: z.number(),
});

// « Nécessite une clé » (§5.1) : celle du process du serveur MCP lui-même
// (ANTHROPIC_API_KEY dans SON environnement), fournie et payée par qui
// exploite cette instance — jamais le quota web gratuit de Rexact. Aucune
// des trois barrières I4 (Turnstile, débit par IP, plafond budgétaire) ne
// s'applique : ce sont des protections contre l'abus d'un budget PARTAGÉ et
// public, qui n'existe pas ici puisque c'est la clé de l'opérateur du
// serveur qui paie. Voir DECISIONS.md.
export function registerGenerateRegex(server: McpServer): void {
  server.registerTool(
    "generate_regex",
    {
      title: "Generate a regex from a natural-language description",
      description:
        "Asks an LLM to draft a pattern from a description and test cases, then deterministically verifies it (compile, corpus, ReDoS) before returning it — never returns unverified model output. Requires ANTHROPIC_API_KEY in the MCP server's own environment (your own key, your own cost).",
      inputSchema: InputSchema.shape,
      outputSchema: OutputSchema.shape,
    },
    async ({ description, flavor, cases }) => {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return {
          content: [
            {
              type: "text" as const,
              text: "generate_regex requires ANTHROPIC_API_KEY in the MCP server's own environment. The other four tools (verify_regex, check_redos, explain_regex, check_compat) work offline without one.",
            },
          ],
          isError: true,
        };
      }

      const provider = new AnthropicProvider(apiKey);
      const loop = await runGenerateLoop(
        { description, flavor, cases: cases.map(toCorpusCase) },
        { provider, runCorpusSandboxed },
      );

      if (!loop.ok) {
        const message =
          loop.error.kind === "out_of_scope"
            ? "This description is not a text-pattern-recognition task."
            : "Generation failed to produce a valid, compiling pattern after several attempts.";
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(loop.value, null, 2) }],
        structuredContent: loop.value as unknown as Record<string, unknown>,
      };
    },
  );
}
