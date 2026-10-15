import { describe, expect, it } from "vitest";
import { checkCompat } from "./compat";
import { compatTable } from "./compat-table";
import { parse } from "./parse";
import type { Flavor } from "./types";

const ALL_FLAVORS: Flavor[] = ["js", "pcre", "python", "re2", "java", "dotnet", "grep"];

function parseOk(source: string, flags = "") {
  const result = parse(source, flags, "js");
  if (!result.ok) throw new Error("expected pattern to parse");
  return result.value;
}

describe("compat-table", () => {
  it("has a cell for every FeatureId × Flavor combination", () => {
    for (const row of Object.values(compatTable)) {
      for (const flavor of ALL_FLAVORS) {
        expect(row[flavor]).toBeDefined();
        expect(row[flavor].message.fr.length).toBeGreaterThan(0);
        expect(row[flavor].message.en.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("checkCompat", () => {
  it("returns nothing for a pattern with no tracked feature", () => {
    const issues = checkCompat(parseOk("abc"), ALL_FLAVORS);
    expect(issues).toEqual([]);
  });

  it("flags lookahead as unsupported on re2 and grep, ok elsewhere", () => {
    const issues = checkCompat(parseOk("foo(?=bar)"), ALL_FLAVORS);
    const byFlavor = Object.fromEntries(issues.map((i) => [i.flavor, i]));
    expect(byFlavor.re2?.level).toBe("unsupported");
    expect(byFlavor.grep?.level).toBe("unsupported");
    expect(byFlavor.js?.level).toBe("ok");
    expect(byFlavor.pcre?.level).toBe("ok");
    expect(byFlavor.python?.level).toBe("ok");
    expect(byFlavor.java?.level).toBe("ok");
    expect(byFlavor.dotnet?.level).toBe("ok");
  });

  it("positions the issue at the feature's exact location", () => {
    const issues = checkCompat(parseOk("foo(?=bar)"), ["re2"]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ at: [3, 10], feature: "lookahead" });
  });

  it("flags a named group as different on python/re2, with a rewrite suggestion", () => {
    const issues = checkCompat(parseOk("(?<year>\\d{4})"), ["python", "re2", "js"]);
    const python = issues.find((i) => i.flavor === "python" && i.feature === "namedGroup");
    const js = issues.find((i) => i.flavor === "js" && i.feature === "namedGroup");
    expect(python?.level).toBe("different");
    expect(python?.suggestion).toBe("(?P<name>…)");
    expect(js?.level).toBe("ok");
  });

  it("flags \\d as a Unicode/ASCII difference on python and dotnet, with a [0-9] suggestion", () => {
    const issues = checkCompat(parseOk("\\d+"), ["python", "dotnet", "js", "re2"]);
    const byFlavor = Object.fromEntries(
      issues.filter((i) => i.feature === "digitDefault").map((i) => [i.flavor, i]),
    );
    expect(byFlavor.python).toMatchObject({ level: "different", suggestion: "[0-9]" });
    expect(byFlavor.dotnet).toMatchObject({ level: "different", suggestion: "[0-9]" });
    expect(byFlavor.js).toMatchObject({ level: "ok" });
    expect(byFlavor.re2).toMatchObject({ level: "ok" });
  });

  it("emits one issue per occurrence, not deduplicated by feature", () => {
    const issues = checkCompat(parseOk("(?=a)(?=b)"), ["re2"]);
    expect(issues).toHaveLength(2);
  });

  it("returns one issue per target flavor requested", () => {
    const issues = checkCompat(parseOk("(?=a)"), ["re2", "grep"]);
    expect(issues).toHaveLength(2);
    expect(issues.map((i) => i.flavor).sort()).toEqual(["grep", "re2"]);
  });

  it("flags backreferences as unsupported on re2 and grep (ERE)", () => {
    const issues = checkCompat(parseOk("(a)\\1"), ALL_FLAVORS);
    const byFlavor = Object.fromEntries(
      issues.filter((i) => i.feature === "backreference").map((i) => [i.flavor, i]),
    );
    expect(byFlavor.re2?.level).toBe("unsupported");
    expect(byFlavor.grep?.level).toBe("unsupported");
  });
});
