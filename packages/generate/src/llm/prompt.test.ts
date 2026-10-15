import { describe, expect, it } from "vitest";
import { buildUserMessage, type GenerateContext } from "./prompt";

const CONTEXT: GenerateContext = {
  description: "a french phone number",
  flavor: "js",
  cases: [
    { text: "0612345678", shouldMatch: true },
    { text: "abc", shouldMatch: false },
  ],
};

describe("buildUserMessage", () => {
  it("includes the description, flavor and every case with its expectation", () => {
    const message = buildUserMessage(CONTEXT);
    expect(message).toContain("a french phone number");
    expect(message).toContain("js");
    expect(message).toContain('doit matcher : "0612345678"');
    expect(message).toContain('ne doit pas matcher : "abc"');
  });

  it("appends nothing extra when there is no correction", () => {
    const message = buildUserMessage(CONTEXT);
    expect(message).not.toContain("a échoué");
    expect(message).not.toContain("ReDoS");
  });

  it("appends the failing cases and the pattern that produced them", () => {
    const message = buildUserMessage(CONTEXT, {
      kind: "failedCases",
      pattern: "^\\d+$",
      failures: [{ text: "0612345678", shouldMatch: true, matched: false }],
    });
    expect(message).toContain("^\\d+$");
    expect(message).toContain("a échoué sur");
    expect(message).toContain('"0612345678" (devait matcher, n\'a pas matché)');
  });

  it("mentions the attack string when a ReDoS correction includes one", () => {
    const message = buildUserMessage(CONTEXT, {
      kind: "redosVulnerable",
      pattern: "^(a+)+$",
      attackString: "aaaaaaaaaaaaaaaa!",
    });
    expect(message).toContain("^(a+)+$");
    expect(message).toContain("aaaaaaaaaaaaaaaa!");
  });

  it("omits the attack-string clause when a ReDoS correction has none", () => {
    const message = buildUserMessage(CONTEXT, { kind: "redosVulnerable", pattern: "^(a+)+$" });
    expect(message).toContain("^(a+)+$");
    expect(message).not.toContain("sur une entrée comme");
  });

  it("asks for a plain JSON retry on invalidOutput", () => {
    const message = buildUserMessage(CONTEXT, { kind: "invalidOutput" });
    expect(message).toContain("n'était pas un JSON valide");
  });
});
