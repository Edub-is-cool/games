export interface BuildingConfig {
  name: string;
  hp: number;
  armor: number;
  cost: { food: number; wood: number; gold: number; stone: number };
  buildTime: number; // seconds
  size: number; // tile footprint (size x size)
  produces: string[]; // unit type keys this building can train
  color: number; // placeholder color
}

export const BUILDINGS: Record<string, BuildingConfig> = {
  townCenter: {
    name: 'Town Center',
    hp: 600,
    armor: 5,
    cost: { food: 0, wood: 275, gold: 0, stone: 100 },
    buildTime: 0, // starts built
    size: 3,
    produces: ['villager', 'settler', 'scout'],
    color: 0xddaa44,
  },
  barracks: {
    name: 'Barracks',
    hp: 350,
    armor: 3,
    cost: { food: 0, wood: 175, gold: 0, stone: 0 },
    buildTime: 40,
    size: 2,
    produces: ['militia', 'knight'],
    color: 0xaa4444,
  },
  archeryRange: {
    name: 'Archery Range',
    hp: 300,
    armor: 3,
    cost: { food: 0, wood: 175, gold: 0, stone: 0 },
    buildTime: 40,
    size: 2,
    produces: ['archer'],
    color: 0x4488aa,
  },
  house: {
    name: 'House',
    hp: 150,
    armor: 1,
    cost: { food: 0, wood: 25, gold: 0, stone: 0 },
    buildTime: 20,
    size: 1,
    produces: [],
    color: 0x886644,
  },
};

export const POP_PER_HOUSE = 5;
export const STARTING_POP_CAP = 5;
