import { META_COST_BASE } from '../config/GameConfig';
import type { MetaUpgradeDef, MetaUpgradeId, PlayerStats, Profile } from '../data/types';
import { SaveManager } from './MetaUpgrades';

export const META_UPGRADE_DEFS: MetaUpgradeDef[] = [
  {
    id: 'maxHp',
    name: 'Vitalidade',
    description: '+20 HP máximo por nível',
    maxLevel: 10,
    bonusPerLevel: 20,
  },
  {
    id: 'speed',
    name: 'Agilidade',
    description: '+15 velocidade por nível',
    maxLevel: 10,
    bonusPerLevel: 15,
  },
  {
    id: 'damage',
    name: 'Força',
    description: '+3 dano por nível',
    maxLevel: 10,
    bonusPerLevel: 3,
  },
  {
    id: 'fireRate',
    name: 'Cadência',
    description: '-20ms entre tiros por nível',
    maxLevel: 8,
    bonusPerLevel: 20,
  },
  {
    id: 'xpEfficiency',
    name: 'Sabedoria Ancestral',
    description: '−5% XP necessário por nível',
    maxLevel: 10,
    bonusPerLevel: 5,
  },
];

export function metaCost(currentLevel: number): number {
  return META_COST_BASE * (currentLevel + 1);
}

/** Multiplicador de custo de XP (0.5 = metade). Meta e Meia-Lua combinam. */
export function metaXpCostMultiplier(profile: Profile): number {
  const lvl = profile.metaLevels.xpEfficiency ?? 0;
  return Math.max(0.5, 1 - lvl * 0.05);
}

export function applyMetaToStats(base: PlayerStats, profile: Profile): PlayerStats {
  const levels = profile.metaLevels;
  const fireRateReduction = levels.fireRate * 20;
  return {
    maxHp: base.maxHp + levels.maxHp * 20,
    hp: base.maxHp + levels.maxHp * 20,
    speed: base.speed + levels.speed * 15,
    damage: base.damage + levels.damage * 3,
    fireRate: Math.max(120, base.fireRate - fireRateReduction),
    projectileSpeed: base.projectileSpeed,
    xpPickupRadius: base.xpPickupRadius,
    xpGainBonus: base.xpGainBonus,
    poisonDamageMul: base.poisonDamageMul ?? 1,
    bleedDamageMul: base.bleedDamageMul ?? 1,
  };
}

export function tryBuyMeta(id: MetaUpgradeId): { ok: boolean; profile: Profile; message: string } {
  const profile = SaveManager.load();
  const def = META_UPGRADE_DEFS.find((d) => d.id === id);
  if (!def) return { ok: false, profile, message: 'Upgrade inválido' };

  const level = profile.metaLevels[id] ?? 0;
  if (level >= def.maxLevel) {
    return { ok: false, profile, message: 'Nível máximo' };
  }

  const cost = metaCost(level);
  if (profile.currency < cost) {
    return { ok: false, profile, message: 'Moedas insuficientes' };
  }

  profile.currency -= cost;
  profile.metaLevels[id] = level + 1;
  SaveManager.save(profile);
  return { ok: true, profile, message: 'Comprado!' };
}
