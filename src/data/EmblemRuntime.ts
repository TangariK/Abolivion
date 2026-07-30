import type { EmblemId, Profile } from './types';
import { SaveManager } from '../upgrades/MetaUpgrades';

/** Emblema possui e não está desligado nas prefs (default: ligado). */
export function isEmblemActive(profile: Profile, id: EmblemId): boolean {
  if (!profile.almanac.emblems.includes(id)) return false;
  const flag = profile.prefs?.emblemEnabled?.[id];
  return flag !== false;
}

export function ownsEmblem(profile: Profile, id: EmblemId): boolean {
  return profile.almanac.emblems.includes(id);
}

export function setEmblemEnabled(id: EmblemId, enabled: boolean): Profile {
  const profile = SaveManager.load();
  const prefs = profile.prefs ?? { showNameTag: false };
  prefs.emblemEnabled = { ...(prefs.emblemEnabled ?? {}), [id]: enabled };
  profile.prefs = prefs;
  SaveManager.save(profile);
  return profile;
}

export function activeNinhada(profile: Profile): boolean {
  return isEmblemActive(profile, 'emblem_kurupi');
}

export function activeOlhar(profile: Profile): boolean {
  return isEmblemActive(profile, 'emblem_boitata');
}

export function activeMatilha(profile: Profile): boolean {
  return isEmblemActive(profile, 'emblem_wolf');
}

export function activeFrasco(profile: Profile): boolean {
  return isEmblemActive(profile, 'emblem_poison');
}

export function activeSalto(profile: Profile): boolean {
  return isEmblemActive(profile, 'emblem_acrobat');
}

export function activeCouraca(profile: Profile): boolean {
  return isEmblemActive(profile, 'emblem_shield');
}
