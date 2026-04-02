import Phaser from 'phaser';
import { TILE_SIZE, Point } from '../utils/constants';
import { Item, ItemType, createItem, getRandomItemType } from '../systems/inventory';

export class ItemPickup {
  sprite: Phaser.GameObjects.Rectangle;
  tileX: number;
  tileY: number;
  item: Item;
  picked = false;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    this.tileX = x;
    this.tileY = y;

    const type = getRandomItemType(floor);
    this.item = createItem(type);

    const px = x * TILE_SIZE + TILE_SIZE / 2;
    const py = y * TILE_SIZE + TILE_SIZE / 2;

    this.sprite = scene.add.rectangle(px, py, TILE_SIZE / 2, TILE_SIZE / 2, this.item.color);
    this.sprite.setDepth(5);

    // Gentle float animation
    scene.tweens.add({
      targets: this.sprite,
      y: py - 3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  pickup(): Item {
    this.picked = true;
    this.sprite.setVisible(false);
    return this.item;
  }

  setVisible(visible: boolean) {
    this.sprite.setVisible(visible && !this.picked);
  }

  getPos(): Point {
    return { x: this.tileX, y: this.tileY };
  }

  destroy() {
    this.sprite.destroy();
  }
}
