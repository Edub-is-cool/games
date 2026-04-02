import Phaser from 'phaser';
import { TILE_SIZE, Tile, MAP_WIDTH, MAP_HEIGHT, Point } from '../utils/constants';
import { CombatStats, createPlayerStats, calcDamage, tryLevelUp } from '../systems/combat';
import { Inventory, Item, ItemType } from '../systems/inventory';

export class Player {
  sprite: Phaser.GameObjects.Rectangle;
  tileX: number;
  tileY: number;
  stats: CombatStats;
  inventory: Inventory;
  isMoving = false;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, startX: number, startY: number) {
    this.scene = scene;
    this.tileX = startX;
    this.tileY = startY;
    this.stats = createPlayerStats();
    this.inventory = new Inventory();

    this.sprite = scene.add.rectangle(
      startX * TILE_SIZE + TILE_SIZE / 2,
      startY * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE - 4,
      TILE_SIZE - 4,
      0x44bb44
    );
    this.sprite.setDepth(10);

    // Player "eye" to show direction
    const eye = scene.add.circle(4, -2, 3, 0xffffff);
    eye.setDepth(11);

    // Sword indicator
    const sword = scene.add.rectangle(10, 0, 4, 12, 0xaaaadd);
    sword.setDepth(11);
  }

  moveTo(tx: number, ty: number, tiles: Tile[][], onComplete: () => void) {
    if (this.isMoving) return;
    if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return;
    if (tiles[ty][tx] === Tile.WALL || tiles[ty][tx] === Tile.VOID) return;

    this.isMoving = true;
    this.tileX = tx;
    this.tileY = ty;

    this.scene.tweens.add({
      targets: this.sprite,
      x: tx * TILE_SIZE + TILE_SIZE / 2,
      y: ty * TILE_SIZE + TILE_SIZE / 2,
      duration: 100,
      ease: 'Power1',
      onComplete: () => {
        this.isMoving = false;
        onComplete();
      },
    });
  }

  takeDamage(amount: number): boolean {
    const damage = Math.max(1, amount - this.stats.defense - this.inventory.equippedDefenseBonus);
    this.stats.hp -= damage;

    // Flash red
    this.scene.tweens.add({
      targets: this.sprite,
      fillColor: { from: 0xff0000, to: 0x44bb44 },
      duration: 200,
    });

    return this.stats.hp <= 0;
  }

  attack(): number {
    return this.stats.attack + this.inventory.equippedAttackBonus;
  }

  useItem(type: ItemType): string | null {
    const item = this.inventory.remove(type);
    if (!item) return null;

    switch (type) {
      case ItemType.HEALTH_POTION: {
        const heal = Math.min(item.value, this.stats.maxHp - this.stats.hp);
        this.stats.hp += heal;
        return `Healed ${heal} HP`;
      }
      case ItemType.STRENGTH_POTION:
        this.inventory.equippedAttackBonus += item.value;
        return `+${item.value} ATK`;
      case ItemType.SWORD:
        this.inventory.equippedAttackBonus += item.value;
        return `Equipped ${item.name}`;
      case ItemType.SHIELD:
        this.inventory.equippedDefenseBonus += item.value;
        return `Equipped ${item.name}`;
    }
  }

  gainXp(amount: number): boolean {
    this.stats.xp += amount;
    return tryLevelUp(this.stats);
  }

  getPos(): Point {
    return { x: this.tileX, y: this.tileY };
  }
}
