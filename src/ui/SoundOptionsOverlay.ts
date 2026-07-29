import { AudioService } from '../services/AudioService';
import { SaveManager } from '../upgrades/MetaUpgrades';

const ACCENT = '#c4a35a';
const TEXT = '#e8f0e8';
const MUTED = '#a8c0a8';

/** Overlay: volume e liga/desliga música e efeitos. */
export class SoundOptionsOverlay {
  private root?: HTMLDivElement;

  open(onClose: () => void): void {
    this.close();
    const prefs = AudioService.readPrefs();

    const root = document.createElement('div');
    root.id = 'abolivion-sound-overlay';
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
      width: 'min(420px, 94vw)',
      background: 'linear-gradient(160deg, #1a2a1e 0%, #141c16 100%)',
      border: `2px solid ${ACCENT}`,
      borderRadius: '12px',
      padding: '22px 24px 18px',
      color: TEXT,
      boxShadow: '0 18px 48px rgba(0,0,0,0.45)',
    } as CSSStyleDeclaration);

    const title = document.createElement('h2');
    title.textContent = 'Som';
    Object.assign(title.style, {
      margin: '0 0 8px',
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '28px',
      color: ACCENT,
      fontWeight: 'normal',
    });

    const hint = document.createElement('p');
    hint.textContent = 'Música e efeitos. Sem arquivos de áudio, o jogo fica mudo.';
    Object.assign(hint.style, { margin: '0 0 18px', fontSize: '14px', color: MUTED });

    const musicToggle = this.checkbox('Música ligada', prefs.musicEnabled, (on) => {
      AudioService.writePrefs({ musicEnabled: on });
      AudioService.playSfx('sfx_ui_click');
    });
    const sfxToggle = this.checkbox('Efeitos sonoros ligados', prefs.sfxEnabled, (on) => {
      AudioService.writePrefs({ sfxEnabled: on });
      if (on) AudioService.playSfx('sfx_ui_click');
    });

    const musicVol = this.slider('Volume da música', prefs.musicVolume, (v) => {
      AudioService.writePrefs({ musicVolume: v });
    });
    const sfxVol = this.slider('Volume dos efeitos', prefs.sfxVolume, (v) => {
      AudioService.writePrefs({ sfxVolume: v });
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Fechar';
    Object.assign(closeBtn.style, {
      marginTop: '18px',
      width: '100%',
      padding: '12px',
      border: 'none',
      borderRadius: '8px',
      background: ACCENT,
      color: '#0d1a12',
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '18px',
      cursor: 'pointer',
    });
    closeBtn.onclick = () => {
      AudioService.playSfx('sfx_ui_click');
      // garante prefs salvos no profile (já via writePrefs)
      void SaveManager.load();
      this.close();
      onClose();
    };

    panel.append(title, hint, musicToggle, musicVol, sfxToggle, sfxVol, closeBtn);
    root.append(panel);
    root.addEventListener('click', (ev) => {
      if (ev.target === root) {
        this.close();
        onClose();
      }
    });
    document.body.append(root);
    this.root = root;
  }

  close(): void {
    this.root?.remove();
    this.root = undefined;
  }

  private checkbox(label: string, initial: boolean, onChange: (v: boolean) => void): HTMLLabelElement {
    const wrap = document.createElement('label');
    Object.assign(wrap.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '12px',
      cursor: 'pointer',
      fontSize: '16px',
    });
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = initial;
    input.onchange = () => onChange(input.checked);
    wrap.append(input, document.createTextNode(label));
    return wrap;
  }

  private slider(label: string, initial: number, onChange: (v: number) => void): HTMLDivElement {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, { marginBottom: '14px' });
    const lab = document.createElement('div');
    lab.textContent = label;
    Object.assign(lab.style, { fontSize: '14px', color: MUTED, marginBottom: '6px' });
    const row = document.createElement('div');
    Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '10px' });
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.value = String(Math.round(initial * 100));
    Object.assign(input.style, { flex: '1' });
    const val = document.createElement('span');
    val.textContent = `${input.value}%`;
    Object.assign(val.style, { width: '42px', fontSize: '14px', color: TEXT });
    input.oninput = () => {
      const v = Number(input.value) / 100;
      val.textContent = `${input.value}%`;
      onChange(v);
    };
    row.append(input, val);
    wrap.append(lab, row);
    return wrap;
  }
}
