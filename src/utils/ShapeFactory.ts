import Phaser from 'phaser';
import { COLORS } from '../config/GameConfig';

export class ShapeFactory {
  static createAll(scene: Phaser.Scene): void {
    this.circle(scene, 'player', 28, COLORS.player);
    this.circle(scene, 'enemy_fast', 18, COLORS.enemyFast);
    this.circle(scene, 'enemy_normal', 24, COLORS.enemyNormal);
    this.circle(scene, 'enemy_tank', 36, COLORS.enemyTank);
    this.circle(scene, 'projectile', 10, COLORS.projectile);
    this.hexagon(scene, 'xp_orb', 12, COLORS.xpOrb);
    this.circle(scene, 'dog_companion', 18, 0x9aa0a6);
    this.hut(scene, 'hut', 80, 64);
    this.rect(scene, 'ground_tile', 64, 64, COLORS.grass);
  }

  private static circle(
    scene: Phaser.Scene,
    key: string,
    diameter: number,
    color: number,
  ): void {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 });
    const r = diameter / 2;
    g.fillStyle(color, 1);
    g.fillCircle(r, r, r);
    g.lineStyle(2, 0xffffff, 0.25);
    g.strokeCircle(r, r, r - 1);
    g.generateTexture(key, diameter, diameter);
    g.destroy();
  }

  private static hexagon(
    scene: Phaser.Scene,
    key: string,
    size: number,
    color: number,
  ): void {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 });
    const cx = size;
    const cy = size;
    const r = size * 0.9;
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = Phaser.Math.DegToRad(60 * i - 30);
      points.push(new Phaser.Math.Vector2(cx + r * Math.cos(angle), cy + r * Math.sin(angle)));
    }
    g.fillStyle(color, 1);
    g.fillPoints(points, true);
    g.generateTexture(key, size * 2, size * 2);
    g.destroy();
  }

  private static rect(
    scene: Phaser.Scene,
    key: string,
    w: number,
    h: number,
    color: number,
  ): void {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    g.lineStyle(1, 0x000000, 0.15);
    g.strokeRect(0.5, 0.5, w - 1, h - 1);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private static hut(scene: Phaser.Scene, key: string, w: number, h: number): void {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 });
    // Body
    g.fillStyle(COLORS.hut, 1);
    g.fillRect(8, h * 0.35, w - 16, h * 0.65);
    // Roof
    g.fillStyle(COLORS.hutRoof, 1);
    g.fillTriangle(0, h * 0.4, w / 2, 0, w, h * 0.4);
    // Door
    g.fillStyle(0x2a1a0e, 1);
    g.fillRect(w / 2 - 10, h - 28, 20, 28);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
