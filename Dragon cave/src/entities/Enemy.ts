import Phaser from 'phaser';
import { TILE_SIZE, Tile, MAP_WIDTH, MAP_HEIGHT, Point } from '../utils/constants';
import { EnemyType, calcDamage } from '../systems/combat';

export class Enemy {
  sprite: Phaser.GameObjects.Rectangle;
  tileX: number;
  tileY: number;
  hp: number;
  maxHp: number;
  attackStat: number;
  defenseStat: number;
  xpReward: number;
  name: string;
  isMoving = false;
  isDead = false;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBarBg: Phaser.GameObjects.Rectangle;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number, type: EnemyType) {
    this.scene = scene;
    this.tileX = x;
    this.tileY = y;
    this.hp = type.hp;
    this.maxHp = type.hp;
    this.attackStat = type.attack;
    this.defenseStat = type.defense;
    this.xpReward = type.xpReward;
    this.name = type.name;

    const px = x * TILE_SIZE + TILE_SIZE / 2;
    const py = y * TILE_SIZE + TILE_SIZE / 2;

    this.sprite = scene.add.rectangle(px, py, TILE_SIZE - 6, TILE_SIZE - 6, type.color);
    this.sprite.setDepth(9);

    // HP bar background
    this.hpBarBg = scene.add.rectangle(px, py - TILE_SIZE / 2 - 2, TILE_SIZE - 6, 3, 0x333333);
    this.hpBarBg.setDepth(12);

    // HP bar
    this.hpBar = scene.add.rectangle(px, py - TILE_SIZE / 2 - 2, TILE_SIZE - 6, 3, 0xff4444);
    this.hpBar.setDepth(13);
  }

  takeDamage(attackerAtk: number): number {
    const damage = calcDamage(attackerAtk, this.defenseStat);
    this.hp -= damage;

    // Update HP bar
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpBar.setScale(ratio, 1);

    // Flash white
    this.scene.tweens.add({
      targets: this.sprite,
      fillColor: { from: 0xffffff, to: this.sprite.fillColor },
      duration: 150,
    });

    if (this.hp <= 0) {
      this.isDead = true;
      this.sprite.setVisible(false);
      this.hpBar.setVisible(false);
      this.hpBarBg.setVisible(false);
    }

    return damage;
  }

  /** Simple AI: move toward player if within range, otherwise wander */
  aiMove(playerPos: Point, tiles: Tile[][], enemies: Enemy[]) {
    if (this.isMoving || this.isDead) return;

    const dist = Math.abs(this.tileX - playerPos.x) + Math.abs(this.tileY - playerPos.y);

    let targetX = this.tileX;
    let targetY = this.tileY;

    if (dist <= 8) {
      // Move toward player
      const dx = playerPos.x - this.tileX;
      const dy = playerPos.y - this.tileY;

      if (Math.abs(dx) >= Math.abs(dy)) {
        targetX += Math.sign(dx);
      } else {
        targetY += Math.sign(dy);
      }
    } else {
      // Random wander
      const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      const [ddx, ddy] = dirs[Math.floor(Math.random() * 4)];
      targetX += ddx;
      targetY += ddy;
    }

    // Don't walk into walls or other enemies
    if (targetX < 0 || targetX >= MAP_WIDTH || targetY < 0 || targetY >= MAP_HEIGHT) return;
    if (tiles[targetY][targetX] === Tile.WALL || tiles[targetY][targetX] === Tile.VOID) return;
    if (targetX === playerPos.x && targetY === playerPos.y) return; // combat handled separately
    if (enemies.some(e => !e.isDead && e !== this && e.tileX === targetX && e.tileY === targetY)) return;

    this.isMoving = true;
    this.tileX = targetX;
    this.tileY = targetY;

    const px = targetX * TILE_SIZE + TILE_SIZE / 2;
    const py = targetY * TILE_SIZE + TILE_SIZE / 2;

    this.scene.tweens.add({
      targets: [this.sprite, this.hpBar, this.hpBarBg],
      x: px,
      duration: 150,
      ease: 'Power1',
    });
    this.scene.tweens.add({
      targets: this.sprite,
      y: py,
      duration: 150,
      ease: 'Power1',
      onComplete: () => { this.isMoving = false; },
    });
    this.scene.tweens.add({
      targets: [this.hpBar, this.hpBarBg],
      y: py - TILE_SIZE / 2 - 2,
      duration: 150,
      ease: 'Power1',
    });
  }

  setVisible(visible: boolean) {
    this.sprite.setVisible(visible && !this.isDead);
    this.hpBar.setVisible(visible && !this.isDead);
    this.hpBarBg.setVisible(visible && !this.isDead);
  }

  getPos(): Point {
    return { x: this.tileX, y: this.tileY };
  }

  destroy() {
    this.sprite.destroy();
    this.hpBar.destroy();
    this.hpBarBg.destroy();
  }
}
