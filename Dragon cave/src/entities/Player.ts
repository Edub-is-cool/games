import Phaser from 'phaser';
import { TILE_SIZE, Tile, MAP_WIDTH, MAP_HEIGHT, Point, VISIBILITY_RADIUS } from '../utils/constants';
import { CombatStats, createPlayerStats, tryLevelUp, PerkId } from '../systems/combat';
import { Inventory, Item, ItemType } from '../systems/inventory';

export class Player {
  sprite: Phaser.GameObjects.Rectangle;
  tileX: number;
  tileY: number;
  stats: CombatStats;
  inventory: Inventory;
  perks: PerkId[] = [];
  isMoving = false;
  poisonTurns = 0;
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
  }

  moveTo(tx: number, ty: number, tiles: Tile[][], onComplete: () => void) {
    if (this.isMoving) return;
    if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return;
    const t = tiles[ty][tx];
    if (t === Tile.WALL || t === Tile.VOID || t === Tile.CRACKED_WALL) return;
    if (t === Tile.DOOR_LOCKED) return; // Handled by GameScene

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

  takeDamage(amount: number): { dead: boolean; dodged: boolean; reflected: number } {
    // Dodge perk
    if (this.hasPerk(PerkId.DODGE) && Math.random() < 0.2) {
      return { dead: false, dodged: true, reflected: 0 };
    }

    const damage = Math.max(1, amount - this.stats.defense - this.inventory.defenseBonus);
    this.stats.hp -= damage;

    // Flash red
    this.scene.tweens.add({
      targets: this.sprite,
      fillColor: { from: 0xff0000, to: 0x44bb44 },
      duration: 200,
    });

    // Thorns perk
    const reflected = this.hasPerk(PerkId.THORNS) ? 2 : 0;

    return { dead: this.stats.hp <= 0, dodged: false, reflected };
  }

  attack(): number {
    const base = this.stats.attack + this.inventory.attackBonus;
    // Critical perk
    if (this.hasPerk(PerkId.CRITICAL) && Math.random() < 0.25) {
      return base * 2;
    }
    return base;
  }

  /** Auto-equip swords/shields, handle keys/rings/torches on pickup */
  pickupItem(item: Item): string {
    if (item.type === ItemType.SWORD) {
      this.inventory.equipSword(item);
      const count = this.inventory.equippedSwords.length;
      return `Equipped ${item.name} (+${item.value} ATK) [${count} sword${count > 1 ? 's' : ''}]`;
    }
    if (item.type === ItemType.SHIELD) {
      this.inventory.equipShield(item);
      const count = this.inventory.equippedShields.length;
      return `Equipped ${item.name} (+${item.value} DEF) [${count} shield${count > 1 ? 's' : ''}]`;
    }
    if (item.type === ItemType.KEY) {
      this.inventory.keys++;
      return `Got a Key! [${this.inventory.keys} key${this.inventory.keys > 1 ? 's' : ''}]`;
    }
    if (item.type === ItemType.RING_REGEN) {
      this.inventory.regenRings++;
      return `Equipped Regen Ring! (+${this.inventory.regenRings} HP/turn)`;
    }
    if (item.type === ItemType.TORCH) {
      this.inventory.torchBonus += item.value;
      return `Torch lit! Vision +${item.value}`;
    }
    // Consumables go to inventory
    this.inventory.add(item);
    return `Picked up ${item.name}`;
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
        this.inventory.tempAttackBonus += item.value;
        return `+${item.value} ATK`;
      case ItemType.SCROLL_MAP:
        return 'MAP_REVEAL'; // Handled by GameScene
      default:
        return null;
    }
  }

  /** Per-turn effects: regen, poison */
  onTurnEnd(): string[] {
    const messages: string[] = [];

    // Regen ring
    if (this.inventory.regenRings > 0 && this.stats.hp < this.stats.maxHp) {
      const heal = Math.min(this.inventory.regenRings, this.stats.maxHp - this.stats.hp);
      this.stats.hp += heal;
      // Don't spam messages for small heals
    }

    // Vampiric perk handled at kill time, not here

    // Poison
    if (this.poisonTurns > 0) {
      this.stats.hp -= 1;
      this.poisonTurns--;
      messages.push('Poison! -1 HP');
      this.scene.tweens.add({
        targets: this.sprite,
        fillColor: { from: 0x44ff00, to: 0x44bb44 },
        duration: 200,
      });
    }

    return messages;
  }

  gainXp(amount: number): boolean {
    this.stats.xp += amount;
    return tryLevelUp(this.stats);
  }

  onKill() {
    if (this.hasPerk(PerkId.VAMPIRIC)) {
      const heal = Math.min(2, this.stats.maxHp - this.stats.hp);
      this.stats.hp += heal;
    }
  }

  applyPerk(perkId: PerkId) {
    this.perks.push(perkId);
    switch (perkId) {
      case PerkId.TOUGH:
        this.stats.maxHp += 10;
        this.stats.hp += 10;
        break;
      case PerkId.POWER:
        this.stats.attack += 3;
        break;
    }
  }

  hasPerk(perkId: PerkId): boolean {
    return this.perks.includes(perkId);
  }

  get visibilityRadius(): number {
    return VISIBILITY_RADIUS + this.inventory.torchBonus;
  }

  getPos(): Point {
    return { x: this.tileX, y: this.tileY };
  }
}
