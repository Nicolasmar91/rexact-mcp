import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerCheckCompat } from "./tools/check-compat";
import { registerCheckRedos } from "./tools/check-redos";
import { registerExplainRegex } from "./tools/explain-regex";
import { registerGenerateRegex } from "./tools/generate-regex";
import { registerVerifyRegex } from "./tools/verify-regex";

export const SERVER_NAME = "rexact";
export const SERVER_VERSION = "0.1.2";

export function createServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  // Les quatre premiers fonctionnent hors ligne, sans clé, sans coût (§5.1) :
  // c'est l'argument d'adoption. generate_regex est le seul à nécessiter
  // ANTHROPIC_API_KEY dans l'environnement du serveur.
  registerVerifyRegex(server);
  registerCheckRedos(server);
  registerExplainRegex(server);
  registerCheckCompat(server);
  registerGenerateRegex(server);

  return server;
}
