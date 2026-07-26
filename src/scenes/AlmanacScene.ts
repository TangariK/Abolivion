import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import { ACHIEVEMENTS } from '../data/Achievements';
import { BOSS_DEFS, ENEMY_DEFS } from '../data/EnemyCatalog';
import { AMULETS, moonLabel } from '../upgrades/Amulets';
import { SaveManager } from '../upgrades/MetaUpgrades';
import { RUN_UPGRADES } from '../upgrades/RunUpgrades';

type AlmanacTab = 'amulets' | 'upgrades' | 'enemies' | 'bosses' | 'achievements';

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
}

export class AlmanacScene extends Phaser.Scene {
  private listContainer!: Phaser.GameObjects.Container;
  private detailContainer!: Phaser.GameObjects.Container;
  private tabButtons = new Map<AlmanacTab, {
    bg: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
  }>();
  private rowHighlights = new Map<string, Phaser.GameObjects.Rectangle>();
  private activeTab: AlmanacTab = 'amulets';
  private selectedEntryId?: string;

  constructor() {
    super('AlmanacScene');
  }

  create(): void {
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
      .on('pointerdown', () => this.scene.stop());

    const tabs: Array<{ id: AlmanacTab; label: string; x: number }> = [
      { id: 'amulets', label: 'Amuletos', x: 180 },
      { id: 'upgrades', label: 'Melhorias', x: 360 },
      { id: 'enemies', label: 'Inimigos', x: 540 },
      { id: 'bosses', label: 'Chefões', x: 720 },
      { id: 'achievements', label: 'Conquistas', x: 920 },
    ];
    tabs.forEach((tab) => this.makeTab(tab.x, tab.label, tab.id));

    this.listContainer = this.add.container(0, 0);
    this.detailContainer = this.add.container(0, 0);
    this.showTab('amulets');

    const closeOnEscape = () => this.scene.stop();
    this.input.keyboard?.on('keydown-ESC', closeOnEscape);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown-ESC', closeOnEscape));
  }

  private makeTab(x: number, label: string, tab: AlmanacTab): void {
    const bg = this.add
      .rectangle(x, 150, 150, 36, 0x6e5a32)
      .setStrokeStyle(1, COLORS.accent)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, 150, label, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '15px',
        color: '#f7edce',
      })
      .setOrigin(0.5);

    bg.on('pointerdown', () => this.showTab(tab));
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
        detail: `Rodada ${boss.wave} · HP ${boss.hp} · Vel ${boss.speed} · Dano ${boss.damage}`,
        textureKey: boss.textureKey,
        unlocked: profile.almanac.bosses.includes(boss.id),
        symbol: 'B',
      }));
    } else {
      entries = ACHIEVEMENTS.map((a) => ({
        id: a.id,
        title: a.name,
        description: a.description,
        lore: profile.almanac.achievements.includes(a.id)
          ? 'Conquista desbloqueada.'
          : 'Ainda oculta na memória da tribo.',
        unlocked: profile.almanac.achievements.includes(a.id),
        symbol: '★',
      }));
    }

    // First list item starts lower to clear the tab row
    entries.forEach((entry, index) => {
      const y = 210 + index * 48;
      const row = this.add
        .rectangle(300, y, 480, 42, 0xd8c89c)
        .setStrokeStyle(1, 0x8c7950)
        .setInteractive({ useHandCursor: true });
      const text = this.add
        .text(
          80,
          y,
          entry.unlocked
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
      row.on('pointerdown', () => this.selectEntry(entry));
      this.listContainer.add([row, text]);
    });

    const first = entries.find((e) => e.unlocked) ?? entries[0];
    if (first) this.selectEntry(first);
  }

  private selectEntry(entry: AlmanacEntry): void {
    this.selectedEntryId = entry.id;
    this.rowHighlights.forEach((row, id) => {
      const selected = id === entry.id;
      row.setFillStyle(selected ? 0xf0e0b0 : 0xd8c89c);
      row.setStrokeStyle(selected ? 3 : 1, selected ? COLORS.accent : 0x8c7950);
    });
    this.showDetail(entry);
  }

  private showDetail(entry: AlmanacEntry): void {
    this.detailContainer.removeAll(true);

    this.detailContainer.add(
      this.add.rectangle(900, 420, 480, 460, 0xd8c89c).setStrokeStyle(2, 0x8c7950),
    );

    if (entry.unlocked && entry.textureKey && this.textures.exists(entry.textureKey)) {
      this.detailContainer.add(
        this.add.image(900, 260, entry.textureKey).setDisplaySize(128, 128),
      );
    } else if (entry.unlocked && entry.symbol) {
      this.detailContainer.add(this.add.circle(900, 260, 56, COLORS.accent));
      this.detailContainer.add(
        this.add
          .text(900, 260, entry.symbol, {
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '36px',
            color: '#0d1a12',
          })
          .setOrigin(0.5),
      );
    } else {
      this.detailContainer.add(this.add.circle(900, 260, 56, 0x888888));
      this.detailContainer.add(
        this.add
          .text(900, 260, '?', {
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '36px',
            color: '#333',
          })
          .setOrigin(0.5),
      );
    }

    this.detailContainer.add(
      this.add
        .text(900, 350, entry.unlocked ? entry.title : '???', {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '24px',
          color: '#342815',
          align: 'center',
          wordWrap: { width: 420 },
        })
        .setOrigin(0.5),
    );

    this.detailContainer.add(
      this.add
        .text(
          900,
          395,
          entry.unlocked ? entry.description : 'Este registro ainda não foi descoberto.',
          {
            fontFamily: 'Segoe UI, Tahoma, sans-serif',
            fontSize: '15px',
            color: '#493b24',
            align: 'center',
            wordWrap: { width: 420 },
          },
        )
        .setOrigin(0.5, 0),
    );

    if (entry.unlocked && entry.detail) {
      this.detailContainer.add(
        this.add
          .text(900, 460, entry.detail, {
            fontFamily: 'Segoe UI, Tahoma, sans-serif',
            fontSize: '14px',
            color: '#5a4a2e',
            align: 'center',
            wordWrap: { width: 420 },
          })
          .setOrigin(0.5, 0),
      );
    }

    if (entry.unlocked && entry.lore) {
      this.detailContainer.add(
        this.add
          .text(900, 520, entry.lore, {
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontStyle: 'italic',
            fontSize: '13px',
            color: '#6b5b3d',
            align: 'center',
            wordWrap: { width: 420 },
          })
          .setOrigin(0.5, 0),
      );
    }

    if (entry.unlocked && entry.rarityLabel) {
      this.detailContainer.add(
        this.add
          .text(900, 590, entry.rarityLabel, {
            fontFamily: 'Segoe UI, Tahoma, sans-serif',
            fontSize: '20px',
            color: '#6e5a32',
          })
          .setOrigin(0.5),
      );
    }
  }
}
