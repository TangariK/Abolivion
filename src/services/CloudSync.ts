import type { Profile } from '../data/types';
import { SaveManager } from '../upgrades/MetaUpgrades';
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
  currency: number;
  meta_levels: Profile['metaLevels'];
  almanac: Profile['almanac'];
  best_scores: NonNullable<Profile['bestScores']>;
  profile_version: number;
  updated_at: string;
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

export function mergeProfiles(local: Profile, cloud: Partial<Profile>): Profile {
  const localBest = local.bestScores ?? emptyBestScores();
  const cloudBest = cloud.bestScores ?? emptyBestScores();
  return {
    version: Math.max(local.version, cloud.version ?? local.version),
    currency: Math.max(local.currency, cloud.currency ?? 0),
    metaLevels: {
      maxHp: Math.max(local.metaLevels.maxHp, cloud.metaLevels?.maxHp ?? 0),
      speed: Math.max(local.metaLevels.speed, cloud.metaLevels?.speed ?? 0),
      damage: Math.max(local.metaLevels.damage, cloud.metaLevels?.damage ?? 0),
      fireRate: Math.max(local.metaLevels.fireRate, cloud.metaLevels?.fireRate ?? 0),
    },
    almanac: {
      enemies: union(local.almanac.enemies, cloud.almanac?.enemies ?? []),
      amulets: union(local.almanac.amulets, cloud.almanac?.amulets ?? []),
      upgrades: union(local.almanac.upgrades, cloud.almanac?.upgrades ?? []),
      bosses: union(local.almanac.bosses, cloud.almanac?.bosses ?? []),
      achievements: union(local.almanac.achievements, cloud.almanac?.achievements ?? []),
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
    // Account-level preference: cloud wins on login
    prefs: cloud.prefs ?? local.prefs ?? { showNameTag: false },
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
    version: row.profile_version || 4,
    currency: row.currency ?? 0,
    metaLevels: {
      maxHp: row.meta_levels?.maxHp ?? 0,
      speed: row.meta_levels?.speed ?? 0,
      damage: row.meta_levels?.damage ?? 0,
      fireRate: row.meta_levels?.fireRate ?? 0,
    },
    almanac: {
      enemies: row.almanac?.enemies ?? [],
      amulets: row.almanac?.amulets ?? [],
      upgrades: row.almanac?.upgrades ?? [],
      bosses: row.almanac?.bosses ?? [],
      achievements: row.almanac?.achievements ?? [],
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
    },
  };
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncing = false;

export async function pullAndMergeCloudProfile(userId: string): Promise<Profile> {
  const supabase = getSupabase();
  if (!supabase) return SaveManager.load();

  const { data, error } = await supabase
    .from('abolivion_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  const local = SaveManager.load();
  if (!data) {
    await pushCloudProfile(userId, local);
    return local;
  }

  const row = data as CloudProfileRow;
  AdminService.setRole(row.role);

  const merged = mergeProfiles(local, rowToProfile(row));
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
    meta_levels: profile.metaLevels,
    almanac: profile.almanac,
    best_scores: profile.bestScores ?? emptyBestScores(),
    show_name_tag: profile.prefs?.showNameTag ?? false,
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
    Pick<CloudProfileRow, 'show_name_tag' | 'accept_newsletter' | 'has_real_email'>
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
    await pushCloudProfile(userId, SaveManager.load());
  } catch (err) {
    console.warn('[Abolivion] cloud sync failed', err);
  } finally {
    syncing = false;
  }
}
