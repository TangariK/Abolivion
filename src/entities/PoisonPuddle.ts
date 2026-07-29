import Phaser from 'phaser';

/** Poça de veneno no chão (Envenenador Master). Roxa = Letargia. */
export class PoisonPuddle extends Phaser.GameObjects.Arc {
  private ttl: number;
  private readonly radiusHit: number;
  private nextTick = 0;
  /** Poça roxa: aplica Letargia (com DoT) em vez de só veneno. */
  readonly appliesLethargy: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius = 52,
    ttlMs = 4500,
    purple = false,
  ) {
    super(scene, x, y, radius, 0, 360, false, purple ? 0x6a40a0 : 0x3d8a2a, 0.35);
    scene.add.existing(this);
    this.setStrokeStyle(2, purple ? 0xb48cff : 0x8fd46a, 0.7);
    this.setDepth(3);
    this.ttl = ttlMs;
    this.radiusHit = radius;
    this.appliesLethargy = purple;
  }

  get hitRadius(): number {
    return this.radiusHit;
  }

  update(time: number, delta: number): boolean {
    this.ttl -= delta;
    this.setAlpha(0.2 + 0.2 * Math.sin(time / 180));
    return this.ttl > 0;
  }

  canTick(time: number): boolean {
    if (time < this.nextTick) return false;
    this.nextTick = time + 400;
    return true;
  }
}
