import type { BossId, EmblemDef, EmblemId } from './types';

export const EMBLEMS: EmblemDef[] = [
  {
    id: 'emblem_kurupi',
    bossId: 'kurupi_brood',
    name: 'Emblema da Ninhada',
    howObtained: 'Derrote o Kurupi da Ninhada.',
    lore: 'Um fragmento da casca que guardava a ninhada sob as raízes.',
    effectText: 'Abre a Loja da Tribo. Inimigos podem deixar Resina rara.',
    textureKey: 'emblem_kurupi',
  },
  {
    id: 'emblem_boitata',
    bossId: 'boitata_gaze',
    name: 'Emblema do Olhar',
    howObtained: 'Derrote o Boitatá do Olhar.',
    lore: 'Uma escama ainda quente do olhar que queima a clareira.',
    effectText: '1 reroll nas opções de buff/amuleto. Buff “Segundo Canto” concede mais rerolls.',
    textureKey: 'emblem_boitata',
  },
  {
    id: 'emblem_wolf',
    bossId: 'wolf_king',
    name: 'Emblema da Matilha',
    howObtained: 'Derrote o Lobo Rei.',
    lore: 'Um dente marcado pelo uivo da trigésima noite.',
    effectText: 'Corrida no Shift com barra de stamina. Desbloqueia buffs de stamina.',
    textureKey: 'emblem_wolf',
  },
  {
    id: 'emblem_poison',
    bossId: 'poisoner_master',
    name: 'Emblema do Frasco',
    howObtained: 'Derrote o Envenenador Master.',
    lore: 'Gotas seladas do mestre que deixa a terra doente.',
    effectText: 'Marã analítico: HP, dano e velocidade numéricos nos detalhes.',
    textureKey: 'emblem_poison',
  },
  {
    id: 'emblem_acrobat',
    bossId: 'acrobat_leap',
    name: 'Emblema do Salto',
    howObtained: 'Derrote o Acrobata da Clareira.',
    lore: 'Pó da queda que faz o chão tremer e a cabeça girar.',
    effectText: 'Desbloqueia a aba Arsenal da Aldeia (conteúdo em breve).',
    textureKey: 'emblem_acrobat',
  },
  {
    id: 'emblem_shield',
    bossId: 'shield_master',
    name: 'Emblema da Couraça',
    howObtained: 'Derrote o Mestre do Escudo.',
    lore: 'Uma brasa de metal que ainda ecoa o impacto das lâminas.',
    effectText: 'Desbloqueia o botão Clã (em breve).',
    textureKey: 'emblem_shield',
  },
];

export function getEmblem(id: EmblemId): EmblemDef {
  const e = EMBLEMS.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown emblem: ${id}`);
  return e;
}

export function emblemForBoss(bossId: BossId): EmblemDef | undefined {
  return EMBLEMS.find((e) => e.bossId === bossId);
}
