import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import type { AmuletId } from '../data/types';
import type { Player } from '../entities/Player';
import { pickAmulets } from '../upgrades/Amulets';
import { SaveManager } from '../upgrades/MetaUpgrades';
import { pickRandomUpgrades } from '../upgrades/RunUpgrades';

interface UpgradeData {
  player: Player;
  mode: 'upgrade' | 'amulet';
  ownedAmulets: AmuletId[];
  onAmuletSelected: (id: AmuletId) => void;
  onComplete: () => void;
}

export class UpgradeScene extends Phaser.Scene {
  private player!: Player;
  private mode: 'upgrade' | 'amulet' = 'upgrade';
  private ownedAmulets: AmuletId[] = [];
  private onAmuletSelected!: (id: AmuletId) => void;
  private onComplete!: () => void;

  constructor() {
    super('UpgradeScene');
  }

  init(data: UpgradeData): void {
    this.player = data.player;
    this.mode = data.mode;
    this.ownedAmulets = data.ownedAmulets ?? [];
    this.onAmuletSelected = data.onAmuletSelected;
    this.onComplete = data.onComplete;
  }

  create(): void {
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65)
      .setScrollFactor(0);

    this.add
      .text(GAME_WIDTH / 2, 82, this.mode === 'amulet' ? 'CHAMADO DOS AMULETOS' : 'LEVEL UP', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: this.mode === 'amulet' ? '40px' : '48px',
        color: '#c4a35a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.add
      .text(
        GAME_WIDTH / 2,
        140,
        this.mode === 'amulet'
          ? 'A cada 5 níveis, uma memória ancestral desperta'
          : 'Escolha uma melhoria',
        {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '18px',
        color: '#e8f0e8',
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0);

    if (this.mode === 'amulet') {
      this.createAmuletCards();
    } else {
      this.createUpgradeCards();
    }
  }

  private createUpgradeCards(): void {
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
        SaveManager.discoverUpgrade(upgrade.id);
        this.finish();
      });
    });
  }

  private createAmuletCards(): void {
    const amulets = pickAmulets(this.ownedAmulets, 3);
    if (amulets.length === 0) {
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Todos os amuletos já foram despertados.', {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '24px',
          color: '#e8f0e8',
        })
        .setOrigin(0.5);
      this.time.delayedCall(900, () => this.finish());
      return;
    }

    amulets.forEach((amulet, i) => {
      const spacing = 300;
      const x = GAME_WIDTH / 2 + (i - (amulets.length - 1) / 2) * spacing;
      const y = GAME_HEIGHT / 2 + 35;
      const card = this.add
        .rectangle(x, y, 270, 300, 0x231f13, 0.99)
        .setStrokeStyle(3, COLORS.accent)
        .setInteractive({ useHandCursor: true });

      this.add
        .circle(x, y - 105, 27, COLORS.accent)
        .setStrokeStyle(2, 0xffe8a3);
      this.add
        .text(x, y - 105, amulet.symbol, {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '22px',
          color: '#0d1a12',
        })
        .setOrigin(0.5);
      this.add
        .text(x, y - 60, amulet.name, {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '21px',
          color: '#f4d77b',
          align: 'center',
        })
        .setOrigin(0.5);
      this.add
        .text(x, y, amulet.description, {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '15px',
          color: '#e8f0e8',
          align: 'center',
          wordWrap: { width: 235 },
        })
        .setOrigin(0.5);
      this.add
        .text(x, y + 78, amulet.lore, {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontStyle: 'italic',
          fontSize: '12px',
          color: '#b7aa84',
          align: 'center',
          wordWrap: { width: 230 },
        })
        .setOrigin(0.5);

      card.on('pointerover', () => card.setFillStyle(0x352e1a, 0.99));
      card.on('pointerout', () => card.setFillStyle(0x231f13, 0.99));
      card.on('pointerdown', () => {
        SaveManager.discoverAmulet(amulet.id);
        this.onAmuletSelected(amulet.id);
        this.finish();
      });
    });
  }

  private finish(): void {
    this.onComplete();
    this.scene.stop();
    this.scene.resume('GameScene');
  }
}
