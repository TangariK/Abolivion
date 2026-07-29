const TREES = [
  'betula',
  'carvalho',
  'ipe',
  'jequitiba',
  'aroeira',
  'jatoba',
  'cedro',
  'copaiba',
  'angico',
  'guarana',
  'imbauba',
  'jacaranda',
] as const;

/** Nome de exibição para convidado no online. */
export function randomTreeName(): string {
  const pick = TREES[Math.floor(Math.random() * TREES.length)];
  const n = Math.floor(Math.random() * 90) + 10;
  return `${pick}_${n}`;
}

/**
 * Alias anônimo estável por usuário (mesmo nome sempre).
 * Usa hash simples do seed para escolher árvore + número 10–99.
 */
export function stableTreeAlias(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = h >>> 0;
  const pick = TREES[u % TREES.length];
  const n = 10 + (u % 90);
  return `${pick}_${n}`;
}

export function onlineDisplayName(loggedUsername: string | null): string {
  if (loggedUsername && loggedUsername !== 'convidado') return loggedUsername;
  return randomTreeName();
}
