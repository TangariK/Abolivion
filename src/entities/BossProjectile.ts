import Phaser from 'phaser';

export class BossProjectile extends Phaser.Physics.Arcade.Image {
  damage = 12;
  lifespan = 0;
  /** Poção do Envenenador Master */
  isPoisonPotion = false;
  private landX = 0;
  private landY = 0;
  private onLand?: (x: number, y: number, hitPlayer: boolean) => void;
  private landed = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'boss_shot');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(9);
    this.setActive(false);
    this.setVisible(false);
  }

  fire(x: number, y: number, angle: number, speed: number, damage: number): void {
    this.isPoisonPotion = false;
    this.onLand = undefined;
    this.landed = false;
    this.damage = damage;
    this.lifespan = 2800;
    this.setTexture('boss_shot');
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.setRotation(angle);
    this.clearTint();

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(x, y);
    body.setCircle(6);
    this.scene.physics.velocityFromRotation(angle, speed, body.velocity);
  }

  /** Poção arremessada até (tx, ty); ao chegar (ou expirar) cria poça. */
  firePoison(
    x: number,
    y: number,
    tx: number,
    ty: number,
    speed: number,
    damage: number,
    onLand: (x: number, y: number, hitPlayer: boolean) => void,
  ): void {
    this.isPoisonPotion = true;
    this.onLand = onLand;
    this.landed = false;
    this.landX = tx;
    this.landY = ty;
    this.damage = damage;
    this.lifespan = 3000;
    this.setTexture('poison_shot');
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.setTint(0xa8f070);
    const angle = Phaser.Math.Angle.Between(x, y, tx, ty);
    this.setRotation(angle);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(x, y);
    body.setCircle(7);
    this.scene.physics.velocityFromRotation(angle, speed, body.velocity);
  }

  update(_time: number, delta: number): void {
    if (!this.active) return;
    this.lifespan -= delta;
    if (this.isPoisonPotion) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.landX, this.landY);
      if (d < 28 || this.lifespan <= 0) {
        this.land(false);
        return;
      }
    } else if (this.lifespan <= 0) {
      this.deactivate();
    }
  }

  /** Acerto em jogador: ainda cria poça no local. */
  landOnPlayer(px: number, py: number): void {
    if (!this.isPoisonPotion) {
      this.deactivate();
      return;
    }
    this.land(true, px, py);
  }

  private land(hitPlayer: boolean, x = this.x, y = this.y): void {
    if (this.landed) return;
    this.landed = true;
    const cb = this.onLand;
    this.deactivate();
    cb?.(x, y, hitPlayer);
  }

  deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
    this.setVelocity(0, 0);
    this.clearTint();
    this.isPoisonPotion = false;
    this.onLand = undefined;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
  }
}
