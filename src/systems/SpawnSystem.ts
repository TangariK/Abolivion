import Phaser from 'phaser';
import type { EnemyType } from '../data/types';
import { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/GameConfig';
import { eliteChanceFromElapsedMs, shouldPromoteElite } from './EliteScaling';
import { intelFromElapsedMs } from './EnemyFlankAI';

export class SpawnSystem {
  private scene: Phaser.Scene;
  private player: Player;
  enemies: Phaser.Physics.Arcade.Group;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private elapsed = 0;
  private readonly onEncounter?: (type: EnemyType) => void;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    onEncounter?: (type: EnemyType) => void,
  ) {
    this.scene = scene;
    this.player = player;
    this.onEncounter = onEncounter;
    this.enemies = scene.physics.add.group({
      classType: Enemy,
      maxSize: 360,
      runChildUpdate: false,
    });
  }

  getElapsed(): number {
    return this.elapsed;
  }

  seedElapsed(ms: number): void {
    this.elapsed = Math.max(0, ms);
  }

  start(): void {
    this.spawnTimer = this.scene.time.addEvent({
      delay: 750,
      loop: true,
      callback: () => this.tick(),
    });
  }

  update(delta: number): void {
    this.elapsed += delta;
  }

  softCap(): number {
    const minutes = this.elapsed / 60000;
    return Math.min(140, Math.floor(40 + minutes * 18));
  }

  activeCount(): number {
    return (this.enemies.getChildren() as Enemy[]).filter((e) => e.active).length;
  }

  private tick(): void {
    if (!this.player.active || this.player.isDead()) return;

    const minutes = this.elapsed / 60000;
    const batch = Math.min(1 + Math.floor(minutes * 2.2), 8);
    const cap = this.softCap();

    for (let i = 0; i < batch; i++) {
      if (this.activeCount() >= cap) break;
      this.spawnOne();
    }
  }

  private spawnOne(): void {
    const type = this.pickType();
    const nearPlayer = this.shouldSpawnNear(type);
    const pos = nearPlayer
      ? this.spawnNearPlayer()
      : this.spawnPositionOutsideCamera();
    const enemy = this.enemies.get() as Enemy | null;
    if (!enemy) return;
    enemy.spawn(pos.x, pos.y, type);
    if (shouldPromoteElite(eliteChanceFromElapsedMs(this.elapsed), 'chance')) {
      enemy.promoteElite();
    }
    if (this.elapsed >= 900_000 && Math.random() < 0.3) {
      enemy.promoteArmoredVariant();
    }
    this.onEncounter?.(type);
  }

  private shouldSpawnNear(type: EnemyType): boolean {
    if (type.startsWith('camo_')) return Math.random() < 0.92;
    if (this.elapsed < 100_000) return false;
    const intel = intelFromElapsedMs(this.elapsed);
    return Math.random() < 0.15 + intel * 0.35;
  }

  private spawnNearPlayer(): { x: number; y: number } {
    const angle = Math.random() * Math.PI * 2;
    const dist = Phaser.Math.Between(70, 140);
    let x = this.player.x + Math.cos(angle) * dist;
    let y = this.player.y + Math.sin(angle) * dist;
    x = Phaser.Math.Clamp(x, 40, WORLD_WIDTH - 40);
    y = Phaser.Math.Clamp(y, 40, WORLD_HEIGHT - 40);
    return { x, y };
  }

  private pickType(): EnemyType {
    const t = this.elapsed / 1000;
    const roll = Math.random();
    if (t < 25) {
      return roll < 0.65 ? 'fast' : 'normal';
    }
    if (t < 55) {
      if (roll < 0.28) return 'fast';
      if (roll < 0.44) return 'swift';
      if (roll < 0.6) return 'normal';
      if (roll < 0.72) return 'bruiser';
      if (roll < 0.82) return 'dire_wolf';
      if (roll < 0.9) return 'backstabber';
      return 'poisoner';
    }
    if (t < 100) {
      if (roll < 0.12) return 'fast';
      if (roll < 0.24) return 'swift';
      if (roll < 0.34) return 'normal';
      if (roll < 0.44) return 'armored';
      if (roll < 0.54) return 'bruiser';
      if (roll < 0.62) return 'tank';
      if (roll < 0.7) return 'dire_wolf';
      if (roll < 0.76) return 'dire_wolf_pup';
      if (roll < 0.82) return 'backstabber';
      if (roll < 0.88) return 'camo_normal';
      if (roll < 0.93) return 'lethargy_spitter';
      return 'poisoner';
    }
    // 15+ min: mix com Escudeiro / mais blindados
    if (t >= 900) {
      if (roll < 0.1) return 'escudeiro';
      if (roll < 0.2) return 'tank';
      if (roll < 0.3) return 'armored';
      if (roll < 0.4) return 'bruiser';
      if (roll < 0.5) return 'dire_wolf_brute';
      if (roll < 0.58) return 'lethargy_brute';
      if (roll < 0.66) return 'poisoner';
      if (roll < 0.74) return 'camo_toxic_blade';
      if (roll < 0.82) return 'backstabber';
      if (roll < 0.9) return 'dire_wolf';
      return 'normal';
    }
    if (roll < 0.08) return 'fast';
    if (roll < 0.16) return 'swift';
    if (roll < 0.26) return 'normal';
    if (roll < 0.36) return 'armored';
    if (roll < 0.44) return 'bruiser';
    if (roll < 0.52) return 'tank';
    if (roll < 0.6) return 'dire_wolf';
    if (roll < 0.66) return 'dire_wolf_brute';
    if (roll < 0.7) return 'dire_wolf_pup';
    if (roll < 0.76) return 'backstabber';
    if (roll < 0.8) return 'camo_normal';
    if (roll < 0.84) return 'camo_blade';
    if (roll < 0.88) return 'camo_poison';
    if (roll < 0.91) return 'camo_toxic_blade';
    if (roll < 0.95) return 'lethargy_spitter';
    if (roll < 0.98) return 'lethargy_brute';
    return 'poisoner';
  }

  private spawnPositionOutsideCamera(): { x: number; y: number } {
    const cam = this.scene.cameras.main;
    const margin = 80;
    const side = Phaser.Math.Between(0, 3);
    let x = 0;
    let y = 0;

    switch (side) {
      case 0:
        x = Phaser.Math.Between(cam.worldView.left - margin, cam.worldView.right + margin);
        y = cam.worldView.top - margin;
        break;
      case 1:
        x = Phaser.Math.Between(cam.worldView.left - margin, cam.worldView.right + margin);
        y = cam.worldView.bottom + margin;
        break;
      case 2:
        x = cam.worldView.left - margin;
        y = Phaser.Math.Between(cam.worldView.top - margin, cam.worldView.bottom + margin);
        break;
      default:
        x = cam.worldView.right + margin;
        y = Phaser.Math.Between(cam.worldView.top - margin, cam.worldView.bottom + margin);
        break;
    }

    x = Phaser.Math.Clamp(x, 40, WORLD_WIDTH - 40);
    y = Phaser.Math.Clamp(y, 40, WORLD_HEIGHT - 40);
    return { x, y };
  }

  destroy(): void {
    this.spawnTimer?.remove(false);
  }
}
