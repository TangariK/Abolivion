/**
 * NV2: mesmos inimigos, mais fortes — entram aos poucos após rodada 40 / ~10 min infinito.
 */
export function eliteChanceFromWave(wave: number): number {
  if (wave < 40) return 0;
  return Math.min(0.72, 0.12 + (wave - 40) * 0.045);
}

export function eliteChanceFromElapsedMs(elapsedMs: number): number {
  const min = elapsedMs / 60_000;
  if (min < 10) return 0;
  return Math.min(0.75, 0.15 + (min - 10) * 0.07);
}

export function shouldPromoteElite(waveOrChance: number, mode: 'wave' | 'chance' = 'wave'): boolean {
  const chance = mode === 'wave' ? eliteChanceFromWave(waveOrChance) : waveOrChance;
  return chance > 0 && Math.random() < chance;
}
