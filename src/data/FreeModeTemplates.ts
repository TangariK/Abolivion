import type { FreeModeConfig } from '../data/types';

export interface FreeModeTemplate {
  name: string;
  config: FreeModeConfig;
  updatedAt: number;
}

const KEY = 'abolivion_free_templates_v1';

export function listFreeTemplates(): FreeModeTemplate[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FreeModeTemplate[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t) => t && typeof t.name === 'string' && t.config)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveFreeTemplate(name: string, config: FreeModeConfig): FreeModeTemplate[] {
  const trimmed = name.trim().slice(0, 40);
  if (!trimmed) return listFreeTemplates();
  const list = listFreeTemplates().filter(
    (t) => t.name.toLowerCase() !== trimmed.toLowerCase(),
  );
  list.unshift({
    name: trimmed,
    config: structuredClone(config),
    updatedAt: Date.now(),
  });
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 40)));
  return listFreeTemplates();
}

export function deleteFreeTemplate(name: string): FreeModeTemplate[] {
  const list = listFreeTemplates().filter(
    (t) => t.name.toLowerCase() !== name.trim().toLowerCase(),
  );
  localStorage.setItem(KEY, JSON.stringify(list));
  return list;
}

export function getFreeTemplate(name: string): FreeModeTemplate | undefined {
  return listFreeTemplates().find(
    (t) => t.name.toLowerCase() === name.trim().toLowerCase(),
  );
}
