export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmGenerateResult {
  text: string;
  usage: LlmUsage;
}

// Fournisseur isolé derrière cette interface (§3.3) : FakeProvider pour tous
// les tests (aucun appel réseau), AnthropicProvider pour la production.
export interface LlmProvider {
  generate(systemPrompt: string, userMessage: string): Promise<LlmGenerateResult>;
}
