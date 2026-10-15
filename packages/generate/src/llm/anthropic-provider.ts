import type { LlmGenerateResult, LlmProvider } from "./types";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 800;
const TEMPERATURE = 0;
const HARD_TIMEOUT_MS = 12_000;
const NETWORK_RETRIES = 2;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
  usage: { input_tokens: number; output_tokens: number };
}

export class AnthropicProvider implements LlmProvider {
  constructor(private readonly apiKey: string) {}

  async generate(systemPrompt: string, userMessage: string): Promise<LlmGenerateResult> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= NETWORK_RETRIES; attempt += 1) {
      if (attempt > 0) {
        // Backoff exponentiel : 500ms, 1000ms…
        await sleep(500 * 2 ** (attempt - 1));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HARD_TIMEOUT_MS);

      try {
        const response = await fetch(ANTHROPIC_API_URL, {
          method: "POST",
          headers: {
            "x-api-key": this.apiKey,
            "anthropic-version": ANTHROPIC_VERSION,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            temperature: TEMPERATURE,
            system: systemPrompt,
            messages: [{ role: "user", content: userMessage }],
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Anthropic API a répondu ${response.status}`);
        }

        const data = (await response.json()) as AnthropicResponse;
        const text = data.content.find((block) => block.type === "text")?.text;
        if (text === undefined) throw new Error("Réponse Anthropic sans bloc texte.");
        return {
          text,
          usage: {
            inputTokens: data.usage.input_tokens,
            outputTokens: data.usage.output_tokens,
          },
        };
      } catch (error) {
        lastError = error;
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Appel Anthropic échoué.");
  }
}
