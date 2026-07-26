import Phaser from 'phaser';
import type { Enemy } from '../entities/Enemy';
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
  private backwardShot = false;
  private getAimAngle: () => number;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    projectiles: Phaser.Physics.Arcade.Group,
    getAimAngle: () => number,
  ) {
    this.scene = scene;
    this.player = player;
    this.projectiles = projectiles;
    this.getAimAngle = getAimAngle;
  }

  enableParallelShot(): void {
    this.parallelShot = true;
  }

  enableDiagonalShot(): void {
    this.diagonalShot = true;
  }

  enableBackwardShot(): void {
    this.backwardShot = true;
  }

  start(): void {
    this.currentDelay = this.player.stats.fireRate;
    this.scheduleFire();
  }

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

    const angle = this.getAimAngle();
    this.firePattern(angle);
    if (this.backwardShot) {
      this.spawnProjectile(this.player.x, this.player.y, angle + Math.PI);
    }
  }

  private firePattern(angle: number): void {
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

  /** Auto-aim helper for player 2 */
  static aimAtNearest(player: Player, enemies: Phaser.Physics.Arcade.Group): number {
    let best: Enemy | undefined;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const enemy of enemies.getChildren() as Enemy[]) {
      if (!enemy.active) continue;
      const d = Phaser.Math.Distance.Squared(player.x, player.y, enemy.x, enemy.y);
      if (d < bestDist) {
        bestDist = d;
        best = enemy;
      }
    }
    if (!best) return player.aimAngle;
    return Phaser.Math.Angle.Between(player.x, player.y, best.x, best.y);
  }

  destroy(): void {
    this.fireTimer?.remove(false);
  }
}
