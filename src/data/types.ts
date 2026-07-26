export type GameModeId = 'infinite' | 'waves' | 'free' | 'story';

export type EnemyType =
  | 'fast'
  | 'normal'
  | 'tank'
  | 'armored'
  | 'swift'
  | 'bruiser';

export type BossId = 'kurupi_brood' | 'boitata_gaze';

export type RunUpgradeId =
  | 'hp_up'
  | 'heal'
  | 'speed_up'
  | 'damage_up'
  | 'fire_rate'
  | 'proj_speed'
  | 'xp_magnet'
  | 'xp_gain';

export type AmuletId =
  | 'araci_eyes'
  | 'jaci_claws'
  | 'anhanga_circle'
  | 'tupa_breath'
  | 'guara_tooth'
  | 'yara_tear'
  | 'cuca_thorn'
  | 'caipora_echo'
  | 'tupa_storm';

export type AchievementTier = 'normal' | 'secret' | 'tribal' | 'ancestral';

export type AchievementId =
  | 'first_blood'
  | 'night_walker'
  | 'amulet_bearer'
  | 'wave_survivor'
  | 'boss_slayer'
  | 'thorn_revenge'
  | 'xp_scholar'
  | 'partners_of_night'
  | 'storm_touched'
  | 'tribe_member'
  | 'forest_pupil'
  | 'echo_walker'
  | 'deep_pockets'
  | 'hut_defender'
  | 'brood_scouts'
  | 'brood_horde'
  | 'brood_swarm'
  | 'five_relics'
  | 'rising_spirit'
  | 'untouched_brood'
  | 'long_night'
  | 'twin_moons'
  | 'full_bestiary'
  | 'twin_tyrants'
  | 'pristine_path'
  | 'eternal_vigil'
  | 'storm_crown'
  | 'endless_dawn'
  | 'free_trial'
  | 'triple_tyrants'
  | 'naked_trial';

/** Moon rarity for amulets: 1 (common) .. 5 (mythic) */
export type MoonRarity = 1 | 2 | 3 | 4 | 5;

export interface PlayerStats {
  maxHp: number;
  hp: number;
  speed: number;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  xpPickupRadius: number;
  xpGainBonus: number;
}

export interface EnemyDef {
  type: EnemyType;
  name: string;
  hp: number;
  speed: number;
  damage: number;
  xp: number;
  radius: number;
  color: number;
  textureKey: string;
  description: string;
  /** Extra armor layer before real HP (armored only) */
  armor?: number;
}

export interface BossDef {
  id: BossId;
  name: string;
  description: string;
  lore: string;
  textureKey: string;
  hp: number;
  speed: number;
  damage: number;
  xp: number;
  radius: number;
  wave: number;
}

export interface RunUpgradeDef {
  id: RunUpgradeId;
  name: string;
  description: string;
  apply: (stats: PlayerStats) => void;
}

export interface AmuletDef {
  id: AmuletId;
  name: string;
  description: string;
  lore: string;
  symbol: string;
  rarity: MoonRarity;
  textureKey: string;
}

export interface AchievementDef {
  id: AchievementId;
  name: string;
  description: string;
  tier: AchievementTier;
}

export interface RunAmuletState {
  owned: AmuletId[];
  parallelShot: boolean;
  diagonalShot: boolean;
  damageAura: boolean;
  reviveAvailable: boolean;
  dogCompanion: boolean;
  lifeRegen: boolean;
  thorns: boolean;
  backwardShot: boolean;
  lightningStorm: boolean;
}

export type MetaUpgradeId = 'maxHp' | 'speed' | 'damage' | 'fireRate';

export interface MetaUpgradeDef {
  id: MetaUpgradeId;
  name: string;
  description: string;
  maxLevel: number;
  bonusPerLevel: number;
}

export interface Profile {
  version: number;
  currency: number;
  metaLevels: Record<MetaUpgradeId, number>;
  almanac: {
    enemies: EnemyType[];
    amulets: AmuletId[];
    upgrades: RunUpgradeId[];
    bosses: BossId[];
    achievements: AchievementId[];
  };
  bestScores?: {
    infiniteMs: number;
    wavesReached: number;
    kills: number;
    bestLevel: number;
    /** Tempo total acumulado em runs (ms). */
    totalPlayMs?: number;
    bestKillStreak?: number;
    bossesDefeated?: number;
    totalCoinsEarned?: number;
    /** Menor HP com que terminou uma run ainda vivo. */
    lowestHpSurvive?: number;
    bestAccuracy?: number;
  };
  prefs?: {
    showNameTag: boolean;
    acceptNewsletter?: boolean;
  };
}

/** Sandbox configuration chosen on the Free Mode setup screen. */
export interface FreeModeConfig {
  baseKind: 'wave' | 'infinite' | 'custom';
  wave: number;
  startTimeMs: number;
  startLevel: number;
  buffCounts: Partial<Record<RunUpgradeId, number>>;
  amulets: AmuletId[];
  useMeta: boolean;
  metaLevels: Record<MetaUpgradeId, number>;
  customEnemies: Partial<Record<EnemyType, number>>;
  customBosses: BossId[];
}

export interface RunSummary {
  kills: number;
  xpCollected: number;
  level: number;
  survivalMs: number;
  coinsEarned: number;
  mode: GameModeId;
  waveReached?: number;
  bossesDefeated?: BossId[];
  freeMode?: boolean;
  victory?: boolean;
}
