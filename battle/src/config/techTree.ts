// ---------------------------------------------------------------------------
// Technology / Research Tree
// ---------------------------------------------------------------------------

export type TechEffect =
  | {
      type: 'unit_stat';
      unitKey: string | 'all_infantry' | 'all_cavalry' | 'all_ranged';
      stat: 'hp' | 'attack' | 'armor' | 'speed' | 'range';
      bonus: number;
    }
  | {
      type: 'gather_rate';
      resource: string;
      bonus: number; // multiplier, e.g. 0.2 = +20%
    }
  | {
      type: 'build_speed';
      bonus: number;
    }
  | {
      type: 'cost_reduction';
      target: string;
      reduction: number; // multiplier, e.g. 0.15 = -15%
    };

export interface Technology {
  id: string;
  name: string;
  description: string;
  cost: { food: number; wood: number; gold: number; stone: number };
  researchTime: number; // seconds
  ageRequired: number; // 1-5
  prerequisites: string[]; // other tech ids
  effects: TechEffect[];
  exclusive?: string; // id of mutually exclusive tech
}

// ---------------------------------------------------------------------------
// Age 1 — Dawn Age (4 techs)
// ---------------------------------------------------------------------------

const loom: Technology = {
  id: 'loom',
  name: 'Loom',
  description: 'Villagers weave protective clothing, increasing their survivability.',
  cost: { food: 50, wood: 0, gold: 0, stone: 0 },
  researchTime: 25,
  ageRequired: 1,
  prerequisites: [],
  effects: [{ type: 'unit_stat', unitKey: 'villager', stat: 'hp', bonus: 15 }],
};

const stoneMining: Technology = {
  id: 'stone_mining',
  name: 'Stone Mining',
  description: 'Improved stone-working techniques increase quarrying efficiency.',
  cost: { food: 100, wood: 75, gold: 0, stone: 0 },
  researchTime: 30,
  ageRequired: 1,
  prerequisites: [],
  effects: [{ type: 'gather_rate', resource: 'stone', bonus: 0.2 }],
};

const huntingDogs: Technology = {
  id: 'hunting_dogs',
  name: 'Hunting Dogs',
  description: 'Trained dogs help hunters track and catch prey faster.',
  cost: { food: 75, wood: 50, gold: 0, stone: 0 },
  researchTime: 25,
  ageRequired: 1,
  prerequisites: [],
  effects: [{ type: 'gather_rate', resource: 'food_hunt', bonus: 0.3 }],
};

const woodworking: Technology = {
  id: 'woodworking',
  name: 'Woodworking',
  description: 'Better axes and sawing methods improve lumber collection.',
  cost: { food: 75, wood: 50, gold: 0, stone: 0 },
  researchTime: 30,
  ageRequired: 1,
  prerequisites: [],
  effects: [{ type: 'gather_rate', resource: 'wood', bonus: 0.15 }],
};

// ---------------------------------------------------------------------------
// Age 2 — Bronze Age (6 techs)
// ---------------------------------------------------------------------------

const scaleArmor: Technology = {
  id: 'scale_armor',
  name: 'Scale Armor',
  description: 'Overlapping metal scales provide basic protection for foot soldiers.',
  cost: { food: 100, wood: 0, gold: 75, stone: 0 },
  researchTime: 40,
  ageRequired: 2,
  prerequisites: [],
  effects: [{ type: 'unit_stat', unitKey: 'all_infantry', stat: 'armor', bonus: 1 }],
};

const fletching: Technology = {
  id: 'fletching',
  name: 'Fletching',
  description: 'Properly feathered arrows fly straighter and farther.',
  cost: { food: 100, wood: 50, gold: 50, stone: 0 },
  researchTime: 35,
  ageRequired: 2,
  prerequisites: [],
  effects: [{ type: 'unit_stat', unitKey: 'all_ranged', stat: 'range', bonus: 1 }],
};

const wheel: Technology = {
  id: 'wheel',
  name: 'Wheel',
  description: 'Wheeled carts let villagers transport goods more quickly.',
  cost: { food: 175, wood: 75, gold: 0, stone: 0 },
  researchTime: 45,
  ageRequired: 2,
  prerequisites: [],
  effects: [{ type: 'unit_stat', unitKey: 'villager', stat: 'speed', bonus: 0.15 }],
};

const goldMining: Technology = {
  id: 'gold_mining',
  name: 'Gold Mining',
  description: 'Refined smelting techniques extract more gold from ore.',
  cost: { food: 100, wood: 75, gold: 0, stone: 0 },
  researchTime: 35,
  ageRequired: 2,
  prerequisites: [],
  effects: [{ type: 'gather_rate', resource: 'gold', bonus: 0.2 }],
};

const masonry: Technology = {
  id: 'masonry',
  name: 'Masonry',
  description: 'Dressed stone construction makes all buildings more durable.',
  cost: { food: 0, wood: 150, gold: 100, stone: 75 },
  researchTime: 50,
  ageRequired: 2,
  prerequisites: [],
  effects: [{ type: 'unit_stat', unitKey: 'all_buildings', stat: 'hp', bonus: 0.1 }],
};

const domestication: Technology = {
  id: 'domestication',
  name: 'Domestication',
  description: 'Selective breeding of livestock improves farm output.',
  cost: { food: 150, wood: 75, gold: 0, stone: 0 },
  researchTime: 40,
  ageRequired: 2,
  prerequisites: [],
  effects: [{ type: 'gather_rate', resource: 'food_farm', bonus: 0.25 }],
};

// ---------------------------------------------------------------------------
// Age 3 — Iron Age (8 techs)
// ---------------------------------------------------------------------------

const chainMail: Technology = {
  id: 'chain_mail',
  name: 'Chain Mail',
  description: 'Interlocking metal rings greatly improve infantry protection.',
  cost: { food: 200, wood: 0, gold: 150, stone: 0 },
  researchTime: 55,
  ageRequired: 3,
  prerequisites: ['scale_armor'],
  effects: [{ type: 'unit_stat', unitKey: 'all_infantry', stat: 'armor', bonus: 2 }],
};

const bodkinArrow: Technology = {
  id: 'bodkin_arrow',
  name: 'Bodkin Arrow',
  description: 'Hardened arrow tips pierce armor and extend effective range.',
  cost: { food: 200, wood: 100, gold: 100, stone: 0 },
  researchTime: 50,
  ageRequired: 3,
  prerequisites: ['fletching'],
  effects: [
    { type: 'unit_stat', unitKey: 'all_ranged', stat: 'attack', bonus: 1 },
    { type: 'unit_stat', unitKey: 'all_ranged', stat: 'range', bonus: 1 },
  ],
};

const ironCasting: Technology = {
  id: 'iron_casting',
  name: 'Iron Casting',
  description: 'Cast iron weapons give infantry a devastating cutting edge.',
  cost: { food: 150, wood: 0, gold: 200, stone: 0 },
  researchTime: 50,
  ageRequired: 3,
  prerequisites: [],
  effects: [{ type: 'unit_stat', unitKey: 'all_infantry', stat: 'attack', bonus: 2 }],
};

const husbandry: Technology = {
  id: 'husbandry',
  name: 'Husbandry',
  description: 'Selective horse breeding produces faster mounts.',
  cost: { food: 150, wood: 0, gold: 100, stone: 0 },
  researchTime: 40,
  ageRequired: 3,
  prerequisites: [],
  effects: [{ type: 'unit_stat', unitKey: 'all_cavalry', stat: 'speed', bonus: 0.1 }],
};

const fortifiedWall: Technology = {
  id: 'fortified_wall',
  name: 'Fortified Wall',
  description: 'Thicker walls with reinforced foundations withstand siege punishment.',
  cost: { food: 0, wood: 200, gold: 100, stone: 200 },
  researchTime: 50,
  ageRequired: 3,
  prerequisites: [],
  effects: [{ type: 'unit_stat', unitKey: 'all_buildings', stat: 'hp', bonus: 0.3 }],
};

const siegeEngineering: Technology = {
  id: 'siege_engineering',
  name: 'Siege Engineering',
  description: 'Advanced engineering makes siege weapons far more destructive.',
  cost: { food: 0, wood: 200, gold: 200, stone: 100 },
  researchTime: 55,
  ageRequired: 3,
  prerequisites: [],
  effects: [
    { type: 'unit_stat', unitKey: 'catapult', stat: 'attack', bonus: 0.2 },
  ],
};

const ballistics: Technology = {
  id: 'ballistics',
  name: 'Ballistics',
  description: 'Mathematical trajectory calculations make ranged projectiles more accurate.',
  cost: { food: 0, wood: 150, gold: 200, stone: 0 },
  researchTime: 60,
  ageRequired: 3,
  prerequisites: [],
  effects: [{ type: 'unit_stat', unitKey: 'all_ranged', stat: 'attack', bonus: 1 }],
};

const cropRotation: Technology = {
  id: 'crop_rotation',
  name: 'Crop Rotation',
  description: 'Alternating crops restores soil fertility and boosts harvests dramatically.',
  cost: { food: 250, wood: 100, gold: 0, stone: 0 },
  researchTime: 50,
  ageRequired: 3,
  prerequisites: ['domestication'],
  effects: [{ type: 'gather_rate', resource: 'food_farm', bonus: 0.5 }],
};

// ---------------------------------------------------------------------------
// Age 4 — Gunpowder Age (7 techs)
// ---------------------------------------------------------------------------

const plateArmor: Technology = {
  id: 'plate_armor',
  name: 'Plate Armor',
  description: 'Full plate harness makes infantry nearly impervious to melee attacks.',
  cost: { food: 300, wood: 0, gold: 250, stone: 0 },
  researchTime: 65,
  ageRequired: 4,
  prerequisites: [],
  effects: [{ type: 'unit_stat', unitKey: 'all_infantry', stat: 'armor', bonus: 3 }],
  exclusive: 'gunpowder_tactics',
};

const gunpowderTactics: Technology = {
  id: 'gunpowder_tactics',
  name: 'Gunpowder Tactics',
  description: 'Disciplined firing lines and volley tactics maximize firearm lethality.',
  cost: { food: 200, wood: 0, gold: 300, stone: 0 },
  researchTime: 60,
  ageRequired: 4,
  prerequisites: [],
  effects: [
    { type: 'unit_stat', unitKey: 'musketeer', stat: 'attack', bonus: 0.2 },
    { type: 'unit_stat', unitKey: 'cannon', stat: 'attack', bonus: 0.2 },
  ],
  exclusive: 'plate_armor',
};

const chemistry: Technology = {
  id: 'chemistry',
  name: 'Chemistry',
  description: 'Scientific understanding of combustion improves all ranged munitions.',
  cost: { food: 0, wood: 100, gold: 300, stone: 0 },
  researchTime: 55,
  ageRequired: 4,
  prerequisites: [],
  effects: [{ type: 'unit_stat', unitKey: 'all_ranged', stat: 'attack', bonus: 1 }],
};

const banking: Technology = {
  id: 'banking',
  name: 'Banking',
  description: 'Financial institutions generate a steady trickle of gold income.',
  cost: { food: 0, wood: 200, gold: 250, stone: 0 },
  researchTime: 50,
  ageRequired: 4,
  prerequisites: [],
  effects: [{ type: 'gather_rate', resource: 'gold', bonus: 0.5 }],
};

const architecture: Technology = {
  id: 'architecture',
  name: 'Architecture',
  description: 'Buttresses and vaulted ceilings make structures far more resilient.',
  cost: { food: 0, wood: 200, gold: 150, stone: 150 },
  researchTime: 55,
  ageRequired: 4,
  prerequisites: ['masonry'],
  effects: [{ type: 'unit_stat', unitKey: 'all_buildings', stat: 'hp', bonus: 0.2 }],
};

const conscription: Technology = {
  id: 'conscription',
  name: 'Conscription',
  description: 'Mandatory military service dramatically shortens unit training times.',
  cost: { food: 300, wood: 0, gold: 200, stone: 0 },
  researchTime: 60,
  ageRequired: 4,
  prerequisites: [],
  effects: [{ type: 'cost_reduction', target: 'train_time', reduction: 0.25 }],
};

const heavyPlow: Technology = {
  id: 'heavy_plow',
  name: 'Heavy Plow',
  description: 'Iron-tipped plows turn soil deeply, improving crop yields.',
  cost: { food: 200, wood: 100, gold: 50, stone: 0 },
  researchTime: 40,
  ageRequired: 4,
  prerequisites: [],
  effects: [{ type: 'gather_rate', resource: 'food', bonus: 0.3 }],
};

// ---------------------------------------------------------------------------
// Age 5 — Modern Age (5 techs)
// ---------------------------------------------------------------------------

const industrialization: Technology = {
  id: 'industrialization',
  name: 'Industrialization',
  description: 'Mechanized production and logistics boost all resource gathering.',
  cost: { food: 400, wood: 300, gold: 400, stone: 200 },
  researchTime: 80,
  ageRequired: 5,
  prerequisites: [],
  effects: [
    { type: 'gather_rate', resource: 'food', bonus: 0.2 },
    { type: 'gather_rate', resource: 'wood', bonus: 0.2 },
    { type: 'gather_rate', resource: 'gold', bonus: 0.2 },
    { type: 'gather_rate', resource: 'stone', bonus: 0.2 },
  ],
};

const rifling: Technology = {
  id: 'rifling',
  name: 'Rifling',
  description: 'Grooved barrels spin projectiles for superior accuracy and range.',
  cost: { food: 0, wood: 200, gold: 500, stone: 0 },
  researchTime: 70,
  ageRequired: 5,
  prerequisites: [],
  effects: [
    { type: 'unit_stat', unitKey: 'all_ranged', stat: 'attack', bonus: 2 },
    { type: 'unit_stat', unitKey: 'all_ranged', stat: 'range', bonus: 20 },
  ],
};

const tankArmor: Technology = {
  id: 'tank_armor',
  name: 'Tank Armor',
  description: 'Composite armor plating makes tanks nearly indestructible.',
  cost: { food: 0, wood: 0, gold: 500, stone: 300 },
  researchTime: 65,
  ageRequired: 5,
  prerequisites: [],
  effects: [{ type: 'unit_stat', unitKey: 'tank', stat: 'hp', bonus: 0.3 }],
};

const totalWar: Technology = {
  id: 'total_war',
  name: 'Total War',
  description: 'Full national mobilization empowers all military units.',
  cost: { food: 500, wood: 300, gold: 500, stone: 0 },
  researchTime: 90,
  ageRequired: 5,
  prerequisites: [],
  effects: [
    { type: 'unit_stat', unitKey: 'all_infantry', stat: 'attack', bonus: 0.1 },
    { type: 'unit_stat', unitKey: 'all_infantry', stat: 'speed', bonus: 0.1 },
    { type: 'unit_stat', unitKey: 'all_cavalry', stat: 'attack', bonus: 0.1 },
    { type: 'unit_stat', unitKey: 'all_cavalry', stat: 'speed', bonus: 0.1 },
    { type: 'unit_stat', unitKey: 'all_ranged', stat: 'attack', bonus: 0.1 },
    { type: 'unit_stat', unitKey: 'all_ranged', stat: 'speed', bonus: 0.1 },
  ],
};

const logistics: Technology = {
  id: 'logistics',
  name: 'Logistics',
  description: 'Streamlined supply chains reduce the cost of fielding armies.',
  cost: { food: 400, wood: 200, gold: 400, stone: 0 },
  researchTime: 75,
  ageRequired: 5,
  prerequisites: [],
  effects: [{ type: 'cost_reduction', target: 'all_military', reduction: 0.15 }],
};

// ---------------------------------------------------------------------------
// Master registry
// ---------------------------------------------------------------------------

export const TECHNOLOGIES: Record<string, Technology> = {
  // Age 1
  [loom.id]: loom,
  [stoneMining.id]: stoneMining,
  [huntingDogs.id]: huntingDogs,
  [woodworking.id]: woodworking,

  // Age 2
  [scaleArmor.id]: scaleArmor,
  [fletching.id]: fletching,
  [wheel.id]: wheel,
  [goldMining.id]: goldMining,
  [masonry.id]: masonry,
  [domestication.id]: domestication,

  // Age 3
  [chainMail.id]: chainMail,
  [bodkinArrow.id]: bodkinArrow,
  [ironCasting.id]: ironCasting,
  [husbandry.id]: husbandry,
  [fortifiedWall.id]: fortifiedWall,
  [siegeEngineering.id]: siegeEngineering,
  [ballistics.id]: ballistics,
  [cropRotation.id]: cropRotation,

  // Age 4
  [plateArmor.id]: plateArmor,
  [gunpowderTactics.id]: gunpowderTactics,
  [chemistry.id]: chemistry,
  [banking.id]: banking,
  [architecture.id]: architecture,
  [conscription.id]: conscription,
  [heavyPlow.id]: heavyPlow,

  // Age 5
  [industrialization.id]: industrialization,
  [rifling.id]: rifling,
  [tankArmor.id]: tankArmor,
  [totalWar.id]: totalWar,
  [logistics.id]: logistics,
};

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/** Return all technologies that belong to a specific age. */
export function getTechsForAge(age: number): Technology[] {
  return Object.values(TECHNOLOGIES).filter((t) => t.ageRequired === age);
}

/**
 * Return technologies a player is allowed to begin researching right now.
 *
 * A tech is available when:
 *  - The player's age >= tech.ageRequired
 *  - All prerequisites have been researched
 *  - The tech itself has not been researched
 *  - No mutually exclusive tech has been researched
 */
export function getAvailableTechs(
  playerAge: number,
  researched: string[],
): Technology[] {
  const researchedSet = new Set(researched);

  return Object.values(TECHNOLOGIES).filter((tech) => {
    // Already researched
    if (researchedSet.has(tech.id)) return false;

    // Age gate
    if (playerAge < tech.ageRequired) return false;

    // Prerequisites
    if (!tech.prerequisites.every((p) => researchedSet.has(p))) return false;

    // Mutual exclusivity
    if (tech.exclusive && researchedSet.has(tech.exclusive)) return false;

    return true;
  });
}
