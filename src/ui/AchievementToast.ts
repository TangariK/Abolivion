import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config/GameConfig';
import { getAchievement } from '../data/Achievements';
import type { AchievementId, AchievementTier } from '../data/types';

const TIER_STROKE: Record<AchievementTier, number> = {
  normal: COLORS.accent,
  secret: 0x8a7a55,
  tribal: 0x5ec4a0,
  ancestral: 0xffe08a,
};

const TIER_TITLE: Record<AchievementTier, string> = {
  normal: 'CONQUISTA',
  secret: 'SECRETA',
  tribal: 'TRIBAL',
  ancestral: 'ANCESTRAL',
};

/** Side card toast queue for newly unlocked achievements */
export class AchievementToast {
  private queue: AchievementId[] = [];
  private busy = false;
  private card?: Phaser.GameObjects.Container;

  constructor(private readonly scene: Phaser.Scene) {}

  enqueue(id: AchievementId): void {
    this.queue.push(id);
    this.pump();
  }

  private pump(): void {
    if (this.busy || this.queue.length === 0) return;
    this.busy = true;
    const id = this.queue.shift()!;
    const def = getAchievement(id);
    const stroke = TIER_STROKE[def.tier];

    const x = GAME_WIDTH - 170;
    const y = 120;
    const bg = this.scene.add
      .rectangle(0, 0, 300, 84, 0x1a2a1e, 0.96)
      .setStrokeStyle(def.tier === 'ancestral' ? 3 : 2, stroke);
    const title = this.scene.add
      .text(-130, -26, TIER_TITLE[def.tier], {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '12px',
        color: def.tier === 'ancestral' ? '#ffe08a' : '#c4a35a',
      });
    const name = this.scene.add
      .text(-130, -6, def.name, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '18px',
        color: '#f4d77b',
        wordWrap: { width: 260 },
      });
    const desc = this.scene.add
      .text(-130, 22, def.description, {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '12px',
        color: '#a8c0a8',
        wordWrap: { width: 260 },
      });

    this.card = this.scene.add
      .container(x + 340, y, [bg, title, name, desc])
      .setScrollFactor(0)
      .setDepth(200);

    this.scene.tweens.add({
      targets: this.card,
      x,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.scene.time.delayedCall(2600, () => {
          if (!this.card) {
            this.busy = false;
            this.pump();
            return;
          }
          this.scene.tweens.add({
            targets: this.card,
            x: x + 340,
            alpha: 0,
            duration: 280,
            onComplete: () => {
              this.card?.destroy(true);
              this.card = undefined;
              this.busy = false;
              this.pump();
            },
          });
        });
      },
    });
  }
}
