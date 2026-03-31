export interface FoodSourceConfig {
  /** Display name. */
  name: string;
  /** Category: 'natural' spawns on the map, 'built' is placed by villagers. */
  type: 'natural' | 'built';
  /** Resources gathered per second by one villager. */
  gatherRate: number;
  /**
   * Total hit-points of the source (acts as remaining food supply).
   * Infinite sources use `Infinity`.
   */
  hp: number;
  /** If true, the source must be constructed as a building. */
  built: boolean;
  /** Build cost (only relevant when `built` is true). */
  cost?: { food: number; wood: number; gold: number; stone: number };
  /** Minimum age required (1-indexed). Defaults to 1 if omitted. */
  requiredAge?: number;
  /** Optional placement constraint. */
  placement?: 'water';
  /** Extra notes for game-logic hooks. */
  notes?: string;
}

export const FOOD_SOURCES: Record<string, FoodSourceConfig> = {
  berryBush: {
    name: 'Berry Bush',
    type: 'natural',
    gatherRate: 0.4,
    hp: 100,
    built: false,
    notes: 'Standard starting food source. Spawns in small clusters near town centers.',
  },
  deer: {
    name: 'Deer',
    type: 'natural',
    gatherRate: 0.6,
    hp: 50,
    built: false,
    notes: 'Must be hunted — villager walks to deer; deer does not flee.',
  },
  fish: {
    name: 'Fish',
    type: 'natural',
    gatherRate: 0.5,
    hp: 200,
    built: false,
    placement: 'water',
    notes: 'Only gatherable near water tiles. High total yield but requires water access.',
  },
  farm: {
    name: 'Farm',
    type: 'built',
    gatherRate: 0.3,
    hp: Infinity,
    built: true,
    cost: { food: 0, wood: 60, gold: 0, stone: 0 },
    requiredAge: 2,
    notes: 'Infinite food production at a slower rate. Built by villagers. Requires Age 2.',
  },
};
