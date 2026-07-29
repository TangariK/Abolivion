import Phaser from 'phaser';
import {
  COLORS,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_BASE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config/GameConfig';
import { FREE_MODE_ACHIEVEMENTS } from '../data/Achievements';
import { emblemForBoss, getEmblem } from '../data/Emblems';
import { BOSS_DEFS, ENEMY_DEFS } from '../data/EnemyCatalog';
import { GameSettingsStore } from '../data/GameModeStore';
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
import { BossTurret } from '../entities/BossTurret';
import { DogCompanion } from '../entities/DogCompanion';
import { EmblemPickup } from '../entities/EmblemPickup';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { PoisonPuddle } from '../entities/PoisonPuddle';
import { Projectile } from '../entities/Projectile';
import { XPOrb } from '../entities/XPOrb';
import { AudioService } from '../services/AudioService';
import { AuthService } from '../services/AuthService';
import {
  getActiveOnlineSession,
  type OnlineSession,
  setActiveOnlineSession,
} from '../services/OnlineSession';
import { RoomService } from '../services/RoomService';
import {
  intelFromElapsedMs,
  intelFromWave,
  updateEnemyMovement,
} from '../systems/EnemyFlankAI';
import { InputSystem } from '../systems/InputSystem';
import { LevelSystem } from '../systems/LevelSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { WeaponSystem } from '../systems/WeaponSystem';
import { AchievementToast } from '../ui/AchievementToast';
import { getAmulet, type PickAmuletContext } from '../upgrades/Amulets';
import { applyMetaToStats, metaXpCostMultiplier } from '../upgrades/MetaShop';
import { SaveManager } from '../upgrades/MetaUpgrades';
import { RUN_UPGRADES } from '../upgrades/RunUpgrades';
import { formatDuration } from '../utils/formatDuration';

export class GameScene extends Phaser.Scene {
  private player1!: Player;
  private player2?: Player;
  private players: Player[] = [];
  private playerCount: 1 | 2 = 1;
  private cameraTarget?: Phaser.GameObjects.Zone;

  private online = false;
  private onlineSession: OnlineSession | null = null;
  private onlineRole: 'host' | 'guest' = 'host';
  private lobbyWaiting = false;
  private combatStarted = true;
  private peerLeftSolo = false;
  private nextSnapshot = 0;
  private remoteInput: {
    move: { up: boolean; down: boolean; left: boolean; right: boolean };
    aim: number;
  } | null = null;
  private lobbyBanner?: Phaser.GameObjects.Text;
  private deathBanner?: Phaser.GameObjects.Text;
  private statusHudRoot?: Phaser.GameObjects.Container;
  private statusHudGfx?: Phaser.GameObjects.Graphics;
  private statusHudLabels: Phaser.GameObjects.Text[] = [];
  private vigilBarBg?: Phaser.GameObjects.Graphics;
  private vigilBarFill?: Phaser.GameObjects.Graphics;
  private vigilProgress = 0;
  private spectating = false;
  private choiceGlow?: Phaser.GameObjects.Arc;
  private unsubOnline?: () => void;

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
  private nextKurupiDash = 0;
  private kurupiDashEnd = 0;
  private nextAcrobatLeap = 0;
  private acrobatLeapEnd = 0;
  private nextPoisonTrail = 0;
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
  private poisonPuddles: PoisonPuddle[] = [];
  private turrets!: Phaser.Physics.Arcade.Group;
  private emblemPickups!: Phaser.Physics.Arcade.Group;
  private poisonAura?: Phaser.GameObjects.Arc;

  constructor() {
    super('GameScene');
  }

  create(data?: { online?: boolean; onlineRole?: 'host' | 'guest' }): void {
    this.mode = GameSettingsStore.getMode();
    this.online = Boolean(data?.online) || GameSettingsStore.isOnline();
    this.onlineSession = this.online ? getActiveOnlineSession() : null;
    // Sem sessão ativa não dá para ficar no lobby online (ex.: Tentar de novo após game over)
    if (this.online && !this.onlineSession) {
      this.online = false;
      if (GameSettingsStore.isOnline()) GameSettingsStore.setPlayStyle('solo');
    }
    this.onlineRole = data?.onlineRole ?? this.onlineSession?.role ?? 'host';
    this.playerCount = this.online || GameSettingsStore.getPlayerCount() === 2 ? 2 : 1;
    this.lobbyWaiting = this.online && this.onlineRole === 'host' && !this.onlineSession?.remotePeer;
    // Guest enters lobby until start/countdown; if host already has peer, start countdown
    if (this.online) {
      this.lobbyWaiting = true;
      this.combatStarted = false;
    } else {
      this.combatStarted = true;
      this.lobbyWaiting = false;
    }
    this.peerLeftSolo = false;
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
    this.nextKurupiDash = 0;
    this.kurupiDashEnd = 0;
    this.nextAcrobatLeap = 0;
    this.acrobatLeapEnd = 0;
    this.nextPoisonTrail = 0;
    this.bossesDefeated = [];
    this.tookDamage = false;
    this.tookDamageDuringKurupi = false;
    this.kurupiMinionKills = 0;
    this.lastAmuletWasThreeMoons = false;
    this.freeConfig = this.mode === 'free' ? GameSettingsStore.getFreeConfig() : undefined;
    this.customSpawnDone = false;
    this.customTotal = 0;
    this.nameTags = [];
    this.poisonPuddles = [];
    this.poisonAura?.destroy();
    this.poisonAura = undefined;
    this.statusHudLabels = [];
    this.statusHudRoot = undefined;
    this.statusHudGfx = undefined;
    this.survivalMs = 0;
    this.levelSystem = new LevelSystem();
    this.toasts = new AchievementToast(this);

    // Cena Phaser é reutilizada — limpa sistemas da run anterior (senão Livre chama spawnExtra num group morto).
    this.waves = undefined;
    this.spawner = undefined;

    AudioService.bind(this);
    AudioService.stopAllMusic();
    AudioService.playMusic('music_run');

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.drawGround();

    const cx = WORLD_WIDTH / 2;
    const cy = WORLD_HEIGHT / 2;
    if (this.playerCount === 2) {
      this.add.image(cx - 56, cy, 'hut').setDepth(2);
      this.add.image(cx + 56, cy, 'hut').setDepth(2);
    } else {
      this.add.image(cx, cy, 'hut').setDepth(2);
    }

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
      poisonDamageMul: PLAYER_BASE.poisonDamageMul,
      bleedDamageMul: PLAYER_BASE.bleedDamageMul,
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
      this.levelSystem.setXpCostFactors(
        this.freeConfig.useMeta
          ? metaXpCostMultiplier({ ...profile, metaLevels: this.freeConfig.metaLevels })
          : 1,
        false,
      );
    } else {
      stats = applyMetaToStats(baseStats, profile);
      this.levelSystem.setXpCostFactors(metaXpCostMultiplier(profile), false);
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

    this.inputSystem = new InputSystem(
      this,
      this.online ? 'online' : this.playerCount === 2 ? 'local2' : 'solo',
    );

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
          this.showToast(`${BOSS_DEFS[id].name}!`);
          AudioService.playSfx('sfx_boss_appear');
          AudioService.playBossMusic(id);
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
      if (!this.online || !this.lobbyWaiting) {
        this.time.delayedCall(0, () => this.waves?.start());
      }
    } else if (this.freeConfig && this.freeConfig.baseKind === 'wave') {
      this.waves = new WaveSystem(
        this,
        this.player1,
        {
          onEncounter: () => {},
          onBossSpawn: (id) => {
            this.showToast(`${BOSS_DEFS[id].name}!`);
            AudioService.playSfx('sfx_boss_appear');
            AudioService.playBossMusic(id);
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
      if (!(this.online && this.onlineRole === 'guest') && !this.lobbyWaiting) {
        this.spawner.start();
      }
    }

    this.weapon1.start();
    if (this.online) {
      this.player1.canShoot = false;
      this.weapon1.setFireEnabled(false);
    }
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
      if (this.online) {
        partner.canShoot = false;
        this.weapon2.setFireEnabled(false);
      }
    }

    this.xpOrbs = this.physics.add.group({ classType: XPOrb, maxSize: 180 });
    this.bossShots = this.physics.add.group({
      classType: BossProjectile,
      maxSize: 160,
      runChildUpdate: true,
    });
    this.turrets = this.physics.add.group({
      classType: BossTurret,
      maxSize: 8,
      runChildUpdate: false,
    });
    this.emblemPickups = this.physics.add.group({
      classType: EmblemPickup,
      maxSize: 12,
      runChildUpdate: false,
    });

    if (this.freeConfig) {
      for (const id of this.freeConfig.amulets) this.applyAmulet(id);
      this.unlockAchievement('free_trial');
    }

    this.createNameTags(profile.prefs?.showNameTag ?? false);
    this.setupCollisions();
    this.createHud();
    this.createStatusHud();
    this.setupOnline();

    this.events.once('shutdown', () => {
      this.unsubOnline?.();
      this.weapon1.destroy();
      this.weapon2?.destroy();
      this.spawner?.destroy();
      this.waves?.destroy();
      if (this.online && this.onlineSession) {
        void RoomService.close(this.onlineSession.roomCode);
        void this.onlineSession.disconnect();
        setActiveOnlineSession(null);
      }
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

    if (this.online && this.onlineSession) {
      const localName = this.onlineSession.displayName;
      const remoteName = this.onlineSession.remotePeer?.displayName ?? 'aliado';
      this.nameTags.push({ player: this.player1, text: makeTag(localName) });
      if (this.player2) this.nameTags.push({ player: this.player2, text: makeTag(remoteName) });
      return;
    }

    if (this.playerCount === 2) {
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
        SaveManager.discoverBoss(id);
        total += 1;
      }
    }
    this.customTotal = Math.max(total, 1);
    this.customSpawnDone = true;

    if (cfg.customBosses.length > 0) {
      const strongest = this.strongestBossId(cfg.customBosses);
      this.showToast(`${BOSS_DEFS[strongest].name}!`);
      AudioService.playSfx('sfx_boss_appear');
      AudioService.playBossMusic(strongest);
    }
  }

  /** Chefão com maior rodada de aparição (ex.: Envenenador 40 > Lobo 30). */
  private strongestBossId(ids: BossId[]): BossId {
    return ids.reduce((best, id) =>
      (BOSS_DEFS[id]?.wave ?? 0) >= (BOSS_DEFS[best]?.wave ?? 0) ? id : best);
  }

  private strongestActiveBoss(bosses: Enemy[]): Enemy | undefined {
    if (bosses.length === 0) return undefined;
    return bosses.reduce((best, e) => {
      const wave = e.bossId ? (BOSS_DEFS[e.bossId]?.wave ?? 0) : 0;
      const bestWave = best.bossId ? (BOSS_DEFS[best.bossId]?.wave ?? 0) : 0;
      return wave >= bestWave ? e : best;
    });
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
      // Convidado: tiros são cosméticos — dano real só no host
      if (this.online && this.onlineRole === 'guest') {
        proj.deactivate();
        return;
      }
      this.shotsHit += 1;
      this.damageEnemy(enemy, proj.damage);
      proj.deactivate();
    });

    this.physics.add.overlap(this.projectiles, this.turrets, (projObj, turretObj) => {
      const proj = projObj as Projectile;
      const turret = turretObj as BossTurret;
      if (!proj.active || !turret.active) return;
      if (this.online && this.onlineRole === 'guest') {
        proj.deactivate();
        return;
      }
      this.shotsHit += 1;
      if (turret.takeDamage(proj.damage)) turret.deactivate();
      proj.deactivate();
    });

    for (const player of this.players) {
      this.physics.add.overlap(player, this.enemies, (_p, enemyObj) => {
        const enemy = enemyObj as Enemy;
        if (!enemy.active || player.isDead()) return;
        // Convidado: HP só via snapshot do host
        if (this.online && this.onlineRole === 'guest') return;
        const hit = player.takeDamage(enemy.contactDamage, this.time.now);
        if (hit) {
          this.onPlayerDamaged();
          const def = enemy.isBoss ? null : ENEMY_DEFS[enemy.enemyType as EnemyType];
          if (def?.appliesPoison) player.applyPoison(this.time.now);
          if (def?.bleedChance && Math.random() < def.bleedChance) {
            player.applyBleed(this.time.now);
          }
          if (def?.appliesLethargy) {
            player.applyLethargy(this.time.now, Boolean(def.lethargyDamaging));
          }
          if (enemy.bossId === 'poisoner_master') player.applyPoison(this.time.now);
          if (enemy.bossId === 'wolf_king') player.applyBleed(this.time.now);
        }
        if (hit && this.amulets.thorns) {
          this.damageEnemy(enemy, Math.max(8, Math.floor(enemy.contactDamage * 0.7)));
        }
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
        player.setVelocity(Math.cos(angle) * 220, Math.sin(angle) * 220);
      });

      this.physics.add.overlap(player, this.turrets, (_p, turretObj) => {
        const turret = turretObj as BossTurret;
        if (!turret.active || player.isDead()) return;
        if (this.online && this.onlineRole === 'guest') return;
        const hit = player.takeDamage(turret.contactDamage, this.time.now);
        if (hit) {
          this.onPlayerDamaged();
          const angle = Phaser.Math.Angle.Between(turret.x, turret.y, player.x, player.y);
          player.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);
        }
      });

      this.physics.add.overlap(player, this.bossShots, (_p, shotObj) => {
        const shot = shotObj as BossProjectile;
        if (!shot.active || player.isDead()) return;
        if (this.online && this.onlineRole === 'guest') {
          shot.deactivate();
          return;
        }
        if (shot.isPoisonPotion) {
          const hit = player.takeDamage(shot.damage, this.time.now);
          if (hit) this.onPlayerDamaged();
          const purple = shot.texture.key === 'poison_shot_purple';
          if (purple) {
            player.applyLethargy(this.time.now, true);
            player.applyPoison(this.time.now);
          } else {
            player.applyPoison(this.time.now);
          }
          shot.landOnPlayer(player.x, player.y);
          return;
        }
        const hit = player.takeDamage(shot.damage, this.time.now);
        if (hit) this.onPlayerDamaged();
        shot.deactivate();
      });

      this.physics.add.overlap(player, this.xpOrbs, (_p, orbObj) => {
        const orb = orbObj as XPOrb;
        if (!orb.active || player.isDead()) return;
        this.collectOrb(orb);
      });

      this.physics.add.overlap(player, this.emblemPickups, (_p, emblemObj) => {
        const pickup = emblemObj as EmblemPickup;
        if (!pickup.active || player.isDead()) return;
        SaveManager.discoverEmblem(pickup.emblemId);
        const def = getEmblem(pickup.emblemId);
        this.showToast(`${def.name} obtido!`);
        pickup.deactivate();
      });
    }

    this.physics.add.collider(this.enemies, this.enemies);
  }

  private collectOrb(orb: XPOrb): void {
    if (!orb.active) return;
    // Online: só o host conta XP / level-up (evita UI de buff no guest e choiceLock preso)
    if (this.online && this.onlineRole === 'guest') {
      orb.deactivate();
      return;
    }
    AudioService.playSfx('sfx_xp_collect');
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
    AudioService.playSfx('sfx_player_hurt');
    if (this.waves?.activeBossId === 'kurupi_brood') {
      this.tookDamageDuringKurupi = true;
    }
  }

  private onEnemyKilled(enemy: Enemy): void {
    this.kills += 1;
    this.killStreak += 1;
    this.bestKillStreakRun = Math.max(this.bestKillStreakRun, this.killStreak);
    AudioService.playSfx('sfx_enemy_death');
    if (this.kills === 1) this.unlockAchievement('first_blood');

    if (enemy.isBoss && enemy.bossId) {
      const remainingBosses = (this.enemies.getChildren() as Enemy[]).filter(
        (e) => e.active && e.isBoss && e !== enemy,
      );
      const next = this.strongestActiveBoss(remainingBosses);
      if (next?.bossId) AudioService.playBossMusic(next.bossId);
      else AudioService.playMusic('music_run');
    }
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
      this.clearTurretsForBoss(enemy.netId);
      if (enemy.bossId === 'poisoner_master') {
        this.poisonAura?.destroy();
        this.poisonAura = undefined;
      }
    }

    const xp = Math.max(1, Math.floor(enemy.xpValue * (1 + this.player1.stats.xpGainBonus)));
    const orb = this.xpOrbs.get() as XPOrb | null;
    if (orb) orb.spawn(enemy.x, enemy.y, xp, enemy.isBoss);

    if (enemy.isBoss && enemy.bossId) {
      const emblem = emblemForBoss(enemy.bossId);
      if (emblem) {
        const pickup = this.emblemPickups.get() as EmblemPickup | null;
        if (pickup) pickup.spawn(enemy.x, enemy.y, emblem.id, emblem.textureKey);
      }
    }

    enemy.deactivate();
    this.waves?.notifyKill();
    this.redrawHud();
  }

  private clearTurretsForBoss(ownerNetId: number): void {
    for (const turret of this.turrets.getChildren() as BossTurret[]) {
      if (turret.active && turret.ownerBossNetId === ownerNetId) turret.deactivate();
    }
  }

  private countActiveTurrets(): number {
    return (this.turrets.getChildren() as BossTurret[]).filter((t) => t.active).length;
  }

  private damageEnemy(enemy: Enemy, damage: number): void {
    if (!enemy.active) return;
    if (enemy.takeDamage(damage)) this.onEnemyKilled(enemy);
    else this.maybeEnterTriggered(enemy);
  }

  private maybeEnterTriggered(enemy: Enemy): void {
    if (!enemy.active || !enemy.isBoss || enemy.triggered) return;
    if (enemy.hp <= enemy.maxHp * 0.5) this.enterTriggeredMode(enemy);
  }

  private enterTriggeredMode(boss: Enemy): void {
    if (!boss.active || !boss.isBoss || boss.triggered || !boss.bossId) return;
    boss.triggered = true;
    const mode = BOSS_DEFS[boss.bossId]?.triggeredMode;
    if (mode) this.showToast(mode.name);
    this.cameras.main.shake(280, 0.012);
    AudioService.playSfx('sfx_boss_roar');
    boss.contactDamage = Math.floor(boss.contactDamage * 1.35);
    boss.moveSpeed = Math.floor(boss.moveSpeed * 1.2);
    if (boss.bossId === 'wolf_king') {
      boss.moveSpeed = Math.floor(boss.moveSpeed * 1.25);
      boss.contactDamage = Math.floor(boss.contactDamage * 1.15);
    }
    if (boss.bossId === 'acrobat_leap') {
      boss.moveSpeed = Math.floor(boss.moveSpeed * 1.15);
    }
    if (boss.bossId === 'poisoner_master') {
      this.poisonAura?.destroy();
      this.poisonAura = this.add
        .circle(boss.x, boss.y, 70, 0x6a40a0, 0.18)
        .setStrokeStyle(2, 0xb48cff, 0.55)
        .setDepth(4);
    }
  }

  private processPendingLevelUps(): void {
    if (this.choosingUpgrade || this.pendingChoices.length === 0 || this.gameOverTriggered) return;
    // Online guest nunca escolhe — host aplica buffs nos dois
    if (this.online && this.onlineRole === 'guest') {
      this.pendingChoices.length = 0;
      return;
    }
    const mode = this.pendingChoices.shift();
    if (!mode) return;
    if (mode === 'amulet' && this.amulets.owned.length >= 9) {
      this.processPendingLevelUps();
      return;
    }

    const living = this.livingPlayers();
    this.choosingUpgrade = true;

    // Online: NÃO pausa a GameScene — mundo (e snapshots) continuam para o aliado
    const pauseGame = !this.online;
    if (this.online) {
      this.player1.setChoiceProtected(true);
      this.weapon1.setFireEnabled(false);
      if (this.physics.world.isPaused) this.physics.world.resume();
      void this.onlineSession?.send({
        type: 'choiceLock',
        peerId: this.onlineSession.peerId,
        locked: true,
      });
    } else {
      this.scene.pause();
    }

    const allyDead = this.players.some((p) => p.isDead());
    const pickCtx: PickAmuletContext = {
      coop: this.playerCount === 2 && !this.peerLeftSolo,
      allyDead,
      mercyUses: this.amulets.mercyUses,
      soloAfterPeerLeft: this.peerLeftSolo,
    };

    this.scene.launch('UpgradeScene', {
      player: this.player1,
      players: living.length > 0 ? living : [...this.players],
      mode,
      ownedAmulets: [...this.amulets.owned],
      pickCtx,
      resumeGame: pauseGame,
      onAmuletSelected: (id: AmuletId) => this.applyAmulet(id),
      onAchievement: (id: 'xp_scholar') => this.unlockAchievement(id),
      onComplete: () => {
        this.choosingUpgrade = false;
        this.player1.setChoiceProtected(false);
        if (this.combatStarted && !this.player1.isDead()) {
          this.player1.canShoot = true;
          this.weapon1.setFireEnabled(true);
          this.weapon1.restartFiring();
        }
        void this.onlineSession?.send({
          type: 'choiceLock',
          peerId: this.onlineSession.peerId,
          locked: false,
        });
        this.forEachWeapon((weapon) => {
          weapon.refreshRate();
          weapon.restartFiring();
        });
        this.redrawAmuletBadges();
        // Próximo buff só no próximo tick — depois do stop() do UpgradeScene atual
        this.time.delayedCall(0, () => this.processPendingLevelUps());
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
      sideShotRight: false,
      sideShotLeft: false,
      allyChannelRevive: false,
      xpHalf: false,
      debuffDurationMul: 1,
      mercyUses: 0,
    };
  }

  private applyAmulet(id: AmuletId): void {
    if (id === 'anhanga_mercy') {
      this.useMercyRevive();
      return;
    }
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
      case 'jurupari_side_right':
        this.amulets.sideShotRight = true;
        this.forEachWeapon((weapon) => weapon.enableSideShotRight());
        break;
      case 'jurupari_side_left':
        this.amulets.sideShotLeft = true;
        this.forEachWeapon((weapon) => weapon.enableSideShotLeft());
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
        AudioService.playSfx('sfx_dog_bark');
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
        AudioService.playSfx('sfx_lightning');
        break;
      case 'jaci_halfmoon':
        this.amulets.xpHalf = true;
        this.levelSystem.enableHalfXpCosts();
        break;
      case 'cura_veil':
        this.amulets.debuffDurationMul = 0.6;
        for (const p of this.players) p.debuffDurationMul = 0.6;
        break;
      case 'yara_vigil':
        this.amulets.allyChannelRevive = true;
        break;
    }
  }

  private useMercyRevive(): void {
    const dead = this.players.find((p) => p.isDead());
    if (!dead) return;
    this.playReviveVfx(dead);
    dead.revive(this.time.now, 0.55);
    this.amulets.mercyUses += 1;
    if (this.online) {
      this.unlockAchievement('online_ally_rise');
      void this.onlineSession?.send({
        type: 'reviveAlly',
        targetPeerId: this.peerIdForPlayer(dead),
        hpRatio: 0.55,
      });
    }
  }

  private peerIdForPlayer(player: Player): string {
    if (!this.onlineSession) return '';
    if (this.onlineRole === 'host') {
      return player === this.player1 ? this.onlineSession.peerId : (this.onlineSession.remotePeer?.peerId ?? '');
    }
    return player === this.player1 ? this.onlineSession.peerId : (this.onlineSession.remotePeer?.peerId ?? '');
  }

  private playReviveVfx(player: Player): void {
    const ring = this.add.circle(player.x, player.y, 10, 0xf4d77b, 0.35).setDepth(60);
    this.tweens.add({
      targets: ring,
      radius: 90,
      alpha: 0,
      duration: 700,
      onComplete: () => ring.destroy(),
    });
    const flash = this.add.circle(player.x, player.y, 40, 0xffffff, 0.5).setDepth(61);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 400,
      onComplete: () => flash.destroy(),
    });
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

    const bosses = (this.enemies.getChildren() as Enemy[]).filter(
      (e) => e.active && e.isBoss && e.bossId,
    );
    for (const b of bosses) this.maybeEnterTriggered(b);

    this.updateTurretShots(time);

    if (time < this.nextBossAbility) return;

    // Com vários chefões (Livre), prioriza o mais forte para a habilidade do tick
    const boss = this.strongestActiveBoss(bosses);
    if (!boss || !boss.bossId) return;

    if (boss.bossId === 'kurupi_brood') {
      this.nextBossAbility = time + (boss.triggered ? 900 : 2000);
      const at = boss.triggered ? { x: boss.x, y: boss.y } : undefined;
      const summon = (type: EnemyType) => {
        if (this.waves?.enemies?.children) this.waves.spawnExtra(type, at);
        else {
          if (at) {
            let enemy: Enemy | null = null;
            try {
              enemy = this.enemies.get() as Enemy | null;
            } catch {
              return;
            }
            if (enemy) {
              enemy.spawn(at.x, at.y, type);
              this.customTotal += 1;
            }
          } else {
            this.spawnFreeEnemy(type);
            this.customTotal += 1;
          }
        }
      };
      summon(Math.random() < 0.5 ? 'fast' : 'swift');
      summon('normal');
      if (boss.triggered) {
        summon(Math.random() < 0.5 ? 'fast' : 'swift');
        summon('bruiser');
        summon('normal');
      }
      return;
    }

    if (boss.bossId === 'boitata_gaze') {
      this.nextBossAbility = time + (boss.triggered ? 220 : 340);
      const target = this.nearestLivingPlayer(boss.x, boss.y) ?? this.player1;
      const base = Phaser.Math.Angle.Between(boss.x, boss.y, target.x, target.y);
      const spread = boss.triggered ? 0.14 : 0.16;
      const rows = boss.triggered ? 7 : 5;
      const half = (rows - 1) / 2;
      const shotSpeed = boss.triggered ? 420 : 360;
      const shotDmg = boss.triggered ? 20 : 16;
      for (let i = -half; i <= half; i++) {
        const shot = this.bossShots.get() as BossProjectile | null;
        if (!shot) continue;
        shot.fire(boss.x, boss.y, base + i * spread, shotSpeed, shotDmg);
      }
      if (boss.triggered && this.countActiveTurrets() < 4) {
        this.spawnBoitataTurret(boss);
      }
      return;
    }

    if (boss.bossId === 'wolf_king') {
      this.nextBossAbility = time + (boss.triggered ? 800 : 1700);
      const pack: EnemyType[] = ['dire_wolf', 'dire_wolf_pup', 'dire_wolf_brute'];
      const pick = () => pack[Phaser.Math.Between(0, pack.length - 1)];
      if (this.waves?.enemies?.children) {
        this.waves.spawnExtra(pick());
        this.waves.spawnExtra(pick());
        if (boss.triggered) {
          this.waves.spawnExtra(pick());
          this.waves.spawnExtra(pick());
        }
      } else {
        this.spawnFreeEnemy(pick());
        this.spawnFreeEnemy(pick());
        this.customTotal += 2;
        if (boss.triggered) {
          this.spawnFreeEnemy(pick());
          this.spawnFreeEnemy(pick());
          this.customTotal += 2;
        }
      }
      if (boss.triggered) {
        for (const e of this.enemies.getChildren() as Enemy[]) {
          if (!e.active || e.isBoss) continue;
          if (
            e.enemyType === 'dire_wolf'
            || e.enemyType === 'dire_wolf_pup'
            || e.enemyType === 'dire_wolf_brute'
          ) {
            e.moveSpeed = Math.max(e.moveSpeed, ENEMY_DEFS[e.enemyType].speed * 1.4);
            e.contactDamage = Math.max(
              e.contactDamage,
              Math.floor(ENEMY_DEFS[e.enemyType].damage * 1.45),
            );
          }
        }
      }
      return;
    }

    if (boss.bossId === 'poisoner_master') {
      this.nextBossAbility = time + (boss.triggered ? 480 : 1000);
      const target = this.nearestLivingPlayer(boss.x, boss.y) ?? this.player1;
      const purple = boss.triggered;
      // Mira nas costas do player (mais atrás para a poça pegar nele)
      const aimBehind = (ox = 0, oy = 0) => {
        const tx = target.x - Math.cos(target.aimAngle) * 58 + ox;
        const ty = target.y - Math.sin(target.aimAngle) * 58 + oy;
        const shot = this.bossShots.get() as BossProjectile | null;
        if (!shot) return;
        shot.firePoison(boss.x, boss.y, tx, ty, purple ? 380 : 340, purple ? 32 : 28, (x, y) => {
          this.spawnPoisonPuddle(x, y, purple ? 9000 : 5000, purple);
          AudioService.playSfx('sfx_potion_land');
        });
        if (purple) {
          shot.setTexture('poison_shot_purple');
          shot.clearTint();
        }
      };

      // ~1/10 no Triggered: círculo de poções cercando o player
      if (purple && Math.random() < 0.1) {
        const n = 8;
        const radius = 100;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const shot = this.bossShots.get() as BossProjectile | null;
          if (!shot) continue;
          const tx = target.x + Math.cos(a) * radius;
          const ty = target.y + Math.sin(a) * radius;
          shot.firePoison(boss.x, boss.y, tx, ty, 360, 30, (x, y) => {
            this.spawnPoisonPuddle(x, y, 9000, true);
            AudioService.playSfx('sfx_potion_land');
          });
          shot.setTexture('poison_shot_purple');
          shot.clearTint();
        }
        return;
      }

      aimBehind();
      return;
    }

    if (boss.bossId === 'acrobat_leap') {
      // Leap timing handled in movement loop
      this.nextBossAbility = time + 99999;
    }
  }

  private spawnBoitataTurret(boss: Enemy): void {
    const turret = this.turrets.get() as BossTurret | null;
    if (!turret) return;
    const target = this.nearestLivingPlayer(boss.x, boss.y) ?? this.player1;
    let x: number;
    let y: number;
    if (Math.random() < 0.5) {
      // Surpresa atrás do player
      const ang = target.aimAngle + Math.PI + (Math.random() - 0.5) * 1.1;
      const dist = 95 + Math.random() * 85;
      x = Phaser.Math.Clamp(target.x + Math.cos(ang) * dist, 40, WORLD_WIDTH - 40);
      y = Phaser.Math.Clamp(target.y + Math.sin(ang) * dist, 40, WORLD_HEIGHT - 40);
    } else {
      const angle = Math.random() * Math.PI * 2;
      const dist = 90 + Math.random() * 50;
      x = Phaser.Math.Clamp(boss.x + Math.cos(angle) * dist, 40, WORLD_WIDTH - 40);
      y = Phaser.Math.Clamp(boss.y + Math.sin(angle) * dist, 40, WORLD_HEIGHT - 40);
    }
    turret.spawn(x, y, boss.netId);
  }

  private updateTurretShots(time: number): void {
    const bosses = (this.enemies.getChildren() as Enemy[]).filter(
      (e) => e.active && e.bossId === 'boitata_gaze',
    );
    const triggered = bosses.some((b) => b.triggered);
    const interval = triggered ? 480 : 750;
    for (const turret of this.turrets.getChildren() as BossTurret[]) {
      if (!turret.active) continue;
      if (time < turret.nextShot) continue;
      const target = this.nearestLivingPlayer(turret.x, turret.y);
      if (!target) continue;
      turret.nextShot = time + interval;
      const angle = Phaser.Math.Angle.Between(turret.x, turret.y, target.x, target.y);
      const shot = this.bossShots.get() as BossProjectile | null;
      if (!shot) continue;
      shot.fire(turret.x, turret.y, angle, triggered ? 380 : 320, triggered ? 14 : 12);
    }
  }

  private spawnPoisonPuddle(x: number, y: number, ttlMs = 5000, lethargy = false): void {
    const puddle = new PoisonPuddle(this, x, y, 54, ttlMs, lethargy);
    this.poisonPuddles.push(puddle);
  }

  private updatePoisonPuddles(time: number, delta: number): void {
    if (this.online && this.onlineRole === 'guest') return;
    for (let i = this.poisonPuddles.length - 1; i >= 0; i--) {
      const puddle = this.poisonPuddles[i];
      if (!puddle.update(time, delta)) {
        puddle.destroy();
        this.poisonPuddles.splice(i, 1);
        continue;
      }
      if (!puddle.canTick(time)) continue;
      for (const player of this.livingPlayers()) {
        const d = Phaser.Math.Distance.Between(player.x, player.y, puddle.x, puddle.y);
        if (d <= puddle.hitRadius) {
          if (puddle.appliesLethargy) {
            player.applyLethargy(time, true);
            player.applyPoison(time);
          } else {
            player.applyPoison(time);
          }
          const hit = player.takeDamage(4, time);
          if (hit) this.onPlayerDamaged();
        }
      }
    }
  }

  private updateWolfKingMovement(boss: Enemy, target: Player): void {
    const toward = Phaser.Math.Angle.Between(boss.x, boss.y, target.x, target.y);
    const dist = Phaser.Math.Distance.Between(boss.x, boss.y, target.x, target.y);
    const toBossFromPlayer = Phaser.Math.Angle.Between(target.x, target.y, boss.x, boss.y);
    const aimDiff = Phaser.Math.Angle.Wrap(toBossFromPlayer - target.aimAngle);

    // Sempre avança; na mira, dá um “pulo” lateral sem fugir da briga
    let vx = Math.cos(toward);
    let vy = Math.sin(toward);
    const inCrosshair = Math.abs(aimDiff) < 0.5 && dist > 48;
    if (inCrosshair) {
      const side = aimDiff >= 0 ? 1 : -1;
      const perp = toward + side * (Math.PI / 2);
      vx = Math.cos(toward) * 0.7 + Math.cos(perp) * 0.9;
      vy = Math.sin(toward) * 0.7 + Math.sin(perp) * 0.9;
    }

    const len = Math.hypot(vx, vy) || 1;
    let speed = boss.moveSpeed * (inCrosshair ? 1.45 : 1.2);
    if (boss.triggered) speed *= 1.55;
    const body = boss.body as Phaser.Physics.Arcade.Body;
    body.setVelocity((vx / len) * speed, (vy / len) * speed);
  }

  private updateAcrobatLeap(boss: Enemy, target: Player, time: number): void {
    const body = boss.body as Phaser.Physics.Arcade.Body;
    if (boss.leaping) {
      const dist = Phaser.Math.Distance.Between(boss.x, boss.y, target.x, target.y);
      if (dist < 48 || time >= this.acrobatLeapEnd) {
        this.landAcrobatLeap(boss, time);
      }
      return;
    }

    boss.chase(target);
    const interval = boss.triggered ? 900 : 2200;
    if (this.nextAcrobatLeap === 0) this.nextAcrobatLeap = time + interval;
    if (time < this.nextAcrobatLeap) return;

    this.nextAcrobatLeap = time + interval;
    boss.leaping = true;
    this.acrobatLeapEnd = time + (boss.triggered ? 550 : 700);
    const angle = Phaser.Math.Angle.Between(boss.x, boss.y, target.x, target.y);
    const leapSpeed = boss.triggered ? 620 : 460;
    this.physics.velocityFromRotation(angle, leapSpeed, body.velocity);
  }

  private landAcrobatLeap(boss: Enemy, time: number): void {
    boss.leaping = false;
    const body = boss.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    AudioService.playSfx('sfx_acrobat_land');
    const radius = boss.triggered ? 175 : 130;
    const damage = Math.floor(boss.contactDamage * (boss.triggered ? 1.55 : 1.2));
    const ring = this.add
      .circle(boss.x, boss.y, radius, 0xf0c060, 0.35)
      .setStrokeStyle(3, 0xffe8a3, 0.9)
      .setDepth(50);
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.08,
      duration: 420,
      onComplete: () => ring.destroy(),
    });
    for (const player of this.livingPlayers()) {
      const d = Phaser.Math.Distance.Between(boss.x, boss.y, player.x, player.y);
      if (d > radius) continue;
      const hit = player.takeDamage(damage, time);
      if (hit) this.onPlayerDamaged();
      player.applyDizzy(time, boss.triggered ? 3800 : 2400);
    }
  }

  private updateKurupiDash(boss: Enemy, target: Player, time: number): void {
    const body = boss.body as Phaser.Physics.Arcade.Body;
    if (boss.leaping) {
      const angle = Phaser.Math.Angle.Between(boss.x, boss.y, target.x, target.y);
      this.physics.velocityFromRotation(angle, Math.max(520, boss.moveSpeed * 10), body.velocity);
      if (time >= this.kurupiDashEnd) {
        boss.leaping = false;
        body.setVelocity(0, 0);
        this.nextKurupiDash = time + 1400;
      }
      return;
    }
    boss.chase(target);
    if (!boss.triggered) return;
    if (time < this.nextKurupiDash) return;
    boss.leaping = true;
    this.kurupiDashEnd = time + 420;
    const angle = Phaser.Math.Angle.Between(boss.x, boss.y, target.x, target.y);
    this.physics.velocityFromRotation(angle, Math.max(520, boss.moveSpeed * 10), body.velocity);
  }

  private updatePoisonerTrail(boss: Enemy, time: number): void {
    if (this.poisonAura) this.poisonAura.setPosition(boss.x, boss.y);
    if (!boss.triggered) return;
    if (time < this.nextPoisonTrail) return;
    this.nextPoisonTrail = time + 480;
    this.spawnPoisonPuddle(boss.x, boss.y, 8000, true);
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
    const hudTextY = this.playerCount === 2 ? 74 : 52;
    // Abaixo do texto de abates — sem cobrir HP/XP
    const y = hudTextY + 52;
    this.amulets.owned.forEach((id, index) => {
      const amulet = getAmulet(id);
      const x = 24 + index * 40;
      const badge = this.add.circle(x, y, 15, COLORS.accent).setStrokeStyle(2, 0xffe8a3);
      const symbol = this.add
        .text(x, y, amulet.symbol, {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '12px',
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
      const activeEnemies = (this.enemies.getChildren() as Enemy[]).filter((e) => e.active);
      const boss = this.strongestActiveBoss(activeEnemies.filter((e) => e.isBoss));
      if (boss) {
        const ratio = boss.maxHp > 0 ? boss.hp / boss.maxHp : 0;
        const minions = activeEnemies.filter((e) => !e.isBoss).length;
        const bossName = boss.bossId && BOSS_DEFS[boss.bossId]
          ? BOSS_DEFS[boss.bossId].name
          : 'Chefão';
        const summons = boss.bossId === 'kurupi_brood' || boss.bossId === 'wolf_king';
        let label = summons
          ? `${bossName}  ·  HP ${Math.ceil(boss.hp)}  ·  Invocados ${minions}`
          : `${bossName}  ·  HP ${Math.ceil(boss.hp)}/${boss.maxHp}`;
        const turretCount = this.countActiveTurrets();
        if (boss.bossId === 'boitata_gaze') {
          label = `${bossName}  ·  HP ${Math.ceil(boss.hp)}  ·  Torretas ${turretCount}`;
        }
        if (boss.triggered) label = `TRIGGERED  ·  ${label}`;
        this.waveHudBg.fillStyle(COLORS.hudBg, 0.9).fillRect(hx, hy, w, 14);
        this.waveHudFill.fillStyle(boss.triggered ? 0xe84828 : 0xc45a3a, 1)
          .fillRect(hx, hy, w * Phaser.Math.Clamp(ratio, 0, 1), 14);
        this.waveHudText.setText(label);
      } else {
        const active = activeEnemies.length;
        const ratio = this.customTotal > 0 ? active / this.customTotal : 0;
        this.waveHudBg.fillStyle(COLORS.hudBg, 0.9).fillRect(hx, hy, w, 14);
        this.waveHudFill.fillStyle(0xe05c5c, 1)
          .fillRect(hx, hy, w * Phaser.Math.Clamp(ratio, 0, 1), 14);
        this.waveHudText.setText(`Cenário personalizado  ·  Restam ${active}`);
      }
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
          const bossName = boss.bossId && BOSS_DEFS[boss.bossId]
            ? BOSS_DEFS[boss.bossId].name
            : 'Chefão';
          const summons = boss.bossId === 'kurupi_brood' || boss.bossId === 'wolf_king';
          label = summons
            ? `${bossName}  ·  HP ${Math.ceil(boss.hp)}  ·  Invocados ${minions}`
            : `${bossName}  ·  HP ${Math.ceil(boss.hp)}/${boss.maxHp}`;
          const turretCount = this.countActiveTurrets();
          if (boss.bossId === 'boitata_gaze') {
            label = `${bossName}  ·  HP ${Math.ceil(boss.hp)}  ·  Torretas ${turretCount}`;
          }
          if (boss.triggered) {
            label = `TRIGGERED  ·  ${label}`;
            fillColor = 0xe84828;
          }
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

    if (this.online && this.lobbyWaiting) {
      this.inputSystem.update(this, this.player1, undefined);
      this.player1.canShoot = false;
      this.weapon1.setFireEnabled(false);
      this.updateNameTags();
      return;
    }

    // Rede de segurança: proteção de escolha só vale com UI aberta
    if (!this.choosingUpgrade && this.player1.choiceProtected && !this.player1.isDead()) {
      this.player1.setChoiceProtected(false);
      if (this.combatStarted) {
        this.weapon1.setFireEnabled(true);
        this.weapon1.restartFiring();
      }
    }

    if (!this.choosingUpgrade && this.combatStarted) {
      this.survivalMs += delta;
    }

    if (this.choosingUpgrade && !this.online) return;

    if (!this.online && this.inputSystem.isPausePressed()) {
      this.scene.pause();
      this.scene.launch('PauseScene');
      return;
    }

    if (this.pendingChoices.length > 0) {
      this.processPendingLevelUps();
      if (this.choosingUpgrade && !this.online) return;
    }

    if (this.online && this.onlineRole === 'guest' && this.onlineSession) {
      this.inputSystem.update(this, this.player1, undefined);
      void this.onlineSession.send({
        type: 'input',
        peerId: this.onlineSession.peerId,
        seq: Math.floor(time),
        move: this.inputSystem.getWasdMove(),
        aim: this.player1.aimAngle,
        firing: !this.player1.isDead() && this.player1.canShoot,
      });
    } else {
      this.inputSystem.update(this, this.player1, this.online ? undefined : this.player2);
      if (this.online && this.onlineRole === 'host' && this.player2 && this.remoteInput) {
        if (!this.player2.isDead()) {
          this.player2.updateMovement(this.remoteInput.move);
          this.player2.setAimAngle(this.remoteInput.aim);
        }
      }
    }

    if (!(this.online && this.onlineRole === 'guest')) {
      this.spawner?.update(delta);
      this.waves?.update(delta);
    }

    for (const p of this.players) {
      if (!p.isDead()) p.tickStatuses(time);
    }
    this.updateStatusHud(time);
    this.updateVigilChannel(delta);
    this.broadcastSnapshotIfHost(time);

    if (this.online && this.survivalMs >= 180000 && this.livingPlayers().length === 2) {
      this.unlockAchievement('online_tribe_bond');
    }

    const living = this.livingPlayers();
    if (living.length > 0 && !(this.online && this.onlineRole === 'guest')) {
      let intel = 0;
      if (this.waves) intel = intelFromWave(this.waves.wave);
      else if (this.spawner) intel = intelFromElapsedMs(this.spawner.getElapsed());
      else if (this.mode === 'free' && this.freeConfig?.baseKind === 'custom') intel = 0.55;

      for (const enemy of this.enemies.getChildren() as Enemy[]) {
        if (!enemy.active) continue;
        this.maybeEnterTriggered(enemy);
        const target = this.nearestLivingPlayer(enemy.x, enemy.y);
        if (!target) continue;
        const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, target.x, target.y);

        if (enemy.bossId === 'wolf_king') {
          this.updateWolfKingMovement(enemy, target);
        } else if (enemy.bossId === 'kurupi_brood') {
          this.updateKurupiDash(enemy, target, time);
        } else if (enemy.bossId === 'acrobat_leap') {
          this.updateAcrobatLeap(enemy, target, time);
        } else if (enemy.bossId === 'poisoner_master') {
          enemy.chase(target);
          this.updatePoisonerTrail(enemy, time);
        } else if (enemy.isBoss) {
          enemy.chase(target);
        } else {
          updateEnemyMovement(enemy, target, intel);
          enemy.updateCamouflage(dist);
        }
      }
    }

    this.updatePoisonPuddles(time, delta);

    this.updateAmulets(time);
    if (!(this.online && this.onlineRole === 'guest')) {
      this.updateBossAbilities(time);
    }
    this.updateCameraTarget(
      this.spectating && this.player2 && !this.player2.isDead()
        ? [this.player2]
        : living,
    );
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
        const magnet = nearest.stats.xpPickupRadius * 2.5;
        if (dist < magnet) {
          this.physics.moveToObject(orbObj, nearest, 280);
        } else {
          (orbObj.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        }
      } else {
        (orbObj.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
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
    if (this.survivalMs >= 60000) this.unlockAchievement('hut_defender');
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
    // Se morreu no meio da escolha, libera o mundo / tiro do aliado
    if (this.choosingUpgrade && this.player1.isDead()) {
      this.cancelLocalUpgradeChoice();
    }

    for (const player of this.players) {
      if (!player.isDead()) continue;
      if (player.choiceProtected) player.setChoiceProtected(false);
      player.canShoot = false;
      if (this.amulets.reviveAvailable) {
        this.amulets.reviveAvailable = false;
        player.revive(this.time.now);
        continue;
      }
      player.setAlpha(0.4);
      player.setVelocity(0, 0);
      if (player === this.player1) this.weapon1.setFireEnabled(false);
      if (player === this.player2) this.weapon2?.setFireEnabled(false);
    }

    if (this.combatStarted) {
      for (const player of this.livingPlayers()) {
        if (player.choiceProtected) continue;
        player.canShoot = true;
      }
      if (!this.player1.isDead() && !this.player1.choiceProtected) {
        this.weapon1.setFireEnabled(true);
      }
      if (this.player2 && !this.player2.isDead() && !this.player2.choiceProtected) {
        this.weapon2?.setFireEnabled(true);
      }
    }

    if (this.playerCount === 2 && !this.peerLeftSolo) {
      const localDead = this.player1.isDead();
      const ally = this.player2;
      if (localDead && ally && !ally.isDead()) {
        this.showDeathWaitHint();
      } else if (!localDead && ally?.isDead()) {
        this.showAllyDownHint();
      }
    }

    if (this.players.every((player) => player.isDead())) {
      this.triggerGameOver();
    }
  }

  /** Sai da UI de buff sem deixar choiceProtected/tiro travados. */
  private cancelLocalUpgradeChoice(): void {
    this.choosingUpgrade = false;
    this.player1.setChoiceProtected(false);
    void this.onlineSession?.send({
      type: 'choiceLock',
      peerId: this.onlineSession.peerId,
      locked: false,
    });
    this.scene.stop('UpgradeScene');
    if (!this.online && this.scene.isPaused()) {
      this.scene.resume();
    }
  }

  private showDeathWaitHint(): void {
    if (this.deathBanner) return;
    const msg = this.online
      ? 'Você caiu. Espere o aliado reviver você (amuleto) ou volte ao menu.'
      : 'Você caiu. O aliado pode reviver você com um amuleto.';
    this.deathBanner = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 70, msg, {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '15px',
        color: '#f4d77b',
        backgroundColor: 'rgba(13,26,18,0.85)',
        padding: { x: 10, y: 6 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);
    if (this.online) {
      this.spectating = true;
      // Tecla M → menu (encerra sala)
      this.input.keyboard?.once('keydown-M', () => this.leaveOnlineToMenu());
      this.deathBanner.setText(`${msg}\n[M] Menu (encerra a sala para ambos)`);
    }
  }

  private showAllyDownHint(): void {
    if (this.deathBanner) return;
    this.deathBanner = this.add
      .text(GAME_WIDTH / 2, 56, 'Aliado caído — amuletos de revive podem aparecer.', {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '14px',
        color: '#e8c0b8',
        backgroundColor: 'rgba(13,26,18,0.8)',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);
    this.time.delayedCall(4000, () => {
      this.deathBanner?.destroy();
      this.deathBanner = undefined;
    });
  }

  private leaveOnlineToMenu(): void {
    void this.onlineSession?.send({ type: 'soloContinue' });
    void this.onlineSession?.disconnect();
    if (this.onlineSession) void RoomService.close(this.onlineSession.roomCode);
    setActiveOnlineSession(null);
    this.scene.start('MenuScene');
  }

  private createStatusHud(): void {
    this.statusHudRoot = this.add.container(GAME_WIDTH - 16, 12).setScrollFactor(0).setDepth(130);
    this.statusHudGfx = this.add.graphics();
    this.statusHudRoot.add(this.statusHudGfx);
    this.statusHudLabels = [];
  }

  private updateStatusHud(now: number): void {
    if (!this.statusHudRoot || !this.statusHudGfx) return;
    const entries = this.player1.getStatusHudEntries(now);
    this.statusHudRoot.setVisible(entries.length > 0);
    if (entries.length === 0) {
      this.statusHudGfx.clear();
      for (const label of this.statusHudLabels) label.setVisible(false);
      return;
    }

    while (this.statusHudLabels.length < entries.length) {
      const text = this.add
        .text(0, 0, '', {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '13px',
          color: '#e8f0e8',
          align: 'right',
        })
        .setOrigin(1, 0);
      this.statusHudRoot.add(text);
      this.statusHudLabels.push(text);
    }

    this.statusHudGfx.clear();
    const barW = 90;
    const rowH = 28;
    entries.forEach((entry, i) => {
      const y = i * rowH;
      const label = this.statusHudLabels[i];
      const secs = Math.max(0.1, entry.remainingMs / 1000).toFixed(1);
      label.setText(`${entry.label} ${secs}s`);
      label.setColor(entry.color);
      label.setPosition(0, y);
      label.setVisible(true);
      const ratio = entry.totalMs > 0
        ? Phaser.Math.Clamp(entry.remainingMs / entry.totalMs, 0, 1)
        : 0;
      const color = Phaser.Display.Color.HexStringToColor(entry.color).color;
      this.statusHudGfx!.fillStyle(0x0d1a12, 0.75).fillRect(-barW, y + 16, barW, 6);
      this.statusHudGfx!.fillStyle(color, 0.95).fillRect(-barW, y + 16, barW * ratio, 6);
    });
    for (let i = entries.length; i < this.statusHudLabels.length; i++) {
      this.statusHudLabels[i].setVisible(false);
    }
  }

  private setupOnline(): void {
    if (!this.online || !this.onlineSession) return;
    this.unlockAchievement('online_first_fire');
    if (this.onlineRole === 'host' && this.onlineSession.remotePeer) {
      this.unlockAchievement('online_open_room');
    }

    this.lobbyBanner = this.add
      .text(GAME_WIDTH / 2, 100, 'Aguardando jogador 1/2…', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '22px',
        color: '#f4d77b',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(150);

    this.unsubOnline = this.onlineSession.onMessage((msg) => {
      if (msg.type === 'hello') {
        this.onlineSession!.remotePeer = msg.peer;
        if (this.nameTags[1]) this.nameTags[1].text.setText(msg.peer.displayName);
        // Host responde com o próprio nome (convidado criava sala sem receber o hello do host)
        if (this.onlineRole === 'host') {
          void this.onlineSession!.send({
            type: 'hello',
            peer: {
              peerId: this.onlineSession!.peerId,
              displayName: this.onlineSession!.displayName,
              role: 'host',
            },
          });
          if (this.lobbyWaiting) this.beginOnlineCountdown();
        }
      }
      if (msg.type === 'countdown' && this.onlineRole === 'guest') {
        this.lobbyBanner?.setText(`Começa em ${msg.seconds}…`);
      }
      if (msg.type === 'start') {
        this.beginOnlineCombat();
      }
      if (msg.type === 'input' && this.onlineRole === 'host' && this.player2) {
        this.remoteInput = { move: msg.move, aim: msg.aim };
        this.player2.setAimAngle(msg.aim);
      }
      if (msg.type === 'peerLeft' || msg.type === 'soloContinue') {
        this.convertToSoloAfterPeerLeft();
      }
      if (msg.type === 'choiceLock') {
        const localId = this.onlineSession?.peerId;
        if (msg.peerId !== localId && this.player2) {
          // Morto não fica “protegido” (imortalidade fantasma no host)
          if (this.player2.isDead()) {
            this.player2.setChoiceProtected(false);
          } else {
            this.player2.setChoiceProtected(msg.locked);
            if (!msg.locked && this.combatStarted) {
              this.weapon2?.setFireEnabled(true);
              this.weapon2?.restartFiring();
            }
          }
        }
      }
      if (msg.type === 'reviveAlly') {
        const target =
          msg.targetPeerId === this.onlineSession?.peerId ? this.player1 : this.player2;
        if (target?.isDead()) {
          this.playReviveVfx(target);
          target.revive(this.time.now, msg.hpRatio);
          this.deathBanner?.destroy();
          this.deathBanner = undefined;
          this.spectating = false;
        }
      }
      if (msg.type === 'snapshot' && this.onlineRole === 'guest') {
        this.applyOnlineSnapshot(msg);
      }
    });

    // Host já tem peer (veio do overlay) — manda hello para o convidado ver o nome
    if (this.onlineRole === 'host' && this.onlineSession.remotePeer) {
      void this.onlineSession.send({
        type: 'hello',
        peer: {
          peerId: this.onlineSession.peerId,
          displayName: this.onlineSession.displayName,
          role: 'host',
        },
      });
      if (this.nameTags[1] && this.onlineSession.remotePeer.displayName) {
        this.nameTags[1].text.setText(this.onlineSession.remotePeer.displayName);
      }
      this.beginOnlineCountdown();
    } else if (this.onlineRole === 'guest') {
      this.lobbyBanner?.setText('Conectado — aguardando início…');
      void this.onlineSession.send({
        type: 'hello',
        peer: {
          peerId: this.onlineSession.peerId,
          displayName: this.onlineSession.displayName,
          role: 'guest',
        },
      });
    }
  }

  private beginOnlineCountdown(): void {
    if (!this.lobbyWaiting) return;
    this.lobbyWaiting = false;
    let sec = 5;
    this.lobbyBanner?.setText(`Jogador encontrado! Começa em ${sec}…`);
    void this.onlineSession?.send({ type: 'countdown', seconds: sec });
    const tick = this.time.addEvent({
      delay: 1000,
      repeat: 4,
      callback: () => {
        sec -= 1;
        if (sec > 0) {
          this.lobbyBanner?.setText(`Começa em ${sec}…`);
          void this.onlineSession?.send({ type: 'countdown', seconds: sec });
        } else {
          void this.onlineSession?.send({ type: 'start', seed: Date.now() });
          this.beginOnlineCombat();
        }
      },
    });
    void tick;
  }

  private beginOnlineCombat(): void {
    this.combatStarted = true;
    this.lobbyWaiting = false;
    this.lobbyBanner?.destroy();
    this.lobbyBanner = undefined;
    this.player1.canShoot = true;
    this.weapon1.setFireEnabled(true);
    if (this.player2) {
      this.player2.canShoot = true;
      this.weapon2?.setFireEnabled(true);
    }
    if (this.onlineRole === 'host') {
      if (this.mode === 'waves' && this.waves && this.waves.phase === 'idle') {
        this.waves.start();
      } else if (this.spawner) {
        this.spawner.start();
      }
    }
  }

  private convertToSoloAfterPeerLeft(): void {
    this.peerLeftSolo = true;
    this.showToast('Aliado saiu — a noite continua sozinha.');
    if (this.player2) {
      this.player2.setActive(false);
      this.player2.setVisible(false);
      this.player2.stats.hp = 0;
    }
    this.deathBanner?.destroy();
    this.deathBanner = undefined;
  }

  private applyOnlineSnapshot(msg: {
    players: Array<{
      peerId: string;
      x: number;
      y: number;
      hp: number;
      maxHp: number;
      dead: boolean;
      aim: number;
      choosing: boolean;
      poison: boolean;
      bleed: boolean;
      damage?: number;
      fireRate?: number;
      speed?: number;
      projectileSpeed?: number;
      xpPickupRadius?: number;
      xpGainBonus?: number;
    }>;
    enemies: Array<{ id: number; x: number; y: number; type: string; hp: number; armor: number }>;
    kills: number;
    level: number;
    xpProgress?: number;
    survivalMs: number;
  }): void {
    this.kills = msg.kills;
    this.survivalMs = msg.survivalMs;
    this.levelSystem.syncFromHost(msg.level, msg.xpProgress ?? this.levelSystem.progress());
    for (const p of msg.players) {
      const isLocal = p.peerId === this.onlineSession?.peerId;
      const player = isLocal ? this.player1 : this.player2;
      if (!player) continue;
      if (!isLocal) {
        player.setPosition(p.x, p.y);
        player.setAimAngle(p.aim);
      }
      player.stats.hp = p.hp;
      player.stats.maxHp = p.maxHp;
      if (p.damage !== undefined) player.stats.damage = p.damage;
      if (p.fireRate !== undefined) player.stats.fireRate = p.fireRate;
      if (p.speed !== undefined) player.stats.speed = p.speed;
      if (p.projectileSpeed !== undefined) player.stats.projectileSpeed = p.projectileSpeed;
      if (p.xpPickupRadius !== undefined) player.stats.xpPickupRadius = p.xpPickupRadius;
      if (p.xpGainBonus !== undefined) player.stats.xpGainBonus = p.xpGainBonus;

      if (!isLocal) {
        if (player.isDead()) player.setChoiceProtected(false);
        else player.setChoiceProtected(p.choosing);
      } else if (this.choosingUpgrade) {
        player.setChoiceProtected(true);
      } else if (player.choiceProtected) {
        player.setChoiceProtected(false);
      }
      if (p.dead && !player.isDead()) player.stats.hp = 0;
      if (!p.dead && player.isDead()) {
        player.stats.hp = Math.max(1, p.hp);
      }
    }
    // Sync inimigos (thin client)
    const seen = new Set<number>();
    for (const e of msg.enemies) {
      seen.add(e.id);
      let enemy = (this.enemies.getChildren() as Enemy[]).find((c) => c.netId === e.id);
      if (!enemy) {
        enemy = this.enemies.get() as Enemy | null ?? undefined;
        if (!enemy) continue;
        if (e.type in ENEMY_DEFS) {
          enemy.spawn(e.x, e.y, e.type as EnemyType);
          enemy.netId = e.id;
        }
      }
      enemy.setPosition(e.x, e.y);
      enemy.hp = e.hp;
      enemy.armor = e.armor;
      enemy.setActive(true);
      enemy.setVisible(true);
    }
    for (const child of this.enemies.getChildren() as Enemy[]) {
      if (child.active && !seen.has(child.netId)) {
        child.setActive(false);
        child.setVisible(false);
      }
    }
  }

  private broadcastSnapshotIfHost(time: number): void {
    if (!this.online || this.onlineRole !== 'host' || !this.onlineSession) return;
    if (time < this.nextSnapshot) return;
    this.nextSnapshot = time + 80;
    const packPlayer = (player: Player, peerId: string) => ({
      peerId,
      x: player.x,
      y: player.y,
      hp: player.stats.hp,
      maxHp: player.stats.maxHp,
      dead: player.isDead(),
      aim: player.aimAngle,
      choosing: !player.isDead() && player.choiceProtected,
      poison: player.isPoisoned(time),
      bleed: player.isBleeding(time),
      damage: player.stats.damage,
      fireRate: player.stats.fireRate,
      speed: player.stats.speed,
      projectileSpeed: player.stats.projectileSpeed,
      xpPickupRadius: player.stats.xpPickupRadius,
      xpGainBonus: player.stats.xpGainBonus,
    });
    const players = [packPlayer(this.player1, this.onlineSession.peerId)];
    if (this.player2 && this.onlineSession.remotePeer) {
      players.push(packPlayer(this.player2, this.onlineSession.remotePeer.peerId));
    }
    const enemies = (this.enemies.getChildren() as Enemy[])
      .filter((e) => e.active)
      .slice(0, 80)
      .map((e) => ({
        id: e.netId,
        x: e.x,
        y: e.y,
        type: String(e.enemyType),
        hp: e.hp,
        armor: e.armor,
      }));
    void this.onlineSession.send({
      type: 'snapshot',
      t: time,
      players,
      enemies,
      kills: this.kills,
      level: this.levelSystem.level,
      xpProgress: this.levelSystem.progress(),
      survivalMs: this.survivalMs,
      wave: this.waves?.wave,
    });
  }

  private updateVigilChannel(delta: number): void {
    if (!this.amulets.allyChannelRevive || !this.player2) return;
    if (this.waves?.phase === 'break') {
      this.vigilProgress = 0;
      return;
    }
    const living = this.player1.isDead() ? this.player2 : this.player1;
    const dead = this.player1.isDead() ? this.player1 : this.player2;
    if (living.isDead() || !dead.isDead()) {
      this.vigilProgress = 0;
      return;
    }
    const dist = Phaser.Math.Distance.Between(living.x, living.y, dead.x, dead.y);
    if (dist > 48) {
      this.vigilProgress = Math.max(0, this.vigilProgress - delta * 0.0003);
      return;
    }
    this.vigilProgress += delta / 4500;
    if (!this.vigilBarBg) {
      this.vigilBarBg = this.add.graphics().setDepth(70).setScrollFactor(0);
      this.vigilBarFill = this.add.graphics().setDepth(71).setScrollFactor(0);
    }
    const bx = GAME_WIDTH / 2 - 60;
    const by = 40;
    this.vigilBarBg.clear().fillStyle(0x111a14, 0.9).fillRect(bx, by, 120, 10);
    this.vigilBarFill!
      .clear()
      .fillStyle(0x6ec8ff, 1)
      .fillRect(bx, by, 120 * Phaser.Math.Clamp(this.vigilProgress, 0, 1), 10);
    if (this.vigilProgress >= 1) {
      this.vigilProgress = 0;
      this.playReviveVfx(dead);
      dead.revive(this.time.now, 0.45);
      if (this.online) this.unlockAchievement('online_vigil');
      this.deathBanner?.destroy();
      this.deathBanner = undefined;
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
      online: this.online,
    };

    this.time.delayedCall(400, () => {
      this.scene.stop('UpgradeScene');
      this.scene.stop('PauseScene');
      this.scene.start('GameOverScene', summary);
    });
  }
}
