import Phaser from 'phaser';
import { ENEMY_DEFS } from '../data/EnemyCatalog';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';

/**
 * Inteligência de cerco / costas.
 * intel 0 = chase puro; 1 = flanqueia com frequência.
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
  // Para overlap de contato: dist < pr+er. Para ~não engolir: ~55% do raio do inimigo fora.
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

  const flankChance = intel * (facingEnemy ? 0.55 : 0.35);
  if (intel > 0.05 && Math.random() < flankChance * 0.08) {
    enemy.flankSide = Math.random() < 0.5 ? -1 : 1;
  }

  let moveAngle = toward;
  const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, target.x, target.y);
  const stopAt = standoffDistance(enemy, target);

  // Perto o bastante: vai direto no contato (sem flanquear infinito)
  if (dist < stopAt * 2.2) {
    moveWithStandoff(enemy, target, toward, enemy.moveSpeed);
    return;
  }

  if (intel > 0.15 && (enemy.flankSide !== 0 || Math.random() < flankChance)) {
    if (enemy.flankSide === 0) enemy.flankSide = Math.random() < 0.5 ? -1 : 1;
    const sideBias = 0.55 + intel * 0.9;
    moveAngle = toward + enemy.flankSide * sideBias;
    const behind = target.aimAngle + Math.PI;
    moveAngle = Phaser.Math.Angle.Wrap(
      Phaser.Math.Angle.RotateTo(moveAngle, behind, 0.15 * intel),
    );
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

  // Fase final: avança e encosta (sangramento)
  if (dist < stopAt * 2.4) {
    moveWithStandoff(enemy, target, toward, enemy.moveSpeed * 1.1);
    return;
  }

  let moveAngle = toward;
  if (facing) {
    if (enemy.flankSide === 0) enemy.flankSide = aimDiff >= 0 ? 1 : -1;
    const behind = target.aimAngle + Math.PI;
    const side = toward + enemy.flankSide * 1.2;
    moveAngle = Phaser.Math.Angle.Wrap(
      Phaser.Math.Angle.RotateTo(side, behind, 0.28),
    );
  } else {
    const behindX = target.x - Math.cos(target.aimAngle) * 55;
    const behindY = target.y - Math.sin(target.aimAngle) * 55;
    moveAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, behindX, behindY);
    enemy.flankSide = 0;
  }

  const speed = enemy.moveSpeed * (facing ? 1.12 : 1.08);
  moveWithStandoff(enemy, target, moveAngle, speed);
}
