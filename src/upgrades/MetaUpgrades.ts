import type {
  AchievementId,
  AmuletId,
  BossId,
  EnemyType,
  MetaUpgradeId,
  Profile,
  RunUpgradeId,
} from '../data/types';
import { ENEMY_DEFS } from '../data/EnemyCatalog';
import { GameSettingsStore } from '../data/GameModeStore';

const SAVE_KEY = 'abolivion_profile_v1';
const PROFILE_VERSION = 4;

export type SaveOptions = { skipCloud?: boolean };

function emptyAlmanac(): Profile['almanac'] {
  return {
    enemies: [],
    amulets: [],
    upgrades: [],
    bosses: [],
    achievements: [],
  };
}

function emptyBestScores(): NonNullable<Profile['bestScores']> {
  return {
    infiniteMs: 0,
    wavesReached: 0,
    kills: 0,
    bestLevel: 1,
    totalPlayMs: 0,
    bestKillStreak: 0,
    bossesDefeated: 0,
    totalCoinsEarned: 0,
    lowestHpSurvive: 0,
    bestAccuracy: 0,
  };
}

function defaultProfile(): Profile {
  return {
    version: PROFILE_VERSION,
    currency: 0,
    metaLevels: {
      maxHp: 0,
      speed: 0,
      damage: 0,
      fireRate: 0,
    },
    almanac: emptyAlmanac(),
    bestScores: emptyBestScores(),
    prefs: { showNameTag: false },
  };
}

function normalizeProfile(parsed: Partial<Profile>): Profile {
  return {
    version: PROFILE_VERSION,
    currency: Math.max(0, parsed.currency ?? 0),
    metaLevels: {
      maxHp: parsed.metaLevels?.maxHp ?? 0,
      speed: parsed.metaLevels?.speed ?? 0,
      damage: parsed.metaLevels?.damage ?? 0,
      fireRate: parsed.metaLevels?.fireRate ?? 0,
    },
    almanac: {
      enemies: Array.isArray(parsed.almanac?.enemies) ? parsed.almanac.enemies : [],
      amulets: Array.isArray(parsed.almanac?.amulets) ? parsed.almanac.amulets : [],
      upgrades: Array.isArray(parsed.almanac?.upgrades) ? parsed.almanac.upgrades : [],
      bosses: Array.isArray(parsed.almanac?.bosses) ? parsed.almanac.bosses : [],
      achievements: Array.isArray(parsed.almanac?.achievements)
        ? parsed.almanac.achievements
        : [],
    },
    bestScores: {
      infiniteMs: Math.max(0, parsed.bestScores?.infiniteMs ?? 0),
      wavesReached: Math.max(0, parsed.bestScores?.wavesReached ?? 0),
      kills: Math.max(0, parsed.bestScores?.kills ?? 0),
      bestLevel: Math.max(1, parsed.bestScores?.bestLevel ?? 1),
      totalPlayMs: Math.max(0, parsed.bestScores?.totalPlayMs ?? 0),
      bestKillStreak: Math.max(0, parsed.bestScores?.bestKillStreak ?? 0),
      bossesDefeated: Math.max(0, parsed.bestScores?.bossesDefeated ?? 0),
      totalCoinsEarned: Math.max(0, parsed.bestScores?.totalCoinsEarned ?? 0),
      lowestHpSurvive: Math.max(0, parsed.bestScores?.lowestHpSurvive ?? 0),
      bestAccuracy: Math.max(0, parsed.bestScores?.bestAccuracy ?? 0),
    },
    prefs: {
      showNameTag: parsed.prefs?.showNameTag ?? false,
    },
  };
}

export class SaveManager {
  static load(): Profile {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultProfile();
      const parsed = JSON.parse(raw) as Partial<Profile>;
      if (!parsed || typeof parsed !== 'object') return defaultProfile();
      return normalizeProfile(parsed);
    } catch {
      return defaultProfile();
    }
  }

  static save(profile: Profile, options: SaveOptions = {}): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(profile));
    } catch {
      // private mode / quota
    }
    if (!options.skipCloud) {
      void import('../services/AuthService').then(({ AuthService }) => {
        if (!AuthService.isLoggedIn()) return;
        void import('../services/CloudSync').then(({ scheduleCloudSync }) => {
          scheduleCloudSync(AuthService.getUser()?.id ?? null);
        });
      });
    }
  }

  static addCurrency(amount: number): Profile {
    const profile = this.load();
    profile.currency += Math.max(0, amount);
    this.save(profile);
    if (profile.currency >= 200) this.unlockAchievement('deep_pockets');
    return profile;
  }

  static setMetaLevel(id: MetaUpgradeId, level: number): Profile {
    const profile = this.load();
    profile.metaLevels[id] = level;
    this.save(profile);
    return profile;
  }

  static recordRunStats(stats: {
    survivalMs: number;
    kills: number;
    level: number;
    mode: 'infinite' | 'waves' | 'story';
    waveReached?: number;
    coinsEarned?: number;
    killStreak?: number;
    bossesDefeated?: number;
    lowestHpSurvive?: number;
    accuracy?: number;
  }): void {
    const profile = this.load();
    const best = profile.bestScores ?? emptyBestScores();
    if (stats.mode === 'infinite') {
      best.infiniteMs = Math.max(best.infiniteMs, stats.survivalMs);
    }
    if (stats.mode === 'waves' && stats.waveReached !== undefined) {
      best.wavesReached = Math.max(best.wavesReached, stats.waveReached);
    }
    best.kills = Math.max(best.kills, stats.kills);
    best.bestLevel = Math.max(best.bestLevel ?? 1, stats.level);
    best.totalPlayMs = (best.totalPlayMs ?? 0) + Math.max(0, stats.survivalMs);
    best.totalCoinsEarned = (best.totalCoinsEarned ?? 0) + Math.max(0, stats.coinsEarned ?? 0);
    if (stats.killStreak !== undefined) {
      best.bestKillStreak = Math.max(best.bestKillStreak ?? 0, stats.killStreak);
    }
    if (stats.bossesDefeated !== undefined) {
      best.bossesDefeated = (best.bossesDefeated ?? 0) + Math.max(0, stats.bossesDefeated);
    }
    if (stats.lowestHpSurvive !== undefined && stats.lowestHpSurvive > 0) {
      const prev = best.lowestHpSurvive ?? 0;
      best.lowestHpSurvive = prev > 0
        ? Math.min(prev, stats.lowestHpSurvive)
        : stats.lowestHpSurvive;
    }
    if (stats.accuracy !== undefined && stats.accuracy > 0) {
      best.bestAccuracy = Math.max(best.bestAccuracy ?? 0, stats.accuracy);
    }
    profile.bestScores = best;
    this.save(profile);
  }

  static discoverEnemy(id: EnemyType): void {
    this.discover('enemies', id);
    const profile = this.load();
    const all = Object.keys(ENEMY_DEFS) as EnemyType[];
    if (all.every((type) => profile.almanac.enemies.includes(type))) {
      this.unlockAchievement('full_bestiary');
    }
  }

  static discoverAmulet(id: AmuletId): void {
    this.discover('amulets', id);
  }

  static discoverUpgrade(id: RunUpgradeId): void {
    this.discover('upgrades', id);
  }

  static discoverBoss(id: BossId): void {
    this.discover('bosses', id);
  }

  static unlockAchievement(id: AchievementId): boolean {
    const profile = this.load();
    if (profile.almanac.achievements.includes(id)) return false;
    profile.almanac.achievements.push(id);
    this.save(profile);
    return true;
  }

  static hasAchievement(id: AchievementId): boolean {
    return this.load().almanac.achievements.includes(id);
  }

  /** Zera progresso de jogo (moedas, meta, Marã, recordes). Mantém prefs locais. */
  static resetProgress(): Profile {
    const prefs = this.load().prefs;
    const fresh = defaultProfile();
    fresh.prefs = prefs ?? { showNameTag: false };
    this.save(fresh);
    return fresh;
  }

  private static discover(
    category: keyof Profile['almanac'],
    id: EnemyType | AmuletId | RunUpgradeId | BossId | AchievementId,
  ): void {
    // Modo Livre é sandbox: nada novo entra no Marã
    if (GameSettingsStore.getMode() === 'free') return;
    const profile = this.load();
    const entries = profile.almanac[category] as string[];
    if (entries.includes(id)) return;
    entries.push(id);
    this.save(profile);
  }
}
