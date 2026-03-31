import { UnitConfig } from './units';
import { BuildingConfig } from './buildings';

// ---------------------------------------------------------------------------
// Nation Config Interface
// ---------------------------------------------------------------------------

export interface NationConfig {
  id: string;
  name: string;
  description: string;
  bonuses: string[];
  uniqueUnit: { key: string; config: UnitConfig };
  uniqueBuilding: { key: string; config: BuildingConfig };
  resourceBonus: Partial<{ food: number; wood: number; gold: number; stone: number }>;
  gatherBonus: Partial<{ food: number; wood: number; gold: number; stone: number }>;
  militaryBonus: { attackMult: number; armorMult: number; speedMult: number };
  color: number;
}

// ---------------------------------------------------------------------------
// Nations
// ---------------------------------------------------------------------------

export const NATIONS: Record<string, NationConfig> = {
  inca: {
    id: 'inca',
    name: 'Inca',
    description:
      'Masters of mountain terrain, the Inca built vast empires with terraced agriculture and stonemasonry unmatched in the ancient world.',
    bonuses: [
      'Stone gathering rate +30%',
      'Buildings have +20% HP',
    ],
    uniqueUnit: {
      key: 'slinger',
      config: {
        name: 'Slinger',
        hp: 32,
        attack: 6,
        armor: 0,
        speed: 78,
        range: 88,
        attackSpeed: 1.1,
        cost: { food: 30, wood: 0, gold: 15, stone: 10 },
        trainTime: 18,
        size: 8,
        color: 0xcc9944,
      },
    },
    uniqueBuilding: {
      key: 'terraceFarm',
      config: {
        name: 'Terrace Farm',
        hp: 200,
        armor: 1,
        cost: { food: 0, wood: 60, gold: 0, stone: 40 },
        buildTime: 30,
        size: 2,
        produces: [],
        color: 0x66aa33,
      },
    },
    resourceBonus: { stone: 1.1 },
    gatherBonus: { stone: 1.3 },
    militaryBonus: { attackMult: 1.0, armorMult: 1.0, speedMult: 1.0 },
    color: 0xcc8833,
  },

  america: {
    id: 'america',
    name: 'America',
    description:
      'Born from revolution and fueled by industry, America leverages rapid innovation and economic might to outpace its rivals.',
    bonuses: [
      'Age advancement 15% faster',
      'Gold income +10%',
    ],
    uniqueUnit: {
      key: 'minuteman',
      config: {
        name: 'Minuteman',
        hp: 38,
        attack: 7,
        armor: 1,
        speed: 90,
        range: 8,
        attackSpeed: 1.1,
        cost: { food: 50, wood: 0, gold: 25, stone: 0 },
        trainTime: 14,
        size: 8,
        color: 0x3366aa,
      },
    },
    uniqueBuilding: {
      key: 'libertyBell',
      config: {
        name: 'Liberty Bell',
        hp: 300,
        armor: 3,
        cost: { food: 0, wood: 100, gold: 80, stone: 50 },
        buildTime: 45,
        size: 2,
        produces: [],
        color: 0xddcc44,
      },
    },
    resourceBonus: { gold: 1.1 },
    gatherBonus: { gold: 1.1 },
    militaryBonus: { attackMult: 1.0, armorMult: 1.0, speedMult: 1.05 },
    color: 0x3355aa,
  },

  rome: {
    id: 'rome',
    name: 'Rome',
    description:
      'The legions of Rome march with unrivaled discipline. Their roads and engineering extend dominion across continents.',
    bonuses: [
      'Infantry +15% armor',
      'Units move 15% faster near own buildings',
    ],
    uniqueUnit: {
      key: 'centurion',
      config: {
        name: 'Centurion',
        hp: 85,
        attack: 10,
        armor: 5,
        speed: 60,
        range: 8,
        attackSpeed: 1.2,
        cost: { food: 70, wood: 0, gold: 40, stone: 0 },
        trainTime: 28,
        size: 9,
        color: 0xcc3333,
      },
    },
    uniqueBuilding: {
      key: 'colosseum',
      config: {
        name: 'Colosseum',
        hp: 500,
        armor: 5,
        cost: { food: 0, wood: 100, gold: 75, stone: 150 },
        buildTime: 60,
        size: 3,
        produces: [],
        color: 0xbbaa88,
      },
    },
    resourceBonus: {},
    gatherBonus: {},
    militaryBonus: { attackMult: 1.0, armorMult: 1.15, speedMult: 1.0 },
    color: 0xcc3333,
  },

  egypt: {
    id: 'egypt',
    name: 'Egypt',
    description:
      'Heirs of the pharaohs, Egypt commands monumental architecture and an ancient mystique that inspires awe on the battlefield.',
    bonuses: [
      'Villagers build 20% faster',
      'Monuments provide +5 population capacity each',
    ],
    uniqueUnit: {
      key: 'warElephant',
      config: {
        name: 'War Elephant',
        hp: 220,
        attack: 18,
        armor: 4,
        speed: 40,
        range: 10,
        attackSpeed: 2.0,
        cost: { food: 120, wood: 0, gold: 100, stone: 0 },
        trainTime: 50,
        size: 14,
        color: 0x888866,
      },
    },
    uniqueBuilding: {
      key: 'obelisk',
      config: {
        name: 'Obelisk',
        hp: 180,
        armor: 2,
        cost: { food: 0, wood: 0, gold: 50, stone: 80 },
        buildTime: 25,
        size: 1,
        produces: [],
        color: 0xddcc99,
      },
    },
    resourceBonus: {},
    gatherBonus: {},
    militaryBonus: { attackMult: 1.0, armorMult: 1.0, speedMult: 1.0 },
    color: 0xddaa33,
  },

  china: {
    id: 'china',
    name: 'China',
    description:
      'With millennia of unbroken civilization, China fields vast armies supported by the most efficient economy in the known world.',
    bonuses: [
      'Villagers gather all resources 10% faster',
      'Starting population cap +5',
    ],
    uniqueUnit: {
      key: 'chuKoNu',
      config: {
        name: 'Chu Ko Nu',
        hp: 28,
        attack: 4,
        armor: 0,
        speed: 72,
        range: 90,
        attackSpeed: 1.8,
        cost: { food: 40, wood: 35, gold: 20, stone: 0 },
        trainTime: 26,
        size: 8,
        color: 0xcc4466,
      },
    },
    uniqueBuilding: {
      key: 'pagoda',
      config: {
        name: 'Pagoda',
        hp: 350,
        armor: 3,
        cost: { food: 0, wood: 150, gold: 100, stone: 75 },
        buildTime: 55,
        size: 2,
        produces: [],
        color: 0xaa3333,
      },
    },
    resourceBonus: {},
    gatherBonus: { food: 1.1, wood: 1.1, gold: 1.1, stone: 1.1 },
    militaryBonus: { attackMult: 1.0, armorMult: 1.0, speedMult: 1.0 },
    color: 0xcc2222,
  },

  vikings: {
    id: 'vikings',
    name: 'Vikings',
    description:
      'Fearless raiders from the frozen north, Vikings strike fast and hard, leaving nothing but ashes in their wake.',
    bonuses: [
      'All units +10% movement speed',
      'Infantry +10% attack',
    ],
    uniqueUnit: {
      key: 'berserker',
      config: {
        name: 'Berserker',
        hp: 65,
        attack: 14,
        armor: 1,
        speed: 80,
        range: 8,
        attackSpeed: 1.0,
        cost: { food: 65, wood: 0, gold: 45, stone: 0 },
        trainTime: 24,
        size: 9,
        color: 0x5588bb,
      },
    },
    uniqueBuilding: {
      key: 'longhouse',
      config: {
        name: 'Longhouse',
        hp: 200,
        armor: 2,
        cost: { food: 0, wood: 18, gold: 0, stone: 0 },
        buildTime: 16,
        size: 1,
        produces: [],
        color: 0x775533,
      },
    },
    resourceBonus: {},
    gatherBonus: {},
    militaryBonus: { attackMult: 1.1, armorMult: 1.0, speedMult: 1.1 },
    color: 0x4477bb,
  },

  mongols: {
    id: 'mongols',
    name: 'Mongols',
    description:
      'Nomadic horse lords of the steppe, the Mongols sweep across the map with unmatched cavalry speed and devastating hit-and-run tactics.',
    bonuses: [
      'Cavalry +20% movement speed',
      'Cavalry +10% attack',
    ],
    uniqueUnit: {
      key: 'mangudai',
      config: {
        name: 'Mangudai',
        hp: 50,
        attack: 8,
        armor: 1,
        speed: 130,
        range: 80,
        attackSpeed: 1.3,
        cost: { food: 55, wood: 30, gold: 60, stone: 0 },
        trainTime: 30,
        size: 10,
        color: 0x77aa44,
      },
    },
    uniqueBuilding: {
      key: 'ger',
      config: {
        name: 'Ger',
        hp: 120,
        armor: 1,
        cost: { food: 0, wood: 20, gold: 0, stone: 0 },
        buildTime: 12,
        size: 1,
        produces: [],
        color: 0xccbb88,
      },
    },
    resourceBonus: {},
    gatherBonus: {},
    militaryBonus: { attackMult: 1.05, armorMult: 1.0, speedMult: 1.1 },
    color: 0x44aa44,
  },

  japan: {
    id: 'japan',
    name: 'Japan',
    description:
      'The warriors of Japan combine deadly precision with a culture of honor, forging elite infantry that strike with lethal efficiency.',
    bonuses: [
      'Infantry attack +15%',
      'Buildings build 15% faster',
    ],
    uniqueUnit: {
      key: 'samurai',
      config: {
        name: 'Samurai',
        hp: 70,
        attack: 13,
        armor: 3,
        speed: 68,
        range: 8,
        attackSpeed: 1.0,
        cost: { food: 60, wood: 0, gold: 50, stone: 0 },
        trainTime: 22,
        size: 9,
        color: 0xee5555,
      },
    },
    uniqueBuilding: {
      key: 'dojo',
      config: {
        name: 'Dojo',
        hp: 350,
        armor: 3,
        cost: { food: 0, wood: 150, gold: 50, stone: 25 },
        buildTime: 35,
        size: 2,
        produces: ['militia', 'samurai'],
        color: 0xaa2222,
      },
    },
    resourceBonus: {},
    gatherBonus: {},
    militaryBonus: { attackMult: 1.15, armorMult: 1.0, speedMult: 1.0 },
    color: 0xee3344,
  },
  // ── Additional Nations ──────────────────────────────────────

  persia: {
    id: 'persia',
    name: 'Persia',
    description: 'The great Persian Empire united diverse peoples under a sophisticated bureaucracy and fielded the legendary Immortals.',
    bonuses: ['Town Centers +30% HP', 'Units heal slowly when idle'],
    uniqueUnit: {
      key: 'immortal',
      config: {
        name: 'Immortal',
        hp: 80, attack: 10, armor: 3, speed: 72, range: 8,
        attackSpeed: 1.2, cost: { food: 55, wood: 0, gold: 45, stone: 0 },
        trainTime: 24, size: 8, color: 0xddaa00,
      },
    },
    uniqueBuilding: {
      key: 'satrap_court',
      config: {
        name: 'Satrap Court',
        hp: 400, armor: 4,
        cost: { food: 0, wood: 150, gold: 100, stone: 50 },
        buildTime: 45, size: 2, produces: [],
        color: 0xcc9933,
      },
    },
    resourceBonus: { gold: 1.15 },
    gatherBonus: {},
    militaryBonus: { attackMult: 1.0, armorMult: 1.1, speedMult: 1.05 },
    color: 0xddaa00,
  },

  greece: {
    id: 'greece',
    name: 'Greece',
    description: 'Birthplace of democracy and philosophy, Greece fielded disciplined hoplites and dominated the seas.',
    bonuses: ['Infantry +20% HP', 'Academy units train 15% faster'],
    uniqueUnit: {
      key: 'hoplite',
      config: {
        name: 'Hoplite',
        hp: 85, attack: 9, armor: 5, speed: 55, range: 10,
        attackSpeed: 1.1, cost: { food: 50, wood: 0, gold: 35, stone: 0 },
        trainTime: 22, size: 8, color: 0x4488cc,
      },
    },
    uniqueBuilding: {
      key: 'academy',
      config: {
        name: 'Academy',
        hp: 350, armor: 3,
        cost: { food: 0, wood: 200, gold: 100, stone: 0 },
        buildTime: 50, size: 2, produces: [],
        color: 0xddddff,
      },
    },
    resourceBonus: {},
    gatherBonus: { gold: 1.1 },
    militaryBonus: { attackMult: 1.0, armorMult: 1.15, speedMult: 1.0 },
    color: 0x4488cc,
  },

  aztec: {
    id: 'aztec',
    name: 'Aztec',
    description: 'Fierce warriors who built a mighty empire in Mesoamerica, fueled by tribute and fearsome jaguar knights.',
    bonuses: ['Military units +1 attack per age', 'Villagers carry +15% resources'],
    uniqueUnit: {
      key: 'jaguar_warrior',
      config: {
        name: 'Jaguar Warrior',
        hp: 65, attack: 14, armor: 1, speed: 85, range: 8,
        attackSpeed: 1.0, cost: { food: 60, wood: 0, gold: 30, stone: 0 },
        trainTime: 20, size: 8, color: 0x44aa44,
      },
    },
    uniqueBuilding: {
      key: 'sacrifice_altar',
      config: {
        name: 'Sacrifice Altar',
        hp: 300, armor: 2,
        cost: { food: 100, wood: 50, gold: 0, stone: 50 },
        buildTime: 35, size: 2, produces: [],
        color: 0xcc2222,
      },
    },
    resourceBonus: { food: 1.1 },
    gatherBonus: { food: 1.1 },
    militaryBonus: { attackMult: 1.1, armorMult: 1.0, speedMult: 1.05 },
    color: 0x44aa44,
  },

  india: {
    id: 'india',
    name: 'India',
    description: 'A land of empires and innovation, India wielded war elephants and advanced mathematics to dominate the subcontinent.',
    bonuses: ['Villagers +15% gather rate', 'Elephants cost -20%'],
    uniqueUnit: {
      key: 'war_elephant',
      config: {
        name: 'War Elephant',
        hp: 280, attack: 20, armor: 4, speed: 40, range: 10,
        attackSpeed: 2.0, cost: { food: 120, wood: 0, gold: 80, stone: 0 },
        trainTime: 45, size: 16, color: 0x888866,
      },
    },
    uniqueBuilding: {
      key: 'monastery',
      config: {
        name: 'Monastery',
        hp: 350, armor: 3,
        cost: { food: 0, wood: 175, gold: 75, stone: 25 },
        buildTime: 40, size: 2, produces: [],
        color: 0xffaa44,
      },
    },
    resourceBonus: { food: 1.1 },
    gatherBonus: { food: 1.15, wood: 1.05 },
    militaryBonus: { attackMult: 1.0, armorMult: 1.0, speedMult: 1.0 },
    color: 0xff8833,
  },

  britain: {
    id: 'britain',
    name: 'Britain',
    description: 'From longbowmen to the industrial revolution, Britain built an empire spanning the globe.',
    bonuses: ['Archers +15% range', 'Town Centers cost -15%'],
    uniqueUnit: {
      key: 'longbowman',
      config: {
        name: 'Longbowman',
        hp: 35, attack: 7, armor: 0, speed: 70, range: 130,
        attackSpeed: 0.8, cost: { food: 30, wood: 50, gold: 10, stone: 0 },
        trainTime: 26, size: 8, color: 0xcc3333,
      },
    },
    uniqueBuilding: {
      key: 'manor',
      config: {
        name: 'Manor House',
        hp: 200, armor: 2,
        cost: { food: 0, wood: 50, gold: 0, stone: 0 },
        buildTime: 20, size: 1, produces: ['villager'],
        color: 0xaa7744,
      },
    },
    resourceBonus: { wood: 1.1 },
    gatherBonus: { wood: 1.1 },
    militaryBonus: { attackMult: 1.0, armorMult: 1.0, speedMult: 1.0 },
    color: 0xcc3333,
  },

  france: {
    id: 'france',
    name: 'France',
    description: 'The chivalric knights of France led devastating cavalry charges, backed by a thriving economy and culture.',
    bonuses: ['Cavalry +20% HP', 'Markets generate +30% gold'],
    uniqueUnit: {
      key: 'chevalier',
      config: {
        name: 'Chevalier',
        hp: 140, attack: 13, armor: 4, speed: 110, range: 8,
        attackSpeed: 1.6, cost: { food: 70, wood: 0, gold: 80, stone: 0 },
        trainTime: 30, size: 10, color: 0x3344bb,
      },
    },
    uniqueBuilding: {
      key: 'chateau',
      config: {
        name: 'Château',
        hp: 600, armor: 6,
        cost: { food: 0, wood: 200, gold: 150, stone: 150 },
        buildTime: 60, size: 3, produces: [],
        color: 0x6666cc,
      },
    },
    resourceBonus: { gold: 1.1 },
    gatherBonus: { gold: 1.15 },
    militaryBonus: { attackMult: 1.0, armorMult: 1.05, speedMult: 1.05 },
    color: 0x3344bb,
  },

  ottoman: {
    id: 'ottoman',
    name: 'Ottoman',
    description: 'The Ottoman Empire wielded gunpowder with devastating effect, fielding elite Janissaries and massive cannons.',
    bonuses: ['Gunpowder units +15% attack', 'Free villager every 60s'],
    uniqueUnit: {
      key: 'janissary',
      config: {
        name: 'Janissary',
        hp: 60, attack: 18, armor: 2, speed: 62, range: 110,
        attackSpeed: 0.7, cost: { food: 60, wood: 0, gold: 55, stone: 0 },
        trainTime: 25, size: 8, color: 0xcc6644,
      },
    },
    uniqueBuilding: {
      key: 'grand_bazaar',
      config: {
        name: 'Grand Bazaar',
        hp: 450, armor: 4,
        cost: { food: 0, wood: 200, gold: 100, stone: 50 },
        buildTime: 50, size: 2, produces: [],
        color: 0xdd8844,
      },
    },
    resourceBonus: { gold: 1.1, food: 1.05 },
    gatherBonus: {},
    militaryBonus: { attackMult: 1.1, armorMult: 1.0, speedMult: 1.0 },
    color: 0xcc6644,
  },

  spain: {
    id: 'spain',
    name: 'Spain',
    description: 'Conquistadors and missionaries drove Spanish expansion, backed by powerful naval fleets and gold from the New World.',
    bonuses: ['Gold income +20%', 'Settlers train 25% faster'],
    uniqueUnit: {
      key: 'conquistador',
      config: {
        name: 'Conquistador',
        hp: 95, attack: 12, armor: 3, speed: 100, range: 60,
        attackSpeed: 1.2, cost: { food: 60, wood: 0, gold: 70, stone: 0 },
        trainTime: 28, size: 10, color: 0xddcc22,
      },
    },
    uniqueBuilding: {
      key: 'mission',
      config: {
        name: 'Mission',
        hp: 300, armor: 3,
        cost: { food: 0, wood: 100, gold: 75, stone: 25 },
        buildTime: 35, size: 2, produces: [],
        color: 0xeeeeaa,
      },
    },
    resourceBonus: { gold: 1.2 },
    gatherBonus: { gold: 1.1 },
    militaryBonus: { attackMult: 1.05, armorMult: 1.0, speedMult: 1.05 },
    color: 0xddcc22,
  },

  russia: {
    id: 'russia',
    name: 'Russia',
    description: 'Vast and relentless, Russia fielded massive armies and endured any hardship through sheer numbers and resilience.',
    bonuses: ['Units train 15% faster', 'Buildings +10% HP in cold (all terrain)'],
    uniqueUnit: {
      key: 'streltsy',
      config: {
        name: 'Streltsy',
        hp: 55, attack: 15, armor: 1, speed: 60, range: 100,
        attackSpeed: 0.65, cost: { food: 40, wood: 20, gold: 40, stone: 0 },
        trainTime: 18, size: 8, color: 0x44aa88,
      },
    },
    uniqueBuilding: {
      key: 'krepost',
      config: {
        name: 'Krepost',
        hp: 700, armor: 7,
        cost: { food: 0, wood: 250, gold: 100, stone: 200 },
        buildTime: 65, size: 2, produces: ['streltsy'],
        color: 0x558877,
      },
    },
    resourceBonus: { wood: 1.1 },
    gatherBonus: { wood: 1.1 },
    militaryBonus: { attackMult: 1.0, armorMult: 1.05, speedMult: 1.0 },
    color: 0x44aa88,
  },

  korea: {
    id: 'korea',
    name: 'Korea',
    description: 'Korean ingenuity produced advanced siege weapons and turtle ships, defending their homeland against larger foes.',
    bonuses: ['Towers +20% range', 'Siege units +15% HP'],
    uniqueUnit: {
      key: 'hwarang',
      config: {
        name: 'Hwarang',
        hp: 70, attack: 11, armor: 3, speed: 75, range: 8,
        attackSpeed: 1.1, cost: { food: 50, wood: 0, gold: 40, stone: 0 },
        trainTime: 22, size: 8, color: 0x66aadd,
      },
    },
    uniqueBuilding: {
      key: 'hwacheon',
      config: {
        name: 'Hwacheon Platform',
        hp: 250, armor: 3,
        cost: { food: 0, wood: 150, gold: 75, stone: 50 },
        buildTime: 40, size: 2, produces: [],
        color: 0x5588aa,
      },
    },
    resourceBonus: { stone: 1.15 },
    gatherBonus: { stone: 1.1 },
    militaryBonus: { attackMult: 1.0, armorMult: 1.1, speedMult: 1.0 },
    color: 0x5588bb,
  },

  mali: {
    id: 'mali',
    name: 'Mali',
    description: 'The wealthiest empire in medieval Africa, Mali controlled gold trade routes and built the legendary city of Timbuktu.',
    bonuses: ['Gold gathering +25%', 'Markets generate double income'],
    uniqueUnit: {
      key: 'gbeto',
      config: {
        name: 'Gbeto',
        hp: 45, attack: 10, armor: 0, speed: 90, range: 48,
        attackSpeed: 0.9, cost: { food: 40, wood: 0, gold: 35, stone: 0 },
        trainTime: 18, size: 8, color: 0xddaa44,
      },
    },
    uniqueBuilding: {
      key: 'pit_mine',
      config: {
        name: 'Pit Mine',
        hp: 250, armor: 2,
        cost: { food: 0, wood: 100, gold: 0, stone: 50 },
        buildTime: 30, size: 2, produces: [],
        color: 0xaa8833,
      },
    },
    resourceBonus: { gold: 1.25 },
    gatherBonus: { gold: 1.2 },
    militaryBonus: { attackMult: 1.05, armorMult: 1.0, speedMult: 1.1 },
    color: 0xddaa44,
  },

  ethiopia: {
    id: 'ethiopia',
    name: 'Ethiopia',
    description: 'One of the oldest civilizations in Africa, Ethiopia repelled invaders from mountain fortresses with disciplined archers.',
    bonuses: ['Archers +10% attack', 'Buildings on hills +25% HP'],
    uniqueUnit: {
      key: 'shotel_warrior',
      config: {
        name: 'Shotel Warrior',
        hp: 50, attack: 13, armor: 0, speed: 90, range: 8,
        attackSpeed: 0.8, cost: { food: 45, wood: 0, gold: 35, stone: 0 },
        trainTime: 16, size: 8, color: 0x33aa33,
      },
    },
    uniqueBuilding: {
      key: 'rock_church',
      config: {
        name: 'Rock Church',
        hp: 500, armor: 6,
        cost: { food: 0, wood: 50, gold: 50, stone: 150 },
        buildTime: 55, size: 2, produces: [],
        color: 0x997766,
      },
    },
    resourceBonus: { stone: 1.1 },
    gatherBonus: {},
    militaryBonus: { attackMult: 1.1, armorMult: 1.0, speedMult: 1.05 },
    color: 0x33aa33,
  },

  polynesia: {
    id: 'polynesia',
    name: 'Polynesia',
    description: 'Master navigators who settled the vast Pacific, Polynesian warriors were fearsome in close combat.',
    bonuses: ['Units +15% speed near water', 'Free outpost when founding a city'],
    uniqueUnit: {
      key: 'toa_warrior',
      config: {
        name: 'Toa Warrior',
        hp: 75, attack: 12, armor: 1, speed: 80, range: 8,
        attackSpeed: 1.0, cost: { food: 50, wood: 20, gold: 20, stone: 0 },
        trainTime: 20, size: 8, color: 0x44ccaa,
      },
    },
    uniqueBuilding: {
      key: 'marae',
      config: {
        name: 'Marae',
        hp: 300, armor: 2,
        cost: { food: 50, wood: 100, gold: 0, stone: 50 },
        buildTime: 35, size: 2, produces: [],
        color: 0x55bbaa,
      },
    },
    resourceBonus: { food: 1.15 },
    gatherBonus: { food: 1.1 },
    militaryBonus: { attackMult: 1.05, armorMult: 1.0, speedMult: 1.1 },
    color: 0x44ccaa,
  },
};

// ---------------------------------------------------------------------------
// Derived exports
// ---------------------------------------------------------------------------

/** Flat array of all nation configs, useful for UI iteration. */
export const NATION_LIST: NationConfig[] = Object.values(NATIONS);

/** Returns an array of all nation id strings. */
export function getNationIds(): string[] {
  return Object.keys(NATIONS);
}
