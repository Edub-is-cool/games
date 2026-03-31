import { GameWorld, EntityData } from './GameWorld';
import { UNITS } from '../config/units';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CityReward =
  | 'free_unit'
  | 'walls'
  | 'gather_boost'
  | 'border_expansion'
  | 'pop_boost';

export const ALL_CITY_REWARDS: CityReward[] = [
  'free_unit',
  'walls',
  'gather_boost',
  'border_expansion',
  'pop_boost',
];

export interface CityData {
  level: number; // 1-5
  xp: number;
  rewards: CityReward[];
  influenceRadius: number;
  pendingLevelUp: boolean;
  gatherBoostCount: number; // how many gather_boost rewards stacked
}

const DEFAULT_INFLUENCE_RADIUS = 200;

/** Cumulative XP needed to reach each level (index = level). Index 0/1 unused. */
const LEVEL_THRESHOLDS: Record<number, number> = {
  2: 50,
  3: 120,
  4: 250,
  5: 500,
};

// ---------------------------------------------------------------------------
// CitySystem
// ---------------------------------------------------------------------------

export class CitySystem {
  /** TC entity id -> city data */
  private cities: Map<number, CityData> = new Map();

  /**
   * Snapshot helpers used to detect deltas each update tick.
   * We track what we already credited so we don't double-count.
   */
  private knownBuildings: Set<number> = new Set();
  private knownUnits: Set<number> = new Set();
  private lastResourceTotals: Map<number, number> = new Map(); // playerId -> total gathered resources credited

  constructor(private world: GameWorld) {}

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Call every frame. Detects new buildings/units and resource changes. */
  update(_delta: number): void {
    this.syncCities();
    this.detectNewBuildings();
    this.detectNewUnits();
    this.detectResourceGathering();
    this.evaluateLevelUps();
  }

  /** Returns the level of the city associated with the given TC entity id. */
  getCityLevel(entityId: number): number {
    return this.cities.get(entityId)?.level ?? 0;
  }

  /** Returns the full city data for a TC, or undefined. */
  getCityData(entityId: number): CityData | undefined {
    return this.cities.get(entityId);
  }

  /** Entity IDs of cities owned by `playerId` that have a pending level-up choice. */
  getPendingLevelUps(playerId: number): number[] {
    const result: number[] = [];
    for (const [entityId, city] of this.cities) {
      const entity = this.world.entities.get(entityId);
      if (entity && entity.owner === playerId && city.pendingLevelUp) {
        result.push(entityId);
      }
    }
    return result;
  }

  /** Available reward choices for a city with a pending level-up. */
  getLevelUpRewards(cityId: number): string[] {
    const city = this.cities.get(cityId);
    if (!city || !city.pendingLevelUp) return [];
    // All rewards are always available — players can stack some of them.
    return [...ALL_CITY_REWARDS];
  }

  /** Apply a chosen reward to a city and clear its pending flag. */
  chooseLevelUpReward(cityId: number, reward: CityReward): void {
    const city = this.cities.get(cityId);
    if (!city || !city.pendingLevelUp) return;

    const entity = this.world.entities.get(cityId);
    if (!entity) return;

    city.rewards.push(reward);
    city.pendingLevelUp = false;

    switch (reward) {
      case 'free_unit': {
        // Spawn a militia next to the TC
        const militia = UNITS.militia;
        this.world.spawnEntity(
          'unit',
          'militia',
          entity.owner,
          entity.x + 30,
          entity.y + 30,
          militia.hp
        );
        this.world.recalcPopUsed(entity.owner);
        break;
      }
      case 'walls': {
        // +100 HP boost to the TC
        entity.maxHp += 100;
        entity.hp += 100;
        break;
      }
      case 'gather_boost': {
        // +10% gather rate tracked via gatherBoostCount
        city.gatherBoostCount++;
        break;
      }
      case 'border_expansion': {
        // Increase influence radius by 50
        city.influenceRadius += 50;
        break;
      }
      case 'pop_boost': {
        // +3 pop cap for the owning player
        const player = this.world.players.get(entity.owner);
        if (player) {
          player.popCap += 3;
        }
        break;
      }
    }
  }

  /** Returns the gather rate multiplier for a villager at (x, y) owned by playerId. */
  getGatherMultiplier(playerId: number, x: number, y: number): number {
    let multiplier = 1.0;
    for (const [entityId, city] of this.cities) {
      if (city.gatherBoostCount === 0) continue;
      const tc = this.world.entities.get(entityId);
      if (!tc || tc.owner !== playerId) continue;
      const dx = tc.x - x;
      const dy = tc.y - y;
      if (dx * dx + dy * dy <= city.influenceRadius * city.influenceRadius) {
        multiplier += 0.1 * city.gatherBoostCount;
      }
    }
    return multiplier;
  }

  /** Returns all tracked city entries (for scoring, etc.). */
  getAllCities(): Map<number, CityData> {
    return this.cities;
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  /** Ensure every living Town Center has a city entry. */
  private syncCities(): void {
    for (const entity of this.world.entities.values()) {
      if (
        entity.key === 'townCenter' &&
        entity.state !== 'dead' &&
        (entity.buildProgress === undefined || entity.buildProgress >= 1)
      ) {
        if (!this.cities.has(entity.id)) {
          this.cities.set(entity.id, {
            level: 1,
            xp: 0,
            rewards: [],
            influenceRadius: DEFAULT_INFLUENCE_RADIUS,
            pendingLevelUp: false,
            gatherBoostCount: 0,
          });
        }
      }
    }

    // Remove cities whose TC is dead or gone
    for (const entityId of this.cities.keys()) {
      const entity = this.world.entities.get(entityId);
      if (!entity || entity.state === 'dead') {
        this.cities.delete(entityId);
      }
    }
  }

  /** Detect newly completed buildings near a city and grant XP. */
  private detectNewBuildings(): void {
    for (const entity of this.world.entities.values()) {
      if (entity.type !== 'building') continue;
      if (entity.state === 'dead') continue;
      if (entity.buildProgress !== undefined && entity.buildProgress < 1) continue;
      if (this.knownBuildings.has(entity.id)) continue;

      // Mark as known so we only credit once
      this.knownBuildings.add(entity.id);

      // Skip TCs themselves — they create the city, they don't grant XP
      if (entity.key === 'townCenter') continue;

      // Find closest friendly city within influence radius
      this.awardXpToNearestCity(entity, 10);
    }
  }

  /** Detect newly created units and grant XP to the nearest city. */
  private detectNewUnits(): void {
    for (const entity of this.world.entities.values()) {
      if (entity.type !== 'unit') continue;
      if (entity.state === 'dead') continue;
      if (this.knownUnits.has(entity.id)) continue;

      this.knownUnits.add(entity.id);
      this.awardXpToNearestCity(entity, 5);
    }
  }

  /** Detect resource gathering: compare total resources per player to last snapshot. */
  private detectResourceGathering(): void {
    for (const [playerId, player] of this.world.players) {
      const total =
        player.resources.food +
        player.resources.wood +
        player.resources.gold +
        player.resources.stone;

      const last = this.lastResourceTotals.get(playerId) ?? total;
      const gained = total - last;
      this.lastResourceTotals.set(playerId, total);

      if (gained <= 0) continue;

      // +1 XP per 50 resources gained, distributed to player's cities evenly
      const xpGain = Math.floor(gained / 50);
      if (xpGain <= 0) continue;

      const playerCities: number[] = [];
      for (const [entityId] of this.cities) {
        const tc = this.world.entities.get(entityId);
        if (tc && tc.owner === playerId) {
          playerCities.push(entityId);
        }
      }
      if (playerCities.length === 0) continue;

      const perCity = Math.max(1, Math.floor(xpGain / playerCities.length));
      for (const cid of playerCities) {
        const city = this.cities.get(cid)!;
        city.xp += perCity;
      }
    }
  }

  /** Award XP to the nearest friendly city within its influence radius. */
  private awardXpToNearestCity(entity: EntityData, xp: number): void {
    let bestDist = Infinity;
    let bestCityId: number | null = null;

    for (const [cityId, cityData] of this.cities) {
      const tc = this.world.entities.get(cityId);
      if (!tc || tc.owner !== entity.owner) continue;

      const dx = tc.x - entity.x;
      const dy = tc.y - entity.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= cityData.influenceRadius && dist < bestDist) {
        bestDist = dist;
        bestCityId = cityId;
      }
    }

    if (bestCityId !== null) {
      this.cities.get(bestCityId)!.xp += xp;
    }
  }

  /** Check all cities for level-up eligibility. */
  private evaluateLevelUps(): void {
    for (const [, city] of this.cities) {
      if (city.pendingLevelUp) continue; // already waiting for player choice
      if (city.level >= 5) continue; // max level

      const nextLevel = city.level + 1;
      const threshold = LEVEL_THRESHOLDS[nextLevel];
      if (threshold !== undefined && city.xp >= threshold) {
        city.level = nextLevel;
        city.pendingLevelUp = true;
      }
    }
  }
}
