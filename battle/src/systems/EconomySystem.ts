import { GameWorld, EntityData } from './GameWorld';
import { UNITS } from '../config/units';
import { BUILDINGS } from '../config/buildings';
import { AGES, ALL_UNITS, ALL_BUILDINGS } from '../config/ages';
import { DEFENSES } from '../config/defenses';

const GATHER_RATE = 0.4; // resource per second
const CARRY_CAPACITY = 10;
const GATHER_RANGE = 24;
const DROP_OFF_RANGE = 48;

export class EconomySystem {
  constructor(private world: GameWorld) {}

  update(delta: number) {
    for (const entity of this.world.entities.values()) {
      if (entity.type !== 'unit' || entity.state === 'dead') continue;

      if (entity.state === 'gathering') {
        this.processGathering(entity, delta);
      } else if (entity.state === 'building') {
        this.processBuilding(entity, delta);
      }
    }

    // Process building train queues
    for (const entity of this.world.entities.values()) {
      if (entity.type !== 'building' || entity.state === 'dead') continue;
      if (entity.buildProgress !== undefined && entity.buildProgress < 1) continue;

      if (entity.trainQueue && entity.trainQueue.length > 0) {
        const order = entity.trainQueue[0];
        order.progress += delta / 1000;

        if (order.progress >= order.trainTime) {
          this.spawnTrainedUnit(entity, order.unitKey);
          entity.trainQueue.shift();
        }
      }
    }

    // Process age advancement
    for (const [, player] of this.world.players) {
      if (player.ageProgress >= 0 && player.age < AGES.length) {
        player.ageProgress += delta / 1000;
        const targetAge = AGES[player.age]; // next age (0-indexed = current age)
        if (player.ageProgress >= targetAge.advanceTime) {
          player.age++;
          player.ageProgress = -1;
        }
      }
    }

    // Villager auto-tasking: idle villagers near a drop-off auto-gather nearby resources
    for (const entity of this.world.entities.values()) {
      if (entity.type !== 'unit' || entity.key !== 'villager' || entity.state !== 'idle' || entity.owner < 0) continue;

      // If villager has a preferred gather type, find nearest of that type (any distance)
      // Otherwise fall back to nearest resource within 150px
      const preferredType = entity.gatherType;
      let nearestRes: EntityData | null = null;
      let nearestDist = preferredType ? Infinity : 150 * 150;
      for (const res of this.world.entities.values()) {
        if (res.type !== 'resource' || res.state === 'dead') continue;
        if (preferredType && res.key !== preferredType) continue;
        const dx = res.x - entity.x;
        const dy = res.y - entity.y;
        const dist = dx * dx + dy * dy;
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestRes = res;
        }
      }

      if (nearestRes) {
        entity.state = 'gathering';
        entity.target = nearestRes.id;
        entity.commandQueue = [{ type: 'gather', targetId: nearestRes.id }];
      }
    }
  }

  /**
   * Check if player has enough buildings from current age to advance.
   * Requires at least 2 buildings from the current age.
   */
  canAdvanceAge(playerId: number): boolean {
    const player = this.world.players.get(playerId);
    if (!player) return false;
    if (player.age >= AGES.length) return false;
    if (player.ageProgress >= 0) return false;

    // Count completed buildings from current age
    const currentAgeBuildings = Object.keys(AGES[player.age - 1].buildings);
    let count = 0;
    for (const entity of this.world.entities.values()) {
      if (entity.owner !== playerId || entity.type !== 'building' || entity.state === 'dead') continue;
      if ((entity.buildProgress ?? 1) < 1) continue;
      if (currentAgeBuildings.includes(entity.key)) count++;
    }

    return count >= 2;
  }

  private processGathering(entity: EntityData, delta: number) {
    if (entity.target === null) return;

    const target = this.world.entities.get(entity.target);

    // If resource is depleted, auto-find next of same type or go idle
    if (!target || target.state === 'dead') {
      if (entity.gatherType) {
        // Find nearest resource of the same type
        let nextRes: EntityData | null = null;
        let nextDist = Infinity;
        for (const res of this.world.entities.values()) {
          if (res.type !== 'resource' || res.state === 'dead' || res.key !== entity.gatherType) continue;
          const ddx = res.x - entity.x;
          const ddy = res.y - entity.y;
          const d = ddx * ddx + ddy * ddy;
          if (d < nextDist) { nextDist = d; nextRes = res; }
        }
        if (nextRes) {
          entity.target = nextRes.id;
          entity.commandQueue = [{ type: 'gather', targetId: nextRes.id }];
          return;
        }
      }
      entity.state = 'idle';
      entity.target = null;
      return;
    }

    const dx = target.x - entity.x;
    const dy = target.y - entity.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If carrying full load, return to nearest drop-off
    if ((entity.carryAmount ?? 0) >= CARRY_CAPACITY) {
      const dropOff = this.findNearestDropOff(entity);
      if (dropOff) {
        const ddx = dropOff.x - entity.x;
        const ddy = dropOff.y - entity.y;
        const ddist = Math.sqrt(ddx * ddx + ddy * ddy);

        if (ddist < DROP_OFF_RANGE) {
          // Drop off resources
          const player = this.world.players.get(entity.owner);
          if (player && entity.gatherType) {
            const resKey = entity.gatherType as keyof typeof player.resources;
            player.resources[resKey] += entity.carryAmount ?? 0;
          }
          entity.carryAmount = 0;
        } else {
          // Move to drop-off
          const config = ALL_UNITS[entity.key] ?? UNITS[entity.key];
          if (config) {
            const step = config.speed * (delta / 1000);
            const ratio = Math.min(step / ddist, 1);
            entity.x += ddx * ratio;
            entity.y += ddy * ratio;
          }
        }
      }
      return;
    }

    // Move toward resource
    if (dist > GATHER_RANGE) {
      const config = ALL_UNITS[entity.key] ?? UNITS[entity.key];
      if (config) {
        const step = config.speed * (delta / 1000);
        const ratio = Math.min(step / dist, 1);
        entity.x += dx * ratio;
        entity.y += dy * ratio;
      }
      return;
    }

    // Gather
    const amount = GATHER_RATE * (delta / 1000);
    entity.carryAmount = (entity.carryAmount ?? 0) + amount;
    entity.gatherType = target.key; // 'food', 'wood', 'gold', 'stone'

    // Deplete resource
    target.hp -= amount;
    if (target.hp <= 0) {
      target.state = 'dead';
    }
  }

  private processBuilding(entity: EntityData, delta: number) {
    if (entity.target === null) return;

    const target = this.world.entities.get(entity.target);
    if (!target || target.state === 'dead' || target.type !== 'building') {
      entity.state = 'idle';
      entity.target = null;
      entity.commandQueue.shift();
      return;
    }

    const dx = target.x - entity.x;
    const dy = target.y - entity.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Move to building site
    if (dist > 40) {
      const config = ALL_UNITS[entity.key] ?? UNITS[entity.key];
      if (config) {
        const step = config.speed * (delta / 1000);
        const ratio = Math.min(step / dist, 1);
        entity.x += dx * ratio;
        entity.y += dy * ratio;
      }
      return;
    }

    // Build — multiple villagers speed up construction with diminishing returns
    const buildingCfg = ALL_BUILDINGS[target.key] ?? BUILDINGS[target.key] ?? DEFENSES[target.key];
    if (!buildingCfg || buildingCfg.buildTime <= 0) return;

    // Count how many villagers are building this same target
    let builderCount = 0;
    for (const other of this.world.entities.values()) {
      if (other.type === 'unit' && other.state === 'building' && other.target === target.id) {
        builderCount++;
      }
    }

    // Each additional builder adds 60% of a full builder's rate (diminishing returns)
    // 1 builder = 1x, 2 = 1.6x, 3 = 2.0x, 4 = 2.3x, etc.
    const speedMult = builderCount > 0 ? (1 + (builderCount - 1) * 0.6) / builderCount : 1;
    const progress = (delta / 1000) / buildingCfg.buildTime * speedMult;
    target.buildProgress = Math.min(1, (target.buildProgress ?? 0) + progress);
    target.hp = Math.floor(target.maxHp * target.buildProgress);

    if (target.buildProgress >= 1) {
      target.hp = target.maxHp;
      entity.state = 'idle';
      entity.target = null;
      entity.commandQueue.shift();
    }
  }

  private findNearestDropOff(entity: EntityData): EntityData | null {
    let closest: EntityData | null = null;
    let closestDist = Infinity;

    for (const e of this.world.entities.values()) {
      if (e.owner !== entity.owner || e.type !== 'building') continue;
      if (e.key !== 'townCenter') continue;
      if (e.state === 'dead') continue;

      const dx = e.x - entity.x;
      const dy = e.y - entity.y;
      const dist = dx * dx + dy * dy;
      if (dist < closestDist) {
        closestDist = dist;
        closest = e;
      }
    }

    return closest;
  }

  startAgeAdvance(playerId: number): boolean {
    const player = this.world.players.get(playerId);
    if (!player) return false;
    if (player.age >= AGES.length) return false;
    if (player.ageProgress >= 0) return false; // already advancing
    if (!this.canAdvanceAge(playerId)) return false; // need 2 buildings from current age

    const nextAge = AGES[player.age];
    if (!this.canAfford(playerId, nextAge.cost)) return false;

    this.spend(playerId, nextAge.cost);
    player.ageProgress = 0;
    return true;
  }

  private spawnTrainedUnit(building: EntityData, unitKey: string) {
    const config = ALL_UNITS[unitKey] ?? UNITS[unitKey];
    if (!config) return;

    const player = this.world.players.get(building.owner);
    if (!player) return;

    this.world.recalcPopUsed(building.owner);
    this.world.recalcPopCap(building.owner);

    if (player.popUsed >= player.popCap) return;

    // Spawn near building
    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = 30;
    const unit = this.world.spawnEntity(
      'unit',
      unitKey,
      building.owner,
      building.x + offsetX,
      building.y + offsetY,
      config.hp
    );
    unit.carryAmount = 0;
  }

  canAfford(playerId: number, cost: { food: number; wood: number; gold: number; stone: number }): boolean {
    const player = this.world.players.get(playerId);
    if (!player) return false;
    return (
      player.resources.food >= cost.food &&
      player.resources.wood >= cost.wood &&
      player.resources.gold >= cost.gold &&
      player.resources.stone >= cost.stone
    );
  }

  spend(playerId: number, cost: { food: number; wood: number; gold: number; stone: number }) {
    const player = this.world.players.get(playerId);
    if (!player) return;
    player.resources.food -= cost.food;
    player.resources.wood -= cost.wood;
    player.resources.gold -= cost.gold;
    player.resources.stone -= cost.stone;
  }
}
