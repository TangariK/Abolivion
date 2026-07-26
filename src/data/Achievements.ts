import type { AchievementDef, AchievementId } from '../data/types';

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_blood',
    name: 'Primeiro Sangue',
    description: 'Elimine o primeiro invasor.',
  },
  {
    id: 'night_walker',
    name: 'Andarilho da Noite',
    description: 'Sobreviva 3 minutos no modo Infinito.',
  },
  {
    id: 'amulet_bearer',
    name: 'Portador de Memórias',
    description: 'Desperte o primeiro amuleto em uma run.',
  },
  {
    id: 'wave_survivor',
    name: 'Sobrevivente das Rodadas',
    description: 'Complete a 10ª rodada no modo Rodadas.',
  },
  {
    id: 'boss_slayer',
    name: 'Caçador de Chefes',
    description: 'Derrote qualquer chefão.',
  },
  {
    id: 'thorn_revenge',
    name: 'Espinho Vingativo',
    description: 'Obtenha o amuleto Espinhos da Cuca.',
  },
  {
    id: 'xp_scholar',
    name: 'Sábio da Floresta',
    description: 'Escolha o buff Colheita Abundante.',
  },
  {
    id: 'partners_of_night',
    name: 'Parceiros da Noite',
    description: 'Sobreviva 2 minutos em uma run com 2 jogadores.',
  },
  {
    id: 'storm_touched',
    name: 'Tocado pela Tempestade',
    description: 'Desperte o amuleto Tempestade de Tupã.',
  },
];

export function getAchievement(id: AchievementId): AchievementDef {
  const found = ACHIEVEMENTS.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown achievement: ${id}`);
  return found;
}
