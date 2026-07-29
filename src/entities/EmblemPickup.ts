import Phaser from 'phaser';
import type { EmblemId } from '../data/types';

/** Emblema dropado por chefão — pickup no chão. */
export class EmblemPickup extends Phaser.Physics.Arcade.Image {
  emblemId!: EmblemId;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'emblem_kurupi');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(6);
    this.setActive(false);
    this.setVisible(false);
  }

  spawn(x: number, y: number, id: EmblemId, textureKey: string): void {
    this.emblemId = id;
    this.setTexture(textureKey);
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.setScale(1.1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setCircle(12);
    body.reset(x, y);
    body.setVelocity(0, 0);
  }

  deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
  }
}
