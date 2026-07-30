import Phaser from 'phaser';

/** Bastão-torreta do Boitatá — atira em linha no player. */
export class BossTurret extends Phaser.Physics.Arcade.Sprite {
  private static nextNetId = 900000;
  netId = 0;
  hp = 80;
  maxHp = 80;
  nextShot = 0;
  ownerBossNetId = 0;
  contactDamage = 16;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'boss_turret');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(7);
    this.setActive(false);
    this.setVisible(false);
  }

  spawn(x: number, y: number, ownerNetId: number): void {
    this.ownerBossNetId = ownerNetId;
    this.netId = BossTurret.nextNetId++;
    this.hp = 80;
    this.maxHp = 80;
    this.nextShot = 0;
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.clearTint();
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setImmovable(true);
    body.setCircle(14);
    body.reset(x, y);
    body.setVelocity(0, 0);
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (this.active) this.clearTint();
    });
    return this.hp <= 0;
  }

  deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
  }
}
