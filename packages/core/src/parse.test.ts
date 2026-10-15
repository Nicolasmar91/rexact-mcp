import { describe, expect, it } from "vitest";
import { parse } from "./parse";

describe("parse", () => {
  it("parses a simple pattern", () => {
    const result = parse("a(b)c", "", "js");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.flavor).toBe("js");
      expect(result.value.featureSet).toEqual([]);
    }
  });

  it("detects named groups", () => {
    const result = parse("(?<year>\\d{4})", "", "js");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.featureSet).toContain("namedGroup");
  });

  it("detects lookahead and lookbehind", () => {
    const lookahead = parse("foo(?=bar)", "", "js");
    expect(lookahead.ok).toBe(true);
    if (lookahead.ok) expect(lookahead.value.featureSet).toContain("lookahead");

    const lookbehind = parse("(?<=foo)bar", "", "js");
    expect(lookbehind.ok).toBe(true);
    if (lookbehind.ok) expect(lookbehind.value.featureSet).toContain("lookbehind");

    const negLookbehind = parse("(?<!foo)bar", "", "js");
    expect(negLookbehind.ok).toBe(true);
    if (negLookbehind.ok) expect(negLookbehind.value.featureSet).toContain("negLookbehind");
  });

  it("detects backreferences", () => {
    const result = parse("(a)\\1", "", "js");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.featureSet).toContain("backreference");
  });

  it("detects lazy quantifiers", () => {
    const result = parse("a+?", "", "js");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.featureSet).toContain("lazyQuantifier");
  });

  it("detects nested quantifiers", () => {
    const result = parse("(a+)+", "", "js");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.featureSet).toContain("nestedQuantifier");
  });

  it("does not flag a non-nested quantifier", () => {
    const result = parse("(abc)+", "", "js");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.featureSet).not.toContain("nestedQuantifier");
  });

  it("detects the digit shorthand class (\\d/\\D), used by the ASCII/Unicode compat rule", () => {
    const result = parse("\\d\\D", "", "js");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.featureSet).toContain("digitDefault");
  });

  it("detects unicode property escapes under the u flag", () => {
    const result = parse("\\p{L}+", "u", "js");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.featureSet).toContain("unicodeProperty");
  });

  it("treats \\p as a literal escape without the u flag", () => {
    const result = parse("\\p{L}+", "", "js");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.featureSet).not.toContain("unicodeProperty");
  });

  it("parses nested character classes under the v flag", () => {
    const result = parse("[[a-z]&&[^aeiou]]", "v", "js");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.featureSet).toContain("unicodeSets");
    }
  });

  it("rejects the u/v flag combination", () => {
    const result = parse("abc", "uv", "js");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("parse");
  });

  it("rejects duplicated or unknown flags", () => {
    const duplicated = parse("abc", "gg", "js");
    expect(duplicated.ok).toBe(false);

    const unknown = parse("abc", "z", "js");
    expect(unknown.ok).toBe(false);
  });

  it("rejects inline flags with a flavor-oriented message", () => {
    const result = parse("(?i)abc", "", "python");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("parse");
      expect(result.error.message.fr).toContain("python");
      expect(result.error.message.fr).toContain("(?i)");
      expect(result.error.message.en).toContain("python");
      expect(result.error.message.en).toContain("(?i)");
    }
  });

  it("rejects an unterminated group without throwing", () => {
    const result = parse("(abc", "", "js");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("parse");
  });

  it("rejects a pattern longer than 2000 characters", () => {
    const result = parse("a".repeat(2001), "", "js");
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === "parse") {
      expect(result.error.index).toBe(2000);
    }
  });

  it("never throws on malformed input", () => {
    const inputs = ["(", ")", "[", "\\", "(?<", "(?P<name>x)", "**", "{2,1}"];
    for (const input of inputs) {
      expect(() => parse(input, "", "js")).not.toThrow();
    }
  });
});
