import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import { ACHIEVEMENTS } from '../data/Achievements';
import { BOSS_DEFS, ENEMY_DEFS } from '../data/EnemyCatalog';
import { AMULETS, moonLabel } from '../upgrades/Amulets';
import { SaveManager } from '../upgrades/MetaUpgrades';
import { RUN_UPGRADES } from '../upgrades/RunUpgrades';

type AlmanacTab = 'amulets' | 'upgrades' | 'enemies' | 'bosses' | 'achievements';

interface AlmanacEntry {
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

  constructor() {
    super('AlmanacScene');
  }

  create(): void {
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050806, 0.9)
      .setInteractive();

    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 1180, 640, 0x2a2417)
      .setStrokeStyle(4, COLORS.accent);

    this.add
      .text(GAME_WIDTH / 2, 48, 'MARÃ', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '40px',
        color: '#f4d77b',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 82, 'Livro de memórias da tribo', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontStyle: 'italic',
        fontSize: '14px',
        color: '#b7aa84',
      })
      .setOrigin(0.5);

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

    this.add
      .text(1180, 48, 'FECHAR  X', {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '15px',
        color: '#e8f0e8',
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.stop());

    const closeOnEscape = () => this.scene.stop();
    this.input.keyboard?.on('keydown-ESC', closeOnEscape);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown-ESC', closeOnEscape));
  }

  private makeTab(x: number, label: string, tab: AlmanacTab): void {
    const button = this.add
      .rectangle(x, 118, 150, 36, 0x6e5a32)
      .setStrokeStyle(1, COLORS.accent)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, 118, label, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '15px',
        color: '#f7edce',
      })
      .setOrigin(0.5);
    button.on('pointerdown', () => this.showTab(tab));
  }

  private showTab(tab: AlmanacTab): void {
    this.listContainer.removeAll(true);
    this.detailContainer.removeAll(true);

    const profile = SaveManager.load();
    let entries: AlmanacEntry[] = [];

    if (tab === 'amulets') {
      entries = AMULETS.map((item) => ({
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
        title: item.name,
        description: item.description,
        lore: 'Registrada após ser escolhida em uma run.',
        unlocked: profile.almanac.upgrades.includes(item.id),
        symbol: '+',
      }));
    } else if (tab === 'enemies') {
      entries = Object.values(ENEMY_DEFS).map((enemy) => ({
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
        title: a.name,
        description: a.description,
        lore: profile.almanac.achievements.includes(a.id)
          ? 'Conquista desbloqueada.'
          : 'Ainda oculta na memória da tribo.',
        unlocked: profile.almanac.achievements.includes(a.id),
        symbol: '★',
      }));
    }

    entries.forEach((entry, index) => {
      const y = 160 + index * 52;
      const row = this.add
        .rectangle(300, y, 480, 44, 0xd8c89c)
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
            fontSize: '16px',
            color: entry.unlocked ? '#342815' : '#796f59',
          },
        )
        .setOrigin(0, 0.5);

      row.on('pointerdown', () => this.showDetail(entry));
      this.listContainer.add([row, text]);
    });

    // Default detail for first unlocked or first entry
    const first = entries.find((e) => e.unlocked) ?? entries[0];
    if (first) this.showDetail(first);
  }

  private showDetail(entry: AlmanacEntry): void {
    this.detailContainer.removeAll(true);

    this.detailContainer.add(
      this.add.rectangle(900, 400, 480, 480, 0xd8c89c).setStrokeStyle(2, 0x8c7950),
    );

    if (entry.unlocked && entry.textureKey && this.textures.exists(entry.textureKey)) {
      this.detailContainer.add(
        this.add.image(900, 250, entry.textureKey).setDisplaySize(120, 120),
      );
    } else {
      this.detailContainer.add(
        this.add.circle(900, 250, 56, entry.unlocked ? COLORS.accent : 0x888888),
      );
    }

    this.detailContainer.add(
      this.add
        .text(900, 340, entry.unlocked ? entry.title : '???', {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '26px',
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
          390,
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
          .text(900, 510, entry.lore, {
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
          .text(900, 580, entry.rarityLabel, {
            fontFamily: 'Segoe UI, Tahoma, sans-serif',
            fontSize: '20px',
            color: '#6e5a32',
          })
          .setOrigin(0.5),
      );
    }
  }
}
