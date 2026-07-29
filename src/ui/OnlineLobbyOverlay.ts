import { AuthService } from '../services/AuthService';
import { AudioService } from '../services/AudioService';
import { OnlineSession, setActiveOnlineSession } from '../services/OnlineSession';
import {
  RoomService,
  type RoomGameMode,
  type RoomListItem,
} from '../services/RoomService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { onlineDisplayName } from '../utils/treeNames';

const ACCENT = '#c4a35a';
const TEXT = '#e8f0e8';
const MUTED = '#a8c0a8';

export type OnlineLobbyResult =
  | { action: 'cancel' }
  | { action: 'startHost'; session: OnlineSession; gameMode: RoomGameMode }
  | { action: 'startGuest'; session: OnlineSession; gameMode: RoomGameMode };

/**
 * Overlay: criar / buscar salas online + espera no lobby (via callbacks).
 */
export class OnlineLobbyOverlay {
  private root?: HTMLDivElement;

  open(
    onDone: (result: OnlineLobbyResult) => void,
    presetCode?: string,
  ): void {
    this.close();
    const root = document.createElement('div');
    root.id = 'abolivion-online-lobby';
    Object.assign(root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '9999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(5, 12, 8, 0.78)',
      fontFamily: 'Segoe UI, Tahoma, sans-serif',
    } as CSSStyleDeclaration);

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      width: 'min(460px, 94vw)',
      maxHeight: '90vh',
      overflowY: 'auto',
      background: 'linear-gradient(160deg, #1a2a1e 0%, #141c16 100%)',
      border: `2px solid ${ACCENT}`,
      borderRadius: '12px',
      padding: '20px 22px 16px',
      color: TEXT,
    } as CSSStyleDeclaration);

    root.append(panel);
    document.body.append(root);
    this.root = root;

    if (!isSupabaseConfigured()) {
      panel.append(this.title('Online'));
      panel.append(this.note('Conta/nuvem não configurada. Defina VITE_SUPABASE_* no .env.'));
      const close = this.btn('Fechar', 'transparent', MUTED, true);
      close.onclick = () => {
        this.close();
        onDone({ action: 'cancel' });
      };
      panel.append(close);
      return;
    }

    this.renderHub(panel, onDone, presetCode);
  }

  close(): void {
    this.root?.remove();
    this.root = undefined;
  }

  private renderHub(
    panel: HTMLElement,
    onDone: (result: OnlineLobbyResult) => void,
    presetCode?: string,
  ): void {
    panel.replaceChildren();
    panel.append(this.title('Modo Online'));
    panel.append(
      this.note(
        'Crie uma sala ou entre com um código. Convidados jogam com nome de árvore.',
      ),
    );

    const createBtn = this.btn('Criar sala', ACCENT, '#0d1a12');
    const browseBtn = this.btn('Buscar salas', '#2a2417', '#f4d77b', true);
    const cancelBtn = this.btn('Voltar', 'transparent', MUTED, true);

    createBtn.onclick = () => this.renderCreate(panel, onDone);
    browseBtn.onclick = () => this.renderBrowse(panel, onDone, presetCode);
    cancelBtn.onclick = () => {
      this.close();
      onDone({ action: 'cancel' });
    };

    const row = document.createElement('div');
    Object.assign(row.style, { display: 'grid', gap: '8px', marginTop: '14px' } as CSSStyleDeclaration);
    row.append(createBtn, browseBtn, cancelBtn);
    panel.append(row);

    if (presetCode) {
      void this.renderBrowse(panel, onDone, presetCode);
    }
  }

  private renderCreate(panel: HTMLElement, onDone: (result: OnlineLobbyResult) => void): void {
    panel.replaceChildren();
    panel.append(this.title('Criar sala'));

    const modeLabel = this.label('Modo de jogo');
    const modeSelect = document.createElement('select');
    Object.assign(modeSelect.style, this.inputStyle());
    modeSelect.innerHTML =
      '<option value="infinite">Infinito</option><option value="waves">Rodadas</option>';

    const pubCheck = document.createElement('label');
    Object.assign(pubCheck.style, {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      marginTop: '10px',
      fontSize: '13px',
      color: TEXT,
    } as CSSStyleDeclaration);
    const pubInput = document.createElement('input');
    pubInput.type = 'checkbox';
    pubInput.checked = true;
    pubCheck.append(pubInput, document.createTextNode('Sala pública (aparece na lista)'));

    const passField = document.createElement('input');
    passField.type = 'password';
    passField.placeholder = 'Senha (obrigatória se privada)';
    Object.assign(passField.style, { ...this.inputStyle(), marginTop: '8px', display: 'none' });
    pubInput.onchange = () => {
      passField.style.display = pubInput.checked ? 'none' : 'block';
    };

    const err = document.createElement('div');
    Object.assign(err.style, { color: '#e8a0a0', fontSize: '13px', marginTop: '8px' } as CSSStyleDeclaration);

    const createBtn = this.btn('Criar e entrar', ACCENT, '#0d1a12');
    const back = this.btn('Voltar', 'transparent', MUTED, true);
    back.onclick = () => this.renderHub(panel, onDone);

    createBtn.onclick = async () => {
      err.textContent = '';
      createBtn.disabled = true;
      try {
        if (!pubInput.checked && passField.value.trim().length < 3) {
          err.textContent = 'Senha de pelo menos 3 caracteres para sala privada.';
          createBtn.disabled = false;
          return;
        }
        const room = await RoomService.create({
          isPublic: pubInput.checked,
          password: pubInput.checked ? undefined : passField.value.trim(),
          gameMode: modeSelect.value as RoomGameMode,
        });
        const peerId = crypto.randomUUID();
        const session = new OnlineSession({
          roomCode: room.code,
          role: 'host',
          peerId,
          displayName: room.displayName,
        });
        await session.connect();
        setActiveOnlineSession(session);
        this.renderWaitingHost(panel, onDone, session, room.gameMode, room.shareUrl, room.isPublic);
      } catch (e) {
        err.textContent = e instanceof Error ? e.message : 'Falha ao criar sala.';
        createBtn.disabled = false;
      }
    };

    panel.append(modeLabel, modeSelect, pubCheck, passField, err, createBtn, back);
  }

  private async renderBrowse(
    panel: HTMLElement,
    onDone: (result: OnlineLobbyResult) => void,
    presetCode?: string,
  ): Promise<void> {
    panel.replaceChildren();
    panel.append(this.title('Buscar salas'));

    const codeInput = document.createElement('input');
    codeInput.placeholder = 'Código da sala';
    codeInput.value = presetCode?.toUpperCase() ?? '';
    Object.assign(codeInput.style, this.inputStyle());

    const passInput = document.createElement('input');
    passInput.type = 'password';
    passInput.placeholder = 'Senha (se privada)';
    Object.assign(passInput.style, { ...this.inputStyle(), marginTop: '8px' });

    const err = document.createElement('div');
    Object.assign(err.style, { color: '#e8a0a0', fontSize: '13px', marginTop: '8px' } as CSSStyleDeclaration);

    const joinBtn = this.btn('Entrar com código', ACCENT, '#0d1a12');
    joinBtn.onclick = async () => {
      err.textContent = '';
      joinBtn.disabled = true;
      try {
        await this.joinRoom(codeInput.value, passInput.value, onDone, panel, err);
      } finally {
        joinBtn.disabled = false;
      }
    };

    const listWrap = document.createElement('div');
    Object.assign(listWrap.style, {
      display: 'grid',
      gap: '6px',
      marginTop: '14px',
      maxHeight: '240px',
      overflowY: 'auto',
    } as CSSStyleDeclaration);
    listWrap.append(this.note('Carregando…'));

    const back = this.btn('Voltar', 'transparent', MUTED, true);
    back.onclick = () => this.renderHub(panel, onDone);

    panel.append(codeInput, passInput, joinBtn, err, listWrap, back);

    try {
      const rooms = await RoomService.listWaiting();
      listWrap.replaceChildren();
      if (rooms.length === 0) {
        listWrap.append(this.note('Nenhuma sala aberta no momento.'));
      } else {
        for (const room of rooms) {
          listWrap.append(this.roomRow(room, passInput, onDone, panel, err));
        }
      }
    } catch (e) {
      listWrap.replaceChildren();
      listWrap.append(
        this.note(e instanceof Error ? e.message : 'Falha ao listar salas.'),
      );
    }

    if (presetCode) {
      void this.joinRoom(presetCode, '', onDone, panel, err);
    }
  }

  private roomRow(
    room: RoomListItem,
    passInput: HTMLInputElement,
    onDone: (result: OnlineLobbyResult) => void,
    panel: HTMLElement,
    err: HTMLElement,
  ): HTMLElement {
    const row = document.createElement('button');
    row.type = 'button';
    Object.assign(row.style, {
      textAlign: 'left',
      padding: '10px 12px',
      borderRadius: '8px',
      border: `1px solid ${ACCENT}`,
      background: '#1a221c',
      color: TEXT,
      cursor: 'pointer',
      fontSize: '13px',
    } as CSSStyleDeclaration);
    const lock = room.has_password || !room.is_public ? '🔒 ' : '';
    const mode = room.game_mode === 'waves' ? 'Rodadas' : 'Infinito';
    row.textContent = `${lock}${room.code} — ${room.host_display_name} · ${mode}`;
    row.onclick = () => {
      void this.joinRoom(room.code, passInput.value, onDone, panel, err);
    };
    return row;
  }

  private async joinRoom(
    code: string,
    password: string,
    onDone: (result: OnlineLobbyResult) => void,
    panel: HTMLElement,
    err: HTMLElement,
  ): Promise<void> {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      err.textContent = 'Código inválido (6 caracteres).';
      return;
    }
    const room = await RoomService.getWaiting(trimmed);
    if (!room) {
      err.textContent = 'Sala não encontrada ou já iniciada.';
      return;
    }
    if (room.has_password || !room.is_public) {
      const ok = await RoomService.checkPassword(trimmed, password);
      if (!ok) {
        err.textContent = 'Senha incorreta.';
        return;
      }
    }
    const displayName = onlineDisplayName(
      AuthService.isLoggedIn() ? AuthService.username() : null,
    );
    const peerId = crypto.randomUUID();
    const session = new OnlineSession({
      roomCode: trimmed,
      role: 'guest',
      peerId,
      displayName,
    });
    await session.connect();
    setActiveOnlineSession(session);
    this.renderWaitingGuest(panel, onDone, session, room.game_mode);
  }

  private renderWaitingHost(
    panel: HTMLElement,
    onDone: (result: OnlineLobbyResult) => void,
    session: OnlineSession,
    gameMode: RoomGameMode,
    shareUrl: string,
    isPublic: boolean,
  ): void {
    panel.replaceChildren();
    panel.append(this.title(`Sala ${session.roomCode}`));
    panel.append(this.note('Aguardando jogador 2… Você pode copiar o link.'));

    const link = document.createElement('input');
    link.readOnly = true;
    link.value = shareUrl;
    Object.assign(link.style, this.inputStyle());

    const copy = this.btn('Copiar link', '#2a2417', '#f4d77b', true);
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copy.textContent = 'Copiado!';
      } catch {
        link.select();
      }
    };

    const status = document.createElement('div');
    status.textContent = '1 / 2 na sala';
    Object.assign(status.style, {
      marginTop: '12px',
      color: ACCENT,
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '16px',
    } as CSSStyleDeclaration);

    const leave = this.btn('Cancelar sala', '#3a2222', '#e8c0b8', true);
    leave.onclick = async () => {
      await RoomService.close(session.roomCode);
      await session.disconnect();
      setActiveOnlineSession(null);
      this.close();
      onDone({ action: 'cancel' });
    };

    panel.append(link, copy, status, leave);

    const unsub = session.onMessage(async (msg) => {
      if (msg.type === 'hello' && msg.peer.role === 'guest') {
        session.remotePeer = msg.peer;
        status.textContent = `2 / 2 — ${msg.peer.displayName} entrou!`;
        if (isPublic) {
          // conquista host: sala pública preenchida (desbloqueada no GameScene também)
        }
        await RoomService.setStatus(session.roomCode, 'playing');
        // countdown + start handled when entering GameScene lobby phase
        unsub();
        this.close();
        onDone({ action: 'startHost', session, gameMode });
      }
    });
  }

  private renderWaitingGuest(
    panel: HTMLElement,
    onDone: (result: OnlineLobbyResult) => void,
    session: OnlineSession,
    gameMode: RoomGameMode,
  ): void {
    panel.replaceChildren();
    panel.append(this.title(`Entrando em ${session.roomCode}`));
    panel.append(this.note('Conectado. Aguardando o anfitrião iniciar…'));

    const leave = this.btn('Sair', 'transparent', MUTED, true);
    leave.onclick = async () => {
      await session.disconnect();
      setActiveOnlineSession(null);
      this.close();
      onDone({ action: 'cancel' });
    };
    panel.append(leave);

    // Guest also starts GameScene when host acknowledges — host starts immediately on hello.
    // Guest waits for host's game scene; we start guest side when we get countdown/start from host.
    // For simplicity: start guest GameScene now too (lobby phase until start msg).
    const unsub = session.onMessage((msg) => {
      if (msg.type === 'hello' && msg.peer.role === 'host') {
        session.remotePeer = msg.peer;
      }
    });
    // Host closes overlay and starts; guest should start its scene when hello from host is seen
    // or immediately after connect (lobby inside GameScene).
    window.setTimeout(() => {
      unsub();
      this.close();
      onDone({ action: 'startGuest', session, gameMode });
    }, 400);
  }

  private title(t: string): HTMLElement {
    const el = document.createElement('div');
    el.textContent = t;
    Object.assign(el.style, {
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '22px',
      color: '#f4d77b',
      marginBottom: '8px',
    } as CSSStyleDeclaration);
    return el;
  }

  private note(t: string): HTMLElement {
    const el = document.createElement('p');
    el.textContent = t;
    Object.assign(el.style, {
      margin: '0 0 8px',
      fontSize: '13px',
      lineHeight: '1.5',
      color: MUTED,
    } as CSSStyleDeclaration);
    return el;
  }

  private label(t: string): HTMLElement {
    const el = document.createElement('div');
    el.textContent = t;
    Object.assign(el.style, { fontSize: '12px', color: MUTED, marginBottom: '4px' } as CSSStyleDeclaration);
    return el;
  }

  private inputStyle(): Partial<CSSStyleDeclaration> {
    return {
      width: '100%',
      boxSizing: 'border-box',
      padding: '10px 12px',
      borderRadius: '6px',
      border: `1px solid ${ACCENT}`,
      background: '#0f1612',
      color: TEXT,
      fontSize: '14px',
    };
  }

  private btn(
    label: string,
    bg: string,
    color: string,
    outlined = false,
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    Object.assign(btn.style, {
      width: '100%',
      marginTop: '8px',
      padding: '10px 12px',
      borderRadius: '6px',
      border: outlined ? `1px solid ${ACCENT}` : 'none',
      background: bg,
      color,
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '15px',
      cursor: 'pointer',
    } as CSSStyleDeclaration);
    const isBack = /^(Cancelar|Voltar|Sair)\b/i.test(label);
    btn.addEventListener('click', () => {
      AudioService.playSfx(isBack ? 'sfx_ui_back' : 'sfx_ui_click');
    });
    return btn;
  }
}

