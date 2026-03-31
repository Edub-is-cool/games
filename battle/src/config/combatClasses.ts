/**
 * Bonus damage / armor class system.
 *
 * Every unit has an armor class and a set of bonus damage values that apply
 * when attacking a target of a specific armor class.  Damage is always
 * deterministic — no RNG.
 */

// ---- Armor classes --------------------------------------------------------

export type ArmorClass =
  | 'infantry'
  | 'cavalry'
  | 'ranged'
  | 'siege'
  | 'building'
  | 'villager';

// ---- Unit -> armor class mapping ------------------------------------------

/**
 * Maps every unit key (from units.ts base pool AND every age in ages.ts) to
 * its armor class.
 */
export const UNIT_CLASSES: Record<string, ArmorClass> = {
  // Base / Dawn Age
  villager: 'villager',
  militia: 'infantry',
  archer: 'ranged',
  settler: 'villager',

  // Bronze Age
  spearman: 'infantry',
  chariot: 'cavalry',

  // Iron Age
  knight: 'cavalry',
  swordsman: 'infantry',
  catapult: 'siege',

  // Gunpowder Age
  musketeer: 'ranged',
  cannon: 'siege',
  lancer: 'cavalry',

  // Modern Age
  rifleman: 'ranged',
  tank: 'cavalry',
  artillery: 'siege',
};

// ---- Bonus damage table ---------------------------------------------------

/**
 * Maps a unit key to an object of { armorClass: bonusDamage }.
 * When a unit attacks a target whose armor class appears in its bonus table,
 * the bonus is added on top of the base damage.
 *
 * Every unit has at least one bonus entry.
 */
export const BONUS_DAMAGE: Record<string, Partial<Record<ArmorClass, number>>> = {
  // Base / Dawn Age
  villager:  { building: 2 },
  militia:   { cavalry: 4 },
  archer:    { infantry: 3 },
  settler:   { building: 1 },

  // Bronze Age
  spearman:  { cavalry: 12 },
  chariot:   { ranged: 5 },

  // Iron Age
  knight:    { ranged: 5 },
  swordsman: { cavalry: 4, villager: 3 },
  catapult:  { building: 15, siege: 5 },

  // Gunpowder Age
  musketeer: { cavalry: 8 },
  cannon:    { building: 15, infantry: 4 },
  lancer:    { ranged: 5, villager: 4 },

  // Modern Age
  rifleman:  { cavalry: 6, infantry: 3 },
  tank:      { building: 10, infantry: 5 },
  artillery: { building: 15, siege: 6 },
};

// ---- Tower bonus damage ---------------------------------------------------

/**
 * Bonus damage for defensive buildings (towers).  Keyed by defense key.
 */
export const TOWER_BONUS_DAMAGE: Record<string, Partial<Record<ArmorClass, number>>> = {
  guard_tower:   { infantry: 2, cavalry: 2 },
  keep:          { infantry: 3, cavalry: 3, siege: 5 },
  bombard_tower: { siege: 8, building: 10 },
};

// ---- Helper ---------------------------------------------------------------

/**
 * Returns the bonus damage an attacker deals to a target based on class,
 * or 0 if there is no bonus.
 */
export function getBonusDamage(
  attackerKey: string,
  targetArmorClass: ArmorClass | undefined,
  isTower: boolean = false,
): number {
  if (!targetArmorClass) return 0;
  const table = isTower
    ? TOWER_BONUS_DAMAGE[attackerKey]
    : BONUS_DAMAGE[attackerKey];
  return table?.[targetArmorClass] ?? 0;
}

/**
 * Resolves the armor class for any entity based on its type and key.
 * - Units: looked up from UNIT_CLASSES
 * - Buildings: always 'building'
 * - Everything else: undefined (no bonus applies)
 */
export function getArmorClass(
  entityType: string,
  entityKey: string,
): ArmorClass | undefined {
  if (entityType === 'unit') return UNIT_CLASSES[entityKey];
  if (entityType === 'building') return 'building';
  return undefined;
}
