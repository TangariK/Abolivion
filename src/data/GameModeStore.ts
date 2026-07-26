import type { GameModeId } from '../data/types';

export type PlayerCount = 1 | 2;

let selectedMode: GameModeId = 'infinite';
let playerCount: PlayerCount = 1;

export const GameSettingsStore = {
  getMode(): GameModeId {
    return selectedMode;
  },
  setMode(mode: GameModeId): void {
    if (mode === 'story') return;
    selectedMode = mode;
  },
  getPlayerCount(): PlayerCount {
    return playerCount;
  },
  setPlayerCount(count: PlayerCount): void {
    playerCount = count;
  },
};

/** @deprecated use GameSettingsStore */
export const GameModeStore = {
  get: () => GameSettingsStore.getMode(),
  set: (mode: GameModeId) => GameSettingsStore.setMode(mode),
};
