import type { AST } from "@eslint-community/regexpp";
import type { ExplainKey } from "./explain-key";
import { explainEn } from "./explanations.en";
import { explainFr } from "./explanations.fr";
import type { ExplainToken, ParsedPattern } from "./types";

interface WalkContext {
  multiline: boolean;
  dotAll: boolean;
  groupIndex: { value: number };
}

function emit(
  tokens: ExplainToken[],
  source: string,
  start: number,
  end: number,
  role: string,
  depth: number,
  key: ExplainKey,
): void {
  tokens.push({
    start,
    end,
    text: source.slice(start, end),
    role,
    depth,
    explanation: { fr: explainFr(key), en: explainEn(key) },
  });
}

function walkCharacterSet(
  el: AST.CharacterSet,
  source: string,
  depth: number,
  tokens: ExplainToken[],
  ctx: WalkContext,
): void {
  let key: ExplainKey;
  switch (el.kind) {
    case "any":
      key = { kind: "dot", dotAll: ctx.dotAll };
      break;
    case "digit":
      key = { kind: "digitClass", negate: el.negate };
      break;
    case "word":
      key = { kind: "wordCharClass", negate: el.negate };
      break;
    case "space":
      key = { kind: "spaceClass", negate: el.negate };
      break;
    case "property":
      key = { kind: "unicodeProperty", key: el.key, value: el.value ?? null, negate: el.negate };
      break;
  }
  emit(tokens, source, el.start, el.end, "charClass", depth, key);
}

function walkElement(
  el: AST.Element,
  source: string,
  depth: number,
  tokens: ExplainToken[],
  ctx: WalkContext,
): void {
  switch (el.type) {
    case "Character":
      emit(tokens, source, el.start, el.end, "literal", depth, { kind: "literal", text: el.raw });
      return;
    case "Assertion":
      if (el.kind === "start") {
        emit(tokens, source, el.start, el.end, "anchor", depth, {
          kind: "anchorStart",
          multiline: ctx.multiline,
        });
      } else if (el.kind === "end") {
        emit(tokens, source, el.start, el.end, "anchor", depth, {
          kind: "anchorEnd",
          multiline: ctx.multiline,
        });
      } else if (el.kind === "word") {
        emit(tokens, source, el.start, el.end, "anchor", depth, {
          kind: "wordBoundary",
          negate: el.negate,
        });
      } else if (el.kind === "lookahead") {
        emit(tokens, source, el.start, el.end, "lookaround", depth, {
          kind: "lookahead",
          negate: el.negate,
        });
        walkAlternatives(el.alternatives, source, depth + 1, tokens, ctx);
      } else if (el.kind === "lookbehind") {
        emit(tokens, source, el.start, el.end, "lookaround", depth, {
          kind: "lookbehind",
          negate: el.negate,
        });
        walkAlternatives(el.alternatives, source, depth + 1, tokens, ctx);
      }
      return;
    case "CharacterSet":
      walkCharacterSet(el, source, depth, tokens, ctx);
      return;
    case "CharacterClass":
      emit(tokens, source, el.start, el.end, "charClass", depth, {
        kind: "characterClass",
        raw: el.raw,
        negate: el.negate,
      });
      return;
    case "Backreference":
      emit(tokens, source, el.start, el.end, "backreference", depth, {
        kind: "backreference",
        ref: el.ref,
      });
      return;
    case "CapturingGroup":
      ctx.groupIndex.value += 1;
      emit(tokens, source, el.start, el.end, "group", depth, {
        kind: "group",
        capturing: true,
        name: el.name,
        index: ctx.groupIndex.value,
      });
      walkAlternatives(el.alternatives, source, depth + 1, tokens, ctx);
      return;
    case "Group":
      emit(tokens, source, el.start, el.end, "group", depth, {
        kind: "group",
        capturing: false,
        name: null,
        index: null,
      });
      walkAlternatives(el.alternatives, source, depth + 1, tokens, ctx);
      return;
    case "Quantifier":
      emit(tokens, source, el.start, el.end, "quantifier", depth, {
        kind: "quantifier",
        min: el.min,
        max: el.max,
        greedy: el.greedy,
      });
      walkElement(el.element, source, depth + 1, tokens, ctx);
      return;
  }
}

function walkElements(
  elements: AST.Element[],
  source: string,
  depth: number,
  tokens: ExplainToken[],
  ctx: WalkContext,
): void {
  let i = 0;
  while (i < elements.length) {
    const first = elements[i];
    if (first === undefined) break;
    if (first.type === "Character") {
      let j = i + 1;
      while (elements[j]?.type === "Character") j += 1;
      const last = elements[j - 1] as AST.Character;
      emit(tokens, source, first.start, last.end, "literal", depth, {
        kind: "literal",
        text: source.slice(first.start, last.end),
      });
      i = j;
    } else {
      walkElement(first, source, depth, tokens, ctx);
      i += 1;
    }
  }
}

function walkAlternatives(
  alternatives: AST.Alternative[],
  source: string,
  depth: number,
  tokens: ExplainToken[],
  ctx: WalkContext,
): void {
  alternatives.forEach((alternative, i) => {
    walkElements(alternative.elements, source, depth, tokens, ctx);
    const next = alternatives[i + 1];
    if (next) {
      emit(tokens, source, alternative.end, next.start, "alternation", depth, {
        kind: "alternation",
      });
    }
  });
}

export function explain(parsed: ParsedPattern): ExplainToken[] {
  const tokens: ExplainToken[] = [];
  const ctx: WalkContext = {
    multiline: parsed.flags.includes("m"),
    dotAll: parsed.flags.includes("s"),
    groupIndex: { value: 0 },
  };

  // `ast` est typé `unknown` dans l'API publique (types.ts) : ce module est
  // l'un des rares à savoir qu'il s'agit en réalité d'un AST regexpp.
  const pattern = parsed.ast as AST.Pattern;
  walkAlternatives(pattern.alternatives, parsed.source, 0, tokens, ctx);

  tokens.sort((a, b) => a.start - b.start || b.end - a.end);
  return tokens;
}
