import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';

export class WeaponSystem {
  private scene: Phaser.Scene;
  private player: Player;
  projectiles: Phaser.Physics.Arcade.Group;
  private fireTimer?: Phaser.Time.TimerEvent;
  private currentDelay = 400;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    this.projectiles = scene.physics.add.group({
      classType: Projectile,
      maxSize: 120,
      runChildUpdate: true,
    });
  }

  start(): void {
    this.currentDelay = this.player.stats.fireRate;
    this.scheduleFire();
  }

  /** Call when fireRate changes (e.g. after upgrade) */
  refreshRate(): void {
    if (this.player.stats.fireRate === this.currentDelay) return;
    this.currentDelay = this.player.stats.fireRate;
    this.fireTimer?.remove(false);
    this.scheduleFire();
  }

  private scheduleFire(): void {
    this.fireTimer = this.scene.time.addEvent({
      delay: this.currentDelay,
      loop: true,
      callback: () => this.fire(),
    });
  }

  private fire(): void {
    if (!this.player.active || this.player.isDead()) return;

    const pointer = this.scene.input.activePointer;
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      worldPoint.x,
      worldPoint.y,
    );

    const proj = this.projectiles.get(
      this.player.x,
      this.player.y,
      'projectile',
    ) as Projectile | null;

    if (!proj) return;
    proj.fire(
      this.player.x,
      this.player.y,
      angle,
      this.player.stats.projectileSpeed,
      this.player.stats.damage,
    );
  }

  destroy(): void {
    this.fireTimer?.remove(false);
  }
}
