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
  /** Presente quando o host é convidado (sem conta). */
  hostGuestId?: string;
}

const GUEST_HOST_KEY = 'abolivion_room_host_guest';

function requireClient() {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error('Supabase não configurado.');
  }
  return supabase;
}

function saveGuestHostBinding(code: string, guestId: string): void {
  try {
    sessionStorage.setItem(GUEST_HOST_KEY, JSON.stringify({ code: code.toUpperCase(), guestId }));
  } catch {
    // ignore
  }
}

function loadGuestHostId(code: string): string | null {
  try {
    const raw = sessionStorage.getItem(GUEST_HOST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { code?: string; guestId?: string };
    if (parsed.code?.toUpperCase() !== code.trim().toUpperCase()) return null;
    return parsed.guestId ?? null;
  } catch {
    return null;
  }
}

async function hostMutate(
  code: string,
  action: 'waiting' | 'playing' | 'closed' | 'delete',
): Promise<void> {
  const supabase = requireClient();
  const roomCode = code.trim().toUpperCase();
  const guestId = AuthService.isLoggedIn() ? null : loadGuestHostId(roomCode);

  const { data, error } = await supabase.rpc('abolivion_room_host_mutate', {
    p_code: roomCode,
    p_guest_id: guestId,
    p_action: action,
  });
  if (error) throw error;
  if (!data) {
    // Fallback: conta logada ainda pode tentar update direto (RLS próprio)
    if (AuthService.isLoggedIn() && action !== 'delete') {
      const { error: upErr } = await supabase
        .from('abolivion_rooms')
        .update({ status: action })
        .eq('code', roomCode);
      if (upErr) throw upErr;
      return;
    }
    if (AuthService.isLoggedIn() && action === 'delete') {
      const { error: delErr } = await supabase
        .from('abolivion_rooms')
        .delete()
        .eq('code', roomCode);
      if (delErr) throw delErr;
      return;
    }
    throw new Error('Sem permissão para alterar esta sala.');
  }
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

    const hostGuestId = AuthService.isLoggedIn() ? null : crypto.randomUUID();

    let code = generateRoomCode();
    for (let attempt = 0; attempt < 8; attempt++) {
      const { error } = await supabase.from('abolivion_rooms').insert({
        code,
        host_uid: AuthService.getUser()?.id ?? null,
        host_guest_id: hostGuestId,
        host_display_name: displayName,
        is_public: options.isPublic,
        password_hash: passwordHash,
        game_mode: options.gameMode,
        status: 'waiting',
      });
      if (!error) {
        if (hostGuestId) saveGuestHostBinding(code, hostGuestId);
        return {
          code,
          isPublic: options.isPublic,
          gameMode: options.gameMode,
          displayName,
          shareUrl: `${window.location.origin}/?sala=${code}`,
          hostGuestId: hostGuestId ?? undefined,
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
    await hostMutate(code, status);
  },

  async close(code: string): Promise<void> {
    try {
      await hostMutate(code, 'delete');
    } catch {
      try {
        await hostMutate(code, 'closed');
      } catch {
        // ignore
      }
    }
  },

  toGameMode(mode: RoomGameMode): GameModeId {
    return mode;
  },
};
