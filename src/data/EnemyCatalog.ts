import { COLORS } from '../config/GameConfig';
import type { BossDef, BossId, EnemyDef, EnemyType } from './types';

export const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  fast: {
    type: 'fast',
    name: 'Invasor Veloz',
    hp: 20,
    speed: 140,
    damage: 8,
    xp: 1,
    radius: 9,
    color: COLORS.enemyFast,
    textureKey: 'enemy_fast',
    description: 'Leve e ágil. Chega rápido e em grupo.',
  },
  normal: {
    type: 'normal',
    name: 'Invasor',
    hp: 40,
    speed: 90,
    damage: 12,
    xp: 2,
    radius: 12,
    color: COLORS.enemyNormal,
    textureKey: 'enemy_normal',
    description: 'O guerreiro comum da noite.',
  },
  tank: {
    type: 'tank',
    name: 'Invasor Couraçado',
    hp: 120,
    speed: 55,
    damage: 20,
    xp: 5,
    radius: 18,
    color: COLORS.enemyTank,
    textureKey: 'enemy_tank',
    description: 'Lento, resistente e perigoso em contato.',
  },
  armored: {
    type: 'armored',
    name: 'Invasor Blindado',
    hp: 45,
    speed: 75,
    damage: 14,
    xp: 4,
    radius: 14,
    color: 0x7a8a9a,
    textureKey: 'enemy_armored',
    description: 'Possui uma armadura extra. Ao quebrá-la, torna-se um invasor comum.',
    armor: 40,
  },
  swift: {
    type: 'swift',
    name: 'Sombra Ligeira',
    hp: 12,
    speed: 200,
    damage: 6,
    xp: 2,
    radius: 7,
    color: 0xff8a6a,
    textureKey: 'enemy_swift',
    description: 'Menor e ainda mais rápido que o Invasor Veloz.',
  },
  bruiser: {
    type: 'bruiser',
    name: 'Quebra-Ossos',
    hp: 70,
    speed: 80,
    damage: 28,
    xp: 4,
    radius: 15,
    color: 0xa31818,
    textureKey: 'enemy_bruiser',
    description: 'Golpes pesados. Prefere o combate corpo a corpo.',
  },
};

export const BOSS_DEFS: Record<BossId, BossDef> = {
  kurupi_brood: {
    id: 'kurupi_brood',
    name: 'Kurupi da Ninhada',
    description: 'Chefe lento e brutal. Invoca invasores enquanto avança.',
    lore: 'Dizem que a floresta o escondeu sob raízes até a décima noite.',
    textureKey: 'boss_kurupi',
    hp: 2200,
    speed: 40,
    damage: 35,
    xp: 40,
    radius: 36,
    wave: 10,
  },
  boitata_gaze: {
    id: 'boitata_gaze',
    name: 'Boitatá do Olhar',
    description: 'Não invoca. Dispara rajadas densas de projéteis.',
    lore: 'Seu olhar queima a clareira; sobreviver a ele é provar a aldeia.',
    textureKey: 'boss_boitata',
    hp: 2800,
    speed: 55,
    damage: 18,
    xp: 60,
    radius: 30,
    wave: 20,
  },
};

export function getEnemyDef(type: EnemyType): EnemyDef {
  return ENEMY_DEFS[type];
}

export function getBossDef(id: BossId): BossDef {
  return BOSS_DEFS[id];
}
