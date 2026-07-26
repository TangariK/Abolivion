import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import type { AmuletDef, EnemyDef, RunUpgradeDef } from '../data/types';
import { ENEMY_DEFS } from '../entities/Enemy';
import { AMULETS } from '../upgrades/Amulets';
import { SaveManager } from '../upgrades/MetaUpgrades';
import { RUN_UPGRADES } from '../upgrades/RunUpgrades';

type AlmanacTab = 'amulets' | 'upgrades' | 'enemies';

export class AlmanacScene extends Phaser.Scene {
  private content!: Phaser.GameObjects.Container;

  constructor() {
    super('AlmanacScene');
  }

  create(): void {
    this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x050806,
      0.88,
    ).setInteractive();
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 1110, 620, 0x2a2417, 1)
      .setStrokeStyle(4, COLORS.accent);
    this.add.rectangle(GAME_WIDTH / 2 - 267, 375, 520, 500, 0xd8c89c, 1);
    this.add.rectangle(GAME_WIDTH / 2 + 267, 375, 520, 500, 0xd8c89c, 1);
    this.add.rectangle(GAME_WIDTH / 2, 375, 8, 500, 0x6e5a32, 0.7);

    this.add
      .text(GAME_WIDTH / 2, 58, 'MARÃ', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '42px',
        color: '#f4d77b',
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 96, 'Livro de memórias da tribo', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontStyle: 'italic',
        fontSize: '15px',
        color: '#b7aa84',
      })
      .setOrigin(0.5);

    this.makeTab(390, 'Amuletos', 'amulets');
    this.makeTab(640, 'Melhorias', 'upgrades');
    this.makeTab(890, 'Inimigos', 'enemies');

    this.content = this.add.container(0, 0);
    this.showTab('amulets');

    this.add
      .text(1175, 52, 'FECHAR  X', {
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
      .rectangle(x, 128, 210, 40, 0x6e5a32)
      .setStrokeStyle(1, COLORS.accent)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, 128, label, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '18px',
        color: '#f7edce',
      })
      .setOrigin(0.5);
    button.on('pointerdown', () => this.showTab(tab));
  }

  private showTab(tab: AlmanacTab): void {
    this.content.removeAll(true);
    const profile = SaveManager.load();

    if (tab === 'amulets') {
      AMULETS.forEach((item, index) => {
        this.addEntry(
          index,
          profile.almanac.amulets.includes(item.id),
          item.name,
          item.description,
          item.lore,
          item.symbol,
        );
      });
      return;
    }

    if (tab === 'upgrades') {
      RUN_UPGRADES.forEach((item, index) => {
        this.addUpgradeEntry(index, item, profile.almanac.upgrades.includes(item.id));
      });
      return;
    }

    Object.values(ENEMY_DEFS).forEach((enemy, index) => {
      this.addEnemyEntry(index, enemy, profile.almanac.enemies.includes(enemy.type));
    });
  }

  private addUpgradeEntry(index: number, item: RunUpgradeDef, unlocked: boolean): void {
    this.addEntry(index, unlocked, item.name, item.description, 'Registrada após ser escolhida.', '+');
  }

  private addEnemyEntry(index: number, enemy: EnemyDef, unlocked: boolean): void {
    const names: Record<EnemyDef['type'], string> = {
      fast: 'Invasor Veloz',
      normal: 'Invasor',
      tank: 'Invasor Couraçado',
    };
    const details = `HP ${enemy.hp}  ·  Vel ${enemy.speed}  ·  Dano ${enemy.damage}  ·  XP ${enemy.xp}`;
    this.addEntry(index, unlocked, names[enemy.type], details, 'Registrado ao ser encontrado.', '!');
  }

  private addEntry(
    index: number,
    unlocked: boolean,
    name: string,
    description: string,
    lore: string,
    symbol: AmuletDef['symbol'],
  ): void {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = column === 0 ? 373 : 907;
    const y = 205 + row * 145;

    const title = this.add
      .text(x - 205, y, unlocked ? `${symbol}  ${name}` : '?  ???', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '19px',
        color: unlocked ? '#342815' : '#796f59',
      })
      .setOrigin(0, 0.5);
    const desc = this.add
      .text(x - 205, y + 28, unlocked ? description : 'Este registro ainda não foi descoberto.', {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '13px',
        color: unlocked ? '#493b24' : '#887e68',
        wordWrap: { width: 430 },
      })
      .setOrigin(0, 0);
    const story = this.add
      .text(x - 205, y + 67, unlocked ? lore : '', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontStyle: 'italic',
        fontSize: '11px',
        color: '#6b5b3d',
        wordWrap: { width: 430 },
      })
      .setOrigin(0, 0);
    const divider = this.add.rectangle(x, y + 118, 430, 1, 0x8c7950, 0.55);
    this.content.add([title, desc, story, divider]);
  }
}
