import type Phaser from 'phaser';
import { AUDIO_MANIFEST, type AudioId } from '../data/AudioManifest';
import { SaveManager } from '../upgrades/MetaUpgrades';

type SoundPrefs = {
  musicVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
};

/**
 * Áudio global. Arquivos em public/audio/ — se faltarem, as chamadas são no-op.
 * Sempre para todas as faixas de música ao trocar (evita menu+jogo juntos).
 */
export class AudioService {
  private static scene?: Phaser.Scene;
  private static currentMusic?: AudioId;
  private static loaded = new Set<string>();
  private static ducked = false;

  static markLoaded(key: string): void {
    this.loaded.add(key);
  }

  static bind(scene: Phaser.Scene): void {
    this.scene = scene;
    this.applyVolumes();
  }

  static readPrefs(): SoundPrefs {
    const p = SaveManager.load().prefs;
    return {
      musicVolume: clamp01(p?.musicVolume ?? 0.7),
      sfxVolume: clamp01(p?.sfxVolume ?? 0.8),
      musicEnabled: p?.musicEnabled ?? true,
      sfxEnabled: p?.sfxEnabled ?? true,
    };
  }

  static writePrefs(partial: Partial<SoundPrefs>): void {
    const profile = SaveManager.load();
    const cur = this.readPrefs();
    profile.prefs = {
      showNameTag: profile.prefs?.showNameTag ?? false,
      acceptNewsletter: profile.prefs?.acceptNewsletter ?? false,
      musicVolume: partial.musicVolume ?? cur.musicVolume,
      sfxVolume: partial.sfxVolume ?? cur.sfxVolume,
      musicEnabled: partial.musicEnabled ?? cur.musicEnabled,
      sfxEnabled: partial.sfxEnabled ?? cur.sfxEnabled,
      muralVisibility: profile.prefs?.muralVisibility ?? 'public',
      muralAlias: profile.prefs?.muralAlias,
    };
    SaveManager.save(profile, { skipCloud: true });
    this.applyVolumes();
  }

  /** Pause: abafa a música da run. */
  static setMusicDucked(on: boolean): void {
    this.ducked = on;
    this.applyVolumes();
  }

  static applyVolumes(): void {
    const scene = this.scene;
    if (!scene?.sound) return;
    const prefs = this.readPrefs();
    const duckMul = this.ducked ? 0.32 : 1;
    // Só música — SFX one-shot não precisam (e get() em instâncias mortas crashava UpgradeScene).
    type VolSound = Phaser.Sound.BaseSound & {
      setVolume?: (v: number) => void;
      isPlaying?: boolean;
      isPaused?: boolean;
      pause?: () => void;
      resume?: () => void;
    };
    for (const entry of AUDIO_MANIFEST) {
      if (entry.kind !== 'music') continue;
      if (!this.loaded.has(entry.id)) continue;
      if (!scene.cache?.audio?.exists(entry.id)) continue;
      let snd: VolSound | null = null;
      try {
        snd = scene.sound.get(entry.id) as unknown as VolSound | null;
      } catch {
        continue;
      }
      if (!snd || typeof snd.setVolume !== 'function') continue;
      const base = (entry.gain ?? 1) * prefs.musicVolume;
      const vol = prefs.musicEnabled ? base * duckMul : 0;
      try {
        snd.setVolume(vol);
      } catch {
        continue;
      }
      try {
        if (!prefs.musicEnabled && snd.isPlaying) snd.pause?.();
        if (
          prefs.musicEnabled
          && this.currentMusic === entry.id
          && snd.isPaused
          && !this.ducked
        ) {
          snd.resume?.();
        }
      } catch {
        // ignore
      }
    }
  }

  /** Para qualquer música em loop (todas as keys), evita sobreposição. */
  static stopAllMusic(): void {
    const scene = this.scene;
    if (scene?.sound) {
      for (const entry of AUDIO_MANIFEST) {
        if (entry.kind !== 'music') continue;
        try {
          scene.sound.stopByKey(entry.id);
        } catch {
          // ignore
        }
      }
    }
    this.currentMusic = undefined;
    this.ducked = false;
  }

  static playMusic(id: AudioId): void {
    const scene = this.scene;
    if (!scene?.sound) return;
    if (!this.has(id)) {
      // Faixa ausente: não corta a música atual (exceto se for a mesma key)
      if (id !== 'music_run' && this.has('music_run')) {
        this.playMusic('music_run');
      }
      return;
    }
    const prefs = this.readPrefs();
    if (!prefs.musicEnabled) {
      this.stopAllMusic();
      this.currentMusic = id;
      return;
    }
    if (this.currentMusic === id) {
      const existing = scene.sound.get(id) as Phaser.Sound.BaseSound & { isPlaying?: boolean; play?: () => void };
      if (existing && !existing.isPlaying) existing.play?.();
      this.applyVolumes();
      return;
    }
    this.stopAllMusic();
    this.currentMusic = id;
    const entry = AUDIO_MANIFEST.find((e) => e.id === id);
    const vol = (entry?.gain ?? 1) * prefs.musicVolume * (this.ducked ? 0.32 : 1);
    scene.sound.play(id, { loop: entry?.loop ?? true, volume: vol });
  }

  static stopMusic(): void {
    this.stopAllMusic();
  }

  static playSfx(id: AudioId): void {
    const scene = this.scene;
    if (!scene?.sound) return;
    if (!this.has(id)) return;
    const prefs = this.readPrefs();
    if (!prefs.sfxEnabled) return;
    const entry = AUDIO_MANIFEST.find((e) => e.id === id);
    const vol = (entry?.gain ?? 1) * prefs.sfxVolume;
    scene.sound.play(id, { volume: vol });
  }

  static has(id: AudioId): boolean {
    const scene = this.scene;
    return Boolean(scene && this.loaded.has(id) && scene.cache.audio.exists(id));
  }

  static playBossMusic(bossId: string): void {
    const map: Record<string, AudioId> = {
      kurupi_brood: 'music_boss_kurupi',
      boitata_gaze: 'music_boss_boitata',
      wolf_king: 'music_boss_wolf',
      poisoner_master: 'music_boss_poison',
      acrobat_leap: 'music_boss_acrobat',
    };
    this.playMusic(map[bossId] ?? 'music_run');
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
