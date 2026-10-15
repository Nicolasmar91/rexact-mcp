import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnthropicProvider } from "./anthropic-provider";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const SUCCESS_BODY = {
  content: [{ type: "text", text: "hello" }],
  usage: { input_tokens: 12, output_tokens: 34 },
};

describe("AnthropicProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns the text block and usage on a successful call", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SUCCESS_BODY));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new AnthropicProvider("sk-test");
    const result = await provider.generate("system", "user");

    expect(result).toEqual({ text: "hello", usage: { inputTokens: 12, outputTokens: 34 } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends the API key and the system/user messages in the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SUCCESS_BODY));
    vi.stubGlobal("fetch", fetchMock);

    await new AnthropicProvider("sk-test").generate("sys-prompt", "user-msg");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("sk-test");
    const body = JSON.parse(init.body as string) as { system: string; messages: unknown[] };
    expect(body.system).toBe("sys-prompt");
    expect(body.messages).toEqual([{ role: "user", content: "user-msg" }]);
  });

  it("retries after a transient failure and succeeds on the second attempt", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValueOnce(jsonResponse(SUCCESS_BODY));
    vi.stubGlobal("fetch", fetchMock);

    const promise = new AnthropicProvider("sk-test").generate("system", "user");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.text).toBe("hello");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws the last error after exhausting all retries", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("persistent failure"));
    vi.stubGlobal("fetch", fetchMock);

    const promise = new AnthropicProvider("sk-test").generate("system", "user");
    const expectation = expect(promise).rejects.toThrow("persistent failure");
    await vi.runAllTimersAsync();
    await expectation;

    // NETWORK_RETRIES = 2 → 3 tentatives au total (1 initiale + 2 reprises).
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("treats a non-2xx response as a failure worth retrying, not a thrown network error", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse(SUCCESS_BODY));
    vi.stubGlobal("fetch", fetchMock);

    const promise = new AnthropicProvider("sk-test").generate("system", "user");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.text).toBe("hello");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws when the response has no text content block", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        content: [{ type: "tool_use" }],
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const promise = new AnthropicProvider("sk-test").generate("system", "user");
    const expectation = expect(promise).rejects.toThrow();
    await vi.runAllTimersAsync();
    await expectation;
  });
});
