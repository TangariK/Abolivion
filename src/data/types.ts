export type EnemyType = 'fast' | 'normal' | 'tank';

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
  id: string;
  name: string;
  description: string;
  apply: (stats: PlayerStats) => void;
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
}

export interface RunSummary {
  kills: number;
  xpCollected: number;
  level: number;
  survivalMs: number;
  coinsEarned: number;
}
