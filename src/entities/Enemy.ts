import Phaser from 'phaser';
import { COLORS } from '../config/GameConfig';
import type { EnemyDef, EnemyType } from '../data/types';

export const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  fast: {
    type: 'fast',
    hp: 20,
    speed: 140,
    damage: 8,
    xp: 1,
    radius: 9,
    color: COLORS.enemyFast,
    textureKey: 'enemy_fast',
  },
  normal: {
    type: 'normal',
    hp: 40,
    speed: 90,
    damage: 12,
    xp: 2,
    radius: 12,
    color: COLORS.enemyNormal,
    textureKey: 'enemy_normal',
  },
  tank: {
    type: 'tank',
    hp: 120,
    speed: 55,
    damage: 20,
    xp: 5,
    radius: 18,
    color: COLORS.enemyTank,
    textureKey: 'enemy_tank',
  },
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  enemyType: EnemyType = 'normal';
  hp = 40;
  maxHp = 40;
  moveSpeed = 90;
  contactDamage = 12;
  xpValue = 2;

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
    this.enemyType = type;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.moveSpeed = def.speed;
    this.contactDamage = def.damage;
    this.xpValue = def.xp;

    this.setTexture(def.textureKey);
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.clearTint();

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setCircle(def.radius);
    body.reset(x, y);
  }

  chase(target: Phaser.GameObjects.GameObject): void {
    if (!this.active) return;
    this.scene.physics.moveToObject(this, target, this.moveSpeed);
  }

  takeDamage(amount: number): boolean {
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
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
  }
}
