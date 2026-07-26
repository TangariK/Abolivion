import Phaser from 'phaser';
import {
  COLORS,
  GAME_WIDTH,
  PLAYER_BASE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config/GameConfig';
import { GameModeStore } from '../data/GameModeStore';
import type {
  AmuletId,
  BossId,
  GameModeId,
  PlayerStats,
  RunAmuletState,
  RunSummary,
} from '../data/types';
import { BossProjectile } from '../entities/BossProjectile';
import { DogCompanion } from '../entities/DogCompanion';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { XPOrb } from '../entities/XPOrb';
import { InputSystem } from '../systems/InputSystem';
import { LevelSystem } from '../systems/LevelSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { WeaponSystem } from '../systems/WeaponSystem';
import { getAmulet } from '../upgrades/Amulets';
import { applyMetaToStats } from '../upgrades/MetaShop';
import { SaveManager } from '../upgrades/MetaUpgrades';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private inputSystem!: InputSystem;
  private weapon!: WeaponSystem;
  private spawner?: SpawnSystem;
  private waves?: WaveSystem;
  private levelSystem!: LevelSystem;
  private xpOrbs!: Phaser.Physics.Arcade.Group;
  private bossShots!: Phaser.Physics.Arcade.Group;
  private dog?: DogCompanion;
  private auraVisual?: Phaser.GameObjects.Arc;
  private enemies!: Phaser.Physics.Arcade.Group;

  private mode: GameModeId = 'infinite';
  private kills = 0;
  private runStart = 0;
  private pendingChoices: Array<'upgrade' | 'amulet'> = [];
  private choosingUpgrade = false;
  private gameOverTriggered = false;
  private nextAuraTick = 0;
  private nextRegenTick = 0;
  private nextBossAbility = 0;
  private bossesDefeated: BossId[] = [];
  private amulets: RunAmuletState = this.createEmptyAmuletState();

  private hpBarBg!: Phaser.GameObjects.Graphics;
  private hpBarFill!: Phaser.GameObjects.Graphics;
  private xpBarBg!: Phaser.GameObjects.Graphics;
  private xpBarFill!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private amuletBadges!: Phaser.GameObjects.Container;
  private waveHudBg!: Phaser.GameObjects.Graphics;
  private waveHudFill!: Phaser.GameObjects.Graphics;
  private waveHudText!: Phaser.GameObjects.Text;
  private toastText?: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.mode = GameModeStore.get();
    this.kills = 0;
    this.pendingChoices = [];
    this.choosingUpgrade = false;
    this.gameOverTriggered = false;
    this.amulets = this.createEmptyAmuletState();
    this.dog = undefined;
    this.auraVisual = undefined;
    this.nextAuraTick = 0;
    this.nextRegenTick = 0;
    this.nextBossAbility = 0;
    this.bossesDefeated = [];
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
      xpPickupRadius: PLAYER_BASE.xpPickupRadius,
      xpGainBonus: PLAYER_BASE.xpGainBonus,
    };
    const stats = applyMetaToStats(baseStats, profile);

    this.player = new Player(this, cx, cy + 80, stats);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.inputSystem = new InputSystem(this);

    this.weapon = new WeaponSystem(this, this.player);
    this.weapon.start();

    if (this.mode === 'waves') {
      this.waves = new WaveSystem(this, this.player, {
        onEncounter: (type) => SaveManager.discoverEnemy(type),
        onBossSpawn: (id) => {
          SaveManager.discoverBoss(id);
          this.showToast(id === 'kurupi_brood' ? 'Kurupi da Ninhada!' : 'Boitatá do Olhar!');
        },
        onWaveCleared: (wave) => {
          this.showToast(`Rodada ${wave} concluída`);
          if (wave >= 10) SaveManager.unlockAchievement('wave_survivor');
        },
      });
      this.enemies = this.waves.enemies;
      // Start after create finishes so the first spawn doesn't hitch input/HUD setup
      this.time.delayedCall(0, () => this.waves?.start());
    } else {
      this.spawner = new SpawnSystem(this, this.player, (type) => {
        SaveManager.discoverEnemy(type);
      });
      this.enemies = this.spawner.enemies;
      this.spawner.start();
    }

    this.xpOrbs = this.physics.add.group({ classType: XPOrb, maxSize: 180 });
    this.bossShots = this.physics.add.group({
      classType: BossProjectile,
      maxSize: 160,
      runChildUpdate: true,
    });

    this.setupCollisions();
    this.createHud();

    this.events.once('shutdown', () => {
      this.weapon.destroy();
      this.spawner?.destroy();
      this.waves?.destroy();
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
    this.physics.add.overlap(this.weapon.projectiles, this.enemies, (projObj, enemyObj) => {
      const proj = projObj as Projectile;
      const enemy = enemyObj as Enemy;
      if (!proj.active || !enemy.active) return;
      this.damageEnemy(enemy, proj.damage);
      proj.deactivate();
    });

    this.physics.add.overlap(this.player, this.enemies, (_p, enemyObj) => {
      const enemy = enemyObj as Enemy;
      if (!enemy.active || this.player.isDead()) return;
      const hit = this.player.takeDamage(enemy.contactDamage, this.time.now);
      if (hit && this.amulets.thorns) {
        this.damageEnemy(enemy, Math.max(8, Math.floor(enemy.contactDamage * 0.7)));
      }
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      this.player.setVelocity(Math.cos(angle) * 220, Math.sin(angle) * 220);
    });

    this.physics.add.overlap(this.player, this.bossShots, (_p, shotObj) => {
      const shot = shotObj as BossProjectile;
      if (!shot.active || this.player.isDead()) return;
      const hit = this.player.takeDamage(shot.damage, this.time.now);
      shot.deactivate();
      if (hit && this.amulets.thorns) {
        // thorns only vs contact enemies; ignore projectile reflection for MVP
      }
    });

    this.physics.add.overlap(this.player, this.xpOrbs, (_p, orbObj) => {
      const orb = orbObj as XPOrb;
      if (!orb.active) return;
      this.collectOrb(orb);
    });

    this.physics.add.collider(this.enemies, this.enemies);
  }

  private collectOrb(orb: XPOrb): void {
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
  }

  private onEnemyKilled(enemy: Enemy): void {
    this.kills += 1;
    if (this.kills === 1) SaveManager.unlockAchievement('first_blood');

    if (enemy.isBoss && enemy.bossId) {
      this.bossesDefeated.push(enemy.bossId);
      SaveManager.discoverBoss(enemy.bossId);
      SaveManager.unlockAchievement('boss_slayer');
    }

    const xp = Math.max(1, Math.floor(enemy.xpValue * (1 + this.player.stats.xpGainBonus)));
    const orb = this.xpOrbs.get() as XPOrb | null;
    if (orb) orb.spawn(enemy.x, enemy.y, xp);

    enemy.deactivate();
    this.waves?.notifyKill();
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
    if (mode === 'amulet' && this.amulets.owned.length >= 7) {
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
      lifeRegen: false,
      thorns: false,
    };
  }

  private applyAmulet(id: AmuletId): void {
    if (this.amulets.owned.includes(id)) return;
    this.amulets.owned.push(id);
    SaveManager.unlockAchievement('amulet_bearer');

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
      case 'yara_tear':
        this.amulets.lifeRegen = true;
        break;
      case 'cuca_thorn':
        this.amulets.thorns = true;
        SaveManager.unlockAchievement('thorn_revenge');
        break;
    }
  }

  private updateAmulets(time: number): void {
    if (this.auraVisual) this.auraVisual.setPosition(this.player.x, this.player.y);

    if (this.amulets.lifeRegen && time >= this.nextRegenTick) {
      this.nextRegenTick = time + 1000;
      this.player.regenerate(1.5);
    }

    if (this.amulets.damageAura && time >= this.nextAuraTick) {
      this.nextAuraTick = time + 500;
      for (const enemy of this.enemies.getChildren() as Enemy[]) {
        if (
          enemy.active
          && Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= 105
        ) {
          this.damageEnemy(enemy, 8);
        }
      }
    }

    this.dog?.update(time, this.enemies, (enemy, damage) => {
      this.damageEnemy(enemy, damage);
    });
  }

  private updateBossAbilities(time: number): void {
    if (this.mode !== 'waves' || !this.waves || this.waves.phase !== 'combat') return;
    if (time < this.nextBossAbility) return;

    const boss = (this.enemies.getChildren() as Enemy[]).find(
      (e) => e.active && e.isBoss,
    );
    if (!boss || !boss.bossId) return;

    if (boss.bossId === 'kurupi_brood') {
      this.nextBossAbility = time + 2200;
      this.waves.spawnExtra(Math.random() < 0.5 ? 'fast' : 'swift');
      this.waves.spawnExtra('normal');
      return;
    }

    if (boss.bossId === 'boitata_gaze') {
      this.nextBossAbility = time + 380;
      const base = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
      for (let i = -2; i <= 2; i++) {
        const shot = this.bossShots.get() as BossProjectile | null;
        if (!shot) continue;
        shot.fire(boss.x, boss.y, base + i * 0.18, 320, 14);
      }
    }
  }

  private createHud(): void {
    this.hpBarBg = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.hpBarFill = this.add.graphics().setScrollFactor(0).setDepth(101);
    this.xpBarBg = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.xpBarFill = this.add.graphics().setScrollFactor(0).setDepth(101);
    this.waveHudBg = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.waveHudFill = this.add.graphics().setScrollFactor(0).setDepth(101);

    this.hudText = this.add
      .text(16, 52, '', {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '16px',
        color: '#e8f0e8',
      })
      .setScrollFactor(0)
      .setDepth(102);

    this.waveHudText = this.add
      .text(GAME_WIDTH / 2, 18, '', {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '15px',
        color: '#f4d77b',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(102)
      .setVisible(this.mode === 'waves');

    this.amuletBadges = this.add.container(0, 0).setScrollFactor(0).setDepth(103);
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
    const hpRatio = this.player.stats.maxHp > 0
      ? this.player.stats.hp / this.player.stats.maxHp
      : 0;
    const xpRatio = this.levelSystem.progress();

    this.hpBarBg.clear().fillStyle(COLORS.hudBg, 0.85).fillRect(x, 16, barW, barH);
    this.hpBarFill.clear().fillStyle(COLORS.hudHp, 1)
      .fillRect(x, 16, barW * Phaser.Math.Clamp(hpRatio, 0, 1), barH);
    this.xpBarBg.clear().fillStyle(COLORS.hudBg, 0.85).fillRect(x, 36, barW, 10);
    this.xpBarFill.clear().fillStyle(COLORS.hudXp, 1)
      .fillRect(x, 36, barW * Phaser.Math.Clamp(xpRatio, 0, 1), 10);

    const survivalSec = Math.floor((this.time.now - this.runStart) / 1000);
    const modeLabel = this.mode === 'waves' ? 'Rodadas' : 'Infinito';
    this.hudText.setText(
      `${modeLabel}  |  Nv ${this.levelSystem.level}  |  Abates ${this.kills}  |  ${survivalSec}s`,
    );

    this.waveHudBg.clear();
    this.waveHudFill.clear();
    if (this.mode === 'waves' && this.waves) {
      const w = 420;
      const hx = (GAME_WIDTH - w) / 2;
      const hy = 40;

      let ratio = 0;
      let fillColor = 0xe05c5c;
      let label = '';

      if (this.waves.phase === 'break') {
        ratio = this.waves.intermissionMs / 5000;
        fillColor = COLORS.accent;
        label = `Próxima rodada em ${Math.ceil(this.waves.intermissionMs / 1000)}s`;
      } else {
        const boss = (this.enemies.getChildren() as Enemy[]).find(
          (e) => e.active && e.isBoss,
        );
        if (boss) {
          ratio = boss.maxHp > 0 ? boss.hp / boss.maxHp : 0;
          fillColor = 0xc45a3a;
          const minions = (this.enemies.getChildren() as Enemy[]).filter(
            (e) => e.active && !e.isBoss,
          ).length;
          const bossName = boss.bossId === 'kurupi_brood'
            ? 'Kurupi da Ninhada'
            : 'Boitatá do Olhar';
          label = boss.bossId === 'kurupi_brood'
            ? `${bossName}  ·  HP ${Math.ceil(boss.hp)}  ·  Invocados ${minions}`
            : `${bossName}  ·  HP ${Math.ceil(boss.hp)}/${boss.maxHp}`;
        } else {
          ratio = this.waves.totalInWave > 0
            ? this.waves.remaining / this.waves.totalInWave
            : 0;
          label = `Rodada ${this.waves.wave}  ·  ${this.waves.remaining}/${this.waves.totalInWave}`;
        }
      }

      this.waveHudBg.fillStyle(COLORS.hudBg, 0.9).fillRect(hx, hy, w, 14);
      this.waveHudFill.fillStyle(fillColor, 1)
        .fillRect(hx, hy, w * Phaser.Math.Clamp(ratio, 0, 1), 14);
      this.waveHudText.setText(label);
    }
  }

  private showToast(message: string): void {
    this.toastText?.destroy();
    this.toastText = this.add
      .text(GAME_WIDTH / 2, 90, message, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '24px',
        color: '#f4d77b',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(120);
    this.time.delayedCall(2200, () => this.toastText?.destroy());
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
    this.spawner?.update(delta);
    this.waves?.update(delta);
    this.updateAmulets(time);
    this.updateBossAbilities(time);

    // Magnet pull + radius collect for XP
    for (const orbObj of this.xpOrbs.getChildren() as XPOrb[]) {
      if (!orbObj.active) continue;
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        orbObj.x,
        orbObj.y,
      );
      if (dist <= this.player.stats.xpPickupRadius) {
        this.collectOrb(orbObj);
        continue;
      }
      if (dist < this.player.stats.xpPickupRadius * 2.5) {
        this.physics.moveToObject(orbObj, this.player, 280);
      }
    }

    this.redrawHud();

    if (this.mode === 'infinite' && time - this.runStart >= 180000) {
      SaveManager.unlockAchievement('night_walker');
    }

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
    this.spawner?.destroy();
    this.waves?.destroy();
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
      mode: this.mode,
      waveReached: this.waves?.wave,
      bossesDefeated: [...this.bossesDefeated],
    };

    this.time.delayedCall(400, () => {
      this.scene.stop('UpgradeScene');
      this.scene.stop('PauseScene');
      this.scene.start('GameOverScene', summary);
    });
  }
}
