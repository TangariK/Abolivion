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
  private sideShotRight = false;
  private sideShotLeft = false;
  private getAimAngle: () => number;
  private onShot?: () => void;
  private fireEnabled = true;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    projectiles: Phaser.Physics.Arcade.Group,
    getAimAngle: () => number,
    onShot?: () => void,
  ) {
    this.scene = scene;
    this.player = player;
    this.projectiles = projectiles;
    this.getAimAngle = getAimAngle;
    this.onShot = onShot;
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

  enableSideShotRight(): void {
    this.sideShotRight = true;
  }

  enableSideShotLeft(): void {
    this.sideShotLeft = true;
  }

  setFireEnabled(enabled: boolean): void {
    this.fireEnabled = enabled;
  }

  /** Reagenda o timer de tiro (após pause/upgrade). */
  restartFiring(): void {
    this.fireTimer?.remove(false);
    this.currentDelay = this.player.stats.fireRate;
    this.scheduleFire();
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
    if (!this.fireEnabled) return;
    if (!this.player.active || this.player.isDead() || !this.player.canShoot) return;
    if (this.player.choiceProtected) return;

    const angle = this.getAimAngle();
    this.firePattern(angle);
    if (this.backwardShot) {
      this.spawnProjectile(this.muzzleX(angle + Math.PI), this.muzzleY(angle + Math.PI), angle + Math.PI);
    }
    if (this.sideShotRight) {
      this.spawnProjectile(
        this.muzzleX(angle + Math.PI / 2),
        this.muzzleY(angle + Math.PI / 2),
        angle + Math.PI / 2,
      );
    }
    if (this.sideShotLeft) {
      this.spawnProjectile(
        this.muzzleX(angle - Math.PI / 2),
        this.muzzleY(angle - Math.PI / 2),
        angle - Math.PI / 2,
      );
    }
  }

  private muzzleX(angle: number): number {
    return this.player.x + Math.cos(angle) * 28;
  }

  private muzzleY(angle: number): number {
    return this.player.y + Math.sin(angle) * 28;
  }

  private firePattern(angle: number): void {
    if (!this.parallelShot && !this.diagonalShot) {
      this.spawnProjectile(this.muzzleX(angle), this.muzzleY(angle), angle);
      return;
    }

    if (this.parallelShot) {
      const perpendicular = angle + Math.PI / 2;
      const offsetX = Math.cos(perpendicular) * 10;
      const offsetY = Math.sin(perpendicular) * 10;
      this.spawnProjectile(this.muzzleX(angle) + offsetX, this.muzzleY(angle) + offsetY, angle);
      this.spawnProjectile(this.muzzleX(angle) - offsetX, this.muzzleY(angle) - offsetY, angle);
    }

    if (this.diagonalShot) {
      this.spawnProjectile(this.muzzleX(angle - 0.22), this.muzzleY(angle - 0.22), angle - 0.22);
      this.spawnProjectile(this.muzzleX(angle + 0.22), this.muzzleY(angle + 0.22), angle + 0.22);
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
    this.onShot?.();
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
