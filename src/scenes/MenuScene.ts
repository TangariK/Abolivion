import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import { GameModeStore } from '../data/GameModeStore';
import type { GameModeId, Profile } from '../data/types';
import { SaveManager } from '../upgrades/MetaUpgrades';
import { META_UPGRADE_DEFS, metaCost, tryBuyMeta } from '../upgrades/MetaShop';

const MODE_LABELS: Record<GameModeId, string> = {
  infinite: 'Infinito',
  waves: 'Rodadas',
  story: 'História',
};

export class MenuScene extends Phaser.Scene {
  private profile!: Profile;
  private coinsText!: Phaser.GameObjects.Text;
  private shopContainer!: Phaser.GameObjects.Container;
  private modeButtonLabel!: Phaser.GameObjects.Text;
  private dropdown?: Phaser.GameObjects.Container;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.profile = SaveManager.load();
    this.cameras.main.setBackgroundColor(COLORS.bg);

    const g = this.add.graphics();
    g.fillStyle(0x1a3324, 0.35);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, 420);
    g.fillStyle(0x243d2c, 0.2);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, 280);

    this.add
      .text(GAME_WIDTH / 2, 70, 'ABOLIVION', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '64px',
        color: '#e8f0e8',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 130, 'Sobreviva à noite. Proteja o que restou.', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '18px',
        color: '#a8c0a8',
      })
      .setOrigin(0.5);

    this.coinsText = this.add
      .text(GAME_WIDTH / 2, 168, '', {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '20px',
        color: '#c4a35a',
      })
      .setOrigin(0.5);

    this.refreshCoins();
    this.buildShop();
    this.buildModeSelector();
    this.buildStartButton();
    this.buildAlmanacButton();
  }

  private refreshCoins(): void {
    this.coinsText.setText(`Moedas: ${this.profile.currency}`);
  }

  private buildModeSelector(): void {
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT - 140;

    this.add
      .text(x, y - 34, 'Modo de jogo', {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '14px',
        color: '#a8c0a8',
      })
      .setOrigin(0.5);

    const button = this.add
      .rectangle(x, y, 320, 44, 0x2a2417)
      .setStrokeStyle(2, COLORS.accent)
      .setInteractive({ useHandCursor: true });

    this.modeButtonLabel = this.add
      .text(x, y, `${MODE_LABELS[GameModeStore.get()]}  ▾`, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '20px',
        color: '#f4d77b',
      })
      .setOrigin(0.5);

    button.on('pointerdown', () => this.toggleDropdown(x, y));
  }

  private toggleDropdown(x: number, y: number): void {
    if (this.dropdown) {
      this.dropdown.destroy(true);
      this.dropdown = undefined;
      return;
    }

    this.dropdown = this.add.container(x, y + 28).setDepth(50);
    const options: Array<{ id: GameModeId; locked?: boolean }> = [
      { id: 'infinite' },
      { id: 'waves' },
      { id: 'story', locked: true },
    ];

    options.forEach((opt, i) => {
      const oy = i * 44;
      const bg = this.add
        .rectangle(0, oy, 320, 40, 0x1a2a1e)
        .setStrokeStyle(1, COLORS.cardBorder)
        .setInteractive({ useHandCursor: !opt.locked });
      const label = this.add
        .text(0, oy, opt.locked ? 'História (em breve)' : MODE_LABELS[opt.id], {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '16px',
          color: opt.locked ? '#666' : '#e8f0e8',
        })
        .setOrigin(0.5);

      if (!opt.locked) {
        bg.on('pointerover', () => bg.setFillStyle(0x243528));
        bg.on('pointerout', () => bg.setFillStyle(0x1a2a1e));
        bg.on('pointerdown', () => {
          GameModeStore.set(opt.id);
          this.modeButtonLabel.setText(`${MODE_LABELS[opt.id]}  ▾`);
          this.dropdown?.destroy(true);
          this.dropdown = undefined;
        });
      }

      this.dropdown?.add([bg, label]);
    });
  }

  private buildShop(): void {
    this.shopContainer = this.add.container(GAME_WIDTH / 2, 360);

    const title = this.add
      .text(0, -150, 'Melhorias Permanentes', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '24px',
        color: '#c4a35a',
      })
      .setOrigin(0.5);
    this.shopContainer.add(title);

    META_UPGRADE_DEFS.forEach((def, i) => {
      const x = (i - 1.5) * 220;
      const level = this.profile.metaLevels[def.id];
      const cost = metaCost(level);
      const maxed = level >= def.maxLevel;

      const bg = this.add
        .rectangle(x, 0, 200, 130, COLORS.cardBg, 0.95)
        .setStrokeStyle(2, COLORS.cardBorder)
        .setInteractive({ useHandCursor: true });

      const name = this.add
        .text(x, -42, def.name, {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '17px',
          color: '#e8f0e8',
        })
        .setOrigin(0.5);

      const desc = this.add
        .text(x, -14, def.description, {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '11px',
          color: '#a8c0a8',
          align: 'center',
          wordWrap: { width: 180 },
        })
        .setOrigin(0.5);

      const levelText = this.add
        .text(x, 24, `Nível ${level}/${def.maxLevel}`, {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '13px',
          color: '#c4a35a',
        })
        .setOrigin(0.5);

      const costText = this.add
        .text(x, 46, maxed ? 'MÁXIMO' : `${cost} moedas`, {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '13px',
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
    const y = GAME_HEIGHT - 60;
    const btn = this.add
      .rectangle(x, y, 250, 52, COLORS.accent, 1)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, 'COMEÇAR', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '26px',
        color: '#0d1a12',
      })
      .setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0xd4b86a));
    btn.on('pointerout', () => btn.setFillStyle(COLORS.accent));
    btn.on('pointerdown', () => this.scene.start('GameScene'));
  }

  private buildAlmanacButton(): void {
    const x = GAME_WIDTH / 2 + 140;
    const y = GAME_HEIGHT - 60;
    const button = this.add
      .rectangle(x, y, 250, 52, 0x2a2417, 1)
      .setStrokeStyle(2, COLORS.accent)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, 'MARÃ', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '24px',
        color: '#f4d77b',
      })
      .setOrigin(0.5);

    button.on('pointerover', () => button.setFillStyle(0x3b3220));
    button.on('pointerout', () => button.setFillStyle(0x2a2417));
    button.on('pointerdown', () => this.scene.launch('AlmanacScene'));
  }
}
