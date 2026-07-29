import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from './supabaseClient';

export type OnlineRole = 'host' | 'guest';

export interface OnlinePeerInfo {
  peerId: string;
  displayName: string;
  role: OnlineRole;
}

export interface OnlineInputMsg {
  type: 'input';
  peerId: string;
  seq: number;
  move: { up: boolean; down: boolean; left: boolean; right: boolean };
  aim: number;
  firing: boolean;
}

export interface OnlineHelloMsg {
  type: 'hello';
  peer: OnlinePeerInfo;
}

export interface OnlineReadyMsg {
  type: 'ready';
  peerId: string;
}

export interface OnlineCountdownMsg {
  type: 'countdown';
  seconds: number;
}

export interface OnlineStartMsg {
  type: 'start';
  seed: number;
}

export interface OnlinePeerLeftMsg {
  type: 'peerLeft';
  peerId: string;
}

export interface OnlineChoiceLockMsg {
  type: 'choiceLock';
  peerId: string;
  locked: boolean;
}

export interface OnlineSnapshotMsg {
  type: 'snapshot';
  t: number;
  players: Array<{
    peerId: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    dead: boolean;
    aim: number;
    choosing: boolean;
    poison: boolean;
    bleed: boolean;
    damage: number;
    fireRate: number;
    speed: number;
    projectileSpeed: number;
    xpPickupRadius: number;
    xpGainBonus: number;
  }>;
  enemies: Array<{
    id: number;
    x: number;
    y: number;
    type: string;
    hp: number;
    armor: number;
  }>;
  kills: number;
  level: number;
  xpProgress: number;
  survivalMs: number;
  wave?: number;
}

export type OnlineMsg =
  | OnlineInputMsg
  | OnlineHelloMsg
  | OnlineReadyMsg
  | OnlineCountdownMsg
  | OnlineStartMsg
  | OnlinePeerLeftMsg
  | OnlineChoiceLockMsg
  | OnlineSnapshotMsg
  | { type: 'reviveAlly'; targetPeerId: string; hpRatio: number }
  | { type: 'soloContinue' };

type MsgHandler = (msg: OnlineMsg) => void;

/**
 * Canal Realtime Broadcast por sala. Host autoritativo na partida.
 */
export class OnlineSession {
  readonly roomCode: string;
  readonly role: OnlineRole;
  readonly peerId: string;
  readonly displayName: string;
  private channel: RealtimeChannel | null = null;
  private handlers = new Set<MsgHandler>();
  remotePeer: OnlinePeerInfo | null = null;

  constructor(opts: {
    roomCode: string;
    role: OnlineRole;
    peerId: string;
    displayName: string;
  }) {
    this.roomCode = opts.roomCode.toUpperCase();
    this.role = opts.role;
    this.peerId = opts.peerId;
    this.displayName = opts.displayName;
  }

  onMessage(handler: MsgHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private emit(msg: OnlineMsg): void {
    for (const h of this.handlers) h(msg);
  }

  async connect(): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase não configurado.');

    const topic = `abolivion-room-${this.roomCode}`;
    this.channel = supabase.channel(topic, {
      config: { broadcast: { self: false } },
    });

    this.channel.on('broadcast', { event: 'game' }, ({ payload }) => {
      if (!payload || typeof payload !== 'object') return;
      this.emit(payload as OnlineMsg);
    });

    await new Promise<void>((resolve, reject) => {
      this.channel!.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(new Error('Falha ao entrar no canal da sala.'));
        }
      });
    });

    await this.send({
      type: 'hello',
      peer: {
        peerId: this.peerId,
        displayName: this.displayName,
        role: this.role,
      },
    });
  }

  async send(msg: OnlineMsg): Promise<void> {
    if (!this.channel) return;
    await this.channel.send({
      type: 'broadcast',
      event: 'game',
      payload: msg,
    });
  }

  async disconnect(): Promise<void> {
    try {
      await this.send({ type: 'peerLeft', peerId: this.peerId });
    } catch {
      // ignore
    }
    const supabase = getSupabase();
    if (supabase && this.channel) {
      await supabase.removeChannel(this.channel);
    }
    this.channel = null;
  }
}

/** Sessão ativa da run (menu → lobby → GameScene). */
let activeSession: OnlineSession | null = null;

export function setActiveOnlineSession(session: OnlineSession | null): void {
  activeSession = session;
}

export function getActiveOnlineSession(): OnlineSession | null {
  return activeSession;
}
