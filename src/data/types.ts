export type GameModeId = 'infinite' | 'waves' | 'free' | 'story';

export type EnemyType =
  | 'fast'
  | 'normal'
  | 'tank'
  | 'armored'
  | 'swift'
  | 'bruiser'
  | 'poisoner'
  | 'dire_wolf'
  | 'dire_wolf_brute'
  | 'dire_wolf_pup'
  | 'backstabber'
  | 'camo_normal'
  | 'camo_blade'
  | 'camo_poison'
  | 'camo_toxic_blade'
  | 'lethargy_spitter'
  | 'lethargy_brute';

export type BossId =
  | 'kurupi_brood'
  | 'boitata_gaze'
  | 'wolf_king'
  | 'poisoner_master'
  | 'acrobat_leap';

export type EmblemId =
  | 'emblem_kurupi'
  | 'emblem_boitata'
  | 'emblem_wolf'
  | 'emblem_poison'
  | 'emblem_acrobat';

export type RunUpgradeId =
  | 'hp_up'
  | 'heal'
  | 'speed_up'
  | 'damage_up'
  | 'fire_rate'
  | 'proj_speed'
  | 'xp_magnet'
  | 'xp_gain'
  | 'poison_ward'
  | 'bleed_ward';

export type AmuletId =
  | 'araci_eyes'
  | 'jaci_claws'
  | 'anhanga_circle'
  | 'tupa_breath'
  | 'guara_tooth'
  | 'yara_tear'
  | 'cuca_thorn'
  | 'caipora_echo'
  | 'tupa_storm'
  | 'jurupari_side_right'
  | 'jurupari_side_left'
  | 'anhanga_mercy'
  | 'yara_vigil'
  | 'jaci_halfmoon'
  | 'cura_veil';

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
  | 'naked_trial'
  | 'online_first_fire'
  | 'online_tribe_bond'
  | 'online_ally_rise'
  | 'online_vigil'
  | 'online_open_room';

/** Moon rarity for amulets: 1 (common) .. 5 (mythic) */
export type MoonRarity = 1 | 2 | 3 | 4 | 5;

export type StatusEffectId = 'poison' | 'bleed' | 'lethargy' | 'dizzy';

export interface PlayerStats {
  maxHp: number;
  hp: number;
  speed: number;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  xpPickupRadius: number;
  xpGainBonus: number;
  /** Multiplicador do dano de DoT de veneno (1 = normal, 0.5 = metade). */
  poisonDamageMul: number;
  /** Multiplicador do dano de DoT de sangramento. */
  bleedDamageMul: number;
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
  armor?: number;
  appliesPoison?: boolean;
  bleedChance?: number;
  /** Sempre tenta costas / contorna quando olhado. */
  preferBackstab?: boolean;
  /** Quase invisível; spawn perto do player. */
  camouflaged?: boolean;
  /** Aplica Letargia (lento) ao contato. */
  appliesLethargy?: boolean;
  /** Letargia + DoT leve (veneno roxo com dano). */
  lethargyDamaging?: boolean;
}

export interface BossTriggeredMode {
  name: string;
  description: string;
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
  triggeredMode: BossTriggeredMode;
}

export interface EmblemDef {
  id: EmblemId;
  bossId: BossId;
  name: string;
  howObtained: string;
  lore: string;
  effectText: string;
  textureKey: string;
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
  coopOnly?: boolean;
  specialOffer?: boolean;
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
  sideShotRight: boolean;
  sideShotLeft: boolean;
  allyChannelRevive: boolean;
  xpHalf: boolean;
  /** Duração de debuffs × este valor (&lt; 1 = mais curto). */
  debuffDurationMul: number;
  mercyUses: number;
}

export type MetaUpgradeId = 'maxHp' | 'speed' | 'damage' | 'fireRate' | 'xpEfficiency';

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
    emblems: EmblemId[];
  };
  bestScores?: {
    infiniteMs: number;
    wavesReached: number;
    kills: number;
    bestLevel: number;
    totalPlayMs?: number;
    bestKillStreak?: number;
    bossesDefeated?: number;
    totalCoinsEarned?: number;
    lowestHpSurvive?: number;
    bestAccuracy?: number;
  };
  prefs?: {
    showNameTag: boolean;
    acceptNewsletter?: boolean;
    musicVolume?: number;
    sfxVolume?: number;
    musicEnabled?: boolean;
    sfxEnabled?: boolean;
    /** Participação no Mural da Tribo */
    muralVisibility?: 'public' | 'anonymous' | 'invisible';
    /** Alias fixo quando anônimo (árvore_NN) */
    muralAlias?: string;
  };
}

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
  online?: boolean;
}

export interface StatusHudEntry {
  id: StatusEffectId;
  label: string;
  color: string;
  remainingMs: number;
  totalMs: number;
}
