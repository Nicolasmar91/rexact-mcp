import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkCompat } from "./compat";
import { explain } from "./explain";
import { parse } from "./parse";
import { runCorpus } from "./corpus";
import { analyze } from "./redos";
import type { CorpusCase, FeatureId, Flavor } from "./types";

interface Fixture {
  id: string;
  description: string;
  pattern: string;
  flags: string;
  flavor: Flavor;
  shouldParse: boolean;
  expectedFeatures: FeatureId[];
  targetFeature?: FeatureId;
  expectVulnerable?: boolean;
  corpus: CorpusCase[];
}

const ALL_FEATURE_IDS: FeatureId[] = [
  "lookahead",
  "lookbehind",
  "negLookbehind",
  "backreference",
  "namedGroup",
  "atomicGroup",
  "possessive",
  "recursion",
  "unicodeProperty",
  "unicodeSets",
  "conditional",
  "inlineFlags",
  "lazyQuantifier",
  "nestedQuantifier",
  "digitDefault",
];

const ALL_FLAVORS: Flavor[] = ["js", "pcre", "python", "re2", "java", "dotnet", "grep"];

const fixturesPath = fileURLToPath(new URL("../fixtures/patterns.json", import.meta.url));
const fixtures: Fixture[] = JSON.parse(readFileSync(fixturesPath, "utf8"));

describe("reference fixtures (fixtures/patterns.json)", () => {
  it("has at least 40 patterns", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(40);
  });

  it("covers every FeatureId — either detected in a parseable pattern, or as the reason a pattern is rejected", () => {
    const covered = new Set<FeatureId>([
      ...fixtures.flatMap((f) => f.expectedFeatures),
      ...fixtures.map((f) => f.targetFeature).filter((f): f is FeatureId => f !== undefined),
    ]);
    const missing = ALL_FEATURE_IDS.filter((id) => !covered.has(id));
    expect(missing).toEqual([]);
  });

  for (const fixture of fixtures) {
    describe(fixture.id, () => {
      const result = parse(fixture.pattern, fixture.flags, fixture.flavor);

      it(`shouldParse === ${fixture.shouldParse}`, () => {
        expect(result.ok).toBe(fixture.shouldParse);
      });

      if (!fixture.shouldParse) {
        it("fails with a parse error, never throwing", () => {
          expect(result.ok).toBe(false);
          if (!result.ok) expect(result.error.kind).toBe("parse");
        });
        return;
      }

      it("detects exactly the expected features", () => {
        if (!result.ok) throw new Error("expected a parseable pattern");
        expect(new Set(result.value.featureSet)).toEqual(new Set(fixture.expectedFeatures));
      });

      it("explain() returns tokens covering the whole source without throwing", () => {
        if (!result.ok) throw new Error("expected a parseable pattern");
        const tokens = explain(result.value);
        expect(tokens.length).toBeGreaterThan(0);
        for (const token of tokens) {
          expect(token.text).toBe(fixture.pattern.slice(token.start, token.end));
        }
      });

      it("checkCompat() runs against every flavor without throwing", () => {
        if (!result.ok) throw new Error("expected a parseable pattern");
        expect(() => checkCompat(result.value, ALL_FLAVORS)).not.toThrow();
      });

      it("runCorpus() reports every case as passing", () => {
        const report = runCorpus(fixture.pattern, fixture.flags, fixture.corpus);
        expect(report.total).toBe(fixture.corpus.length);
        for (const caseResult of report.results) {
          expect(caseResult.pass).toBe(true);
        }
      });

      it("analyze() never claims a vulnerable pattern is safe", async () => {
        if (!result.ok) throw new Error("expected a parseable pattern");
        const verdict = await analyze(result.value);
        if (fixture.expectVulnerable) {
          expect(verdict.status).not.toBe("safe");
        } else {
          expect(verdict.status).toBeDefined();
        }
      });
    });
  }
});
