import type { BossId, EmblemDef, EmblemId } from './types';

export const EMBLEMS: EmblemDef[] = [
  {
    id: 'emblem_kurupi',
    bossId: 'kurupi_brood',
    name: 'Emblema da Ninhada',
    howObtained: 'Derrote o Kurupi da Ninhada.',
    lore: 'Um fragmento da casca que guardava a ninhada sob as raízes.',
    effectText: 'Em breve novidades.',
    textureKey: 'emblem_kurupi',
  },
  {
    id: 'emblem_boitata',
    bossId: 'boitata_gaze',
    name: 'Emblema do Olhar',
    howObtained: 'Derrote o Boitatá do Olhar.',
    lore: 'Uma escama ainda quente do olhar que queima a clareira.',
    effectText: 'Em breve novidades.',
    textureKey: 'emblem_boitata',
  },
  {
    id: 'emblem_wolf',
    bossId: 'wolf_king',
    name: 'Emblema da Matilha',
    howObtained: 'Derrote o Lobo Rei.',
    lore: 'Um dente marcado pelo uivo da trigésima noite.',
    effectText: 'Em breve novidades.',
    textureKey: 'emblem_wolf',
  },
  {
    id: 'emblem_poison',
    bossId: 'poisoner_master',
    name: 'Emblema do Frasco',
    howObtained: 'Derrote o Envenenador Master.',
    lore: 'Gotas seladas do mestre que deixa a terra doente.',
    effectText: 'Em breve novidades.',
    textureKey: 'emblem_poison',
  },
  {
    id: 'emblem_acrobat',
    bossId: 'acrobat_leap',
    name: 'Emblema do Salto',
    howObtained: 'Derrote o Acrobata da Clareira.',
    lore: 'Pó da queda que faz o chão tremer e a cabeça girar.',
    effectText: 'Em breve novidades.',
    textureKey: 'emblem_acrobat',
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
