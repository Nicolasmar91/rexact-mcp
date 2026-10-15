# rexact-mcp

Serveur MCP de [Rexact](https://rexact.dev) : votre assistant IA vérifie, explique et audite
des regex (ReDoS, compatibilité entre moteurs) avec le moteur de Rexact, hors ligne.

```json
{ "mcpServers": { "rexact": { "command": "npx", "args": ["-y", "rexact-mcp"] } } }
```

Documentation d'usage : [apps/mcp/README.md](apps/mcp/README.md) · Page du projet : <https://rexact.dev/fr/mcp>
· Paquet npm : <https://www.npmjs.com/package/rexact-mcp>

## Contenu du dépôt

| Dossier | Rôle |
| --- | --- |
| `apps/mcp` | le serveur MCP (publié sur npm sous le nom `rexact-mcp`) |
| `packages/core` | moteur : analyse, exécution du corpus, ReDoS, compatibilité, explication |
| `packages/generate` | bac à sable d'exécution et boucle de génération (outil facultatif) |

Le site rexact.dev lui-même n'est pas dans ce dépôt.

## Développement

```bash
pnpm install
pnpm build
pnpm test
```

Ce dépôt est généré depuis le dépôt de développement de Rexact : les contributions sont les bienvenues
via les issues et les pull requests, qui seront reportées à la main dans la source.

## Licence

MIT, voir [LICENSE](LICENSE).
