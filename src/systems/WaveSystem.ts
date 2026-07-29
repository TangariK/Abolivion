import Phaser from 'phaser';
import { BOSS_DEFS } from '../data/EnemyCatalog';
import type { BossId, EnemyType } from '../data/types';
import { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/GameConfig';
import { shouldPromoteElite } from './EliteScaling';

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

  private singleWave = false;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    hooks: {
      onEncounter: (type: EnemyType) => void;
      onBossSpawn: (id: BossId) => void;
      onWaveCleared: (wave: number) => void;
    },
    options?: { startWave?: number; singleWave?: boolean },
  ) {
    this.scene = scene;
    this.player = player;
    this.onEncounter = hooks.onEncounter;
    this.onBossSpawn = hooks.onBossSpawn;
    this.onWaveCleared = hooks.onWaveCleared;
    if (options?.startWave && options.startWave > 1) this.wave = options.startWave - 1;
    this.singleWave = options?.singleWave ?? false;
    this.enemies = scene.physics.add.group({
      classType: Enemy,
      maxSize: 360,
      runChildUpdate: false,
    });
  }

  start(): void {
    this.beginNextWave();
  }

  update(delta: number): void {
    if (!this.enemies) return;
    if (this.phase === 'break') {
      this.intermissionMs -= delta;
      if (this.intermissionMs <= 0) this.beginNextWave();
      return;
    }

    if (this.phase !== 'combat') return;

    let children: Enemy[] = [];
    try {
      if (!this.enemies.children) return;
      children = this.enemies.getChildren() as Enemy[];
    } catch {
      return;
    }
    this.remaining = children.filter((e) => e.active).length;
    if (
      this.remaining <= 0
      && this.totalInWave > 0
      && this.scene.time.now - this.combatStartedAt > 250
    ) {
      const cleared = this.wave;
      this.phase = this.singleWave ? 'idle' : 'break';
      this.intermissionMs = 5000;
      this.activeBossId = undefined;
      this.onWaveCleared(cleared);
    }
  }

  notifyKill(): void {}

  spawnExtra(type: EnemyType, at?: { x: number; y: number }): void {
    if (!this.enemies?.children) return;
    let enemy: Enemy | null = null;
    try {
      enemy = this.enemies.get() as Enemy | null;
    } catch {
      return;
    }
    if (!enemy) return;
    const pos = at ?? this.spawnPositionOutsideCamera();
    enemy.spawn(pos.x, pos.y, type);
    if (shouldPromoteElite(this.wave)) enemy.promoteElite();
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
    if (this.wave === 30) {
      this.spawnBoss('wolf_king');
      return;
    }
    if (this.wave === 40) {
      this.spawnBoss('poisoner_master');
      return;
    }
    if (this.wave === 50) {
      this.spawnBoss('acrobat_leap');
      return;
    }

    const count = Math.min(8 + this.wave * 3, 78);
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
    const near = type.startsWith('camo_') && Math.random() < 0.85;
    const pos = near ? this.spawnNearPlayer() : this.spawnPositionOutsideCamera();
    const enemy = this.enemies.get() as Enemy | null;
    if (!enemy) return false;
    enemy.spawn(pos.x, pos.y, type);
    if (shouldPromoteElite(this.wave)) enemy.promoteElite();
    this.onEncounter(type);
    return true;
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
    const w = this.wave;
    const roll = Math.random();

    if (w <= 2) {
      return roll < 0.7 ? 'fast' : 'normal';
    }
    if (w <= 4) {
      if (roll < 0.38) return 'fast';
      if (roll < 0.6) return 'normal';
      if (roll < 0.75) return 'swift';
      if (roll < 0.88) return 'bruiser';
      if (roll < 0.95) return 'backstabber';
      return 'dire_wolf_pup';
    }
    if (w <= 8) {
      if (roll < 0.18) return 'fast';
      if (roll < 0.3) return 'swift';
      if (roll < 0.42) return 'normal';
      if (roll < 0.54) return 'armored';
      if (roll < 0.64) return 'bruiser';
      if (roll < 0.72) return 'tank';
      if (roll < 0.8) return 'poisoner';
      if (roll < 0.88) return 'dire_wolf';
      if (roll < 0.94) return 'backstabber';
      return 'camo_normal';
    }
    if (roll < 0.1) return 'fast';
    if (roll < 0.2) return 'swift';
    if (roll < 0.3) return 'normal';
    if (roll < 0.4) return 'armored';
    if (roll < 0.5) return 'bruiser';
    if (roll < 0.58) return 'tank';
    if (roll < 0.66) return 'dire_wolf';
    if (roll < 0.72) return 'dire_wolf_brute';
    if (roll < 0.76) return 'dire_wolf_pup';
    if (roll < 0.82) return 'backstabber';
    if (roll < 0.86) return 'camo_normal';
    if (roll < 0.89) return 'camo_blade';
    if (roll < 0.92) return 'camo_poison';
    if (roll < 0.94) return 'camo_toxic_blade';
    if (roll < 0.97) return 'lethargy_spitter';
    if (roll < 0.99) return 'lethargy_brute';
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

  destroy(): void {}
}
