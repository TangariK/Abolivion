import Phaser from 'phaser';
import { ENEMY_DEFS } from '../data/EnemyCatalog';
import type { BossId, EnemyType } from '../data/types';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  enemyType: EnemyType | 'boss' = 'normal';
  bossId?: BossId;
  hp = 40;
  maxHp = 40;
  armor = 0;
  moveSpeed = 90;
  contactDamage = 12;
  xpValue = 2;
  isBoss = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy_normal');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(8);
    this.setActive(false);
    this.setVisible(false);
  }

  spawn(x: number, y: number, type: EnemyType): void {
    const def = ENEMY_DEFS[type];
    this.isBoss = false;
    this.bossId = undefined;
    this.enemyType = type;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.armor = def.armor ?? 0;
    this.moveSpeed = def.speed;
    this.contactDamage = def.damage;
    this.xpValue = def.xp;

    this.setTexture(def.textureKey);
    this.setScale(1);
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.clearTint();
    if (this.armor > 0) this.setTint(0xb0c4d8);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setCircle(def.radius);
    body.reset(x, y);
  }

  spawnBoss(
    x: number,
    y: number,
    boss: {
      id: BossId;
      textureKey: string;
      hp: number;
      speed: number;
      damage: number;
      xp: number;
      radius: number;
    },
  ): void {
    this.isBoss = true;
    this.bossId = boss.id;
    this.enemyType = 'boss';
    this.hp = boss.hp;
    this.maxHp = boss.hp;
    this.armor = 0;
    this.moveSpeed = boss.speed;
    this.contactDamage = boss.damage;
    this.xpValue = boss.xp;

    this.setTexture(boss.textureKey);
    this.setScale(1);
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.clearTint();

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setCircle(boss.radius);
    body.reset(x, y);
  }

  chase(target: Phaser.GameObjects.GameObject): void {
    if (!this.active) return;
    this.scene.physics.moveToObject(this, target, this.moveSpeed);
  }

  takeDamage(amount: number): boolean {
    if (this.armor > 0) {
      this.armor -= amount;
      this.setTint(0xe8f0ff);
      this.scene.time.delayedCall(60, () => {
        if (!this.active) return;
        if (this.armor > 0) this.setTint(0xb0c4d8);
        else this.clearTint();
      });
      if (this.armor > 0) return false;

      // Armor broken → becomes a normal-ish fighter
      this.armor = 0;
      const normal = ENEMY_DEFS.normal;
      this.enemyType = 'normal';
      this.hp = normal.hp;
      this.maxHp = normal.hp;
      this.moveSpeed = normal.speed;
      this.contactDamage = normal.damage;
      this.xpValue = Math.max(this.xpValue, normal.xp);
      this.setTexture(normal.textureKey);
      this.clearTint();
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setCircle(normal.radius);
      return false;
    }

    this.hp -= amount;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (this.active) this.clearTint();
    });
    return this.hp <= 0;
  }

  deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
    this.setVelocity(0, 0);
    this.isBoss = false;
    this.bossId = undefined;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
  }
}
