import Phaser from 'phaser';
import { COLORS } from '../config/GameConfig';

export class ShapeFactory {
  static createAll(scene: Phaser.Scene): void {
    this.circle(scene, 'player', 28, COLORS.player);
    this.circle(scene, 'player2', 28, 0x5ce0a0);
    this.circle(scene, 'enemy_fast', 18, COLORS.enemyFast);
    this.circle(scene, 'enemy_normal', 24, COLORS.enemyNormal);
    this.circle(scene, 'enemy_tank', 36, COLORS.enemyTank);
    this.circle(scene, 'enemy_armored', 28, 0x7a8a9a);
    this.circle(scene, 'enemy_swift', 14, 0xff8a6a);
    this.circle(scene, 'enemy_bruiser', 30, 0xa31818);
    this.circle(scene, 'projectile', 10, COLORS.projectile);
    this.circle(scene, 'boss_shot', 12, 0xff6b2d);
    this.hexagon(scene, 'xp_orb', 12, COLORS.xpOrb);
    this.circle(scene, 'dog_companion', 18, 0x9aa0a6);
    this.boss(scene, 'boss_kurupi', 72, 0x5c2a1a);
    this.boss(scene, 'boss_boitata', 64, 0xd45500);
    this.amuletIcon(scene, 'amulet_araci', COLORS.accent, 'parallel');
    this.amuletIcon(scene, 'amulet_jaci', 0xd4a017, 'diagonal');
    this.amuletIcon(scene, 'amulet_anhanga', 0x8f6b3a, 'ring');
    this.amuletIcon(scene, 'amulet_tupa', 0xe8c84a, 'bolt');
    this.amuletIcon(scene, 'amulet_guara', 0x9aa0a6, 'paw');
    this.amuletIcon(scene, 'amulet_yara', 0x6ec8ff, 'drop');
    this.amuletIcon(scene, 'amulet_cuca', 0xc45a3a, 'thorn');
    this.amuletIcon(scene, 'amulet_caipora', 0xb8d44a, 'echo');
    this.amuletIcon(scene, 'amulet_storm', 0x7ec8ff, 'storm');
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

  private static boss(
    scene: Phaser.Scene,
    key: string,
    size: number,
    color: number,
  ): void {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 });
    const r = size / 2;
    g.fillStyle(color, 1);
    g.fillCircle(r, r, r);
    g.lineStyle(4, COLORS.accent, 0.9);
    g.strokeCircle(r, r, r - 2);
    g.fillStyle(0xffe8a3, 0.85);
    g.fillCircle(r - size * 0.18, r - size * 0.1, size * 0.08);
    g.fillCircle(r + size * 0.18, r - size * 0.1, size * 0.08);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private static amuletIcon(
    scene: Phaser.Scene,
    key: string,
    color: number,
    motif: 'parallel' | 'diagonal' | 'ring' | 'bolt' | 'paw' | 'drop' | 'thorn' | 'echo' | 'storm',
  ): void {
    if (scene.textures.exists(key)) return;
    const size = 96;
    const cx = size / 2;
    const cy = size / 2;
    const g = scene.make.graphics({ x: 0, y: 0 });

    g.fillStyle(color, 1);
    g.fillCircle(cx, cy, 42);
    g.lineStyle(4, 0xffe8a3, 1);
    g.strokeCircle(cx, cy, 42);

    g.fillStyle(0x0d1a12, 0.92);
    g.lineStyle(3, 0x0d1a12, 1);

    switch (motif) {
      case 'parallel':
        g.fillRect(cx - 18, cy - 16, 8, 32);
        g.fillRect(cx + 10, cy - 16, 8, 32);
        break;
      case 'diagonal':
        g.lineStyle(5, 0x0d1a12, 1);
        g.lineBetween(cx - 16, cy - 16, cx + 16, cy + 16);
        g.lineBetween(cx + 16, cy - 16, cx - 16, cy + 16);
        break;
      case 'ring':
        g.lineStyle(6, 0x0d1a12, 1);
        g.strokeCircle(cx, cy, 18);
        break;
      case 'bolt':
        g.fillTriangle(cx + 2, cy - 22, cx - 12, cy + 2, cx + 2, cy + 2);
        g.fillTriangle(cx - 2, cy - 2, cx + 12, cy - 2, cx - 2, cy + 22);
        break;
      case 'paw':
        g.fillCircle(cx, cy + 6, 12);
        g.fillCircle(cx - 14, cy - 8, 7);
        g.fillCircle(cx + 14, cy - 8, 7);
        g.fillCircle(cx - 4, cy - 16, 6);
        g.fillCircle(cx + 4, cy - 16, 6);
        break;
      case 'drop':
        g.fillTriangle(cx, cy - 20, cx - 14, cy + 4, cx + 14, cy + 4);
        g.fillCircle(cx, cy + 8, 14);
        break;
      case 'thorn':
        g.fillTriangle(cx, cy - 22, cx - 10, cy + 8, cx + 10, cy + 8);
        g.fillTriangle(cx - 18, cy - 4, cx - 4, cy + 18, cx - 10, cy + 4);
        g.fillTriangle(cx + 18, cy - 4, cx + 4, cy + 18, cx + 10, cy + 4);
        break;
      case 'echo':
        g.fillCircle(cx, cy - 14, 7);
        g.fillCircle(cx, cy + 14, 7);
        g.lineStyle(4, 0x0d1a12, 1);
        g.lineBetween(cx, cy - 6, cx, cy + 6);
        break;
      case 'storm':
        g.fillTriangle(cx - 4, cy - 24, cx - 16, cy + 2, cx + 2, cy + 2);
        g.fillTriangle(cx + 2, cy - 4, cx + 16, cy - 4, cx - 2, cy + 24);
        g.fillStyle(0xffe8a3, 0.9);
        g.fillCircle(cx + 18, cy - 18, 5);
        g.fillCircle(cx - 20, cy + 10, 4);
        break;
    }

    g.generateTexture(key, size, size);
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
    g.fillStyle(COLORS.hut, 1);
    g.fillRect(8, h * 0.35, w - 16, h * 0.65);
    g.fillStyle(COLORS.hutRoof, 1);
    g.fillTriangle(0, h * 0.4, w / 2, 0, w, h * 0.4);
    g.fillStyle(0x2a1a0e, 1);
    g.fillRect(w / 2 - 10, h - 28, 20, 28);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
