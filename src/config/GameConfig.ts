export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 2400;

export const COLORS = {
  bg: 0x0d1a12,
  grass: 0x1a3324,
  player: 0x3d9eff,
  enemyFast: 0xe85d5d,
  enemyNormal: 0xc43030,
  enemyTank: 0x8b1a1a,
  projectile: 0xf5c842,
  xpOrb: 0x5ce07a,
  hut: 0x6b4a2e,
  hutRoof: 0x8b5a2b,
  hudBg: 0x0a120e,
  hudHp: 0xe05c5c,
  hudXp: 0x5ce07a,
  text: 0xe8f0e8,
  accent: 0xc4a35a,
  cardBg: 0x1a2a1e,
  cardBorder: 0xc4a35a,
} as const;

export const PLAYER_BASE = {
  hp: 100,
  speed: 200,
  damage: 10,
  fireRate: 400,
  projectileSpeed: 640,
  radius: 14,
  xpPickupRadius: 28,
  xpGainBonus: 0,
  poisonDamageMul: 1,
  bleedDamageMul: 1,
} as const;

export const XP_CURVE = {
  base: 5,
  growth: 1.35,
} as const;

export const META_COST_BASE = 50;

export const MAP_BOUNDS_PADDING = 40;
