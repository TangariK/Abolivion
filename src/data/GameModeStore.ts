import type { FreeModeConfig, GameModeId } from '../data/types';

export type PlayStyle = 'solo' | 'local2' | 'online';

let selectedMode: GameModeId = 'infinite';
let playStyle: PlayStyle = 'solo';

function defaultFreeConfig(): FreeModeConfig {
  return {
    baseKind: 'wave',
    wave: 1,
    startTimeMs: 0,
    startLevel: 1,
    buffCounts: {},
    amulets: [],
    useMeta: true,
    metaLevels: { maxHp: 0, speed: 0, damage: 0, fireRate: 0, xpEfficiency: 0 },
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
  getPlayStyle(): PlayStyle {
    return playStyle;
  },
  setPlayStyle(style: PlayStyle): void {
    playStyle = style;
  },
  /** Compat: 1 ou 2 jogadores locais. Online conta como 2 no GameScene. */
  getPlayerCount(): 1 | 2 {
    return playStyle === 'solo' ? 1 : 2;
  },
  setPlayerCount(count: 1 | 2): void {
    playStyle = count === 1 ? 'solo' : 'local2';
  },
  isOnline(): boolean {
    return playStyle === 'online';
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
