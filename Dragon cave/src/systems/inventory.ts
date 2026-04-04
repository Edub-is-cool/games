export enum ItemType {
  HEALTH_POTION = 'health_potion',
  STRENGTH_POTION = 'strength_potion',
  SWORD = 'sword',
  SHIELD = 'shield',
  KEY = 'key',
  RING_REGEN = 'ring_regen',
  TORCH = 'torch',
  SCROLL_MAP = 'scroll_map',
}

export interface Item {
  type: ItemType;
  name: string;
  description: string;
  color: number;
  value: number;
}

export const ITEM_DEFS: Record<ItemType, Omit<Item, 'type'>> = {
  [ItemType.HEALTH_POTION]: { name: 'Health Potion', description: 'Restores 15 HP', color: 0xff4466, value: 15 },
  [ItemType.STRENGTH_POTION]: { name: 'Str Potion', description: '+3 ATK for this floor', color: 0xff8800, value: 3 },
  [ItemType.SWORD]: { name: 'Sword', description: '+2 ATK', color: 0xaaaadd, value: 2 },
  [ItemType.SHIELD]: { name: 'Shield', description: '+2 DEF', color: 0x8888bb, value: 2 },
  [ItemType.KEY]: { name: 'Key', description: 'Opens a locked door', color: 0xffdd44, value: 1 },
  [ItemType.RING_REGEN]: { name: 'Regen Ring', description: 'Heal 1 HP per turn', color: 0x44dddd, value: 1 },
  [ItemType.TORCH]: { name: 'Torch', description: '+3 vision radius', color: 0xff8844, value: 3 },
  [ItemType.SCROLL_MAP]: { name: 'Map Scroll', description: 'Reveals entire floor', color: 0xddddaa, value: 1 },
};

export function createItem(type: ItemType): Item {
  return { type, ...ITEM_DEFS[type] };
}

export function getRandomItemType(floor: number, isSecretRoom = false): ItemType {
  const roll = Math.random();

  // Secret rooms give better loot
  if (isSecretRoom) {
    if (roll < 0.25) return ItemType.RING_REGEN;
    if (roll < 0.5) return ItemType.TORCH;
    if (roll < 0.7) return ItemType.SCROLL_MAP;
    if (roll < 0.85) return ItemType.SWORD;
    return ItemType.SHIELD;
  }

  if (floor >= 3 && roll < 0.08) return ItemType.RING_REGEN;
  if (floor >= 2 && roll < 0.14) return ItemType.TORCH;
  if (roll < 0.20) return ItemType.SCROLL_MAP;
  if (floor >= 3 && roll < 0.30) return ItemType.SHIELD;
  if (floor >= 2 && roll < 0.45) return ItemType.SWORD;
  if (roll < 0.65) return ItemType.STRENGTH_POTION;
  return ItemType.HEALTH_POTION;
}

export class Inventory {
  items: Item[] = [];
  equippedSwords: Item[] = [];
  equippedShields: Item[] = [];
  tempAttackBonus = 0;
  keys = 0;
  regenRings = 0;
  torchBonus = 0;

  add(item: Item) {
    this.items.push(item);
  }

  has(type: ItemType): boolean {
    return this.items.some(i => i.type === type);
  }

  remove(type: ItemType): Item | null {
    const idx = this.items.findIndex(i => i.type === type);
    if (idx === -1) return null;
    return this.items.splice(idx, 1)[0];
  }

  equipSword(item: Item) {
    this.equippedSwords.push(item);
  }

  equipShield(item: Item) {
    this.equippedShields.push(item);
  }

  get attackBonus(): number {
    return this.equippedSwords.reduce((sum, s) => sum + s.value, 0) + this.tempAttackBonus;
  }

  get defenseBonus(): number {
    return this.equippedShields.reduce((sum, s) => sum + s.value, 0);
  }

  get count(): number {
    return this.items.length;
  }
}
