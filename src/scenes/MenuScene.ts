import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import type { Profile } from '../data/types';
import { SaveManager } from '../upgrades/MetaUpgrades';
import { META_UPGRADE_DEFS, metaCost, tryBuyMeta } from '../upgrades/MetaShop';

export class MenuScene extends Phaser.Scene {
  private profile!: Profile;
  private coinsText!: Phaser.GameObjects.Text;
  private shopContainer!: Phaser.GameObjects.Container;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.profile = SaveManager.load();
    this.cameras.main.setBackgroundColor(COLORS.bg);

    // Soft radial atmosphere via repeated faded circles
    const g = this.add.graphics();
    g.fillStyle(0x1a3324, 0.35);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, 420);
    g.fillStyle(0x243d2c, 0.2);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, 280);

    this.add
      .text(GAME_WIDTH / 2, 90, 'ABOLIVION', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '72px',
        color: '#e8f0e8',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 160, 'Sobreviva à noite. Proteja o que restou.', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '20px',
        color: '#a8c0a8',
      })
      .setOrigin(0.5);

    this.coinsText = this.add
      .text(GAME_WIDTH / 2, 210, '', {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '22px',
        color: '#c4a35a',
      })
      .setOrigin(0.5);

    this.refreshCoins();
    this.buildShop();
    this.buildStartButton();
    this.buildAlmanacButton();
  }

  private refreshCoins(): void {
    this.coinsText.setText(`Moedas: ${this.profile.currency}`);
  }

  private buildShop(): void {
    this.shopContainer = this.add.container(GAME_WIDTH / 2, 390);

    const title = this.add
      .text(0, -150, 'Melhorias Permanentes', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '26px',
        color: '#c4a35a',
      })
      .setOrigin(0.5);
    this.shopContainer.add(title);

    META_UPGRADE_DEFS.forEach((def, i) => {
      const x = (i - 1.5) * 220;
      const y = 0;
      const level = this.profile.metaLevels[def.id];
      const cost = metaCost(level);
      const maxed = level >= def.maxLevel;

      const bg = this.add
        .rectangle(x, y, 200, 140, COLORS.cardBg, 0.95)
        .setStrokeStyle(2, COLORS.cardBorder)
        .setInteractive({ useHandCursor: true });

      const name = this.add
        .text(x, y - 48, def.name, {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '18px',
          color: '#e8f0e8',
        })
        .setOrigin(0.5);

      const desc = this.add
        .text(x, y - 18, def.description, {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '12px',
          color: '#a8c0a8',
          align: 'center',
          wordWrap: { width: 180 },
        })
        .setOrigin(0.5);

      const levelText = this.add
        .text(x, y + 22, `Nível ${level}/${def.maxLevel}`, {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '14px',
          color: '#c4a35a',
        })
        .setOrigin(0.5);

      const costText = this.add
        .text(x, y + 48, maxed ? 'MÁXIMO' : `${cost} moedas`, {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '14px',
          color: maxed ? '#666' : '#e8f0e8',
        })
        .setOrigin(0.5);

      bg.on('pointerover', () => bg.setFillStyle(0x243528, 0.95));
      bg.on('pointerout', () => bg.setFillStyle(COLORS.cardBg, 0.95));
      bg.on('pointerdown', () => {
        const result = tryBuyMeta(def.id);
        this.profile = result.profile;
        this.refreshCoins();
        this.shopContainer.destroy(true);
        this.buildShop();
      });

      this.shopContainer.add([bg, name, desc, levelText, costText]);
    });
  }

  private buildStartButton(): void {
    const x = GAME_WIDTH / 2 - 140;
    const y = GAME_HEIGHT - 70;
    const btn = this.add
      .rectangle(x, y, 250, 56, COLORS.accent, 1)
      .setInteractive({ useHandCursor: true });

    const label = this.add
      .text(x, y, 'COMEÇAR', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '28px',
        color: '#0d1a12',
      })
      .setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0xd4b86a));
    btn.on('pointerout', () => btn.setFillStyle(COLORS.accent));
    btn.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    label.setDepth(1);
  }

  private buildAlmanacButton(): void {
    const x = GAME_WIDTH / 2 + 140;
    const y = GAME_HEIGHT - 70;
    const button = this.add
      .rectangle(x, y, 250, 56, 0x2a2417, 1)
      .setStrokeStyle(2, COLORS.accent)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, 'MARÃ', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '26px',
        color: '#f4d77b',
      })
      .setOrigin(0.5);

    button.on('pointerover', () => button.setFillStyle(0x3b3220));
    button.on('pointerout', () => button.setFillStyle(0x2a2417));
    button.on('pointerdown', () => this.scene.launch('AlmanacScene'));
  }
}
