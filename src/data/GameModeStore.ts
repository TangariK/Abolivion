import type { FreeModeConfig, GameModeId } from '../data/types';

export type PlayerCount = 1 | 2;

let selectedMode: GameModeId = 'infinite';
let playerCount: PlayerCount = 1;

function defaultFreeConfig(): FreeModeConfig {
  return {
    baseKind: 'wave',
    wave: 1,
    startTimeMs: 0,
    startLevel: 1,
    buffCounts: {},
    amulets: [],
    useMeta: true,
    metaLevels: { maxHp: 0, speed: 0, damage: 0, fireRate: 0 },
    customEnemies: {},
    customBosses: [],
  };
}

let freeConfig: FreeModeConfig = defaultFreeConfig();

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
  getFreeConfig(): FreeModeConfig {
    return freeConfig;
  },
  setFreeConfig(config: FreeModeConfig): void {
    freeConfig = config;
  },
};

/** @deprecated use GameSettingsStore */
export const GameModeStore = {
  get: () => GameSettingsStore.getMode(),
  set: (mode: GameModeId) => GameSettingsStore.setMode(mode),
};
