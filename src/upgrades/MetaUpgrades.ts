import type {
  AmuletId,
  EnemyType,
  MetaUpgradeId,
  Profile,
  RunUpgradeId,
} from '../data/types';

const SAVE_KEY = 'abolivion_profile_v1';
const PROFILE_VERSION = 2;

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
    almanac: {
      enemies: [],
      amulets: [],
      upgrades: [],
    },
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
      // v1 profiles did not have an almanac. Normalization migrates them
      // without losing currency or permanent upgrades.
      return normalizeProfile(parsed);
    } catch {
      return defaultProfile();
    }
  }

  static save(profile: Profile): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(profile));
    } catch {
      // private mode / quota — ignore
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

  private static discover(
    category: keyof Profile['almanac'],
    id: EnemyType | AmuletId | RunUpgradeId,
  ): void {
    const profile = this.load();
    const entries = profile.almanac[category] as string[];
    if (entries.includes(id)) return;
    entries.push(id);
    this.save(profile);
  }
}
