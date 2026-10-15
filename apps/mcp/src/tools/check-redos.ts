import { parse } from "@rexact/core";
import { analyze } from "@rexact/core/redos";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RedosVerdictSchema } from "../schemas";

const InputSchema = z.object({
  pattern: z.string().min(1).max(2000).describe("The regex source, without delimiters."),
  flags: z.string().max(10).default("").describe('JavaScript regex flags, e.g. "gi".'),
});

// I2 : analyse statique/dynamique du motif lui-même, jamais une exécution
// contre une chaîne fournie par l'appelant — explicitement permis par
// l'invariant ("Le serveur peut parser et analyser statiquement un
// pattern, jamais l'exécuter contre une chaîne fournie par l'utilisateur").
export function registerCheckRedos(server: McpServer): void {
  server.registerTool(
    "check_redos",
    {
      title: "Check a regex for catastrophic backtracking (ReDoS)",
      description:
        "Statically and dynamically analyzes a pattern for ReDoS risk — never executes it against user-supplied input. Offline, no API key required.",
      inputSchema: InputSchema.shape,
      outputSchema: RedosVerdictSchema.shape,
    },
    async ({ pattern, flags }) => {
      const parsed = parse(pattern, flags, "js");
      if (!parsed.ok) {
        return {
          content: [
            { type: "text" as const, text: `Pattern does not compile: ${parsed.error.message.en}` },
          ],
          isError: true,
        };
      }

      const verdict = await analyze(parsed.value);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(verdict, null, 2) }],
        structuredContent: verdict as unknown as Record<string, unknown>,
      };
    },
  );
}
