/**
 * Catálogo de áudio do Abolivion.
 * Arquivos em `public/audio/` — se faltar, o jogo segue mudo naquele canal.
 * Baixar: npm run audio:fetch
 */
export type AudioKind = 'music' | 'sfx';

export type AudioId =
  | 'music_menu'
  | 'music_run'
  | 'music_boss_kurupi'
  | 'music_boss_boitata'
  | 'music_boss_wolf'
  | 'music_boss_poison'
  | 'music_boss_acrobat'
  | 'sfx_enemy_death'
  | 'sfx_ui_click'
  | 'sfx_ui_open'
  | 'sfx_ui_back'
  | 'sfx_page_turn'
  | 'sfx_almanac_select'
  | 'sfx_xp_collect'
  | 'sfx_buff_appear'
  | 'sfx_buff_select'
  | 'sfx_amulet_appear'
  | 'sfx_amulet_select'
  | 'sfx_meta_buy'
  | 'sfx_player_hurt'
  | 'sfx_potion_land'
  | 'sfx_boss_appear'
  | 'sfx_lightning'
  | 'sfx_dog_bark'
  | 'sfx_boss_roar'
  | 'sfx_acrobat_land';

export interface AudioEntry {
  id: AudioId;
  kind: AudioKind;
  files: string[];
  gain?: number;
  loop?: boolean;
}

export const AUDIO_MANIFEST: AudioEntry[] = [
  { id: 'music_menu', kind: 'music', files: ['audio/music/menu.ogg', 'audio/music/menu.mp3'], gain: 0.45, loop: true },
  { id: 'music_run', kind: 'music', files: ['audio/music/run.ogg', 'audio/music/run.mp3'], gain: 0.4, loop: true },
  { id: 'music_boss_kurupi', kind: 'music', files: ['audio/music/boss_kurupi.ogg', 'audio/music/boss_kurupi.mp3'], gain: 0.5, loop: true },
  { id: 'music_boss_boitata', kind: 'music', files: ['audio/music/boss_boitata.ogg', 'audio/music/boss_boitata.mp3'], gain: 0.5, loop: true },
  { id: 'music_boss_wolf', kind: 'music', files: ['audio/music/boss_wolf.ogg', 'audio/music/boss_wolf.mp3'], gain: 0.5, loop: true },
  { id: 'music_boss_poison', kind: 'music', files: ['audio/music/boss_poison.ogg', 'audio/music/boss_poison.mp3'], gain: 0.58, loop: true },
  { id: 'music_boss_acrobat', kind: 'music', files: ['audio/music/boss_acrobat.ogg', 'audio/music/boss_acrobat.mp3'], gain: 0.52, loop: true },

  { id: 'sfx_enemy_death', kind: 'sfx', files: ['audio/sfx/enemy_death.ogg', 'audio/sfx/enemy_death.mp3'], gain: 0.28 },
  { id: 'sfx_ui_click', kind: 'sfx', files: ['audio/sfx/ui_click.ogg', 'audio/sfx/ui_click.mp3'], gain: 0.4 },
  { id: 'sfx_ui_open', kind: 'sfx', files: ['audio/sfx/ui_open.ogg', 'audio/sfx/ui_open.mp3'], gain: 0.42 },
  { id: 'sfx_ui_back', kind: 'sfx', files: ['audio/sfx/ui_back.ogg', 'audio/sfx/ui_back.mp3'], gain: 0.45 },
  { id: 'sfx_page_turn', kind: 'sfx', files: ['audio/sfx/page_turn.ogg', 'audio/sfx/page_turn.mp3'], gain: 0.4 },
  { id: 'sfx_almanac_select', kind: 'sfx', files: ['audio/sfx/almanac_select.ogg', 'audio/sfx/almanac_select.mp3'], gain: 0.4 },
  { id: 'sfx_xp_collect', kind: 'sfx', files: ['audio/sfx/xp_collect.ogg', 'audio/sfx/xp_collect.mp3'], gain: 0.32 },
  { id: 'sfx_buff_appear', kind: 'sfx', files: ['audio/sfx/buff_appear.ogg', 'audio/sfx/buff_appear.mp3'], gain: 0.5 },
  { id: 'sfx_buff_select', kind: 'sfx', files: ['audio/sfx/buff_select.ogg', 'audio/sfx/buff_select.mp3'], gain: 0.48 },
  { id: 'sfx_amulet_appear', kind: 'sfx', files: ['audio/sfx/amulet_appear.ogg', 'audio/sfx/amulet_appear.mp3'], gain: 0.55 },
  { id: 'sfx_amulet_select', kind: 'sfx', files: ['audio/sfx/amulet_select.ogg', 'audio/sfx/amulet_select.mp3'], gain: 0.52 },
  { id: 'sfx_meta_buy', kind: 'sfx', files: ['audio/sfx/meta_buy.ogg', 'audio/sfx/meta_buy.mp3'], gain: 0.5 },
  { id: 'sfx_player_hurt', kind: 'sfx', files: ['audio/sfx/player_hurt.ogg', 'audio/sfx/player_hurt.mp3'], gain: 0.45 },
  { id: 'sfx_potion_land', kind: 'sfx', files: ['audio/sfx/potion_land.ogg', 'audio/sfx/potion_land.mp3'], gain: 0.4 },
  { id: 'sfx_boss_appear', kind: 'sfx', files: ['audio/sfx/boss_appear.ogg', 'audio/sfx/boss_appear.mp3'], gain: 0.55 },
  { id: 'sfx_lightning', kind: 'sfx', files: ['audio/sfx/lightning.ogg', 'audio/sfx/lightning.mp3'], gain: 0.45 },
  { id: 'sfx_dog_bark', kind: 'sfx', files: ['audio/sfx/dog_bark.ogg', 'audio/sfx/dog_bark.mp3'], gain: 0.48 },
  { id: 'sfx_boss_roar', kind: 'sfx', files: ['audio/sfx/boss_roar.ogg', 'audio/sfx/boss_roar.mp3'], gain: 0.6 },
  { id: 'sfx_acrobat_land', kind: 'sfx', files: ['audio/sfx/acrobat_land.ogg', 'audio/sfx/acrobat_land.mp3'], gain: 0.55 },
];
