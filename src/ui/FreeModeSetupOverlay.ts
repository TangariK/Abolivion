import { BOSS_DEFS, ENEMY_DEFS } from '../data/EnemyCatalog';
import type {
  AmuletId,
  BossId,
  EnemyType,
  FreeModeConfig,
  MetaUpgradeId,
  Profile,
  RunUpgradeId,
} from '../data/types';
import { AdminService } from '../services/AdminService';
import { AMULETS, moonLabel } from '../upgrades/Amulets';
import { META_UPGRADE_DEFS } from '../upgrades/MetaShop';
import { RUN_UPGRADES } from '../upgrades/RunUpgrades';

const PANEL_BG = 'linear-gradient(160deg, #1a2a1e 0%, #141c16 100%)';
const ACCENT = '#c4a35a';
const TEXT = '#e8f0e8';
const MUTED = '#a8c0a8';

/**
 * Tela de configuração do Modo Livre (overlay DOM — muitos controles).
 * Caps vêm dos recordes do perfil; Dev Vision remove caps e destrava tudo.
 */
export class FreeModeSetupOverlay {
  private root?: HTMLDivElement;

  open(profile: Profile, onStart: (config: FreeModeConfig) => void, onCancel: () => void): void {
    this.close();
    const dev = AdminService.hasDevVision();
    const best = profile.bestScores ?? { infiniteMs: 0, wavesReached: 0, kills: 0, bestLevel: 1 };

    const maxWave = dev ? 999 : Math.max(1, best.wavesReached);
    const maxTimeSec = dev ? 999 * 60 : Math.floor((best.infiniteMs ?? 0) / 1000);
    const maxLevel = dev ? 999 : Math.max(1, best.bestLevel ?? 1);
    const maxBuffCount = dev ? 99 : 30;
    const maxEnemyCount = dev ? 500 : 100;

    const discoveredUpgrades = dev
      ? RUN_UPGRADES.map((u) => u.id)
      : RUN_UPGRADES.map((u) => u.id).filter((id) => profile.almanac.upgrades.includes(id));
    const discoveredAmulets = dev
      ? AMULETS.map((a) => a.id)
      : AMULETS.map((a) => a.id).filter((id) => profile.almanac.amulets.includes(id));
    const defeatedBosses = dev
      ? (Object.keys(BOSS_DEFS) as BossId[])
      : (Object.keys(BOSS_DEFS) as BossId[]).filter((id) => profile.almanac.bosses.includes(id));

    const root = document.createElement('div');
    root.id = 'abolivion-free-setup';
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
      width: 'min(720px, 94vw)',
      maxHeight: '90vh',
      overflowY: 'auto',
      background: PANEL_BG,
      border: `2px solid ${ACCENT}`,
      borderRadius: '10px',
      padding: '20px 24px',
      color: TEXT,
      boxShadow: '0 18px 48px rgba(0,0,0,0.5)',
    } as CSSStyleDeclaration);

    panel.append(
      this.title(`Modo Livre${dev ? ' — Visão de Dev' : ''}`),
      this.note(
        'Monte o cenário que quiser com o que você já desbloqueou. '
        + 'Aqui nada é registrado: sem moedas, sem Marã e sem conquistas (exceto as do próprio Livre).',
      ),
    );

    // ————— Base —————
    const baseSection = this.section('Base da partida');
    const baseWrap = document.createElement('div');
    baseWrap.style.display = 'grid';
    baseWrap.style.gap = '8px';

    const waveRadio = this.radio('free-base', 'Rodada específica', true);
    const waveInput = this.number(1, maxWave, Math.min(1, maxWave) || 1);
    waveInput.style.width = '90px';
    const waveRow = this.inline(waveRadio.wrap, this.smallLabel(`Rodada (1–${maxWave}):`), waveInput);

    const infRadio = this.radio('free-base', 'Infinito a partir de um tempo', false);
    const timeInput = this.number(0, Math.max(0, maxTimeSec), 0);
    timeInput.style.width = '90px';
    const infRow = this.inline(
      infRadio.wrap,
      this.smallLabel(`Segundos já decorridos (0–${maxTimeSec}):`),
      timeInput,
    );

    const customRadio = this.radio('free-base', 'Personalizado (escolher inimigos e chefões)', false);

    baseWrap.append(waveRow, infRow, customRadio.wrap);
    baseSection.append(baseWrap);
    panel.append(baseSection);

    // ————— Personalizado —————
    const customSection = this.section('Cenário personalizado');
    const customGrid = document.createElement('div');
    Object.assign(customGrid.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
      gap: '8px',
    } as CSSStyleDeclaration);

    const enemyInputs = new Map<EnemyType, HTMLInputElement>();
    for (const def of Object.values(ENEMY_DEFS)) {
      const input = this.number(0, maxEnemyCount, 0);
      input.style.width = '70px';
      enemyInputs.set(def.type, input);
      customGrid.append(this.inline(this.smallLabel(def.name), input));
    }

    const bossChecks = new Map<BossId, HTMLInputElement>();
    const bossWrap = document.createElement('div');
    bossWrap.style.display = 'grid';
    bossWrap.style.gap = '6px';
    bossWrap.style.marginTop = '10px';
    const allBossIds = Object.keys(BOSS_DEFS) as BossId[];
    for (const id of allBossIds) {
      const allowed = defeatedBosses.includes(id);
      const check = this.checkbox(
        `${BOSS_DEFS[id].name}${allowed ? '' : ' (derrote-o primeiro)'}`,
        false,
        !allowed,
      );
      bossChecks.set(id, check.input);
      bossWrap.append(check.wrap);
    }
    customSection.append(customGrid, bossWrap);
    panel.append(customSection);

    const syncCustomVisibility = () => {
      customSection.style.display = customRadio.input.checked ? 'block' : 'none';
    };
    for (const r of [waveRadio.input, infRadio.input, customRadio.input]) {
      r.addEventListener('change', syncCustomVisibility);
    }
    syncCustomVisibility();

    // ————— Nível —————
    const levelSection = this.section('Nível inicial');
    const levelInput = this.number(1, maxLevel, 1);
    levelInput.style.width = '90px';
    levelSection.append(this.inline(this.smallLabel(`Nível (1–${maxLevel}):`), levelInput));
    panel.append(levelSection);

    // ————— Buffs de run —————
    const buffSection = this.section('Buffs de run (já descobertos)');
    if (discoveredUpgrades.length === 0) {
      buffSection.append(this.note('Você ainda não descobriu nenhum buff no Marã.'));
    }
    const buffGrid = document.createElement('div');
    Object.assign(buffGrid.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
      gap: '8px',
    } as CSSStyleDeclaration);
    const buffInputs = new Map<RunUpgradeId, HTMLInputElement>();
    for (const upgrade of RUN_UPGRADES) {
      if (!discoveredUpgrades.includes(upgrade.id)) continue;
      const input = this.number(0, maxBuffCount, 0);
      input.style.width = '70px';
      buffInputs.set(upgrade.id, input);
      buffGrid.append(this.inline(this.smallLabel(upgrade.name), input));
    }
    buffSection.append(buffGrid);
    panel.append(buffSection);

    // ————— Amuletos —————
    const amuletSection = this.section('Amuletos (já liberados, máx. 9)');
    if (discoveredAmulets.length === 0) {
      amuletSection.append(this.note('Você ainda não despertou nenhum amuleto.'));
    }
    const amuletGrid = document.createElement('div');
    Object.assign(amuletGrid.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: '6px',
    } as CSSStyleDeclaration);
    const amuletChecks = new Map<AmuletId, HTMLInputElement>();
    for (const amulet of AMULETS) {
      if (!discoveredAmulets.includes(amulet.id)) continue;
      const check = this.checkbox(`${amulet.name} ${moonLabel(amulet.rarity)}`, false, false);
      amuletChecks.set(amulet.id, check.input);
      amuletGrid.append(check.wrap);
    }
    amuletSection.append(amuletGrid);
    panel.append(amuletSection);

    // ————— Meta permanentes —————
    const metaSection = this.section('Melhorias permanentes');
    const useMetaCheck = this.checkbox('Usar melhorias permanentes', true, false);
    metaSection.append(useMetaCheck.wrap);
    const metaGrid = document.createElement('div');
    Object.assign(metaGrid.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
      gap: '8px',
      marginTop: '8px',
    } as CSSStyleDeclaration);
    const metaInputs = new Map<MetaUpgradeId, HTMLInputElement>();
    for (const def of META_UPGRADE_DEFS) {
      const owned = profile.metaLevels[def.id];
      const cap = dev ? def.maxLevel : owned;
      const input = this.number(0, cap, cap);
      input.style.width = '70px';
      metaInputs.set(def.id, input);
      metaGrid.append(this.inline(this.smallLabel(`${def.name} (0–${cap})`), input));
    }
    metaSection.append(metaGrid);
    useMetaCheck.input.addEventListener('change', () => {
      metaGrid.style.opacity = useMetaCheck.input.checked ? '1' : '0.35';
      for (const input of metaInputs.values()) input.disabled = !useMetaCheck.input.checked;
    });
    panel.append(metaSection);

    // ————— Ações —————
    const errorMsg = document.createElement('p');
    Object.assign(errorMsg.style, {
      color: '#e08a7a',
      fontSize: '13px',
      margin: '10px 0 0',
      minHeight: '18px',
    } as CSSStyleDeclaration);

    const actions = document.createElement('div');
    Object.assign(actions.style, {
      display: 'flex',
      gap: '10px',
      marginTop: '14px',
    } as CSSStyleDeclaration);

    const startBtn = this.button('INICIAR', ACCENT, '#0d1a12');
    startBtn.onclick = () => {
      const config = this.buildConfig({
        dev,
        maxWave,
        maxTimeSec,
        maxLevel,
        baseKind: customRadio.input.checked ? 'custom' : infRadio.input.checked ? 'infinite' : 'wave',
        waveInput,
        timeInput,
        levelInput,
        buffInputs,
        amuletChecks,
        useMeta: useMetaCheck.input.checked,
        metaInputs,
        enemyInputs,
        bossChecks,
        defeatedBosses,
      });
      if (typeof config === 'string') {
        errorMsg.textContent = config;
        return;
      }
      const start = onStart;
      this.closeDelayed(() => start(config));
    };

    const cancelBtn = this.button('Cancelar', 'transparent', MUTED, true);
    cancelBtn.onclick = () => {
      const cancel = onCancel;
      this.closeDelayed(() => cancel());
    };

    actions.append(startBtn, cancelBtn);
    panel.append(errorMsg, actions);
    root.append(panel);
    document.body.append(root);
    this.root = root;
  }

  close(): void {
    this.root?.remove();
    this.root = undefined;
  }

  private closeDelayed(after: () => void): void {
    const root = this.root;
    this.root = undefined;
    window.setTimeout(() => {
      root?.remove();
      after();
    }, 80);
  }

  private buildConfig(args: {
    dev: boolean;
    maxWave: number;
    maxTimeSec: number;
    maxLevel: number;
    baseKind: FreeModeConfig['baseKind'];
    waveInput: HTMLInputElement;
    timeInput: HTMLInputElement;
    levelInput: HTMLInputElement;
    buffInputs: Map<RunUpgradeId, HTMLInputElement>;
    amuletChecks: Map<AmuletId, HTMLInputElement>;
    useMeta: boolean;
    metaInputs: Map<MetaUpgradeId, HTMLInputElement>;
    enemyInputs: Map<EnemyType, HTMLInputElement>;
    bossChecks: Map<BossId, HTMLInputElement>;
    defeatedBosses: BossId[];
  }): FreeModeConfig | string {
    const clampInt = (input: HTMLInputElement, min: number, max: number) => {
      const value = parseInt(input.value, 10);
      return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
    };

    const amulets: AmuletId[] = [];
    for (const [id, check] of args.amuletChecks) {
      if (check.checked) amulets.push(id);
    }
    if (amulets.length > 9) return 'Escolha no máximo 9 amuletos.';

    const buffCounts: Partial<Record<RunUpgradeId, number>> = {};
    for (const [id, input] of args.buffInputs) {
      const count = clampInt(input, 0, 99);
      if (count > 0) buffCounts[id] = count;
    }

    const metaLevels: Record<MetaUpgradeId, number> = {
      maxHp: 0,
      speed: 0,
      damage: 0,
      fireRate: 0,
    };
    for (const [id, input] of args.metaInputs) {
      metaLevels[id] = clampInt(input, 0, 10);
    }

    const customEnemies: Partial<Record<EnemyType, number>> = {};
    const customBosses: BossId[] = [];
    if (args.baseKind === 'custom') {
      let total = 0;
      for (const [type, input] of args.enemyInputs) {
        const count = clampInt(input, 0, 500);
        if (count > 0) {
          customEnemies[type] = count;
          total += count;
        }
      }
      for (const [id, check] of args.bossChecks) {
        if (check.checked && (args.dev || args.defeatedBosses.includes(id))) {
          customBosses.push(id);
        }
      }
      if (total === 0 && customBosses.length === 0) {
        return 'Adicione pelo menos um inimigo ou chefão no cenário personalizado.';
      }
    }

    return {
      baseKind: args.baseKind,
      wave: clampInt(args.waveInput, 1, args.maxWave),
      startTimeMs: clampInt(args.timeInput, 0, args.maxTimeSec) * 1000,
      startLevel: clampInt(args.levelInput, 1, args.maxLevel),
      buffCounts,
      amulets,
      useMeta: args.useMeta,
      metaLevels,
      customEnemies,
      customBosses,
    };
  }

  // ————— DOM helpers —————

  private title(text: string): HTMLElement {
    const el = document.createElement('div');
    el.textContent = text;
    Object.assign(el.style, {
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '26px',
      color: '#f4d77b',
      marginBottom: '6px',
    } as CSSStyleDeclaration);
    return el;
  }

  private note(text: string): HTMLElement {
    const el = document.createElement('p');
    el.textContent = text;
    Object.assign(el.style, {
      fontSize: '13px',
      lineHeight: '1.45',
      color: '#d4b86a',
      background: 'rgba(196,163,90,0.12)',
      border: '1px solid rgba(196,163,90,0.35)',
      borderRadius: '6px',
      padding: '8px 12px',
      margin: '0 0 6px',
    } as CSSStyleDeclaration);
    return el;
  }

  private section(titleText: string): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.marginTop = '16px';
    const heading = document.createElement('div');
    heading.textContent = titleText;
    Object.assign(heading.style, {
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '17px',
      color: ACCENT,
      borderBottom: '1px solid rgba(196,163,90,0.3)',
      paddingBottom: '4px',
      marginBottom: '8px',
    } as CSSStyleDeclaration);
    wrap.append(heading);
    return wrap;
  }

  private smallLabel(text: string): HTMLElement {
    const el = document.createElement('span');
    el.textContent = text;
    Object.assign(el.style, {
      fontSize: '13px',
      color: MUTED,
    } as CSSStyleDeclaration);
    return el;
  }

  private inline(...children: HTMLElement[]): HTMLElement {
    const el = document.createElement('div');
    Object.assign(el.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexWrap: 'wrap',
    } as CSSStyleDeclaration);
    el.append(...children);
    return el;
  }

  private number(min: number, max: number, value: number): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    Object.assign(input.style, {
      padding: '6px 8px',
      borderRadius: '6px',
      border: '1px solid #4a5c4a',
      background: '#0d1a12',
      color: TEXT,
      fontSize: '14px',
    } as CSSStyleDeclaration);
    return input;
  }

  private radio(name: string, label: string, checked: boolean) {
    const wrap = document.createElement('label');
    Object.assign(wrap.style, {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '14px',
      color: TEXT,
      cursor: 'pointer',
    } as CSSStyleDeclaration);
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.checked = checked;
    wrap.append(input, document.createTextNode(label));
    return { wrap, input };
  }

  private checkbox(label: string, checked: boolean, disabled: boolean) {
    const wrap = document.createElement('label');
    Object.assign(wrap.style, {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '13px',
      color: disabled ? '#667a66' : TEXT,
      cursor: disabled ? 'not-allowed' : 'pointer',
    } as CSSStyleDeclaration);
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.disabled = disabled;
    wrap.append(input, document.createTextNode(label));
    return { wrap, input };
  }

  private button(label: string, bg: string, color: string, outlined = false): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    Object.assign(btn.style, {
      flex: '1 1 auto',
      minWidth: '120px',
      padding: '10px 12px',
      borderRadius: '6px',
      border: outlined ? `1px solid ${ACCENT}` : 'none',
      background: bg,
      color,
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '16px',
      cursor: 'pointer',
    } as CSSStyleDeclaration);
    return btn;
  }
}
