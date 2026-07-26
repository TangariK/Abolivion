import { XP_CURVE } from '../config/GameConfig';

export class LevelSystem {
  level = 1;
  xp = 0;
  totalXpCollected = 0;

  xpToNext(): number {
    return Math.floor(XP_CURVE.base * Math.pow(XP_CURVE.growth, this.level - 1));
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
}
