import { GameWorld, EntityData } from './GameWorld';
import { UNITS, UnitConfig } from '../config/units';

// ---------------------------------------------------------------------------
// Veterancy types
// ---------------------------------------------------------------------------

export type Promotion =
  | 'tough'
  | 'strong'
  | 'armored'
  | 'swift'
  | 'sharpshooter'
  | 'heal'
  | 'flanker';

export interface VeterancyRecord {
  xp: number;
  level: number;
  promotions: Promotion[];
  /** True when the unit levelled up but hasn't picked a promotion yet. */
  pendingPromotion: boolean;
}

/** XP thresholds per level (level -> cumulative XP required). */
const LEVEL_XP: Record<number, number> = {
  1: 0,
  2: 20,
  3: 50,
  4: 100,
  5: 200,
};

const MAX_LEVEL = 5;

// ---------------------------------------------------------------------------
// Great People types
// ---------------------------------------------------------------------------

export type GPPCategory = 'military' | 'economic' | 'cultural';

export interface GreatPersonDef {
  key: string;
  name: string;
  hp: number;
  attack: number;
  speed: number;
  range: number;
  category: GPPCategory;
  color: number;
  size: number;
}

export const GREAT_PEOPLE: Record<string, GreatPersonDef> = {
  greatGeneral: {
    key: 'greatGeneral',
    name: 'Great General',
    hp: 200,
    attack: 0,
    speed: 60,
    range: 0,
    category: 'military',
    color: 0xffd700,
    size: 12,
  },
  greatEngineer: {
    key: 'greatEngineer',
    name: 'Great Engineer',
    hp: 50,
    attack: 0,
    speed: 70,
    range: 0,
    category: 'economic',
    color: 0xc0c0c0,
    size: 10,
  },
  greatMerchant: {
    key: 'greatMerchant',
    name: 'Great Merchant',
    hp: 50,
    attack: 0,
    speed: 70,
    range: 0,
    category: 'cultural',
    color: 0xff8c00,
    size: 10,
  },
};

/** Buildings that count as "special" for cultural GPP generation. */
const CULTURAL_BUILDINGS = new Set([
  'market',
  'university',
  'temple',
  'library',
  'theater',
  'wonder',
]);

/** GPP thresholds at which a Great Person spawns. */
const GPP_THRESHOLDS = [100, 250, 500, 1000];

/** Which Great Person spawns for each category. */
const CATEGORY_GREAT_PERSON: Record<GPPCategory, string> = {
  military: 'greatGeneral',
  economic: 'greatEngineer',
  cultural: 'greatMerchant',
};

export interface GPPState {
  points: Record<GPPCategory, number>;
  /** How many Great People have been spawned per category (used to index thresholds). */
  spawnCount: Record<GPPCategory, number>;
}

/** Aura radius for the Great General (pixels). */
const GENERAL_AURA_RADIUS = 160;
/** Attack bonus multiplier from the Great General aura. */
const GENERAL_AURA_ATTACK_MULT = 0.15;

// ---------------------------------------------------------------------------
// VeterancySystem
// ---------------------------------------------------------------------------

export class VeterancySystem {
  /** Per-unit veterancy data. */
  private veterancy: Map<number, VeterancyRecord> = new Map();

  /** Per-player GPP state. */
  private gpp: Map<number, GPPState> = new Map();

  /** Track which entities are Great People. */
  private greatPeopleEntities: Set<number> = new Set();

  /** Accumulator for per-second GPP ticks (seconds since last tick). */
  private gppAccumulator = 0;

  /** Heal accumulator for idle-heal promotions (seconds). */
  private healAccumulator = 0;

  constructor(private world: GameWorld) {}

  // -----------------------------------------------------------------------
  // Veterancy – public API
  // -----------------------------------------------------------------------

  /**
   * Award XP to a unit. Automatically handles level-ups.
   * Call sites:
   *   - +5 per enemy killed
   *   - +2 per attack landed
   *   - +1 per building constructed (villagers)
   */
  addXP(entityId: number, amount: number): void {
    const entity = this.world.entities.get(entityId);
    if (!entity || entity.type !== 'unit') return;

    let record = this.veterancy.get(entityId);
    if (!record) {
      record = { xp: 0, level: 1, promotions: [], pendingPromotion: false };
      this.veterancy.set(entityId, record);
    }

    record.xp += amount;

    // Check for level-up(s)
    while (record.level < MAX_LEVEL) {
      const nextLevel = record.level + 1;
      const threshold = LEVEL_XP[nextLevel];
      if (threshold !== undefined && record.xp >= threshold) {
        record.level = nextLevel;
        record.pendingPromotion = true;
      } else {
        break;
      }
    }
  }

  getLevel(entityId: number): number {
    return this.veterancy.get(entityId)?.level ?? 1;
  }

  /** Returns true if the unit has levelled up but not yet chosen a promotion. */
  getPendingPromotion(entityId: number): boolean {
    return this.veterancy.get(entityId)?.pendingPromotion ?? false;
  }

  /** Apply a chosen promotion to the unit. */
  applyPromotion(entityId: number, promotion: Promotion): void {
    const record = this.veterancy.get(entityId);
    if (!record || !record.pendingPromotion) return;

    const entity = this.world.entities.get(entityId);
    if (!entity) return;

    // Ranged-only check for sharpshooter
    if (promotion === 'sharpshooter') {
      const config = UNITS[entity.key];
      if (!config || config.range <= 16) return; // melee range ~8-16 is not "ranged"
    }

    record.promotions.push(promotion);
    record.pendingPromotion = false;

    // Immediately apply permanent stat changes where applicable
    if (promotion === 'tough') {
      const bonus = Math.floor(entity.maxHp * 0.15);
      entity.maxHp += bonus;
      entity.hp += bonus; // also heal by the bonus amount
    }
  }

  /**
   * Get the total bonus from promotions for a given stat.
   * For additive stats (attack, armor) returns absolute bonus.
   * For multiplicative stats (hp, speed, range) returns the multiplier-style bonus
   * as a fraction (e.g. 0.15 for +15%).
   * For 'flanker' returns the damage multiplier bonus (0.25).
   */
  getStatBonus(entityId: number, stat: string): number {
    const record = this.veterancy.get(entityId);
    if (!record) return 0;

    let bonus = 0;
    for (const p of record.promotions) {
      switch (stat) {
        case 'attack':
          if (p === 'strong') bonus += 2;
          break;
        case 'armor':
          if (p === 'armored') bonus += 1;
          break;
        case 'speed':
          if (p === 'swift') bonus += 0.1;
          break;
        case 'range':
          if (p === 'sharpshooter') bonus += 0.15;
          break;
        case 'flanker':
          if (p === 'flanker') bonus += 0.25;
          break;
        case 'hp':
          if (p === 'tough') bonus += 0.15;
          break;
      }
    }
    return bonus;
  }

  /** Return the full veterancy record (or a default) – handy for UI. */
  getRecord(entityId: number): Readonly<VeterancyRecord> {
    return (
      this.veterancy.get(entityId) ?? {
        xp: 0,
        level: 1,
        promotions: [],
        pendingPromotion: false,
      }
    );
  }

  // -----------------------------------------------------------------------
  // Great People – public API
  // -----------------------------------------------------------------------

  /** Ensure GPP tracking is initialised for a player. */
  initPlayer(playerId: number): void {
    if (!this.gpp.has(playerId)) {
      this.gpp.set(playerId, {
        points: { military: 0, economic: 0, cultural: 0 },
        spawnCount: { military: 0, economic: 0, cultural: 0 },
      });
    }
  }

  getGPP(playerId: number): Readonly<GPPState> | undefined {
    return this.gpp.get(playerId);
  }

  isGreatPerson(entityId: number): boolean {
    return this.greatPeopleEntities.has(entityId);
  }

  /**
   * Sacrifice a Great General to create a Citadel building at its location.
   * Returns the new Citadel entity id, or null if invalid.
   */
  sacrificeGeneralForCitadel(generalEntityId: number): number | null {
    const entity = this.world.entities.get(generalEntityId);
    if (!entity || entity.key !== 'greatGeneral') return null;
    if (!this.greatPeopleEntities.has(generalEntityId)) return null;

    const { owner, x, y } = entity;

    // Remove the general
    entity.state = 'dead';
    entity.hp = 0;
    this.world.removeEntity(generalEntityId);
    this.greatPeopleEntities.delete(generalEntityId);
    this.veterancy.delete(generalEntityId);

    // Spawn a Citadel building
    const citadel = this.world.spawnEntity('building', 'citadel', owner, x, y, 300);
    citadel.buildProgress = 1; // instantly completed
    return citadel.id;
  }

  /**
   * Use a Great Engineer to instantly complete a building under construction.
   * Returns true on success.
   */
  engineerInstantBuild(engineerEntityId: number, buildingEntityId: number): boolean {
    const engineer = this.world.entities.get(engineerEntityId);
    if (!engineer || engineer.key !== 'greatEngineer') return false;
    if (!this.greatPeopleEntities.has(engineerEntityId)) return false;

    const building = this.world.entities.get(buildingEntityId);
    if (!building || building.type !== 'building') return false;
    if (building.buildProgress === undefined || building.buildProgress >= 1) return false;
    if (building.owner !== engineer.owner) return false;

    building.buildProgress = 1;
    building.state = 'idle';

    // Consume the engineer
    engineer.state = 'dead';
    engineer.hp = 0;
    this.world.removeEntity(engineerEntityId);
    this.greatPeopleEntities.delete(engineerEntityId);
    this.veterancy.delete(engineerEntityId);
    return true;
  }

  /**
   * Use a Great Merchant to perform a Trade Mission at a target entity
   * (enemy town center / building). Awards +500 gold.
   * Returns true on success.
   */
  merchantTradeMission(merchantEntityId: number, targetEntityId: number): boolean {
    const merchant = this.world.entities.get(merchantEntityId);
    if (!merchant || merchant.key !== 'greatMerchant') return false;
    if (!this.greatPeopleEntities.has(merchantEntityId)) return false;

    const target = this.world.entities.get(targetEntityId);
    if (!target || target.type !== 'building') return false;
    if (target.owner === merchant.owner || target.owner === -1) return false; // must be enemy

    const player = this.world.players.get(merchant.owner);
    if (!player) return false;

    player.resources.gold += 500;

    // Consume the merchant
    merchant.state = 'dead';
    merchant.hp = 0;
    this.world.removeEntity(merchantEntityId);
    this.greatPeopleEntities.delete(merchantEntityId);
    this.veterancy.delete(merchantEntityId);
    return true;
  }

  /**
   * Check whether a Great General's aura grants an attack bonus to a
   * particular friendly unit. Returns the bonus multiplier (e.g. 0.15).
   */
  getGeneralAuraBonus(entityId: number): number {
    const entity = this.world.entities.get(entityId);
    if (!entity || entity.type !== 'unit') return 0;

    for (const gpId of this.greatPeopleEntities) {
      const gp = this.world.entities.get(gpId);
      if (!gp || gp.key !== 'greatGeneral' || gp.owner !== entity.owner) continue;
      if (gp.state === 'dead') continue;

      const dx = gp.x - entity.x;
      const dy = gp.y - entity.y;
      if (dx * dx + dy * dy <= GENERAL_AURA_RADIUS * GENERAL_AURA_RADIUS) {
        return GENERAL_AURA_ATTACK_MULT;
      }
    }
    return 0;
  }

  // -----------------------------------------------------------------------
  // Per-frame update
  // -----------------------------------------------------------------------

  /**
   * Call once per game tick.
   * @param delta – time elapsed in **seconds**.
   */
  update(delta: number): void {
    // --- Idle heal for units with 'heal' promotion ---
    this.healAccumulator += delta;
    if (this.healAccumulator >= 1) {
      const ticks = Math.floor(this.healAccumulator);
      this.healAccumulator -= ticks;

      for (const [entityId, record] of this.veterancy) {
        if (!record.promotions.includes('heal')) continue;
        const entity = this.world.entities.get(entityId);
        if (!entity || entity.state !== 'idle' || entity.hp <= 0) continue;
        entity.hp = Math.min(entity.maxHp, entity.hp + ticks); // +1 HP per second
      }
    }

    // --- GPP passive generation ---
    this.gppAccumulator += delta;
    if (this.gppAccumulator >= 1) {
      const seconds = Math.floor(this.gppAccumulator);
      this.gppAccumulator -= seconds;

      for (const [playerId, state] of this.gpp) {
        // Count relevant entities for this player
        let militaryUnits = 0;
        let villagers = 0;
        let specialBuildings = 0;

        for (const e of this.world.entities.values()) {
          if (e.owner !== playerId || e.state === 'dead') continue;

          if (e.type === 'unit') {
            if (this.greatPeopleEntities.has(e.id)) continue; // great people don't count
            if (e.key === 'villager') {
              villagers++;
            } else {
              militaryUnits++;
            }
          } else if (e.type === 'building') {
            if (
              CULTURAL_BUILDINGS.has(e.key) &&
              (e.buildProgress === undefined || e.buildProgress >= 1)
            ) {
              specialBuildings++;
            }
          }
        }

        // military: +1/sec per 5 military units
        state.points.military += Math.floor(militaryUnits / 5) * seconds;
        // economic: +1/sec per 10 villagers
        state.points.economic += Math.floor(villagers / 10) * seconds;
        // cultural: +1/sec per 3 special buildings
        state.points.cultural += Math.floor(specialBuildings / 3) * seconds;

        // Check thresholds and spawn Great People
        for (const category of ['military', 'economic', 'cultural'] as GPPCategory[]) {
          this.checkAndSpawnGreatPerson(playerId, state, category);
        }
      }
    }

    // Clean up dead units from the veterancy map
    for (const entityId of this.veterancy.keys()) {
      const entity = this.world.entities.get(entityId);
      if (!entity || entity.state === 'dead') {
        this.veterancy.delete(entityId);
        this.greatPeopleEntities.delete(entityId);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Get the next GPP threshold for a category, extending the sequence
   * if a player has already surpassed all predefined thresholds.
   */
  private getThreshold(spawnIndex: number): number {
    if (spawnIndex < GPP_THRESHOLDS.length) {
      return GPP_THRESHOLDS[spawnIndex];
    }
    // Beyond defined thresholds: each subsequent one doubles the last.
    const last = GPP_THRESHOLDS[GPP_THRESHOLDS.length - 1];
    return last * Math.pow(2, spawnIndex - GPP_THRESHOLDS.length + 1);
  }

  private checkAndSpawnGreatPerson(
    playerId: number,
    state: GPPState,
    category: GPPCategory
  ): void {
    const threshold = this.getThreshold(state.spawnCount[category]);
    if (state.points[category] < threshold) return;

    // Find a spawn location near the player's town center (or first building)
    let spawnX = this.world.mapWidth / 2;
    let spawnY = this.world.mapHeight / 2;

    for (const e of this.world.entities.values()) {
      if (e.owner === playerId && e.type === 'building' && e.state !== 'dead') {
        spawnX = e.x + 40;
        spawnY = e.y + 40;
        if (e.key === 'townCenter') break; // prefer town center
      }
    }

    const gpKey = CATEGORY_GREAT_PERSON[category];
    const def = GREAT_PEOPLE[gpKey];

    const entity = this.world.spawnEntity('unit', gpKey, playerId, spawnX, spawnY, def.hp);
    this.greatPeopleEntities.add(entity.id);

    state.spawnCount[category]++;
  }
}
