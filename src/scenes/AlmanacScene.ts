import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import {
  ACHIEVEMENTS,
  achievementTierLabel,
  isAchievementVisibleWhenLocked,
} from '../data/Achievements';
import { BOSS_DEFS, ENEMY_DEFS } from '../data/EnemyCatalog';
import { EMBLEMS } from '../data/Emblems';
import type { AchievementTier } from '../data/types';
import { AMULETS, moonLabel } from '../upgrades/Amulets';
import { SaveManager } from '../upgrades/MetaUpgrades';
import { RUN_UPGRADES } from '../upgrades/RunUpgrades';
import { AudioService } from '../services/AudioService';

type AlmanacTab = 'amulets' | 'upgrades' | 'enemies' | 'bosses' | 'emblems' | 'achievements';

interface AlmanacEntry {
  id: string;
  title: string;
  description: string;
  lore?: string;
  detail?: string;
  textureKey?: string;
  unlocked: boolean;
  symbol?: string;
  rarityLabel?: string;
  tier?: AchievementTier;
  revealLocked?: boolean;
}

const TIER_STROKE: Record<AchievementTier, number> = {
  normal: 0x8c7950,
  secret: 0x6a5f48,
  tribal: 0x3d9a78,
  ancestral: 0xc4a035,
};

/** Viewport da lista (clipping + scroll). */
const LIST_X = 50;
const LIST_W = 520;
const LIST_TOP = 188;
const LIST_BOTTOM = 640;
const LIST_H = LIST_BOTTOM - LIST_TOP;
const ROW_H = 48;
const ROW_GAP = 6;
const ROW_STEP = ROW_H + ROW_GAP;

export class AlmanacScene extends Phaser.Scene {
  private listContainer!: Phaser.GameObjects.Container;
  private detailContainer!: Phaser.GameObjects.Container;
  private listMaskGfx?: Phaser.GameObjects.Graphics;
  private tabButtons = new Map<AlmanacTab, {
    bg: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
  }>();
  private rowHighlights = new Map<string, Phaser.GameObjects.Rectangle>();
  private activeTab: AlmanacTab = 'amulets';
  private selectedEntryId?: string;
  private listScrollY = 0;
  private listContentH = 0;
  private onWheel?: (
    pointer: Phaser.Input.Pointer,
    currentlyOver: Phaser.GameObjects.GameObject[],
    dx: number,
    dy: number,
  ) => void;

  constructor() {
    super('AlmanacScene');
  }

  create(): void {
    AudioService.bind(this);
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050806, 0.9)
      .setInteractive();

    // Frame: title stays inside the book panel
    const panelTop = 55;
    const panelH = 610;
    this.add
      .rectangle(GAME_WIDTH / 2, panelTop + panelH / 2, 1180, panelH, 0x2a2417)
      .setStrokeStyle(4, COLORS.accent);

    this.add
      .text(GAME_WIDTH / 2, 88, 'MARÃ', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '36px',
        color: '#f4d77b',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 118, 'Livro de memórias da tribo', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontStyle: 'italic',
        fontSize: '13px',
        color: '#b7aa84',
      })
      .setOrigin(0.5);

    this.add
      .text(1145, 78, 'FECHAR  X', {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '14px',
        color: '#e8f0e8',
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        AudioService.playSfx('sfx_ui_back');
        this.scene.stop();
      });

    const tabs: Array<{ id: AlmanacTab; label: string; x: number }> = [
      { id: 'amulets', label: 'Amuletos', x: 130 },
      { id: 'upgrades', label: 'Melhorias', x: 280 },
      { id: 'enemies', label: 'Inimigos', x: 430 },
      { id: 'bosses', label: 'Chefões', x: 580 },
      { id: 'emblems', label: 'Emblemas', x: 740 },
      { id: 'achievements', label: 'Conquistas', x: 920 },
    ];
    tabs.forEach((tab) => this.makeTab(tab.x, tab.label, tab.id));

    // Moldura sutil da área scrollável (lista)
    this.add
      .rectangle(LIST_X + LIST_W / 2, LIST_TOP + LIST_H / 2, LIST_W + 8, LIST_H + 8, 0x1a1610, 0.35)
      .setStrokeStyle(1, 0x8c7950);

    this.listContainer = this.add.container(0, LIST_TOP);
    this.detailContainer = this.add.container(0, 0);

    // Geometry mask: itens somem no topo e no fundo do viewport
    this.listMaskGfx = this.make.graphics({ x: 0, y: 0 });
    this.listMaskGfx.fillStyle(0xffffff, 1);
    this.listMaskGfx.fillRect(LIST_X, LIST_TOP, LIST_W, LIST_H);
    this.listContainer.setMask(this.listMaskGfx.createGeometryMask());

    this.onWheel = (_pointer, _over, _dx, dy) => {
      this.scrollList(dy * 0.4);
    };
    this.input.on('wheel', this.onWheel);

    this.showTab('amulets');

    const closeOnEscape = () => this.scene.stop();
    this.input.keyboard?.on('keydown-ESC', closeOnEscape);
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown-ESC', closeOnEscape);
      if (this.onWheel) this.input.off('wheel', this.onWheel);
      this.listContainer.clearMask(true);
      this.listMaskGfx?.destroy();
    });
  }

  private maxScroll(): number {
    return Math.max(0, this.listContentH - LIST_H);
  }

  private scrollList(deltaY: number): void {
    const max = this.maxScroll();
    if (max <= 0) {
      this.listScrollY = 0;
      this.listContainer.y = LIST_TOP;
      return;
    }
    // deltaY > 0 = scroll down (content moves up)
    this.listScrollY = Phaser.Math.Clamp(this.listScrollY + deltaY, 0, max);
    this.listContainer.y = LIST_TOP - this.listScrollY;
  }

  private makeTab(x: number, label: string, tab: AlmanacTab): void {
    const bg = this.add
      .rectangle(x, 150, 128, 36, 0x6e5a32)
      .setStrokeStyle(1, COLORS.accent)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, 150, label, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '13px',
        color: '#f7edce',
      })
      .setOrigin(0.5);

    bg.on('pointerdown', () => {
      AudioService.playSfx('sfx_page_turn');
      this.showTab(tab);
    });
    this.tabButtons.set(tab, { bg, label: text });
  }

  private refreshTabStyles(): void {
    this.tabButtons.forEach((btn, id) => {
      const active = id === this.activeTab;
      btn.bg.setFillStyle(active ? COLORS.accent : 0x6e5a32);
      btn.bg.setStrokeStyle(2, active ? 0xffe8a3 : COLORS.accent);
      btn.label.setColor(active ? '#0d1a12' : '#f7edce');
    });
  }

  private showTab(tab: AlmanacTab): void {
    this.activeTab = tab;
    this.selectedEntryId = undefined;
    this.listScrollY = 0;
    this.listContainer.y = LIST_TOP;
    this.refreshTabStyles();
    this.listContainer.removeAll(true);
    this.detailContainer.removeAll(true);
    this.rowHighlights.clear();

    const profile = SaveManager.load();
    let entries: AlmanacEntry[] = [];

    if (tab === 'amulets') {
      entries = AMULETS.map((item) => ({
        id: item.id,
        title: item.name,
        description: item.description,
        lore: item.lore,
        textureKey: item.textureKey,
        unlocked: profile.almanac.amulets.includes(item.id),
        symbol: item.symbol,
        rarityLabel: moonLabel(item.rarity),
        detail: `Raridade: ${moonLabel(item.rarity)} (${item.rarity}/5 luas)`,
      }));
    } else if (tab === 'upgrades') {
      entries = RUN_UPGRADES.map((item) => ({
        id: item.id,
        title: item.name,
        description: item.description,
        lore: 'Registrada após ser escolhida em uma run.',
        unlocked: profile.almanac.upgrades.includes(item.id),
        symbol: '+',
      }));
    } else if (tab === 'enemies') {
      entries = Object.values(ENEMY_DEFS).map((enemy) => ({
        id: enemy.type,
        title: enemy.name,
        description: enemy.description,
        detail: `HP ${enemy.hp} · Vel ${enemy.speed} · Dano ${enemy.damage} · XP ${enemy.xp}${
          enemy.armor ? ` · Armadura ${enemy.armor}` : ''
        }`,
        textureKey: enemy.textureKey,
        unlocked: profile.almanac.enemies.includes(enemy.type),
        symbol: '!',
      }));
    } else if (tab === 'bosses') {
      entries = Object.values(BOSS_DEFS).map((boss) => ({
        id: boss.id,
        title: boss.name,
        description: boss.description,
        lore: boss.lore,
        detail:
          `Rodada ${boss.wave} · HP ${boss.hp} · Vel ${boss.speed} · Dano ${boss.damage}\n\n`
          + `Triggered Mode — ${boss.triggeredMode.name}\n${boss.triggeredMode.description}`,
        textureKey: boss.textureKey,
        unlocked: profile.almanac.bosses.includes(boss.id),
        symbol: 'B',
      }));
    } else if (tab === 'emblems') {
      entries = EMBLEMS.map((e) => ({
        id: e.id,
        title: e.name,
        description: e.howObtained,
        lore: e.lore,
        detail: `Efeito: ${e.effectText}`,
        textureKey: e.textureKey,
        unlocked: (profile.almanac.emblems ?? []).includes(e.id),
        symbol: '✦',
      }));
    } else {
      entries = ACHIEVEMENTS.map((a) => {
        const unlocked = profile.almanac.achievements.includes(a.id);
        const revealLocked = isAchievementVisibleWhenLocked(a.tier);
        return {
          id: a.id,
          title: a.name,
          description: a.description,
          lore: unlocked
            ? 'Conquista desbloqueada.'
            : revealLocked
              ? `Conquista ${achievementTierLabel(a.tier).toLowerCase()} — ainda selada.`
              : 'Ainda oculta na memória da tribo.',
          detail: `Tipo: ${achievementTierLabel(a.tier)}`,
          unlocked,
          revealLocked,
          tier: a.tier,
          symbol:
            a.tier === 'ancestral' ? '◆' : a.tier === 'tribal' ? '◈' : a.tier === 'secret' ? '✦' : '★',
        };
      });
    }

    // Itens relativos ao container (y=0 no topo do viewport)
    entries.forEach((entry, index) => {
      const y = ROW_H / 2 + index * ROW_STEP;
      const stroke = entry.tier ? TIER_STROKE[entry.tier] : 0x8c7950;
      const width = entry.tier === 'ancestral' ? 3 : entry.tier === 'tribal' ? 2 : 1;
      const row = this.add
        .rectangle(LIST_X + LIST_W / 2, y, LIST_W - 20, ROW_H, 0xd8c89c)
        .setStrokeStyle(width, stroke)
        .setInteractive({ useHandCursor: true });
      const showInfo = entry.unlocked || entry.revealLocked;
      const text = this.add
        .text(
          LIST_X + 24,
          y,
          showInfo
            ? `${entry.symbol ?? '·'}  ${entry.title}${entry.rarityLabel ? `  ${entry.rarityLabel}` : ''}`
            : '?  ???',
          {
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '15px',
            color: entry.unlocked ? '#342815' : '#796f59',
          },
        )
        .setOrigin(0, 0.5);

      this.rowHighlights.set(entry.id, row);
      row.on('pointerdown', () => {
        AudioService.playSfx('sfx_almanac_select');
        this.selectEntry(entry);
      });
      this.listContainer.add([row, text]);
    });

    this.listContentH = entries.length > 0
      ? entries.length * ROW_STEP
      : 0;

    const first = entries.find((e) => e.unlocked) ?? entries[0];
    if (first) this.selectEntry(first);
  }

  private selectEntry(entry: AlmanacEntry): void {
    this.selectedEntryId = entry.id;
    this.rowHighlights.forEach((row, id) => {
      const selected = id === entry.id;
      const matched = entriesTier(id);
      row.setFillStyle(selected ? 0xf0e0b0 : 0xd8c89c);
      const baseStroke = matched ? TIER_STROKE[matched] : 0x8c7950;
      const width = matched === 'ancestral' ? 3 : matched === 'tribal' ? 2 : selected ? 3 : 1;
      row.setStrokeStyle(width, selected ? COLORS.accent : baseStroke);
    });
    this.showDetail(entry);
  }

  private showDetail(entry: AlmanacEntry): void {
    this.detailContainer.removeAll(true);

    const reveal = entry.unlocked || Boolean(entry.revealLocked);
    const detailStroke = entry.tier ? TIER_STROKE[entry.tier] : 0x8c7950;
    const detailWidth = entry.tier === 'ancestral' ? 4 : entry.tier === 'tribal' ? 3 : 2;
    const cardH = 500;
    const cardY = 430;

    this.detailContainer.add(
      this.add.rectangle(900, cardY, 480, cardH, 0xd8c89c).setStrokeStyle(detailWidth, detailStroke),
    );

    if (entry.tier === 'ancestral') {
      this.detailContainer.add(
        this.add.rectangle(900, cardY, 460, cardH - 20, 0x000000, 0).setStrokeStyle(1, 0xffe08a),
      );
    }

    if (reveal && entry.textureKey && this.textures.exists(entry.textureKey)) {
      this.detailContainer.add(
        this.add.image(900, 248, entry.textureKey).setDisplaySize(110, 110),
      );
    } else if (reveal && entry.symbol) {
      this.detailContainer.add(this.add.circle(900, 248, 50, COLORS.accent));
      this.detailContainer.add(
        this.add
          .text(900, 248, entry.symbol, {
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '34px',
            color: '#0d1a12',
          })
          .setOrigin(0.5),
      );
    } else {
      this.detailContainer.add(this.add.circle(900, 248, 50, 0x888888));
      this.detailContainer.add(
        this.add
          .text(900, 248, '?', {
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '34px',
            color: '#333',
          })
          .setOrigin(0.5),
      );
    }

    let y = 318;
    const gap = 10;
    const wrap = 420;

    const pushText = (
      content: string,
      style: Phaser.Types.GameObjects.Text.TextStyle,
    ): void => {
      const t = this.add
        .text(900, y, content, { ...style, align: 'center', wordWrap: { width: wrap } })
        .setOrigin(0.5, 0);
      this.detailContainer.add(t);
      y += t.height + gap;
    };

    pushText(reveal ? entry.title : '???', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '22px',
      color: '#342815',
    });

    pushText(
      reveal ? entry.description : 'Este registro ainda não foi descoberto.',
      {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '14px',
        color: '#493b24',
      },
    );

    if (reveal && entry.detail) {
      pushText(entry.detail, {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '13px',
        color: '#5a4a2e',
      });
    }

    if (reveal && entry.lore) {
      pushText(entry.lore, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontStyle: 'italic',
        fontSize: '13px',
        color: '#6b5b3d',
      });
    }

    if (reveal && entry.rarityLabel) {
      pushText(entry.rarityLabel, {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '18px',
        color: '#6e5a32',
      });
    }
  }
}

function entriesTier(id: string): AchievementTier | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)?.tier;
}
