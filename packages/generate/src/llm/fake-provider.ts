import type { LlmGenerateResult, LlmProvider } from "./types";

// Déterministe, utilisé par tous les tests (§3.3 : "Aucun test ne doit
// appeler le réseau"). Rejoue `responses` dans l'ordre, un appel = une
// réponse ; répète la dernière si appelé plus de fois que prévu.
export class FakeProvider implements LlmProvider {
  private callCount = 0;
  readonly calls: Array<{ systemPrompt: string; userMessage: string }> = [];

  constructor(private readonly responses: string[]) {}

  async generate(systemPrompt: string, userMessage: string): Promise<LlmGenerateResult> {
    this.calls.push({ systemPrompt, userMessage });
    const text = this.responses[this.callCount] ?? this.responses.at(-1) ?? "";
    this.callCount += 1;
    // Coût nul dans les tests : ce fournisseur n'appelle jamais de vraie API.
    return { text, usage: { inputTokens: 0, outputTokens: 0 } };
  }
}
