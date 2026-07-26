import Phaser from 'phaser';

export class Projectile extends Phaser.Physics.Arcade.Image {
  damage = 10;
  lifespan = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'projectile');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(9);
    this.setActive(false);
    this.setVisible(false);
  }

  fire(x: number, y: number, angle: number, speed: number, damage: number): void {
    this.damage = damage;
    this.lifespan = 1500;
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.setRotation(angle);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(x, y);
    body.setCircle(5);
    this.scene.physics.velocityFromRotation(angle, speed, body.velocity);
  }

  update(_time: number, delta: number): void {
    if (!this.active) return;
    this.lifespan -= delta;
    if (this.lifespan <= 0) {
      this.deactivate();
    }
  }

  deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
    this.setVelocity(0, 0);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
  }
}
