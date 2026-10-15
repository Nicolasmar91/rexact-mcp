import { explain, parse } from "@rexact/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ExplainTokenSchema } from "../schemas";

const InputSchema = z.object({
  pattern: z.string().min(1).max(2000).describe("The regex source, without delimiters."),
  flags: z.string().max(10).default("").describe('JavaScript regex flags, e.g. "gi".'),
  locale: z.enum(["fr", "en"]).default("en").describe("Language for the plain-text explanation."),
});

const OutputSchema = z.object({ tokens: z.array(ExplainTokenSchema) });

export function registerExplainRegex(server: McpServer): void {
  server.registerTool(
    "explain_regex",
    {
      title: "Explain a regex token by token",
      description:
        "Breaks a pattern down into an ordered list of tokens (anchors, groups, quantifiers...) with a plain-language explanation for each. Offline, no API key required.",
      inputSchema: InputSchema.shape,
      outputSchema: OutputSchema.shape,
    },
    async ({ pattern, flags, locale }) => {
      const parsed = parse(pattern, flags, "js");
      if (!parsed.ok) {
        return {
          content: [
            { type: "text" as const, text: `Pattern does not compile: ${parsed.error.message.en}` },
          ],
          isError: true,
        };
      }

      const tokens = explain(parsed.value);
      const readable = tokens
        .map((t) => `${t.text || "(empty)"} — ${t.explanation[locale]}`)
        .join("\n");
      return {
        content: [{ type: "text" as const, text: readable }],
        structuredContent: { tokens },
      };
    },
  );
}
