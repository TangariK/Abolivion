import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import { GameSettingsStore, type PlayStyle } from '../data/GameModeStore';
import type { GameModeId, Profile } from '../data/types';
import { AuthService } from '../services/AuthService';
import { AchievementToast } from '../ui/AchievementToast';
import { FreeModeSetupOverlay } from '../ui/FreeModeSetupOverlay';
import { OnlineLobbyOverlay } from '../ui/OnlineLobbyOverlay';
import { ProfileOverlay } from '../ui/ProfileOverlay';
import { MuralOverlay } from '../ui/MuralOverlay';
import { SoundOptionsOverlay } from '../ui/SoundOptionsOverlay';
import { AudioService } from '../services/AudioService';
import { SaveManager } from '../upgrades/MetaUpgrades';
import { CabinOverlay } from '../ui/CabinOverlay';
import { ShopOverlay } from '../ui/ShopOverlay';
import { activeCouraca, ownsEmblem } from '../data/EmblemRuntime';

const MODE_LABELS: Record<GameModeId, string> = {
  infinite: 'Infinito',
  waves: 'Rodadas',
  free: 'Livre',
  story: 'História',
};

export class MenuScene extends Phaser.Scene {
  private profile!: Profile;
  private coinsText!: Phaser.GameObjects.Text;
  private hubContainer!: Phaser.GameObjects.Container;
  private modeButton!: Phaser.GameObjects.Rectangle;
  private modeButtonLabel!: Phaser.GameObjects.Text;
  private playersButton!: Phaser.GameObjects.Rectangle;
  private playersButtonLabel!: Phaser.GameObjects.Text;
  private dropdown?: Phaser.GameObjects.Container;
  private dropdownBlocker?: Phaser.GameObjects.Rectangle;
  private closingDropdown = false;
  /** Bloqueia Começar/Marã por um instante após fechar overlay HTML (anti click-through). */
  private uiIgnoreUntil = 0;
  private coopHint?: Phaser.GameObjects.Container;
  private profileButtonLabel!: Phaser.GameObjects.Text;
  private profileSilhouette!: Phaser.GameObjects.Graphics;
  private guestHint!: Phaser.GameObjects.Text;
  private clanBg!: Phaser.GameObjects.Arc;
  private clanGlyph!: Phaser.GameObjects.Text;
  private clanLabel!: Phaser.GameObjects.Text;
  private profileOverlay = new ProfileOverlay();
  private muralOverlay = new MuralOverlay();
  private shopOverlay = new ShopOverlay();
  private cabinOverlay = new CabinOverlay();
  private freeSetup = new FreeModeSetupOverlay();
  private onlineLobby = new OnlineLobbyOverlay();
  private soundOverlay = new SoundOptionsOverlay();
  private toasts!: AchievementToast;
  private unsubAuth?: () => void;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.profile = SaveManager.load();
    this.toasts = new AchievementToast(this);
    this.closingDropdown = false;
    this.dropdown = undefined;
    this.dropdownBlocker = undefined;
    this.input.enabled = true;
    this.uiIgnoreUntil = 0;
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
    this.buildMuralButton();
    this.buildClanButton();
    this.buildHub();
    this.buildModeSelector();
    this.buildPlayersSelector();
    this.buildStartButton();
    this.buildSoundButton();
    this.buildAlmanacButton();
    this.handleDeepLinkSala();
    AudioService.bind(this);
    AudioService.stopAllMusic();
    AudioService.playMusic('music_menu');

    this.unsubAuth = AuthService.onChange(() => {
      this.profile = SaveManager.load();
      this.refreshCoins();
      this.refreshProfileButton();
    });
    this.events.once('shutdown', () => {
      this.unsubAuth?.();
      this.profileOverlay.close();
      this.muralOverlay.close();
      this.shopOverlay.close();
      this.cabinOverlay.close();
      this.freeSetup.close();
      this.soundOverlay.close();
    });
  }

  private refreshCoins(): void {
    const resin = this.profile.resin ?? 0;
    const showResin = (this.profile.almanac.emblems ?? []).includes('emblem_kurupi');
    this.coinsText.setText(
      showResin
        ? `Moedas: ${this.profile.currency}  ·  Resina: ${resin}`
        : `Moedas: ${this.profile.currency}`,
    );
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
      AudioService.playSfx('sfx_ui_click');
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

  private buildMuralButton(): void {
    const x = 56;
    const y = 42;
    const bg = this.add
      .circle(x, y, 26, 0x1a2a1e)
      .setStrokeStyle(2, COLORS.accent)
      .setInteractive({ useHandCursor: true })
      .setDepth(40);
    this.add
      .text(x, y, 'MT', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '16px',
        color: '#f4d77b',
      })
      .setOrigin(0.5)
      .setDepth(41);
    this.add
      .text(x, y + 36, 'Mural', {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '11px',
        color: '#c4a35a',
      })
      .setOrigin(0.5, 0)
      .setDepth(41);

    bg.on('pointerover', () => bg.setFillStyle(0x243528));
    bg.on('pointerout', () => bg.setFillStyle(0x1a2a1e));
    bg.on('pointerup', () => {
      if (this.time.now < this.uiIgnoreUntil) return;
      AudioService.playSfx('sfx_ui_click');
      this.lockUiInput();
      this.muralOverlay.open(() => this.unlockUiInputSoon());
    });
  }

  private buildClanButton(): void {
    const x = 120;
    const y = 42;
    this.clanBg = this.add
      .circle(x, y, 26, 0x1a1a1a)
      .setStrokeStyle(2, 0x555555)
      .setInteractive({ useHandCursor: true })
      .setDepth(40);
    this.clanGlyph = this.add
      .text(x, y, 'Cl', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '16px',
        color: '#666',
      })
      .setOrigin(0.5)
      .setDepth(41);
    this.clanLabel = this.add
      .text(x, y + 36, 'Clã', {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '11px',
        color: '#666',
      })
      .setOrigin(0.5, 0)
      .setDepth(41);

    this.refreshClanButton();

    this.clanBg.on('pointerover', () => {
      const unlocked = this.isClanUnlocked();
      this.clanBg.setFillStyle(unlocked ? 0x243528 : 0x222);
    });
    this.clanBg.on('pointerout', () => {
      const unlocked = this.isClanUnlocked();
      this.clanBg.setFillStyle(unlocked ? 0x1a2a1e : 0x1a1a1a);
    });
    this.clanBg.on('pointerup', () => {
      if (this.time.now < this.uiIgnoreUntil) return;
      AudioService.playSfx('sfx_ui_click');
      this.lockUiInput();
      this.profile = SaveManager.load();
      const unlocked = this.isClanUnlocked();
      this.showToast(
        unlocked
          ? 'Clã — em breve (progressão coletiva).'
          : ownsEmblem(this.profile, 'emblem_shield')
            ? 'Ative o Emblema da Couraça na Cabana do Pajé.'
            : 'Clã exige o Emblema da Couraça.',
      );
      this.unlockUiInputSoon();
    });
  }

  private isClanUnlocked(): boolean {
    return ownsEmblem(this.profile, 'emblem_shield') && activeCouraca(this.profile);
  }

  private refreshClanButton(): void {
    if (!this.clanBg) return;
    const unlocked = this.isClanUnlocked();
    this.clanBg.setFillStyle(unlocked ? 0x1a2a1e : 0x1a1a1a);
    this.clanBg.setStrokeStyle(2, unlocked ? COLORS.accent : 0x555555);
    this.clanGlyph.setColor(unlocked ? '#f4d77b' : '#666');
    this.clanLabel.setColor(unlocked ? '#c4a35a' : '#666');
  }

  private buildHub(): void {
    this.hubContainer = this.add.container(GAME_WIDTH / 2, 350);

    const makePlate = (
      ox: number,
      title: string,
      subtitle: string,
      fill: number,
      stroke: number,
      onOpen: () => void,
    ) => {
      const bg = this.add
        .rectangle(ox, 0, 300, 120, fill, 0.95)
        .setStrokeStyle(3, stroke)
        .setInteractive({ useHandCursor: true });
      const name = this.add
        .text(ox, -18, title, {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '26px',
          color: '#f4d77b',
        })
        .setOrigin(0.5);
      const sub = this.add
        .text(ox, 22, subtitle, {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '13px',
          color: '#a8c0a8',
          align: 'center',
          wordWrap: { width: 260 },
        })
        .setOrigin(0.5);
      bg.on('pointerover', () => bg.setFillStyle(Phaser.Display.Color.IntegerToColor(fill).brighten(12).color, 0.95));
      bg.on('pointerout', () => bg.setFillStyle(fill, 0.95));
      bg.on('pointerup', () => {
        if (this.time.now < this.uiIgnoreUntil) return;
        AudioService.playSfx('sfx_ui_click');
        this.lockUiInput();
        onOpen();
      });
      this.hubContainer.add([bg, name, sub]);
    };

    makePlate(-170, 'Loja da Tribo', 'Seiva e trocas da aldeia', 0x2a1e14, 0xc4783a, () => {
      this.shopOverlay.open(() => {
        this.profile = SaveManager.load();
        this.refreshCoins();
        this.unlockUiInputSoon();
      });
    });
    makePlate(170, 'Cabana do Pajé', 'Melhorias, emblemas e ritos', 0x1a2a1e, COLORS.accent, () => {
      this.cabinOverlay.open(() => {
        this.profile = SaveManager.load();
        this.refreshCoins();
        this.refreshClanButton();
        this.unlockUiInputSoon();
      });
    });
  }

  private showToast(msg: string): void {
    const t = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 120, msg, {
        fontFamily: 'Segoe UI, Tahoma, sans-serif',
        fontSize: '16px',
        color: '#f4d77b',
        backgroundColor: '#0d1a12',
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(80);
    this.tweens.add({
      targets: t,
      alpha: 0,
      delay: 1600,
      duration: 400,
      onComplete: () => t.destroy(),
    });
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
      AudioService.playSfx(this.dropdown ? 'sfx_ui_click' : 'sfx_ui_open');
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
      .text(x, y, `${this.playStyleLabel(GameSettingsStore.getPlayStyle())}  ▾`, {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '17px',
        color: '#f4d77b',
      })
      .setOrigin(0.5)
      .setDepth(21);

    this.playersButton.on('pointerup', () => {
      if (this.closingDropdown) return;
      AudioService.playSfx(this.dropdown ? 'sfx_ui_click' : 'sfx_ui_open');
      this.togglePlayersDropdown(x, y);
    });
  }

  private playStyleLabel(style: PlayStyle): string {
    if (style === 'solo') return '1 Jogador';
    if (style === 'local2') return '2 Local';
    return 'Online';
  }

  private togglePlayersDropdown(x: number, y: number): void {
    if (this.dropdown) {
      this.closeDropdown();
      return;
    }

    this.dropdownBlocker = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.001)
      .setInteractive()
      .setDepth(55);
    this.dropdownBlocker.on('pointerup', () => this.closeDropdown());

    this.dropdown = this.add.container(x, y - 28).setDepth(60);
    const panel = this.add
      .rectangle(0, -70, 240, 148, 0x141c16, 0.98)
      .setStrokeStyle(2, COLORS.accent)
      .setInteractive();
    this.dropdown.add(panel);

    const options: PlayStyle[] = ['solo', 'local2', 'online'];
    options.forEach((style, i) => {
      const oy = -118 + i * 44;
      const selected = GameSettingsStore.getPlayStyle() === style;
      const bg = this.add
        .rectangle(0, oy, 220, 38, selected ? 0x3b3220 : 0x1a2a1e)
        .setStrokeStyle(1, selected ? COLORS.accent : COLORS.cardBorder)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(0, oy, this.playStyleLabel(style), {
          fontFamily: 'Segoe UI, Tahoma, sans-serif',
          fontSize: '16px',
          color: '#e8f0e8',
        })
        .setOrigin(0.5);

      bg.on('pointerover', () => {
        if (bg.active) bg.setFillStyle(0x243528);
      });
      bg.on('pointerout', () => {
        if (bg.active) bg.setFillStyle(selected ? 0x3b3220 : 0x1a2a1e);
      });
      bg.on('pointerup', () => {
        AudioService.playSfx('sfx_ui_click');
        GameSettingsStore.setPlayStyle(style);
        this.playersButtonLabel.setText(`${this.playStyleLabel(style)}  ▾`);
        if (style === 'local2') this.showCoopHint();
        else if (style === 'online') this.showOnlineHint();
        else this.coopHint?.destroy(true);
        this.closeDropdown();
      });

      this.dropdown?.add([bg, label]);
    });
  }

  private showOnlineHint(): void {
    this.coopHint?.destroy(true);
    const bg = this.add
      .rectangle(0, 0, 520, 78, 0x1a2a1e, 0.96)
      .setStrokeStyle(2, COLORS.accent);
    const title = this.add
      .text(0, -18, 'Modo Online', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '18px',
        color: '#f4d77b',
      })
      .setOrigin(0.5);
    const body = this.add
      .text(0, 12, 'Crie ou entre em uma sala.\nCada um: WASD + mouse (como 1P).', {
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

  private playersLabel(_count: 1 | 2): string {
    return this.playStyleLabel(GameSettingsStore.getPlayStyle());
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

    // Libera o Começar imediatamente (blocker full-screen cobria o botão até o destroy)
    blocker?.disableInteractive();
    dropdown?.each((child: Phaser.GameObjects.GameObject) => {
      const c = child as Phaser.GameObjects.Zone;
      if (typeof c.disableInteractive === 'function') c.disableInteractive();
    });

    this.time.delayedCall(16, () => {
      try {
        dropdown?.destroy(true);
        blocker?.destroy();
      } finally {
        this.closingDropdown = false;
      }
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
          AudioService.playSfx('sfx_ui_click');
          GameSettingsStore.setMode(opt.id);
          this.modeButtonLabel.setText(`${MODE_LABELS[opt.id]}  ▾`);
          this.closeDropdown();
        });
      }

      this.dropdown?.add([bg, label]);
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
      if (this.time.now < this.uiIgnoreUntil) return;
      AudioService.playSfx('sfx_ui_click');
      this.closeDropdown();
      if (GameSettingsStore.getPlayStyle() === 'online') {
        this.lockUiInput();
        this.onlineLobby.open((result) => {
          this.unlockUiInputSoon();
          if (result.action === 'cancel') return;
          this.unlockUiInput();
          GameSettingsStore.setPlayStyle('online');
          GameSettingsStore.setMode(result.gameMode);
          this.scene.start('GameScene', {
            online: true,
            onlineRole: result.action === 'startHost' ? 'host' : 'guest',
          });
        });
        return;
      }
      if (GameSettingsStore.getMode() === 'free') {
        this.lockUiInput();
        this.freeSetup.open(
          SaveManager.load(),
          (config) => {
            this.unlockUiInput();
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

  private handleDeepLinkSala(): void {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('sala');
      if (!code) return;
      window.history.replaceState({}, '', window.location.pathname);
      GameSettingsStore.setPlayStyle('online');
      this.playersButtonLabel?.setText(`${this.playStyleLabel('online')}  ▾`);
      this.lockUiInput();
      this.onlineLobby.open((result) => {
        this.unlockUiInputSoon();
        if (result.action === 'cancel') return;
        this.unlockUiInput();
        GameSettingsStore.setMode(result.gameMode);
        this.scene.start('GameScene', {
          online: true,
          onlineRole: result.action === 'startHost' ? 'host' : 'guest',
        });
      }, code);
    } catch {
      // ignore
    }
  }

  /** Impede o clique do overlay HTML de “furar” para Marã / Começar no canvas. */
  private lockUiInput(): void {
    this.input.enabled = false;
  }

  private unlockUiInput(): void {
    this.input.enabled = true;
  }

  private unlockUiInputSoon(): void {
    this.input.enabled = true;
    // Mantém Começar/Marã surdos um pouco — o input global fica ativo (shop/perfil ok).
    this.uiIgnoreUntil = this.time.now + 320;
  }

  private buildSoundButton(): void {
    // Ao lado do perfil (canto superior direito)
    const x = GAME_WIDTH - 175;
    const y = 42;
    const bg = this.add
      .circle(x, y, 28, 0x2a2417)
      .setStrokeStyle(2, COLORS.accent)
      .setInteractive({ useHandCursor: true })
      .setDepth(40);

    this.add
      .text(x, y + 1, '♪', {
        fontFamily: 'Segoe UI Symbol, Georgia, serif',
        fontSize: '28px',
        color: '#f4d77b',
      })
      .setOrigin(0.5)
      .setDepth(41);

    bg.on('pointerover', () => bg.setFillStyle(0x3b3220));
    bg.on('pointerout', () => bg.setFillStyle(0x2a2417));
    bg.on('pointerup', () => {
      AudioService.playSfx('sfx_ui_click');
      this.lockUiInput();
      this.soundOverlay.open(() => this.unlockUiInputSoon());
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
    button.on('pointerdown', () => {
      if (this.time.now < this.uiIgnoreUntil) return;
      AudioService.playSfx('sfx_ui_click');
      this.scene.launch('AlmanacScene');
    });
  }
}
