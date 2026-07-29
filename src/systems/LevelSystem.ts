import { XP_CURVE } from '../config/GameConfig';

export class LevelSystem {
  level = 1;
  xp = 0;
  totalXpCollected = 0;
  /** Meta + amuletos: multiplicador do XP necessário (1 = normal). */
  xpCostMultiplier = 1;

  xpToNext(): number {
    const raw = Math.floor(XP_CURVE.base * Math.pow(XP_CURVE.growth, this.level - 1));
    return Math.max(1, Math.floor(raw * this.xpCostMultiplier));
  }

  /** Aplica meta (−5%/nível) e opcionalmente Meia-Lua (×0.5). */
  setXpCostFactors(metaMul: number, halfFromAmulet: boolean): void {
    this.xpCostMultiplier = Math.max(0.25, metaMul * (halfFromAmulet ? 0.5 : 1));
  }

  enableHalfXpCosts(): void {
    this.xpCostMultiplier = Math.max(0.25, this.xpCostMultiplier * 0.5);
  }

  /** Returns each level reached, preserving milestones when XP jumps levels. */
  addXp(amount: number): number[] {
    this.xp += amount;
    this.totalXpCollected += amount;
    const levelsReached: number[] = [];
    while (this.xp >= this.xpToNext()) {
      this.xp -= this.xpToNext();
      this.level += 1;
      levelsReached.push(this.level);
    }
    return levelsReached;
  }

  progress(): number {
    const need = this.xpToNext();
    return need <= 0 ? 0 : this.xp / need;
  }

  /** Convidado online: espelha nível/progresso do host (sem ganhar XP local). */
  syncFromHost(level: number, xpProgress: number): void {
    this.level = Math.max(1, Math.floor(level));
    const need = this.xpToNext();
    const t = Math.max(0, Math.min(0.999, xpProgress));
    this.xp = Math.max(0, Math.min(need - 0.01, need * t));
  }
}
