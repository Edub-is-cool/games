import { GameWorld, EntityData } from './GameWorld';
import { UNITS } from '../config/units';
import { ALL_UNITS } from '../config/ages';
import { getBonusDamage, getArmorClass } from '../config/combatClasses';

interface PingEntry {
  playerId: number;
  x: number;
  y: number;
  type: 'attack' | 'defend' | 'help' | 'danger';
  timestamp: number;
}

interface PatrolData {
  a: { x: number; y: number };
  b: { x: number; y: number };
  goingToB: boolean;
}

const PING_LIFETIME = 5000; // 5 seconds in ms

export class QoLSystem {
  private world: GameWorld;

  // Rally Points
  private rallyPoints: Map<number, { x: number; y: number }> = new Map();

  // Villager Build Queue
  private buildQueues: Map<number, string[]> = new Map();

  // Unit Stances
  private stances: Map<number, string> = new Map();

  // Patrol
  private patrols: Map<number, PatrolData> = new Map();

  // Auto-Scout
  private autoScoutSet: Set<number> = new Set();

  // Ping System
  private pings: PingEntry[] = [];

  constructor(world: GameWorld) {
    this.world = world;
  }

  // ---------------------------------------------------------------------------
  // 1. Idle Unit Finder
  // ---------------------------------------------------------------------------

  getNextIdleUnit(playerId: number, lastId?: number): EntityData | null {
    const idle = this.getIdleEntities(playerId, false);
    if (idle.length === 0) return null;
    return this.cycleAfter(idle, lastId);
  }

  getNextIdleVillager(playerId: number, lastId?: number): EntityData | null {
    const idle = this.getIdleEntities(playerId, true);
    if (idle.length === 0) return null;
    return this.cycleAfter(idle, lastId);
  }

  private getIdleEntities(playerId: number, villagersOnly: boolean): EntityData[] {
    const results: EntityData[] = [];
    for (const e of this.world.entities.values()) {
      if (e.owner !== playerId || e.type !== 'unit' || e.state !== 'idle') continue;
      if (e.hp <= 0) continue;
      if (villagersOnly) {
        if (e.key === 'villager') results.push(e);
      } else {
        if (e.key !== 'villager') results.push(e);
      }
    }
    results.sort((a, b) => a.id - b.id);
    return results;
  }

  private cycleAfter(sorted: EntityData[], lastId?: number): EntityData {
    if (lastId === undefined) return sorted[0];
    const idx = sorted.findIndex((e) => e.id > lastId);
    return idx >= 0 ? sorted[idx] : sorted[0];
  }

  // ---------------------------------------------------------------------------
  // 2. Rally Points
  // ---------------------------------------------------------------------------

  setRallyPoint(buildingId: number, x: number, y: number): void {
    this.rallyPoints.set(buildingId, { x, y });
  }

  getRallyPoint(buildingId: number): { x: number; y: number } | null {
    return this.rallyPoints.get(buildingId) ?? null;
  }

  clearRallyPoint(buildingId: number): void {
    this.rallyPoints.delete(buildingId);
  }

  // ---------------------------------------------------------------------------
  // 3. Villager Build Queue
  // ---------------------------------------------------------------------------

  queueBuilds(villagerId: number, keys: string[]): void {
    const existing = this.buildQueues.get(villagerId);
    if (existing) {
      existing.push(...keys);
    } else {
      this.buildQueues.set(villagerId, [...keys]);
    }
  }

  getBuildQueue(villagerId: number): string[] {
    return this.buildQueues.get(villagerId) ?? [];
  }

  shiftBuildQueue(villagerId: number): string | undefined {
    const queue = this.buildQueues.get(villagerId);
    if (!queue || queue.length === 0) return undefined;
    const next = queue.shift();
    if (queue.length === 0) this.buildQueues.delete(villagerId);
    return next;
  }

  // ---------------------------------------------------------------------------
  // 4. Unit Stances
  // ---------------------------------------------------------------------------

  setStance(entityId: number, stance: 'aggressive' | 'defensive' | 'stand_ground'): void {
    this.stances.set(entityId, stance);
  }

  getStance(entityId: number): string {
    return this.stances.get(entityId) ?? 'aggressive';
  }

  // ---------------------------------------------------------------------------
  // 5. Patrol
  // ---------------------------------------------------------------------------

  setPatrol(entityId: number, a: { x: number; y: number }, b: { x: number; y: number }): void {
    this.patrols.set(entityId, { a, b, goingToB: true });
  }

  getPatrol(entityId: number): PatrolData | null {
    return this.patrols.get(entityId) ?? null;
  }

  clearPatrol(entityId: number): void {
    this.patrols.delete(entityId);
  }

  // ---------------------------------------------------------------------------
  // 6. Auto-Scout
  // ---------------------------------------------------------------------------

  enableAutoScout(entityId: number): void {
    this.autoScoutSet.add(entityId);
  }

  disableAutoScout(entityId: number): void {
    this.autoScoutSet.delete(entityId);
  }

  isAutoScouting(entityId: number): boolean {
    return this.autoScoutSet.has(entityId);
  }

  // ---------------------------------------------------------------------------
  // 7. Select All Same Type
  // ---------------------------------------------------------------------------

  selectAllOfType(playerId: number, unitKey: string): number[] {
    const ids: number[] = [];
    for (const e of this.world.entities.values()) {
      if (e.owner === playerId && e.type === 'unit' && e.key === unitKey && e.state !== 'dead' && e.hp > 0) {
        ids.push(e.id);
      }
    }
    return ids;
  }

  // ---------------------------------------------------------------------------
  // 8. Damage Preview
  // ---------------------------------------------------------------------------

  getDamagePreview(
    attackerKey: string,
    targetKey: string,
    targetType: string,
  ): { damage: number; hitsToKill: number; targetHp: number } {
    const attackerConfig = ALL_UNITS[attackerKey] ?? UNITS[attackerKey];
    const targetConfig = ALL_UNITS[targetKey] ?? UNITS[targetKey];

    const baseAttack = attackerConfig?.attack ?? 0;
    const targetArmor = targetConfig?.armor ?? 0;
    const targetHp = targetConfig?.hp ?? 1;

    const armorClass = getArmorClass(targetType, targetKey);
    const bonus = getBonusDamage(attackerKey, armorClass);

    const damage = Math.max(1, baseAttack + bonus - targetArmor);
    const hitsToKill = Math.ceil(targetHp / damage);

    return { damage, hitsToKill, targetHp };
  }

  // ---------------------------------------------------------------------------
  // 9. Ping System
  // ---------------------------------------------------------------------------

  addPing(playerId: number, x: number, y: number, type: 'attack' | 'defend' | 'help' | 'danger'): void {
    this.pings.push({
      playerId,
      x,
      y,
      type,
      timestamp: Date.now(),
    });
  }

  getActivePings(): PingEntry[] {
    return this.pings;
  }

  // ---------------------------------------------------------------------------
  // 10. Production Overview
  // ---------------------------------------------------------------------------

  getProductionOverview(
    playerId: number,
  ): Array<{
    entityId: number;
    key: string;
    x: number;
    y: number;
    trainQueue: EntityData['trainQueue'];
    buildProgress: number | undefined;
  }> {
    const results: Array<{
      entityId: number;
      key: string;
      x: number;
      y: number;
      trainQueue: EntityData['trainQueue'];
      buildProgress: number | undefined;
    }> = [];

    for (const e of this.world.entities.values()) {
      if (e.owner !== playerId || e.type !== 'building' || e.state === 'dead') continue;
      results.push({
        entityId: e.id,
        key: e.key,
        x: e.x,
        y: e.y,
        trainQueue: e.trainQueue,
        buildProgress: e.buildProgress,
      });
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  update(_delta: number): void {
    // Remove expired pings
    const now = Date.now();
    this.pings = this.pings.filter((p) => now - p.timestamp < PING_LIFETIME);
  }
}
