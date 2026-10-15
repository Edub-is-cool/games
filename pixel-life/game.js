'use strict';

// ---------- Tiles ----------
const T = {
  DEEP: 0, SHALLOW: 1, SAND: 2, GRASS: 3, FOREST: 4, HILLS: 5, MOUNTAIN: 6, SNOW: 7, LAVA: 8, FARM: 9, ASH: 10,
  DESERT: 11, SAVANNA: 12, ACACIA: 13, JUNGLE_FLOOR: 14, JUNGLE: 15, SWAMP: 16, MANGROVE: 17,
  TUNDRA: 18, TAIGA: 19, CORRUPT: 20, DEADWOOD: 21, ENCHANTED: 22, FAIRYWOOD: 23, ICE: 24, GOO: 25,
};

// level = height on the raise/lower ladder. Biome tiles say which biome they
// belong to and whether they are its open ground or its trees.
const TILES = [
  { key: 'DEEP',     name: 'Deep Ocean',    color: 0x2a4f9e, level: 0 },
  { key: 'SHALLOW',  name: 'Shallow Water', color: 0x3f74c9, level: 1 },
  { key: 'SAND',     name: 'Sand',          color: 0xe4d38b, level: 2 },
  { key: 'GRASS',    name: 'Grass',         color: 0x5fa83a, level: 3, biome: 'grassland', kind: 'ground', fertile: true },
  { key: 'FOREST',   name: 'Forest',        color: 0x3f8a2e, level: 3, biome: 'grassland', kind: 'tree' },
  { key: 'HILLS',    name: 'Hills',         color: 0x6e8f3f, level: 4 },
  { key: 'MOUNTAIN', name: 'Mountain',      color: 0x8a8178, level: 5 },
  { key: 'SNOW',     name: 'Snow',          color: 0xeef3f7, level: 6 },
  { key: 'LAVA',     name: 'Lava',          color: 0xe2531d, level: 3 },
  { key: 'FARM',     name: 'Farmland',      color: 0x9a6b3a, level: 3 },
  { key: 'ASH',      name: 'Scorched Earth', color: 0x3f3a35, level: 3 },
  { key: 'DESERT',   name: 'Desert',        color: 0xe0b765, level: 3, biome: 'desert', kind: 'ground' },
  { key: 'SAVANNA',  name: 'Savanna',       color: 0xb5b04a, level: 3, biome: 'savanna', kind: 'ground', fertile: true },
  { key: 'ACACIA',   name: 'Acacia Trees',  color: 0x7f8a35, level: 3, biome: 'savanna', kind: 'tree' },
  { key: 'JUNGLE_FLOOR', name: 'Jungle Floor', color: 0x3f9a3a, level: 3, biome: 'jungle', kind: 'ground', fertile: true },
  { key: 'JUNGLE',   name: 'Jungle',        color: 0x1f6f2a, level: 3, biome: 'jungle', kind: 'tree' },
  { key: 'SWAMP',    name: 'Swamp',         color: 0x56703f, level: 3, biome: 'swamp', kind: 'ground', fertile: true },
  { key: 'MANGROVE', name: 'Mangroves',     color: 0x3c5a33, level: 3, biome: 'swamp', kind: 'tree' },
  { key: 'TUNDRA',   name: 'Tundra',        color: 0xa9b8a0, level: 3, biome: 'tundra', kind: 'ground', fertile: true },
  { key: 'TAIGA',    name: 'Pine Forest',   color: 0x355e4a, level: 3, biome: 'tundra', kind: 'tree' },
  { key: 'CORRUPT',  name: 'Corrupted Land', color: 0x5a3f6e, level: 3, biome: 'corrupt', kind: 'ground' },
  { key: 'DEADWOOD', name: 'Dead Forest',   color: 0x3e2c4a, level: 3, biome: 'corrupt', kind: 'tree' },
  { key: 'ENCHANTED', name: 'Enchanted Meadow', color: 0x6fc9a8, level: 3, biome: 'enchanted', kind: 'ground', fertile: true },
  { key: 'FAIRYWOOD', name: 'Enchanted Forest', color: 0x3f9e8a, level: 3, biome: 'enchanted', kind: 'tree' },
  { key: 'ICE',      name: 'Ice',           color: 0xc4e4f2, level: 1 },
  { key: 'GOO',      name: 'Grey Goo',      color: 0x8e8e9c, level: 3 },
];
const LEVEL_TILE = [T.DEEP, T.SHALLOW, T.SAND, T.GRASS, T.HILLS, T.MOUNTAIN, T.SNOW];
const isWater = t => t === T.DEEP || t === T.SHALLOW;

// trees: chance a ground tile starts out wooded at world gen (higher = fewer trees)
const BIOMES = {
  grassland: { name: 'Grassland', ground: T.GRASS,        tree: T.FOREST,    trees: 0.54 },
  savanna:   { name: 'Savanna',   ground: T.SAVANNA,      tree: T.ACACIA,    trees: 0.63 },
  desert:    { name: 'Desert',    ground: T.DESERT,       tree: null,        trees: 1 },
  jungle:    { name: 'Jungle',    ground: T.JUNGLE_FLOOR, tree: T.JUNGLE,    trees: 0.45 },
  swamp:     { name: 'Swamp',     ground: T.SWAMP,        tree: T.MANGROVE,  trees: 0.57 },
  tundra:    { name: 'Tundra',    ground: T.TUNDRA,       tree: T.TAIGA,     trees: 0.53 },
  corrupt:   { name: 'Corruption', ground: T.CORRUPT,     tree: T.DEADWOOD,  trees: 0.56 },
  enchanted: { name: 'Enchanted', ground: T.ENCHANTED,    tree: T.FAIRYWOOD, trees: 0.55 },
};
const biomeOf = t => TILES[t].biome;
const isTree = t => TILES[t].kind === 'tree';
const isGround = t => TILES[t].kind === 'ground';
const isPlant = t => !!TILES[t].biome;
const isFertile = t => !!TILES[t].fertile;

// The same spot in another biome: trees stay trees, open ground stays ground.
function inBiome(t, key) {
  const b = BIOMES[key];
  return isTree(t) ? (b.tree ?? b.ground) : b.ground;
}

// Bare ground that fits in with the neighbors, for regrowth and reshaped land.
function localGround(x, y) {
  const { W, H, tiles } = state;
  const seen = {};
  let best = 'grassland', most = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const b = biomeOf(tiles[ny * W + nx]);
      if (!b) continue;
      seen[b] = (seen[b] || 0) + 1;
      if (seen[b] > most) { most = seen[b]; best = b; }
    }
  }
  return BIOMES[best].ground;
}

const WORLD_SIZES = {
  small:  { label: 'Small',  W: 200, H: 140 },
  medium: { label: 'Medium', W: 320, H: 220 },
  large:  { label: 'Large',  W: 480, H: 320 },
  huge:   { label: 'Huge',   W: 720, H: 480 },
};

// Map shapes for new worlds. Earth is drawn from a tiny land/sea sketch.
const WORLD_SHAPES = { island: 'Island', continents: 'Continents', pangaea: 'Pangaea', archipelago: 'Archipelago', earth: 'Earth', blank: 'Blank Slate' };
const EARTH = [
  '................................................................',
  '.........#####........#####..........######.....................',
  '...##.##########.....######.....##..##########.#########........',
  '.##################...####....#####.##########################..',
  '...###############...........##############################.....',
  '.....##############..........##.##########################......',
  '......############..........######.######################.......',
  '.......##########...........#.#########################.........',
  '........#######.............###########.##############.##.......',
  '.........#####..............############.############..#........',
  '..........###..............#############..#########.............',
  '...........###.............##############..########.............',
  '............#####...........############....######..............',
  '.............######..........##########......####..#............',
  '..............######..........########........#....##...........',
  '...............######..........######..............###..........',
  '...............######..........#####..............#####.........',
  '................####............####.............#######........',
  '................###.............###..............########.......',
  '................##...............#................######........',
  '................#.................................####..........',
  '................#...............................................',
  '................................................................',
  '................................................................',
  '.........####################################################...',
  '.....##########################################################.',
];

const SAVE_KEY = 'pixellife-save-v1';
const TPS = 10;               // sim ticks per second at 1×
const TICKS_PER_MONTH = 10;

// ---------- Random / noise ----------
function hash2(x, y, s) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function makeNoise(seed) {
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
    const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

function fbm(noise, x, y, octaves) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise(x * freq, y * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

// ---------- State ----------
const state = {
  W: 0, H: 0, seed: 0,
  tiles: null,
  tick: 0,
  speed: 1,
  lastSpeed: 1,
  cam: { x: 0, y: 0, zoom: 4 },
  tab: 'terrain',
  tool: 'hand',   // start out moving the camera, so a first drag doesn't paint over the world
  brush: 4,
  brushShape: 'circle',
  worldSize: 'medium',
  panelOpen: true,
  worldShape: 'island',
  follow: 0,
};

// ---------- World generation ----------
// Options for the World Generator (worldgen.js). 1 means "as usual" for the
// sliders; land: null lets each shape pick its own amount of land.
const GEN_DEFAULTS = {
  land: null, landmass: 1, roughness: 1, continents: 3, mountains: 1, forests: 1, plants: 1, ores: 1, rivers: 1, lakes: 1,
  heat: 0, wet: 0, ice: true, biomes: null, rare: 2, rareBiomes: null, enchanted: true, corruption: false,
};

function generateWorld(W, H, seed, shape = 'island', options = {}) {
  const o = { ...GEN_DEFAULTS, ...options };
  const tiles = new Uint8Array(W * H);
  // Blank Slate: nothing but open ocean, ready to be shaped by hand
  if (shape === 'blank') return tiles.fill(T.DEEP);
  // a few big landmasses for the Continents shape, spread around the map
  const blobs = Array.from({ length: o.continents }, (_, i) => {
    const a = (i / o.continents) * Math.PI * 2 + hash2(i, 4, seed) * 1.2, d = o.continents > 1 ? 0.25 + hash2(i, 1, seed) * 0.3 : 0;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.8, r: (0.4 + hash2(i, 3, seed) * 0.2) * Math.sqrt(3 / Math.max(3, o.continents)) };
  });
  const height = makeNoise(seed);
  const warp = makeNoise(seed + 31);
  const trees = makeNoise(seed + 101);
  const heat = makeNoise(seed + 211);
  const wet = makeNoise(seed + 307);
  const scale = 5 / Math.max(W, H) / o.landmass;   // a bigger landmass setting stretches the noise

  // heights first, so the sea level can be moved before tiles are chosen
  const heights = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const wx = x * scale, wy = y * scale;
      const dx = (fbm(warp, wx, wy, 3) - 0.5) * 1.6 * o.roughness;
      const dy = (fbm(warp, wx + 40, wy + 40, 3) - 0.5) * 1.6 * o.roughness;
      const n = fbm(height, wx + dx, wy + dy, 6);

      // island falloff: 0 in the middle, 1 at the edges
      const nx = (x / W) * 2 - 1, ny = (y / H) * 2 - 1;
      const edge = 1 - (1 - nx * nx) * (1 - ny * ny);
      heights[y * W + x] = shapeHeight(shape, n, nx, ny, edge, x / W, y / H, blobs);
    }
  }
  const sea = seaLevelShift(heights, shape, seed, o.land);
  const relief = new Float32Array(W * H);   // final heights, for rivers to run downhill

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const wx = x * scale, wy = y * scale;
      const ny = (y / H) * 2 - 1;
      let h = remapHeight(heights[y * W + x], sea);
      if (h > 0.425) h = 0.425 + (h - 0.425) * o.mountains;   // flatter or more mountainous land
      relief[y * W + x] = h;

      // climate: cold toward the top and bottom of the map and up high
      const temp = 1.05 - Math.abs(ny) * 1.15 + (fbm(heat, wx * 0.8, wy * 0.8, 4) - 0.5) * 1.3 - Math.max(0, h - 0.5) * 1.5 + o.heat;
      const moist = fbm(wet, wx * 1.2 + 9, wy * 1.2 + 9, 4) + o.wet;

      let t;
      if (h < 0.40) t = o.ice && temp < 0.1 && h > 0.3 ? T.ICE : h < 0.33 ? T.DEEP : T.SHALLOW;
      else if (h < 0.425) t = T.SAND;
      else if (h < 0.56) {
        const b = BIOMES[allowedBiome(climateBiome(temp, moist, h), temp, moist, o.biomes)];
        // more forests lower the bar a tree has to clear; none means no trees at all
        t = b.tree !== null && o.forests > 0 && fbm(trees, wx * 3, wy * 3, 4) > b.trees - (o.forests - 1) * 0.12 ? b.tree : b.ground;
      }
      else if (h < 0.62) t = T.HILLS;
      else if (h < 0.68) t = T.MOUNTAIN;
      else t = T.SNOW;
      tiles[y * W + x] = t;
    }
  }
  carveWater(tiles, relief, W, H, seed, o);   // rivers and lakes (rivers.js)
  if (o.enchanted) sprinklePatch(tiles, W, H, seed, 'enchanted');
  if (o.corruption) sprinklePatch(tiles, W, H, seed + 5, 'corrupt');
  decorateWorld(tiles, W, H, seed, o);
  return tiles;
}

// Every world is 30%–80% land. Each shape picks a random amount of land in
// its own range, and the whole map is raised or lowered (moving the sea
// level) until it has that much. Earth keeps its real outline unless it
// falls outside 30%–80%.
const MIN_LAND = 0.3, MAX_LAND = 0.8, SEA = 0.4;
const LAND_RANGE = {
  island: [0.3, 0.55], continents: [0.35, 0.65], pangaea: [0.45, 0.8], archipelago: [0.3, 0.5], earth: [MIN_LAND, MAX_LAND],
};

function seaLevelShift(heights, shape, seed, wanted = null) {
  const sorted = Float32Array.from(heights).sort();
  const land = 1 - lowerBound(sorted, SEA) / sorted.length;
  const [lo, hi] = LAND_RANGE[shape] || [MIN_LAND, MAX_LAND];
  const target = wanted !== null ? wanted   // the World Generator's land slider
    : shape === 'earth' ? Math.min(hi, Math.max(lo, land)) : lo + hash2(seed, 99, 7) * (hi - lo);
  if (Math.abs(target - land) < 0.005) return null;
  // the height that leaves exactly `target` of the map above the sea
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * (1 - target))));
  return { coast: sorted[idx], low: sorted[0], high: sorted[sorted.length - 1] };
}

// Stretch heights so the new coastline sits at sea level while land keeps its
// usual spread of beaches, plains, hills and peaks (and the sea its depths).
function remapHeight(h, m) {
  if (!m) return h;
  if (h < m.coast) return m.low + ((h - m.low) / Math.max(1e-6, m.coast - m.low)) * (SEA - m.low);
  // land spreads from the beach (0.4) up to a few snowy peaks (0.72)
  return SEA + ((h - m.coast) / Math.max(1e-6, m.high - m.coast)) * 0.32;
}

// index of the first value >= v in a sorted array
function lowerBound(a, v) {
  let lo = 0, hi = a.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (a[mid] < v) lo = mid + 1; else hi = mid; }
  return lo;
}

// how high the land is at a point, for each map shape
function shapeHeight(shape, n, nx, ny, edge, u, v, blobs) {
  if (shape === 'pangaea') return n + 0.14 - edge * 0.75;
  if (shape === 'archipelago') return n * 1.15 - 0.02 - edge * 0.4;
  if (shape === 'continents') {
    let land = 0;
    for (const b of blobs) land = Math.max(land, 1 - Math.hypot(nx - b.x, ny - b.y) / b.r);
    return 0.33 + Math.max(0, land) * 0.3 + (n - 0.5) * 0.5 - edge * 0.12;
  }
  if (shape === 'earth') {
    const ex = u * (EARTH[0].length - 1), ey = v * (EARTH.length - 1);
    const x0 = Math.floor(ex), y0 = Math.floor(ey), fx = ex - x0, fy = ey - y0;
    const at = (x, y) => (EARTH[Math.min(EARTH.length - 1, y)][Math.min(EARTH[0].length - 1, x)] === '#' ? 1 : 0);
    const land = at(x0, y0) * (1 - fx) * (1 - fy) + at(x0 + 1, y0) * fx * (1 - fy) + at(x0, y0 + 1) * (1 - fx) * fy + at(x0 + 1, y0 + 1) * fx * fy;
    return 0.3 + land * 0.2 + (n - 0.5) * 0.3;
  }
  return n + 0.08 - edge * 0.55;
}

function climateBiome(temp, moist, h) {
  if (temp < 0.3) return 'tundra';
  if (temp < 0.42 && moist > 0.58) return 'birch';
  if (temp > 0.72) return moist < 0.42 ? 'desert' : moist < 0.55 ? 'savanna' : 'jungle';
  if (moist > 0.6 && h < 0.47) return 'swamp';
  if (temp > 0.6 && moist < 0.4) return 'savanna';
  return 'grassland';
}

// Where a biome has been switched off in the World Generator, the land takes the
// allowed biome whose climate is closest instead.
const BIOME_CLIMATE = {
  tundra: [0.15, 0.5], birch: [0.36, 0.7], grassland: [0.5, 0.5], swamp: [0.5, 0.75],
  savanna: [0.68, 0.42], desert: [0.85, 0.3], jungle: [0.85, 0.7],
};
function allowedBiome(key, temp, moist, allowed) {
  if (!allowed || allowed.includes(key)) return key;
  if (!allowed.length) return 'grassland';
  let best = allowed[0], bd = Infinity;
  for (const k of allowed) {
    const [ct, cm] = BIOME_CLIMATE[k] || [0.5, 0.5];
    const d = (temp - ct) ** 2 + (moist - cm) ** 2;
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}

// A small patch of one biome (the enchanted grove; corruption if the World Generator asks).
function sprinklePatch(tiles, W, H, seed, key) {
  let s = seed;
  const rnd = () => hash2(s++, 17, seed);
  const b = BIOMES[key];
  for (let tries = 0; tries < 200; tries++) {
    const cx = (rnd() * W) | 0, cy = (rnd() * H) | 0;
    if (!isPlant(tiles[cy * W + cx])) continue;
    const r = 4 + rnd() * 4;
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H || Math.hypot(x - cx, y - cy) > r * (0.75 + rnd() * 0.4)) continue;
        const t = tiles[y * W + x];
        if (isPlant(t)) tiles[y * W + x] = isTree(t) ? b.tree : b.ground;
      }
    }
    break;
  }
}

// gen (from the World Generator) can set W, H, seed and any GEN_DEFAULTS option
function newWorld(sizeKey, gen = null) {
  const size = WORLD_SIZES[sizeKey] || WORLD_SIZES.medium;
  state.worldSize = sizeKey;
  state.W = gen?.W || size.W;
  state.H = gen?.H || size.H;
  state.seed = gen?.seed ?? (Math.random() * 1e9) | 0;
  state.tiles = generateWorld(state.W, state.H, state.seed, state.worldShape, gen || {});
  state.tick = 0;
  initBuffers();
  resetLife();
  resetPowers();
  fitCamera();
}

// ---------- Rendering ----------
const view = document.getElementById('view');
const ctx = view.getContext('2d');
let dpr = 1;
let worldCanvas, wctx, img, pix, base, half;
let dirty = null;

// The ground is drawn with SUB × SUB fine pixels per tile: corners round off
// where different kinds of land meet, and each fine pixel gets a little grain.
const SUB = 4;   // two Scale2x passes, so this must stay 4
const CHUNK = 16;   // dirty tracking works in CHUNK × CHUNK tile blocks

function initBuffers() {
  const { W, H } = state;
  worldCanvas = document.createElement('canvas');
  worldCanvas.width = W * SUB;
  worldCanvas.height = H * SUB;
  wctx = worldCanvas.getContext('2d');
  img = wctx.createImageData(W * SUB, H * SUB);
  pix = new Uint32Array(img.data.buffer);
  base = new Uint32Array(W * H);
  half = new Int32Array(W * H * 4);
  const cols = Math.ceil(W / CHUNK), rows = Math.ceil(H / CHUNK);
  dirty = { cols, rows, flags: new Uint8Array(cols * rows).fill(1), list: [] };
  for (let i = 0; i < cols * rows; i++) dirty.list.push(i);
}

// Tile colors depend on neighbors (relief, shoreline) and the smoothing looks
// two tiles out, so pad by two.
function markDirty(x0, y0, x1, y1) {
  if (!dirty) return;
  x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2);
  x1 = Math.min(state.W - 1, x1 + 2); y1 = Math.min(state.H - 1, y1 + 2);
  for (let cy = (y0 / CHUNK) | 0; cy <= (y1 / CHUNK) | 0; cy++) {
    for (let cx = (x0 / CHUNK) | 0; cx <= (x1 / CHUNK) | 0; cx++) {
      const i = cy * dirty.cols + cx;
      if (!dirty.flags[i]) { dirty.flags[i] = 1; dirty.list.push(i); }
    }
  }
}

function tileColor(x, y) {
  const { W, H, tiles, seed } = state;
  const t = tiles[y * W + x];
  const info = TILES[t];
  let r = (info.color >> 16) & 255, g = (info.color >> 8) & 255, b = info.color & 255;
  let f = 0.94 + hash2(x, y, seed) * 0.1;

  if (isTree(t)) {
    const h = hash2(x, y, seed + 7);
    if (h < 0.35) f *= 0.7;
    else if (h > 0.85) f *= 1.15;
    if (t === T.FAIRYWOOD && h > 0.93) { r = 0xf0; g = 0x9a; b = 0xe0; }
    else if (t === T.DEADWOOD && h > 0.9) { r = 0x8a; g = 0x40; b = 0x9a; }
    else if (t === T.ACACIA && h > 0.5 && h < 0.7) { r = 0xb5; g = 0xb0; b = 0x4a; }
  } else if (t === T.DESERT) {
    const h = hash2(x, y, seed + 13);
    if (h > 0.985) { r = 0x5f; g = 0x8f; b = 0x3a; }       // cactus
    else if ((x + y * 2) % 5 === 0) f *= 0.94;              // dune ripples
  } else if (t === T.SAVANNA || t === T.TUNDRA || t === T.JUNGLE_FLOOR) {
    if (hash2(x, y, seed + 13) > 0.9) f *= t === T.TUNDRA ? 1.18 : 0.85;
  } else if (t === T.SWAMP) {
    if (hash2(x, y, seed + 13) > 0.8) { r = 0x3d; g = 0x5e; b = 0x5a; }   // puddles
  } else if (t === T.CORRUPT) {
    if (hash2(x, y, seed + 13) > 0.88) { r = 0x8a; g = 0x40; b = 0x9a; }
  } else if (t === T.ENCHANTED) {
    const h = hash2(x, y, seed + 13);
    if (h > 0.96) { r = 0xf5; g = 0xb0; b = 0xe8; }          // flowers
    else if (h > 0.92) { r = 0xfa; g = 0xf0; b = 0x9a; }
  } else if (t === T.ICE) {
    if (hash2(x, y, seed + 13) > 0.85) f *= 1.08;
  } else if (t === T.FARM) {
    if (y % 2) f *= 0.82;
    else if (hash2(x, y, seed + 5) > 0.55) { r = 0x8f; g = 0xb0; b = 0x3a; }
  } else if (t === T.LAVA) {
    if (hash2(x, y, seed + 9) > 0.7) g += 70;
  } else if (t === T.ASH) {
    if (hash2(x, y, seed + 11) > 0.8) { r = 0x6a; g = 0x60; b = 0x55; }
  } else if (t === T.SHALLOW) {
    const near = (dx, dy) => {
      const nx = x + dx, ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < W && ny < H && !isWater(tiles[ny * W + nx]);
    };
    if (near(1, 0) || near(-1, 0) || near(0, 1) || near(0, -1)) f *= 1.12;
  }

  // speckles: flowers, ore glints, fruit, stones (terrain2.js tiles)
  if (info.dots && hash2(x, y, seed + 17) < info.dots[0]) {
    const c = info.dots[1];
    r = (c >> 16) & 255; g = (c >> 8) & 255; b = c & 255;
  }

  // relief: lit from the north
  if (info.level >= 2 && y > 0) {
    const above = TILES[tiles[(y - 1) * W + x]].level;
    if (above < info.level) f *= 1.1;
    else if (above > info.level) f *= 0.82;
  }

  r = Math.min(255, r * f) | 0;
  g = Math.min(255, g * f) | 0;
  b = Math.min(255, b * f) | 0;
  return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
}

function shadeColor(c, f) {
  const r = Math.min(255, (c & 255) * f) | 0, g = Math.min(255, ((c >>> 8) & 255) * f) | 0, b = Math.min(255, ((c >>> 16) & 255) * f) | 0;
  return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
}

// Pass 1 of the smoothing: Scale2x on the tile map. For each tile, which tile
// each of its four half-cells copies (rounding off staircase edges).
function smoothTile(x, y) {
  const { W, H, tiles } = state;
  const i = y * W + x, P = tiles[i];
  const n = (dx, dy) => {
    const nx = Math.min(W - 1, Math.max(0, x + dx)), ny = Math.min(H - 1, Math.max(0, y + dy));
    return ny * W + nx;
  };
  const a = n(0, -1), b = n(1, 0), c = n(-1, 0), d = n(0, 1);
  const A = tiles[a], B = tiles[b], C = tiles[c], D = tiles[d];
  const o = i * 4;
  half[o] = C === A && C !== D && A !== B && A !== P ? a : i;
  half[o + 1] = A === B && A !== C && B !== D && B !== P ? b : i;
  half[o + 2] = D === C && D !== B && C !== A && C !== P ? c : i;
  half[o + 3] = B === D && B !== A && D !== C && D !== P ? d : i;
}

// Pass 2: Scale2x again on the half-cells gives SUB = 4 fine pixels per tile,
// then each fine pixel gets a little grain, and trees get round canopies.
function drawFineTile(x, y) {
  const { W, H, tiles, seed } = state;
  const FW = W * SUB, HW = W * 2, HH = H * 2;
  const cell = (X, Y) => {
    X = Math.min(HW - 1, Math.max(0, X)); Y = Math.min(HH - 1, Math.max(0, Y));
    return half[((Y >> 1) * W + (X >> 1)) * 4 + (Y & 1) * 2 + (X & 1)];
  };
  const i = y * W + x, last = SUB - 1;
  for (let hy = 0; hy < 2; hy++) {
    for (let hx = 0; hx < 2; hx++) {
      const X = x * 2 + hx, Y = y * 2 + hy;
      const p = cell(X, Y), a = cell(X, Y - 1), b = cell(X + 1, Y), c = cell(X - 1, Y), d = cell(X, Y + 1);
      const P = tiles[p], A = tiles[a], B = tiles[b], C = tiles[c], D = tiles[d];
      const quad = [
        C === A && C !== D && A !== B && A !== P ? a : p,
        A === B && A !== C && B !== D && B !== P ? b : p,
        D === C && D !== B && C !== A && C !== P ? c : p,
        B === D && B !== A && D !== C && D !== P ? d : p,
      ];
      for (let q = 0; q < 4; q++) {
        const sx = hx * 2 + (q & 1), sy = hy * 2 + (q >> 1);
        const src = quad[q], fx = x * SUB + sx, fy = y * SUB + sy;
        let f = 0.93 + hash2(fx, fy, seed + 23) * 0.14;   // fine grain
        const t = tiles[src];
        if (isTree(t)) {
          // round canopies: lit on top, shadowed at the bottom corners
          if ((sx === 0 || sx === last) && (sy === 0 || sy === last)) f *= sy === last ? 0.7 : 0.85;
          else if (sy === 1 && sx === 1) f *= 1.2;
          else if (sy === last) f *= 0.88;
        } else if (isWater(t) && hash2(fx >> 1, fy, seed + 29) > 0.92) f *= 1.08;   // ripples
        pix[fy * FW + fx] = shadeColor(base[src], f);
      }
    }
  }
}

function flushDirty() {
  if (!dirty || !dirty.list.length) return;
  const { W, H } = state;
  const chunks = dirty.list;
  dirty.list = [];
  for (const ci of chunks) {
    const x0 = (ci % dirty.cols) * CHUNK, y0 = ((ci / dirty.cols) | 0) * CHUNK;
    const x1 = Math.min(W, x0 + CHUNK), y1 = Math.min(H, y0 + CHUNK);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { base[y * W + x] = tileColor(x, y); smoothTile(x, y); }
  }
  for (const ci of chunks) {
    dirty.flags[ci] = 0;
    const x0 = (ci % dirty.cols) * CHUNK, y0 = ((ci / dirty.cols) | 0) * CHUNK;
    const x1 = Math.min(W, x0 + CHUNK), y1 = Math.min(H, y0 + CHUNK);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) drawFineTile(x, y);
    wctx.putImageData(img, 0, 0, x0 * SUB, y0 * SUB, (x1 - x0) * SUB, (y1 - y0) * SUB);
  }
}

function render() {
  flushDirty();
  const { cam, W, H } = state;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#1d3b7a';
  ctx.fillRect(0, 0, view.width, view.height);
  ctx.imageSmoothingEnabled = false;

  const shake = powers.shake * dpr;
  const ox = Math.round(view.width / 2 - cam.x * cam.zoom + (Math.random() - 0.5) * shake);
  const oy = Math.round(view.height / 2 - cam.y * cam.zoom + (Math.random() - 0.5) * shake);
  ctx.drawImage(worldCanvas, ox, oy, W * cam.zoom, H * cam.zoom);
  drawCities(ox, oy, cam.zoom);
  drawStructures(ox, oy, cam.zoom);
  drawLife(ox, oy, cam.zoom);
  drawPolitics(ox, oy, cam.zoom);
  drawUiOverlays(ox, oy, cam.zoom);
  drawPowers(ox, oy, cam.zoom);
  drawDisasters(ox, oy, cam.zoom);
  drawAge();

  const radius = toolRadius(state.tool);
  if (pointer.over && radius > 0 && pointers.size < 2) {
    const p = screenToWorld(pointer.sx, pointer.sy);
    const cx = ox + (Math.floor(p.x) + 0.5) * cam.zoom;
    const cy = oy + (Math.floor(p.y) + 0.5) * cam.zoom;
    const rr = Math.max(radius * cam.zoom, 2 * dpr);
    const shape = usesBrush(state.tool) ? state.brushShape : 'circle';
    ctx.lineWidth = Math.max(1, dpr);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.setLineDash(shape === 'spray' ? [4 * dpr, 4 * dpr] : []);
    ctx.beginPath();
    if (shape === 'square') ctx.rect(cx - rr, cy - rr, rr * 2, rr * 2);
    else if (shape === 'diamond') {
      ctx.moveTo(cx, cy - rr); ctx.lineTo(cx + rr, cy); ctx.lineTo(cx, cy + rr); ctx.lineTo(cx - rr, cy); ctx.closePath();
    } else ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ---------- Camera ----------
function minZoom() { return Math.min(view.width / state.W, view.height / state.H) * 0.5; }
function maxZoom() { return 48 * dpr; }

function fitCamera() {
  state.cam.x = state.W / 2;
  state.cam.y = state.H / 2;
  state.cam.zoom = Math.min(view.width / state.W, view.height / state.H) * 0.92;
}

function clampCamera() {
  const c = state.cam;
  c.zoom = Math.min(maxZoom(), Math.max(minZoom(), c.zoom));
  c.x = Math.min(state.W, Math.max(0, c.x));
  c.y = Math.min(state.H, Math.max(0, c.y));
}

function screenToWorld(sx, sy) {
  const c = state.cam;
  return { x: (sx - view.width / 2) / c.zoom + c.x, y: (sy - view.height / 2) / c.zoom + c.y };
}

function zoomAt(sx, sy, factor) {
  const before = screenToWorld(sx, sy);
  state.cam.zoom *= factor;
  clampCamera();
  const after = screenToWorld(sx, sy);
  state.cam.x += before.x - after.x;
  state.cam.y += before.y - after.y;
  clampCamera();
}

function resize() {
  dpr = window.devicePixelRatio || 1;
  view.width = Math.round(innerWidth * dpr);
  view.height = Math.round(innerHeight * dpr);
  if (state.tiles) clampCamera();
}

// ---------- Editing ----------
function setTile(x, y, t) {
  const i = y * state.W + x;
  if (state.tiles[i] === t) return;
  state.tiles[i] = t;
  markDirty(x, y, x, y);
  onTileChanged(x, y, t);
}

function brushRadius() { return state.brush - 0.5; }
function isPaintTool(tool) { return tool.startsWith('paint:') || tool.startsWith('biome:'); }
function isBrushTool(tool) { return isPaintTool(tool) || tool === 'raise' || tool === 'lower'; }

const BRUSH_SHAPES = {
  circle:  { label: '●', name: 'Circle',  dist: (dx, dy) => Math.hypot(dx, dy) },
  square:  { label: '■', name: 'Square',  dist: (dx, dy) => Math.max(Math.abs(dx), Math.abs(dy)) },
  diamond: { label: '◆', name: 'Diamond', dist: (dx, dy) => Math.abs(dx) + Math.abs(dy) },
  spray:   { label: '░', name: 'Spray',   dist: (dx, dy) => Math.hypot(dx, dy), spray: 0.2 },
};

// how far (dx, dy) is from the brush center, in brush radii (< 1 is inside)
function brushDist(dx, dy) { return BRUSH_SHAPES[state.brushShape].dist(dx, dy) / brushRadius(); }

function forEachInBrush(cx, cy, fn) {
  const r = brushRadius();
  const ri = Math.ceil(r);
  const spray = BRUSH_SHAPES[state.brushShape].spray;
  for (let dy = -ri; dy <= ri; dy++) {
    for (let dx = -ri; dx <= ri; dx++) {
      const d = brushDist(dx, dy);
      if (d >= 1 || (spray && Math.random() > spray)) continue;
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= state.W || y >= state.H) continue;
      fn(x, y, d);
    }
  }
}

function applyTool(cx, cy) {
  const tool = state.tool;
  if (tool.startsWith('paint:')) {
    const t = T[tool.slice(6)];
    forEachInBrush(cx, cy, (x, y) => setTile(x, y, t));
  } else if (tool.startsWith('biome:')) {
    // turns plants, sand and burnt land over to the biome; leaves water, rock and fields
    const key = tool.slice(6);
    forEachInBrush(cx, cy, (x, y) => {
      const t = state.tiles[y * state.W + x];
      if (isPlant(t)) setTile(x, y, inBiome(t, key));
      else if (t === T.ASH || (t === T.SAND && key === 'desert')) setTile(x, y, BIOMES[key].ground);
    });
  } else if (tool === 'raise' || tool === 'lower') {
    const step = tool === 'raise' ? 1 : -1;
    // collect first so one application moves every tile at most one level
    const changes = [];
    forEachInBrush(cx, cy, (x, y, d) => {
      if (Math.random() > 1 - d * d * 0.75) return;
      const level = TILES[state.tiles[y * state.W + x]].level + step;
      if (level < 0 || level >= LEVEL_TILE.length || !keepsSlope(x, y, level)) return;
      changes.push(x, y, level === 3 ? localGround(x, y) : LEVEL_TILE[level]);
    });
    for (let i = 0; i < changes.length; i += 3) setTile(changes[i], changes[i + 1], changes[i + 2]);
  }
}

// Raise/lower never make a cliff steeper than one level, so land grows
// beaches, hills and peaks instead of jumping straight from ocean to snow.
// Cliffs that were painted in can still be worn down.
function keepsSlope(x, y, level) {
  const { W, H, tiles } = state;
  const old = TILES[tiles[y * W + x]].level;
  for (const [dx, dy] of NEIGHBORS) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const n = TILES[tiles[ny * W + nx]].level;
    const diff = Math.abs(n - level);
    if (diff > 1 && diff > Math.abs(n - old)) return false;
  }
  return true;
}

// Paint along the line between pointer samples so fast strokes stay solid.
function strokeTo(x1, y1) {
  const last = pointer.lastTile;
  if (!last) { applyTool(x1, y1); pointer.lastTile = { x: x1, y: y1 }; return; }
  const dx = x1 - last.x, dy = y1 - last.y;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(1, state.brush / 2)));
  for (let s = 1; s <= steps; s++) {
    applyTool(Math.round(last.x + (dx * s) / steps), Math.round(last.y + (dy * s) / steps));
  }
  pointer.lastTile = { x: x1, y: y1 };
}

// ---------- Simulation ----------
const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function simTick() {
  state.tick++;
  const { W, H, tiles } = state;
  const samples = Math.ceil((W * H) / 60);

  for (let k = 0; k < samples; k++) {
    const i = (Math.random() * W * H) | 0;
    const t = tiles[i];
    const info = TILES[t];
    if (info.kind !== 'ground' && t !== T.LAVA && t !== T.FARM && t !== T.ASH && t !== T.GOO && info.biome !== 'corrupt') continue;
    const x = i % W, y = (i / W) | 0;

    if (t === T.GOO) {
      // spent goo crumbles into dead ground
      if (!powers.goo[i] && Math.random() < 0.05) setTile(x, y, T.ASH);
      continue;
    }

    if (t === T.ASH) {
      // burnt land slowly grows back as whatever is around it
      if (Math.random() < 0.08) setTile(x, y, localGround(x, y));
      continue;
    }

    if (t === T.FARM) {
      // fields nobody owns go back to the wild
      if (!life.owner[i] && Math.random() < 0.05) setTile(x, y, localGround(x, y));
      continue;
    }

    const [dx, dy] = NEIGHBORS[(Math.random() * 4) | 0];
    const nx = x + dx, ny = y + dy;
    const inside = nx >= 0 && ny >= 0 && nx < W && ny < H;
    const n = inside ? tiles[ny * W + nx] : -1;

    if (info.biome === 'corrupt' && inside && isPlant(n) && laws.corruption) {
      // corruption creeps into living land; enchanted land holds out much longer
      const nb = biomeOf(n);
      if (nb !== 'corrupt' && Math.random() < (nb === 'enchanted' ? 0.03 : 0.3)) setTile(nx, ny, inBiome(n, 'corrupt'));
    }

    if (info.kind === 'ground') {
      // trees seed into open ground of the same biome
      const tree = BIOMES[info.biome].tree;
      if (tree === null) continue;
      const rate = info.biome === 'jungle' ? 0.015 : 0.01;
      if ((n === tree && Math.random() < rate) || Math.random() < 0.00015) setTile(x, y, tree);
    } else if (t === T.LAVA) {
      // lava hardens next to water, otherwise creeps across low ground and slowly cools
      let touchesWater = false;
      for (const [ddx, ddy] of NEIGHBORS) {
        const mx = x + ddx, my = y + ddy;
        if (mx < 0 || my < 0 || mx >= W || my >= H) continue;
        const m = tiles[my * W + mx];
        if (isWater(m)) touchesWater = true;
        else if (m === T.ICE) setTile(mx, my, T.SHALLOW);
      }
      if (touchesWater) { setTile(x, y, T.MOUNTAIN); continue; }

      if (inside) {
        if ((isPlant(n) || n === T.SAND) && Math.random() < 0.35) setTile(nx, ny, T.LAVA);
        else if (flammable(n) && Math.random() < 0.3) ignite(nx, ny);
      }
      if (Math.random() < 0.04 && !laws.eternalLava) setTile(x, y, T.MOUNTAIN);
    }
  }

  fireTick();
  gooTick();
  disasterTick();
  terrainExtraTick();
  creaturesExtraTick();
  brainTick();
  citiesTick();
  politicsTick();
  uiTick();
  cloudTick();
  lifeTick();
}

// ---------- Save / load ----------
function bytesToB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function b64ToBytes(b64) {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

function saveWorld() {
  const data = {
    v: 2, W: state.W, H: state.H, seed: state.seed, tick: state.tick, laws: state.laws, cam: state.cam, bookmarks: state.bookmarks,
    worldSize: state.worldSize, tiles: bytesToB64(state.tiles), life: serializeLife(),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    toast('World saved');
  } catch {
    toast('Could not save in this browser');
  }
  renderPanel();
}

function loadWorld() {
  let data;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { data = null; }
  if (!data || (data.v !== 1 && data.v !== 2)) { toast('No saved world'); return; }
  state.W = data.W;
  state.H = data.H;
  state.seed = data.seed;
  state.tick = data.tick;
  state.worldSize = data.worldSize || 'medium';
  if (data.laws) Object.assign(state.laws, data.laws);
  state.tiles = b64ToBytes(data.tiles);
  initBuffers();
  loadLife(data.life);
  resetPowers();
  fitCamera();
  // back to where you were looking
  if (data.cam) { Object.assign(state.cam, data.cam); clampCamera(); }
  if (data.bookmarks) state.bookmarks = data.bookmarks;
  toast('World loaded');
}

// ---------- UI ----------
const hoverEl = document.getElementById('hover');
const dateEl = document.getElementById('date');
const panelEl = document.getElementById('panel');
const brushEl = document.getElementById('brush');
const brushInput = document.getElementById('brushSize');
const brushVal = document.getElementById('brushVal');
const toastEl = document.getElementById('toast');
const controlBar = document.getElementById('controlBar');
const controlName = document.getElementById('controlName');
document.getElementById('controlStop').addEventListener('click', () => stopControl('You let go'));
const popEl = document.getElementById('pop');
const infoEl = document.getElementById('info');
const toolbarEl = document.getElementById('toolbar');
let infoPressed = false;
infoEl.addEventListener('pointerdown', () => { infoPressed = true; });
for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, () => setTimeout(() => { infoPressed = false; }, 0));
const infoBody = document.getElementById('infoBody');
let hudFrame = 0;

document.getElementById('infoClose').addEventListener('click', () => { life.selected = null; });

const hex = c => '#' + c.toString(16).padStart(6, '0');

const PANELS = {
  // biome tiles other than plain grass and forest live on the Biomes tab
  terrain: () => {
    const groups = {};
    for (const info of TILES) {
      if (info.biome && info.biome !== 'grassland') continue;
      (groups[info.group || 'Terrain'] ||= []).push({ tool: 'paint:' + info.key, label: info.name, swatch: hex(info.color) });
    }
    return Object.entries(groups).flatMap(([title, items]) => [{ heading: title }, ...items]);
  },
  biomes: () => Object.entries(BIOMES).map(([key, b]) => ({
    tool: 'biome:' + key, label: b.name, swatch: hex(TILES[b.ground].color),
  })),
  shape: () => [
    { tool: 'raise', label: '▲ Raise Land' },
    { tool: 'lower', label: '▼ Lower Land' },
    { tool: 'hand',  label: '✋ Move Camera' },
  ],
  creatures: () => {
    const spawn = keys => keys.map(key => ({ tool: 'spawn:' + key, label: RACES[key].plural, icon: raceIcon(key) }));
    const all = Object.keys(RACES).filter(k => !RACES[k].hidden || progress.unlocked.includes(k));
    const mythic = k => RACES[k].monster || RACES[k].undead || RACES[k].wizard || RACES[k].hero || RACES[k].mythic || k === 'unicorn' || k === 'faerie';
    return [
      { tool: 'control', label: '🎮 Control' },
      { tool: 'grab', label: '✋ Pick Up' },
      { heading: 'Peoples' }, ...spawn(all.filter(k => RACES[k].civ)),
      { heading: 'Animals' }, ...spawn(all.filter(k => !RACES[k].civ && !mythic(k))),
      { heading: 'Mythical & Magic' }, ...spawn(all.filter(k => !RACES[k].civ && mythic(k))),
    ];
  },
  powers: () => Object.entries(POWER_GROUPS).flatMap(([title, keys]) => [
    { heading: title }, ...keys.map(key => ({ tool: 'power:' + key, label: POWERS[key].label })),
  ]),
  world: () => {
    const show = what => () => { life.selected = { [what]: true }; hudFrame = 0; };
    return [
      { heading: 'This world' },
      { action: () => openWorldGen(), label: '🌍 New World' },   // the World Generator (worldgen.js)
      { action: saveWorld, label: '💾 Save' },
      { action: loadWorld, label: '📂 Load', disabled: !hasSave() },
      { action: show('share'), label: '📤 Share Map' },
      { action: show('laws'), label: '⚖ World Laws' },
      { action: show('history'), label: '📜 History' },
      { action: show('stats'), label: '📈 Statistics' },
      { action: show('favorites'), label: '⭐ Favorites' },
      { action: show('achievements'), label: `🏆 Achievements ${progress.achievements.length}/${Object.keys(ACHIEVEMENTS).length}` },
    ];
  },
};

// Long panels are split into groups at their headings; only the chosen group's
// buttons show, under a row of small group tabs.
state.groups = {};

function renderPanel() {
  panelEl.textContent = '';
  const row = document.createElement('div');
  row.className = 'panel-row';
  const items = PANELS[state.tab]();
  const groups = [];
  let loose = [];
  for (const item of items) {
    if (item.heading) groups.push({ title: item.heading, items: [] });
    else if (groups.length) groups[groups.length - 1].items.push(item);
    else loose.push(item);
  }
  let shown = loose;
  if (groups.length) {
    const open = groups.find(g => g.title === state.groups[state.tab]) ||
      groups.find(g => g.items.some(i => i.tool && i.tool === state.tool)) || groups[0];
    state.groups[state.tab] = open.title;
    const bar = document.createElement('div');
    bar.className = 'groups';
    for (const g of groups) {
      const chip = document.createElement('button');
      chip.className = 'group-tab' + (g === open ? ' active' : '');
      chip.textContent = g.title;
      chip.onclick = () => { state.groups[state.tab] = g.title; renderPanel(); };
      bar.append(chip);
    }
    panelEl.append(bar);
    shown = [...loose, ...open.items];
  }
  panelEl.append(row);
  for (const item of shown) addPanelButton(item);
  finishPanel();
}

// a leading emoji or symbol in a label ("🔥 Fire", "▲ Raise Land") becomes the tile's picture
const LABEL_PIC = /^((?:\p{Extended_Pictographic}|[^\p{L}\p{N}\s])[\uFE0F\u200D\p{Extended_Pictographic}\p{Emoji_Modifier}]*)\s+(.+)$/u;

// Tool buttons are square tiles: a picture on top, the name in small print below.
function addPanelButton(item) {
    const btn = document.createElement('button');
    btn.className = 'tile';
    const pic = document.createElement('span');
    pic.className = 'pic';
    let name = String(item.label);
    if (item.swatch) {
      const sw = document.createElement('span');
      sw.className = 'sw';
      sw.style.background = item.swatch;
      pic.append(sw);
    } else if (item.icon) {
      const icon = document.createElement('img');
      icon.className = 'icon';
      icon.src = item.icon;
      icon.alt = '';
      pic.append(icon);
    }
    const m = name.match(LABEL_PIC);
    if (m) {
      if (!pic.childNodes.length) pic.textContent = m[1];
      name = m[2];
    }
    if (pic.childNodes.length) btn.append(pic);
    const label = document.createElement('span');
    label.className = 'name';
    label.textContent = name;
    btn.append(label);
    btn.title = name;
    if (item.tool) {
      btn.classList.toggle('active', state.tool === item.tool);
      btn.onclick = () => { state.toolLabel = item.label; selectTool(item.tool); };
    } else {
      btn.disabled = !!item.disabled;
      btn.classList.toggle('active', !!item.active);
      btn.onclick = item.action;
    }
    (panelEl.querySelector('.panel-row') || panelEl).append(btn);
}

// the button row scrolls sideways; a plain mouse wheel scrolls it too
panelEl.addEventListener('wheel', e => {
  const row = e.target.closest('.panel-row');
  if (!row || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  row.scrollLeft += e.deltaY;
  e.preventDefault();
}, { passive: false });

function finishPanel() {
  for (const b of document.querySelectorAll('#tabs button')) b.classList.toggle('active', b.dataset.tab === state.tab);
  brushEl.hidden = !state.panelOpen || ['world', 'creatures', 'layers'].includes(state.tab);
  panelEl.hidden = !state.panelOpen;
  document.getElementById('toolbar').classList.toggle('folded', !state.panelOpen);
  document.getElementById('fold').textContent = state.panelOpen ? '▾' : '▴';
  view.classList.toggle('possess', state.tool === 'control');
  view.classList.toggle('hand', state.tool === 'hand');
  // a red ✕ just above the toolbar, on the left, unselects the current tool
  const toolbar = document.getElementById('toolbar');
  deselectEl.hidden = state.tool === 'hand';
  deselectEl.style.bottom = toolbar.offsetHeight + 8 + 'px';
  document.getElementById('deselectName').textContent = state.toolLabel || '';
}

const deselectEl = document.getElementById('deselect');
deselectEl.onclick = () => {
  if (state.tool === 'control') stopControl();
  selectTool('hand');
};

function selectTool(tool) {
  state.tool = tool;
  view.classList.toggle('hand', tool === 'hand');
  renderPanel();
}

function setSpeed(speed) {
  if (speed > 0) state.lastSpeed = speed;
  state.speed = speed;
  for (const b of document.querySelectorAll('#speeds button')) b.classList.toggle('active', +b.dataset.speed === speed);
}

function setBrush(size) {
  state.brush = Math.min(40, Math.max(1, size));
  brushInput.value = state.brush;
  brushVal.textContent = state.brush;
}

function setBrushShape(shape) {
  state.brushShape = shape;
  for (const b of shapesEl.querySelectorAll('button')) b.classList.toggle('active', b.dataset.shape === shape);
}

const shapesEl = document.getElementById('shapes');
for (const [key, sh] of Object.entries(BRUSH_SHAPES)) {
  const b = document.createElement('button');
  b.dataset.shape = key;
  b.textContent = sh.label;
  b.title = `${sh.name} brush (B to switch)`;
  b.onclick = () => setBrushShape(key);
  shapesEl.append(b);
}

let toastTimer = 0;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
}

function updateHud() {
  const month = Math.floor(state.tick / TICKS_PER_MONTH);
  dateEl.textContent = `Year ${Math.floor(month / 12) + 1} · Month ${(month % 12) + 1} · ${AGES[currentAge()].name}`;
  popEl.textContent = `👥 ${civPopulation()} · 🏰 ${life.kingdoms.size}`;
  infoEl.hidden = !life.selected;
  const sel = life.selected;
  infoEl.classList.toggle('wide', !!sel && !!(sel.history || sel.stats || sel.laws || sel.share || sel.lists));
  // a creature's or village's info takes the toolbar's place until its ✕ is pressed
  const docked = !!sel && !!(sel.unit || sel.village);
  infoEl.classList.toggle('dock', docked);
  toolbarEl.classList.toggle('covered', docked);
  if (!deselectEl.hidden) deselectEl.style.bottom = (docked ? infoEl : toolbarEl).offsetHeight + 8 + 'px';
  // lists and charts don't need refreshing as often as a creature's health
  // no refresh while a press is in progress inside the panel, or the link being
  // clicked (a ✏️, a name) would be replaced before the click lands
  if (sel && !infoPressed && hudFrame++ % (sel.stats || sel.history || sel.favorites || sel.lists ? 30 : 6) === 0) {
    const html = infoHtml();
    if (html !== infoBody.innerHTML) infoBody.innerHTML = html;
    if (sel.stats) drawStatsCharts();
  }
  refreshEditor();

  if (pointer.over) {
    const p = screenToWorld(pointer.sx, pointer.sy);
    const x = Math.floor(p.x), y = Math.floor(p.y);
    const place = x >= 0 && y >= 0 && x < state.W && y < state.H ? territoryName(x, y) : '';
    hoverEl.textContent = x >= 0 && y >= 0 && x < state.W && y < state.H
      ? `${TILES[state.tiles[y * state.W + x]].name}${place ? ' · ' + place : ''} · ${x}, ${y}` : '';
  } else {
    hoverEl.textContent = '';
  }
}

document.getElementById('tabs').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.id === 'fold') state.panelOpen = !state.panelOpen;
  else if (b.dataset.tab) {
    // clicking the open tab again folds the panel away
    state.panelOpen = !(state.tab === b.dataset.tab && state.panelOpen);
    state.tab = b.dataset.tab;
  }
  renderPanel();
});

document.getElementById('speeds').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b) setSpeed(+b.dataset.speed);
});

brushInput.addEventListener('input', () => setBrush(+brushInput.value));

// ---------- Input ----------
const pointer = { sx: 0, sy: 0, over: false, mode: null, lastTile: null, lastApply: 0 };
const pointers = new Map();
let pinch = null;

function eventPos(e) { return { x: e.clientX * dpr, y: e.clientY * dpr }; }

function pointerTile() {
  const p = screenToWorld(pointer.sx, pointer.sy);
  return { x: Math.floor(p.x), y: Math.floor(p.y) };
}

function pinchInfo() {
  const [a, b] = [...pointers.values()];
  return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, dist: Math.hypot(a.x - b.x, a.y - b.y) };
}

view.addEventListener('pointerdown', e => {
  view.setPointerCapture(e.pointerId);
  const p = eventPos(e);
  pointers.set(e.pointerId, p);
  pointer.sx = p.x; pointer.sy = p.y; pointer.over = true;

  if (pointers.size === 2) {
    pointer.mode = 'pinch';
    pinch = pinchInfo();
    return;
  }
  if (pointers.size > 2) return;

  if (e.button === 1 || e.button === 2 || e.shiftKey || state.tool === 'hand') {
    pointer.mode = 'pan';
    // a tap (no drag) with nothing selected opens the creature or village under it
    pointer.tap = state.tool === 'hand' && e.button === 0 && pointers.size === 1 ? { x: p.x, y: p.y } : null;
  } else {
    pointer.mode = 'tool';
    pointer.lastTile = null;
    pointer.lastApply = performance.now();
    if (state.tool === 'grab') {
      const w = screenToWorld(pointer.sx, pointer.sy);
      const first = unitAt(w.x, w.y, pointer.sx, pointer.sy);
      if (first) {
        held.add(first.id);
        for (const o of life.units) if (held.size < 12 && !o.dead && o !== first && dist(o.x, o.y, first.x, first.y) < 1.2) held.add(o.id);
        moveHeld();
      }
      return;
    }
    if (state.tool === 'control') {
      const w = screenToWorld(pointer.sx, pointer.sy);
      if (controlled()) commandAt(w.x, w.y, pointer.sx, pointer.sy);
      else {
        const u = unitAt(w.x, w.y, pointer.sx, pointer.sy);
        if (u) startControl(u);
        else toast('Click a creature to take control of it');
      }
      hudFrame = 0;
      return;
    }
    if (state.tool === 'inspect') {
      const w = screenToWorld(pointer.sx, pointer.sy);
      inspectAt(w.x, w.y, pointer.sx, pointer.sy);
      hudFrame = 0;
      return;
    }
    if (state.tool.startsWith('power:')) {
      const w = screenToWorld(pointer.sx, pointer.sy);
      usePower(state.tool.slice(6), w.x, w.y);
      return;
    }
    const t = pointerTile();
    if (state.tool.startsWith('spawn:')) spawnAt(state.tool.slice(6), t.x, t.y);
    else strokeTo(t.x, t.y);
  }
});

view.addEventListener('pointermove', e => {
  const p = eventPos(e);
  const prev = pointers.get(e.pointerId);
  if (prev) pointers.set(e.pointerId, p);
  const dx = p.x - pointer.sx, dy = p.y - pointer.sy;
  pointer.sx = p.x; pointer.sy = p.y; pointer.over = true;

  if (pointer.mode === 'pinch' && pointers.size === 2) {
    const now = pinchInfo();
    state.cam.x -= (now.cx - pinch.cx) / state.cam.zoom;
    state.cam.y -= (now.cy - pinch.cy) / state.cam.zoom;
    if (pinch.dist > 0) zoomAt(now.cx, now.cy, now.dist / pinch.dist);
    clampCamera();
    pinch = now;
  } else if (pointer.mode === 'pan' && prev) {
    state.follow = 0;
    state.cam.x -= dx / state.cam.zoom;
    state.cam.y -= dy / state.cam.zoom;
    clampCamera();
  } else if (pointer.mode === 'tool' && held.size) {
    moveHeld();
  } else if (pointer.mode === 'tool' && prev && isPaintTool(state.tool)) {
    const t = pointerTile();
    strokeTo(t.x, t.y);
  }
});

// held creatures dangle under the pointer, spread out a little
function moveHeld() {
  const w = screenToWorld(pointer.sx, pointer.sy);
  let i = 0;
  for (const id of held) {
    const u = life.byId.get(id);
    if (!u || u.dead) continue;
    const a = i * 2.4, r = i ? 0.35 + i * 0.06 : 0;
    u.x = u.px = Math.min(state.W - 0.01, Math.max(0, w.x + Math.cos(a) * r));
    u.y = u.py = Math.min(state.H - 0.01, Math.max(0, w.y + Math.sin(a) * r));
    u.task = null;
    u.tx = null;
    i++;
  }
}

function endPointer(e) {
  const tap = pointer.tap;
  pointer.tap = null;
  if (tap && e.type === 'pointerup' && pointers.size === 1 && Math.hypot(pointer.sx - tap.x, pointer.sy - tap.y) < 6) {
    const w = screenToWorld(pointer.sx, pointer.sy);
    const before = life.selected;
    inspectAt(w.x, w.y, pointer.sx, pointer.sy);
    if (!life.selected) life.selected = before;   // tapping empty ground leaves the panel alone
    hudFrame = 0;
  }
  pointers.delete(e.pointerId);
  if (held.size && pointers.size === 0) {
    held.clear();   // let go: wherever they land is where they are (water drowns walkers)
    toast('Dropped');
  }
  if (pointers.size === 0) { pointer.mode = null; pinch = null; }
  else if (pointer.mode === 'pinch') pointer.mode = 'pan';
}
view.addEventListener('pointerup', endPointer);
view.addEventListener('pointercancel', endPointer);
view.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') pointer.over = false; });
view.addEventListener('contextmenu', e => e.preventDefault());

// A mouse wheel (and a trackpad pinch, which arrives as ctrl+wheel) zooms.
// Two-finger trackpad scrolling pans the map instead.
view.addEventListener('wheel', e => {
  e.preventDefault();
  const p = eventPos(e);
  const trackpadScroll = !e.ctrlKey && e.deltaMode === 0 && (Math.abs(e.deltaX) > 0.5 || Math.abs(e.deltaY) % 1 !== 0 || Math.abs(e.deltaY) < 40);
  if (trackpadScroll) {
    state.follow = 0;
    state.cam.x += (e.deltaX * dpr) / state.cam.zoom;
    state.cam.y += (e.deltaY * dpr) / state.cam.zoom;
    clampCamera();
  } else {
    zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
  }
}, { passive: false });

// on-screen zoom buttons, for trackpads and touch screens
document.getElementById('zoomIn').onclick = () => zoomAt(view.width / 2, view.height / 2, 1.4);
document.getElementById('zoomOut').onclick = () => zoomAt(view.width / 2, view.height / 2, 1 / 1.4);
document.getElementById('zoomFit').onclick = () => { state.follow = 0; fitCamera(); };

const keys = new Set();
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  keys.add(e.key.toLowerCase());
  if (e.key === ' ') { e.preventDefault(); setSpeed(state.speed ? 0 : state.lastSpeed); }
  else if (e.key === '[') setBrush(state.brush - 1);
  else if (e.key === ']') setBrush(state.brush + 1);
  else if (e.key === 'Escape') { stopControl('You let go'); if (state.tool !== 'hand') selectTool('hand'); }
  else if (e.key.toLowerCase() === 'b') {
    const keys = Object.keys(BRUSH_SHAPES);
    setBrushShape(keys[(keys.indexOf(state.brushShape) + 1) % keys.length]);
  }
  else if (e.key === '+' || e.key === '=') zoomAt(view.width / 2, view.height / 2, 1.25);
  else if (e.key === '-') zoomAt(view.width / 2, view.height / 2, 0.8);
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
addEventListener('resize', resize);

function keyboardPan(dt) {
  // while possessing a creature the movement keys steer it and the camera follows
  const u = controlled();
  control.dx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  control.dy = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  if (u) {
    const k = 1 - Math.pow(0.002, dt / 1000);
    state.cam.x += (u.x - state.cam.x) * k;
    state.cam.y += (u.y - state.cam.y) * k;
    controlBar.hidden = false;
    controlName.textContent = describe(u);
    return;
  }
  controlBar.hidden = true;
  const f = state.follow && life.byId.get(state.follow);
  if (f && !f.dead) {
    if (keys.size) state.follow = 0;
    else {
      const k = 1 - Math.pow(0.002, dt / 1000);
      state.cam.x += (f.x - state.cam.x) * k;
      state.cam.y += (f.y - state.cam.y) * k;
      return;
    }
  } else state.follow = 0;
  const speed = (600 * dpr * dt) / 1000 / state.cam.zoom;
  if (keys.has('w') || keys.has('arrowup')) state.cam.y -= speed;
  if (keys.has('s') || keys.has('arrowdown')) state.cam.y += speed;
  if (keys.has('a') || keys.has('arrowleft')) state.cam.x -= speed;
  if (keys.has('d') || keys.has('arrowright')) state.cam.x += speed;
  if (keys.size) clampCamera();
}

// Raise/lower and spawning keep working while the button is held.
function holdTools(now) {
  if (pointer.mode !== 'tool') return;
  if (state.tool.startsWith('power:')) {
    const id = state.tool.slice(6), repeat = POWERS[id].repeat;
    if (!repeat || now - pointer.lastApply < repeat) return;
    pointer.lastApply = now;
    const w = screenToWorld(pointer.sx, pointer.sy);
    usePower(id, w.x, w.y);
    return;
  }
  const spawning = state.tool.startsWith('spawn:');
  if (!spawning && state.tool !== 'raise' && state.tool !== 'lower') return;
  if (now - pointer.lastApply < (spawning ? 150 : 90)) return;
  pointer.lastApply = now;
  const t = pointerTile();
  if (spawning) spawnAt(state.tool.slice(6), t.x, t.y);
  else applyTool(t.x, t.y);
}

// ---------- Main loop ----------
let last = performance.now();
let acc = 0;
let simAlpha = 1;    // how far we are between sim ticks, for smooth movement

// One error must never stop the game loop (that would freeze the camera too),
// so each frame is guarded and the next one is always scheduled.
let frameErrors = 0;
function frame(now) {
  requestAnimationFrame(frame);
  try { frameBody(now); } catch (err) {
    if (frameErrors++ < 3) { console.error(err); toast('⚠ Something went wrong, but the world keeps turning'); }
  }
}

function frameBody(now) {
  const dt = Math.max(0, Math.min(250, now - last));   // never backwards
  last = now;

  if (state.speed > 0) {
    acc += dt * state.speed;
    const step = 1000 / TPS;
    // fast speeds run as many ticks as fit in the frame, so the page stays responsive
    let n = 0;
    const start = performance.now();
    while (acc >= step && n < 400 && performance.now() - start < 40) { simTick(); acc -= step; n++; }
    if (acc >= step * 2) acc = 0;
    simAlpha = Math.min(1, acc / step);
  }

  updateEffects(dt);
  keyboardPan(dt);
  holdTools(now);
  updateHud();
  render();
}
