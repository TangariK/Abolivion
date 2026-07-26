export type EnemyType = 'fast' | 'normal' | 'tank';
export type RunUpgradeId =
  | 'hp_up'
  | 'heal'
  | 'speed_up'
  | 'damage_up'
  | 'fire_rate'
  | 'proj_speed';

export type AmuletId =
  | 'araci_eyes'
  | 'jaci_claws'
  | 'anhanga_circle'
  | 'tupa_breath'
  | 'guara_tooth';

export interface PlayerStats {
  maxHp: number;
  hp: number;
  speed: number;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
}

export interface EnemyDef {
  type: EnemyType;
  hp: number;
  speed: number;
  damage: number;
  xp: number;
  radius: number;
  color: number;
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
}

export interface RunAmuletState {
  owned: AmuletId[];
  parallelShot: boolean;
  diagonalShot: boolean;
  damageAura: boolean;
  reviveAvailable: boolean;
  dogCompanion: boolean;
}

export type MetaUpgradeId = 'maxHp' | 'speed' | 'damage' | 'fireRate';

export interface MetaUpgradeDef {
  id: MetaUpgradeId;
  name: string;
  description: string;
  maxLevel: number;
  /** Bonus applied per purchased level */
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
  };
}

export interface RunSummary {
  kills: number;
  xpCollected: number;
  level: number;
  survivalMs: number;
  coinsEarned: number;
}
