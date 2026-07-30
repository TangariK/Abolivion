import type { Profile } from '../data/types';
import {
  hasProfileProgress,
  profileProgressScore,
  SaveManager,
} from '../upgrades/MetaUpgrades';
import { AdminService } from './AdminService';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';

export interface CloudProfileRow {
  id: string;
  display_name: string | null;
  username: string | null;
  role: string | null;
  has_real_email: boolean | null;
  accept_newsletter: boolean | null;
  show_name_tag: boolean | null;
  mural_visibility: string | null;
  mural_alias: string | null;
  currency: number;
  resin?: number;
  meta_levels: Profile['metaLevels'];
  almanac: Profile['almanac'];
  best_scores: NonNullable<Profile['bestScores']>;
  profile_version: number;
  updated_at: string;
  created_at?: string;
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

function cloudWinsEconomy(localUpdatedAt: string | undefined, cloudUpdatedAt: string): boolean {
  if (!localUpdatedAt) return true;
  const localTs = Date.parse(localUpdatedAt);
  const cloudTs = Date.parse(cloudUpdatedAt);
  if (Number.isNaN(localTs)) return true;
  if (Number.isNaN(cloudTs)) return false;
  return cloudTs >= localTs;
}

export function mergeProfiles(
  local: Profile,
  cloud: Partial<Profile>,
  cloudUpdatedAt?: string,
): Profile {
  const localBest = local.bestScores ?? emptyBestScores();
  const cloudBest = cloud.bestScores ?? emptyBestScores();
  const useCloudEcon = cloudWinsEconomy(local.updatedAt, cloudUpdatedAt ?? local.updatedAt ?? '');

  return {
    version: Math.max(local.version, cloud.version ?? local.version),
    currency: useCloudEcon ? (cloud.currency ?? 0) : local.currency,
    resin: useCloudEcon ? (cloud.resin ?? 0) : (local.resin ?? 0),
    updatedAt: useCloudEcon
      ? (cloudUpdatedAt ?? cloud.updatedAt ?? local.updatedAt)
      : local.updatedAt,
    metaLevels: useCloudEcon
      ? {
          maxHp: cloud.metaLevels?.maxHp ?? 0,
          speed: cloud.metaLevels?.speed ?? 0,
          damage: cloud.metaLevels?.damage ?? 0,
          fireRate: cloud.metaLevels?.fireRate ?? 0,
          xpEfficiency: cloud.metaLevels?.xpEfficiency ?? 0,
        }
      : { ...local.metaLevels },
    almanac: {
      enemies: union(local.almanac.enemies, cloud.almanac?.enemies ?? []),
      amulets: union(local.almanac.amulets, cloud.almanac?.amulets ?? []),
      upgrades: union(local.almanac.upgrades, cloud.almanac?.upgrades ?? []),
      bosses: union(local.almanac.bosses, cloud.almanac?.bosses ?? []),
      achievements: union(local.almanac.achievements, cloud.almanac?.achievements ?? []),
      emblems: union(local.almanac.emblems ?? [], cloud.almanac?.emblems ?? []),
    },
    bestScores: {
      infiniteMs: Math.max(localBest.infiniteMs, cloudBest.infiniteMs),
      wavesReached: Math.max(localBest.wavesReached, cloudBest.wavesReached),
      kills: Math.max(localBest.kills, cloudBest.kills),
      bestLevel: Math.max(localBest.bestLevel ?? 1, cloudBest.bestLevel ?? 1),
      totalPlayMs: Math.max(localBest.totalPlayMs ?? 0, cloudBest.totalPlayMs ?? 0),
      bestKillStreak: Math.max(localBest.bestKillStreak ?? 0, cloudBest.bestKillStreak ?? 0),
      bossesDefeated: Math.max(localBest.bossesDefeated ?? 0, cloudBest.bossesDefeated ?? 0),
      totalCoinsEarned: Math.max(localBest.totalCoinsEarned ?? 0, cloudBest.totalCoinsEarned ?? 0),
      lowestHpSurvive: mergeLowestHp(localBest.lowestHpSurvive, cloudBest.lowestHpSurvive),
      bestAccuracy: Math.max(localBest.bestAccuracy ?? 0, cloudBest.bestAccuracy ?? 0),
    },
    prefs: {
      showNameTag: cloud.prefs?.showNameTag ?? local.prefs?.showNameTag ?? false,
      acceptNewsletter: cloud.prefs?.acceptNewsletter ?? local.prefs?.acceptNewsletter ?? false,
      musicVolume: local.prefs?.musicVolume ?? 0.7,
      sfxVolume: local.prefs?.sfxVolume ?? 0.8,
      musicEnabled: local.prefs?.musicEnabled ?? true,
      sfxEnabled: local.prefs?.sfxEnabled ?? true,
      muralVisibility:
        cloud.prefs?.muralVisibility ?? local.prefs?.muralVisibility ?? 'public',
      muralAlias: cloud.prefs?.muralAlias ?? local.prefs?.muralAlias,
      emblemEnabled: {
        ...(local.prefs?.emblemEnabled ?? {}),
        ...(cloud.prefs?.emblemEnabled ?? {}),
      },
    },
  };
}

function mergeLowestHp(a?: number, b?: number): number {
  const av = a ?? 0;
  const bv = b ?? 0;
  if (av <= 0) return bv;
  if (bv <= 0) return av;
  return Math.min(av, bv);
}

function union<T extends string>(a: T[], b: T[]): T[] {
  return [...new Set([...a, ...b])];
}

export function rowToProfile(row: CloudProfileRow): Profile {
  return {
    version: row.profile_version || 5,
    currency: row.currency ?? 0,
    resin: row.resin ?? 0,
    updatedAt: row.updated_at,
    metaLevels: {
      maxHp: row.meta_levels?.maxHp ?? 0,
      speed: row.meta_levels?.speed ?? 0,
      damage: row.meta_levels?.damage ?? 0,
      fireRate: row.meta_levels?.fireRate ?? 0,
      xpEfficiency: row.meta_levels?.xpEfficiency ?? 0,
    },
    almanac: {
      enemies: row.almanac?.enemies ?? [],
      amulets: row.almanac?.amulets ?? [],
      upgrades: row.almanac?.upgrades ?? [],
      bosses: row.almanac?.bosses ?? [],
      achievements: row.almanac?.achievements ?? [],
      emblems: row.almanac?.emblems ?? [],
    },
    bestScores: {
      infiniteMs: row.best_scores?.infiniteMs ?? 0,
      wavesReached: row.best_scores?.wavesReached ?? 0,
      kills: row.best_scores?.kills ?? 0,
      bestLevel: row.best_scores?.bestLevel ?? 1,
      totalPlayMs: row.best_scores?.totalPlayMs ?? 0,
      bestKillStreak: row.best_scores?.bestKillStreak ?? 0,
      bossesDefeated: row.best_scores?.bossesDefeated ?? 0,
      totalCoinsEarned: row.best_scores?.totalCoinsEarned ?? 0,
      lowestHpSurvive: row.best_scores?.lowestHpSurvive ?? 0,
      bestAccuracy: row.best_scores?.bestAccuracy ?? 0,
    },
    prefs: {
      showNameTag: row.show_name_tag ?? false,
      acceptNewsletter: row.accept_newsletter ?? false,
      musicVolume: 0.7,
      sfxVolume: 0.8,
      musicEnabled: true,
      sfxEnabled: true,
      muralVisibility:
        row.mural_visibility === 'anonymous' || row.mural_visibility === 'invisible'
          ? row.mural_visibility
          : 'public',
      muralAlias: row.mural_alias ?? undefined,
    },
  };
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncing = false;

/**
 * Ao logar:
 * - Convidado e conta usam slots locais separados (não misturam).
 * - Conta existente na nuvem: NÃO importa o save de convidado deste browser.
 * - Slot local da própria conta pode mesclar com a nuvem (continuidade no mesmo device).
 * - Conta nova / nuvem vazia: importa convidado só se o slot da conta ainda estiver vazio
 *   e o convidado tiver progresso (cadastro neste aparelho).
 * - Recuperação: se o legado compartilhado (v1) for claramente mais rico que a nuvem
 *   e o slot da conta estiver vazio, usa o legado uma vez (corrige merge antigo).
 */
export async function pullAndMergeCloudProfile(userId: string): Promise<Profile> {
  const supabase = getSupabase();
  SaveManager.bindUser(userId);
  if (!supabase) return SaveManager.load();

  const { data, error } = await supabase
    .from('abolivion_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  const accountLocal = SaveManager.loadUser(userId);
  const guest = SaveManager.loadGuest();
  const legacyShared = guest;

  if (!data) {
    const seed = hasProfileProgress(accountLocal)
      ? accountLocal
      : hasProfileProgress(guest)
        ? guest
        : SaveManager.load();
    SaveManager.save(seed, { skipCloud: true });
    await pushCloudProfile(userId, seed);
    return seed;
  }

  const row = data as CloudProfileRow;
  AdminService.setRole(row.role);
  const cloud = rowToProfile(row);
  const cloudHasProgress = hasProfileProgress(cloud);

  let accountSeed = accountLocal;
  if (!hasProfileProgress(accountSeed) && hasProfileProgress(legacyShared)) {
    if (!cloudHasProgress || profileProgressScore(legacyShared) > profileProgressScore(cloud) * 1.25) {
      accountSeed = legacyShared;
    }
  }

  let merged: Profile;
  if (!cloudHasProgress) {
    merged = hasProfileProgress(accountSeed) ? accountSeed : cloud;
  } else if (!hasProfileProgress(accountSeed)) {
    merged = cloud;
  } else {
    merged = mergeProfiles(accountSeed, cloud, row.updated_at);
  }

  const localAudio = SaveManager.load().prefs;
  merged.prefs = {
    ...merged.prefs,
    showNameTag: cloud.prefs?.showNameTag ?? false,
    acceptNewsletter: cloud.prefs?.acceptNewsletter ?? false,
    musicVolume: localAudio?.musicVolume ?? 0.7,
    sfxVolume: localAudio?.sfxVolume ?? 0.8,
    musicEnabled: localAudio?.musicEnabled ?? true,
    sfxEnabled: localAudio?.sfxEnabled ?? true,
    muralVisibility: cloud.prefs?.muralVisibility ?? merged.prefs?.muralVisibility ?? 'public',
    muralAlias: cloud.prefs?.muralAlias ?? merged.prefs?.muralAlias,
    emblemEnabled: merged.prefs?.emblemEnabled ?? localAudio?.emblemEnabled,
  };

  SaveManager.save(merged, { skipCloud: true });
  await pushCloudProfile(userId, merged);
  return merged;
}

export async function pushCloudProfile(userId: string, profile: Profile): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const payload = {
    id: userId,
    currency: profile.currency,
    resin: profile.resin ?? 0,
    meta_levels: profile.metaLevels,
    almanac: profile.almanac,
    best_scores: profile.bestScores ?? emptyBestScores(),
    show_name_tag: profile.prefs?.showNameTag ?? false,
    accept_newsletter: profile.prefs?.acceptNewsletter ?? false,
    mural_visibility: profile.prefs?.muralVisibility ?? 'public',
    mural_alias: profile.prefs?.muralAlias ?? null,
    profile_version: profile.version,
  };

  const { error } = await supabase.from('abolivion_profiles').upsert(payload, {
    onConflict: 'id',
  });
  if (error) throw error;
}

/** Atualiza flags avulsas do perfil cloud (ex.: show_name_tag). */
export async function pushProfileFlags(
  userId: string,
  flags: Partial<
    Pick<
      CloudProfileRow,
      | 'show_name_tag'
      | 'accept_newsletter'
      | 'has_real_email'
      | 'mural_visibility'
      | 'mural_alias'
    >
  >,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('abolivion_profiles')
    .update(flags)
    .eq('id', userId);
  if (error) throw error;
}

export function scheduleCloudSync(userId: string | null): void {
  if (!userId || !isSupabaseConfigured()) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void flushCloudSync(userId);
  }, 800);
}

export async function flushCloudSync(userId: string): Promise<void> {
  if (syncing) return;
  syncing = true;
  try {
    SaveManager.bindUser(userId);
    await pushCloudProfile(userId, SaveManager.load());
  } catch (err) {
    console.warn('[Abolivion] cloud sync failed', err);
  } finally {
    syncing = false;
  }
}
