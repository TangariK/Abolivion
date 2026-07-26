import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import type { Player } from '../entities/Player';
import { pickRandomUpgrades } from '../upgrades/RunUpgrades';

interface UpgradeData {
  player: Player;
}

export class UpgradeScene extends Phaser.Scene {
  private player!: Player;

  constructor() {
    super('UpgradeScene');
  }

  init(data: UpgradeData): void {
    this.player = data.player;
  }

  create(): void {
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65)
      .setScrollFactor(0);

    this.add
      .text(GAME_WIDTH / 2, 100, 'LEVEL UP', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '48px',
        color: '#c4a35a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.add
      .text(GAME_WIDTH / 2, 155, 'Escolha uma melhoria', {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '18px',
        color: '#e8f0e8',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const upgrades = pickRandomUpgrades(3);

    upgrades.forEach((upgrade, i) => {
      const x = GAME_WIDTH / 2 + (i - 1) * 280;
      const y = GAME_HEIGHT / 2 + 20;

      const card = this.add
        .rectangle(x, y, 240, 200, COLORS.cardBg, 0.98)
        .setStrokeStyle(2, COLORS.cardBorder)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });

      this.add
        .text(x, y - 55, upgrade.name, {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '22px',
          color: '#e8f0e8',
          align: 'center',
          wordWrap: { width: 210 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0);

      this.add
        .text(x, y + 20, upgrade.description, {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '16px',
          color: '#a8c0a8',
          align: 'center',
          wordWrap: { width: 210 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0);

      card.on('pointerover', () => card.setFillStyle(0x243528, 0.98));
      card.on('pointerout', () => card.setFillStyle(COLORS.cardBg, 0.98));
      card.on('pointerdown', () => {
        this.player.applyUpgrade(upgrade.apply);
        this.scene.stop();
        this.scene.resume('GameScene');
      });
    });
  }
}
