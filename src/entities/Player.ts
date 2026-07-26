import Phaser from 'phaser';
import { PLAYER_BASE } from '../config/GameConfig';
import type { PlayerStats } from '../data/types';

export class Player extends Phaser.Physics.Arcade.Sprite {
  stats: PlayerStats;
  private invulnerableUntil = 0;
  private moveVec = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene, x: number, y: number, stats: PlayerStats) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.stats = { ...stats };
    this.setDepth(10);
    this.setCollideWorldBounds(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(PLAYER_BASE.radius);
  }

  updateMovement(keys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    UP: Phaser.Input.Keyboard.Key;
    LEFT: Phaser.Input.Keyboard.Key;
    DOWN: Phaser.Input.Keyboard.Key;
    RIGHT: Phaser.Input.Keyboard.Key;
  }): void {
    this.moveVec.set(0, 0);
    if (keys.A.isDown || keys.LEFT.isDown) this.moveVec.x -= 1;
    if (keys.D.isDown || keys.RIGHT.isDown) this.moveVec.x += 1;
    if (keys.W.isDown || keys.UP.isDown) this.moveVec.y -= 1;
    if (keys.S.isDown || keys.DOWN.isDown) this.moveVec.y += 1;

    if (this.moveVec.lengthSq() > 0) {
      this.moveVec.normalize().scale(this.stats.speed);
    }

    this.setVelocity(this.moveVec.x, this.moveVec.y);
  }

  takeDamage(amount: number, now: number): boolean {
    if (now < this.invulnerableUntil) return false;
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.invulnerableUntil = now + 500;
    this.setTint(0xff8888);
    this.scene.time.delayedCall(120, () => {
      if (this.active) this.clearTint();
    });
    return true;
  }

  regenerate(amount: number): void {
    if (this.stats.hp <= 0) return;
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
  }

  isDead(): boolean {
    return this.stats.hp <= 0;
  }

  revive(now: number): void {
    this.stats.hp = Math.max(1, Math.floor(this.stats.maxHp * 0.5));
    this.invulnerableUntil = now + 2000;
    this.setTint(0xf4d77b);
    this.scene.time.delayedCall(500, () => {
      if (this.active) this.clearTint();
    });
  }

  applyUpgrade(fn: (stats: PlayerStats) => void): void {
    fn(this.stats);
  }
}
