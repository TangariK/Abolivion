import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import type { RunSummary } from '../data/types';
import { SaveManager } from '../upgrades/MetaUpgrades';

export class GameOverScene extends Phaser.Scene {
  private summary!: RunSummary;

  constructor() {
    super('GameOverScene');
  }

  init(data: RunSummary): void {
    this.summary = data;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);

    const g = this.add.graphics();
    g.fillStyle(0x1a2018, 0.5);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 360);

    this.add
      .text(GAME_WIDTH / 2, 120, 'VOCÊ CAIU', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '56px',
        color: '#e85d5d',
      })
      .setOrigin(0.5);

    const secs = Math.floor(this.summary.survivalMs / 1000);
    const profile = SaveManager.load();

    const lines = [
      `Modo: ${this.summary.mode === 'waves' ? 'Rodadas' : 'Infinito'}`,
      `Nível alcançado: ${this.summary.level}`,
      ...(this.summary.waveReached
        ? [`Rodada alcançada: ${this.summary.waveReached}`]
        : []),
      `Abates: ${this.summary.kills}`,
      `Tempo: ${secs}s`,
      `XP coletado: ${this.summary.xpCollected}`,
      `Moedas ganhas: +${this.summary.coinsEarned}`,
      `Total de moedas: ${profile.currency}`,
    ];

    lines.forEach((line, i) => {
      this.add
        .text(GAME_WIDTH / 2, 200 + i * 32, line, {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '20px',
          color: '#e8f0e8',
        })
        .setOrigin(0.5);
    });

    this.makeButton(GAME_WIDTH / 2 - 150, GAME_HEIGHT - 100, 'TENTAR DE NOVO', () => {
      this.scene.start('GameScene');
    });

    this.makeButton(GAME_WIDTH / 2 + 150, GAME_HEIGHT - 100, 'MENU', () => {
      this.scene.start('MenuScene');
    });
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const btn = this.add
      .rectangle(x, y, 260, 52, COLORS.accent, 1)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, label, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '20px',
        color: '#0d1a12',
      })
      .setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0xd4b86a));
    btn.on('pointerout', () => btn.setFillStyle(COLORS.accent));
    btn.on('pointerdown', onClick);
  }
}
