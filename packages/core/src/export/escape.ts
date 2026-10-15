// Échappement partagé entre cibles : JSON.stringify produit une chaîne
// entre guillemets doubles avec \\, \", \n, \t… déjà échappés — syntaxe
// valide telle quelle en JS/TS, Python (chaîne normale, pas de string brute
// pour éviter le piège de l'antislash final) et Go (guillemets doubles).
export function toDoubleQuotedLiteral(value: string): string {
  return JSON.stringify(value);
}

// Identifiant sûr pour un nom de fichier/fonction : lettres, chiffres,
// underscore, ne commence jamais par un chiffre.
export function toIdentifier(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  const safe = cleaned.length > 0 ? cleaned : "pattern";
  return /^[0-9]/.test(safe) ? `p_${safe}` : safe;
}

export function toPascalCase(name: string): string {
  const parts = toIdentifier(name).split("_").filter(Boolean);
  const pascal = parts.map((part) => part[0]?.toUpperCase() + part.slice(1)).join("");
  return pascal.length > 0 ? pascal : "Pattern";
}

// Choisit un délimiteur PCRE absent du motif (§1.7 : "attention aux
// antislashs et aux délimiteurs PHP"). Retombe sur "/" avec échappement des
// occurrences si les quatre délimiteurs usuels apparaissent tous.
export function choosePhpDelimiter(pattern: string): { delimiter: string; pattern: string } {
  const candidates = ["/", "#", "~", "%"];
  const free = candidates.find((d) => !pattern.includes(d));
  if (free) return { delimiter: free, pattern };
  return { delimiter: "/", pattern: pattern.replaceAll("/", "\\/") };
}

// Chaîne PHP entre guillemets doubles : échapper \, ", et $ (interpolation).
export function toPhpDoubleQuotedLiteral(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$");
  return `"${escaped}"`;
}

// Chaîne PHP entre guillemets simples : seuls \ et ' doivent être échappés.
export function toPhpSingleQuotedLiteral(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `'${escaped}'`;
}

// Chaîne Go : guillemets obliques (raw string) si le motif ne contient pas
// de guillemet oblique, sinon repli sur une chaîne classique entre guillemets.
export function toGoStringLiteral(value: string): string {
  if (!value.includes("`")) return `\`${value}\``;
  return toDoubleQuotedLiteral(value);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
