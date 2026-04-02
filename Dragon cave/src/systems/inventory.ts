export enum ItemType {
  HEALTH_POTION = 'health_potion',
  STRENGTH_POTION = 'strength_potion',
  SWORD = 'sword',
  SHIELD = 'shield',
}

export interface Item {
  type: ItemType;
  name: string;
  description: string;
  color: number;
  value: number; // heal amount, attack bonus, defense bonus
}

export const ITEM_DEFS: Record<ItemType, Omit<Item, 'type'>> = {
  [ItemType.HEALTH_POTION]: { name: 'Health Potion', description: 'Restores 15 HP', color: 0xff4466, value: 15 },
  [ItemType.STRENGTH_POTION]: { name: 'Str Potion', description: '+3 ATK for this floor', color: 0xff8800, value: 3 },
  [ItemType.SWORD]: { name: 'Sword', description: '+2 ATK', color: 0xaaaadd, value: 2 },
  [ItemType.SHIELD]: { name: 'Shield', description: '+2 DEF', color: 0x8888bb, value: 2 },
};

export function createItem(type: ItemType): Item {
  return { type, ...ITEM_DEFS[type] };
}

export function getRandomItemType(floor: number): ItemType {
  const roll = Math.random();
  if (floor >= 3 && roll < 0.15) return ItemType.SHIELD;
  if (floor >= 2 && roll < 0.3) return ItemType.SWORD;
  if (roll < 0.55) return ItemType.STRENGTH_POTION;
  return ItemType.HEALTH_POTION;
}

export class Inventory {
  items: Item[] = [];
  equippedAttackBonus = 0;
  equippedDefenseBonus = 0;

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

  get count(): number {
    return this.items.length;
  }
}
