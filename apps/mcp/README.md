# rexact-mcp

Serveur MCP (Model Context Protocol) pour [Rexact](https://rexact.dev) — vérification, analyse ReDoS, explication et compatibilité multi-moteurs de regex, adossées à `@rexact/core` (le même moteur déterministe que le site).

Quatre des cinq outils fonctionnent **hors ligne, sans clé API, sans coût** :

| Outil            | Entrée                     | Sortie                                        |
| ---------------- | -------------------------- | --------------------------------------------- |
| `verify_regex`   | pattern, flags, cases      | `CorpusReport`                                |
| `check_redos`    | pattern, flags             | `RedosVerdict`                                |
| `explain_regex`  | pattern, flags, locale     | `ExplainToken[]`                              |
| `check_compat`   | pattern, flags, targets    | `CompatIssue[]`                               |
| `generate_regex` | description, cases, flavor | motif vérifié — nécessite `ANTHROPIC_API_KEY` |

Aucune regex fournie n'est jamais exécutée en dehors d'un bac à sable `worker_threads` avec timeout dur et terminaison forcée (invariant I2 du dépôt) — jamais un `new RegExp().test()` direct côté serveur.

## Installation locale (transport stdio)

Le plus simple pour un client MCP comme Claude Desktop : coller ce bloc dans sa configuration MCP.

```json
{
  "mcpServers": {
    "rexact": {
      "command": "npx",
      "args": ["-y", "rexact-mcp"]
    }
  }
}
```

Pour activer `generate_regex` (facultatif), ajouter votre propre clé Anthropic — c'est votre clé, à votre coût, jamais le quota gratuit du site :

```json
{
  "mcpServers": {
    "rexact": {
      "command": "npx",
      "args": ["-y", "rexact-mcp"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

## Transport HTTP streamable

Pour héberger le serveur (auto-hébergement, réseau interne) :

```bash
pnpm --filter rexact-mcp build
PORT=3300 pnpm --filter rexact-mcp start:http
```

Le serveur écoute sur `/` (`POST` pour ouvrir une session et envoyer des requêtes, `GET` pour le flux SSE d'une session existante). L'en-tête `mcp-session-id`, renvoyé à l'initialisation, identifie la session sur les requêtes suivantes.

## Développement

```bash
pnpm --filter rexact-mcp dev      # rebuild à chaque changement
pnpm --filter rexact-mcp typecheck
```

## Liens

Page d'accueil, exemples et installation par client : <https://rexact.dev/fr/mcp> (EN : <https://rexact.dev/en/mcp>).
Licence : MIT.
