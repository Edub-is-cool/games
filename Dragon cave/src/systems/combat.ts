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

export interface EnemyType {
  name: string;
  hp: number;
  attack: number;
  defense: number;
  xpReward: number;
  color: number;
}

export function getEnemyTypes(floor: number): EnemyType[] {
  const scale = 1 + (floor - 1) * 0.3;
  const types: EnemyType[] = [
    { name: 'Bat', hp: Math.floor(5 * scale), attack: Math.floor(2 * scale), defense: 0, xpReward: 3, color: 0x8844aa },
    { name: 'Slime', hp: Math.floor(8 * scale), attack: Math.floor(3 * scale), defense: 1, xpReward: 5, color: 0x44aa44 },
    { name: 'Skeleton', hp: Math.floor(12 * scale), attack: Math.floor(4 * scale), defense: 2, xpReward: 8, color: 0xcccccc },
  ];

  if (floor >= 3) {
    types.push({
      name: 'Dark Knight',
      hp: Math.floor(20 * scale),
      attack: Math.floor(6 * scale),
      defense: 4,
      xpReward: 15,
      color: 0x4444aa,
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
  };
}

/** Returns damage dealt (minimum 1) */
export function calcDamage(attackerAtk: number, defenderDef: number): number {
  const base = attackerAtk - defenderDef;
  return Math.max(1, base + Math.floor(Math.random() * 3) - 1);
}
