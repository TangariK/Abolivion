import Phaser from 'phaser';
import type { Enemy } from './Enemy';
import type { Player } from './Player';

export class DogCompanion extends Phaser.Physics.Arcade.Sprite {
  private target?: Enemy;
  private nextAttackAt = 0;
  private nextTargetAt = 0;

  constructor(scene: Phaser.Scene, private readonly player: Player) {
    super(scene, player.x + 35, player.y, 'dog_companion');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(9);
    (this.body as Phaser.Physics.Arcade.Body).setCircle(9);
  }

  update(
    time: number,
    enemies: Phaser.Physics.Arcade.Group,
    damageEnemy: (enemy: Enemy, damage: number) => void,
  ): void {
    if (!this.target?.active || time >= this.nextTargetAt) {
      this.target = this.pickRandomTarget(enemies);
      this.nextTargetAt = time + 1800;
    }

    if (!this.target) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
      if (distance > 55) this.scene.physics.moveToObject(this, this.player, 190);
      else this.setVelocity(0, 0);
      return;
    }

    this.scene.physics.moveToObject(this, this.target, 260);
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    if (distance <= 24 && time >= this.nextAttackAt) {
      damageEnemy(this.target, 12);
      this.nextAttackAt = time + 550;
      this.nextTargetAt = 0;
    }
  }

  private pickRandomTarget(enemies: Phaser.Physics.Arcade.Group): Enemy | undefined {
    const active = (enemies.getChildren() as Enemy[]).filter((enemy) => enemy.active);
    return active.length > 0 ? Phaser.Utils.Array.GetRandom(active) : undefined;
  }
}
