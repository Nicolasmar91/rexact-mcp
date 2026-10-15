import { describe, expect, it } from "vitest";
import { parseLlmOutput } from "./output-schema";

describe("parseLlmOutput", () => {
  it("parses a clean, well-formed JSON object", () => {
    const raw = '{"pattern":"^\\\\d+$","flags":"","notes":null,"error":null}';
    const result = parseLlmOutput(raw);
    expect(result).toEqual({ pattern: "^\\d+$", flags: "", notes: null, error: null });
  });

  it("trims surrounding whitespace before parsing", () => {
    const raw = '\n  {"pattern":"a","flags":"","notes":null,"error":null}  \n';
    expect(parseLlmOutput(raw)?.pattern).toBe("a");
  });

  it("extracts a JSON object wrapped in markdown code fences", () => {
    const raw = '```json\n{"pattern":"a","flags":"","notes":null,"error":null}\n```';
    expect(parseLlmOutput(raw)?.pattern).toBe("a");
  });

  it("extracts a JSON object preceded and followed by prose", () => {
    const raw =
      'Here is the pattern: {"pattern":"a","flags":"g","notes":null,"error":null} — hope this helps!';
    const result = parseLlmOutput(raw);
    expect(result).toEqual({ pattern: "a", flags: "g", notes: null, error: null });
  });

  it("returns null for text with no JSON object at all", () => {
    expect(parseLlmOutput("I cannot help with that.")).toBeNull();
  });

  it("returns null for a JSON object that does not satisfy the schema", () => {
    expect(parseLlmOutput('{"pattern": 123}')).toBeNull();
  });

  it("returns null for completely invalid JSON, without throwing", () => {
    expect(() => parseLlmOutput("{not json")).not.toThrow();
    expect(parseLlmOutput("{not json")).toBeNull();
  });

  it("accepts the documented out_of_scope shape", () => {
    const raw = '{"pattern":null,"flags":"","notes":null,"error":"out_of_scope"}';
    expect(parseLlmOutput(raw)).toEqual({
      pattern: null,
      flags: "",
      notes: null,
      error: "out_of_scope",
    });
  });

  it("rejects a pattern over 2000 characters", () => {
    const raw = JSON.stringify({ pattern: "a".repeat(2001), flags: "", notes: null, error: null });
    expect(parseLlmOutput(raw)).toBeNull();
  });

  it("rejects an error value other than the literal out_of_scope", () => {
    const raw = JSON.stringify({ pattern: "a", flags: "", notes: null, error: "something_else" });
    expect(parseLlmOutput(raw)).toBeNull();
  });
});
