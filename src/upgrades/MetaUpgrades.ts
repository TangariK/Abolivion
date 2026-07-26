import type {
  AchievementId,
  AmuletId,
  BossId,
  EnemyType,
  MetaUpgradeId,
  Profile,
  RunUpgradeId,
} from '../data/types';

const SAVE_KEY = 'abolivion_profile_v1';
const PROFILE_VERSION = 3;

function emptyAlmanac(): Profile['almanac'] {
  return {
    enemies: [],
    amulets: [],
    upgrades: [],
    bosses: [],
    achievements: [],
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

  static save(profile: Profile): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(profile));
    } catch {
      // private mode / quota
    }
  }

  static addCurrency(amount: number): Profile {
    const profile = this.load();
    profile.currency += Math.max(0, amount);
    this.save(profile);
    return profile;
  }

  static setMetaLevel(id: MetaUpgradeId, level: number): Profile {
    const profile = this.load();
    profile.metaLevels[id] = level;
    this.save(profile);
    return profile;
  }

  static discoverEnemy(id: EnemyType): void {
    this.discover('enemies', id);
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

  private static discover(
    category: keyof Profile['almanac'],
    id: EnemyType | AmuletId | RunUpgradeId | BossId | AchievementId,
  ): void {
    const profile = this.load();
    const entries = profile.almanac[category] as string[];
    if (entries.includes(id)) return;
    entries.push(id);
    this.save(profile);
  }
}
