import { checkCompat, parse } from "@rexact/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CompatIssueSchema, FlavorSchema } from "../schemas";

// SPEC-TECHNIQUE.md §5.1 liste l'entrée de cet outil comme (pattern, flags,
// targets) uniquement, mais checkCompat() a structurellement besoin du
// flavor D'ORIGINE du motif (celui pour lequel il a été écrit) en plus des
// flavors CIBLES à comparer. Ajout de `sourceFlavor`, par défaut "js" (seul
// flavor que packages/core sait réellement parser). Voir DECISIONS.md.
const InputSchema = z.object({
  pattern: z.string().min(1).max(2000).describe("The regex source, without delimiters."),
  flags: z.string().max(10).default("").describe('JavaScript regex flags, e.g. "gi".'),
  sourceFlavor: FlavorSchema.default("js").describe(
    'The flavor the pattern was authored for. Not in SPEC-TECHNIQUE.md\'s input list for this tool — added because checkCompat() requires it; defaults to "js".',
  ),
  targets: z.array(FlavorSchema).min(1).describe("Engines to check compatibility against."),
});

const OutputSchema = z.object({ issues: z.array(CompatIssueSchema) });

export function registerCheckCompat(server: McpServer): void {
  server.registerTool(
    "check_compat",
    {
      title: "Check cross-engine regex compatibility",
      description:
        "Reports syntax and semantic differences when a pattern is ported from its source flavor to one or more target engines (PCRE, RE2, Python, Java, .NET, POSIX grep). Offline, no API key required.",
      inputSchema: InputSchema.shape,
      outputSchema: OutputSchema.shape,
    },
    async ({ pattern, flags, sourceFlavor, targets }) => {
      const parsed = parse(pattern, flags, sourceFlavor);
      if (!parsed.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Pattern does not compile for flavor "${sourceFlavor}": ${parsed.error.message.en}`,
            },
          ],
          isError: true,
        };
      }

      const issues = checkCompat(parsed.value, targets);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(issues, null, 2) }],
        structuredContent: { issues },
      };
    },
  );
}
