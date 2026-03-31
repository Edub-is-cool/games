import Phaser from 'phaser';
import { GameWorld, EntityData } from './GameWorld';
import { DiplomacySystem } from './DiplomacySystem';
import { TILE_SIZE } from './TerrainRenderer';

/** Visibility state per tile per player */
const enum TileVis {
  Unexplored = 0,
  Explored = 1,
  Visible = 2,
}

/** Sight ranges in tiles for specific entity keys */
const SIGHT_RANGES: Record<string, number> = {
  // Buildings with extended vision
  outpost: 10,
  watchtower: 10,
  // Default overrides can be added here
};

const DEFAULT_UNIT_SIGHT = 6;
const DEFAULT_BUILDING_SIGHT = 3;

function getSightRange(entity: EntityData): number {
  if (SIGHT_RANGES[entity.key] !== undefined) {
    return SIGHT_RANGES[entity.key];
  }
  return entity.type === 'building' ? DEFAULT_BUILDING_SIGHT : DEFAULT_UNIT_SIGHT;
}

/** Precomputed circle offsets for each sight radius */
const circleOffsetsCache = new Map<number, { dx: number; dy: number }[]>();

function getCircleOffsets(radius: number): { dx: number; dy: number }[] {
  let offsets = circleOffsetsCache.get(radius);
  if (offsets) return offsets;
  offsets = [];
  const r2 = radius * radius;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= r2) {
        offsets.push({ dx, dy });
      }
    }
  }
  circleOffsetsCache.set(radius, offsets);
  return offsets;
}

interface ExplorationReward {
  type: string;
  value: number;
}

export class FogOfWar {
  /** Grid dimensions in tiles */
  readonly gridW: number;
  readonly gridH: number;

  private world: GameWorld;
  private diplomacy: DiplomacySystem;

  /**
   * Per-player visibility grids.
   * Each is a Uint8Array of gridW * gridH where values are TileVis.
   * We keep two arrays per player:
   *   - `explored`: permanent (0 = unexplored, 1 = explored)
   *   - `visible`: recalculated each frame (0 = not visible, 1 = visible)
   */
  private explored: Map<number, Uint8Array> = new Map();
  private visible: Map<number, Uint8Array> = new Map();

  /** Track previous tile positions of entities to only update deltas */
  private prevEntityTiles: Map<number, { tx: number; ty: number }> = new Map();

  /** Tiles that have already been checked for exploration rewards */
  private rewardChecked: Set<number> = new Set();

  /** Cached rewards generated at tile indices */
  private rewardCache: Map<number, ExplorationReward[]> = new Map();

  /** RNG seed for deterministic reward generation */
  private rng: () => number;

  constructor(
    mapWidth: number,
    mapHeight: number,
    world: GameWorld,
    diplomacy: DiplomacySystem,
  ) {
    this.gridW = Math.ceil(mapWidth / TILE_SIZE);
    this.gridH = Math.ceil(mapHeight / TILE_SIZE);
    this.world = world;
    this.diplomacy = diplomacy;

    // Simple seeded PRNG (mulberry32)
    let seed = 12345;
    this.rng = () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // Initialize grids for existing players
    for (const playerId of world.players.keys()) {
      this.ensurePlayer(playerId);
    }
  }

  private ensurePlayer(playerId: number): void {
    if (!this.explored.has(playerId)) {
      this.explored.set(playerId, new Uint8Array(this.gridW * this.gridH));
      this.visible.set(playerId, new Uint8Array(this.gridW * this.gridH));
    }
  }

  private tileIndex(tx: number, ty: number): number {
    return ty * this.gridW + tx;
  }

  private worldToTile(wx: number, wy: number): { tx: number; ty: number } {
    return {
      tx: Math.floor(wx / TILE_SIZE),
      ty: Math.floor(wy / TILE_SIZE),
    };
  }

  /**
   * Reveal tiles in a circle around (centerTx, centerTy) for the given player.
   * Marks tiles as visible and explored.
   */
  private revealCircle(
    visGrid: Uint8Array,
    expGrid: Uint8Array,
    centerTx: number,
    centerTy: number,
    radius: number,
  ): void {
    const offsets = getCircleOffsets(radius);
    const gw = this.gridW;
    const gh = this.gridH;
    for (let i = 0, len = offsets.length; i < len; i++) {
      const tx = centerTx + offsets[i].dx;
      const ty = centerTy + offsets[i].dy;
      if (tx >= 0 && tx < gw && ty >= 0 && ty < gh) {
        const idx = ty * gw + tx;
        visGrid[idx] = 1;
        expGrid[idx] = 1;
      }
    }
  }

  /**
   * Recalculate visibility for all players. Call once per frame.
   * Performance: only iterates entities (not all tiles).
   * Clears visible grids, then stamps circles around each entity.
   */
  update(): void {
    // Ensure any new players have grids
    for (const playerId of this.world.players.keys()) {
      this.ensurePlayer(playerId);
    }

    // Clear all visible grids
    for (const vis of this.visible.values()) {
      vis.fill(0);
    }

    // Build a map of player -> list of ally player ids (including self)
    const allyMap = new Map<number, number[]>();
    const playerIds = [...this.world.players.keys()];
    for (const pid of playerIds) {
      const allies = [pid];
      for (const other of playerIds) {
        if (other !== pid && this.diplomacy.areAllied(pid, other)) {
          allies.push(other);
        }
      }
      allyMap.set(pid, allies);
    }

    // For each entity, stamp its sight circle on its owner's (and allies') visible grid
    for (const entity of this.world.entities.values()) {
      if (entity.owner < 0) continue; // neutral/resource
      if (entity.state === 'dead') continue;

      const { tx, ty } = this.worldToTile(entity.x, entity.y);
      const sightRange = getSightRange(entity);

      // Get all players who should see this entity's vision
      const allies = allyMap.get(entity.owner);
      if (!allies) continue;

      for (const pid of allies) {
        const visGrid = this.visible.get(pid)!;
        const expGrid = this.explored.get(pid)!;
        this.revealCircle(visGrid, expGrid, tx, ty, sightRange);
      }
    }
  }

  /** Check if a world-space position is currently visible to a player */
  isVisible(playerId: number, x: number, y: number): boolean {
    const vis = this.visible.get(playerId);
    if (!vis) return false;
    const { tx, ty } = this.worldToTile(x, y);
    if (tx < 0 || tx >= this.gridW || ty < 0 || ty >= this.gridH) return false;
    return vis[this.tileIndex(tx, ty)] === 1;
  }

  /** Check if a world-space position has been previously explored by a player */
  isExplored(playerId: number, x: number, y: number): boolean {
    const exp = this.explored.get(playerId);
    if (!exp) return false;
    const { tx, ty } = this.worldToTile(x, y);
    if (tx < 0 || tx >= this.gridW || ty < 0 || ty >= this.gridH) return false;
    return exp[this.tileIndex(tx, ty)] === 1;
  }

  /**
   * Get exploration rewards when a tile is first explored.
   * Returns an array of rewards (may be empty for "nothing found").
   * Each tile is only checked once; subsequent calls return [].
   */
  getExplorationRewards(x: number, y: number): ExplorationReward[] {
    const { tx, ty } = this.worldToTile(x, y);
    if (tx < 0 || tx >= this.gridW || ty < 0 || ty >= this.gridH) return [];

    const idx = this.tileIndex(tx, ty);
    if (this.rewardChecked.has(idx)) {
      return [];
    }
    this.rewardChecked.add(idx);

    const roll = this.rng();

    // ~5% chance gold cache, ~5% supply drop, ~2% ancient ruin, ~88% nothing
    if (roll < 0.05) {
      const rewards = [{ type: 'gold', value: 50 }];
      this.rewardCache.set(idx, rewards);
      return rewards;
    } else if (roll < 0.10) {
      // Supply drop: food and wood
      const rewards = [
        { type: 'food', value: 30 },
        { type: 'wood', value: 30 },
      ];
      this.rewardCache.set(idx, rewards);
      return rewards;
    } else if (roll < 0.12) {
      const rewards = [{ type: 'freeUnit', value: 1 }];
      this.rewardCache.set(idx, rewards);
      return rewards;
    }

    return [];
  }

  /**
   * Get the resolved visibility state for a tile for a given player.
   * Useful for the renderer.
   */
  getTileState(playerId: number, tx: number, ty: number): TileVis {
    if (tx < 0 || tx >= this.gridW || ty < 0 || ty >= this.gridH) {
      return TileVis.Unexplored;
    }
    const idx = this.tileIndex(tx, ty);
    const vis = this.visible.get(playerId);
    const exp = this.explored.get(playerId);
    if (vis && vis[idx] === 1) return TileVis.Visible;
    if (exp && exp[idx] === 1) return TileVis.Explored;
    return TileVis.Unexplored;
  }
}

/**
 * Renders the fog of war overlay using a Phaser Graphics object.
 * Only draws tiles within the camera viewport for performance.
 */
export class FogRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private fog: FogOfWar;
  private playerId: number;

  constructor(scene: Phaser.Scene, fog: FogOfWar, playerId: number) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(1000); // draw above everything
    this.fog = fog;
    this.playerId = playerId;
  }

  /** Call each frame after fog.update(). Only draws visible viewport tiles. */
  render(camera: Phaser.Cameras.Scene2D.Camera): void {
    const g = this.graphics;
    g.clear();

    const fog = this.fog;
    const pid = this.playerId;

    // Determine visible tile range from camera
    const startTx = Math.max(0, Math.floor(camera.worldView.x / TILE_SIZE) - 1);
    const startTy = Math.max(0, Math.floor(camera.worldView.y / TILE_SIZE) - 1);
    const endTx = Math.min(
      fog.gridW - 1,
      Math.ceil((camera.worldView.x + camera.worldView.width) / TILE_SIZE) + 1,
    );
    const endTy = Math.min(
      fog.gridH - 1,
      Math.ceil((camera.worldView.y + camera.worldView.height) / TILE_SIZE) + 1,
    );

    // Batch draw: group consecutive tiles of same type per row for fewer draw calls
    for (let ty = startTy; ty <= endTy; ty++) {
      let runStart = -1;
      let runAlpha = -1;
      const py = ty * TILE_SIZE;

      for (let tx = startTx; tx <= endTx + 1; tx++) {
        let alpha = -1;
        if (tx <= endTx) {
          const state = fog.getTileState(pid, tx, ty);
          if (state === 0 /* Unexplored */) {
            alpha = 1.0;
          } else if (state === 1 /* Explored */) {
            alpha = 0.5;
          }
          // Visible (state 2) => alpha stays -1, no overlay
        }

        if (alpha !== runAlpha) {
          // Flush previous run
          if (runAlpha > 0 && runStart >= 0) {
            g.fillStyle(0x000000, runAlpha);
            g.fillRect(
              runStart * TILE_SIZE,
              py,
              (tx - runStart) * TILE_SIZE,
              TILE_SIZE,
            );
          }
          runStart = tx;
          runAlpha = alpha;
        }
      }
    }
  }

  setPlayerId(playerId: number): void {
    this.playerId = playerId;
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
