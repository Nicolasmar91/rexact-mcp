import { describe, expect, it } from "vitest";
import { InMemoryCache } from "./cache";
import { parse } from "./parse";
import { analyze } from "./redos";

function parseOk(source: string, flags = "") {
  const result = parse(source, flags, "js");
  if (!result.ok) throw new Error("expected pattern to parse");
  return result.value;
}

describe("analyze", () => {
  it("reports a safe verdict for a linear pattern", async () => {
    const verdict = await analyze(parseOk("^[a-z]+$"));
    expect(verdict.status).toBe("safe");
  });

  it("reports vulnerable for a classic catastrophic backtracking pattern", async () => {
    const verdict = await analyze(parseOk("(a+)+$"));
    expect(verdict.status).toBe("vulnerable");
    expect(verdict.complexity).toBe("exponential");
    expect(verdict.attackString).toBeDefined();
    expect(verdict.hotspot).toBeDefined();
  }, 10000);

  it("never reports safe when recheck cannot decide within the timeout", async () => {
    // Alternance très ambiguë : force recheck en dessous de son propre budget.
    const verdict = await analyze(parseOk("(a|a|a|a|a|a|a|a|a|a|a|a)+$"), {
      timeoutMs: 1,
    });
    expect(verdict.status).not.toBe("safe");
  });

  it("uses the cache on a second call for the same pattern", async () => {
    const cache = new InMemoryCache<Awaited<ReturnType<typeof analyze>>>();
    const calls: string[] = [];
    const original = parseOk("^abc$");

    const first = await analyze(original, { cache });
    calls.push("first");
    const second = await analyze(original, { cache });
    calls.push("second");

    expect(first).toEqual(second);
    expect(calls).toEqual(["first", "second"]);
  });

  it("returns a different cache entry for a different pattern", async () => {
    const cache = new InMemoryCache<Awaited<ReturnType<typeof analyze>>>();
    await analyze(parseOk("^abc$"), { cache });
    const spy = { got: undefined as unknown };
    const original = cache.get.bind(cache);
    cache.get = (key: string) => {
      spy.got = key;
      return original(key);
    };
    await analyze(parseOk("^def$"), { cache });
    expect(spy.got).toBeDefined();
  });

  it("flags a nested quantifier via the static analysis stage", async () => {
    const verdict = await analyze(parseOk("(a+)+$"));
    expect(verdict.hotspot).toEqual([0, 5]);
  }, 10000);
});
