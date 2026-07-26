import Phaser from 'phaser';
import { PLAYER_BASE } from '../config/GameConfig';
import type { PlayerStats } from '../data/types';

export type MoveKeys = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  stats: PlayerStats;
  readonly playerIndex: 1 | 2;
  aimAngle = 0;
  private invulnerableUntil = 0;
  private moveVec = new Phaser.Math.Vector2();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    stats: PlayerStats,
    playerIndex: 1 | 2 = 1,
  ) {
    super(scene, x, y, playerIndex === 1 ? 'player' : 'player2');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.playerIndex = playerIndex;
    this.stats = { ...stats };
    this.setDepth(10);
    this.setCollideWorldBounds(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(PLAYER_BASE.radius);
  }

  updateMovement(dirs: MoveKeys): void {
    if (this.isDead()) {
      this.setVelocity(0, 0);
      return;
    }

    this.moveVec.set(0, 0);
    if (dirs.left) this.moveVec.x -= 1;
    if (dirs.right) this.moveVec.x += 1;
    if (dirs.up) this.moveVec.y -= 1;
    if (dirs.down) this.moveVec.y += 1;

    if (this.moveVec.lengthSq() > 0) {
      this.moveVec.normalize().scale(this.stats.speed);
    }

    this.setVelocity(this.moveVec.x, this.moveVec.y);
  }

  setAimAngle(angle: number): void {
    this.aimAngle = angle;
  }

  takeDamage(amount: number, now: number): boolean {
    if (this.isDead()) return false;
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
    this.setAlpha(1);
    this.scene.time.delayedCall(500, () => {
      if (this.active) this.clearTint();
    });
  }

  applyUpgrade(fn: (stats: PlayerStats) => void): void {
    fn(this.stats);
  }

  syncStatsFrom(source: PlayerStats): void {
    const hpRatio = this.stats.maxHp > 0 ? this.stats.hp / this.stats.maxHp : 1;
    this.stats = {
      ...source,
      hp: Math.min(source.maxHp, Math.max(1, Math.floor(source.maxHp * hpRatio))),
    };
  }
}
