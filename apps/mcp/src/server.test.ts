import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeEach, describe, expect, it } from "vitest";
import { createServer } from "./server";

// Bout en bout via le vrai protocole MCP (transport en mémoire, paire liée
// client/serveur) — pas un simple appel direct des handlers — pour couvrir
// aussi l'enregistrement des outils et la validation Zod aux frontières, pas
// seulement leur logique interne. Voir SPEC-TECHNIQUE.md §5.1.
async function connectedClient() {
  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  return client;
}

describe("MCP server", () => {
  let client: Awaited<ReturnType<typeof connectedClient>>;

  beforeEach(async () => {
    client = await connectedClient();
  });

  it("exposes all five tools described in SPEC-TECHNIQUE.md §5.1", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "check_compat",
      "check_redos",
      "explain_regex",
      "generate_regex",
      "verify_regex",
    ]);
  });

  describe("verify_regex", () => {
    it("runs a compiling pattern against cases and reports pass/fail", async () => {
      const result = await client.callTool({
        name: "verify_regex",
        arguments: {
          pattern: "^\\d+$",
          flags: "",
          cases: [
            { text: "123", shouldMatch: true },
            { text: "abc", shouldMatch: false },
          ],
        },
      });
      expect(result.isError).toBeFalsy();
      const content = result.structuredContent as { passed: number; total: number };
      expect(content.total).toBe(2);
      expect(content.passed).toBe(2);
    });

    it("reports a failing case rather than throwing", async () => {
      const result = await client.callTool({
        name: "verify_regex",
        arguments: {
          pattern: "^\\d+$",
          flags: "",
          cases: [{ text: "not digits", shouldMatch: true }],
        },
      });
      expect(result.isError).toBeFalsy();
      const content = result.structuredContent as { passed: number; total: number };
      expect(content.passed).toBe(0);
      expect(content.total).toBe(1);
    });

    it("returns isError for a pattern that does not compile", async () => {
      const result = await client.callTool({
        name: "verify_regex",
        arguments: {
          pattern: "(unterminated",
          flags: "",
          cases: [{ text: "x", shouldMatch: true }],
        },
      });
      expect(result.isError).toBe(true);
    });
  });

  describe("check_redos", () => {
    it("flags a classic catastrophic-backtracking pattern as vulnerable", async () => {
      const result = await client.callTool({
        name: "check_redos",
        arguments: { pattern: "^(a+)+$", flags: "" },
      });
      expect(result.isError).toBeFalsy();
      const content = result.structuredContent as { status: string };
      expect(content.status).toBe("vulnerable");
    });

    it("marks a linear pattern as safe", async () => {
      const result = await client.callTool({
        name: "check_redos",
        arguments: { pattern: "^[a-z]+$", flags: "" },
      });
      expect(result.isError).toBeFalsy();
      const content = result.structuredContent as { status: string };
      expect(content.status).toBe("safe");
    });
  });

  describe("explain_regex", () => {
    it("breaks a pattern down into tokens with a localized explanation", async () => {
      const result = await client.callTool({
        name: "explain_regex",
        arguments: { pattern: "^a+$", flags: "", locale: "en" },
      });
      expect(result.isError).toBeFalsy();
      const content = result.structuredContent as {
        tokens: Array<{ text: string; explanation: { en: string; fr: string } }>;
      };
      expect(content.tokens.length).toBeGreaterThan(0);
      expect(content.tokens.every((t) => typeof t.explanation.en === "string")).toBe(true);
    });
  });

  describe("check_compat", () => {
    it("reports a compat issue for a JS-only construct ported to re2", async () => {
      // Les lookaheads ne sont pas supportés par RE2 (moteur linéaire) —
      // incompatibilité connue et stable, bon cas de test.
      const result = await client.callTool({
        name: "check_compat",
        arguments: { pattern: "(?=foo)bar", flags: "", sourceFlavor: "js", targets: ["re2"] },
      });
      expect(result.isError).toBeFalsy();
      const content = result.structuredContent as {
        issues: Array<{ flavor: string; level: string }>;
      };
      expect(content.issues.some((i) => i.flavor === "re2" && i.level === "unsupported")).toBe(
        true,
      );
    });

    it("returns isError for a pattern that does not compile under sourceFlavor", async () => {
      const result = await client.callTool({
        name: "check_compat",
        arguments: { pattern: "(unterminated", flags: "", sourceFlavor: "js", targets: ["pcre"] },
      });
      expect(result.isError).toBe(true);
    });
  });

  describe("generate_regex", () => {
    it("fails gracefully, without a network call, when ANTHROPIC_API_KEY is absent", async () => {
      const previous = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      try {
        const result = await client.callTool({
          name: "generate_regex",
          arguments: {
            description: "a french phone number",
            flavor: "js",
            cases: [{ text: "0612345678", shouldMatch: true }],
          },
        });
        expect(result.isError).toBe(true);
        const text = (result.content as Array<{ type: string; text?: string }>)[0]?.text;
        expect(text).toContain("ANTHROPIC_API_KEY");
      } finally {
        if (previous !== undefined) process.env.ANTHROPIC_API_KEY = previous;
      }
    });
  });
});
