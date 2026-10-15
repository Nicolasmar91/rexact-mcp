import type { CorpusCase } from "@rexact/core";
import { z } from "zod";

// Miroir des types de @rexact/core (types.ts), en schémas Zod pour la
// validation d'entrée/sortie des outils MCP (I5 : toute frontière est
// validée par Zod).
export const FlavorSchema = z.enum(["js", "pcre", "python", "re2", "java", "dotnet", "grep"]);

export const CorpusCaseSchema = z.object({
  text: z.string().max(2000),
  shouldMatch: z.boolean(),
  note: z.string().optional(),
});

// Le `.optional()` de Zod infère `note?: string | undefined` (peut être
// littéralement `undefined`), incompatible sous `exactOptionalPropertyTypes`
// avec le `note?: string` de CorpusCase (absent, jamais explicitement
// `undefined`). D'où ce mappage explicite plutôt qu'un passage direct.
export function toCorpusCase(input: z.infer<typeof CorpusCaseSchema>): CorpusCase {
  return {
    text: input.text,
    shouldMatch: input.shouldMatch,
    ...(input.note !== undefined ? { note: input.note } : {}),
  };
}

export const CaseResultSchema = z.object({
  case: CorpusCaseSchema,
  matched: z.boolean(),
  pass: z.boolean(),
  ranges: z.array(z.tuple([z.number(), z.number()])),
  groups: z.array(z.object({ name: z.string().optional(), start: z.number(), end: z.number() })),
  timedOut: z.boolean(),
});

export const CorpusReportSchema = z.object({
  passed: z.number(),
  total: z.number(),
  results: z.array(CaseResultSchema),
  durationMs: z.number(),
});

export const RedosVerdictSchema = z.object({
  status: z.enum(["safe", "vulnerable", "unknown", "timeout"]),
  complexity: z.enum(["linear", "polynomial", "exponential"]).optional(),
  attackString: z.string().optional(),
  maxSteps: z.number().optional(),
  hotspot: z.tuple([z.number(), z.number()]).optional(),
});

export const LocalizedMessageSchema = z.object({ fr: z.string(), en: z.string() });

export const ExplainTokenSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
  role: z.string(),
  depth: z.number(),
  explanation: LocalizedMessageSchema,
});

export const CompatIssueSchema = z.object({
  flavor: FlavorSchema,
  level: z.enum(["ok", "different", "unsupported"]),
  feature: z.string(),
  at: z.tuple([z.number(), z.number()]),
  message: LocalizedMessageSchema,
  suggestion: z.string().optional(),
});
