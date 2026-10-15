import { describe, expect, it } from "vitest";
import type { AST } from "@eslint-community/regexpp";
import { analyzeStaticRedos, findStaticHotspots } from "./redos-static";
import { parse } from "./parse";

function hotspots(source: string) {
  const result = parse(source, "", "js");
  if (!result.ok) throw new Error("expected pattern to parse");
  return findStaticHotspots(result.value.ast as AST.Pattern, source);
}

describe("analyzeStaticRedos", () => {
  it("wraps findStaticHotspots for the public ParsedPattern API", () => {
    const result = parse("(a+)+", "", "js");
    if (!result.ok) throw new Error("expected pattern to parse");
    expect(analyzeStaticRedos(result.value).some((h) => h.reason === "nestedQuantifier")).toBe(
      true,
    );
  });
});

describe("findStaticHotspots", () => {
  it("flags a nested quantifier (a+)+", () => {
    const found = hotspots("(a+)+");
    expect(found.some((h) => h.reason === "nestedQuantifier")).toBe(true);
  });

  it("does not flag a non-nested quantifier", () => {
    const found = hotspots("(abc)+");
    expect(found).toHaveLength(0);
  });

  it("flags an overlapping alternation under a quantifier (a|a)*", () => {
    const found = hotspots("(a|a)*");
    expect(found.some((h) => h.reason === "overlappingAlternation")).toBe(true);
  });

  it("does not flag a non-overlapping alternation (a|b)*", () => {
    const found = hotspots("(a|b)*");
    expect(found.some((h) => h.reason === "overlappingAlternation")).toBe(false);
  });

  it("flags adjacent ambiguous quantifiers a*a*", () => {
    const found = hotspots("a*a*");
    expect(found.some((h) => h.reason === "adjacentQuantifiers")).toBe(true);
  });

  it("flags adjacent ambiguous quantifiers over the same character class, \\d+\\d*", () => {
    const found = hotspots("\\d+\\d*");
    expect(found.some((h) => h.reason === "adjacentQuantifiers")).toBe(true);
  });

  it("does not flag adjacent quantifiers over different units, a*b*", () => {
    const found = hotspots("a*b*");
    expect(found.some((h) => h.reason === "adjacentQuantifiers")).toBe(false);
  });

  it("does not flag a bounded quantifier as adjacent-ambiguous", () => {
    const found = hotspots("a{1,3}a{1,3}");
    expect(found.some((h) => h.reason === "adjacentQuantifiers")).toBe(false);
  });
});
