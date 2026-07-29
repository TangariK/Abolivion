import { AudioService } from '../services/AudioService';
import {
  fetchMuralEntries,
  formatMuralStat,
  formatPlayTime,
  type MuralEntry,
  type MuralSort,
} from '../services/MuralService';

const ACCENT = '#c4a35a';
const TEXT = '#e8f0e8';
const MUTED = '#a8c0a8';

const SORTS: { id: MuralSort; label: string }[] = [
  { id: 'waves', label: 'Maior rodada' },
  { id: 'time', label: 'Maior tempo' },
  { id: 'kills', label: 'Mais abates' },
  { id: 'level', label: 'Maior nível' },
];

/** Painel de recordes — Mural da Tribo. */
export class MuralOverlay {
  private root?: HTMLDivElement;

  open(onClose: () => void): void {
    this.close();
    AudioService.playSfx('sfx_ui_open');

    const root = document.createElement('div');
    root.id = 'abolivion-mural-overlay';
    Object.assign(root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '9999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(5, 12, 8, 0.72)',
      fontFamily: 'Segoe UI, Tahoma, sans-serif',
    } as CSSStyleDeclaration);

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      width: 'min(560px, 94vw)',
      maxHeight: '88vh',
      overflow: 'auto',
      background: 'linear-gradient(160deg, #1a2a1e 0%, #141c16 100%)',
      border: `2px solid ${ACCENT}`,
      borderRadius: '12px',
      padding: '22px 24px 18px',
      color: TEXT,
      boxShadow: '0 18px 48px rgba(0,0,0,0.45)',
    } as CSSStyleDeclaration);

    const title = document.createElement('h2');
    title.textContent = 'Mural da Tribo';
    Object.assign(title.style, {
      margin: '0 0 6px',
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '30px',
      color: ACCENT,
      fontWeight: 'normal',
    });

    const hint = document.createElement('p');
    hint.textContent = 'Os melhores caçadores da aldeia. Filtre pelo recorde que importa.';
    Object.assign(hint.style, { margin: '0 0 14px', fontSize: '14px', color: MUTED });

    const filters = document.createElement('div');
    Object.assign(filters.style, {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginBottom: '14px',
    } as CSSStyleDeclaration);

    const list = document.createElement('div');
    list.textContent = 'Carregando…';
    Object.assign(list.style, { minHeight: '120px', fontSize: '14px', color: MUTED });

    let current: MuralSort = 'waves';

    const renderFilters = () => {
      filters.replaceChildren();
      for (const s of SORTS) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = s.label;
        const active = s.id === current;
        Object.assign(btn.style, {
          padding: '8px 12px',
          borderRadius: '6px',
          border: `1px solid ${active ? ACCENT : '#3a4a3a'}`,
          background: active ? 'rgba(196,163,90,0.22)' : 'transparent',
          color: active ? ACCENT : MUTED,
          cursor: 'pointer',
          fontFamily: 'Georgia, Times New Roman, serif',
          fontSize: '13px',
        } as CSSStyleDeclaration);
        btn.onclick = () => {
          current = s.id;
          AudioService.playSfx('sfx_ui_click');
          renderFilters();
          void load();
        };
        filters.append(btn);
      }
    };

    const renderList = (entries: MuralEntry[]) => {
      list.replaceChildren();
      if (entries.length === 0) {
        list.textContent = 'Ainda não há lendas no mural. Jogue e volte!';
        return;
      }
      entries.forEach((entry, i) => {
        const row = document.createElement('div');
        Object.assign(row.style, {
          display: 'grid',
          gridTemplateColumns: '28px 1fr auto',
          gap: '10px',
          alignItems: 'start',
          padding: '10px 8px',
          borderBottom: '1px solid rgba(168,192,168,0.12)',
        } as CSSStyleDeclaration);

        const rank = document.createElement('div');
        rank.textContent = `${i + 1}`;
        Object.assign(rank.style, { color: ACCENT, fontFamily: 'Georgia, serif', fontSize: '18px' });

        const mid = document.createElement('div');
        const name = document.createElement('div');
        name.textContent = entry.displayName;
        Object.assign(name.style, { fontSize: '16px', color: TEXT, marginBottom: '4px' });
        const stats = document.createElement('div');
        stats.textContent =
          `Rodada ${entry.wavesReached} · Tempo ${formatPlayTime(entry.infiniteMs)} · `
          + `Abates ${entry.kills} · Nv ${entry.bestLevel}`;
        Object.assign(stats.style, { fontSize: '12px', color: MUTED, lineHeight: '1.35' });
        const play = document.createElement('div');
        play.textContent = `Joga há ${formatPlayTime(entry.totalPlayMs)}`;
        Object.assign(play.style, { fontSize: '12px', color: '#8aa08a', marginTop: '3px' });
        mid.append(name, stats, play);

        const highlight = document.createElement('div');
        highlight.textContent = formatMuralStat(current, entry);
        Object.assign(highlight.style, {
          color: ACCENT,
          fontSize: '14px',
          textAlign: 'right',
          whiteSpace: 'nowrap',
        } as CSSStyleDeclaration);

        row.append(rank, mid, highlight);
        list.append(row);
      });
    };

    const load = async () => {
      list.textContent = 'Carregando…';
      try {
        const entries = await fetchMuralEntries(current);
        renderList(entries);
      } catch {
        list.textContent = 'Não foi possível carregar o mural agora.';
      }
    };

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Fechar';
    Object.assign(closeBtn.style, {
      marginTop: '16px',
      width: '100%',
      padding: '12px',
      border: 'none',
      borderRadius: '8px',
      background: ACCENT,
      color: '#0d1a12',
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '18px',
      cursor: 'pointer',
    } as CSSStyleDeclaration);
    closeBtn.onclick = () => {
      AudioService.playSfx('sfx_ui_click');
      this.close();
      onClose();
    };

    root.addEventListener('click', (e) => {
      if (e.target === root) {
        this.close();
        onClose();
      }
    });

    renderFilters();
    panel.append(title, hint, filters, list, closeBtn);
    root.append(panel);
    document.body.append(root);
    this.root = root;
    void load();
  }

  close(): void {
    this.root?.remove();
    this.root = undefined;
  }
}
