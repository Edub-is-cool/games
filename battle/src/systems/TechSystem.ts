import {
  Technology,
  TechEffect,
  TECHNOLOGIES,
  getAvailableTechs,
} from '../config/techTree';
import { GameWorld, Resources } from './GameWorld';

// ---------------------------------------------------------------------------
// Per-player research state
// ---------------------------------------------------------------------------

interface ResearchProgress {
  techId: string;
  elapsed: number; // seconds accumulated
  totalTime: number; // tech.researchTime (cached for convenience)
}

interface PlayerTechState {
  researched: Set<string>;
  current: ResearchProgress | null;
}

// ---------------------------------------------------------------------------
// Infantry / cavalry / ranged classification helpers
// ---------------------------------------------------------------------------

const INFANTRY_KEYS = new Set([
  'militia',
  'spearman',
  'swordsman',
  'musketeer',
  'rifleman',
]);

const CAVALRY_KEYS = new Set([
  'chariot',
  'knight',
  'lancer',
  'tank',
]);

const RANGED_KEYS = new Set([
  'archer',
  'musketeer',
  'rifleman',
  'catapult',
  'cannon',
  'artillery',
]);

function matchesUnitKey(
  effectUnitKey: string,
  actualUnitKey: string,
): boolean {
  if (effectUnitKey === actualUnitKey) return true;
  if (effectUnitKey === 'all_infantry') return INFANTRY_KEYS.has(actualUnitKey);
  if (effectUnitKey === 'all_cavalry') return CAVALRY_KEYS.has(actualUnitKey);
  if (effectUnitKey === 'all_ranged') return RANGED_KEYS.has(actualUnitKey);
  return false;
}

// ---------------------------------------------------------------------------
// TechSystem
// ---------------------------------------------------------------------------

export class TechSystem {
  private states: Map<number, PlayerTechState> = new Map();

  constructor(private world: GameWorld) {}

  // -- Lifecycle ------------------------------------------------------------

  /** Ensure a player entry exists. Called when a player joins. */
  initPlayer(playerId: number): void {
    if (!this.states.has(playerId)) {
      this.states.set(playerId, {
        researched: new Set(),
        current: null,
      });
    }
  }

  // -- Commands -------------------------------------------------------------

  /**
   * Attempt to start researching a technology for a player.
   *
   * Returns `true` if research was successfully started, `false` otherwise.
   * Fails when:
   *  - Player doesn't exist or tech id is unknown
   *  - Tech is already researched
   *  - Prerequisites unmet, age too low, or mutually exclusive tech researched
   *  - Player already has a research in progress
   *  - Insufficient resources
   */
  startResearch(playerId: number, techId: string): boolean {
    const state = this.states.get(playerId);
    if (!state) return false;

    const tech = TECHNOLOGIES[techId];
    if (!tech) return false;

    // Already researching something
    if (state.current !== null) return false;

    // Already researched
    if (state.researched.has(techId)) return false;

    const player = this.world.players.get(playerId);
    if (!player) return false;

    // Check availability (age, prerequisites, exclusivity)
    const available = getAvailableTechs(
      player.age,
      [...state.researched],
    );
    if (!available.find((t) => t.id === techId)) return false;

    // Check resources
    if (!this.canAfford(player.resources, tech.cost)) return false;

    // Deduct resources
    player.resources.food -= tech.cost.food;
    player.resources.wood -= tech.cost.wood;
    player.resources.gold -= tech.cost.gold;
    player.resources.stone -= tech.cost.stone;

    // Begin research
    state.current = {
      techId,
      elapsed: 0,
      totalTime: tech.researchTime,
    };

    return true;
  }

  // -- Tick -----------------------------------------------------------------

  /** Advance all in-progress research by `delta` seconds. */
  update(delta: number): void {
    for (const [playerId, state] of this.states) {
      if (!state.current) continue;

      state.current.elapsed += delta;

      if (state.current.elapsed >= state.current.totalTime) {
        // Research complete
        state.researched.add(state.current.techId);
        state.current = null;
      }
    }
  }

  // -- Queries --------------------------------------------------------------

  /** Get all active tech effects for a player. */
  getEffects(playerId: number): TechEffect[] {
    const state = this.states.get(playerId);
    if (!state) return [];

    const effects: TechEffect[] = [];
    for (const techId of state.researched) {
      const tech = TECHNOLOGIES[techId];
      if (tech) {
        effects.push(...tech.effects);
      }
    }
    return effects;
  }

  /**
   * Compute the total flat bonus for a specific unit and stat from all
   * researched technologies.
   *
   * Bonuses that are fractional (e.g. 0.1 for +10%) are returned as-is — the
   * caller decides whether to treat them as additive flat values or
   * multiplicative percentages based on context.
   */
  getStatBonus(playerId: number, unitKey: string, stat: string): number {
    const effects = this.getEffects(playerId);
    let total = 0;

    for (const effect of effects) {
      if (effect.type !== 'unit_stat') continue;
      if (effect.stat !== stat) continue;
      if (!matchesUnitKey(effect.unitKey, unitKey)) continue;
      total += effect.bonus;
    }

    return total;
  }

  /** Check whether a player has finished researching a given tech. */
  isResearched(playerId: number, techId: string): boolean {
    const state = this.states.get(playerId);
    return state ? state.researched.has(techId) : false;
  }

  /** Get current research progress for a player (or null if idle). */
  getResearchProgress(
    playerId: number,
  ): { techId: string; elapsed: number; totalTime: number } | null {
    const state = this.states.get(playerId);
    if (!state || !state.current) return null;
    return { ...state.current };
  }

  /** Get the set of all researched tech ids for a player. */
  getResearchedTechs(playerId: number): string[] {
    const state = this.states.get(playerId);
    return state ? [...state.researched] : [];
  }

  // -- Helpers --------------------------------------------------------------

  private canAfford(
    resources: Resources,
    cost: { food: number; wood: number; gold: number; stone: number },
  ): boolean {
    return (
      resources.food >= cost.food &&
      resources.wood >= cost.wood &&
      resources.gold >= cost.gold &&
      resources.stone >= cost.stone
    );
  }
}
