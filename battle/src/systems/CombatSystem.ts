import { GameWorld, EntityData } from './GameWorld';
import { UNITS } from '../config/units';
import { DiplomacySystem } from './DiplomacySystem';
import { DEFENSES } from '../config/defenses';
import { getBonusDamage, getArmorClass } from '../config/combatClasses';
import type { TerrainTile } from './MapGenerator';

const TILE_SIZE = 32;

export class CombatSystem {
  private attackCooldowns: Map<number, number> = new Map();
  diplomacy: DiplomacySystem | null = null;
  terrain: TerrainTile[][] | null = null; // set after map generation

  constructor(private world: GameWorld) {}

  /** Get elevation bonus multiplier: +25% if attacker is on higher ground, -25% if lower */
  private getElevationMult(attacker: EntityData, target: EntityData): number {
    if (!this.terrain) return 1;
    const aRow = Math.floor(attacker.y / TILE_SIZE);
    const aCol = Math.floor(attacker.x / TILE_SIZE);
    const tRow = Math.floor(target.y / TILE_SIZE);
    const tCol = Math.floor(target.x / TILE_SIZE);

    if (aRow < 0 || aRow >= this.terrain.length || aCol < 0 || aCol >= this.terrain[0].length) return 1;
    if (tRow < 0 || tRow >= this.terrain.length || tCol < 0 || tCol >= this.terrain[0].length) return 1;

    const aElev = this.terrain[aRow][aCol].elevation;
    const tElev = this.terrain[tRow][tCol].elevation;
    const diff = aElev - tElev;

    if (diff > 0.15) return 1.25;  // attacker on high ground
    if (diff < -0.15) return 0.75; // attacker on low ground
    return 1;
  }

  update(delta: number) {
    for (const entity of this.world.entities.values()) {
      if (entity.state !== 'attacking' || entity.type !== 'unit') continue;
      if (entity.target === null) continue;

      const target = this.world.entities.get(entity.target);
      if (!target || target.state === 'dead') {
        entity.state = 'idle';
        entity.target = null;
        entity.commandQueue.shift();
        continue;
      }

      // Diplomacy check: don't attack allies, auto-declare war on peaceful/neutral
      if (this.diplomacy && entity.owner >= 0 && target.owner >= 0 && entity.owner !== target.owner) {
        if (this.diplomacy.areAllied(entity.owner, target.owner)) {
          // Cancel attack on ally
          entity.state = 'idle';
          entity.target = null;
          entity.commandQueue.shift();
          continue;
        }
        if (!this.diplomacy.areAtWar(entity.owner, target.owner)) {
          // Auto-declare war when attacking a non-enemy
          this.diplomacy.declareWar(entity.owner, target.owner);
        }
      }

      const config = UNITS[entity.key];
      if (!config) continue;

      const dx = target.x - entity.x;
      const dy = target.y - entity.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Move toward target if out of range
      if (dist > config.range) {
        const step = config.speed * (delta / 1000);
        const ratio = Math.min(step / dist, 1);
        entity.x += dx * ratio;
        entity.y += dy * ratio;
        continue;
      }

      // Attack if cooldown ready
      const cooldown = this.attackCooldowns.get(entity.id) ?? 0;
      if (cooldown <= 0) {
        const targetArmorClass = getArmorClass(target.type, target.key);
        const bonus = getBonusDamage(entity.key, targetArmorClass, false);
        const elevMult = this.getElevationMult(entity, target);
        const damage = Math.floor((Math.max(1, config.attack - (target.type === 'building' ? 2 : 0)) + bonus) * elevMult);
        target.hp -= damage;

        if (target.hp <= 0) {
          target.hp = 0;
          target.state = 'dead';

          // Report kill to diplomacy
          if (this.diplomacy && entity.owner >= 0 && target.owner >= 0) {
            if (target.type === 'unit') {
              this.diplomacy.onUnitKilled(entity.owner, target.owner);
            } else if (target.type === 'building') {
              this.diplomacy.onBuildingDestroyed(entity.owner, target.owner);
            }
          }

          entity.state = 'idle';
          entity.target = null;
          entity.commandQueue.shift();
        }

        this.attackCooldowns.set(entity.id, config.attackSpeed);
      } else {
        this.attackCooldowns.set(entity.id, cooldown - delta / 1000);
      }
    }

    // Tower/defensive building auto-attack
    this.processTowerAttacks(delta);
  }

  private processTowerAttacks(delta: number) {
    for (const entity of this.world.entities.values()) {
      if (entity.type !== 'building' || entity.state === 'dead') continue;
      if (entity.buildProgress !== undefined && entity.buildProgress < 1) continue;

      const defense = DEFENSES[entity.key];
      if (!defense || defense.attackDamage <= 0 || defense.attackRange <= 0) continue;

      // Find nearest enemy in range
      let target: EntityData | null = null;
      let closestDist = defense.attackRange * defense.attackRange;

      for (const other of this.world.entities.values()) {
        if (other.owner === entity.owner || other.owner === -1 || other.state === 'dead') continue;
        if (other.type === 'resource') continue;

        // Diplomacy check
        if (this.diplomacy && !this.diplomacy.areAtWar(entity.owner, other.owner)) continue;

        const dx = other.x - entity.x;
        const dy = other.y - entity.y;
        const dist = dx * dx + dy * dy;
        if (dist < closestDist) {
          closestDist = dist;
          target = other;
        }
      }

      if (!target) continue;

      // Attack with cooldown
      const cooldown = this.attackCooldowns.get(entity.id) ?? 0;
      if (cooldown <= 0) {
        const targetArmorClass = getArmorClass(target.type, target.key);
        const towerBonus = getBonusDamage(entity.key, targetArmorClass, true);
        target.hp -= defense.attackDamage + towerBonus;

        if (target.hp <= 0) {
          target.hp = 0;
          target.state = 'dead';
          if (this.diplomacy && entity.owner >= 0 && target.owner >= 0) {
            if (target.type === 'unit') this.diplomacy.onUnitKilled(entity.owner, target.owner);
            else this.diplomacy.onBuildingDestroyed(entity.owner, target.owner);
          }
        }

        this.attackCooldowns.set(entity.id, defense.attackSpeed > 0 ? 1 / defense.attackSpeed : 2);
      } else {
        this.attackCooldowns.set(entity.id, cooldown - delta / 1000);
      }
    }
  }
}
