import Phaser from 'phaser';
import type { PlayerCount } from '../data/GameModeStore';
import type { Player } from '../entities/Player';

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
  private readonly playerCount: PlayerCount;

  constructor(scene: Phaser.Scene, playerCount: PlayerCount) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard required');
    this.playerCount = playerCount;
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

  update(scene: Phaser.Scene, player1: Player, player2?: Player): void {
    if (this.playerCount === 1) {
      player1.updateMovement({
        up: this.wasd.W.isDown || this.arrows.UP.isDown,
        down: this.wasd.S.isDown || this.arrows.DOWN.isDown,
        left: this.wasd.A.isDown || this.arrows.LEFT.isDown,
        right: this.wasd.D.isDown || this.arrows.RIGHT.isDown,
      });
      const pointer = scene.input.activePointer;
      const world = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      player1.setAimAngle(
        Phaser.Math.Angle.Between(player1.x, player1.y, world.x, world.y),
      );
      return;
    }

    // 2 players: P1 WASD + IJKL aim, P2 arrows + auto-aim
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
    }
  }

  isPausePressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.escape);
  }
}
