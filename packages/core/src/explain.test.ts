import { describe, expect, it } from "vitest";
import { explain } from "./explain";
import { parse } from "./parse";

function explainOk(source: string, flags = "") {
  const result = parse(source, flags, "js");
  if (!result.ok) throw new Error("expected pattern to parse");
  return explain(result.value);
}

describe("explain", () => {
  it("gives exact start/end offsets matching the source", () => {
    const tokens = explainOk("a(b)c");
    for (const token of tokens) {
      expect(token.text).toBe("a(b)c".slice(token.start, token.end));
    }
  });

  it("explains ^ as start of string without the m flag", () => {
    const [anchor] = explainOk("^abc");
    expect(anchor?.role).toBe("anchor");
    expect(anchor?.explanation.fr).toBe("début de chaîne");
    expect(anchor?.explanation.en).toBe("start of string");
  });

  it("explains ^ differently when the m flag is active", () => {
    const [anchor] = explainOk("^abc", "m");
    expect(anchor?.explanation.fr).toContain("drapeau m actif");
    expect(anchor?.explanation.en).toContain("m flag");
  });

  it("explains $ the same way, mirrored for end of string", () => {
    const tokens = explainOk("abc$");
    const dollar = tokens.find((t) => t.text === "$");
    expect(dollar?.explanation.fr).toBe("fin de chaîne");
  });

  it("varies the dot explanation with the s flag", () => {
    const withoutS = explainOk(".")[0];
    const withS = explainOk(".", "s")[0];
    expect(withoutS?.explanation.en).not.toBe(withS?.explanation.en);
  });

  it("merges a run of literal characters into one token", () => {
    const tokens = explainOk("hello");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ start: 0, end: 5, text: "hello", role: "literal" });
  });

  it("numbers capturing groups left to right, skipping non-capturing ones", () => {
    const tokens = explainOk("(a)(?:b)(c)");
    const groups = tokens.filter((t) => t.role === "group");
    expect(groups.map((g) => g.text)).toEqual(["(a)", "(?:b)", "(c)"]);
    expect(groups[0]?.explanation.en).toContain("#1");
    expect(groups[2]?.explanation.en).toContain("#2");
  });

  it("explains a named group by name", () => {
    const tokens = explainOk("(?<year>\\d{4})");
    const group = tokens.find((t) => t.role === "group");
    expect(group?.explanation.en).toContain("year");
  });

  it("produces a nested token for the quantifier separate from its element", () => {
    const tokens = explainOk("a+");
    const literal = tokens.find((t) => t.role === "literal");
    const quantifier = tokens.find((t) => t.role === "quantifier");
    expect(literal).toMatchObject({ start: 0, end: 1 });
    expect(quantifier).toMatchObject({ start: 0, end: 2 });
  });

  it("distinguishes greedy from lazy quantifiers", () => {
    const greedy = explainOk("a+").find((t) => t.role === "quantifier");
    const lazy = explainOk("a+?").find((t) => t.role === "quantifier");
    expect(greedy?.explanation.en).not.toContain("lazy");
    expect(lazy?.explanation.en).toContain("lazy");
  });

  it("explains lookahead and lookbehind, positive and negative", () => {
    expect(explainOk("(?=x)")[0]?.role).toBe("lookaround");
    expect(explainOk("(?!x)")[0]?.explanation.en).toContain("NOT");
    expect(explainOk("(?<=x)")[0]?.explanation.en).not.toContain("NOT");
    expect(explainOk("(?<!x)")[0]?.explanation.en).toContain("NOT");
  });

  it("explains a backreference by group number", () => {
    const tokens = explainOk("(a)\\1");
    const backref = tokens.find((t) => t.role === "backreference");
    expect(backref?.text).toBe("\\1");
    expect(backref?.explanation.en).toContain("#1");
  });

  it("explains an alternation as a distinct token between branches", () => {
    const tokens = explainOk("cat|dog");
    const bar = tokens.find((t) => t.role === "alternation");
    expect(bar).toMatchObject({ start: 3, end: 4, text: "|" });
  });

  it("explains a character class as one token, not per character", () => {
    const tokens = explainOk("[a-z0-9]");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ role: "charClass", text: "[a-z0-9]" });
  });

  it("explains word boundaries, positive and negative", () => {
    const boundary = explainOk("\\bfoo\\B").find((t) => t.text === "\\b");
    const notBoundary = explainOk("\\bfoo\\B").find((t) => t.text === "\\B");
    expect(boundary?.explanation.en).toBe(
      "word boundary (transition between a word character and another)",
    );
    expect(notBoundary?.explanation.en).toBe("not a word boundary");
  });

  it("explains the digit/word/space shorthand classes and their negations", () => {
    const tokens = explainOk("\\d\\D\\w\\W\\s\\S");
    const [d, notD, w, notW, s, notS] = tokens;
    expect(d?.explanation.en).toBe("a digit (0-9)");
    expect(notD?.explanation.en).toBe("anything but a digit");
    expect(w?.explanation.en).toBe("a word character (letter, digit or _)");
    expect(notW?.explanation.en).toBe("anything but a word character");
    expect(s?.explanation.en).toBe("whitespace (space, tab, line break…)");
    expect(notS?.explanation.en).toBe("anything but whitespace");
  });

  it("explains a unicode property escape, with and without a value", () => {
    const shorthand = explainOk("\\p{L}", "u")[0];
    const keyValue = explainOk("\\p{Script=Greek}", "u")[0];
    expect(shorthand?.explanation.en).toContain("General_Category=L");
    expect(keyValue?.explanation.en).toContain("Script=Greek");
  });

  it("explains {n,} and {n,m} quantifiers distinctly from + and ?", () => {
    const atLeastTwo = explainOk("a{2,}").find((t) => t.role === "quantifier");
    const between = explainOk("a{2,4}").find((t) => t.role === "quantifier");
    const optional = explainOk("a?").find((t) => t.role === "quantifier");
    expect(atLeastTwo?.explanation.en).toBe("2 times or more");
    expect(between?.explanation.en).toBe("between 2 and 4 times");
    expect(optional?.explanation.en).toContain("optional");
  });

  it("handles an emoji in the source without throwing and keeps correct offsets", () => {
    const source = "a😀b";
    const tokens = explainOk(source);
    expect(tokens[0]?.text).toBe(source);
  });
});
