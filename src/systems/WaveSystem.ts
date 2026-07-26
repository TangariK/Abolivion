import Phaser from 'phaser';
import { BOSS_DEFS } from '../data/EnemyCatalog';
import type { BossId, EnemyType } from '../data/types';
import { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/GameConfig';

export type WavePhase = 'combat' | 'break' | 'idle';

export class WaveSystem {
  wave = 0;
  remaining = 0;
  totalInWave = 0;
  phase: WavePhase = 'idle';
  intermissionMs = 0;
  activeBossId?: BossId;
  private combatStartedAt = 0;

  private scene: Phaser.Scene;
  private player: Player;
  enemies: Phaser.Physics.Arcade.Group;
  private onEncounter: (type: EnemyType) => void;
  private onBossSpawn: (id: BossId) => void;
  private onWaveCleared: (wave: number) => void;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    hooks: {
      onEncounter: (type: EnemyType) => void;
      onBossSpawn: (id: BossId) => void;
      onWaveCleared: (wave: number) => void;
    },
  ) {
    this.scene = scene;
    this.player = player;
    this.onEncounter = hooks.onEncounter;
    this.onBossSpawn = hooks.onBossSpawn;
    this.onWaveCleared = hooks.onWaveCleared;
    this.enemies = scene.physics.add.group({
      classType: Enemy,
      maxSize: 250,
      runChildUpdate: false,
    });
  }

  start(): void {
    this.beginNextWave();
  }

  update(delta: number): void {
    if (this.phase === 'break') {
      this.intermissionMs -= delta;
      if (this.intermissionMs <= 0) this.beginNextWave();
      return;
    }

    if (this.phase !== 'combat') return;

    const children = this.enemies.getChildren() as Enemy[];
    for (const enemy of children) {
      if (!enemy.active) continue;
      enemy.chase(this.player);
    }

    // Sync remaining with live actives (boss summons can increase count)
    this.remaining = children.filter((e) => e.active).length;
    // Ignore the first ~250ms so a failed/slow spawn doesn't instantly clear the wave
    if (
      this.remaining <= 0
      && this.totalInWave > 0
      && this.scene.time.now - this.combatStartedAt > 250
    ) {
      const cleared = this.wave;
      this.phase = 'break';
      this.intermissionMs = 5000;
      this.activeBossId = undefined;
      this.onWaveCleared(cleared);
    }
  }

  notifyKill(): void {
    // remaining is recomputed each update; kept for API clarity
  }

  spawnExtra(type: EnemyType): void {
    const pos = this.spawnPositionOutsideCamera();
    const enemy = this.enemies.get() as Enemy | null;
    if (!enemy) return;
    enemy.spawn(pos.x, pos.y, type);
    this.onEncounter(type);
    this.totalInWave += 1;
  }

  private beginNextWave(): void {
    this.wave += 1;
    this.phase = 'combat';
    this.activeBossId = undefined;
    this.combatStartedAt = this.scene.time.now;

    if (this.wave === 10) {
      this.spawnBoss('kurupi_brood');
      return;
    }
    if (this.wave === 20) {
      this.spawnBoss('boitata_gaze');
      return;
    }

    const count = Math.min(8 + this.wave * 3, 48);
    let spawned = 0;
    for (let i = 0; i < count; i++) {
      if (this.spawnOne()) spawned += 1;
    }
    this.totalInWave = Math.max(spawned, 1);
    this.remaining = spawned;
  }

  private spawnBoss(id: BossId): void {
    const def = BOSS_DEFS[id];
    this.activeBossId = id;
    this.totalInWave = 1;
    this.remaining = 1;
    this.combatStartedAt = this.scene.time.now;
    this.onBossSpawn(id);

    const pos = this.spawnPositionOutsideCamera();
    const enemy = this.enemies.get() as Enemy | null;
    if (!enemy) {
      this.totalInWave = 0;
      this.remaining = 0;
      return;
    }
    enemy.spawnBoss(pos.x, pos.y, def);
  }

  private spawnOne(): boolean {
    const type = this.pickType();
    const pos = this.spawnPositionOutsideCamera();
    const enemy = this.enemies.get() as Enemy | null;
    if (!enemy) return false;
    enemy.spawn(pos.x, pos.y, type);
    this.onEncounter(type);
    return true;
  }

  private pickType(): EnemyType {
    const w = this.wave;
    const roll = Math.random();

    if (w <= 2) {
      return roll < 0.7 ? 'fast' : 'normal';
    }
    if (w <= 4) {
      if (roll < 0.45) return 'fast';
      if (roll < 0.75) return 'normal';
      if (roll < 0.9) return 'swift';
      return 'bruiser';
    }
    if (w <= 8) {
      if (roll < 0.25) return 'fast';
      if (roll < 0.45) return 'swift';
      if (roll < 0.65) return 'normal';
      if (roll < 0.8) return 'armored';
      if (roll < 0.92) return 'bruiser';
      return 'tank';
    }
    // late waves
    if (roll < 0.15) return 'fast';
    if (roll < 0.35) return 'swift';
    if (roll < 0.5) return 'normal';
    if (roll < 0.7) return 'armored';
    if (roll < 0.85) return 'bruiser';
    return 'tank';
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
    // no timers owned
  }
}
