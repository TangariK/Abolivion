import Phaser from 'phaser';
import { ENEMY_DEFS } from '../data/EnemyCatalog';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';

/**
 * Inteligência de cerco / costas.
 * intel 0 = chase puro; 1 = flanqueia com frequência.
 * Flanco é um viés lateral leve — a maior parte do movimento continua no player.
 */
export function intelFromElapsedMs(elapsedMs: number): number {
  const start = 90_000;
  const ramp = 180_000;
  if (elapsedMs <= start) return 0;
  return Math.min(1, (elapsedMs - start) / ramp);
}

export function intelFromWave(wave: number): number {
  if (wave <= 3) return 0;
  return Math.min(1, (wave - 3) / 20);
}

/** Distância mínima: encosta o suficiente para dano, sem sumir dentro do player. */
export function standoffDistance(enemy: Enemy, target: Player): number {
  const er = (enemy.body as Phaser.Physics.Arcade.Body)?.radius
    ?? (enemy.width ? enemy.width * 0.35 : 12);
  const pr = (target.body as Phaser.Physics.Arcade.Body)?.radius ?? 14;
  return pr + er * 0.45;
}

export function moveWithStandoff(
  enemy: Enemy,
  target: Player,
  angle: number,
  speed: number,
): void {
  const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, target.x, target.y);
  const stopAt = standoffDistance(enemy, target);
  const body = enemy.body as Phaser.Physics.Arcade.Body;
  if (dist <= stopAt) {
    body.setVelocity(0, 0);
    return;
  }
  enemy.scene.physics.velocityFromRotation(angle, speed, body.velocity);
}

/** Ângulo de flanco: no máximo ~25° fora da linha reta ao player. */
function approachWithFlank(toward: number, flankSide: number, intel: number): number {
  const maxOffset = 0.22 + intel * 0.22;
  return Phaser.Math.Angle.Wrap(toward + flankSide * maxOffset);
}

export function updateEnemyMovement(
  enemy: Enemy,
  target: Player,
  intel: number,
): void {
  if (!enemy.active || enemy.isBoss) return;

  const def = enemy.enemyType !== 'boss' ? ENEMY_DEFS[enemy.enemyType] : undefined;
  const preferBackstab = def?.preferBackstab || enemy.preferBackstab;

  if (preferBackstab) {
    steerBackstab(enemy, target);
    return;
  }

  const toward = Phaser.Math.Angle.Between(enemy.x, enemy.y, target.x, target.y);
  const toEnemy = Phaser.Math.Angle.Between(target.x, target.y, enemy.x, enemy.y);
  const aimDiff = Math.abs(Phaser.Math.Angle.Wrap(toEnemy - target.aimAngle));
  const facingEnemy = aimDiff < 0.7;

  const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, target.x, target.y);
  const stopAt = standoffDistance(enemy, target);

  // Perto: sempre reto no contato
  if (dist < stopAt * 2.5) {
    enemy.flankSide = 0;
    moveWithStandoff(enemy, target, toward, enemy.moveSpeed);
    return;
  }

  // Troca de lado rara (evita zigue-zague nervoso)
  if (intel > 0.1 && facingEnemy && Math.random() < 0.012 + intel * 0.02) {
    enemy.flankSide = Math.random() < 0.5 ? -1 : 1;
  } else if (!facingEnemy && Math.random() < 0.03) {
    enemy.flankSide = 0;
  }

  let moveAngle = toward;
  if (intel > 0.12 && enemy.flankSide !== 0 && facingEnemy) {
    moveAngle = approachWithFlank(toward, enemy.flankSide, intel);
  }

  moveWithStandoff(enemy, target, moveAngle, enemy.moveSpeed);
}

function steerBackstab(enemy: Enemy, target: Player): void {
  const toward = Phaser.Math.Angle.Between(enemy.x, enemy.y, target.x, target.y);
  const toEnemy = Phaser.Math.Angle.Between(target.x, target.y, enemy.x, enemy.y);
  const aimDiff = Phaser.Math.Angle.Wrap(toEnemy - target.aimAngle);
  const facing = Math.abs(aimDiff) < 0.85;
  const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, target.x, target.y);
  const stopAt = standoffDistance(enemy, target);

  if (dist < stopAt * 2.6) {
    moveWithStandoff(enemy, target, toward, enemy.moveSpeed * 1.1);
    return;
  }

  let moveAngle = toward;
  if (facing) {
    if (enemy.flankSide === 0) enemy.flankSide = aimDiff >= 0 ? 1 : -1;
    // Viés lateral moderado + sempre componente forte na direção do player
    moveAngle = approachWithFlank(toward, enemy.flankSide, 0.85);
  } else {
    const behindX = target.x - Math.cos(target.aimAngle) * 48;
    const behindY = target.y - Math.sin(target.aimAngle) * 48;
    const toBehind = Phaser.Math.Angle.Between(enemy.x, enemy.y, behindX, behindY);
    // Mistura costas com avanço direto (não orbitar)
    moveAngle = Phaser.Math.Angle.Wrap(
      Phaser.Math.Angle.RotateTo(toward, toBehind, 0.4),
    );
    enemy.flankSide = 0;
  }

  const speed = enemy.moveSpeed * (facing ? 1.1 : 1.06);
  moveWithStandoff(enemy, target, moveAngle, speed);
}
