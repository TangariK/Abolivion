import type { GameModeId } from '../data/types';
import { AuthService } from './AuthService';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';
import { generateRoomCode, sha256Hex } from '../utils/roomCode';
import { onlineDisplayName } from '../utils/treeNames';

export type RoomGameMode = 'infinite' | 'waves';

export interface RoomListItem {
  code: string;
  host_display_name: string;
  is_public: boolean;
  game_mode: RoomGameMode;
  created_at: string;
  has_password: boolean;
}

export interface CreateRoomOptions {
  isPublic: boolean;
  password?: string;
  gameMode: RoomGameMode;
}

export interface CreatedRoom {
  code: string;
  isPublic: boolean;
  gameMode: RoomGameMode;
  displayName: string;
  shareUrl: string;
}

function requireClient() {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error('Supabase não configurado.');
  }
  return supabase;
}

export const RoomService = {
  async listWaiting(): Promise<RoomListItem[]> {
    const supabase = requireClient();
    const { data, error } = await supabase.rpc('abolivion_list_rooms');
    if (error) throw error;
    return (data ?? []) as RoomListItem[];
  },

  async create(options: CreateRoomOptions): Promise<CreatedRoom> {
    const supabase = requireClient();
    const displayName = onlineDisplayName(
      AuthService.isLoggedIn() ? AuthService.username() : null,
    );
    const passwordHash =
      !options.isPublic && options.password
        ? await sha256Hex(options.password)
        : null;

    let code = generateRoomCode();
    for (let attempt = 0; attempt < 8; attempt++) {
      const { error } = await supabase.from('abolivion_rooms').insert({
        code,
        host_uid: AuthService.getUser()?.id ?? null,
        host_guest_id: AuthService.isLoggedIn() ? null : crypto.randomUUID(),
        host_display_name: displayName,
        is_public: options.isPublic,
        password_hash: passwordHash,
        game_mode: options.gameMode,
        status: 'waiting',
      });
      if (!error) {
        return {
          code,
          isPublic: options.isPublic,
          gameMode: options.gameMode,
          displayName,
          shareUrl: `${window.location.origin}/?sala=${code}`,
        };
      }
      if (!/duplicate|unique/i.test(error.message)) throw error;
      code = generateRoomCode();
    }
    throw new Error('Não foi possível criar a sala. Tente de novo.');
  },

  async checkPassword(code: string, password: string): Promise<boolean> {
    const supabase = requireClient();
    const { data, error } = await supabase.rpc('abolivion_room_check_password', {
      p_code: code.trim().toUpperCase(),
      p_password: password,
    });
    if (error) throw error;
    return Boolean(data);
  },

  async getWaiting(code: string): Promise<RoomListItem | null> {
    const rooms = await this.listWaiting();
    return rooms.find((r) => r.code === code.trim().toUpperCase()) ?? null;
  },

  async setStatus(code: string, status: 'waiting' | 'playing' | 'closed'): Promise<void> {
    const supabase = requireClient();
    const { error } = await supabase
      .from('abolivion_rooms')
      .update({ status })
      .eq('code', code.trim().toUpperCase());
    if (error) throw error;
  },

  async close(code: string): Promise<void> {
    const supabase = requireClient();
    const { error } = await supabase
      .from('abolivion_rooms')
      .delete()
      .eq('code', code.trim().toUpperCase());
    if (error) {
      await this.setStatus(code, 'closed');
    }
  },

  toGameMode(mode: RoomGameMode): GameModeId {
    return mode;
  },
};
