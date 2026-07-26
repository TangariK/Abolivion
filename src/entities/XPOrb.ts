import Phaser from 'phaser';

export class XPOrb extends Phaser.Physics.Arcade.Image {
  xpValue = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'xp_orb');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(5);
    this.setActive(false);
    this.setVisible(false);
  }

  spawn(x: number, y: number, xp: number): void {
    this.xpValue = xp;
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.setScale(0.85);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setCircle(8);
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
