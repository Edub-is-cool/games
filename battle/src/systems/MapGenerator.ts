// ---------------------------------------------------------------------------
// MapGenerator.ts – Procedural map generator for a Phaser 3 RTS
// ---------------------------------------------------------------------------

export type TerrainType = 'grass' | 'forest' | 'hill' | 'water' | 'desert' | 'sand';

export interface TerrainTile {
  type: TerrainType;
  elevation: number; // 0-1 normalised height
  moisture: number;  // 0-1 normalised moisture
}

export interface MapData {
  spawnPositions: { x: number; y: number }[];
  resources: { type: string; x: number; y: number }[];
  terrain: TerrainTile[][];
  decorations: { type: string; x: number; y: number }[];
}

// ---------------------------------------------------------------------------
// Seeded PRNG  (xorshift128+)
// ---------------------------------------------------------------------------
class SeededRNG {
  private s0: number;
  private s1: number;

  constructor(seed: number) {
    // Initialise two state words from the seed via simple mixing
    seed = seed | 0 || 1;
    this.s0 = (seed * 2654435761) >>> 0;
    this.s1 = (seed * 1597334677) >>> 0;
    if (this.s0 === 0) this.s0 = 1;
    if (this.s1 === 0) this.s1 = 1;
    // Warm up
    for (let i = 0; i < 20; i++) this.next();
  }

  /** Returns a float in [0, 1). */
  next(): number {
    let s1 = this.s0;
    const s0 = this.s1;
    this.s0 = s0;
    s1 ^= s1 << 23;
    s1 ^= s1 >>> 17;
    s1 ^= s0;
    s1 ^= s0 >>> 26;
    this.s1 = s1;
    return ((this.s0 + this.s1) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Float in [min, max). */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}

// ---------------------------------------------------------------------------
// Simple 2-D value noise (no external deps)
// ---------------------------------------------------------------------------
class ValueNoise {
  private perm: number[];
  private values: number[];

  constructor(rng: SeededRNG) {
    const size = 256;
    this.values = [];
    this.perm = [];
    for (let i = 0; i < size; i++) {
      this.values.push(rng.next());
      this.perm.push(i);
    }
    // Fisher-Yates shuffle
    for (let i = size - 1; i > 0; i--) {
      const j = rng.nextInt(0, i);
      [this.perm[i], this.perm[j]] = [this.perm[j], this.perm[i]];
    }
  }

  private hash(ix: number, iy: number): number {
    const n = this.perm.length;
    return this.values[this.perm[(this.perm[ix & (n - 1)] + iy) & (n - 1)]];
  }

  /** Smooth-interpolated noise at arbitrary (x, y). Returns [0, 1]. */
  sample(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    // Hermite smoothing
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    const v00 = this.hash(ix, iy);
    const v10 = this.hash(ix + 1, iy);
    const v01 = this.hash(ix, iy + 1);
    const v11 = this.hash(ix + 1, iy + 1);

    const top = v00 + sx * (v10 - v00);
    const bot = v01 + sx * (v11 - v01);
    return top + sy * (bot - top);
  }

  /** Fractal Brownian Motion – multi-octave noise. */
  fbm(x: number, y: number, octaves: number, lacunarity = 2.0, gain = 0.5): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxAmp = 0;
    for (let i = 0; i < octaves; i++) {
      value += this.sample(x * frequency, y * frequency) * amplitude;
      maxAmp += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return value / maxAmp;
  }
}

// ---------------------------------------------------------------------------
// MapGenerator
// ---------------------------------------------------------------------------
export class MapGenerator {
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly tileSize = 32;
  readonly tilesX: number;
  readonly tilesY: number;
  private rng: SeededRNG;
  private seed: number;

  constructor(mapWidth: number, mapHeight: number, seed?: number) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.seed = seed ?? Date.now();
    this.rng = new SeededRNG(this.seed);
    this.tilesX = Math.ceil(mapWidth / this.tileSize);
    this.tilesY = Math.ceil(mapHeight / this.tileSize);
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------
  generate(playerCount: number): MapData {
    // Re-seed so calling generate again with the same instance is reproducible
    this.rng = new SeededRNG(this.seed);

    // 1. Build noise layers
    const elevNoise = new ValueNoise(this.rng);
    const moistNoise = new ValueNoise(this.rng);
    const featureNoise = new ValueNoise(this.rng);

    // Noise scales (in tile-space)
    const eScale = 0.02 + this.rng.nextFloat(0, 0.015);
    const mScale = 0.025 + this.rng.nextFloat(0, 0.01);
    const fScale = 0.04 + this.rng.nextFloat(0, 0.02);

    // 2. Compute spawn positions FIRST so we can protect them
    const spawnPositions = this.computeSpawnPositions(playerCount);

    // 3. Build terrain grid
    const terrain: TerrainTile[][] = [];
    for (let ty = 0; ty < this.tilesY; ty++) {
      terrain[ty] = [];
      for (let tx = 0; tx < this.tilesX; tx++) {
        const elevation = elevNoise.fbm(tx * eScale, ty * eScale, 5, 2.0, 0.5);
        const moisture = moistNoise.fbm(tx * mScale, ty * mScale, 4, 2.0, 0.55);
        const feature = featureNoise.fbm(tx * fScale, ty * fScale, 3, 2.0, 0.6);

        // Edge falloff — push edges toward water
        const edgeFalloff = this.edgeFalloff(tx, ty);
        const elev = Math.max(0, Math.min(1, elevation - edgeFalloff * 0.4));

        const type = this.classifyTerrain(elev, moisture, feature);
        terrain[ty][tx] = { type, elevation: elev, moisture };
      }
    }

    // 4. Carve guaranteed land around spawn positions
    this.protectSpawnAreas(terrain, spawnPositions);

    // 5. Apply sand transitions around water
    this.applySandTransitions(terrain);

    // 6. Place resources
    const resources = this.placeResources(terrain, spawnPositions, playerCount);

    // 7. Place decorations
    const decorations = this.placeDecorations(terrain);

    return { spawnPositions, resources, terrain, decorations };
  }

  // -----------------------------------------------------------------------
  // Terrain classification
  // -----------------------------------------------------------------------
  private classifyTerrain(elevation: number, moisture: number, feature: number): TerrainType {
    if (elevation < 0.28) return 'water';
    if (elevation < 0.33) return 'sand';
    if (elevation > 0.72) return 'hill';
    if (moisture < 0.3 && elevation < 0.55) return 'desert';
    if (moisture > 0.55 && feature > 0.5) return 'forest';
    if (moisture > 0.65 && elevation < 0.6) return 'forest';
    return 'grass';
  }

  private edgeFalloff(tx: number, ty: number): number {
    const nx = tx / this.tilesX;
    const ny = ty / this.tilesY;
    // Distance from centre normalised 0-1
    const dx = 2 * nx - 1;
    const dy = 2 * ny - 1;
    // Smooth rectangular falloff
    const d = Math.max(Math.abs(dx), Math.abs(dy));
    return Math.max(0, (d - 0.65) / 0.35);
  }

  // -----------------------------------------------------------------------
  // Spawn positions – equidistant around centre
  // -----------------------------------------------------------------------
  private computeSpawnPositions(playerCount: number): { x: number; y: number }[] {
    const cx = this.mapWidth / 2;
    const cy = this.mapHeight / 2;
    const margin = 300;
    const radius = Math.min(cx, cy) - margin;
    const positions: { x: number; y: number }[] = [];

    // First player offset — random rotation so maps feel different each seed
    const angleOffset = this.rng.nextFloat(0, Math.PI * 2);

    for (let i = 0; i < playerCount; i++) {
      const angle = angleOffset + (i * 2 * Math.PI) / playerCount;
      const x = Math.round(cx + Math.cos(angle) * radius);
      const y = Math.round(cy + Math.sin(angle) * radius);
      positions.push({
        x: this.clampX(x, margin),
        y: this.clampY(y, margin),
      });
    }
    return positions;
  }

  private clampX(x: number, margin: number): number {
    return Math.max(margin, Math.min(this.mapWidth - margin, x));
  }
  private clampY(y: number, margin: number): number {
    return Math.max(margin, Math.min(this.mapHeight - margin, y));
  }

  // -----------------------------------------------------------------------
  // Protect spawn areas — carve to grass so no player starts on water/desert
  // -----------------------------------------------------------------------
  private protectSpawnAreas(terrain: TerrainTile[][], spawns: { x: number; y: number }[]) {
    const radiusTiles = 8; // ~256 px clear zone around each spawn
    for (const spawn of spawns) {
      const ctx = Math.floor(spawn.x / this.tileSize);
      const cty = Math.floor(spawn.y / this.tileSize);
      for (let dy = -radiusTiles; dy <= radiusTiles; dy++) {
        for (let dx = -radiusTiles; dx <= radiusTiles; dx++) {
          if (dx * dx + dy * dy > radiusTiles * radiusTiles) continue;
          const tx = ctx + dx;
          const ty = cty + dy;
          if (tx < 0 || ty < 0 || tx >= this.tilesX || ty >= this.tilesY) continue;
          const tile = terrain[ty][tx];
          if (tile.type === 'water' || tile.type === 'sand' || tile.type === 'desert') {
            tile.type = 'grass';
            tile.elevation = Math.max(tile.elevation, 0.4);
          }
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Sand transitions around water
  // -----------------------------------------------------------------------
  private applySandTransitions(terrain: TerrainTile[][]) {
    const sandCandidates: [number, number][] = [];
    for (let ty = 0; ty < this.tilesY; ty++) {
      for (let tx = 0; tx < this.tilesX; tx++) {
        if (terrain[ty][tx].type !== 'grass' && terrain[ty][tx].type !== 'desert') continue;
        // Check neighbours for water
        let nearWater = false;
        for (let dy = -2; dy <= 2 && !nearWater; dy++) {
          for (let dx = -2; dx <= 2 && !nearWater; dx++) {
            const nx = tx + dx;
            const ny = ty + dy;
            if (nx < 0 || ny < 0 || nx >= this.tilesX || ny >= this.tilesY) continue;
            if (terrain[ny][nx].type === 'water') nearWater = true;
          }
        }
        if (nearWater) sandCandidates.push([tx, ty]);
      }
    }
    for (const [tx, ty] of sandCandidates) {
      terrain[ty][tx].type = 'sand';
    }
  }

  // -----------------------------------------------------------------------
  // Resource placement
  // -----------------------------------------------------------------------
  private placeResources(
    terrain: TerrainTile[][],
    spawns: { x: number; y: number }[],
    playerCount: number
  ): { type: string; x: number; y: number }[] {
    const resources: { type: string; x: number; y: number }[] = [];

    // --- Per-player guaranteed starting resources ---
    for (const spawn of spawns) {
      // Food near spawn (on grass)
      this.scatterResource(resources, terrain, 'food', spawn.x - 120, spawn.y + 130, 90, 6);
      // Wood near spawn (forest direction)
      this.scatterResource(resources, terrain, 'wood', spawn.x + 170, spawn.y - 110, 100, 8);
      // Gold near spawn
      this.scatterResource(resources, terrain, 'gold', spawn.x - 170, spawn.y - 90, 70, 4);
      // Stone near spawn
      this.scatterResource(resources, terrain, 'stone', spawn.x + 120, spawn.y + 170, 70, 4);

      // Secondary slightly further clusters
      const angle = this.rng.nextFloat(0, Math.PI * 2);
      const dist = 350;
      this.scatterResource(resources, terrain, 'gold', spawn.x + Math.cos(angle) * dist, spawn.y + Math.sin(angle) * dist, 80, 3);
      this.scatterResource(resources, terrain, 'food', spawn.x + Math.cos(angle + 1.2) * dist, spawn.y + Math.sin(angle + 1.2) * dist, 80, 4);
    }

    // --- Centre contested resources (rich) ---
    const cx = this.mapWidth / 2;
    const cy = this.mapHeight / 2;
    this.scatterResource(resources, terrain, 'gold', cx, cy, 120, 8);
    this.scatterResource(resources, terrain, 'stone', cx + 140, cy - 100, 100, 6);
    this.scatterResource(resources, terrain, 'food', cx - 130, cy + 140, 100, 8);
    this.scatterResource(resources, terrain, 'wood', cx, cy - 160, 120, 10);

    // --- Terrain-associated resource scattering across the map ---
    const numScatter = Math.floor((this.tilesX * this.tilesY) / 120);
    for (let i = 0; i < numScatter; i++) {
      const px = this.rng.nextFloat(100, this.mapWidth - 100);
      const py = this.rng.nextFloat(100, this.mapHeight - 100);
      const tx = Math.floor(px / this.tileSize);
      const ty = Math.floor(py / this.tileSize);
      if (tx < 0 || ty < 0 || tx >= this.tilesX || ty >= this.tilesY) continue;
      const tile = terrain[ty][tx];
      if (tile.type === 'water') continue;

      // Skip if too close to a spawn (already handled)
      let tooClose = false;
      for (const s of spawns) {
        const d2 = (px - s.x) ** 2 + (py - s.y) ** 2;
        if (d2 < 250 * 250) { tooClose = true; break; }
      }
      if (tooClose) continue;

      // Pick resource type based on terrain
      let type: string;
      if (tile.type === 'hill') {
        type = this.rng.next() < 0.5 ? 'gold' : 'stone';
      } else if (tile.type === 'forest') {
        type = 'wood';
      } else if (tile.type === 'sand') {
        type = this.rng.next() < 0.7 ? 'food' : 'stone';
      } else if (tile.type === 'desert') {
        type = this.rng.next() < 0.6 ? 'gold' : 'stone';
      } else {
        // grass
        const r = this.rng.next();
        if (r < 0.5) type = 'food';
        else if (r < 0.75) type = 'wood';
        else if (r < 0.9) type = 'gold';
        else type = 'stone';
      }

      this.scatterResource(resources, terrain, type, px, py, 60, this.rng.nextInt(2, 5));
    }

    return resources;
  }

  /** Place a small cluster of a resource around (cx, cy). */
  private scatterResource(
    out: { type: string; x: number; y: number }[],
    terrain: TerrainTile[][],
    type: string,
    cx: number,
    cy: number,
    spread: number,
    count: number
  ) {
    for (let i = 0; i < count; i++) {
      const x = cx + (this.rng.next() - 0.5) * spread * 2;
      const y = cy + (this.rng.next() - 0.5) * spread * 2;
      // Clamp to map
      const px = Math.max(16, Math.min(this.mapWidth - 16, x));
      const py = Math.max(16, Math.min(this.mapHeight - 16, y));
      // Don't place on water
      const tx = Math.floor(px / this.tileSize);
      const ty = Math.floor(py / this.tileSize);
      if (tx >= 0 && ty >= 0 && tx < this.tilesX && ty < this.tilesY) {
        if (terrain[ty][tx].type === 'water') continue;
      }
      out.push({ type, x: Math.round(px), y: Math.round(py) });
    }
  }

  // -----------------------------------------------------------------------
  // Decorations – visual-only objects (trees, rocks, bushes, etc.)
  // -----------------------------------------------------------------------
  private placeDecorations(terrain: TerrainTile[][]): { type: string; x: number; y: number }[] {
    const decorations: { type: string; x: number; y: number }[] = [];

    for (let ty = 0; ty < this.tilesY; ty++) {
      for (let tx = 0; tx < this.tilesX; tx++) {
        const tile = terrain[ty][tx];
        const px = tx * this.tileSize + this.tileSize / 2;
        const py = ty * this.tileSize + this.tileSize / 2;

        if (tile.type === 'forest') {
          // Dense trees in forests
          if (this.rng.next() < 0.5) {
            decorations.push({
              type: 'tree',
              x: px + this.rng.nextFloat(-10, 10),
              y: py + this.rng.nextFloat(-10, 10),
            });
          }
          if (this.rng.next() < 0.2) {
            decorations.push({ type: 'bush', x: px + this.rng.nextFloat(-12, 12), y: py + this.rng.nextFloat(-12, 12) });
          }
        } else if (tile.type === 'grass') {
          if (this.rng.next() < 0.03) {
            decorations.push({ type: 'tree', x: px + this.rng.nextFloat(-8, 8), y: py + this.rng.nextFloat(-8, 8) });
          }
          if (this.rng.next() < 0.02) {
            decorations.push({ type: 'flowers', x: px, y: py });
          }
        } else if (tile.type === 'hill') {
          if (this.rng.next() < 0.12) {
            decorations.push({ type: 'rock', x: px + this.rng.nextFloat(-6, 6), y: py + this.rng.nextFloat(-6, 6) });
          }
          if (this.rng.next() < 0.04) {
            decorations.push({ type: 'boulder', x: px, y: py });
          }
        } else if (tile.type === 'desert') {
          if (this.rng.next() < 0.02) {
            decorations.push({ type: 'cactus', x: px, y: py });
          }
          if (this.rng.next() < 0.015) {
            decorations.push({ type: 'skull', x: px, y: py });
          }
        } else if (tile.type === 'sand') {
          if (this.rng.next() < 0.01) {
            decorations.push({ type: 'shell', x: px, y: py });
          }
          if (this.rng.next() < 0.01) {
            decorations.push({ type: 'driftwood', x: px, y: py });
          }
        } else if (tile.type === 'water') {
          if (this.rng.next() < 0.008) {
            decorations.push({ type: 'lilypad', x: px, y: py });
          }
        }
      }
    }

    return decorations;
  }
}
