import Phaser from 'phaser';
import {
  COLORS,
  PLAYER_BASE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config/GameConfig';
import type {
  AmuletId,
  PlayerStats,
  RunAmuletState,
  RunSummary,
} from '../data/types';
import { DogCompanion } from '../entities/DogCompanion';
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
import { getAmulet } from '../upgrades/Amulets';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private inputSystem!: InputSystem;
  private weapon!: WeaponSystem;
  private spawner!: SpawnSystem;
  private levelSystem!: LevelSystem;
  private xpOrbs!: Phaser.Physics.Arcade.Group;
  private dog?: DogCompanion;
  private auraVisual?: Phaser.GameObjects.Arc;

  private kills = 0;
  private runStart = 0;
  private pendingChoices: Array<'upgrade' | 'amulet'> = [];
  private choosingUpgrade = false;
  private gameOverTriggered = false;
  private nextAuraTick = 0;
  private amulets: RunAmuletState = this.createEmptyAmuletState();

  private hpBarBg!: Phaser.GameObjects.Graphics;
  private hpBarFill!: Phaser.GameObjects.Graphics;
  private xpBarBg!: Phaser.GameObjects.Graphics;
  private xpBarFill!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private amuletBadges!: Phaser.GameObjects.Container;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.kills = 0;
    this.pendingChoices = [];
    this.choosingUpgrade = false;
    this.gameOverTriggered = false;
    this.amulets = this.createEmptyAmuletState();
    this.dog = undefined;
    this.nextAuraTick = 0;
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

    this.spawner = new SpawnSystem(this, this.player, (type) => {
      SaveManager.discoverEnemy(type);
    });
    this.spawner.start();

    this.xpOrbs = this.physics.add.group({
      classType: XPOrb,
      maxSize: 150,
    });

    this.setupCollisions();
    this.createHud();

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

        this.damageEnemy(enemy, proj.damage);
        proj.deactivate();
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
      const levelsReached = this.levelSystem.addXp(orb.xpValue);
      orb.deactivate();
      if (levelsReached.length > 0) {
        for (const levelReached of levelsReached) {
          this.pendingChoices.push('upgrade');
          if (levelReached % 5 === 0) this.pendingChoices.push('amulet');
        }
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

  private damageEnemy(enemy: Enemy, damage: number): void {
    if (!enemy.active) return;
    if (enemy.takeDamage(damage)) this.onEnemyKilled(enemy);
  }

  private processPendingLevelUps(): void {
    if (this.choosingUpgrade || this.pendingChoices.length === 0 || this.gameOverTriggered) return;
    const mode = this.pendingChoices.shift();
    if (!mode) return;
    if (mode === 'amulet' && this.amulets.owned.length >= 5) {
      this.processPendingLevelUps();
      return;
    }
    this.choosingUpgrade = true;
    this.scene.pause();
    this.scene.launch('UpgradeScene', {
      player: this.player,
      mode,
      ownedAmulets: [...this.amulets.owned],
      onAmuletSelected: (id: AmuletId) => this.applyAmulet(id),
      onComplete: () => {
        this.choosingUpgrade = false;
        this.weapon.refreshRate();
        this.redrawAmuletBadges();
      },
    });
  }

  private createEmptyAmuletState(): RunAmuletState {
    return {
      owned: [],
      parallelShot: false,
      diagonalShot: false,
      damageAura: false,
      reviveAvailable: false,
      dogCompanion: false,
    };
  }

  private applyAmulet(id: AmuletId): void {
    if (this.amulets.owned.includes(id)) return;
    this.amulets.owned.push(id);

    switch (id) {
      case 'araci_eyes':
        this.amulets.parallelShot = true;
        this.weapon.enableParallelShot();
        break;
      case 'jaci_claws':
        this.amulets.diagonalShot = true;
        this.weapon.enableDiagonalShot();
        break;
      case 'anhanga_circle':
        this.amulets.damageAura = true;
        this.auraVisual = this.add
          .circle(this.player.x, this.player.y, 105, 0xc4a35a, 0.08)
          .setStrokeStyle(2, 0xc4a35a, 0.45)
          .setDepth(4);
        break;
      case 'tupa_breath':
        this.amulets.reviveAvailable = true;
        break;
      case 'guara_tooth':
        this.amulets.dogCompanion = true;
        this.dog = new DogCompanion(this, this.player);
        break;
    }
  }

  private updateAmulets(time: number): void {
    if (this.auraVisual) this.auraVisual.setPosition(this.player.x, this.player.y);

    if (this.amulets.damageAura && time >= this.nextAuraTick) {
      this.nextAuraTick = time + 500;
      for (const enemy of this.spawner.enemies.getChildren() as Enemy[]) {
        if (
          enemy.active
          && Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= 105
        ) {
          this.damageEnemy(enemy, 8);
        }
      }
    }

    this.dog?.update(time, this.spawner.enemies, (enemy, damage) => {
      this.damageEnemy(enemy, damage);
    });
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

    this.amuletBadges = this.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(103);

    this.redrawHud();
    this.redrawAmuletBadges();
  }

  private redrawAmuletBadges(): void {
    this.amuletBadges.removeAll(true);
    this.amulets.owned.forEach((id, index) => {
      const amulet = getAmulet(id);
      const x = 330 + index * 44;
      const y = 25;
      const badge = this.add.circle(x, y, 16, COLORS.accent).setStrokeStyle(2, 0xffe8a3);
      const symbol = this.add
        .text(x, y, amulet.symbol, {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '13px',
          color: '#0d1a12',
        })
        .setOrigin(0.5);
      this.amuletBadges.add([badge, symbol]);
    });
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

  update(time: number, delta: number): void {
    if (this.gameOverTriggered || this.choosingUpgrade) return;

    if (this.inputSystem.isPausePressed()) {
      this.scene.pause();
      this.scene.launch('PauseScene');
      return;
    }

    if (this.pendingChoices.length > 0) {
      this.processPendingLevelUps();
      if (this.choosingUpgrade) return;
    }

    this.inputSystem.update(this.player);
    this.spawner.update(delta);
    this.updateAmulets(time);
    this.redrawHud();

    if (this.player.isDead()) {
      if (this.amulets.reviveAvailable) {
        this.amulets.reviveAvailable = false;
        this.player.revive(this.time.now);
      } else {
        this.triggerGameOver();
      }
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
      this.scene.stop('PauseScene');
      this.scene.start('GameOverScene', summary);
    });
  }
}
