import { GameWorld } from './GameWorld';

export interface SpyMission {
  id: number;
  playerId: number;
  targetId: number;
  missionType: MissionType;
  cost: number;
  duration: number;
  elapsed: number;
  excessEP: number;
}

export type MissionType =
  | 'steal_tech'
  | 'sabotage'
  | 'scout_city'
  | 'poison_supply'
  | 'incite_revolt'
  | 'assassinate';

export interface MissionResult {
  missionId: number;
  missionType: MissionType;
  playerId: number;
  targetId: number;
  success: boolean;
  data?: {
    techName?: string;
    sabotage?: boolean;
    reveal?: boolean;
    foodLost?: number;
    revolt?: boolean;
    assassinate?: boolean;
  };
}

interface MissionDef {
  cost: number;
  duration: number;
}

const MISSION_DEFS: Record<MissionType, MissionDef> = {
  steal_tech: { cost: 100, duration: 30 },
  sabotage: { cost: 80, duration: 20 },
  scout_city: { cost: 30, duration: 10 },
  poison_supply: { cost: 60, duration: 15 },
  incite_revolt: { cost: 150, duration: 45 },
  assassinate: { cost: 120, duration: 30 },
};

const TECH_NAMES = [
  'Bronze Working', 'Iron Casting', 'Wheel', 'Writing', 'Mathematics',
  'Currency', 'Engineering', 'Gunpowder', 'Navigation', 'Astronomy',
  'Banking', 'Chemistry', 'Steel', 'Electricity', 'Combustion',
];

let nextMissionId = 1;

function deterministicHash(a: number, b: number, c: number): number {
  // Simple deterministic hash producing a value in [0, 1)
  let h = (a * 2654435761) ^ (b * 2246822519) ^ (c * 3266489917);
  h = ((h >>> 0) * 2246822519) >>> 0;
  h = ((h ^ (h >>> 13)) * 3266489917) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return (h >>> 0) / 0x100000000;
}

export class EspionageSystem {
  private world: GameWorld;

  // playerId -> targetId -> accumulated EP
  private ep: Map<number, Map<number, number>> = new Map();

  // playerId -> gold per second allocated to espionage
  private espionageBudgets: Map<number, number> = new Map();

  // playerId -> current espionage target
  private targets: Map<number, number> = new Map();

  // playerId -> gold per second allocated to defense
  private defenseBudgets: Map<number, number> = new Map();

  // playerId -> accumulated defensive EP
  private defensiveEP: Map<number, number> = new Map();

  // active missions
  private activeMissions: Map<number, SpyMission> = new Map();

  // completed mission results (cleared each update)
  public lastResults: MissionResult[] = [];

  constructor(world: GameWorld) {
    this.world = world;
  }

  setEspionageBudget(playerId: number, goldPerSecond: number): void {
    this.espionageBudgets.set(playerId, Math.max(0, goldPerSecond));
  }

  setTarget(playerId: number, targetId: number): void {
    this.targets.set(playerId, targetId);
  }

  setDefenseBudget(playerId: number, goldPerSecond: number): void {
    this.defenseBudgets.set(playerId, Math.max(0, goldPerSecond));
  }

  getEP(playerId: number, targetId: number): number {
    return this.ep.get(playerId)?.get(targetId) ?? 0;
  }

  getMissions(playerId: number): SpyMission[] {
    const result: SpyMission[] = [];
    for (const mission of this.activeMissions.values()) {
      if (mission.playerId === playerId) {
        result.push(mission);
      }
    }
    return result;
  }

  startMission(playerId: number, targetId: number, missionType: MissionType): SpyMission | null {
    const def = MISSION_DEFS[missionType];
    if (!def) return null;

    const currentEP = this.getEP(playerId, targetId);
    if (currentEP < def.cost) return null;

    const excessEP = currentEP - def.cost;

    // Deduct EP
    const playerMap = this.ep.get(playerId);
    if (playerMap) {
      playerMap.set(targetId, currentEP - def.cost);
    }

    const mission: SpyMission = {
      id: nextMissionId++,
      playerId,
      targetId,
      missionType,
      cost: def.cost,
      duration: def.duration,
      elapsed: 0,
      excessEP,
    };

    this.activeMissions.set(mission.id, mission);
    return mission;
  }

  update(delta: number): MissionResult[] {
    this.lastResults = [];

    // Accumulate EP against targets
    for (const [playerId, goldPerSec] of this.espionageBudgets) {
      if (goldPerSec <= 0) continue;
      const targetId = this.targets.get(playerId);
      if (targetId === undefined) continue;

      // Check player can afford
      const player = this.world.players.get(playerId);
      if (!player) continue;

      const goldCost = goldPerSec * delta;
      if (player.resources.gold < goldCost) continue;

      player.resources.gold -= goldCost;

      if (!this.ep.has(playerId)) {
        this.ep.set(playerId, new Map());
      }
      const playerMap = this.ep.get(playerId)!;
      const current = playerMap.get(targetId) ?? 0;
      playerMap.set(targetId, current + goldPerSec * delta);
    }

    // Accumulate defensive EP
    for (const [playerId, goldPerSec] of this.defenseBudgets) {
      if (goldPerSec <= 0) continue;

      const player = this.world.players.get(playerId);
      if (!player) continue;

      const goldCost = goldPerSec * delta;
      if (player.resources.gold < goldCost) continue;

      player.resources.gold -= goldCost;

      const current = this.defensiveEP.get(playerId) ?? 0;
      this.defensiveEP.set(playerId, current + goldPerSec * delta);
    }

    // Process active missions
    const completed: number[] = [];
    for (const [missionId, mission] of this.activeMissions) {
      mission.elapsed += delta;
      if (mission.elapsed >= mission.duration) {
        completed.push(missionId);
      }
    }

    // Resolve completed missions
    for (const missionId of completed) {
      const mission = this.activeMissions.get(missionId)!;
      this.activeMissions.delete(missionId);

      const result = this.resolveMission(mission);
      this.lastResults.push(result);
    }

    return this.lastResults;
  }

  private resolveMission(mission: SpyMission): MissionResult {
    // Success rate: 50% + excessEP%, capped at 95%
    let successRate = 50 + mission.excessEP;

    // Defensive EP reduces success: 1% per 10 defensive EP
    const defEP = this.defensiveEP.get(mission.targetId) ?? 0;
    const defenseReduction = Math.floor(defEP / 10);
    successRate -= defenseReduction;

    successRate = Math.min(95, Math.max(0, successRate));

    // Deterministic hash for success check
    const roll = deterministicHash(mission.id, mission.playerId, mission.targetId) * 100;
    const success = roll < successRate;

    const result: MissionResult = {
      missionId: mission.id,
      missionType: mission.missionType,
      playerId: mission.playerId,
      targetId: mission.targetId,
      success,
    };

    if (success) {
      result.data = this.applyMissionSuccess(mission);
    }

    return result;
  }

  private applyMissionSuccess(mission: SpyMission): MissionResult['data'] {
    switch (mission.missionType) {
      case 'steal_tech': {
        const idx = deterministicHash(mission.id, mission.playerId, 7777) * TECH_NAMES.length;
        return { techName: TECH_NAMES[Math.floor(idx)] };
      }
      case 'sabotage':
        return { sabotage: true };
      case 'scout_city':
        return { reveal: true };
      case 'poison_supply': {
        const target = this.world.players.get(mission.targetId);
        if (target) {
          const lost = Math.min(target.resources.food, 100);
          target.resources.food -= lost;
          return { foodLost: lost };
        }
        return { foodLost: 0 };
      }
      case 'incite_revolt':
        return { revolt: true };
      case 'assassinate':
        return { assassinate: true };
    }
  }
}
