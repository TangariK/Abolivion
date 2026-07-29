import Phaser from 'phaser';
import type { Player } from '../entities/Player';

/** Controles: solo = WASD+mouse; local2 = split P1/P2; online = cada cliente usa solo no P1. */
export type ControlScheme = 'solo' | 'local2' | 'online';

export class InputSystem {
  private readonly escape: Phaser.Input.Keyboard.Key;
  private readonly wasd: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private readonly arrows: {
    UP: Phaser.Input.Keyboard.Key;
    LEFT: Phaser.Input.Keyboard.Key;
    DOWN: Phaser.Input.Keyboard.Key;
    RIGHT: Phaser.Input.Keyboard.Key;
  };
  private readonly aim: {
    I: Phaser.Input.Keyboard.Key;
    J: Phaser.Input.Keyboard.Key;
    K: Phaser.Input.Keyboard.Key;
    L: Phaser.Input.Keyboard.Key;
  };
  private scheme: ControlScheme;

  constructor(scene: Phaser.Scene, scheme: ControlScheme | 1 | 2) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard required');
    // Compat: 1 | 2 antigos
    this.scheme = scheme === 1 ? 'solo' : scheme === 2 ? 'local2' : scheme;
    this.wasd = {
      W: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.arrows = {
      UP: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      LEFT: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      DOWN: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      RIGHT: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    };
    this.aim = {
      I: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I),
      J: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      K: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
      L: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
    };
    this.escape = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  /** Direções WASD atuais (para sync online). */
  getWasdMove(): { up: boolean; down: boolean; left: boolean; right: boolean } {
    return {
      up: this.wasd.W.isDown,
      down: this.wasd.S.isDown,
      left: this.wasd.A.isDown,
      right: this.wasd.D.isDown,
    };
  }

  update(scene: Phaser.Scene, player1: Player, player2?: Player): void {
    if (this.scheme === 'solo' || this.scheme === 'online') {
      this.applySoloMouse(scene, player1);
      return;
    }

    // local2 — se um morreu, o vivo herda controles solo (WASD+mouse)
    const p1Alive = !player1.isDead();
    const p2Alive = Boolean(player2 && !player2.isDead());
    if (p1Alive && !p2Alive) {
      this.applySoloMouse(scene, player1);
      return;
    }
    if (!p1Alive && p2Alive && player2) {
      this.applySoloMouse(scene, player2);
      return;
    }

    player1.updateMovement({
      up: this.wasd.W.isDown,
      down: this.wasd.S.isDown,
      left: this.wasd.A.isDown,
      right: this.wasd.D.isDown,
    });

    const aimX = (this.aim.L.isDown ? 1 : 0) - (this.aim.J.isDown ? 1 : 0);
    const aimY = (this.aim.K.isDown ? 1 : 0) - (this.aim.I.isDown ? 1 : 0);
    if (aimX !== 0 || aimY !== 0) {
      player1.setAimAngle(Math.atan2(aimY, aimX));
    }

    if (player2 && !player2.isDead()) {
      player2.updateMovement({
        up: this.arrows.UP.isDown,
        down: this.arrows.DOWN.isDown,
        left: this.arrows.LEFT.isDown,
        right: this.arrows.RIGHT.isDown,
      });
      const pointer = scene.input.activePointer;
      const world = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      player2.setAimAngle(
        Phaser.Math.Angle.Between(player2.x, player2.y, world.x, world.y),
      );
    }
  }

  private applySoloMouse(scene: Phaser.Scene, player: Player): void {
    if (player.isDead()) {
      player.updateMovement({ up: false, down: false, left: false, right: false });
      return;
    }
    player.updateMovement({
      up: this.wasd.W.isDown || this.arrows.UP.isDown,
      down: this.wasd.S.isDown || this.arrows.DOWN.isDown,
      left: this.wasd.A.isDown || this.arrows.LEFT.isDown,
      right: this.wasd.D.isDown || this.arrows.RIGHT.isDown,
    });
    const pointer = scene.input.activePointer;
    const world = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    player.setAimAngle(
      Phaser.Math.Angle.Between(player.x, player.y, world.x, world.y),
    );
  }

  isPausePressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.escape);
  }
}
