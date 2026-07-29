import Phaser from 'phaser';
import { COLORS } from '../config/GameConfig';
import { AUDIO_MANIFEST } from '../data/AudioManifest';
import { AudioService } from '../services/AudioService';
import { ShapeFactory } from '../utils/ShapeFactory';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.on('filecomplete', (key: string) => {
      if (AUDIO_MANIFEST.some((e) => e.id === key)) {
        AudioService.markLoaded(key);
      }
    });
    this.load.on('loaderror', (file: { key?: string }) => {
      // Arquivo ainda não colocado em public/audio — ignora
      if (file?.key) {
        console.info(`[audio] aguardando arquivo: ${file.key}`);
      }
    });

    for (const entry of AUDIO_MANIFEST) {
      this.load.audio(entry.id, entry.files);
    }
  }

  create(): void {
    ShapeFactory.createAll(this);
    AudioService.bind(this);
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.scene.start('MenuScene');
  }
}
