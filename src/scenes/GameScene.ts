import Phaser from 'phaser';
import {
  COLORS,
  GAME_WIDTH,
  PLAYER_BASE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config/GameConfig';
import { FREE_MODE_ACHIEVEMENTS } from '../data/Achievements';
import { BOSS_DEFS } from '../data/EnemyCatalog';
import { GameSettingsStore, type PlayerCount } from '../data/GameModeStore';
import type {
  AchievementId,
  AmuletId,
  BossId,
  EnemyType,
  FreeModeConfig,
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
import { AuthService } from '../services/AuthService';
import { AchievementToast } from '../ui/AchievementToast';
import { getAmulet } from '../upgrades/Amulets';
import { applyMetaToStats } from '../upgrades/MetaShop';
import { SaveManager } from '../upgrades/MetaUpgrades';
import { RUN_UPGRADES } from '../upgrades/RunUpgrades';
import { formatDuration } from '../utils/formatDuration';

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
  private killStreak = 0;
  private bestKillStreakRun = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private survivalMs = 0;
  private pendingChoices: Array<'upgrade' | 'amulet'> = [];
  private choosingUpgrade = false;
  private gameOverTriggered = false;
  private nextAuraTick = 0;
  private nextRegenTick = 0;
  private nextBossAbility = 0;
  private nextLightningTick = 0;
  private bossesDefeated: BossId[] = [];
  private amulets: RunAmuletState = this.createEmptyAmuletState();
  private tookDamage = false;
  private tookDamageDuringKurupi = false;
  private kurupiMinionKills = 0;
  private lastAmuletWasThreeMoons = false;
  private freeConfig?: FreeModeConfig;
  private customSpawnDone = false;
  private customTotal = 0;
  private nameTags: Array<{ player: Player; text: Phaser.GameObjects.Text }> = [];

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
    this.killStreak = 0;
    this.bestKillStreakRun = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
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
    this.tookDamage = false;
    this.tookDamageDuringKurupi = false;
    this.kurupiMinionKills = 0;
    this.lastAmuletWasThreeMoons = false;
    this.freeConfig = this.mode === 'free' ? GameSettingsStore.getFreeConfig() : undefined;
    this.customSpawnDone = false;
    this.customTotal = 0;
    this.nameTags = [];
    this.survivalMs = 0;
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
    let stats: PlayerStats;
    if (this.freeConfig) {
      stats = this.freeConfig.useMeta
        ? applyMetaToStats(baseStats, { ...profile, metaLevels: this.freeConfig.metaLevels })
        : { ...baseStats };
      for (const upgrade of RUN_UPGRADES) {
        const count = this.freeConfig.buffCounts[upgrade.id] ?? 0;
        for (let i = 0; i < count; i++) upgrade.apply(stats);
      }
      stats.hp = stats.maxHp;
      this.levelSystem.level = Math.max(1, this.freeConfig.startLevel);
    } else {
      stats = applyMetaToStats(baseStats, profile);
    }

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
      () => {
        this.shotsFired += 1;
      },
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
          if (wave >= 30) this.unlockAchievement('long_night');
          if (wave >= 20 && !this.tookDamage) this.unlockAchievement('pristine_path');
        },
      });
      this.enemies = this.waves.enemies;
      // Start after create finishes so the first spawn doesn't hitch input/HUD setup
      this.time.delayedCall(0, () => this.waves?.start());
    } else if (this.freeConfig && this.freeConfig.baseKind === 'wave') {
      this.waves = new WaveSystem(
        this,
        this.player1,
        {
          onEncounter: () => {},
          onBossSpawn: (id) => {
            this.showToast(id === 'kurupi_brood' ? 'Kurupi da Ninhada!' : 'Boitatá do Olhar!');
          },
          onWaveCleared: () => this.freeVictory(),
        },
        { startWave: this.freeConfig.wave, singleWave: true },
      );
      this.enemies = this.waves.enemies;
      this.time.delayedCall(0, () => this.waves?.start());
    } else if (this.freeConfig && this.freeConfig.baseKind === 'custom') {
      this.enemies = this.physics.add.group({
        classType: Enemy,
        maxSize: 400,
        runChildUpdate: false,
      });
      const cfg = this.freeConfig;
      this.time.delayedCall(0, () => this.spawnCustomScenario(cfg));
    } else {
      // Infinito normal, ou Livre com base Infinito
      this.spawner = new SpawnSystem(this, this.player1, (type) => {
        SaveManager.discoverEnemy(type);
      });
      if (this.freeConfig) {
        this.spawner.seedElapsed(this.freeConfig.startTimeMs);
        this.survivalMs = this.freeConfig.startTimeMs;
      }
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
        () => partner.aimAngle,
        () => {
          this.shotsFired += 1;
        },
      );
      this.weapon2.start();
    }

    this.xpOrbs = this.physics.add.group({ classType: XPOrb, maxSize: 180 });
    this.bossShots = this.physics.add.group({
      classType: BossProjectile,
      maxSize: 160,
      runChildUpdate: true,
    });

    if (this.freeConfig) {
      for (const id of this.freeConfig.amulets) this.applyAmulet(id);
      this.unlockAchievement('free_trial');
    }

    this.createNameTags(profile.prefs?.showNameTag ?? false);
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
    // No Modo Livre só valem as conquistas exclusivas dele
    if (this.mode === 'free' && !FREE_MODE_ACHIEVEMENTS.includes(id)) return;
    if (SaveManager.unlockAchievement(id)) {
      this.toasts.enqueue(id);
    }
  }

  private createNameTags(showNameTag: boolean): void {
    const makeTag = (label: string) =>
      this.add
        .text(0, 0, label, {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '13px',
          color: '#f4d77b',
          backgroundColor: 'rgba(13,26,18,0.75)',
          padding: { x: 6, y: 2 },
        })
        .setOrigin(0.5, 1)
        .setDepth(60);

    if (this.playerCount === 2) {
      // Local: identifica as bolinhas por P1/P2
      this.nameTags.push({ player: this.player1, text: makeTag('P1') });
      if (this.player2) this.nameTags.push({ player: this.player2, text: makeTag('P2') });
      return;
    }

    if (showNameTag && AuthService.isLoggedIn()) {
      this.nameTags.push({ player: this.player1, text: makeTag(AuthService.username()) });
    }
  }

  private updateNameTags(): void {
    for (const tag of this.nameTags) {
      tag.text.setPosition(tag.player.x, tag.player.y - 24);
      tag.text.setAlpha(tag.player.isDead() ? 0.35 : 1);
    }
  }

  private freeSpawnPosition(): { x: number; y: number } {
    const cam = this.cameras.main;
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

  private spawnFreeEnemy(type: EnemyType): void {
    const pos = this.freeSpawnPosition();
    const enemy = this.enemies.get() as Enemy | null;
    if (enemy) enemy.spawn(pos.x, pos.y, type);
  }

  private spawnCustomScenario(cfg: FreeModeConfig): void {
    let total = 0;
    for (const [type, count] of Object.entries(cfg.customEnemies) as Array<[EnemyType, number]>) {
      for (let i = 0; i < count; i++) {
        this.spawnFreeEnemy(type);
        total += 1;
      }
    }
    for (const id of cfg.customBosses) {
      const def = BOSS_DEFS[id];
      const pos = this.freeSpawnPosition();
      const enemy = this.enemies.get() as Enemy | null;
      if (enemy) {
        enemy.spawnBoss(pos.x, pos.y, def);
        total += 1;
      }
    }
    this.customTotal = Math.max(total, 1);
    this.customSpawnDone = true;
  }

  private freeVictory(): void {
    if (this.gameOverTriggered) return;
    const cfg = this.freeConfig;
    if (cfg && cfg.customBosses.length >= 3) {
      this.unlockAchievement('triple_tyrants');
      const noBuffs = Object.values(cfg.buffCounts).every((count) => !count);
      if (noBuffs && cfg.amulets.length === 0 && !cfg.useMeta && cfg.startLevel <= 1) {
        this.unlockAchievement('naked_trial');
      }
    }
    this.triggerGameOver(true);
  }

  private setupCollisions(): void {
    this.physics.add.overlap(this.projectiles, this.enemies, (projObj, enemyObj) => {
      const proj = projObj as Projectile;
      const enemy = enemyObj as Enemy;
      if (!proj.active || !enemy.active) return;
      this.shotsHit += 1;
      this.damageEnemy(enemy, proj.damage);
      proj.deactivate();
    });

    for (const player of this.players) {
      this.physics.add.overlap(player, this.enemies, (_p, enemyObj) => {
        const enemy = enemyObj as Enemy;
        if (!enemy.active || player.isDead()) return;
        const hit = player.takeDamage(enemy.contactDamage, this.time.now);
        if (hit) this.onPlayerDamaged();
        if (hit && this.amulets.thorns) {
          this.damageEnemy(enemy, Math.max(8, Math.floor(enemy.contactDamage * 0.7)));
        }
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
        player.setVelocity(Math.cos(angle) * 220, Math.sin(angle) * 220);
      });

      this.physics.add.overlap(player, this.bossShots, (_p, shotObj) => {
        const shot = shotObj as BossProjectile;
        if (!shot.active || player.isDead()) return;
        const hit = player.takeDamage(shot.damage, this.time.now);
        if (hit) this.onPlayerDamaged();
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

  private onPlayerDamaged(): void {
    this.tookDamage = true;
    this.killStreak = 0;
    if (this.waves?.activeBossId === 'kurupi_brood') {
      this.tookDamageDuringKurupi = true;
    }
  }

  private onEnemyKilled(enemy: Enemy): void {
    this.kills += 1;
    this.killStreak += 1;
    this.bestKillStreakRun = Math.max(this.bestKillStreakRun, this.killStreak);
    if (this.kills === 1) this.unlockAchievement('first_blood');

    if (
      this.waves?.activeBossId === 'kurupi_brood'
      && !enemy.isBoss
      && !this.bossesDefeated.includes('kurupi_brood')
    ) {
      this.kurupiMinionKills += 1;
      if (this.kurupiMinionKills >= 10) this.unlockAchievement('brood_scouts');
      if (this.kurupiMinionKills >= 50) this.unlockAchievement('brood_horde');
      if (this.kurupiMinionKills >= 100) this.unlockAchievement('brood_swarm');
    }

    if (enemy.isBoss && enemy.bossId) {
      this.bossesDefeated.push(enemy.bossId);
      SaveManager.discoverBoss(enemy.bossId);
      this.unlockAchievement('boss_slayer');
      if (enemy.bossId === 'kurupi_brood' && !this.tookDamageDuringKurupi) {
        this.unlockAchievement('untouched_brood');
      }
      if (
        this.bossesDefeated.includes('kurupi_brood')
        && this.bossesDefeated.includes('boitata_gaze')
      ) {
        this.unlockAchievement('twin_tyrants');
      }
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
    if (this.amulets.owned.length >= 5) this.unlockAchievement('five_relics');

    const rarity = getAmulet(id).rarity;
    if (rarity === 3 && this.lastAmuletWasThreeMoons) {
      this.unlockAchievement('twin_moons');
    }
    this.lastAmuletWasThreeMoons = rarity === 3;

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
        this.unlockAchievement('echo_walker');
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
        this.unlockAchievement('storm_crown');
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
    const wavesCombat = this.waves !== undefined && this.waves.phase === 'combat';
    const freeCustom = this.mode === 'free' && this.freeConfig?.baseKind === 'custom';
    if (!wavesCombat && !freeCustom) return;
    if (time < this.nextBossAbility) return;

    const boss = (this.enemies.getChildren() as Enemy[]).find(
      (e) => e.active && e.isBoss,
    );
    if (!boss || !boss.bossId) return;

    if (boss.bossId === 'kurupi_brood') {
      this.nextBossAbility = time + 2200;
      if (this.waves) {
        this.waves.spawnExtra(Math.random() < 0.5 ? 'fast' : 'swift');
        this.waves.spawnExtra('normal');
      } else {
        this.spawnFreeEnemy(Math.random() < 0.5 ? 'fast' : 'swift');
        this.spawnFreeEnemy('normal');
        this.customTotal += 2;
      }
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
      .setVisible(
        this.waves !== undefined
        || (this.mode === 'free' && this.freeConfig?.baseKind === 'custom'),
      );

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

    const modeLabel =
      this.mode === 'waves' ? 'Rodadas' : this.mode === 'free' ? 'Livre' : 'Infinito';
    this.hudText.setText(
      `${modeLabel}  |  Nv ${this.levelSystem.level}  |  Abates ${this.kills}  |  ${formatDuration(this.survivalMs)}`,
    );

    this.waveHudBg.clear();
    this.waveHudFill.clear();
    if (this.mode === 'free' && this.freeConfig?.baseKind === 'custom') {
      const w = 420;
      const hx = (GAME_WIDTH - w) / 2;
      const hy = 40;
      const active = (this.enemies.getChildren() as Enemy[]).filter((e) => e.active).length;
      const ratio = this.customTotal > 0 ? active / this.customTotal : 0;
      this.waveHudBg.fillStyle(COLORS.hudBg, 0.9).fillRect(hx, hy, w, 14);
      this.waveHudFill.fillStyle(0xe05c5c, 1)
        .fillRect(hx, hy, w * Phaser.Math.Clamp(ratio, 0, 1), 14);
      this.waveHudText.setText(`Cenário personalizado  ·  Restam ${active}`);
    } else if (this.waves) {
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
    if (this.gameOverTriggered) return;

    if (!this.choosingUpgrade) {
      this.survivalMs += delta;
    }

    if (this.choosingUpgrade) return;

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
    this.updateNameTags();

    if (
      this.mode === 'free'
      && this.freeConfig?.baseKind === 'custom'
      && this.customSpawnDone
    ) {
      const anyActive = (this.enemies.getChildren() as Enemy[]).some((e) => e.active);
      if (!anyActive) {
        this.freeVictory();
        return;
      }
    }

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

    if (this.mode === 'infinite' && this.survivalMs >= 180000) {
      this.unlockAchievement('night_walker');
    }

    if (this.mode === 'infinite' && this.survivalMs >= 600000 && !this.tookDamage) {
      this.unlockAchievement('eternal_vigil');
    }

    if (this.mode === 'infinite' && this.survivalMs >= 1200000) {
      this.unlockAchievement('endless_dawn');
    }

    if (this.survivalMs >= 60000) {
      this.unlockAchievement('hut_defender');
    }

    if (this.levelSystem.level >= 10) this.unlockAchievement('forest_pupil');
    if (this.levelSystem.level >= 15) this.unlockAchievement('rising_spirit');

    if (this.playerCount === 2 && this.survivalMs >= 120000) {
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

  private triggerGameOver(victory = false): void {
    if (this.gameOverTriggered) return;
    this.gameOverTriggered = true;

    this.weapon1.destroy();
    this.weapon2?.destroy();
    this.spawner?.destroy();
    this.waves?.destroy();
    for (const player of this.players) player.setVelocity(0, 0);

    const survivalMs = this.survivalMs;
    const isFree = this.mode === 'free';
    const coinsEarned = isFree
      ? 0
      : Math.max(1, Math.floor(this.levelSystem.totalXpCollected * 0.5 + this.kills * 0.75));

    if (!isFree) {
      SaveManager.addCurrency(coinsEarned);
      const living = this.livingPlayers();
      const lowestHp = living.length > 0
        ? Math.min(...living.map((p) => Math.ceil(p.stats.hp)))
        : undefined;
      const accuracy = this.shotsFired > 0
        ? Math.round((this.shotsHit / this.shotsFired) * 100)
        : undefined;
      SaveManager.recordRunStats({
        survivalMs,
        kills: this.kills,
        level: this.levelSystem.level,
        mode: this.mode as 'infinite' | 'waves' | 'story',
        waveReached: this.waves?.wave,
        coinsEarned,
        killStreak: this.bestKillStreakRun,
        bossesDefeated: this.bossesDefeated.length,
        lowestHpSurvive: victory || living.length > 0 ? lowestHp : undefined,
        accuracy,
      });
    }

    const summary: RunSummary = {
      kills: this.kills,
      xpCollected: this.levelSystem.totalXpCollected,
      level: this.levelSystem.level,
      survivalMs,
      coinsEarned,
      mode: this.mode,
      waveReached: this.waves?.wave,
      bossesDefeated: [...this.bossesDefeated],
      freeMode: isFree,
      victory,
    };

    this.time.delayedCall(400, () => {
      this.scene.stop('UpgradeScene');
      this.scene.stop('PauseScene');
      this.scene.start('GameOverScene', summary);
    });
  }
}
