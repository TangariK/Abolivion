import { XP_CURVE } from '../config/GameConfig';

export class LevelSystem {
  level = 1;
  xp = 0;
  totalXpCollected = 0;

  xpToNext(): number {
    return Math.floor(XP_CURVE.base * Math.pow(XP_CURVE.growth, this.level - 1));
  }

  /** Returns number of levels gained */
  addXp(amount: number): number {
    this.xp += amount;
    this.totalXpCollected += amount;
    let gained = 0;
    while (this.xp >= this.xpToNext()) {
      this.xp -= this.xpToNext();
      this.level += 1;
      gained += 1;
    }
    return gained;
  }

  progress(): number {
    const need = this.xpToNext();
    return need <= 0 ? 0 : this.xp / need;
  }
}
