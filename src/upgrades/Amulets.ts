import Phaser from 'phaser';
import type { AmuletDef, AmuletId } from '../data/types';

export const AMULETS: AmuletDef[] = [
  {
    id: 'araci_eyes',
    name: 'Olhos de Araci',
    description: 'Dispara dois projéteis paralelos, lado a lado.',
    lore: 'Araci viu dois caminhos no primeiro amanhecer e ensinou o caçador a seguir ambos.',
    symbol: 'II',
  },
  {
    id: 'jaci_claws',
    name: 'Garras de Jaci',
    description: 'Dispara dois projéteis em diagonais opostas.',
    lore: 'Sob a lua, duas marcas de garra surgiram na lança e nunca mais erraram juntas.',
    symbol: 'V',
  },
  {
    id: 'anhanga_circle',
    name: 'Círculo de Anhangá',
    description: 'Uma aura causa dano periódico aos inimigos próximos.',
    lore: 'O guardião da mata traçou um limite que nenhuma presença hostil atravessa ilesa.',
    symbol: 'O',
  },
  {
    id: 'tupa_breath',
    name: 'Sopro de Tupã',
    description: 'Revive uma vez com metade da vida.',
    lore: 'Um trovão preso no amuleto devolve o fôlego quando a noite parece ter vencido.',
    symbol: '+',
  },
  {
    id: 'guara_tooth',
    name: 'Dente de Guará',
    description: 'Invoca um cão espiritual que caça inimigos aleatórios.',
    lore: 'O companheiro que guardava a antiga aldeia ainda reconhece quem ameaça seu povo.',
    symbol: '*',
  },
];

export function getAmulet(id: AmuletId): AmuletDef {
  const amulet = AMULETS.find((entry) => entry.id === id);
  if (!amulet) throw new Error(`Unknown amulet: ${id}`);
  return amulet;
}

export function pickAmulets(owned: AmuletId[], count = 3): AmuletDef[] {
  const available = AMULETS.filter((amulet) => !owned.includes(amulet.id));
  return Phaser.Utils.Array.Shuffle([...available]).slice(0, count);
}
