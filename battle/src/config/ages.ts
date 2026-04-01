import { UnitConfig, UNITS } from './units';
import { BuildingConfig, BUILDINGS } from './buildings';

export interface AgeConfig {
  name: string;
  description: string;
  cost: { food: number; wood: number; gold: number; stone: number };
  advanceTime: number; // seconds to advance to this age
  units: Record<string, UnitConfig>;
  buildings: Record<string, BuildingConfig>;
}

// ---------------------------------------------------------------------------
// Age 1 - Dawn Age (starting age, no advance cost)
// ---------------------------------------------------------------------------

const DAWN_AGE: AgeConfig = {
  name: 'Dawn Age',
  description: 'Primitive tribes struggle for survival with basic tools and crude weapons.',
  cost: { food: 0, wood: 0, gold: 0, stone: 0 },
  advanceTime: 0,
  units: {
    villager: UNITS.villager,
    settler: UNITS.settler,
    militia: UNITS.militia,
    archer: UNITS.archer,
    scout: UNITS.scout,
  },
  buildings: {
    townCenter: BUILDINGS.townCenter,
    barracks: BUILDINGS.barracks,
    archeryRange: BUILDINGS.archeryRange,
    house: BUILDINGS.house,
  },
};

// ---------------------------------------------------------------------------
// Age 2 - Bronze Age
// ---------------------------------------------------------------------------

const BRONZE_AGE_UNITS: Record<string, UnitConfig> = {
  spearman: {
    name: 'Spearman',
    hp: 50,
    attack: 7,
    armor: 1,
    speed: 65,
    range: 12,
    attackSpeed: 1.3,
    cost: { food: 35, wood: 30, gold: 10, stone: 0 },
    trainTime: 22,
    size: 8,
    color: 0x66aa66,
  },
  chariot: {
    name: 'Chariot',
    hp: 70,
    attack: 9,
    armor: 1,
    speed: 130,
    range: 8,
    attackSpeed: 1.6,
    cost: { food: 70, wood: 40, gold: 30, stone: 0 },
    trainTime: 28,
    size: 12,
    color: 0xddaa66,
  },
};

const BRONZE_AGE_BUILDINGS: Record<string, BuildingConfig> = {
  stable: {
    name: 'Stable',
    hp: 350,
    armor: 3,
    cost: { food: 0, wood: 200, gold: 50, stone: 0 },
    buildTime: 45,
    size: 2,
    produces: ['chariot', 'lancer'],
    color: 0x997744,
  },
  watchtower: {
    name: 'Watchtower',
    hp: 250,
    armor: 4,
    cost: { food: 0, wood: 50, gold: 0, stone: 100 },
    buildTime: 35,
    size: 1,
    produces: [],
    color: 0x888899,
  },
  market: {
    name: 'Market',
    hp: 300,
    armor: 2,
    cost: { food: 0, wood: 175, gold: 25, stone: 0 },
    buildTime: 40,
    size: 2,
    produces: [],
    color: 0xccaa55,
  },
};

const BRONZE_AGE: AgeConfig = {
  name: 'Bronze Age',
  description: 'Organized militaries emerge with cavalry and fortified trade routes.',
  cost: { food: 500, wood: 300, gold: 100, stone: 0 },
  advanceTime: 90,
  units: BRONZE_AGE_UNITS,
  buildings: BRONZE_AGE_BUILDINGS,
};

// ---------------------------------------------------------------------------
// Age 3 - Iron Age
// ---------------------------------------------------------------------------

const IRON_AGE_UNITS: Record<string, UnitConfig> = {
  crossbowman: {
    name: 'Crossbowman',
    hp: 40,
    attack: 9,
    armor: 1,
    speed: 60,
    range: 110,
    attackSpeed: 0.7,
    cost: { food: 30, wood: 40, gold: 30, stone: 0 },
    trainTime: 26,
    size: 8,
    color: 0x5588aa,
  },
  knight: {
    name: 'Knight',
    hp: 120,
    attack: 14,
    armor: 4,
    speed: 115,
    range: 8,
    attackSpeed: 1.8,
    cost: { food: 80, wood: 0, gold: 90, stone: 0 },
    trainTime: 35,
    size: 10,
    color: 0xcccc44,
  },
  swordsman: {
    name: 'Swordsman',
    hp: 70,
    attack: 11,
    armor: 3,
    speed: 65,
    range: 8,
    attackSpeed: 1.1,
    cost: { food: 60, wood: 0, gold: 40, stone: 0 },
    trainTime: 25,
    size: 8,
    color: 0xbb5555,
  },
  catapult: {
    name: 'Catapult',
    hp: 60,
    attack: 25,
    armor: 1,
    speed: 35,
    range: 160,
    attackSpeed: 0.25,
    cost: { food: 0, wood: 150, gold: 100, stone: 50 },
    trainTime: 45,
    size: 14,
    color: 0x886633,
  },
  spy: UNITS.spy,
};

const IRON_AGE_BUILDINGS: Record<string, BuildingConfig> = {
  castle: {
    name: 'Castle',
    hp: 800,
    armor: 8,
    cost: { food: 0, wood: 200, gold: 150, stone: 300 },
    buildTime: 80,
    size: 3,
    produces: ['knight', 'spy'],
    color: 0x777799,
  },
  siege_workshop: {
    name: 'Siege Workshop',
    hp: 400,
    armor: 4,
    cost: { food: 0, wood: 250, gold: 100, stone: 50 },
    buildTime: 55,
    size: 2,
    produces: ['catapult'],
    color: 0x665544,
  },
  blacksmith: {
    name: 'Blacksmith',
    hp: 350,
    armor: 3,
    cost: { food: 0, wood: 175, gold: 75, stone: 0 },
    buildTime: 40,
    size: 2,
    produces: [],
    color: 0x555566,
  },
};

const IRON_AGE: AgeConfig = {
  name: 'Iron Age',
  description: 'Heavy cavalry, disciplined infantry, and siege engines dominate the battlefield.',
  cost: { food: 800, wood: 500, gold: 300, stone: 100 },
  advanceTime: 130,
  units: IRON_AGE_UNITS,
  buildings: IRON_AGE_BUILDINGS,
};

// ---------------------------------------------------------------------------
// Age 4 - Gunpowder Age
// ---------------------------------------------------------------------------

const GUNPOWDER_AGE_UNITS: Record<string, UnitConfig> = {
  musketeer: {
    name: 'Musketeer',
    hp: 55,
    attack: 16,
    armor: 1,
    speed: 60,
    range: 120,
    attackSpeed: 0.6,
    cost: { food: 50, wood: 0, gold: 60, stone: 0 },
    trainTime: 28,
    size: 8,
    color: 0x3377bb,
  },
  cannon: {
    name: 'Cannon',
    hp: 80,
    attack: 40,
    armor: 2,
    speed: 30,
    range: 180,
    attackSpeed: 0.2,
    cost: { food: 0, wood: 100, gold: 200, stone: 75 },
    trainTime: 55,
    size: 14,
    color: 0x444444,
  },
  lancer: {
    name: 'Lancer',
    hp: 90,
    attack: 13,
    armor: 2,
    speed: 140,
    range: 12,
    attackSpeed: 1.5,
    cost: { food: 80, wood: 0, gold: 100, stone: 0 },
    trainTime: 32,
    size: 10,
    color: 0xee8833,
  },
};

const GUNPOWDER_AGE_BUILDINGS: Record<string, BuildingConfig> = {
  fort: {
    name: 'Fort',
    hp: 1000,
    armor: 10,
    cost: { food: 0, wood: 300, gold: 200, stone: 400 },
    buildTime: 100,
    size: 3,
    produces: ['musketeer', 'lancer'],
    color: 0x556655,
  },
  gunsmith: {
    name: 'Gunsmith',
    hp: 400,
    armor: 4,
    cost: { food: 0, wood: 200, gold: 150, stone: 50 },
    buildTime: 50,
    size: 2,
    produces: ['cannon'],
    color: 0x664433,
  },
  university: {
    name: 'University',
    hp: 350,
    armor: 3,
    cost: { food: 0, wood: 250, gold: 200, stone: 0 },
    buildTime: 60,
    size: 2,
    produces: [],
    color: 0x4455aa,
  },
};

const GUNPOWDER_AGE: AgeConfig = {
  name: 'Gunpowder Age',
  description: 'Black powder transforms warfare with devastating ranged firepower.',
  cost: { food: 1200, wood: 700, gold: 600, stone: 200 },
  advanceTime: 170,
  units: GUNPOWDER_AGE_UNITS,
  buildings: GUNPOWDER_AGE_BUILDINGS,
};

// ---------------------------------------------------------------------------
// Age 5 - Modern Age
// ---------------------------------------------------------------------------

const MODERN_AGE_UNITS: Record<string, UnitConfig> = {
  rifleman: {
    name: 'Rifleman',
    hp: 65,
    attack: 20,
    armor: 2,
    speed: 70,
    range: 140,
    attackSpeed: 0.8,
    cost: { food: 60, wood: 0, gold: 80, stone: 0 },
    trainTime: 22,
    size: 8,
    color: 0x336644,
  },
  tank: {
    name: 'Tank',
    hp: 250,
    attack: 35,
    armor: 8,
    speed: 55,
    range: 100,
    attackSpeed: 0.4,
    cost: { food: 0, wood: 0, gold: 300, stone: 150 },
    trainTime: 60,
    size: 16,
    color: 0x556b2f,
  },
  artillery: {
    name: 'Artillery',
    hp: 70,
    attack: 55,
    armor: 1,
    speed: 25,
    range: 220,
    attackSpeed: 0.15,
    cost: { food: 0, wood: 100, gold: 350, stone: 100 },
    trainTime: 65,
    size: 16,
    color: 0x8b7355,
  },
};

const MODERN_AGE_BUILDINGS: Record<string, BuildingConfig> = {
  factory: {
    name: 'Factory',
    hp: 600,
    armor: 5,
    cost: { food: 0, wood: 300, gold: 250, stone: 200 },
    buildTime: 70,
    size: 3,
    produces: ['tank', 'artillery'],
    color: 0x708090,
  },
  bunker: {
    name: 'Bunker',
    hp: 1200,
    armor: 12,
    cost: { food: 0, wood: 100, gold: 150, stone: 500 },
    buildTime: 60,
    size: 2,
    produces: ['rifleman'],
    color: 0x4a5548,
  },
  command_center: {
    name: 'Command Center',
    hp: 800,
    armor: 6,
    cost: { food: 0, wood: 350, gold: 400, stone: 200 },
    buildTime: 90,
    size: 3,
    produces: [],
    color: 0x2f4f6f,
  },
  wonder: {
    name: 'Wonder',
    hp: 2000,
    armor: 10,
    cost: { food: 1000, wood: 1000, gold: 1000, stone: 1000 },
    buildTime: 200,
    size: 4,
    produces: [],
    color: 0xffd700,
  },
};

const MODERN_AGE: AgeConfig = {
  name: 'Modern Age',
  description: 'Industrial might and mechanized armies crush all opposition.',
  cost: { food: 1800, wood: 1000, gold: 1000, stone: 400 },
  advanceTime: 210,
  units: MODERN_AGE_UNITS,
  buildings: MODERN_AGE_BUILDINGS,
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const AGES: AgeConfig[] = [
  DAWN_AGE,
  BRONZE_AGE,
  IRON_AGE,
  GUNPOWDER_AGE,
  MODERN_AGE,
];

/** All units from every age, merged with base units. */
export const ALL_UNITS: Record<string, UnitConfig> = {
  ...UNITS,
  ...BRONZE_AGE_UNITS,
  ...IRON_AGE_UNITS,
  ...GUNPOWDER_AGE_UNITS,
  ...MODERN_AGE_UNITS,
};

/** All buildings from every age, merged with base buildings. */
export const ALL_BUILDINGS: Record<string, BuildingConfig> = {
  ...BUILDINGS,
  ...BRONZE_AGE_BUILDINGS,
  ...IRON_AGE_BUILDINGS,
  ...GUNPOWDER_AGE_BUILDINGS,
  ...MODERN_AGE_BUILDINGS,
};

/**
 * Returns all unit keys available at the given age (1-indexed).
 * Includes units from the specified age and all earlier ages.
 */
export function getUnitsForAge(age: number): string[] {
  const clamped = Math.max(1, Math.min(age, AGES.length));
  const keys: string[] = [];
  for (let i = 0; i < clamped; i++) {
    keys.push(...Object.keys(AGES[i].units));
  }
  return keys;
}

/**
 * Returns all building keys available at the given age (1-indexed).
 * Includes buildings from the specified age and all earlier ages.
 */
export function getBuildingsForAge(age: number): string[] {
  const clamped = Math.max(1, Math.min(age, AGES.length));
  const keys: string[] = [];
  for (let i = 0; i < clamped; i++) {
    keys.push(...Object.keys(AGES[i].buildings));
  }
  return keys;
}
