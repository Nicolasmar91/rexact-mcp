import { describe, expect, it } from "vitest";
import { InMemoryCache } from "./cache";

describe("InMemoryCache", () => {
  it("returns undefined for a missing key", () => {
    const cache = new InMemoryCache<number>();
    expect(cache.get("missing")).toBeUndefined();
  });

  it("stores and retrieves a value", () => {
    const cache = new InMemoryCache<number>();
    cache.set("k", 42);
    expect(cache.get("k")).toBe(42);
  });
});
