import type { MetaUpgradeId, Profile } from '../data/types';

const SAVE_KEY = 'abolivion_profile_v1';
const PROFILE_VERSION = 1;

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
  };
}

export class SaveManager {
  static load(): Profile {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultProfile();
      const parsed = JSON.parse(raw) as Profile;
      if (!parsed || parsed.version !== PROFILE_VERSION) return defaultProfile();
      return {
        version: PROFILE_VERSION,
        currency: Math.max(0, parsed.currency ?? 0),
        metaLevels: {
          maxHp: parsed.metaLevels?.maxHp ?? 0,
          speed: parsed.metaLevels?.speed ?? 0,
          damage: parsed.metaLevels?.damage ?? 0,
          fireRate: parsed.metaLevels?.fireRate ?? 0,
        },
      };
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
}
