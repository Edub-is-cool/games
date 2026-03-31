import { GameWorld, Resources } from './GameWorld';
import { DiplomacySystem } from './DiplomacySystem';
import { DiplomaticStatus } from '../config/diplomacySettings';
import { CitySystem } from './CitySystem';
import { BuildingConfig } from '../config/buildings';
import { ALL_BUILDINGS } from '../config/ages';

// ---------------------------------------------------------------------------
// Wonder building config — added to ALL_BUILDINGS at import time
// ---------------------------------------------------------------------------

export const WONDER_BUILDING: BuildingConfig = {
  name: 'Wonder',
  hp: 2000,
  armor: 10,
  cost: { food: 1000, wood: 1000, gold: 1000, stone: 1000 },
  buildTime: 200,
  size: 4,
  produces: [],
  color: 0xffd700,
};

// Register the Wonder in the global building registry
ALL_BUILDINGS['wonder'] = WONDER_BUILDING;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VictoryType = 'domination' | 'wonder' | 'timed';
export type VictoryMode = 'domination' | 'wonder' | 'timed' | 'any';

export interface VictoryResult {
  playerId: number;
  type: VictoryType;
}

export interface TimedScoreEntry {
  playerId: number;
  score: number;
  breakdown: {
    units: number;
    buildings: number;
    resources: number;
    cityLevels: number;
    ages: number;
  };
}

interface WonderTracker {
  entityId: number;
  owner: number;
  elapsedSeconds: number;
}

/** Duration (in seconds) a wonder must survive to win. */
const WONDER_COUNTDOWN = 300;

/** Default timed-mode game length in seconds (30 minutes). */
const DEFAULT_TIME_LIMIT = 30 * 60;

// ---------------------------------------------------------------------------
// VictorySystem
// ---------------------------------------------------------------------------

export class VictorySystem {
  private winner: VictoryResult | null = null;
  private eliminatedPlayers: Set<number> = new Set();
  private checkTimer = 0;

  /** Wonder victory tracking. */
  private wonders: Map<number, WonderTracker> = new Map(); // entityId -> tracker

  /** Timed-mode state. */
  private elapsedTime = 0;
  private timeLimit: number;

  /** All enabled modes. */
  private modes: Set<VictoryMode>;

  constructor(
    private world: GameWorld,
    private diplomacy: DiplomacySystem,
    private citySystem: CitySystem | null = null,
    mode: VictoryMode | VictoryMode[] = 'any',
    timeLimitSeconds?: number
  ) {
    if (Array.isArray(mode)) {
      this.modes = new Set(mode);
    } else {
      this.modes = new Set([mode]);
    }
    this.timeLimit = timeLimitSeconds ?? DEFAULT_TIME_LIMIT;
  }

  // -----------------------------------------------------------------------
  // Update
  // -----------------------------------------------------------------------

  update(delta: number): void {
    const deltaSec = delta / 1000;

    // Track total elapsed time for timed mode
    this.elapsedTime += deltaSec;

    // Only run victory checks every 2 seconds for performance
    this.checkTimer += deltaSec;
    if (this.checkTimer < 2) {
      // Still need to tick wonder timers every frame for accuracy
      if (this.modeEnabled('wonder') || this.modeEnabled('any')) {
        this.tickWonders(deltaSec);
      }
      return;
    }
    this.checkTimer = 0;

    if (this.winner) return;

    this.updateEliminated();

    // Domination
    if (this.modeEnabled('domination') || this.modeEnabled('any')) {
      this.checkDomination();
    }

    // Wonder
    if (!this.winner && (this.modeEnabled('wonder') || this.modeEnabled('any'))) {
      this.syncWonders();
      this.checkWonderVictory();
    }

    // Timed
    if (!this.winner && this.modeEnabled('timed')) {
      this.checkTimed();
    }
  }

  // -----------------------------------------------------------------------
  // Wonder tracking
  // -----------------------------------------------------------------------

  private syncWonders(): void {
    // Add new wonders
    for (const entity of this.world.entities.values()) {
      if (
        entity.key === 'wonder' &&
        entity.type === 'building' &&
        entity.state !== 'dead' &&
        (entity.buildProgress === undefined || entity.buildProgress >= 1)
      ) {
        if (!this.wonders.has(entity.id)) {
          this.wonders.set(entity.id, {
            entityId: entity.id,
            owner: entity.owner,
            elapsedSeconds: 0,
          });
        }
      }
    }

    // Remove destroyed wonders
    for (const entityId of this.wonders.keys()) {
      const entity = this.world.entities.get(entityId);
      if (!entity || entity.state === 'dead') {
        this.wonders.delete(entityId);
      }
    }
  }

  private tickWonders(deltaSec: number): void {
    for (const tracker of this.wonders.values()) {
      const entity = this.world.entities.get(tracker.entityId);
      if (!entity || entity.state === 'dead') continue;
      tracker.elapsedSeconds += deltaSec;
    }
  }

  private checkWonderVictory(): void {
    for (const tracker of this.wonders.values()) {
      if (tracker.elapsedSeconds >= WONDER_COUNTDOWN) {
        this.winner = { playerId: tracker.owner, type: 'wonder' };
        return;
      }
    }
  }

  /** Returns remaining seconds for the oldest wonder of a given player, or null. */
  getWonderCountdown(playerId: number): number | null {
    let best: number | null = null;
    for (const tracker of this.wonders.values()) {
      if (tracker.owner !== playerId) continue;
      const remaining = Math.max(0, WONDER_COUNTDOWN - tracker.elapsedSeconds);
      if (best === null || remaining < best) {
        best = remaining;
      }
    }
    return best;
  }

  // -----------------------------------------------------------------------
  // Timed mode
  // -----------------------------------------------------------------------

  private checkTimed(): void {
    if (this.elapsedTime < this.timeLimit) return;

    const scores = this.calculateScores();
    if (scores.length === 0) return;

    scores.sort((a, b) => b.score - a.score);
    this.winner = { playerId: scores[0].playerId, type: 'timed' };
  }

  /** Public scoring method, useful for UI scoreboards. */
  calculateScores(): TimedScoreEntry[] {
    const entries: TimedScoreEntry[] = [];

    for (const [playerId, player] of this.world.players) {
      if (this.eliminatedPlayers.has(playerId)) continue;

      let unitCount = 0;
      let buildingCount = 0;

      for (const entity of this.world.entities.values()) {
        if (entity.owner !== playerId || entity.state === 'dead') continue;
        if (entity.type === 'unit') unitCount++;
        if (entity.type === 'building') buildingCount++;
      }

      const totalResources =
        player.resources.food +
        player.resources.wood +
        player.resources.gold +
        player.resources.stone;
      const resourcePoints = Math.floor(totalResources / 100);

      let cityLevelPoints = 0;
      if (this.citySystem) {
        for (const [entityId, cityData] of this.citySystem.getAllCities()) {
          const tc = this.world.entities.get(entityId);
          if (tc && tc.owner === playerId) {
            cityLevelPoints += cityData.level * 10;
          }
        }
      }

      const agePoints = player.age * 50;

      const score =
        unitCount * 1 +
        buildingCount * 3 +
        resourcePoints +
        cityLevelPoints +
        agePoints;

      entries.push({
        playerId,
        score,
        breakdown: {
          units: unitCount,
          buildings: buildingCount * 3,
          resources: resourcePoints,
          cityLevels: cityLevelPoints,
          ages: agePoints,
        },
      });
    }

    return entries;
  }

  // -----------------------------------------------------------------------
  // Domination / Diplomatic (original logic)
  // -----------------------------------------------------------------------

  private updateEliminated(): void {
    for (const [pid] of this.world.players) {
      const hasAnything = [...this.world.entities.values()].some(
        (e) => e.owner === pid && e.state !== 'dead'
      );
      if (!hasAnything) {
        this.eliminatedPlayers.add(pid);
      }
    }
  }

  private checkDomination(): void {
    const surviving = this.getSurvivingPlayers();
    if (surviving.length === 1) {
      this.winner = { playerId: surviving[0], type: 'domination' };
    }
  }

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  getSurvivingPlayers(): number[] {
    const alive: number[] = [];
    for (const [pid] of this.world.players) {
      if (!this.eliminatedPlayers.has(pid)) {
        alive.push(pid);
      }
    }
    return alive;
  }

  getEliminated(): Set<number> {
    return this.eliminatedPlayers;
  }

  getWinner(): VictoryResult | null {
    return this.winner;
  }

  isEliminated(playerId: number): boolean {
    return this.eliminatedPlayers.has(playerId);
  }

  getElapsedTime(): number {
    return this.elapsedTime;
  }

  getTimeLimit(): number {
    return this.timeLimit;
  }

  getRemainingTime(): number {
    return Math.max(0, this.timeLimit - this.elapsedTime);
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private modeEnabled(m: VictoryMode): boolean {
    return this.modes.has(m);
  }
}
