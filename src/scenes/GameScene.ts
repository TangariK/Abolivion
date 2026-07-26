import Phaser from 'phaser';
import {
  COLORS,
  PLAYER_BASE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config/GameConfig';
import type { PlayerStats, RunSummary } from '../data/types';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { XPOrb } from '../entities/XPOrb';
import { LevelSystem } from '../systems/LevelSystem';
import { InputSystem } from '../systems/InputSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { WeaponSystem } from '../systems/WeaponSystem';
import { SaveManager } from '../upgrades/MetaUpgrades';
import { applyMetaToStats } from '../upgrades/MetaShop';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private inputSystem!: InputSystem;
  private weapon!: WeaponSystem;
  private spawner!: SpawnSystem;
  private levelSystem!: LevelSystem;
  private xpOrbs!: Phaser.Physics.Arcade.Group;

  private kills = 0;
  private runStart = 0;
  private pendingLevelUps = 0;
  private choosingUpgrade = false;
  private gameOverTriggered = false;

  private hpBarBg!: Phaser.GameObjects.Graphics;
  private hpBarFill!: Phaser.GameObjects.Graphics;
  private xpBarBg!: Phaser.GameObjects.Graphics;
  private xpBarFill!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.kills = 0;
    this.pendingLevelUps = 0;
    this.choosingUpgrade = false;
    this.gameOverTriggered = false;
    this.runStart = this.time.now;
    this.levelSystem = new LevelSystem();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor(COLORS.bg);

    this.drawGround();

    const cx = WORLD_WIDTH / 2;
    const cy = WORLD_HEIGHT / 2;
    this.add.image(cx, cy, 'hut').setDepth(2);

    const profile = SaveManager.load();
    const baseStats: PlayerStats = {
      maxHp: PLAYER_BASE.hp,
      hp: PLAYER_BASE.hp,
      speed: PLAYER_BASE.speed,
      damage: PLAYER_BASE.damage,
      fireRate: PLAYER_BASE.fireRate,
      projectileSpeed: PLAYER_BASE.projectileSpeed,
    };
    const stats = applyMetaToStats(baseStats, profile);

    this.player = new Player(this, cx, cy + 80, stats);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.inputSystem = new InputSystem(this);

    this.weapon = new WeaponSystem(this, this.player);
    this.weapon.start();

    this.spawner = new SpawnSystem(this, this.player);
    this.spawner.start();

    this.xpOrbs = this.physics.add.group({
      classType: XPOrb,
      maxSize: 150,
    });

    this.setupCollisions();
    this.createHud();

    this.events.on('resume', () => {
      this.choosingUpgrade = false;
      this.weapon.refreshRate();
      this.processPendingLevelUps();
    });

    this.events.once('shutdown', () => {
      this.weapon.destroy();
      this.spawner.destroy();
    });
  }

  private drawGround(): void {
    const g = this.add.graphics().setDepth(0);
    const tile = 64;
    for (let x = 0; x < WORLD_WIDTH; x += tile) {
      for (let y = 0; y < WORLD_HEIGHT; y += tile) {
        const shade = (x / tile + y / tile) % 2 === 0 ? 0x162a1e : 0x1a3324;
        g.fillStyle(shade, 1);
        g.fillRect(x, y, tile, tile);
      }
    }
  }

  private setupCollisions(): void {
    this.physics.add.overlap(
      this.weapon.projectiles,
      this.spawner.enemies,
      (projObj, enemyObj) => {
        const proj = projObj as Projectile;
        const enemy = enemyObj as Enemy;
        if (!proj.active || !enemy.active) return;

        const dead = enemy.takeDamage(proj.damage);
        proj.deactivate();

        if (dead) {
          this.onEnemyKilled(enemy);
        }
      },
    );

    this.physics.add.overlap(this.player, this.spawner.enemies, (_p, enemyObj) => {
      const enemy = enemyObj as Enemy;
      if (!enemy.active || this.player.isDead()) return;
      this.player.takeDamage(enemy.contactDamage, this.time.now);
      // Soft knockback
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      this.player.setVelocity(
        Math.cos(angle) * 220,
        Math.sin(angle) * 220,
      );
    });

    this.physics.add.overlap(this.player, this.xpOrbs, (_p, orbObj) => {
      const orb = orbObj as XPOrb;
      if (!orb.active) return;
      const leveled = this.levelSystem.addXp(orb.xpValue);
      orb.deactivate();
      if (leveled > 0) {
        this.pendingLevelUps += leveled;
        this.processPendingLevelUps();
      }
      this.redrawHud();
    });

    this.physics.add.collider(this.spawner.enemies, this.spawner.enemies);
  }

  private onEnemyKilled(enemy: Enemy): void {
    this.kills += 1;
    const orb = this.xpOrbs.get() as XPOrb | null;
    if (orb) {
      orb.spawn(enemy.x, enemy.y, enemy.xpValue);
    }
    enemy.deactivate();
    this.redrawHud();
  }

  private processPendingLevelUps(): void {
    if (this.choosingUpgrade || this.pendingLevelUps <= 0 || this.gameOverTriggered) return;
    this.pendingLevelUps -= 1;
    this.choosingUpgrade = true;
    this.scene.pause();
    this.scene.launch('UpgradeScene', { player: this.player });
  }

  private createHud(): void {
    this.hpBarBg = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.hpBarFill = this.add.graphics().setScrollFactor(0).setDepth(101);
    this.xpBarBg = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.xpBarFill = this.add.graphics().setScrollFactor(0).setDepth(101);

    this.hudText = this.add
      .text(16, 52, '', {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '16px',
        color: '#e8f0e8',
      })
      .setScrollFactor(0)
      .setDepth(102);

    this.redrawHud();
  }

  private redrawHud(): void {
    const barW = 280;
    const barH = 16;
    const x = 16;
    const hpY = 16;
    const xpY = 36;

    const hpRatio = this.player.stats.maxHp > 0
      ? this.player.stats.hp / this.player.stats.maxHp
      : 0;
    const xpRatio = this.levelSystem.progress();

    this.hpBarBg.clear();
    this.hpBarBg.fillStyle(COLORS.hudBg, 0.85);
    this.hpBarBg.fillRect(x, hpY, barW, barH);

    this.hpBarFill.clear();
    this.hpBarFill.fillStyle(COLORS.hudHp, 1);
    this.hpBarFill.fillRect(x, hpY, barW * Phaser.Math.Clamp(hpRatio, 0, 1), barH);

    this.xpBarBg.clear();
    this.xpBarBg.fillStyle(COLORS.hudBg, 0.85);
    this.xpBarBg.fillRect(x, xpY, barW, 10);

    this.xpBarFill.clear();
    this.xpBarFill.fillStyle(COLORS.hudXp, 1);
    this.xpBarFill.fillRect(x, xpY, barW * Phaser.Math.Clamp(xpRatio, 0, 1), 10);

    const survivalSec = Math.floor((this.time.now - this.runStart) / 1000);
    this.hudText.setText(
      `Nv ${this.levelSystem.level}  |  Abates ${this.kills}  |  ${survivalSec}s`,
    );
  }

  update(_time: number, delta: number): void {
    if (this.gameOverTriggered || this.choosingUpgrade) return;

    this.inputSystem.update(this.player);
    this.spawner.update(delta);
    this.redrawHud();

    if (this.player.isDead()) {
      this.triggerGameOver();
    }
  }

  private triggerGameOver(): void {
    if (this.gameOverTriggered) return;
    this.gameOverTriggered = true;

    this.weapon.destroy();
    this.spawner.destroy();
    this.player.setVelocity(0, 0);

    const survivalMs = this.time.now - this.runStart;
    const coinsEarned = Math.max(
      1,
      Math.floor(this.levelSystem.totalXpCollected * 0.5 + this.kills * 0.75),
    );

    SaveManager.addCurrency(coinsEarned);

    const summary: RunSummary = {
      kills: this.kills,
      xpCollected: this.levelSystem.totalXpCollected,
      level: this.levelSystem.level,
      survivalMs,
      coinsEarned,
    };

    this.time.delayedCall(400, () => {
      this.scene.stop('UpgradeScene');
      this.scene.start('GameOverScene', summary);
    });
  }
}
