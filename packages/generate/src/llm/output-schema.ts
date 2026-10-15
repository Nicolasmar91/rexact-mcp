import { z } from "zod";

// Annexe D : schéma de sortie exact attendu du modèle.
export const LlmOutputSchema = z.object({
  pattern: z.string().min(1).max(2000).nullable(),
  flags: z.string().max(10),
  notes: z.string().nullable(),
  error: z.literal("out_of_scope").nullable(),
});

export type LlmOutput = z.infer<typeof LlmOutputSchema>;

// Le modèle promet "un unique objet JSON, rien d'autre", mais on ne lui fait
// pas confiance : si un fragment de texte l'entoure malgré tout, on tente
// d'extraire le premier objet JSON plutôt que d'échouer immédiatement.
export function parseLlmOutput(raw: string): LlmOutput | null {
  const attempts = [raw.trim()];
  const match = /\{[\s\S]*\}/.exec(raw);
  if (match) attempts.push(match[0]);

  for (const candidate of attempts) {
    try {
      const json: unknown = JSON.parse(candidate);
      const result = LlmOutputSchema.safeParse(json);
      if (result.success) return result.data;
    } catch {
      // essai suivant
    }
  }
  return null;
}
