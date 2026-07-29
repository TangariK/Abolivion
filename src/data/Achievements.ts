import type { AchievementDef, AchievementId, AchievementTier } from '../data/types';

export const ACHIEVEMENTS: AchievementDef[] = [
  // —— Normais (visíveis no Marã mesmo bloqueadas) ——
  {
    id: 'first_blood',
    name: 'Primeiro Sangue',
    description: 'Elimine o primeiro invasor.',
    tier: 'normal',
  },
  {
    id: 'night_walker',
    name: 'Andarilho da Noite',
    description: 'Sobreviva 3 minutos no modo Infinito.',
    tier: 'normal',
  },
  {
    id: 'amulet_bearer',
    name: 'Portador de Memórias',
    description: 'Desperte o primeiro amuleto em uma run.',
    tier: 'normal',
  },
  {
    id: 'wave_survivor',
    name: 'Sobrevivente das Rodadas',
    description: 'Complete a 10ª rodada no modo Rodadas.',
    tier: 'normal',
  },
  {
    id: 'boss_slayer',
    name: 'Caçador de Chefes',
    description: 'Derrote qualquer chefão.',
    tier: 'normal',
  },
  {
    id: 'thorn_revenge',
    name: 'Espinho Vingativo',
    description: 'Obtenha o amuleto Espinhos da Cuca.',
    tier: 'normal',
  },
  {
    id: 'xp_scholar',
    name: 'Sábio da Floresta',
    description: 'Escolha o buff Colheita Abundante.',
    tier: 'normal',
  },
  {
    id: 'partners_of_night',
    name: 'Parceiros da Noite',
    description: 'Sobreviva 2 minutos em uma run com 2 jogadores.',
    tier: 'normal',
  },
  {
    id: 'storm_touched',
    name: 'Tocado pela Tempestade',
    description: 'Desperte o amuleto Tempestade de Tupã.',
    tier: 'normal',
  },
  {
    id: 'tribe_member',
    name: 'Nome na Tribo',
    description: 'Faça login ou cadastre uma conta Abolivion.',
    tier: 'normal',
  },
  {
    id: 'forest_pupil',
    name: 'Noviço da Mata',
    description: 'Alcance o nível 10 em uma run.',
    tier: 'normal',
  },
  {
    id: 'echo_walker',
    name: 'Eco na Trilha',
    description: 'Obtenha o amuleto Eco de Caipora.',
    tier: 'normal',
  },
  {
    id: 'deep_pockets',
    name: 'Saco Pesado',
    description: 'Acumule 200 moedas no perfil.',
    tier: 'normal',
  },
  {
    id: 'hut_defender',
    name: 'Guarda da Oca',
    description: 'Sobreviva 60 segundos em qualquer modo.',
    tier: 'normal',
  },

  // —— Secretas (ocultas até desbloquear) ——
  {
    id: 'brood_scouts',
    name: 'Foice da Ninhada',
    description: 'Elimine 10 invocados durante a luta contra o Kurupi, antes de derrotá-lo.',
    tier: 'secret',
  },
  {
    id: 'brood_horde',
    name: 'Devorador da Ninhada',
    description: 'Elimine 50 invocados durante a luta contra o Kurupi, antes de derrotá-lo.',
    tier: 'secret',
  },
  {
    id: 'brood_swarm',
    name: 'Exterminador da Ninhada',
    description: 'Elimine 100 invocados durante a luta contra o Kurupi, antes de derrotá-lo.',
    tier: 'secret',
  },
  {
    id: 'five_relics',
    name: 'Colecionador Esquecido',
    description: 'Carregue 5 amuletos ao mesmo tempo em uma run.',
    tier: 'secret',
  },
  {
    id: 'rising_spirit',
    name: 'Espírito Ascendente',
    description: 'Alcance o nível 15 em uma run.',
    tier: 'secret',
  },
  {
    id: 'untouched_brood',
    name: 'Sombra Intocada',
    description: 'Derrote o Kurupi sem receber dano durante a luta contra ele.',
    tier: 'secret',
  },

  // —— Tribal (visíveis, borda especial) ——
  {
    id: 'long_night',
    name: 'Noite Longa',
    description: 'Complete a 30ª rodada no modo Rodadas.',
    tier: 'tribal',
  },
  {
    id: 'twin_moons',
    name: 'Luas Gêmeas',
    description: 'Escolha dois amuletos de 3 luas seguidos na mesma run.',
    tier: 'tribal',
  },
  {
    id: 'full_bestiary',
    name: 'Memória Completa',
    description: 'Descubra todos os tipos de inimigos no Marã.',
    tier: 'tribal',
  },
  {
    id: 'twin_tyrants',
    name: 'Dois Tiranos',
    description: 'Derrote Kurupi e Boitatá na mesma run de Rodadas.',
    tier: 'tribal',
  },

  // —— Ancestrais (visíveis, borda mais rara) ——
  {
    id: 'pristine_path',
    name: 'Trilha Imaculada',
    description: 'Complete as primeiras 20 rodadas sem tomar nenhum dano.',
    tier: 'ancestral',
  },
  {
    id: 'eternal_vigil',
    name: 'Vigília Eterna',
    description: 'Sobreviva 10 minutos no Infinito sem tomar nenhum dano.',
    tier: 'ancestral',
  },
  {
    id: 'storm_crown',
    name: 'Coroa da Tempestade',
    description: 'Obtenha a Tempestade de Tupã (4 luas).',
    tier: 'ancestral',
  },
  {
    id: 'endless_dawn',
    name: 'Amanhecer Sem Fim',
    description: 'Sobreviva 20 minutos no modo Infinito.',
    tier: 'ancestral',
  },

  // —— Exclusivas do Modo Livre ——
  {
    id: 'free_trial',
    name: 'Espírito Curioso',
    description: 'Experimente o Modo Livre pela primeira vez.',
    tier: 'normal',
  },
  {
    id: 'triple_tyrants',
    name: 'Trono dos Tiranos',
    description: 'No Modo Livre, enfrente os três chefões de uma vez e vença.',
    tier: 'secret',
  },
  {
    id: 'naked_trial',
    name: 'Prova Nua',
    description:
      'No Modo Livre, vença os três chefões de uma vez sem amuletos, buffs ou melhorias permanentes.',
    tier: 'ancestral',
  },

  // —— Online ——
  {
    id: 'online_first_fire',
    name: 'Primeira Fogueira',
    description: 'Entre em uma partida online com outro jogador.',
    tier: 'normal',
  },
  {
    id: 'online_tribe_bond',
    name: 'Elo da Tribo',
    description: 'Sobreviva 3 minutos online com os dois caçadores vivos.',
    tier: 'normal',
  },
  {
    id: 'online_ally_rise',
    name: 'Não Abandonei',
    description: 'Reviva o aliado uma vez no modo online.',
    tier: 'secret',
  },
  {
    id: 'online_vigil',
    name: 'Vigília Compartilhada',
    description: 'Reviva o aliado com a Vigília de Iara no online.',
    tier: 'tribal',
  },
  {
    id: 'online_open_room',
    name: 'Sala Lotada',
    description: 'Crie uma sala pública e receba outro jogador.',
    tier: 'normal',
  },
];

/** Únicas conquistas que podem ser desbloqueadas dentro do Modo Livre. */
export const FREE_MODE_ACHIEVEMENTS: AchievementId[] = [
  'free_trial',
  'triple_tyrants',
  'naked_trial',
];

const TIER_LABEL: Record<AchievementTier, string> = {
  normal: 'Normal',
  secret: 'Secreta',
  tribal: 'Tribal',
  ancestral: 'Ancestral',
};

export function getAchievement(id: AchievementId): AchievementDef {
  const found = ACHIEVEMENTS.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown achievement: ${id}`);
  return found;
}

export function achievementTierLabel(tier: AchievementTier): string {
  return TIER_LABEL[tier];
}

/** Secret achievements stay hidden until unlocked; others show name/desc while locked. */
export function isAchievementVisibleWhenLocked(tier: AchievementTier): boolean {
  return tier !== 'secret';
}
