import Phaser from 'phaser';
import type { AmuletDef, AmuletId, MoonRarity } from '../data/types';

export const AMULETS: AmuletDef[] = [
  {
    id: 'araci_eyes',
    name: 'Olhos de Araci',
    description: 'Dispara dois projéteis paralelos, lado a lado.',
    lore: 'Araci viu dois caminhos no primeiro amanhecer e ensinou o caçador a seguir ambos.',
    symbol: 'II',
    rarity: 1,
    textureKey: 'amulet_araci',
  },
  {
    id: 'jaci_claws',
    name: 'Garras de Jaci',
    description: 'Dispara dois projéteis em diagonais opostas.',
    lore: 'Sob a lua, duas marcas de garra surgiram na lança e nunca mais erraram juntas.',
    symbol: 'V',
    rarity: 1,
    textureKey: 'amulet_jaci',
  },
  {
    id: 'anhanga_circle',
    name: 'Círculo de Anhangá',
    description: 'Uma aura causa dano periódico aos inimigos próximos.',
    lore: 'O guardião da mata traçou um limite que nenhuma presença hostil atravessa ilesa.',
    symbol: 'O',
    rarity: 2,
    textureKey: 'amulet_anhanga',
  },
  {
    id: 'tupa_breath',
    name: 'Sopro de Tupã',
    description: 'Revive uma vez com metade da vida.',
    lore: 'Um trovão preso no amuleto devolve o fôlego quando a noite parece ter vencido.',
    symbol: '+',
    rarity: 2,
    textureKey: 'amulet_tupa',
  },
  {
    id: 'guara_tooth',
    name: 'Dente de Guará',
    description: 'Invoca um cão espiritual que caça inimigos aleatórios.',
    lore: 'O companheiro que guardava a antiga aldeia ainda reconhece quem ameaça seu povo.',
    symbol: '*',
    rarity: 2,
    textureKey: 'amulet_guara',
  },
  {
    id: 'yara_tear',
    name: 'Lágrima de Iara',
    description: 'Regenera uma pequena quantidade de vida com o tempo.',
    lore: 'Uma gota do rio guardada em cristal. Cura a ferida como a água cura a margem.',
    symbol: '~',
    rarity: 3,
    textureKey: 'amulet_yara',
  },
  {
    id: 'cuca_thorn',
    name: 'Espinhos da Cuca',
    description: 'Ao receber dano, o inimigo sofre dano de espinho de volta.',
    lore: 'Quem toca a noite armada sente a floresta morder de volta.',
    symbol: '#',
    rarity: 3,
    textureKey: 'amulet_cuca',
  },
];

const RARITY_WEIGHT: Record<MoonRarity, number> = {
  1: 10,
  2: 6,
  3: 2,
  4: 1,
  5: 0.5,
};

export function moonLabel(rarity: MoonRarity): string {
  return '☽'.repeat(rarity);
}

export function getAmulet(id: AmuletId): AmuletDef {
  const amulet = AMULETS.find((entry) => entry.id === id);
  if (!amulet) throw new Error(`Unknown amulet: ${id}`);
  return amulet;
}

export function pickAmulets(owned: AmuletId[], count = 3): AmuletDef[] {
  const available = AMULETS.filter((amulet) => !owned.includes(amulet.id));
  const picked: AmuletDef[] = [];
  const pool = [...available];

  while (picked.length < count && pool.length > 0) {
    const weights = pool.map((a) => RARITY_WEIGHT[a.rarity]);
    const total = weights.reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * total;
    let index = 0;
    for (let i = 0; i < pool.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        index = i;
        break;
      }
    }
    picked.push(pool[index]);
    pool.splice(index, 1);
  }

  return Phaser.Utils.Array.Shuffle(picked);
}
