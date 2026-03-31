import { GameWorld, EntityData } from './GameWorld';

// ── City-State interfaces ──────────────────────────────────────────

export type CityStateType = 'maritime' | 'militaristic' | 'mercantile' | 'cultural';

export type RelationTier = 'Hostile' | 'Neutral' | 'Friend' | 'Ally';

export interface CityStateData {
  id: string;
  name: string;
  type: CityStateType;
  x: number;
  y: number;
  influence: Map<number, number>; // playerId -> influence value
  entityId: number;
  alive: boolean;
}

// ── Relic interfaces ───────────────────────────────────────────────

export interface RelicEffect {
  type: string;
  stat?: string;
  value: number;
}

export interface Relic {
  id: string;
  name: string;
  description: string;
  effect: RelicEffect;
  x: number;
  y: number;
  pickedUpBy: number | null;   // player id carrying it
  garrisonedAt: number | null; // building entity id
}

// ── Constants ──────────────────────────────────────────────────────

const CITY_STATE_NAMES: string[] = [
  'Geneva', 'Brussels', 'Zanzibar', 'Kathmandu', 'Singapore', 'Kabul',
  'Samarkand', 'Lisbon', 'Venice', 'Hanoi', 'Bogota', 'Tyre',
];

const CITY_STATE_TYPES: CityStateType[] = [
  'maritime', 'militaristic', 'mercantile', 'cultural',
];

const INFLUENCE_MIN = -60;
const INFLUENCE_MAX = 250;
const INFLUENCE_DECAY_PER_SEC = 0.5;

const RELIC_PICKUP_RADIUS = 20;

const RELIC_DEFINITIONS: Omit<Relic, 'x' | 'y' | 'pickedUpBy' | 'garrisonedAt'>[] = [
  { id: 'relic_sword',    name: 'Sword of Ancients', description: 'Grants +3 attack to all units.',          effect: { type: 'unit_attack',   value: 3 } },
  { id: 'relic_oracle',   name: 'Oracle Bones',      description: 'Speeds up technology research by 30%.',   effect: { type: 'tech_speed',    value: 0.3 } },
  { id: 'relic_crown',    name: 'Crown of Kings',    description: 'Increases population cap by 5.',          effect: { type: 'pop_cap',       value: 5 } },
  { id: 'relic_codex',    name: 'Merchant Codex',    description: 'Grants +0.3 gold income per second.',     effect: { type: 'gold_income',   value: 0.3 } },
  { id: 'relic_shield',   name: 'Shield of Titans',  description: 'Grants +2 armor to all units.',           effect: { type: 'unit_armor',    value: 2 } },
  { id: 'relic_staff',    name: 'Staff of Magi',     description: 'Speeds up technology research by 30%.',   effect: { type: 'tech_speed',    value: 0.3 } },
  { id: 'relic_horn',     name: 'Horn of Plenty',    description: 'Grants +0.5 food income per second.',     effect: { type: 'food_income',   value: 0.5 } },
  { id: 'relic_drums',    name: 'War Drums',         description: 'Increases attack speed by 10%.',          effect: { type: 'attack_speed',  value: 0.1 } },
];

// ── System ─────────────────────────────────────────────────────────

export class CityStateSystem {
  private world: GameWorld;
  private cityStates: Map<string, CityStateData> = new Map();
  private relics: Map<string, Relic> = new Map();
  private nameIndex = 0;

  // Bonus accumulators that external systems can read
  /** Per-player militia timer flag (true = free militia timer active) */
  readonly militiaTimerActive: Map<number, boolean> = new Map();
  /** Per-player build speed multiplier (1.0 = normal, 1.05 = 5% faster, 1.10 = 10% faster) */
  readonly buildSpeedMultiplier: Map<number, number> = new Map();

  constructor(world: GameWorld) {
    this.world = world;
  }

  // ── City-State spawning ────────────────────────────────────────

  spawnCityStates(positions: { x: number; y: number }[]): void {
    for (const pos of positions) {
      const name = CITY_STATE_NAMES[this.nameIndex % CITY_STATE_NAMES.length];
      const type = CITY_STATE_TYPES[this.nameIndex % CITY_STATE_TYPES.length];
      const id = `cs_${this.nameIndex}`;

      const entity = this.world.spawnEntity('building', 'cityState', -1, pos.x, pos.y, 800);

      const cs: CityStateData = {
        id,
        name,
        type,
        x: pos.x,
        y: pos.y,
        influence: new Map(),
        entityId: entity.id,
        alive: true,
      };
      this.cityStates.set(id, cs);
      this.nameIndex++;
    }
  }

  // ── Influence helpers ──────────────────────────────────────────

  sendGift(csId: string, playerId: number, gold: number): void {
    const cs = this.cityStates.get(csId);
    if (!cs || !cs.alive || gold <= 0) return;

    const current = cs.influence.get(playerId) ?? 0;
    const next = Math.min(INFLUENCE_MAX, current + gold / 10);
    cs.influence.set(playerId, next);
  }

  getInfluence(csId: string, playerId: number): number {
    const cs = this.cityStates.get(csId);
    if (!cs) return 0;
    return cs.influence.get(playerId) ?? 0;
  }

  getRelationTier(csId: string, playerId: number): RelationTier {
    const inf = this.getInfluence(csId, playerId);
    if (inf < -30) return 'Hostile';
    if (inf < 30) return 'Neutral';

    // Ally check: must be >= 60 AND the highest influence holder above 60
    if (inf >= 60) {
      const cs = this.cityStates.get(csId)!;
      let isHighest = true;
      for (const [pid, val] of cs.influence) {
        if (pid !== playerId && val > inf) {
          isHighest = false;
          break;
        }
      }
      if (isHighest) return 'Ally';
    }

    return 'Friend';
  }

  getCityStates(): CityStateData[] {
    return [...this.cityStates.values()];
  }

  // ── Relic spawning ─────────────────────────────────────────────

  spawnRelics(positions: { x: number; y: number }[]): void {
    const count = Math.min(positions.length, RELIC_DEFINITIONS.length);
    for (let i = 0; i < count; i++) {
      const def = RELIC_DEFINITIONS[i];
      const relic: Relic = {
        ...def,
        x: positions[i].x,
        y: positions[i].y,
        pickedUpBy: null,
        garrisonedAt: null,
      };
      this.relics.set(relic.id, relic);
    }
  }

  checkPickup(entities: EntityData[]): void {
    for (const relic of this.relics.values()) {
      if (relic.pickedUpBy !== null) continue; // already held

      for (const ent of entities) {
        if (ent.type !== 'unit' || ent.owner < 0 || ent.state === 'dead') continue;

        const dx = ent.x - relic.x;
        const dy = ent.y - relic.y;
        if (dx * dx + dy * dy <= RELIC_PICKUP_RADIUS * RELIC_PICKUP_RADIUS) {
          relic.pickedUpBy = ent.owner;
          break;
        }
      }
    }
  }

  garrisonRelic(relicId: string, buildingEntityId: number): void {
    const relic = this.relics.get(relicId);
    if (!relic || relic.pickedUpBy === null) return;
    relic.garrisonedAt = buildingEntityId;
  }

  getPlayerRelics(playerId: number): Relic[] {
    return [...this.relics.values()].filter(
      (r) => r.pickedUpBy === playerId
    );
  }

  getRelicEffects(playerId: number): RelicEffect[] {
    return [...this.relics.values()]
      .filter((r) => r.pickedUpBy === playerId && r.garrisonedAt !== null)
      .map((r) => r.effect);
  }

  // ── Main update ────────────────────────────────────────────────

  update(delta: number): void {
    // Reset per-tick bonus accumulators
    for (const [pid] of this.world.players) {
      this.militiaTimerActive.set(pid, false);
      this.buildSpeedMultiplier.set(pid, 1.0);
    }

    // ── City-State logic ──
    for (const cs of this.cityStates.values()) {
      // Check alive status via entity
      const ent = this.world.entities.get(cs.entityId);
      if (!ent || ent.state === 'dead' || ent.hp <= 0) {
        cs.alive = false;
      }
      if (!cs.alive) continue;

      // Decay influence toward 0
      for (const [pid, inf] of cs.influence) {
        if (inf === 0) continue;
        const decay = INFLUENCE_DECAY_PER_SEC * delta;
        let next: number;
        if (inf > 0) {
          next = Math.max(0, inf - decay);
        } else {
          next = Math.min(0, inf + decay);
        }
        next = Math.max(INFLUENCE_MIN, Math.min(INFLUENCE_MAX, next));
        cs.influence.set(pid, next);
      }

      // Determine ally (highest influence above 60) and friends
      let allyId: number | null = null;
      let allyInf = 60; // threshold
      const friendIds: number[] = [];

      for (const [pid, inf] of cs.influence) {
        if (inf >= 60 && inf > allyInf) {
          // demote previous ally to friend
          if (allyId !== null) friendIds.push(allyId);
          allyId = pid;
          allyInf = inf;
        } else if (inf >= 60) {
          // tied or lower but still >= 60 → friend
          friendIds.push(pid);
        } else if (inf >= 30) {
          friendIds.push(pid);
        }
      }

      // Apply bonuses
      const applyBonus = (playerId: number, multiplier: number) => {
        const player = this.world.players.get(playerId);
        if (!player) return;

        switch (cs.type) {
          case 'maritime':
            player.resources.food += 0.2 * multiplier * delta;
            break;
          case 'militaristic':
            this.militiaTimerActive.set(playerId, true);
            break;
          case 'mercantile':
            player.resources.gold += 0.1 * multiplier * delta;
            break;
          case 'cultural': {
            const current = this.buildSpeedMultiplier.get(playerId) ?? 1.0;
            this.buildSpeedMultiplier.set(playerId, current + 0.05 * multiplier);
            break;
          }
        }
      };

      for (const pid of friendIds) {
        applyBonus(pid, 1);
      }
      if (allyId !== null) {
        applyBonus(allyId, 2);
      }
    }

    // ── Relic logic: check if garrisoned building (TC) died ──
    for (const relic of this.relics.values()) {
      if (relic.garrisonedAt === null) continue;

      const building = this.world.entities.get(relic.garrisonedAt);
      if (!building || building.state === 'dead' || building.hp <= 0) {
        // Drop relic back to map at building location
        if (building) {
          relic.x = building.x;
          relic.y = building.y;
        }
        relic.garrisonedAt = null;
        relic.pickedUpBy = null;
      }
    }

    // Check for new pickups each tick
    const allEntities = [...this.world.entities.values()];
    this.checkPickup(allEntities);
  }
}
