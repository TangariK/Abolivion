import Phaser from 'phaser';
import {
  COLORS,
  GAME_WIDTH,
  PLAYER_BASE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config/GameConfig';
import { GameSettingsStore, type PlayerCount } from '../data/GameModeStore';
import type {
  AchievementId,
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
import { AchievementToast } from '../ui/AchievementToast';
import { getAmulet } from '../upgrades/Amulets';
import { applyMetaToStats } from '../upgrades/MetaShop';
import { SaveManager } from '../upgrades/MetaUpgrades';

export class GameScene extends Phaser.Scene {
  private player1!: Player;
  private player2?: Player;
  private players: Player[] = [];
  private playerCount: PlayerCount = 1;
  private cameraTarget?: Phaser.GameObjects.Zone;

  private inputSystem!: InputSystem;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private weapon1!: WeaponSystem;
  private weapon2?: WeaponSystem;
  private spawner?: SpawnSystem;
  private waves?: WaveSystem;
  private levelSystem!: LevelSystem;
  private xpOrbs!: Phaser.Physics.Arcade.Group;
  private bossShots!: Phaser.Physics.Arcade.Group;
  private dog?: DogCompanion;
  private auraVisual?: Phaser.GameObjects.Arc;
  private enemies!: Phaser.Physics.Arcade.Group;
  private toasts!: AchievementToast;

  private mode: GameModeId = 'infinite';
  private kills = 0;
  private runStart = 0;
  private pendingChoices: Array<'upgrade' | 'amulet'> = [];
  private choosingUpgrade = false;
  private gameOverTriggered = false;
  private nextAuraTick = 0;
  private nextRegenTick = 0;
  private nextBossAbility = 0;
  private nextLightningTick = 0;
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
    this.mode = GameSettingsStore.getMode();
    this.playerCount = GameSettingsStore.getPlayerCount();
    this.kills = 0;
    this.pendingChoices = [];
    this.choosingUpgrade = false;
    this.gameOverTriggered = false;
    this.amulets = this.createEmptyAmuletState();
    this.dog = undefined;
    this.auraVisual = undefined;
    this.player2 = undefined;
    this.weapon2 = undefined;
    this.cameraTarget = undefined;
    this.nextAuraTick = 0;
    this.nextRegenTick = 0;
    this.nextBossAbility = 0;
    this.nextLightningTick = 0;
    this.bossesDefeated = [];
    this.runStart = this.time.now;
    this.levelSystem = new LevelSystem();
    this.toasts = new AchievementToast(this);

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

    this.player1 = new Player(this, cx, cy + 80, stats, 1);
    this.players = [this.player1];
    if (this.playerCount === 2) {
      this.player2 = new Player(this, cx + 64, cy + 80, stats, 2);
      this.players.push(this.player2);
    }

    if (this.playerCount === 2) {
      this.cameraTarget = this.add.zone(cx + 32, cy + 80, 1, 1);
      this.cameras.main.startFollow(this.cameraTarget, true, 0.12, 0.12);
    } else {
      this.cameras.main.startFollow(this.player1, true, 0.12, 0.12);
    }

    this.inputSystem = new InputSystem(this, this.playerCount);

    this.projectiles = this.physics.add.group({
      classType: Projectile,
      maxSize: 320,
      runChildUpdate: true,
    });

    this.weapon1 = new WeaponSystem(
      this,
      this.player1,
      this.projectiles,
      () => this.player1.aimAngle,
    );

    if (this.mode === 'waves') {
      this.waves = new WaveSystem(this, this.player1, {
        onEncounter: (type) => SaveManager.discoverEnemy(type),
        onBossSpawn: (id) => {
          SaveManager.discoverBoss(id);
          this.showToast(id === 'kurupi_brood' ? 'Kurupi da Ninhada!' : 'Boitatá do Olhar!');
        },
        onWaveCleared: (wave) => {
          this.showToast(`Rodada ${wave} concluída`);
          if (wave >= 10) this.unlockAchievement('wave_survivor');
        },
      });
      this.enemies = this.waves.enemies;
      // Start after create finishes so the first spawn doesn't hitch input/HUD setup
      this.time.delayedCall(0, () => this.waves?.start());
    } else {
      this.spawner = new SpawnSystem(this, this.player1, (type) => {
        SaveManager.discoverEnemy(type);
      });
      this.enemies = this.spawner.enemies;
      this.spawner.start();
    }

    this.weapon1.start();
    if (this.player2) {
      const partner = this.player2;
      this.weapon2 = new WeaponSystem(
        this,
        partner,
        this.projectiles,
        () => WeaponSystem.aimAtNearest(partner, this.enemies),
      );
      this.weapon2.start();
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
      this.weapon1.destroy();
      this.weapon2?.destroy();
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

  private livingPlayers(): Player[] {
    return this.players.filter((p) => !p.isDead());
  }

  private forEachWeapon(fn: (weapon: WeaponSystem) => void): void {
    fn(this.weapon1);
    if (this.weapon2) fn(this.weapon2);
  }

  private unlockAchievement(id: AchievementId): void {
    if (SaveManager.unlockAchievement(id)) {
      this.toasts.enqueue(id);
    }
  }

  private setupCollisions(): void {
    this.physics.add.overlap(this.projectiles, this.enemies, (projObj, enemyObj) => {
      const proj = projObj as Projectile;
      const enemy = enemyObj as Enemy;
      if (!proj.active || !enemy.active) return;
      this.damageEnemy(enemy, proj.damage);
      proj.deactivate();
    });

    for (const player of this.players) {
      this.physics.add.overlap(player, this.enemies, (_p, enemyObj) => {
        const enemy = enemyObj as Enemy;
        if (!enemy.active || player.isDead()) return;
        const hit = player.takeDamage(enemy.contactDamage, this.time.now);
        if (hit && this.amulets.thorns) {
          this.damageEnemy(enemy, Math.max(8, Math.floor(enemy.contactDamage * 0.7)));
        }
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
        player.setVelocity(Math.cos(angle) * 220, Math.sin(angle) * 220);
      });

      this.physics.add.overlap(player, this.bossShots, (_p, shotObj) => {
        const shot = shotObj as BossProjectile;
        if (!shot.active || player.isDead()) return;
        player.takeDamage(shot.damage, this.time.now);
        shot.deactivate();
        // thorns only vs contact enemies; ignore projectile reflection for MVP
      });

      this.physics.add.overlap(player, this.xpOrbs, (_p, orbObj) => {
        const orb = orbObj as XPOrb;
        if (!orb.active || player.isDead()) return;
        this.collectOrb(orb);
      });
    }

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
    if (this.kills === 1) this.unlockAchievement('first_blood');

    if (enemy.isBoss && enemy.bossId) {
      this.bossesDefeated.push(enemy.bossId);
      SaveManager.discoverBoss(enemy.bossId);
      this.unlockAchievement('boss_slayer');
    }

    const xp = Math.max(1, Math.floor(enemy.xpValue * (1 + this.player1.stats.xpGainBonus)));
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
    if (mode === 'amulet' && this.amulets.owned.length >= 9) {
      this.processPendingLevelUps();
      return;
    }

    const living = this.livingPlayers();
    this.choosingUpgrade = true;
    this.scene.pause();
    this.scene.launch('UpgradeScene', {
      player: this.player1,
      players: living.length > 0 ? living : [...this.players],
      mode,
      ownedAmulets: [...this.amulets.owned],
      onAmuletSelected: (id: AmuletId) => this.applyAmulet(id),
      onAchievement: (id: 'xp_scholar') => this.unlockAchievement(id),
      onComplete: () => {
        this.choosingUpgrade = false;
        this.forEachWeapon((weapon) => weapon.refreshRate());
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
      backwardShot: false,
      lightningStorm: false,
    };
  }

  private applyAmulet(id: AmuletId): void {
    if (this.amulets.owned.includes(id)) return;
    this.amulets.owned.push(id);
    this.unlockAchievement('amulet_bearer');

    switch (id) {
      case 'araci_eyes':
        this.amulets.parallelShot = true;
        this.forEachWeapon((weapon) => weapon.enableParallelShot());
        break;
      case 'jaci_claws':
        this.amulets.diagonalShot = true;
        this.forEachWeapon((weapon) => weapon.enableDiagonalShot());
        break;
      case 'caipora_echo':
        this.amulets.backwardShot = true;
        this.forEachWeapon((weapon) => weapon.enableBackwardShot());
        break;
      case 'anhanga_circle':
        this.amulets.damageAura = true;
        this.auraVisual = this.add
          .circle(this.player1.x, this.player1.y, 105, 0xc4a35a, 0.08)
          .setStrokeStyle(2, 0xc4a35a, 0.45)
          .setDepth(4);
        break;
      case 'tupa_breath':
        this.amulets.reviveAvailable = true;
        break;
      case 'guara_tooth':
        this.amulets.dogCompanion = true;
        this.dog = new DogCompanion(this, this.player1);
        break;
      case 'yara_tear':
        this.amulets.lifeRegen = true;
        break;
      case 'cuca_thorn':
        this.amulets.thorns = true;
        this.unlockAchievement('thorn_revenge');
        break;
      case 'tupa_storm':
        this.amulets.lightningStorm = true;
        this.unlockAchievement('storm_touched');
        break;
    }
  }

  private updateAmulets(time: number): void {
    if (this.auraVisual) this.auraVisual.setPosition(this.player1.x, this.player1.y);

    const living = this.livingPlayers();

    if (this.amulets.lifeRegen && time >= this.nextRegenTick) {
      this.nextRegenTick = time + 1000;
      for (const player of living) player.regenerate(1.5);
    }

    if (this.amulets.damageAura && time >= this.nextAuraTick) {
      this.nextAuraTick = time + 500;
      for (const enemy of this.enemies.getChildren() as Enemy[]) {
        if (!enemy.active) continue;
        const inRange = living.some(
          (player) =>
            Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y) <= 105,
        );
        if (inRange) this.damageEnemy(enemy, 8);
      }
    }

    if (this.amulets.lightningStorm && time >= this.nextLightningTick) {
      this.nextLightningTick = time + 1100;
      const active = (this.enemies.getChildren() as Enemy[]).filter((e) => e.active);
      const strikes = Math.min(2, active.length);
      const pool = [...active];
      for (let i = 0; i < strikes; i++) {
        const index = Phaser.Math.Between(0, pool.length - 1);
        const target = pool.splice(index, 1)[0];
        this.strikeLightning(target);
      }
    }

    this.dog?.update(time, this.enemies, (enemy, damage) => {
      this.damageEnemy(enemy, damage);
    });
  }

  private strikeLightning(enemy: Enemy): void {
    const x = enemy.x;
    const y = enemy.y;
    const g = this.add.graphics().setDepth(50);
    g.lineStyle(3, 0xf4d77b, 1);
    g.beginPath();
    g.moveTo(x + Phaser.Math.Between(-16, 16), y - 420);
    g.lineTo(x + Phaser.Math.Between(-10, 10), y - 170);
    g.lineTo(x, y);
    g.strokePath();
    g.fillStyle(0xfff3b0, 0.85);
    g.fillCircle(x, y, 14);
    this.time.delayedCall(130, () => g.destroy());

    this.damageEnemy(enemy, 55);
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
      const target = this.nearestLivingPlayer(boss.x, boss.y) ?? this.player1;
      const base = Phaser.Math.Angle.Between(boss.x, boss.y, target.x, target.y);
      for (let i = -2; i <= 2; i++) {
        const shot = this.bossShots.get() as BossProjectile | null;
        if (!shot) continue;
        shot.fire(boss.x, boss.y, base + i * 0.18, 320, 14);
      }
    }
  }

  private nearestLivingPlayer(x: number, y: number): Player | undefined {
    let best: Player | undefined;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const player of this.livingPlayers()) {
      const d = Phaser.Math.Distance.Squared(x, y, player.x, player.y);
      if (d < bestDist) {
        bestDist = d;
        best = player;
      }
    }
    return best;
  }

  private createHud(): void {
    this.hpBarBg = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.hpBarFill = this.add.graphics().setScrollFactor(0).setDepth(101);
    this.xpBarBg = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.xpBarFill = this.add.graphics().setScrollFactor(0).setDepth(101);
    this.waveHudBg = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.waveHudFill = this.add.graphics().setScrollFactor(0).setDepth(101);

    const hudTextY = this.playerCount === 2 ? 74 : 52;
    this.hudText = this.add
      .text(16, hudTextY, '', {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '16px',
        color: '#e8f0e8',
      })
      .setScrollFactor(0)
      .setDepth(102);

    if (this.playerCount === 2) {
      const labelStyle = {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '11px',
        color: '#a8c0a8',
      };
      this.add.text(302, 18, 'P1', labelStyle).setScrollFactor(0).setDepth(102);
      this.add.text(302, 38, 'P2', labelStyle).setScrollFactor(0).setDepth(102);
    }

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
    const twoPlayers = this.playerCount === 2 && this.player2 !== undefined;

    this.hpBarBg.clear();
    this.hpBarFill.clear();

    const hp1Ratio = this.player1.stats.maxHp > 0
      ? this.player1.stats.hp / this.player1.stats.maxHp
      : 0;
    this.hpBarBg.fillStyle(COLORS.hudBg, 0.85).fillRect(x, 16, barW, barH);
    this.hpBarFill.fillStyle(COLORS.hudHp, 1)
      .fillRect(x, 16, barW * Phaser.Math.Clamp(hp1Ratio, 0, 1), barH);

    if (twoPlayers && this.player2) {
      const hp2Ratio = this.player2.stats.maxHp > 0
        ? this.player2.stats.hp / this.player2.stats.maxHp
        : 0;
      this.hpBarBg.fillStyle(COLORS.hudBg, 0.85).fillRect(x, 36, barW, barH);
      this.hpBarFill.fillStyle(0x5ce0a0, 1)
        .fillRect(x, 36, barW * Phaser.Math.Clamp(hp2Ratio, 0, 1), barH);
    }

    const xpY = twoPlayers ? 58 : 36;
    const xpRatio = this.levelSystem.progress();
    this.xpBarBg.clear().fillStyle(COLORS.hudBg, 0.85).fillRect(x, xpY, barW, 10);
    this.xpBarFill.clear().fillStyle(COLORS.hudXp, 1)
      .fillRect(x, xpY, barW * Phaser.Math.Clamp(xpRatio, 0, 1), 10);

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

    this.inputSystem.update(this, this.player1, this.player2);
    this.spawner?.update(delta);
    this.waves?.update(delta);

    // Re-target each enemy to the nearest living player (systems chase player1 by default)
    const living = this.livingPlayers();
    if (living.length > 0) {
      for (const enemy of this.enemies.getChildren() as Enemy[]) {
        if (!enemy.active) continue;
        const target = this.nearestLivingPlayer(enemy.x, enemy.y);
        if (target) enemy.chase(target);
      }
    }

    this.updateAmulets(time);
    this.updateBossAbilities(time);
    this.updateCameraTarget(living);

    // Magnet pull + radius collect for XP, using each living player's pickup radius
    for (const orbObj of this.xpOrbs.getChildren() as XPOrb[]) {
      if (!orbObj.active) continue;
      let collected = false;
      for (const player of living) {
        const dist = Phaser.Math.Distance.Between(player.x, player.y, orbObj.x, orbObj.y);
        if (dist <= player.stats.xpPickupRadius) {
          this.collectOrb(orbObj);
          collected = true;
          break;
        }
      }
      if (collected || !orbObj.active) continue;
      const nearest = this.nearestLivingPlayer(orbObj.x, orbObj.y);
      if (nearest) {
        const dist = Phaser.Math.Distance.Between(nearest.x, nearest.y, orbObj.x, orbObj.y);
        if (dist < nearest.stats.xpPickupRadius * 2.5) {
          this.physics.moveToObject(orbObj, nearest, 280);
        }
      }
    }

    this.redrawHud();

    if (this.mode === 'infinite' && time - this.runStart >= 180000) {
      this.unlockAchievement('night_walker');
    }

    if (this.playerCount === 2 && time - this.runStart >= 120000) {
      this.unlockAchievement('partners_of_night');
    }

    this.handleDeaths();
  }

  private updateCameraTarget(living: Player[]): void {
    if (!this.cameraTarget) return;
    const targets = living.length > 0 ? living : this.players;
    let sumX = 0;
    let sumY = 0;
    for (const player of targets) {
      sumX += player.x;
      sumY += player.y;
    }
    this.cameraTarget.setPosition(sumX / targets.length, sumY / targets.length);
  }

  private handleDeaths(): void {
    for (const player of this.players) {
      if (!player.isDead()) continue;
      if (this.amulets.reviveAvailable) {
        this.amulets.reviveAvailable = false;
        player.revive(this.time.now);
        continue;
      }
      player.setAlpha(0.4);
      player.setVelocity(0, 0);
    }

    if (this.players.every((player) => player.isDead())) {
      this.triggerGameOver();
    }
  }

  private triggerGameOver(): void {
    if (this.gameOverTriggered) return;
    this.gameOverTriggered = true;

    this.weapon1.destroy();
    this.weapon2?.destroy();
    this.spawner?.destroy();
    this.waves?.destroy();
    for (const player of this.players) player.setVelocity(0, 0);

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
