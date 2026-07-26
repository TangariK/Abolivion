import type { GameModeId } from '../data/types';

let selectedMode: GameModeId = 'infinite';

export const GameModeStore = {
  get(): GameModeId {
    return selectedMode;
  },
  set(mode: GameModeId): void {
    if (mode === 'story') return;
    selectedMode = mode;
  },
};
