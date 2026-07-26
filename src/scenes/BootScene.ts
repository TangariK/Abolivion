import Phaser from 'phaser';
import { COLORS } from '../config/GameConfig';
import { ShapeFactory } from '../utils/ShapeFactory';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    ShapeFactory.createAll(this);
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.scene.start('MenuScene');
  }
}
