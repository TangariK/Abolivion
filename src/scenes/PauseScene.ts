import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create(): void {
    this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.72,
    );

    this.add
      .text(GAME_WIDTH / 2, 190, 'PAUSADO', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '54px',
        color: '#e8f0e8',
      })
      .setOrigin(0.5);

    this.makeButton(GAME_WIDTH / 2, 330, 'CONTINUAR', () => this.resumeGame());
    this.makeButton(GAME_WIDTH / 2, 410, 'VOLTAR AO MENU', () => {
      this.scene.stop('GameScene');
      this.scene.start('MenuScene');
    });

    const resumeOnEscape = () => this.resumeGame();
    this.input.keyboard?.on('keydown-ESC', resumeOnEscape);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown-ESC', resumeOnEscape));
  }

  private resumeGame(): void {
    this.scene.stop();
    this.scene.resume('GameScene');
  }

  private makeButton(x: number, y: number, label: string, action: () => void): void {
    const button = this.add
      .rectangle(x, y, 300, 54, COLORS.accent)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, label, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '22px',
        color: '#0d1a12',
      })
      .setOrigin(0.5);

    button.on('pointerover', () => button.setFillStyle(0xd4b86a));
    button.on('pointerout', () => button.setFillStyle(COLORS.accent));
    button.on('pointerdown', action);
  }
}
