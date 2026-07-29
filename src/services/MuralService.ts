import type { Profile } from '../data/types';
import { formatDuration } from '../utils/formatDuration';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';
import { SaveManager } from '../upgrades/MetaUpgrades';
import { AuthService } from './AuthService';
import { stableTreeAlias } from '../utils/treeNames';

export type MuralSort = 'waves' | 'time' | 'kills' | 'level';

export interface MuralEntry {
  displayName: string;
  wavesReached: number;
  infiniteMs: number;
  kills: number;
  bestLevel: number;
  totalPlayMs: number;
  isLocal?: boolean;
}

export function muralDisplayName(profile: Profile, fallbackUserId?: string | null): string {
  const vis = profile.prefs?.muralVisibility ?? 'public';
  if (vis === 'invisible') return '';
  if (vis === 'anonymous') {
    const alias =
      profile.prefs?.muralAlias
      || stableTreeAlias(fallbackUserId || AuthService.username() || 'local');
    return alias;
  }
  const name = AuthService.username();
  return name && name !== 'convidado' ? name : 'Caçador local';
}

function localAsEntry(profile: Profile): MuralEntry | null {
  const vis = profile.prefs?.muralVisibility ?? 'public';
  if (vis === 'invisible') return null;
  const best = profile.bestScores;
  if (!best) return null;
  return {
    displayName: muralDisplayName(profile, AuthService.getUser()?.id),
    wavesReached: best.wavesReached ?? 0,
    infiniteMs: best.infiniteMs ?? 0,
    kills: best.kills ?? 0,
    bestLevel: best.bestLevel ?? 1,
    totalPlayMs: best.totalPlayMs ?? 0,
    isLocal: true,
  };
}

function sortEntries(entries: MuralEntry[], sort: MuralSort): MuralEntry[] {
  const copy = [...entries];
  copy.sort((a, b) => {
    if (sort === 'time') return b.infiniteMs - a.infiniteMs;
    if (sort === 'kills') return b.kills - a.kills;
    if (sort === 'level') return b.bestLevel - a.bestLevel;
    return b.wavesReached - a.wavesReached;
  });
  return copy;
}

export async function fetchMuralEntries(sort: MuralSort): Promise<MuralEntry[]> {
  const local = localAsEntry(SaveManager.load());
  const merged: MuralEntry[] = [];

  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.rpc('abolivion_mural_entries', {
        p_sort: sort,
        p_limit: 30,
      });
      if (!error && Array.isArray(data)) {
        for (const row of data as Array<{
          display_name: string;
          waves_reached: number;
          infinite_ms: number;
          kills: number;
          best_level: number;
          total_play_ms: number;
        }>) {
          merged.push({
            displayName: row.display_name,
            wavesReached: row.waves_reached ?? 0,
            infiniteMs: Number(row.infinite_ms ?? 0),
            kills: row.kills ?? 0,
            bestLevel: row.best_level ?? 1,
            totalPlayMs: Number(row.total_play_ms ?? 0),
          });
        }
      }
    }
  }

  if (local) {
    const exists = merged.some(
      (e) => e.displayName.toLowerCase() === local.displayName.toLowerCase(),
    );
    if (!exists) merged.push(local);
  }

  if (merged.length === 0 && local) return [local];
  return sortEntries(merged, sort).slice(0, 25);
}

export function formatMuralStat(sort: MuralSort, entry: MuralEntry): string {
  if (sort === 'time') return formatDuration(entry.infiniteMs);
  if (sort === 'kills') return `${entry.kills} abates`;
  if (sort === 'level') return `Nv ${entry.bestLevel}`;
  return `Rodada ${entry.wavesReached}`;
}

export function formatPlayTime(ms: number): string {
  return formatDuration(ms);
}
