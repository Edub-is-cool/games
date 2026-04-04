export interface CombatStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  xp: number;
  level: number;
}

export function createPlayerStats(): CombatStats {
  return { hp: 30, maxHp: 30, attack: 5, defense: 2, xp: 0, level: 1 };
}

export function xpToNextLevel(level: number): number {
  return level * 15;
}

export function tryLevelUp(stats: CombatStats): boolean {
  const needed = xpToNextLevel(stats.level);
  if (stats.xp >= needed) {
    stats.xp -= needed;
    stats.level++;
    stats.maxHp += 5;
    stats.hp = stats.maxHp;
    stats.attack += 2;
    stats.defense += 1;
    return true;
  }
  return false;
}

// --- Perks ---
export enum PerkId {
  VAMPIRIC = 'vampiric',
  TOUGH = 'tough',
  POWER = 'power',
  DODGE = 'dodge',
  CRITICAL = 'critical',
  THORNS = 'thorns',
  SWIFT = 'swift',
  TREASURE_SENSE = 'treasure_sense',
}

export interface Perk {
  id: PerkId;
  name: string;
  description: string;
  color: string;
}

export const ALL_PERKS: Perk[] = [
  { id: PerkId.VAMPIRIC, name: 'Vampiric', description: 'Heal 2 HP on kill', color: '#ff4466' },
  { id: PerkId.TOUGH, name: 'Tough', description: '+10 Max HP', color: '#44bb44' },
  { id: PerkId.POWER, name: 'Power Strike', description: '+3 ATK', color: '#ff8844' },
  { id: PerkId.DODGE, name: 'Dodge', description: '20% chance to avoid damage', color: '#44aaff' },
  { id: PerkId.CRITICAL, name: 'Critical', description: '25% chance for 2x damage', color: '#ffcc00' },
  { id: PerkId.THORNS, name: 'Thorns', description: 'Reflect 2 damage when hit', color: '#aa44aa' },
  { id: PerkId.SWIFT, name: 'Swift', description: 'Enemies move every other turn', color: '#88ffaa' },
  { id: PerkId.TREASURE_SENSE, name: 'Treasure Sense', description: 'Items glow through fog', color: '#ffdd44' },
];

export function getRandomPerks(owned: PerkId[], count = 3): Perk[] {
  const available = ALL_PERKS.filter(p => !owned.includes(p.id));
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// --- Enemies ---
export enum EnemyBehavior {
  MELEE = 'melee',
  RANGED = 'ranged',
  AMBUSH = 'ambush',
}

export interface EnemyType {
  name: string;
  hp: number;
  attack: number;
  defense: number;
  xpReward: number;
  color: number;
  behavior: EnemyBehavior;
  rangedRange?: number;
}

export function getEnemyTypes(floor: number): EnemyType[] {
  const scale = 1 + (floor - 1) * 0.3;
  const types: EnemyType[] = [
    { name: 'Bat', hp: Math.floor(5 * scale), attack: Math.floor(2 * scale), defense: 0, xpReward: 3, color: 0x8844aa, behavior: EnemyBehavior.MELEE },
    { name: 'Slime', hp: Math.floor(8 * scale), attack: Math.floor(3 * scale), defense: 1, xpReward: 5, color: 0x44aa44, behavior: EnemyBehavior.MELEE },
    { name: 'Skeleton', hp: Math.floor(12 * scale), attack: Math.floor(4 * scale), defense: 2, xpReward: 8, color: 0xcccccc, behavior: EnemyBehavior.MELEE },
  ];

  if (floor >= 2) {
    types.push({
      name: 'Archer',
      hp: Math.floor(7 * scale),
      attack: Math.floor(4 * scale),
      defense: 1,
      xpReward: 10,
      color: 0xaa8844,
      behavior: EnemyBehavior.RANGED,
      rangedRange: 5,
    });
  }

  if (floor >= 3) {
    types.push({
      name: 'Dark Knight',
      hp: Math.floor(20 * scale),
      attack: Math.floor(6 * scale),
      defense: 4,
      xpReward: 15,
      color: 0x4444aa,
      behavior: EnemyBehavior.MELEE,
    });
    types.push({
      name: 'Shadow',
      hp: Math.floor(10 * scale),
      attack: Math.floor(7 * scale),
      defense: 1,
      xpReward: 12,
      color: 0x332244,
      behavior: EnemyBehavior.AMBUSH,
    });
  }

  return types;
}

export function getDragonBoss(floor: number): EnemyType {
  const scale = 1 + (floor - 1) * 0.2;
  return {
    name: 'Dragon',
    hp: Math.floor(80 * scale),
    attack: Math.floor(12 * scale),
    defense: 6,
    xpReward: 100,
    color: 0xff4444,
    behavior: EnemyBehavior.MELEE,
  };
}

/** Returns damage dealt (minimum 1) */
export function calcDamage(attackerAtk: number, defenderDef: number): number {
  const base = attackerAtk - defenderDef;
  return Math.max(1, base + Math.floor(Math.random() * 3) - 1);
}
