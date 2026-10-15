import { randomUUID } from "node:crypto";
import {
  createServer as createHttpServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server";

const PORT = Number(process.env.PORT ?? 3300);
const SESSION_HEADER = "mcp-session-id";

// Une paire (McpServer, transport) par session, isolées entre clients
// concurrents (mode "stateful" du SDK) — jamais un état partagé entre
// appelants.
const sessions = new Map<string, StreamableHTTPServerTransport>();

function sessionIdFromRequest(req: IncomingMessage): string | undefined {
  const header = req.headers[SESSION_HEADER];
  return Array.isArray(header) ? header[0] : header;
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const existingId = sessionIdFromRequest(req);
  const existing = existingId ? sessions.get(existingId) : undefined;

  if (existing) {
    await existing.handleRequest(req, res);
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "No active MCP session; send an initialize request first." }));
    return;
  }

  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      sessions.set(sessionId, transport);
    },
    onsessionclosed: (sessionId) => {
      sessions.delete(sessionId);
    },
  });

  // @ts-expect-error — StreamableHTTPServerTransport expose `onclose` via un
  // accesseur typé `(() => void) | undefined`, incompatible sous
  // exactOptionalPropertyTypes avec le `onclose?: () => void` de l'interface
  // Transport du SDK. Incompatibilité de typage interne au SDK externe, pas
  // un bug réel de ce code.
  await server.connect(transport);
  await transport.handleRequest(req, res);
}

const httpServer = createHttpServer((req, res) => {
  handleRequest(req, res).catch((error: unknown) => {
    console.error("rexact-mcp (http) request failed:", error);
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error." }));
    }
  });
});

httpServer.listen(PORT, () => {
  console.error(`rexact-mcp (HTTP streamable) listening on :${PORT}`);
});
