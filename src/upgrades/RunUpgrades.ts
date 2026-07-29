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
];

export function pickRandomUpgrades(count: number): RunUpgradeDef[] {
  const shuffled = Phaser.Utils.Array.Shuffle([...RUN_UPGRADES]);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
