import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';

export class WeaponSystem {
  private scene: Phaser.Scene;
  private player: Player;
  projectiles: Phaser.Physics.Arcade.Group;
  private fireTimer?: Phaser.Time.TimerEvent;
  private currentDelay = 400;
  private parallelShot = false;
  private diagonalShot = false;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    this.projectiles = scene.physics.add.group({
      classType: Projectile,
      maxSize: 240,
      runChildUpdate: true,
    });
  }

  enableParallelShot(): void {
    this.parallelShot = true;
  }

  enableDiagonalShot(): void {
    this.diagonalShot = true;
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

    if (!this.parallelShot && !this.diagonalShot) {
      this.spawnProjectile(this.player.x, this.player.y, angle);
      return;
    }

    if (this.parallelShot) {
      const perpendicular = angle + Math.PI / 2;
      const offsetX = Math.cos(perpendicular) * 10;
      const offsetY = Math.sin(perpendicular) * 10;
      this.spawnProjectile(this.player.x + offsetX, this.player.y + offsetY, angle);
      this.spawnProjectile(this.player.x - offsetX, this.player.y - offsetY, angle);
    }

    if (this.diagonalShot) {
      this.spawnProjectile(this.player.x, this.player.y, angle - 0.22);
      this.spawnProjectile(this.player.x, this.player.y, angle + 0.22);
    }
  }

  private spawnProjectile(x: number, y: number, angle: number): void {
    const projectile = this.projectiles.get(x, y, 'projectile') as Projectile | null;
    if (!projectile) return;
    projectile.fire(
      x,
      y,
      angle,
      this.player.stats.projectileSpeed,
      this.player.stats.damage,
    );
  }

  destroy(): void {
    this.fireTimer?.remove(false);
  }
}
