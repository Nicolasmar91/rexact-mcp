import { analyzeStaticRedos, explain, parse } from "@rexact/core";
import type { CorpusCase, CorpusReport, ExplainToken, Flavor, RedosVerdict } from "@rexact/core";
import { analyze } from "@rexact/core/redos";
import type { Correction } from "./llm/prompt";
import { buildUserMessage, SYSTEM_PROMPT } from "./llm/prompt";
import { parseLlmOutput } from "./llm/output-schema";
import type { LlmProvider, LlmUsage } from "./llm/types";

const MAX_ATTEMPTS = 3;

export interface GenerateLoopInput {
  description: string;
  flavor: Flavor;
  cases: CorpusCase[];
}

export interface GenerateLoopSuccess {
  pattern: string;
  flags: string;
  flavor: Flavor;
  report: CorpusReport;
  redos: RedosVerdict;
  explanation: ExplainToken[];
  attempts: number;
}

export type GenerateLoopError = { kind: "out_of_scope" } | { kind: "invalid_output" };

export type GenerateLoopResult = (
  { ok: true; value: GenerateLoopSuccess } | { ok: false; error: GenerateLoopError }
) & { usage: LlmUsage };

export interface GenerateLoopDeps {
  provider: LlmProvider;
  // Exception encadrée à I2 (§3.1) : injecté pour que ce module reste
  // testable sans jamais dépendre de worker_threads dans les tests unitaires.
  runCorpusSandboxed: (
    pattern: string,
    flags: string,
    cases: CorpusCase[],
  ) => Promise<CorpusReport | null>;
}

interface CompilingAttempt {
  pattern: string;
  flags: string;
  report: CorpusReport;
  redos: RedosVerdict;
}

function isBetter(candidate: CompilingAttempt, current: CompilingAttempt): boolean {
  if (candidate.report.passed !== current.report.passed) {
    return candidate.report.passed > current.report.passed;
  }
  const candidateSafe = candidate.redos.status !== "vulnerable";
  const currentSafe = current.redos.status !== "vulnerable";
  return candidateSafe && !currentSafe;
}

export async function runGenerateLoop(
  input: GenerateLoopInput,
  deps: GenerateLoopDeps,
): Promise<GenerateLoopResult> {
  let correction: Correction | undefined;
  let best: CompilingAttempt | null = null;
  let attempts = 0;
  const usage: LlmUsage = { inputTokens: 0, outputTokens: 0 };

  while (attempts < MAX_ATTEMPTS) {
    attempts += 1;
    const userMessage = buildUserMessage(input, correction);
    const { text: raw, usage: callUsage } = await deps.provider.generate(
      SYSTEM_PROMPT,
      userMessage,
    );
    usage.inputTokens += callUsage.inputTokens;
    usage.outputTokens += callUsage.outputTokens;
    const output = parseLlmOutput(raw);

    if (!output) {
      correction = { kind: "invalidOutput" };
      continue;
    }

    if (output.error === "out_of_scope") {
      return { ok: false, error: { kind: "out_of_scope" }, usage };
    }

    if (!output.pattern) {
      correction = { kind: "invalidOutput" };
      continue;
    }

    const parsed = parse(output.pattern, output.flags, input.flavor);
    if (!parsed.ok) {
      correction = { kind: "invalidOutput" };
      continue;
    }

    // Rejet préalable, sans exécution : l'analyse statique (AST, gratuite)
    // avant même d'envisager d'exécuter le corpus (§3.1).
    if (analyzeStaticRedos(parsed.value).length > 0) {
      correction = { kind: "redosVulnerable", pattern: output.pattern };
      continue;
    }

    const report = await deps.runCorpusSandboxed(output.pattern, output.flags, input.cases);
    if (!report) {
      // Le bac à sable n'a pas pu vérifier en toute sécurité (timeout) :
      // un échec, jamais un succès silencieux.
      correction = { kind: "redosVulnerable", pattern: output.pattern };
      continue;
    }

    const redos = await analyze(parsed.value);
    const attempt: CompilingAttempt = {
      pattern: output.pattern,
      flags: output.flags,
      report,
      redos,
    };

    const allPassed = report.passed === report.total;
    const isSafe = redos.status !== "vulnerable";

    if (allPassed && isSafe) {
      return {
        ok: true,
        value: { ...attempt, flavor: input.flavor, explanation: explain(parsed.value), attempts },
        usage,
      };
    }

    if (!best || isBetter(attempt, best)) best = attempt;
    if (attempts >= MAX_ATTEMPTS) break;

    correction = allPassed
      ? {
          kind: "redosVulnerable",
          pattern: output.pattern,
          ...(redos.attackString !== undefined ? { attackString: redos.attackString } : {}),
        }
      : {
          kind: "failedCases",
          pattern: output.pattern,
          failures: report.results
            .filter((r) => !r.pass)
            .map((r) => ({
              text: r.case.text,
              shouldMatch: r.case.shouldMatch,
              matched: r.matched,
            })),
        };
  }

  // Point 9 (§3.2) : jamais prétendre que les tests passent — on renvoie le
  // meilleur essai qui compile, avec un report honnête, plutôt qu'une erreur.
  if (best) {
    const parsed = parse(best.pattern, best.flags, input.flavor);
    return {
      ok: true,
      value: {
        ...best,
        flavor: input.flavor,
        explanation: parsed.ok ? explain(parsed.value) : [],
        attempts,
      },
      usage,
    };
  }

  return { ok: false, error: { kind: "invalid_output" }, usage };
}
