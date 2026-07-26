import Phaser from 'phaser';
import type { Player } from '../entities/Player';

export class InputSystem {
  readonly keys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    UP: Phaser.Input.Keyboard.Key;
    LEFT: Phaser.Input.Keyboard.Key;
    DOWN: Phaser.Input.Keyboard.Key;
    RIGHT: Phaser.Input.Keyboard.Key;
  };
  private readonly escape: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard required');
    this.keys = {
      W: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      UP: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      LEFT: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      DOWN: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      RIGHT: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    };
    this.escape = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  update(player: Player): void {
    player.updateMovement(this.keys);
  }

  isPausePressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.escape);
  }
}
