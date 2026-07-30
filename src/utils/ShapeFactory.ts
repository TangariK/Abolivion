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
    this.circle(scene, 'enemy_poisoner', 26, 0x5a9a3a);
    this.wolf(scene, 'enemy_dire_wolf', 26, 0x4a3a3a);
    this.wolf(scene, 'enemy_dire_wolf_brute', 34, 0x2e2222);
    this.wolf(scene, 'enemy_dire_wolf_pup', 18, 0x6a5555);
    this.bladeEnemy(scene, 'enemy_backstabber', 24, 0x6a3030);
    this.circle(scene, 'enemy_camo_normal', 22, 0x1a3324);
    this.bladeEnemy(scene, 'enemy_camo_blade', 22, 0x243d2c);
    this.circle(scene, 'enemy_camo_poison', 22, 0x2a3a22);
    this.bladeEnemy(scene, 'enemy_camo_toxic_blade', 22, 0x1e2e24);
    this.circle(scene, 'enemy_lethargy_spitter', 26, 0x7a5ab0);
    this.circle(scene, 'enemy_lethargy_brute', 32, 0x5a3a90);
    this.circle(scene, 'enemy_escudeiro', 30, 0x8a9aaa);
    this.bladeEnemy(scene, 'enemy_knight_sword', 30, 0xb05040);
    this.circle(scene, 'enemy_knight_crossbow', 28, 0x6a7080);
    this.circle(scene, 'enemy_knight_vial', 28, 0x5a8a40);
    this.circle(scene, 'enemy_knight_healer', 28, 0xd0c060);
    this.circle(scene, 'projectile', 10, COLORS.projectile);
    this.circle(scene, 'boss_shot', 12, 0xff6b2d);
    this.hexagon(scene, 'xp_orb', 12, COLORS.xpOrb);
    this.circle(scene, 'dog_companion', 18, 0x9aa0a6);
    this.boss(scene, 'boss_kurupi', 72, 0x5c2a1a);
    this.boss(scene, 'boss_boitata', 64, 0xd45500);
    this.wolf(scene, 'boss_wolf_king', 44, 0x1a1010);
    this.boss(scene, 'boss_poisoner_master', 60, 0x3d6a28);
    this.acrobat(scene, 'boss_acrobat', 56, 0xc4a06a);
    this.boss(scene, 'boss_shield_master', 76, 0x6a7a8a);
    this.bossShield(scene, 'fx_boss_shield', 56);
    this.circle(scene, 'poison_shot', 14, 0x6bc24a);
    this.circle(scene, 'poison_shot_purple', 14, 0x9a6ad4);
    this.circle(scene, 'poison_puddle', 8, 0x3d8a2a);
    this.circle(scene, 'poison_puddle_purple', 8, 0x6a40a0);
    this.rect(scene, 'boss_turret', 28, 40, 0xd47820);
    this.emblem(scene, 'emblem_kurupi', 0x5c2a1a);
    this.emblem(scene, 'emblem_boitata', 0xd45500);
    this.emblem(scene, 'emblem_wolf', 0x4a3a3a);
    this.emblem(scene, 'emblem_poison', 0x3d6a28);
    this.emblem(scene, 'emblem_acrobat', 0xc4a06a);
    this.emblem(scene, 'emblem_shield', 0x6a7a8a);
    this.hexagon(scene, 'resin_orb', 14, 0xc4783a);
    this.amuletIcon(scene, 'amulet_araci', COLORS.accent, 'parallel');
    this.amuletIcon(scene, 'amulet_jaci', 0xd4a017, 'diagonal');
    this.amuletIcon(scene, 'amulet_anhanga', 0x8f6b3a, 'ring');
    this.amuletIcon(scene, 'amulet_tupa', 0xe8c84a, 'bolt');
    this.amuletIcon(scene, 'amulet_guara', 0x9aa0a6, 'paw');
    this.amuletIcon(scene, 'amulet_yara', 0x6ec8ff, 'drop');
    this.amuletIcon(scene, 'amulet_cuca', 0xc45a3a, 'thorn');
    this.amuletIcon(scene, 'amulet_caipora', 0xb8d44a, 'echo');
    this.amuletIcon(scene, 'amulet_storm', 0x7ec8ff, 'storm');
    this.amuletIcon(scene, 'amulet_side_r', 0xd4b86a, 'echo');
    this.amuletIcon(scene, 'amulet_side_l', 0xb8a060, 'echo');
    this.amuletIcon(scene, 'amulet_halfmoon', 0xe8d090, 'bolt');
    this.amuletIcon(scene, 'amulet_vigil', 0x6ec8ff, 'drop');
    this.amuletIcon(scene, 'amulet_mercy', 0xf4d77b, 'bolt');
    this.amuletIcon(scene, 'amulet_cura', 0xa8e0c8, 'ring');
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

  /** Lobo hostil — distinto do cão aliado (orelhas + focinho). */
  private static wolf(
    scene: Phaser.Scene,
    key: string,
    size: number,
    color: number,
  ): void {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 });
    const r = size / 2;
    g.fillStyle(color, 1);
    g.fillEllipse(r, r + size * 0.05, size * 0.9, size * 0.7);
    g.fillTriangle(r - size * 0.35, r - size * 0.15, r - size * 0.15, r - size * 0.45, r - size * 0.05, r - size * 0.1);
    g.fillTriangle(r + size * 0.35, r - size * 0.15, r + size * 0.15, r - size * 0.45, r + size * 0.05, r - size * 0.1);
    g.fillStyle(0x1a1212, 1);
    g.fillCircle(r - size * 0.12, r, size * 0.06);
    g.fillCircle(r + size * 0.12, r, size * 0.06);
    g.fillTriangle(r - size * 0.08, r + size * 0.12, r + size * 0.08, r + size * 0.12, r, r + size * 0.28);
    g.lineStyle(2, 0xc4a35a, 0.5);
    g.strokeEllipse(r, r + size * 0.05, size * 0.9, size * 0.7);
    g.generateTexture(key, size, size);
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

  private static bladeEnemy(
    scene: Phaser.Scene,
    key: string,
    diameter: number,
    color: number,
  ): void {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 });
    const r = diameter / 2;
    const w = diameter + 10;
    g.fillStyle(color, 1);
    g.fillCircle(r, r, r);
    g.fillStyle(0xc0c8d0, 1);
    g.fillTriangle(diameter - 2, r - 3, w, r, diameter - 2, r + 3);
    g.lineStyle(2, 0xffffff, 0.2);
    g.strokeCircle(r, r, r - 1);
    g.generateTexture(key, w, diameter);
    g.destroy();
  }

  private static acrobat(
    scene: Phaser.Scene,
    key: string,
    size: number,
    color: number,
  ): void {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 });
    const r = size / 2;
    g.fillStyle(color, 1);
    g.fillCircle(r, r, r * 0.85);
    g.lineStyle(3, COLORS.accent, 0.9);
    g.strokeCircle(r, r, r * 0.85);
    g.fillStyle(0xffe8a3, 0.9);
    g.fillCircle(r - size * 0.15, r - size * 0.08, size * 0.07);
    g.fillCircle(r + size * 0.15, r - size * 0.08, size * 0.07);
    g.lineStyle(3, 0x8b5a2b, 1);
    g.strokeCircle(r, r + size * 0.05, size * 0.35);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  /** Escudo heráldico usado na defesa do Mestre do Escudo. */
  private static bossShield(scene: Phaser.Scene, key: string, size: number): void {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 });
    const cx = size / 2;
    const top = size * 0.12;
    const midY = size * 0.42;
    const bottom = size * 0.92;
    const halfW = size * 0.36;

    // Corpo do escudo (heater)
    g.fillStyle(0xc8d4e0, 1);
    g.beginPath();
    g.moveTo(cx - halfW, top);
    g.lineTo(cx + halfW, top);
    g.lineTo(cx + halfW * 1.05, midY);
    g.lineTo(cx, bottom);
    g.lineTo(cx - halfW * 1.05, midY);
    g.closePath();
    g.fillPath();

    g.lineStyle(3, 0x3a4a58, 1);
    g.beginPath();
    g.moveTo(cx - halfW, top);
    g.lineTo(cx + halfW, top);
    g.lineTo(cx + halfW * 1.05, midY);
    g.lineTo(cx, bottom);
    g.lineTo(cx - halfW * 1.05, midY);
    g.closePath();
    g.strokePath();

    // Brilho / boss accent
    g.fillStyle(0xf4d77b, 0.95);
    g.fillCircle(cx, midY * 0.85, size * 0.1);
    g.lineStyle(2, 0x8a9aaa, 0.8);
    g.lineBetween(cx, top + 6, cx, bottom - 10);
    g.lineBetween(cx - halfW * 0.55, midY * 0.7, cx + halfW * 0.55, midY * 0.7);

    g.generateTexture(key, size, size);
    g.destroy();
  }

  private static emblem(scene: Phaser.Scene, key: string, color: number): void {
    if (scene.textures.exists(key)) return;
    const size = 48;
    const g = scene.make.graphics({ x: 0, y: 0 });
    const cx = size / 2;
    const cy = size / 2;
    g.fillStyle(color, 1);
    g.fillCircle(cx, cy, 18);
    g.lineStyle(3, COLORS.accent, 1);
    g.strokeCircle(cx, cy, 18);
    g.fillStyle(0xffe8a3, 0.95);
    g.fillCircle(cx, cy, 6);
    g.generateTexture(key, size, size);
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
