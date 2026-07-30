import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import type { AmuletId, RunUpgradeDef } from '../data/types';
import type { Player } from '../entities/Player';
import { moonLabel, pickAmulets, type PickAmuletContext } from '../upgrades/Amulets';
import { SaveManager } from '../upgrades/MetaUpgrades';
import { pickRandomUpgrades } from '../upgrades/RunUpgrades';
import { AudioService } from '../services/AudioService';

interface UpgradeData {
  player: Player;
  players: Player[];
  mode: 'upgrade' | 'amulet';
  ownedAmulets: AmuletId[];
  pickCtx?: PickAmuletContext;
  /** Se true, GameScene foi pausada e precisa de resume ao fechar. */
  resumeGame?: boolean;
  rerollsLeft?: number;
  allowStaminaBuffs?: boolean;
  allowSecondChant?: boolean;
  secondChantTaken?: boolean;
  onRerollUsed?: () => void;
  onSecondChant?: () => void;
  onAmuletSelected: (id: AmuletId) => void;
  onComplete: () => void;
  onAchievement?: (id: 'xp_scholar') => void;
}

export class UpgradeScene extends Phaser.Scene {
  private player!: Player;
  private players: Player[] = [];
  private mode: 'upgrade' | 'amulet' = 'upgrade';
  private ownedAmulets: AmuletId[] = [];
  private pickCtx: PickAmuletContext = { coop: false, allyDead: false, mercyUses: 0 };
  private resumeGame = true;
  private rerollsLeft = 0;
  private allowStaminaBuffs = false;
  private allowSecondChant = false;
  private secondChantTaken = false;
  private onRerollUsed?: () => void;
  private onSecondChant?: () => void;
  private onAmuletSelected!: (id: AmuletId) => void;
  private onComplete!: () => void;
  private onAchievement?: (id: 'xp_scholar') => void;
  private finished = false;
  private cardsRoot?: Phaser.GameObjects.Container;
  private rerollBtn?: Phaser.GameObjects.Text;

  constructor() {
    super('UpgradeScene');
  }

  init(data: UpgradeData): void {
    this.player = data.player;
    this.players = data.players?.length ? data.players : [data.player];
    this.mode = data.mode;
    this.ownedAmulets = data.ownedAmulets ?? [];
    this.pickCtx = data.pickCtx ?? { coop: false, allyDead: false, mercyUses: 0 };
    this.resumeGame = data.resumeGame !== false;
    this.rerollsLeft = data.rerollsLeft ?? 0;
    this.allowStaminaBuffs = Boolean(data.allowStaminaBuffs);
    this.allowSecondChant = Boolean(data.allowSecondChant);
    this.secondChantTaken = Boolean(data.secondChantTaken);
    this.onRerollUsed = data.onRerollUsed;
    this.onSecondChant = data.onSecondChant;
    this.onAmuletSelected = data.onAmuletSelected;
    this.onComplete = data.onComplete;
    this.onAchievement = data.onAchievement;
    this.finished = false;
  }

  create(): void {
    AudioService.playSfx(this.mode === 'amulet' ? 'sfx_amulet_appear' : 'sfx_buff_appear');

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

    this.cardsRoot = this.add.container(0, 0).setScrollFactor(0);
    if (this.mode === 'amulet') this.createAmuletCards();
    else this.createUpgradeCards();
    this.createRerollButton();
  }

  private createRerollButton(): void {
    this.rerollBtn?.destroy();
    if (this.rerollsLeft <= 0) return;
    this.rerollBtn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 70, `Reroll (${this.rerollsLeft})`, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '22px',
        color: '#f4d77b',
        backgroundColor: '#1a2a1e',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.rerollBtn.on('pointerup', () => {
      if (this.finished || this.rerollsLeft <= 0) return;
      AudioService.playSfx('sfx_ui_click');
      this.rerollsLeft -= 1;
      this.onRerollUsed?.();
      this.cardsRoot?.removeAll(true);
      if (this.mode === 'amulet') this.createAmuletCards();
      else this.createUpgradeCards();
      this.createRerollButton();
    });
  }

  private createUpgradeCards(): void {
    const upgrades = pickRandomUpgrades(3, {
      allowStamina: this.allowStaminaBuffs,
      allowSecondChant: this.allowSecondChant,
      secondChantTaken: this.secondChantTaken,
    });
    upgrades.forEach((upgrade, i) => {
      const x = GAME_WIDTH / 2 + (i - 1) * 280;
      const y = GAME_HEIGHT / 2 + 20;

      const card = this.add
        .rectangle(x, y, 240, 200, COLORS.cardBg, 0.98)
        .setStrokeStyle(2, COLORS.cardBorder)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });

      const name = this.add
        .text(x, y - 55, upgrade.name, {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '22px',
          color: '#e8f0e8',
          align: 'center',
          wordWrap: { width: 210 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0);

      const desc = this.add
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
      card.on('pointerdown', () => this.pickUpgrade(upgrade));
      this.cardsRoot?.add([card, name, desc]);
    });
  }

  private pickUpgrade(upgrade: RunUpgradeDef): void {
    if (this.finished) return;
    AudioService.playSfx('sfx_buff_select');
    for (const p of this.players) {
      p.applyUpgrade(upgrade.apply);
    }
    const base = this.player.stats;
    for (const p of this.players) {
      if (p !== this.player) p.syncStatsFrom(base);
    }
    SaveManager.discoverUpgrade(upgrade.id);
    if (upgrade.id === 'xp_gain') this.onAchievement?.('xp_scholar');
    if (upgrade.id === 'second_chant') this.onSecondChant?.();
    this.finish();
  }

  private createAmuletCards(): void {
    const amulets = pickAmulets(this.ownedAmulets, 3, this.pickCtx);
    if (amulets.length === 0) {
      const empty = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Todos os amuletos já foram despertados.', {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '24px',
          color: '#e8f0e8',
        })
        .setOrigin(0.5);
      this.cardsRoot?.add(empty);
      this.time.delayedCall(900, () => this.finish());
      return;
    }

    amulets.forEach((amulet, i) => {
      const spacing = 300;
      const x = GAME_WIDTH / 2 + (i - (amulets.length - 1) / 2) * spacing;
      const y = GAME_HEIGHT / 2 + 35;
      const card = this.add
        .rectangle(x, y, 270, 320, 0x231f13, 0.99)
        .setStrokeStyle(3, COLORS.accent)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });

      const moon = this.add.circle(x, y - 115, 27, COLORS.accent).setStrokeStyle(2, 0xffe8a3);
      const sym = this.add
        .text(x, y - 115, amulet.symbol, {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '22px',
          color: '#0d1a12',
        })
        .setOrigin(0.5);
      const name = this.add
        .text(x, y - 70, amulet.name, {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '20px',
          color: '#f4d77b',
          align: 'center',
        })
        .setOrigin(0.5);
      const rarity = this.add
        .text(x, y - 40, moonLabel(amulet.rarity), {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '18px',
          color: '#c4a35a',
        })
        .setOrigin(0.5);
      const desc = this.add
        .text(x, y + 40, amulet.description, {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '15px',
          color: '#e8f0e8',
          align: 'center',
          wordWrap: { width: 230 },
        })
        .setOrigin(0.5);

      card.on('pointerover', () => card.setFillStyle(0x342815, 0.99));
      card.on('pointerout', () => card.setFillStyle(0x231f13, 0.99));
      card.on('pointerdown', () => {
        if (this.finished) return;
        AudioService.playSfx('sfx_amulet_select');
        this.onAmuletSelected(amulet.id);
        this.finish();
      });
      this.cardsRoot?.add([card, moon, sym, name, rarity, desc]);
    });
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    if (this.resumeGame) this.scene.resume('GameScene');
    this.onComplete();
    this.scene.stop();
  }
}
