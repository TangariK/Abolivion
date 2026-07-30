import Phaser from 'phaser';
import { ENEMY_DEFS } from '../data/EnemyCatalog';
import type { BossId, EnemyType } from '../data/types';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  netId = 0;
  enemyType: EnemyType | 'boss' = 'normal';
  bossId?: BossId;
  hp = 40;
  maxHp = 40;
  armor = 0;
  /** Camadas restantes após a atual (Escudeiro). */
  armorLayersLeft = 0;
  armorPerLayer = 0;
  moveSpeed = 90;
  contactDamage = 12;
  xpValue = 2;
  isBoss = false;
  preferBackstab = false;
  camouflaged = false;
  /** -1 | 0 | 1 — lado preferido no flanqueio */
  flankSide = 0;
  /** Boss: já entrou em Triggered Mode */
  triggered = false;
  /** Boss acrobat: no ar */
  leaping = false;
  /** Escudo refletor (Mestre do Escudo) */
  reflecting = false;
  /** Variante blindada pós–wave 60 */
  armoredVariant = false;
  /** Cavaleiro amarrado ao shield_master */
  bondedBossNetId = 0;
  /** Cooldown de habilidade (flecha / poção) */
  nextAbilityAt = 0;
  /** Ângulo de órbita preferido ao redor do boss (cavalieros) */
  orbitAngle = 0;
  /** 1 = normal, 2 = elite (NV2) */
  eliteLevel = 1;
  private static nextNetId = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy_normal');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(8);
    this.setActive(false);
    this.setVisible(false);
  }

  spawn(x: number, y: number, type: EnemyType): void {
    const def = ENEMY_DEFS[type];
    this.netId = Enemy.nextNetId++;
    this.isBoss = false;
    this.bossId = undefined;
    this.triggered = false;
    this.leaping = false;
    this.reflecting = false;
    this.armoredVariant = false;
    this.bondedBossNetId = 0;
    this.nextAbilityAt = 0;
    this.orbitAngle = 0;
    this.eliteLevel = 1;
    this.enemyType = type;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.armor = def.armor ?? 0;
    this.armorLayersLeft = Math.max(0, (def.armorLayers ?? 1) - 1);
    this.armorPerLayer = def.armorPerLayer ?? def.armor ?? 0;
    this.moveSpeed = def.speed;
    this.contactDamage = def.damage;
    this.xpValue = def.xp;
    this.preferBackstab = Boolean(def.preferBackstab);
    this.camouflaged = Boolean(def.camouflaged);
    this.flankSide = 0;

    this.setTexture(def.textureKey);
    this.setScale(1);
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.clearTint();
    this.setAlpha(1);
    if (this.armor > 0) this.setTint(0xb0c4d8);
    if (this.camouflaged) {
      this.setTint(def.color);
      this.setAlpha(0.28);
      this.setDepth(6);
    } else {
      this.setDepth(8);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setCircle(def.radius);
    body.reset(x, y);
  }

  /** Variante blindada: +HP + armadura sem trocar o tipo base. */
  promoteArmoredVariant(): void {
    if (this.isBoss || this.armoredVariant || this.enemyType === 'boss') return;
    if (this.enemyType === 'armored' || this.enemyType === 'escudeiro') return;
    this.armoredVariant = true;
    this.hp = Math.floor(this.hp * 1.35);
    this.maxHp = this.hp;
    this.armor = Math.max(this.armor, 35) + 25;
    this.armorLayersLeft = Math.max(this.armorLayersLeft, 0);
    this.xpValue = Math.floor(this.xpValue * 1.35);
    this.setTint(0x9ab0c4);
    this.setScale(this.scale * 1.06);
  }

  /** NV2: mesma forma, mais vida/velocidade/dano (sem usar armor — que vira inimigo blindado). */
  promoteElite(): void {
    if (this.isBoss || this.eliteLevel >= 2 || this.enemyType === 'boss') return;
    this.eliteLevel = 2;
    this.hp = Math.floor(this.hp * 2.15);
    this.maxHp = this.hp;
    this.moveSpeed = Math.floor(this.moveSpeed * 1.28);
    this.contactDamage = Math.floor(this.contactDamage * 1.25);
    this.xpValue = Math.floor(this.xpValue * 1.6);
    this.setScale(1.12);
    if (!this.camouflaged && !this.armoredVariant) this.setTint(0xe8c878);
  }

  spawnBoss(
    x: number,
    y: number,
    boss: {
      id: BossId;
      textureKey: string;
      hp: number;
      speed: number;
      damage: number;
      xp: number;
      radius: number;
      armor?: number;
    },
  ): void {
    this.isBoss = true;
    this.bossId = boss.id;
    this.netId = Enemy.nextNetId++;
    this.enemyType = 'boss';
    this.hp = boss.hp;
    this.maxHp = boss.hp;
    this.armor = boss.armor ?? 0;
    this.armorLayersLeft = 0;
    this.armorPerLayer = 0;
    this.moveSpeed = boss.speed;
    this.contactDamage = boss.damage;
    this.xpValue = boss.xp;
    this.preferBackstab = false;
    this.camouflaged = false;
    this.triggered = false;
    this.leaping = false;
    this.reflecting = false;
    this.armoredVariant = false;
    this.bondedBossNetId = 0;
    this.nextAbilityAt = 0;
    this.orbitAngle = 0;
    this.flankSide = 0;

    this.setTexture(boss.textureKey);
    this.setScale(1);
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.clearTint();
    this.setAlpha(1);
    this.setDepth(9);
    if (this.armor > 0) this.setTint(0xb0c4d8);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setCircle(boss.radius);
    body.reset(x, y);
  }

  /** Camuflado fica mais visível perto do player. */
  updateCamouflage(playerDist: number): void {
    if (!this.camouflaged || !this.active) return;
    if (playerDist < 90) this.setAlpha(0.85);
    else if (playerDist < 160) this.setAlpha(0.45);
    else this.setAlpha(0.25);
  }

  chase(target: Phaser.GameObjects.GameObject): void {
    if (!this.active || this.leaping) return;
    const pos = target as unknown as { x: number; y: number };
    const dist = Phaser.Math.Distance.Between(this.x, this.y, pos.x, pos.y);
    const er = (this.body as Phaser.Physics.Arcade.Body).radius || 12;
    const stopAt = 14 + er * 0.45;
    if (dist <= stopAt) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      return;
    }
    this.scene.physics.moveToObject(this, target, this.moveSpeed);
  }

  takeDamage(amount: number): boolean {
    if (this.reflecting) return false;

    if (this.armor > 0) {
      this.armor -= amount;
      this.setTint(0xe8f0ff);
      this.scene.time.delayedCall(60, () => {
        if (!this.active) return;
        if (this.armor > 0 || this.armorLayersLeft > 0) this.setTint(0xb0c4d8);
        else this.clearTint();
      });
      if (this.armor > 0) return false;

      this.armor = 0;
      if (this.isBoss) {
        this.clearTint();
        return false;
      }
      if (this.armorLayersLeft > 0) {
        this.armorLayersLeft -= 1;
        this.armor = this.armorPerLayer;
        this.setTint(0xb0c4d8);
        return false;
      }
      if (this.armoredVariant) {
        this.armoredVariant = false;
        this.clearTint();
        return false;
      }

      const normal = ENEMY_DEFS.normal;
      this.enemyType = 'normal';
      this.preferBackstab = false;
      this.camouflaged = false;
      this.hp = normal.hp;
      this.maxHp = normal.hp;
      this.moveSpeed = normal.speed;
      this.contactDamage = normal.damage;
      this.xpValue = Math.max(this.xpValue, normal.xp);
      this.setTexture(normal.textureKey);
      this.clearTint();
      this.setAlpha(1);
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setCircle(normal.radius);
      return false;
    }

    this.hp -= amount;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (this.active) {
        if (this.camouflaged) this.setTint(ENEMY_DEFS[this.enemyType as EnemyType]?.color ?? 0x1a3324);
        else if (this.armoredVariant) this.setTint(0x9ab0c4);
        else this.clearTint();
      }
    });
    return this.hp <= 0;
  }

  deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
    this.setVelocity(0, 0);
    this.isBoss = false;
    this.bossId = undefined;
    this.triggered = false;
    this.leaping = false;
    this.reflecting = false;
    this.armoredVariant = false;
    this.bondedBossNetId = 0;
    this.nextAbilityAt = 0;
    this.orbitAngle = 0;
    this.eliteLevel = 1;
    this.preferBackstab = false;
    this.camouflaged = false;
    this.armorLayersLeft = 0;
    this.setAlpha(1);
    this.setScale(1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
  }
}
