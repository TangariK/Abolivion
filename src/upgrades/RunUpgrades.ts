import Phaser from 'phaser';
import type { PlayerStats, RunUpgradeDef } from '../data/types';

export const RUN_UPGRADES: RunUpgradeDef[] = [
  {
    id: 'hp_up',
    name: 'Raízes Fortes',
    description: '+25 HP máximo e cura 25',
    apply: (stats: PlayerStats) => {
      stats.maxHp += 25;
      stats.hp = Math.min(stats.maxHp, stats.hp + 25);
    },
  },
  {
    id: 'heal',
    name: 'Ervas Curativas',
    description: 'Cura 40 HP',
    apply: (stats: PlayerStats) => {
      stats.hp = Math.min(stats.maxHp, stats.hp + 40);
    },
  },
  {
    id: 'speed_up',
    name: 'Pés Ligeiros',
    description: '+25 velocidade',
    apply: (stats: PlayerStats) => {
      stats.speed += 25;
    },
  },
  {
    id: 'damage_up',
    name: 'Lança Afiada',
    description: '+5 dano',
    apply: (stats: PlayerStats) => {
      stats.damage += 5;
    },
  },
  {
    id: 'fire_rate',
    name: 'Mãos Rápidas',
    description: '-50ms entre tiros',
    apply: (stats: PlayerStats) => {
      stats.fireRate = Math.max(100, stats.fireRate - 50);
    },
  },
  {
    id: 'proj_speed',
    name: 'Vento Forte',
    description: '+80 velocidade do projétil',
    apply: (stats: PlayerStats) => {
      stats.projectileSpeed += 80;
    },
  },
  {
    id: 'xp_magnet',
    name: 'Chamado da Clareira',
    description: '+40 raio de coleta de XP',
    apply: (stats: PlayerStats) => {
      stats.xpPickupRadius += 40;
    },
  },
  {
    id: 'xp_gain',
    name: 'Colheita Abundante',
    description: '+25% XP ao derrotar inimigos',
    apply: (stats: PlayerStats) => {
      stats.xpGainBonus += 0.25;
    },
  },
  {
    id: 'poison_ward',
    name: 'Seiva Antídoto',
    description: 'Reduz o dano do veneno em 35%',
    apply: (stats: PlayerStats) => {
      stats.poisonDamageMul = Math.max(0.15, (stats.poisonDamageMul ?? 1) * 0.65);
    },
  },
  {
    id: 'bleed_ward',
    name: 'Ligadura da Aldeia',
    description: 'Reduz o dano do sangramento em 35%',
    apply: (stats: PlayerStats) => {
      stats.bleedDamageMul = Math.max(0.15, (stats.bleedDamageMul ?? 1) * 0.65);
    },
  },
  {
    id: 'second_chant',
    name: 'Segundo Canto',
    description: 'Mais 2 rerolls nesta run (1× por run)',
    apply: () => {
      // aplicado via UpgradeScene / GameScene (estado de reroll)
    },
  },
  {
    id: 'stamina_max',
    name: 'Fôlego da Matilha',
    description: '+25 stamina máxima',
    apply: (stats: PlayerStats) => {
      stats.staminaMax = (stats.staminaMax ?? 100) + 25;
      stats.stamina = Math.min(stats.staminaMax, (stats.stamina ?? 0) + 25);
    },
  },
  {
    id: 'stamina_regen',
    name: 'Respiro do Lobo',
    description: '+8 regeneração de stamina /s',
    apply: (stats: PlayerStats) => {
      stats.staminaRegen = (stats.staminaRegen ?? 16) + 8;
    },
  },
  {
    id: 'sprint_speed',
    name: 'Galope da Caçada',
    description: '+12% velocidade na corrida',
    apply: (stats: PlayerStats) => {
      stats.sprintMul = (stats.sprintMul ?? 1.35) + 0.12;
    },
  },
];

export function pickRandomUpgrades(
  count: number,
  opts?: { allowStamina?: boolean; allowSecondChant?: boolean; secondChantTaken?: boolean },
): RunUpgradeDef[] {
  let pool = [...RUN_UPGRADES];
  if (!opts?.allowStamina) {
    pool = pool.filter(
      (u) => u.id !== 'stamina_max' && u.id !== 'stamina_regen' && u.id !== 'sprint_speed',
    );
  }
  if (!opts?.allowSecondChant || opts.secondChantTaken) {
    pool = pool.filter((u) => u.id !== 'second_chant');
  }
  const shuffled = Phaser.Utils.Array.Shuffle(pool);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
