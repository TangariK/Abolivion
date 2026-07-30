import type { Profile } from '../data/types';
import { activeNinhada } from '../data/EmblemRuntime';
import { AudioService } from '../services/AudioService';
import { SaveManager } from '../upgrades/MetaUpgrades';

const PANEL_BG = 'linear-gradient(165deg, #2a2218 0%, #1a1410 55%, #12100c 100%)';
const ACCENT = '#c4783a';
const TEXT = '#f0e4d4';
const MUTED = '#b8a090';

/** Loja da Tribo — vitrine vazia até conteúdo futuro (Resina). */
export class ShopOverlay {
  private root?: HTMLDivElement;
  private closeTimer?: number;

  open(onClose: () => void): void {
    this.close();
    const profile = SaveManager.load();
    if (!activeNinhada(profile)) {
      this.openLocked(onClose);
      return;
    }

    const root = document.createElement('div');
    root.id = 'abolivion-shop';
    Object.assign(root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '9999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(8, 6, 4, 0.82)',
      fontFamily: 'Georgia, "Times New Roman", serif',
    } as CSSStyleDeclaration);

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      width: 'min(520px, 92vw)',
      background: PANEL_BG,
      border: `2px solid ${ACCENT}`,
      borderRadius: '12px',
      padding: '28px 32px',
      color: TEXT,
      boxShadow: '0 20px 50px rgba(0,0,0,0.55)',
      textAlign: 'center',
    } as CSSStyleDeclaration);

    const title = document.createElement('h2');
    title.textContent = 'Loja da Tribo';
    Object.assign(title.style, {
      margin: '0 0 8px',
      fontSize: '28px',
      color: ACCENT,
      fontWeight: 'normal',
    });

    const resin = document.createElement('p');
    resin.textContent = `Resina: ${profile.resin ?? 0}`;
    Object.assign(resin.style, { margin: '0 0 20px', color: MUTED, fontSize: '15px' });

    const body = document.createElement('p');
    body.textContent = 'A Resina ainda não encontra mercador…';
    Object.assign(body.style, {
      margin: '24px 0 28px',
      fontSize: '17px',
      lineHeight: '1.5',
      color: TEXT,
    });

    const hint = document.createElement('p');
    hint.textContent = 'Em breve: trocas pela seiva da noite.';
    Object.assign(hint.style, { margin: '0 0 24px', fontSize: '13px', color: MUTED });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Fechar';
    Object.assign(closeBtn.style, {
      padding: '10px 28px',
      background: ACCENT,
      color: '#1a1008',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: '16px',
    });
    closeBtn.onclick = () => {
      AudioService.playSfx('sfx_ui_click');
      this.closeDelayed(onClose);
    };

    panel.append(title, resin, body, hint, closeBtn);
    root.append(panel);
    root.addEventListener('click', (e) => {
      if (e.target === root) this.closeDelayed(onClose);
    });
    document.body.append(root);
    this.root = root;
  }

  private openLocked(onClose: () => void): void {
    const root = document.createElement('div');
    root.id = 'abolivion-shop';
    Object.assign(root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '9999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(8, 6, 4, 0.82)',
      fontFamily: 'Georgia, "Times New Roman", serif',
    } as CSSStyleDeclaration);

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      width: 'min(440px, 90vw)',
      background: PANEL_BG,
      border: `2px solid ${ACCENT}`,
      borderRadius: '12px',
      padding: '28px',
      color: TEXT,
      textAlign: 'center',
    } as CSSStyleDeclaration);

    const title = document.createElement('h2');
    title.textContent = 'Loja da Tribo';
    Object.assign(title.style, { margin: '0 0 16px', color: ACCENT, fontWeight: 'normal' });

    const body = document.createElement('p');
    body.textContent =
      'Somente quem carrega o Emblema da Ninhada (ativo) pode entrar na loja.';
    Object.assign(body.style, { margin: '0 0 24px', lineHeight: '1.45', color: MUTED });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Entendi';
    Object.assign(closeBtn.style, {
      padding: '10px 24px',
      background: ACCENT,
      color: '#1a1008',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: '15px',
    });
    closeBtn.onclick = () => {
      AudioService.playSfx('sfx_ui_click');
      this.closeDelayed(onClose);
    };

    panel.append(title, body, closeBtn);
    root.append(panel);
    document.body.append(root);
    this.root = root;
  }

  private closeDelayed(after: () => void): void {
    this.close();
    window.clearTimeout(this.closeTimer);
    this.closeTimer = window.setTimeout(after, 80);
  }

  close(): void {
    this.root?.remove();
    this.root = undefined;
  }
}

/** Tipagem auxiliar — evita unused Profile import se tree-shake. */
export type ShopProfile = Profile;
