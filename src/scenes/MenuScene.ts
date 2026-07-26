import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import { GameSettingsStore, type PlayerCount } from '../data/GameModeStore';
import type { GameModeId, Profile } from '../data/types';
import { AuthService } from '../services/AuthService';
import { AchievementToast } from '../ui/AchievementToast';
import { FreeModeSetupOverlay } from '../ui/FreeModeSetupOverlay';
import { ProfileOverlay } from '../ui/ProfileOverlay';
import { SaveManager } from '../upgrades/MetaUpgrades';
import { META_UPGRADE_DEFS, metaCost, tryBuyMeta } from '../upgrades/MetaShop';

const MODE_LABELS: Record<GameModeId, string> = {
  infinite: 'Infinito',
  waves: 'Rodadas',
  free: 'Livre',
  story: 'História',
};

export class MenuScene extends Phaser.Scene {
  private profile!: Profile;
  private coinsText!: Phaser.GameObjects.Text;
  private shopContainer!: Phaser.GameObjects.Container;
  private modeButton!: Phaser.GameObjects.Rectangle;
  private modeButtonLabel!: Phaser.GameObjects.Text;
  private playersButton!: Phaser.GameObjects.Rectangle;
  private playersButtonLabel!: Phaser.GameObjects.Text;
  private dropdown?: Phaser.GameObjects.Container;
  private dropdownBlocker?: Phaser.GameObjects.Rectangle;
  private closingDropdown = false;
  private coopHint?: Phaser.GameObjects.Container;
  private profileButtonLabel!: Phaser.GameObjects.Text;
  private profileSilhouette!: Phaser.GameObjects.Graphics;
  private guestHint!: Phaser.GameObjects.Text;
  private profileOverlay = new ProfileOverlay();
  private freeSetup = new FreeModeSetupOverlay();
  private toasts!: AchievementToast;
  private unsubAuth?: () => void;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.profile = SaveManager.load();
    this.toasts = new AchievementToast(this);
    this.cameras.main.setBackgroundColor(COLORS.bg);

    const g = this.add.graphics();
    g.fillStyle(0x1a3324, 0.35);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, 420);
    g.fillStyle(0x243d2c, 0.2);
    g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, 280);

    this.add
      .text(GAME_WIDTH / 2, 70, 'ABOLIVION', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '64px',
        color: '#e8f0e8',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 130, 'Sobreviva à noite. Proteja o que restou.', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '18px',
        color: '#a8c0a8',
      })
      .setOrigin(0.5);

    this.coinsText = this.add
      .text(GAME_WIDTH / 2, 168, '', {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '20px',
        color: '#c4a35a',
      })
      .setOrigin(0.5);

    this.refreshCoins();
    this.buildProfileButton();
    this.buildShop();
    this.buildModeSelector();
    this.buildPlayersSelector();
    this.buildStartButton();
    this.buildAlmanacButton();

    this.unsubAuth = AuthService.onChange(() => {
      this.profile = SaveManager.load();
      this.refreshCoins();
      this.refreshProfileButton();
    });
    this.events.once('shutdown', () => {
      this.unsubAuth?.();
      this.profileOverlay.close();
      this.freeSetup.close();
    });
  }

  private refreshCoins(): void {
    this.coinsText.setText(`Moedas: ${this.profile.currency}`);
    if (this.profile.currency >= 200) {
      if (SaveManager.unlockAchievement('deep_pockets')) {
        this.toasts.enqueue('deep_pockets');
      }
    }
  }

  private buildProfileButton(): void {
    const x = GAME_WIDTH - 110;
    const y = 42;
    const bg = this.add
      .circle(x, y, 28, 0x2a2417)
      .setStrokeStyle(2, COLORS.accent)
      .setInteractive({ useHandCursor: true })
      .setDepth(40);

    this.profileButtonLabel = this.add
      .text(x, y, '', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '22px',
        color: '#f4d77b',
      })
      .setOrigin(0.5)
      .setDepth(41);

    // Silhueta de perfil para quando estiver deslogado
    this.profileSilhouette = this.add.graphics().setDepth(41);
    this.profileSilhouette.fillStyle(0xf4d77b, 0.85);
    this.profileSilhouette.fillCircle(x, y - 7, 7);
    this.profileSilhouette.fillEllipse(x, y + 10, 26, 16);

    this.guestHint = this.add
      .text(x, y + 40, '', {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '11px',
        color: '#d4b86a',
        align: 'center',
        wordWrap: { width: 160 },
      })
      .setOrigin(0.5, 0)
      .setDepth(41);

    bg.on('pointerover', () => bg.setFillStyle(0x3b3220));
    bg.on('pointerout', () => bg.setFillStyle(0x2a2417));
    bg.on('pointerup', () => {
      this.lockUiInput();
      this.profileOverlay.open((result) => {
        this.profile = SaveManager.load();
        this.refreshCoins();
        this.refreshProfileButton();
        if (result.unlockedLoginAchievement) {
          this.toasts.enqueue('tribe_member');
        }
        this.unlockUiInputSoon();
      });
    });

    this.refreshProfileButton();
  }

  private refreshProfileButton(): void {
    const logged = AuthService.isLoggedIn();
    const name = AuthService.displayName();
    this.profileButtonLabel.setText(logged ? name.slice(0, 1).toUpperCase() : '');
    this.profileSilhouette.setVisible(!logged);
    this.guestHint.setText(
      logged
        ? name
        : 'Convidado — progresso em cache',
    );
  }

  private buildModeSelector(): void {
    const x = GAME_WIDTH / 2 - 160;
    const y = GAME_HEIGHT - 175;

    this.add
      .text(x, y - 32, 'Modo de jogo', {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '14px',
        color: '#a8c0a8',
      })
      .setOrigin(0.5);

    this.modeButton = this.add
      .rectangle(x, y, 240, 42, 0x2a2417)
      .setStrokeStyle(2, COLORS.accent)
      .setInteractive({ useHandCursor: true })
      .setDepth(20);

    this.modeButtonLabel = this.add
      .text(x, y, `${MODE_LABELS[GameSettingsStore.getMode()]}  ▾`, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '17px',
        color: '#f4d77b',
      })
      .setOrigin(0.5)
      .setDepth(21);

    this.modeButton.on('pointerup', () => {
      if (this.closingDropdown) return;
      this.toggleDropdown(x, y);
    });
  }

  private buildPlayersSelector(): void {
    const x = GAME_WIDTH / 2 + 160;
    const y = GAME_HEIGHT - 175;

    this.add
      .text(x, y - 32, 'Jogadores', {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '14px',
        color: '#a8c0a8',
      })
      .setOrigin(0.5);

    this.playersButton = this.add
      .rectangle(x, y, 240, 42, 0x2a2417)
      .setStrokeStyle(2, COLORS.accent)
      .setInteractive({ useHandCursor: true })
      .setDepth(20);

    this.playersButtonLabel = this.add
      .text(x, y, this.playersLabel(GameSettingsStore.getPlayerCount()), {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '17px',
        color: '#f4d77b',
      })
      .setOrigin(0.5)
      .setDepth(21);

    this.playersButton.on('pointerup', () => {
      const next: PlayerCount = GameSettingsStore.getPlayerCount() === 1 ? 2 : 1;
      GameSettingsStore.setPlayerCount(next);
      this.playersButtonLabel.setText(this.playersLabel(next));
      if (next === 2) this.showCoopHint();
      else this.coopHint?.destroy(true);
    });
  }

  private playersLabel(count: PlayerCount): string {
    return count === 1 ? '1 Jogador' : '2 Jogadores';
  }

  private showCoopHint(): void {
    this.coopHint?.destroy(true);
    const bg = this.add
      .rectangle(0, 0, 520, 78, 0x1a2a1e, 0.96)
      .setStrokeStyle(2, COLORS.accent);
    const title = this.add
      .text(0, -18, 'Modo 2 Jogadores', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '18px',
        color: '#f4d77b',
      })
      .setOrigin(0.5);
    const body = this.add
      .text(0, 12, 'P1: WASD move · IJKL mira\nP2: Setas move · Mouse mira', {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '14px',
        color: '#e8f0e8',
        align: 'center',
      })
      .setOrigin(0.5);

    this.coopHint = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT - 250, [bg, title, body])
      .setDepth(80);

    this.time.delayedCall(4500, () => {
      this.coopHint?.destroy(true);
      this.coopHint = undefined;
    });
  }

  private closeDropdown(): void {
    if (!this.dropdown && !this.dropdownBlocker) return;
    this.closingDropdown = true;
    const dropdown = this.dropdown;
    const blocker = this.dropdownBlocker;
    this.dropdown = undefined;
    this.dropdownBlocker = undefined;

    // Destroy after the current input event finishes — sync destroy freezes Phaser.
    this.time.delayedCall(0, () => {
      dropdown?.destroy(true);
      blocker?.destroy();
      this.closingDropdown = false;
    });
  }

  private toggleDropdown(x: number, y: number): void {
    if (this.dropdown) {
      this.closeDropdown();
      return;
    }

    this.dropdownBlocker = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.001)
      .setInteractive()
      .setDepth(55);
    this.dropdownBlocker.on('pointerup', () => this.closeDropdown());

    // Open upward, clear of Começar / Marã
    this.dropdown = this.add.container(x, y - 28).setDepth(60);
    const panel = this.add
      .rectangle(0, -95, 240, 182, 0x141c16, 0.98)
      .setStrokeStyle(2, COLORS.accent)
      .setInteractive();
    this.dropdown.add(panel);

    const options: Array<{ id: GameModeId; locked?: boolean }> = [
      { id: 'infinite' },
      { id: 'waves' },
      { id: 'free' },
      { id: 'story', locked: true },
    ];

    options.forEach((opt, i) => {
      const oy = -160 + i * 44;
      const selected = !opt.locked && GameSettingsStore.getMode() === opt.id;
      const bg = this.add
        .rectangle(0, oy, 220, 38, selected ? 0x3b3220 : 0x1a2a1e)
        .setStrokeStyle(1, selected ? COLORS.accent : COLORS.cardBorder)
        .setInteractive({ useHandCursor: !opt.locked });
      const label = this.add
        .text(0, oy, opt.locked ? 'História (em breve)' : MODE_LABELS[opt.id], {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '16px',
          color: opt.locked ? '#666' : '#e8f0e8',
        })
        .setOrigin(0.5);

      if (!opt.locked) {
        bg.on('pointerover', () => {
          if (bg.active) bg.setFillStyle(0x243528);
        });
        bg.on('pointerout', () => {
          if (bg.active) bg.setFillStyle(selected ? 0x3b3220 : 0x1a2a1e);
        });
        bg.on('pointerup', () => {
          GameSettingsStore.setMode(opt.id);
          this.modeButtonLabel.setText(`${MODE_LABELS[opt.id]}  ▾`);
          this.closeDropdown();
        });
      }

      this.dropdown?.add([bg, label]);
    });
  }

  private buildShop(): void {
    this.shopContainer = this.add.container(GAME_WIDTH / 2, 340);

    const title = this.add
      .text(0, -150, 'Melhorias Permanentes', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '24px',
        color: '#c4a35a',
      })
      .setOrigin(0.5);
    this.shopContainer.add(title);

    META_UPGRADE_DEFS.forEach((def, i) => {
      const x = (i - 1.5) * 220;
      const level = this.profile.metaLevels[def.id];
      const cost = metaCost(level);
      const maxed = level >= def.maxLevel;

      const bg = this.add
        .rectangle(x, 0, 200, 130, COLORS.cardBg, 0.95)
        .setStrokeStyle(2, COLORS.cardBorder)
        .setInteractive({ useHandCursor: true });

      const name = this.add
        .text(x, -42, def.name, {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '17px',
          color: '#e8f0e8',
        })
        .setOrigin(0.5);

      const desc = this.add
        .text(x, -14, def.description, {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '11px',
          color: '#a8c0a8',
          align: 'center',
          wordWrap: { width: 180 },
        })
        .setOrigin(0.5);

      const levelText = this.add
        .text(x, 24, `Nível ${level}/${def.maxLevel}`, {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '13px',
          color: '#c4a35a',
        })
        .setOrigin(0.5);

      const costText = this.add
        .text(x, 46, maxed ? 'MÁXIMO' : `${cost} moedas`, {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '13px',
          color: maxed ? '#666' : '#e8f0e8',
        })
        .setOrigin(0.5);

      bg.on('pointerover', () => bg.setFillStyle(0x243528, 0.95));
      bg.on('pointerout', () => bg.setFillStyle(COLORS.cardBg, 0.95));
      bg.on('pointerdown', () => {
        const result = tryBuyMeta(def.id);
        this.profile = result.profile;
        this.refreshCoins();
        this.shopContainer.destroy(true);
        this.buildShop();
      });

      this.shopContainer.add([bg, name, desc, levelText, costText]);
    });
  }

  private buildStartButton(): void {
    const x = GAME_WIDTH / 2 - 140;
    const y = GAME_HEIGHT - 60;
    const btn = this.add
      .rectangle(x, y, 250, 52, COLORS.accent, 1)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, 'COMEÇAR', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '26px',
        color: '#0d1a12',
      })
      .setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0xd4b86a));
    btn.on('pointerout', () => btn.setFillStyle(COLORS.accent));
    btn.on('pointerdown', () => {
      if (GameSettingsStore.getMode() === 'free') {
        this.lockUiInput();
        this.freeSetup.open(
          SaveManager.load(),
          (config) => {
            this.unlockUiInputSoon();
            GameSettingsStore.setFreeConfig(config);
            this.scene.start('GameScene');
          },
          () => {
            this.unlockUiInputSoon();
          },
        );
        return;
      }
      this.scene.start('GameScene');
    });
  }

  /** Impede o clique do overlay HTML de “furar” para Marã / Começar no canvas. */
  private lockUiInput(): void {
    this.input.enabled = false;
  }

  private unlockUiInputSoon(): void {
    this.time.delayedCall(320, () => {
      this.input.enabled = true;
    });
  }

  private buildAlmanacButton(): void {
    const x = GAME_WIDTH / 2 + 140;
    const y = GAME_HEIGHT - 60;
    const button = this.add
      .rectangle(x, y, 250, 52, 0x2a2417, 1)
      .setStrokeStyle(2, COLORS.accent)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, 'MARÃ', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '24px',
        color: '#f4d77b',
      })
      .setOrigin(0.5);

    button.on('pointerover', () => button.setFillStyle(0x3b3220));
    button.on('pointerout', () => button.setFillStyle(0x2a2417));
    button.on('pointerdown', () => this.scene.launch('AlmanacScene'));
  }
}
