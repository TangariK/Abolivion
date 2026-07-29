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
    id: 'jurupari_side_right',
    name: 'Presa Direita de Jurupari',
    description: 'Também dispara um projétil para a direita da mira.',
    lore: 'A mandíbula direita do espírito morde quem tenta flanquear o caçador.',
    symbol: '→',
    rarity: 1,
    textureKey: 'amulet_side_r',
  },
  {
    id: 'jurupari_side_left',
    name: 'Presa Esquerda de Jurupari',
    description: 'Também dispara um projétil para a esquerda da mira.',
    lore: 'A mandíbula esquerda guarda o lado que a noite esquece.',
    symbol: '←',
    rarity: 1,
    textureKey: 'amulet_side_l',
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
  {
    id: 'caipora_echo',
    name: 'Eco de Caipora',
    description: 'Também dispara um projétil para trás.',
    lore: 'Caipora ri por trás das árvores: o golpe que foge encontra outro caminho.',
    symbol: '↔',
    rarity: 1,
    textureKey: 'amulet_caipora',
  },
  {
    id: 'tupa_storm',
    name: 'Tempestade de Tupã',
    description: 'Raios caem no mapa e destroem inimigos aleatórios.',
    lore: 'O céu se abre em fúria. Onde o trovão escolhe cair, a noite se parte.',
    symbol: '⚡',
    rarity: 4,
    textureKey: 'amulet_storm',
  },
  {
    id: 'jaci_halfmoon',
    name: 'Meia-Lua de Jaci',
    description: 'O XP necessário para cada nível seguinte é dividido ao meio.',
    lore: 'Jaci cortou a curva da noite: o caminho do saber ficou mais curto.',
    symbol: '☽',
    rarity: 4,
    textureKey: 'amulet_halfmoon',
  },
  {
    id: 'cura_veil',
    name: 'Véu de Cura',
    description: 'Efeitos negativos (veneno, sangramento, letargia, tontura) duram bem menos.',
    lore: 'A bruma da cura envolve o corpo: a noite ainda fere, mas passa mais depressa.',
    symbol: '◇',
    rarity: 3,
    textureKey: 'amulet_cura',
  },
  {
    id: 'yara_vigil',
    name: 'Vigília de Iara',
    description:
      'Com o aliado caído, fique sobre ele até a barra encher e traga-o de volta (só em combate).',
    lore: 'A correnteza segura o corpo até o fôlego voltar — se você não abandonar a margem.',
    symbol: '≈',
    rarity: 4,
    textureKey: 'amulet_vigil',
    coopOnly: true,
  },
  {
    id: 'anhanga_mercy',
    name: 'Misericórdia de Anhangá',
    description: 'Revive o aliado caído. A cada uso, o chamado fica mais raro.',
    lore: 'Anhangá concede uma segunda chance — e cada súplica custa mais luar.',
    symbol: '✝',
    rarity: 1,
    textureKey: 'amulet_mercy',
    coopOnly: true,
    specialOffer: true,
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

export function mercyOfferRarity(uses: number): MoonRarity {
  if (uses < 2) return 1;
  if (uses < 3) return 2;
  if (uses < 4) return 3;
  if (uses < 5) return 4;
  return 5;
}

export interface PickAmuletContext {
  coop: boolean;
  allyDead: boolean;
  mercyUses: number;
  /** Partida virou solo após abandono — sem amuletos de aliado */
  soloAfterPeerLeft?: boolean;
}

export function pickAmulets(
  owned: AmuletId[],
  count = 3,
  ctx: PickAmuletContext = { coop: false, allyDead: false, mercyUses: 0 },
): AmuletDef[] {
  const available = AMULETS.filter((amulet) => {
    if (amulet.specialOffer) return false;
    if (amulet.coopOnly) {
      if (!ctx.coop || ctx.soloAfterPeerLeft) return false;
    }
    if (owned.includes(amulet.id)) return false;
    return true;
  });

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

  // Oferta especial de misericórdia se aliado morto
  if (ctx.coop && ctx.allyDead && !ctx.soloAfterPeerLeft) {
    const mercy = getAmulet('anhanga_mercy');
    const rarity = mercyOfferRarity(ctx.mercyUses);
    const offer: AmuletDef = { ...mercy, rarity };
    if (picked.length >= count) picked[picked.length - 1] = offer;
    else picked.push(offer);
  }

  return picked;
}
