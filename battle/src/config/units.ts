export interface UnitConfig {
  name: string;
  hp: number;
  attack: number;
  armor: number;
  speed: number; // pixels per second
  range: number; // attack range in pixels
  attackSpeed: number; // attacks per second
  cost: { food: number; wood: number; gold: number; stone: number };
  trainTime: number; // seconds
  size: number; // collision radius
  color: number; // placeholder tint color
}

export const UNITS: Record<string, UnitConfig> = {
  villager: {
    name: 'Villager',
    hp: 25,
    attack: 3,
    armor: 0,
    speed: 80,
    range: 8,
    attackSpeed: 1.5,
    cost: { food: 50, wood: 0, gold: 0, stone: 0 },
    trainTime: 25,
    size: 8,
    color: 0x88cc44,
  },
  militia: {
    name: 'Militia',
    hp: 40,
    attack: 6,
    armor: 1,
    speed: 70,
    range: 8,
    attackSpeed: 1.2,
    cost: { food: 60, wood: 0, gold: 20, stone: 0 },
    trainTime: 20,
    size: 8,
    color: 0xcc4444,
  },
  archer: {
    name: 'Archer',
    hp: 30,
    attack: 5,
    armor: 0,
    speed: 75,
    range: 96,
    attackSpeed: 1.0,
    cost: { food: 25, wood: 45, gold: 0, stone: 0 },
    trainTime: 30,
    size: 8,
    color: 0x44aacc,
  },
  knight: {
    name: 'Knight',
    hp: 100,
    attack: 12,
    armor: 3,
    speed: 110,
    range: 8,
    attackSpeed: 1.8,
    cost: { food: 60, wood: 0, gold: 75, stone: 0 },
    trainTime: 35,
    size: 10,
    color: 0xcccc44,
  },
  settler: {
    name: 'Settler',
    hp: 40,
    attack: 0,
    armor: 0,
    speed: 50,
    range: 0,
    attackSpeed: 0,
    cost: { food: 150, wood: 100, gold: 50, stone: 0 },
    trainTime: 60,
    size: 10,
    color: 0xdddd88,
  },
  scout: {
    name: 'Scout',
    hp: 30,
    attack: 2,
    armor: 0,
    speed: 140,
    range: 8,
    attackSpeed: 1.5,
    cost: { food: 40, wood: 0, gold: 10, stone: 0 },
    trainTime: 15,
    size: 8,
    color: 0xaacc88,
  },
  spy: {
    name: 'Spy',
    hp: 20,
    attack: 8,
    armor: 0,
    speed: 90,
    range: 8,
    attackSpeed: 1.0,
    cost: { food: 0, wood: 0, gold: 100, stone: 0 },
    trainTime: 40,
    size: 6,
    color: 0x666688,
  },
};
