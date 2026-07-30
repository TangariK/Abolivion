import Phaser from 'phaser';
import { PLAYER_BASE } from '../config/GameConfig';
import type { PlayerStats, StatusHudEntry } from '../data/types';

export type MoveKeys = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

const POISON_DURATION = 4000;
const BLEED_DURATION = 3500;
const LETHARGY_DURATION = 3500;
const DIZZY_DURATION = 2200;
const POISON_TICK = 500;
const BLEED_TICK = 400;
const LETHARGY_DOT_TICK = 600;
const POISON_DPS = 2.5;
const BLEED_DPS = 3;
const LETHARGY_DOT = 1.5;
const LETHARGY_SPEED_MUL = 0.62;
const DIZZY_SPEED_MUL = 0.48;

export class Player extends Phaser.Physics.Arcade.Sprite {
  stats: PlayerStats;
  readonly playerIndex: 1 | 2;
  aimAngle = 0;
  /** Multiplicador de duração de debuffs (amuleto). */
  debuffDurationMul = 1;
  private invulnerableUntil = 0;
  private moveVec = new Phaser.Math.Vector2();
  private poisonUntil = 0;
  private poisonTotal = POISON_DURATION;
  private bleedUntil = 0;
  private bleedTotal = BLEED_DURATION;
  private lethargyUntil = 0;
  private lethargyTotal = LETHARGY_DURATION;
  private lethargyDamaging = false;
  private dizzyUntil = 0;
  private dizzyTotal = DIZZY_DURATION;
  private nextPoisonTick = 0;
  private nextBleedTick = 0;
  private nextLethargyTick = 0;
  choiceProtected = false;
  canShoot = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    stats: PlayerStats,
    playerIndex: 1 | 2 = 1,
  ) {
    super(scene, x, y, playerIndex === 1 ? 'player' : 'player2');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.playerIndex = playerIndex;
    this.stats = {
      ...stats,
      poisonDamageMul: stats.poisonDamageMul ?? 1,
      bleedDamageMul: stats.bleedDamageMul ?? 1,
    };
    this.setDepth(10);
    this.setCollideWorldBounds(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(PLAYER_BASE.radius);
  }

  private debuffMs(base: number): number {
    return Math.max(400, Math.floor(base * this.debuffDurationMul));
  }

  /** Multiplicador temporário (corrida / effects). */
  moveSpeedMul = 1;

  /** Velocidade efetiva com Letargia / Tontura. */
  effectiveSpeed(now: number): number {
    let mul = this.moveSpeedMul;
    if (this.isDizzy(now)) mul *= DIZZY_SPEED_MUL;
    else if (this.isLethargic(now)) mul *= LETHARGY_SPEED_MUL;
    return this.stats.speed * mul;
  }

  updateMovement(dirs: MoveKeys): void {
    if (this.isDead()) {
      this.setVelocity(0, 0);
      return;
    }

    this.moveVec.set(0, 0);
    if (dirs.left) this.moveVec.x -= 1;
    if (dirs.right) this.moveVec.x += 1;
    if (dirs.up) this.moveVec.y -= 1;
    if (dirs.down) this.moveVec.y += 1;

    if (this.moveVec.lengthSq() > 0) {
      this.moveVec.normalize().scale(this.effectiveSpeed(this.scene.time.now));
    }

    this.setVelocity(this.moveVec.x, this.moveVec.y);
  }

  setAimAngle(angle: number): void {
    this.aimAngle = angle;
  }

  takeDamage(amount: number, now: number): boolean {
    if (this.isDead()) return false;
    if (this.choiceProtected) return false;
    if (now < this.invulnerableUntil) return false;
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.invulnerableUntil = now + 500;
    this.setTint(0xff8888);
    this.scene.time.delayedCall(120, () => {
      if (this.active && !this.choiceProtected) this.clearTint();
    });
    return true;
  }

  applyPoison(now: number): void {
    if (this.isDead() || this.choiceProtected) return;
    const dur = this.debuffMs(POISON_DURATION);
    this.poisonTotal = dur;
    this.poisonUntil = Math.max(this.poisonUntil, now + dur);
  }

  applyBleed(now: number): void {
    if (this.isDead() || this.choiceProtected) return;
    const dur = this.debuffMs(BLEED_DURATION);
    this.bleedTotal = dur;
    this.bleedUntil = Math.max(this.bleedUntil, now + dur);
  }

  /** Letargia: deixa lento. Se damaging, também aplica DoT leve. */
  applyLethargy(now: number, damaging = false, durationMs = LETHARGY_DURATION): void {
    if (this.isDead() || this.choiceProtected) return;
    const dur = this.debuffMs(durationMs);
    this.lethargyTotal = dur;
    this.lethargyUntil = Math.max(this.lethargyUntil, now + dur);
    if (damaging) this.lethargyDamaging = true;
  }

  applyDizzy(now: number, durationMs = DIZZY_DURATION): void {
    if (this.isDead() || this.choiceProtected) return;
    const dur = this.debuffMs(durationMs);
    this.dizzyTotal = dur;
    this.dizzyUntil = Math.max(this.dizzyUntil, now + dur);
  }

  isPoisoned(now: number): boolean {
    return now < this.poisonUntil && !this.isDead();
  }

  isBleeding(now: number): boolean {
    return now < this.bleedUntil && !this.isDead();
  }

  isLethargic(now: number): boolean {
    return now < this.lethargyUntil && !this.isDead();
  }

  isDizzy(now: number): boolean {
    return now < this.dizzyUntil && !this.isDead();
  }

  getStatusHudEntries(now: number): StatusHudEntry[] {
    const out: StatusHudEntry[] = [];
    if (this.isPoisoned(now)) {
      out.push({
        id: 'poison',
        label: 'Veneno',
        color: '#8fd46a',
        remainingMs: Math.max(0, this.poisonUntil - now),
        totalMs: this.poisonTotal,
      });
    }
    if (this.isBleeding(now)) {
      out.push({
        id: 'bleed',
        label: 'Sangramento',
        color: '#e87878',
        remainingMs: Math.max(0, this.bleedUntil - now),
        totalMs: this.bleedTotal,
      });
    }
    if (this.isLethargic(now)) {
      out.push({
        id: 'lethargy',
        label: 'Letargia',
        color: '#b48cff',
        remainingMs: Math.max(0, this.lethargyUntil - now),
        totalMs: this.lethargyTotal,
      });
    }
    if (this.isDizzy(now)) {
      out.push({
        id: 'dizzy',
        label: 'Tontura',
        color: '#f0c060',
        remainingMs: Math.max(0, this.dizzyUntil - now),
        totalMs: this.dizzyTotal,
      });
    }
    return out;
  }

  tickStatuses(now: number): number {
    if (this.isDead() || this.choiceProtected) return 0;
    let dealt = 0;
    if (this.isPoisoned(now) && now >= this.nextPoisonTick) {
      this.nextPoisonTick = now + POISON_TICK;
      const dmg = POISON_DPS * (this.stats.poisonDamageMul ?? 1);
      this.stats.hp = Math.max(0, this.stats.hp - dmg);
      dealt += dmg;
      this.setTint(0x88cc66);
      this.scene.time.delayedCall(80, () => {
        if (this.active && !this.choiceProtected) this.clearTint();
      });
    }
    if (this.isBleeding(now) && now >= this.nextBleedTick) {
      this.nextBleedTick = now + BLEED_TICK;
      const dmg = BLEED_DPS * (this.stats.bleedDamageMul ?? 1);
      this.stats.hp = Math.max(0, this.stats.hp - dmg);
      dealt += dmg;
      this.setTint(0xcc4444);
      this.scene.time.delayedCall(80, () => {
        if (this.active && !this.choiceProtected) this.clearTint();
      });
    }
    if (this.isLethargic(now) && this.lethargyDamaging && now >= this.nextLethargyTick) {
      this.nextLethargyTick = now + LETHARGY_DOT_TICK;
      const dmg = LETHARGY_DOT * (this.stats.poisonDamageMul ?? 1);
      this.stats.hp = Math.max(0, this.stats.hp - dmg);
      dealt += dmg;
      this.setTint(0xa070e0);
      this.scene.time.delayedCall(80, () => {
        if (this.active && !this.choiceProtected) this.clearTint();
      });
    }
    if (!this.isLethargic(now)) this.lethargyDamaging = false;
    return dealt;
  }

  setChoiceProtected(on: boolean): void {
    this.choiceProtected = on;
    if (on) {
      this.canShoot = false;
      this.setTint(0xf4d77b);
      this.setAlpha(0.95);
    } else {
      this.clearTint();
      if (!this.isDead()) {
        this.setAlpha(1);
        this.canShoot = true;
      } else {
        this.canShoot = false;
      }
    }
  }

  regenerate(amount: number): void {
    if (this.stats.hp <= 0) return;
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
  }

  isDead(): boolean {
    return this.stats.hp <= 0;
  }

  revive(now: number, hpRatio = 0.5): void {
    this.stats.hp = Math.max(1, Math.floor(this.stats.maxHp * hpRatio));
    this.invulnerableUntil = now + 2000;
    this.poisonUntil = 0;
    this.bleedUntil = 0;
    this.lethargyUntil = 0;
    this.dizzyUntil = 0;
    this.lethargyDamaging = false;
    this.setTint(0xf4d77b);
    this.setAlpha(1);
    this.canShoot = true;
    this.choiceProtected = false;
    this.scene.time.delayedCall(500, () => {
      if (this.active) this.clearTint();
    });
  }

  applyUpgrade(fn: (stats: PlayerStats) => void): void {
    fn(this.stats);
  }

  syncStatsFrom(source: PlayerStats): void {
    const hpRatio = this.stats.maxHp > 0 ? this.stats.hp / this.stats.maxHp : 1;
    this.stats = {
      ...source,
      poisonDamageMul: source.poisonDamageMul ?? 1,
      bleedDamageMul: source.bleedDamageMul ?? 1,
      hp: Math.min(source.maxHp, Math.max(1, Math.floor(source.maxHp * hpRatio))),
    };
  }
}
