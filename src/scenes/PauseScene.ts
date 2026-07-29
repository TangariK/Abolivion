import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import { AudioService } from '../services/AudioService';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create(): void {
    AudioService.setMusicDucked(true);

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

    this.buildVolumePanel();

    this.makeButton(GAME_WIDTH / 2, 330, 'CONTINUAR', () => {
      AudioService.playSfx('sfx_ui_click');
      this.resumeGame();
    });
    this.makeButton(GAME_WIDTH / 2, 410, 'VOLTAR AO MENU', () => {
      AudioService.playSfx('sfx_ui_back');
      AudioService.setMusicDucked(false);
      AudioService.stopAllMusic();
      this.scene.stop('GameScene');
      this.scene.start('MenuScene');
    });

    const resumeOnEscape = () => {
      AudioService.playSfx('sfx_ui_click');
      this.resumeGame();
    };
    this.input.keyboard?.on('keydown-ESC', resumeOnEscape);
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown-ESC', resumeOnEscape);
    });
  }

  private buildVolumePanel(): void {
    const prefs = AudioService.readPrefs();
    const panelX = GAME_WIDTH - 150;
    const panelY = 70;

    this.add
      .rectangle(panelX, panelY + 48, 260, 130, 0x1a2a1e, 0.92)
      .setStrokeStyle(2, COLORS.accent)
      .setScrollFactor(0)
      .setDepth(20);

    this.add
      .text(panelX, panelY - 8, 'Som', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '20px',
        color: '#c4a35a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(21);

    this.makeVolumeSlider(panelX, panelY + 28, 'Música', prefs.musicVolume, (v) => {
      AudioService.writePrefs({ musicVolume: v });
    });
    this.makeVolumeSlider(panelX, panelY + 72, 'Efeitos', prefs.sfxVolume, (v) => {
      AudioService.writePrefs({ sfxVolume: v });
    });
  }

  private makeVolumeSlider(
    cx: number,
    y: number,
    label: string,
    initial: number,
    onChange: (v: number) => void,
  ): void {
    this.add
      .text(cx - 110, y - 14, label, {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '13px',
        color: '#a8c0a8',
      })
      .setOrigin(0, 0.5)
      .setDepth(21);

    const trackW = 160;
    const trackX = cx - 30;
    this.add
      .rectangle(trackX, y + 8, trackW, 8, 0x2a3a2e)
      .setOrigin(0, 0.5)
      .setDepth(21);

    const fill = this.add
      .rectangle(trackX, y + 8, trackW * Phaser.Math.Clamp(initial, 0, 1), 8, COLORS.accent)
      .setOrigin(0, 0.5)
      .setDepth(22);

    const pct = this.add
      .text(trackX + trackW + 8, y + 8, `${Math.round(initial * 100)}%`, {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '12px',
        color: '#e8f0e8',
      })
      .setOrigin(0, 0.5)
      .setDepth(22);

    const hit = this.add
      .rectangle(trackX + trackW / 2, y + 8, trackW + 16, 28, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true })
      .setDepth(23);

    const apply = (pointerX: number) => {
      const local = Phaser.Math.Clamp((pointerX - trackX) / trackW, 0, 1);
      fill.width = trackW * local;
      pct.setText(`${Math.round(local * 100)}%`);
      onChange(local);
    };

    hit.on('pointerdown', (p: Phaser.Input.Pointer) => apply(p.x));
    hit.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) apply(p.x);
    });
  }

  private resumeGame(): void {
    AudioService.setMusicDucked(false);
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
