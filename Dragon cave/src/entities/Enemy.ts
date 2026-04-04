import Phaser from 'phaser';
import { TILE_SIZE, Tile, MAP_WIDTH, MAP_HEIGHT, Point } from '../utils/constants';
import { EnemyType, EnemyBehavior, calcDamage } from '../systems/combat';

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
  behavior: EnemyBehavior;
  rangedRange: number;
  isMoving = false;
  isDead = false;
  isHidden = true; // For ambush enemies — hidden until player is close
  hpBar: Phaser.GameObjects.Rectangle;
  hpBarBg: Phaser.GameObjects.Rectangle;
  private scene: Phaser.Scene;
  private baseColor: number;

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
    this.behavior = type.behavior;
    this.rangedRange = type.rangedRange ?? 0;
    this.baseColor = type.color;

    // Ambush enemies start hidden
    this.isHidden = type.behavior === EnemyBehavior.AMBUSH;

    const px = x * TILE_SIZE + TILE_SIZE / 2;
    const py = y * TILE_SIZE + TILE_SIZE / 2;

    this.sprite = scene.add.rectangle(px, py, TILE_SIZE - 6, TILE_SIZE - 6, type.color);
    this.sprite.setDepth(9);

    this.hpBarBg = scene.add.rectangle(px, py - TILE_SIZE / 2 - 2, TILE_SIZE - 6, 3, 0x333333);
    this.hpBarBg.setDepth(12);

    this.hpBar = scene.add.rectangle(px, py - TILE_SIZE / 2 - 2, TILE_SIZE - 6, 3, 0xff4444);
    this.hpBar.setDepth(13);
  }

  takeDamage(attackerAtk: number): number {
    // Reveal ambush enemy when hit
    if (this.isHidden) this.reveal();

    const damage = calcDamage(attackerAtk, this.defenseStat);
    this.hp -= damage;

    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpBar.setScale(ratio, 1);

    this.scene.tweens.add({
      targets: this.sprite,
      fillColor: { from: 0xffffff, to: this.baseColor },
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

  reveal() {
    this.isHidden = false;
    this.sprite.setAlpha(1);
  }

  /** Check if this enemy has line of sight to target (for ranged attacks) */
  hasLineOfSight(target: Point, tiles: Tile[][]): boolean {
    let x = this.tileX;
    let y = this.tileY;
    const dx = Math.sign(target.x - x);
    const dy = Math.sign(target.y - y);

    // Only shoot in cardinal directions
    if (dx !== 0 && dy !== 0) return false;

    for (let step = 0; step < this.rangedRange; step++) {
      x += dx;
      y += dy;
      if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
      if (x === target.x && y === target.y) return true;
      if (tiles[y][x] === Tile.WALL || tiles[y][x] === Tile.DOOR_LOCKED || tiles[y][x] === Tile.CRACKED_WALL) return false;
    }
    return false;
  }

  /** AI: behavior varies by type */
  aiMove(playerPos: Point, tiles: Tile[][], enemies: Enemy[]) {
    if (this.isMoving || this.isDead) return;

    const dist = Math.abs(this.tileX - playerPos.x) + Math.abs(this.tileY - playerPos.y);

    // Ambush: stay hidden until player is within 3 tiles
    if (this.behavior === EnemyBehavior.AMBUSH && this.isHidden) {
      if (dist <= 3) {
        this.reveal();
        // Ambush! Get a surprise attack position
      } else {
        return; // Stay hidden
      }
    }

    // Ranged: try to keep distance and shoot
    if (this.behavior === EnemyBehavior.RANGED) {
      // If too close, try to back away
      if (dist <= 2) {
        const awayX = this.tileX + Math.sign(this.tileX - playerPos.x);
        const awayY = this.tileY + Math.sign(this.tileY - playerPos.y);
        if (this.canMoveTo(awayX, this.tileY, tiles, playerPos, enemies)) {
          this.moveToTile(awayX, this.tileY);
          return;
        }
        if (this.canMoveTo(this.tileX, awayY, tiles, playerPos, enemies)) {
          this.moveToTile(this.tileX, awayY);
          return;
        }
      }
      // If in range with LOS, don't move (will shoot in combat phase)
      if (this.hasLineOfSight(playerPos, tiles)) return;
    }

    // Default: move toward player if in detection range
    let targetX = this.tileX;
    let targetY = this.tileY;

    if (dist <= 8) {
      const dx = playerPos.x - this.tileX;
      const dy = playerPos.y - this.tileY;

      if (Math.abs(dx) >= Math.abs(dy)) {
        targetX += Math.sign(dx);
      } else {
        targetY += Math.sign(dy);
      }
    } else {
      const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      const [ddx, ddy] = dirs[Math.floor(Math.random() * 4)];
      targetX += ddx;
      targetY += ddy;
    }

    if (this.canMoveTo(targetX, targetY, tiles, playerPos, enemies)) {
      this.moveToTile(targetX, targetY);
    }
  }

  private canMoveTo(tx: number, ty: number, tiles: Tile[][], playerPos: Point, enemies: Enemy[]): boolean {
    if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return false;
    const t = tiles[ty][tx];
    if (t === Tile.WALL || t === Tile.VOID || t === Tile.DOOR_LOCKED || t === Tile.CRACKED_WALL) return false;
    if (tx === playerPos.x && ty === playerPos.y) return false;
    if (enemies.some(e => !e.isDead && e !== this && e.tileX === tx && e.tileY === ty)) return false;
    return true;
  }

  private moveToTile(tx: number, ty: number) {
    this.isMoving = true;
    this.tileX = tx;
    this.tileY = ty;

    const px = tx * TILE_SIZE + TILE_SIZE / 2;
    const py = ty * TILE_SIZE + TILE_SIZE / 2;

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
    const show = visible && !this.isDead && !this.isHidden;
    this.sprite.setVisible(show);
    this.hpBar.setVisible(show);
    this.hpBarBg.setVisible(show);
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
