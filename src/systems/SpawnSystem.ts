import Phaser from 'phaser';
import type { EnemyType } from '../data/types';
import { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/GameConfig';

export class SpawnSystem {
  private scene: Phaser.Scene;
  private player: Player;
  enemies: Phaser.Physics.Arcade.Group;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private elapsed = 0;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    private readonly onEncounter?: (type: EnemyType) => void,
  ) {
    this.scene = scene;
    this.player = player;
    this.enemies = scene.physics.add.group({
      classType: Enemy,
      maxSize: 200,
      runChildUpdate: false,
    });
  }

  start(): void {
    this.elapsed = 0;
    this.spawnTimer = this.scene.time.addEvent({
      delay: 800,
      loop: true,
      callback: () => this.tick(),
    });
  }

  update(delta: number): void {
    this.elapsed += delta;
    const children = this.enemies.getChildren() as Enemy[];
    for (const enemy of children) {
      if (enemy.active) enemy.chase(this.player);
    }
  }

  private tick(): void {
    if (!this.player.active || this.player.isDead()) return;

    const minutes = this.elapsed / 60000;
    const batch = Math.min(1 + Math.floor(minutes * 2), 6);

    for (let i = 0; i < batch; i++) {
      this.spawnOne();
    }
  }

  private spawnOne(): void {
    const type = this.pickType();
    const pos = this.spawnPositionOutsideCamera();
    const enemy = this.enemies.get() as Enemy | null;
    if (!enemy) return;
    enemy.spawn(pos.x, pos.y, type);
    this.onEncounter?.(type);
  }

  private pickType(): EnemyType {
    const t = this.elapsed / 1000;
    const roll = Math.random();
    if (t < 30) {
      return roll < 0.7 ? 'fast' : 'normal';
    }
    if (t < 90) {
      if (roll < 0.4) return 'fast';
      if (roll < 0.85) return 'normal';
      return 'tank';
    }
    if (roll < 0.25) return 'fast';
    if (roll < 0.65) return 'normal';
    return 'tank';
  }

  private spawnPositionOutsideCamera(): { x: number; y: number } {
    const cam = this.scene.cameras.main;
    const margin = 80;
    const side = Phaser.Math.Between(0, 3);
    let x = 0;
    let y = 0;

    switch (side) {
      case 0: // top
        x = Phaser.Math.Between(cam.worldView.left - margin, cam.worldView.right + margin);
        y = cam.worldView.top - margin;
        break;
      case 1: // bottom
        x = Phaser.Math.Between(cam.worldView.left - margin, cam.worldView.right + margin);
        y = cam.worldView.bottom + margin;
        break;
      case 2: // left
        x = cam.worldView.left - margin;
        y = Phaser.Math.Between(cam.worldView.top - margin, cam.worldView.bottom + margin);
        break;
      default: // right
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
