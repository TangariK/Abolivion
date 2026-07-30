import Phaser from 'phaser';

/** Pickup de Resina (Loja da Tribo) — magnetismo menor que XP. */
export class ResinPickup extends Phaser.Physics.Arcade.Image {
  amount = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'resin_orb');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(6);
    this.setActive(false);
    this.setVisible(false);
  }

  spawn(x: number, y: number, amount = 1): void {
    this.amount = amount;
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.setScale(0.9);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setCircle(10);
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
