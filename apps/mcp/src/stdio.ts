import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  // stdout est réservé au protocole JSON-RPC (lu par le client MCP) :
  // toute diagnostique va sur stderr, jamais sur stdout.
  console.error("rexact-mcp (stdio) failed to start:", error);
  process.exit(1);
});
