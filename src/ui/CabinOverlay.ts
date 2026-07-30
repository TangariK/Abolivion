import { EMBLEMS } from '../data/Emblems';
import {
  activeSalto,
  isEmblemActive,
  ownsEmblem,
  setEmblemEnabled,
} from '../data/EmblemRuntime';
import type { EmblemId, Profile } from '../data/types';
import { AdminService } from '../services/AdminService';
import { AudioService } from '../services/AudioService';
import { META_UPGRADE_DEFS, metaCost, tryBuyMeta } from '../upgrades/MetaShop';
import { SaveManager } from '../upgrades/MetaUpgrades';

const PANEL_BG = 'linear-gradient(168deg, #1c2a22 0%, #121a16 50%, #0e1410 100%)';
const ACCENT = '#c4a35a';
const TEXT = '#e8f0e8';
const MUTED = '#a8c0a8';

type CabinTab = 'permanent' | 'emblems' | 'arsenal' | 'ritos';

/** Cabana do Pajé — permanentes, emblemas e abas bloqueadas. */
export class CabinOverlay {
  private root?: HTMLDivElement;
  private panel?: HTMLDivElement;
  private closeTimer?: number;
  private tab: CabinTab = 'permanent';
  private onCloseCb?: () => void;
  private selectedEmblem?: EmblemId;

  open(onClose: () => void): void {
    this.close();
    this.onCloseCb = onClose;
    this.tab = 'permanent';
    this.selectedEmblem = undefined;

    const root = document.createElement('div');
    root.id = 'abolivion-cabin';
    Object.assign(root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '9999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(4, 10, 8, 0.8)',
      fontFamily: 'Segoe UI, Tahoma, sans-serif',
    } as CSSStyleDeclaration);

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      width: 'min(720px, 94vw)',
      maxHeight: '88vh',
      overflowY: 'auto',
      background: PANEL_BG,
      border: `2px solid ${ACCENT}`,
      borderRadius: '12px',
      padding: '20px 22px',
      color: TEXT,
      boxShadow: '0 18px 48px rgba(0,0,0,0.5)',
    } as CSSStyleDeclaration);

    this.panel = panel;
    this.root = root;
    root.append(panel);
    root.addEventListener('click', (e) => {
      if (e.target === root) this.closeDelayed();
    });
    document.body.append(root);
    this.render();
  }

  private render(): void {
    if (!this.panel) return;
    this.panel.replaceChildren();
    const profile = SaveManager.load();

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '14px',
    });
    const title = document.createElement('h2');
    title.textContent = 'Cabana do Pajé';
    Object.assign(title.style, {
      margin: '0',
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '26px',
      color: ACCENT,
      fontWeight: 'normal',
    });
    const coins = document.createElement('span');
    coins.textContent = `${profile.currency} moedas`;
    Object.assign(coins.style, { color: MUTED, fontSize: '14px' });
    header.append(title, coins);

    const tabs = document.createElement('div');
    Object.assign(tabs.style, {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap',
      marginBottom: '16px',
    });
    const arsenalUnlocked = ownsEmblem(profile, 'emblem_acrobat') && activeSalto(profile);
    this.tabBtn(tabs, 'Permanente', 'permanent');
    this.tabBtn(tabs, 'Emblemas', 'emblems');
    this.tabBtn(tabs, arsenalUnlocked ? 'Arsenal da Aldeia' : 'Arsenal 🔒', 'arsenal');
    this.tabBtn(tabs, 'Ritos do Pajé 🔒', 'ritos');

    const body = document.createElement('div');
    if (this.tab === 'permanent') this.renderPermanent(body, profile);
    else if (this.tab === 'emblems') this.renderEmblems(body, profile);
    else if (this.tab === 'arsenal') this.renderLocked(body, arsenalUnlocked
      ? 'Arsenal da Aldeia — conteúdo em breve.'
      : 'Requer Emblema do Salto ativo para abrir esta aba.');
    else this.renderLocked(body, 'Ritos do Pajé — ainda selados nesta versão.');

    const closeRow = document.createElement('div');
    Object.assign(closeRow.style, { marginTop: '18px', textAlign: 'right' });
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Fechar';
    Object.assign(closeBtn.style, this.btnStyle());
    closeBtn.onclick = () => {
      AudioService.playSfx('sfx_ui_click');
      this.closeDelayed();
    };
    closeRow.append(closeBtn);

    this.panel.append(header, tabs, body, closeRow);
  }

  private tabBtn(parent: HTMLElement, label: string, id: CabinTab): void {
    const btn = document.createElement('button');
    btn.textContent = label;
    const active = this.tab === id;
    Object.assign(btn.style, {
      padding: '8px 12px',
      borderRadius: '6px',
      border: `1px solid ${active ? ACCENT : '#3a4a3e'}`,
      background: active ? 'rgba(196,163,90,0.2)' : 'transparent',
      color: active ? ACCENT : MUTED,
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: '13px',
    });
    btn.onclick = () => {
      AudioService.playSfx('sfx_ui_click');
      this.tab = id;
      this.render();
    };
    parent.append(btn);
  }

  private renderPermanent(body: HTMLElement, profile: Profile): void {
    const grid = document.createElement('div');
    Object.assign(grid.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: '10px',
    });
    for (const def of META_UPGRADE_DEFS) {
      const level = profile.metaLevels[def.id];
      const cost = metaCost(level);
      const maxed = level >= def.maxLevel;
      const card = document.createElement('button');
      Object.assign(card.style, {
        textAlign: 'left',
        padding: '12px',
        background: 'rgba(20,32,24,0.9)',
        border: `1px solid #3a4a3e`,
        borderRadius: '8px',
        color: TEXT,
        cursor: maxed ? 'default' : 'pointer',
        fontFamily: 'inherit',
      });
      card.innerHTML = `<div style="color:${ACCENT};font-size:14px;margin-bottom:4px">${def.name}</div>
        <div style="font-size:11px;color:${MUTED};min-height:32px">${def.description}</div>
        <div style="font-size:12px;margin-top:8px">Nível ${level}/${def.maxLevel}</div>
        <div style="font-size:12px;color:${maxed ? '#666' : TEXT}">${maxed ? 'MÁXIMO' : `${cost} moedas`}</div>`;
      if (!maxed) {
        card.onclick = () => {
          const result = tryBuyMeta(def.id);
          if (result.ok) AudioService.playSfx('sfx_meta_buy');
          else AudioService.playSfx('sfx_ui_click');
          this.render();
        };
      }
      grid.append(card);
    }
    body.append(grid);
  }

  private renderEmblems(body: HTMLElement, profile: Profile): void {
    const admin = AdminService.isAdminCandidate();
    const owned = EMBLEMS.filter((e) => ownsEmblem(profile, e.id));
    const locked = admin
      ? EMBLEMS.filter((e) => !ownsEmblem(profile, e.id))
      : [];

    if (owned.length === 0 && locked.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'Nenhum emblema obtido ainda. Derrote os chefões das rodadas.';
      Object.assign(empty.style, { color: MUTED });
      body.append(empty);
      return;
    }

    const list = document.createElement('div');
    Object.assign(list.style, { display: 'flex', flexDirection: 'column', gap: '8px' });

    for (const e of owned) {
      const active = isEmblemActive(profile, e.id);
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        padding: '10px 12px',
        background: this.selectedEmblem === e.id ? 'rgba(196,163,90,0.12)' : 'rgba(16,24,18,0.85)',
        border: `1px solid ${this.selectedEmblem === e.id ? ACCENT : '#3a4a3e'}`,
        borderRadius: '8px',
        cursor: 'pointer',
      });
      row.onclick = () => {
        this.selectedEmblem = e.id;
        this.render();
      };

      const info = document.createElement('div');
      info.style.flex = '1';
      info.innerHTML = `<div style="color:${ACCENT};font-size:15px">${e.name}</div>
        <div style="font-size:12px;color:${MUTED};margin-top:4px">${e.effectText}</div>`;

      const toggle = document.createElement('button');
      toggle.textContent = active ? 'Ativo' : 'Inativo';
      Object.assign(toggle.style, {
        ...this.btnStyle(),
        background: active ? '#3d6a40' : '#4a3a2a',
        color: TEXT,
        fontSize: '12px',
        padding: '6px 10px',
      });
      toggle.onclick = (ev) => {
        ev.stopPropagation();
        AudioService.playSfx('sfx_ui_click');
        setEmblemEnabled(e.id, !active);
        this.render();
      };

      row.append(info, toggle);
      list.append(row);
    }

    if (locked.length > 0) {
      const sep = document.createElement('p');
      sep.textContent = 'Admin — liberar emblemas';
      Object.assign(sep.style, {
        color: ACCENT,
        fontSize: '13px',
        margin: '12px 0 4px',
        fontFamily: 'Georgia, Times New Roman, serif',
      });
      list.append(sep);

      for (const e of locked) {
        const row = document.createElement('div');
        Object.assign(row.style, {
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          padding: '10px 12px',
          background: 'rgba(16,24,18,0.6)',
          border: '1px dashed #5a4a3a',
          borderRadius: '8px',
        });
        const info = document.createElement('div');
        info.style.flex = '1';
        info.innerHTML = `<div style="color:${MUTED};font-size:15px">${e.name}</div>
          <div style="font-size:12px;color:#6a7a6a;margin-top:4px">${e.howObtained}</div>`;

        const unlock = document.createElement('button');
        unlock.textContent = 'Liberar';
        Object.assign(unlock.style, {
          ...this.btnStyle(),
          background: '#6a4030',
          color: TEXT,
          fontSize: '12px',
          padding: '6px 12px',
        });
        unlock.onclick = () => {
          AudioService.playSfx('sfx_ui_click');
          const p = SaveManager.load();
          if (!p.almanac.emblems.includes(e.id)) {
            p.almanac.emblems.push(e.id);
            SaveManager.save(p);
          }
          this.selectedEmblem = e.id;
          this.render();
        };
        row.append(info, unlock);
        list.append(row);
      }
    }

    body.append(list);

    if (this.selectedEmblem) {
      const def = EMBLEMS.find((x) => x.id === this.selectedEmblem);
      if (def) {
        const detail = document.createElement('div');
        Object.assign(detail.style, {
          marginTop: '14px',
          padding: '14px',
          border: `1px solid ${ACCENT}`,
          borderRadius: '8px',
          background: 'rgba(10,16,12,0.7)',
        });
        detail.innerHTML = `<div style="font-family:Georgia,serif;color:${ACCENT};font-size:18px;margin-bottom:8px">${def.name}</div>
          <div style="font-size:13px;color:${MUTED};margin-bottom:8px">${def.howObtained}</div>
          <div style="font-size:13px;line-height:1.45;margin-bottom:8px">${def.lore}</div>
          <div style="font-size:13px;color:${ACCENT}">Efeito: ${def.effectText}</div>`;
        body.append(detail);
      }
    }
  }

  private renderLocked(body: HTMLElement, msg: string): void {
    const p = document.createElement('p');
    p.textContent = msg;
    Object.assign(p.style, { color: MUTED, fontSize: '15px', lineHeight: '1.5', margin: '24px 8px' });
    body.append(p);
  }

  private btnStyle(): Record<string, string> {
    return {
      padding: '8px 18px',
      background: ACCENT,
      color: '#0d1a12',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: '14px',
    };
  }

  private closeDelayed(): void {
    const cb = this.onCloseCb;
    this.close();
    window.clearTimeout(this.closeTimer);
    this.closeTimer = window.setTimeout(() => cb?.(), 80);
  }

  close(): void {
    this.root?.remove();
    this.root = undefined;
    this.panel = undefined;
  }
}
