'use strict';

// More terrain: walls, sixteen more biomes, ores, plants (bushes, flowers,
// mushrooms) and creep ground. Loaded right after game.js so the new tiles
// exist before anything else reads T or TILES.

// Adds a tile at the end of the table (ids stay stable for old saves).
// Extra props: group (Terrain tab heading), wall/ore/plant/creep flags,
// burn (fire spread chance), dots ([chance, color] speckles when drawn).
function addTile(key, props) {
  T[key] = TILES.length;
  TILES.push({ key, level: 3, ...props });
  return T[key];
}

// ---------- Walls ----------
// Block movement. They can be painted, and cities build stone and wood ones.
// Each takes this much damage before it breaks.
const WALLS = {
  WALL_STONE:   { name: 'Stone Wall',   color: 0x8d8a86, hp: 60 },
  WALL_WOOD:    { name: 'Wooden Wall',  color: 0x8a5a30, hp: 30, burn: 0.02 },
  WALL_IRON:    { name: 'Iron Wall',    color: 0x5f666e, hp: 100, spiked: true },
  WALL_EVIL:    { name: 'Evil Wall',    color: 0x4a2a5a, hp: 80 },
  WALL_ANCIENT: { name: 'Ancient Wall', color: 0xb8a878, hp: 250 },
  WALL_GREEN:   { name: 'Green Wall',   color: 0x4f8a3a, hp: 40, burn: 0.01, regrows: true },
  WALL_LIGHT:   { name: 'Light Wall',   color: 0xf0eab0, hp: 50, glow: true },
};
for (const [key, w] of Object.entries(WALLS)) addTile(key, { ...w, wall: true, group: 'Walls', dots: [0.15, 0x2a2a2a] });
const isWall = t => !!TILES[t].wall;

// damage taken by each wall tile so far
let wallDamage = new Uint16Array(1);

function hitWall(x, y, dmg) {
  if (!inBounds(x, y)) return;
  const i = y * state.W + x, t = state.tiles[i];
  if (!isWall(t)) return;
  if (wallDamage.length !== state.tiles.length) wallDamage = new Uint16Array(state.tiles.length);
  wallDamage[i] += dmg;
  if (wallDamage[i] >= TILES[t].hp) {
    wallDamage[i] = 0;
    setTile(x, y, localGround(x, y));
    addEffect('puff', x + 0.5, y + 0.5, 0.5, {});
  }
}

// ---------- More biomes ----------
// [key, name, ground color, tree color (null = no trees), ground props, tree props]
const MORE_BIOMES = [
  ['birch',       'Birch Forest',      0x7ab84a, 0xd8e0c8, { fertile: true }, { burn: 0.035, dots: [0.3, 0x3a3a3a] }],
  ['maple',       'Maple Forest',      0x8aa83a, 0xd0602a, { fertile: true }, { burn: 0.035, dots: [0.3, 0xf0a030] }],
  ['mushroom',    'Mushroom Grove',    0x7a5a8a, 0xd8504a, { fertile: true }, { burn: 0.02, dots: [0.35, 0xf4f0e8] }],
  ['candy',       'Candy Land',        0xf0a8c8, 0xa8e0f0, { fertile: true }, { burn: 0.03, dots: [0.3, 0xffffff] }],
  ['garlic',      'Garlic Fields',     0xd8d0a8, 0xb8c888, { fertile: true }, { burn: 0.02, dots: [0.25, 0xf4f4ec] }],
  ['lemon',       'Lemon Grove',       0xb8c84a, 0x6a9a2a, { fertile: true }, { burn: 0.03, dots: [0.35, 0xf8e040] }],
  ['crystal',     'Crystal Fields',    0x8ad0d8, 0x5ae0f8, {}, { dots: [0.4, 0xffffff] }],
  ['rocklands',   'Rocklands',         0x8a847a, null, {}, {}],
  ['permafrost',  'Permafrost',        0xc8d8e0, null, {}, {}],
  ['meadow',      'Flower Meadow',     0x6ac04a, 0xf090c0, { fertile: true, burn: 0.01 }, { burn: 0.01, dots: [0.5, 0xf8e070] }],
  ['clover',      'Clover Field',      0x3a9a3a, 0x2a7a2a, { fertile: true, burn: 0.008 }, { burn: 0.03 }],
  ['celestial',   'Celestial Plains',  0x5a6ab8, 0xb8c8f8, { fertile: true }, { dots: [0.3, 0xffffff] }],
  ['infernal',    'Infernal Wastes',   0x6a2a20, 0xa83a1a, {}, { dots: [0.35, 0xff8a2a] }],
  ['singularity', 'Singularity Swamp', 0x2a1a3a, 0x5a3a8a, {}, { dots: [0.3, 0xb06cff] }],
  ['paradox',     'Paradox Fields',    0x5ab8a0, 0xb85a8a, { fertile: true }, { dots: [0.3, 0xf8f040] }],
  ['arcane',      'Arcane Desert',     0xa888c8, null, {}, {}],
];
const DOTS_GROUND = { candy: [0.06, 0xffffff], celestial: [0.05, 0xffffff], crystal: [0.08, 0xd8ffff], infernal: [0.06, 0xff6a1a],
  rocklands: [0.12, 0x5a564f], permafrost: [0.08, 0xffffff], meadow: [0.12, 0xf8a0d0], arcane: [0.05, 0xffe0ff],
  garlic: [0.05, 0xffffff], singularity: [0.05, 0x8a5aff], paradox: [0.08, 0xf8f040], clover: [0.08, 0x8ae06a] };

for (const [key, name, gColor, tColor, gProps, tProps] of MORE_BIOMES) {
  const up = key.toUpperCase();
  const ground = addTile(up, { name, color: gColor, biome: key, kind: 'ground', dots: DOTS_GROUND[key], ...gProps });
  const tree = tColor === null ? null : addTile(up + '_TREE', {
    name: { birch: 'Birch Trees', maple: 'Maple Trees', mushroom: 'Giant Mushrooms', candy: 'Candy Trees', garlic: 'Garlic Stalks',
      lemon: 'Lemon Trees', crystal: 'Crystal Spires', meadow: 'Flower Bushes', clover: 'Clover Trees', celestial: 'Star Trees',
      infernal: 'Burning Trees', singularity: 'Void Trees', paradox: 'Paradox Trees' }[key] || name + ' Trees',
    color: tColor, biome: key, kind: 'tree', ...tProps,
  });
  BIOMES[key] = { name, ground, tree, trees: 0.55 };
}

// ---------- Ores ----------
// Mined from hills and mountains; feed better gear (see cities.js).
const ORES = {
  STONE_ORE:  { name: 'Stone Deposit', color: 0xa8a296, dot: 0x4e4a44, material: 'stone' },
  IRON_ORE:   { name: 'Iron Ore',      color: 0x7a6a5a, dot: 0xb87a4a, material: 'iron' },
  SILVER_ORE: { name: 'Silver Ore',    color: 0x7a7a80, dot: 0xe0e4ec, material: 'silver' },
  GOLD_ORE:   { name: 'Gold Ore',      color: 0x7a705a, dot: 0xf8d040, material: 'gold' },
  MYTHRIL:    { name: 'Mythril',       color: 0x6a7a8a, dot: 0x7ae8f8, material: 'mythril' },
  ADAMANTINE: { name: 'Adamantine',    color: 0x5a4a6a, dot: 0xd04af0, material: 'adamantine' },
};
for (const [key, o] of Object.entries(ORES)) addTile(key, { name: o.name, color: o.color, level: 4, ore: o.material, group: 'Ores', dots: [0.3, o.dot] });

// ---------- Plants ----------
addTile('BUSH',      { name: 'Fruit Bush',  color: 0x3f8a2e, plant: true, food: true, group: 'Plants', burn: 0.02, dots: [0.25, 0xd8302a] });
addTile('FLOWERS',   { name: 'Flowers',     color: 0x5fa83a, plant: true, group: 'Plants', burn: 0.01, dots: [0.4, 0xf8a0d0] });
addTile('MUSHROOMS', { name: 'Mushrooms',   color: 0x5a7a3a, plant: true, group: 'Plants', burn: 0.01, dots: [0.3, 0xe04a3a] });
// Plants are sprites that stand on their tile (drawPlants); the tile itself is
// drawn as the ground around it. Art is at double detail like the animals.
// 'f' petals take one of FLOWER_COLORS per plant.
const FLOWER_COLORS = ['#f8a0d0', '#f8e050', '#f4f4f4', '#b07ae8', '#f06a5a'];
function plantSprite(key, rows, pal) { PLANT_ART[T[key]] = { rows, pal }; }
plantSprite('BUSH', [
  '..hhbb..',
  '.hbbbrb.',
  'hbrbbbbb',
  'bbbbbrbb',
  'bbrbbbbb',
  '.bbbbbb.',
  '..dbbd..',
  '...dd...',
], { b: '#2f6e22', h: '#4f9a38', r: '#e0302a', d: '#5a3a1e' });
plantSprite('FLOWERS', [
  '.f....f.',
  'fyf..fyf',
  '.f.f..f.',
  '.sfyf.s.',
  '.s.f..s.',
  '.sls.ls.',
  '..ss.s..',
  '..s..s..',
], { s: '#2f7a22', l: '#4fa83a', y: '#f8d040' });
plantSprite('MUSHROOMS', [
  '..rrrr..',
  '.rrwrrr.',
  'rrrrrwrr',
  'rwrrrrrr',
  '..eeee..',
  '...ee...',
  '...ee...',
  '..eeee..',
], { r: '#d8302a', w: '#f8f4ec', e: '#eadcc0' });

// ores: a boulder with nuggets of the ore, or a crystal cluster for the magic metals
const BOULDER_ART = [
  '........',
  '..rrrr..',
  '.rrkrrr.',
  'rrgkrrkr',
  'rkrrrkgr',
  'rrrkrrrr',
  '.srrrrs.',
  '..ssss..',
];
const CRYSTAL_ART = [
  '...g....',
  '..gk..g.',
  '..kk.gk.',
  '.gkk.kk.',
  '.kkkgkk.',
  'rkkkkkkr',
  'rrrrrrrr',
  '.ssssss.',
];
const hexOf = c => '#' + c.toString(16).padStart(6, '0');
const tintHex = (c, f) => hexOf((Math.min(255, ((c >> 16) & 255) * f) << 16) | (Math.min(255, ((c >> 8) & 255) * f) << 8) | Math.min(255, (c & 255) * f));
for (const [key, o] of Object.entries(ORES)) {
  const crystal = key === 'MYTHRIL' || key === 'ADAMANTINE';
  PLANT_ART[T[key]] = {
    rows: crystal ? CRYSTAL_ART : BOULDER_ART, ore: true,
    pal: { r: tintHex(o.color, 1.05), s: tintHex(o.color, 0.7), k: hexOf(o.dot), g: tintHex(o.dot, 1.4) },
  };
}

function plantSpriteFor(t, variant, flip) {
  return cached(`plant|${t}|${variant}|${flip}`, () => {
    const art = PLANT_ART[t];
    const s = refineSprite(makeSprite(art.rows, { ...art.pal, f: FLOWER_COLORS[variant] }, flip));
    s.res *= 2;   // double detail
    return s;
  });
}

// ---------- Trees ----------
// When you're zoomed in, every tree tile gets a tree sprite in its biome's
// style (zoomed out, the canopy pattern on the tile is enough). L/D/H are the
// leaves (tile color, darker, lighter), T/t the trunk, A an accent (fruit,
// blossom, cap), W white, k bark marks.
const TREE_SHAPES = {
  round: ['...HHLL...', '.HHLLLLDD.', 'HLLLLALLLD', 'HLLLLLLLLD', 'LLALLLLLAD', 'LLLLLLLDDD', '.DLLLLDDD.', '..DDTDDD..', '....TT....', '....Tt....', '....Tt....', '...tTTt...'],
  pine: ['....HL....', '...HLLD...', '...LLLD...', '..HLLLLD..', '..LLLLDD..', '.HLLLLLLD.', '.LLLLLLDD.', 'HLLLLLLLLD', 'LLLLLLLDDD', '....Tt....', '....Tt....', '...tTTt...'],
  palm: ['.LL....LL.', 'LLLL..LLLL', 'L..LLLL..L', '..LLHLLL..', '.L..LL..L.', 'L...Tt...L', '....Tt....', '....tT....', '....Tt....', '...tT.....', '...Tt.....', '..tTTt....'],
  acacia: ['..........', '..........', '.HHLLLLLL.', 'HLLLLLLLLD', 'LLLDDDDDDD', '.DD.TT.DD.', '....TT....', '....tT....', '...T.T....', '..T..tT...', '.....Tt...', '....tTTt..'],
  mangrove: ['...HHLL...', '.HHLLLLDD.', 'HLLLLLLLLD', 'LLLLLLLLLD', 'LLLLLLLDDD', '.DLLLLDDD.', '...TTTT...', '..T.TT.T..', '.T..TT..T.', '.T..Tt..T.', 'T..T..T..T', '..........'],
  dead: ['..T....T..', '...T..T...', 'T..T.T..T.', '.T.TTT.T..', '..TTTTT...', '....TT....', '....TT....', '....Tt....', '....Tt....', '....Tt....', '....Tt....', '...tTTt...'],
  mushroom: ['...AAAA...', '.AAWAAAAA.', 'AAAAAAWAAA', 'AWAAAAAAAA', 'AAAAAWAAAA', '.DDDDDDDD.', '....WW....', '....WW....', '....WW....', '....WW....', '...WWWW...', '..........'],
  lollipop: ['...AAAA...', '..AWWAAA..', '.AAWAAWAA.', '.AWWAAWAA.', '.AAAWWAAA.', '..AAAAAA..', '...AAAA...', '....WW....', '....WW....', '....WW....', '....WW....', '...WWWW...'],
  crystal: ['....H.....', '...HL.....', '...LLD..H.', '..HLLD.HL.', '..LLLD.LD.', '.HLLLDDLD.', '.LLLLLDLD.', '.LLLLLLLD.', 'HLLLLLLLLD', 'LLLLLLLLDD', '.DDDDDDDD.', '..........'],
};
// biome -> shape and colour overrides (anything not listed is a round tree)
const TREE_LOOKS = {
  grassland: { shape: 'round' }, savanna: { shape: 'acacia' }, jungle: { shape: 'palm' }, swamp: { shape: 'mangrove' },
  tundra: { shape: 'pine' }, corrupt: { shape: 'dead', T: '#3e2c4a', t: '#2a1c34' }, enchanted: { A: '#f5b0e8' },
  birch: { T: '#ece8dc', t: '#2a2a2a', L: '#8ac04a', D: '#5e8f30', H: '#b0dc6a', A: '#9ccc58' }, maple: { A: '#f0a030' }, mushroom: { shape: 'mushroom', D: '#d8c8a8' },
  candy: { shape: 'lollipop', A: '#f070b0' }, lemon: { A: '#f8e040' }, crystal: { shape: 'crystal' }, meadow: { A: '#f8a0d0' },
  celestial: { A: '#ffffff' }, infernal: { shape: 'dead', T: '#a83a1a', t: '#ff8a2a' }, singularity: { shape: 'dead', T: '#5a3a8a', t: '#b06cff' },
  paradox: { A: '#f8f040' },
};
const TREE_ZOOM = 8;   // screen pixels per tile (per dpr) before trees become sprites
function treeSpriteFor(t, variant, flip) {
  return cached(`tree|${t}|${variant}|${flip}`, () => {
    const look = TREE_LOOKS[TILES[t].biome] || {};
    const c = TILES[t].color * 1, shade = [0.9, 1, 1.1][variant];
    const pal = { L: tintHex(c, shade), D: tintHex(c, shade * 0.68), H: tintHex(c, shade * 1.3), A: tintHex(c, 1.15), T: '#6b4a2e', t: '#4a3020', W: '#f4f0e8', k: '#2a2a2a', ...look };
    const s = refineSprite(makeSprite(TREE_SHAPES[look.shape || 'round'], pal, flip));
    s.res *= 2;
    return s;
  });
}

// every plant and ore tile on screen gets its sprite, standing at the bottom of its tile
function drawPlants(ox, oy, z) {
  const { W, H, tiles, seed } = state;
  const x0 = Math.max(0, Math.floor(-ox / z) - 1), y0 = Math.max(0, Math.floor(-oy / z) - 1);
  const x1 = Math.min(W - 1, Math.ceil((view.width - ox) / z) + 1), y1 = Math.min(H - 1, Math.ceil((view.height - oy) / z) + 1);
  const sc = Math.max(1, Math.round(z / 4)), trees = z / dpr >= TREE_ZOOM;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const t = tiles[y * W + x];
      if (trees && TILES[t].kind === 'tree') {
        const h = hash2(x, y, seed + 71);
        const spr = treeSpriteFor(t, (h * 3) | 0, h > 0.5);
        const k = 0.9 + hash2(x, y, seed + 73) * 0.3, w = (spr.width * sc * k) / spr.res, hh = (spr.height * sc * k) / spr.res;
        const jx = (hash2(x, y, seed + 79) - 0.5) * 0.35 * z;
        ctx.drawImage(spr, Math.round(ox + (x + 0.5) * z - w / 2 + jx), Math.round(oy + (y + 1) * z - hh), w, hh);
        continue;
      }
      if (!PLANT_ART[t]) continue;
      const h = hash2(x, y, seed + 61);
      const spr = plantSpriteFor(t, (h * FLOWER_COLORS.length) | 0, hash2(x, y, seed + 67) > 0.5);
      const w = (spr.width * sc) / spr.res, hh = (spr.height * sc) / spr.res;
      ctx.drawImage(spr, Math.round(ox + (x + 0.5) * z - w / 2), Math.round(oy + (y + 1) * z - hh), w, hh);
    }
  }
}

// ---------- Creep ----------
// Ground grown by monster cores (creatures2.js); it spreads while its core lives.
addTile('TUMOR',   { name: 'Tumor',     color: 0xc86a7a, creep: 'tumor', group: 'Creep', dots: [0.2, 0x8a2a3a] });
addTile('BIOMASS', { name: 'Biomass',   color: 0x6a8a3a, creep: 'biomass', group: 'Creep', dots: [0.2, 0x3a5a1a] });
addTile('PUMPKIN', { name: 'Pumpkin Patch', color: 0x6a5a2a, creep: 'pumpkin', group: 'Creep', dots: [0.15, 0xf08a1a] });
addTile('CYBER',   { name: 'Cybercore Ground', color: 0x3a4a5a, creep: 'cyber', group: 'Creep', dots: [0.2, 0x4af0f8] });

// ---------- Behavior ----------
// Plants and special biomes, sampled a little every sim tick.
function terrainExtraTick() {
  const { W, H, tiles } = state;
  const n = Math.ceil((W * H) / 400);
  for (let k = 0; k < n; k++) {
    const i = (rand() * W * H) | 0, t = tiles[i], info = TILES[t];
    const x = i % W, y = (i / W) | 0;
    const [dx, dy] = NEIGHBORS[(rand() * 4) | 0];
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const nt = tiles[ny * W + nx];
    if (info.plant) {
      // plants creep onto open fertile ground next to them
      if (isGround(nt) && isFertile(nt) && rand() < 0.15) setTile(nx, ny, t);
    } else if (isGround(t) && rand() < 0.0008) {
      // and now and then sprout on their own
      const b = info.biome;
      if (b === 'meadow' || b === 'grassland' || b === 'enchanted') setTile(x, y, rand() < 0.5 ? T.FLOWERS : T.BUSH);
      else if (b === 'mushroom' || b === 'swamp' || b === 'jungle') setTile(x, y, T.MUSHROOMS);
    } else if (info.biome === 'infernal' && rand() < 0.02) {
      ignite(nx, ny);
    } else if (info.biome === 'paradox' && rand() < 0.01 && isPlant(nt)) {
      // the land can't decide what it is
      setTile(nx, ny, inBiome(nt, pick(Object.keys(BIOMES))));
    } else if (t === T.WALL_GREEN && rand() < 0.05 && wallDamage[i]) {
      wallDamage[i] = Math.max(0, wallDamage[i] - 5);
    } else if (info.creep && !creepAlive(info.creep) && !laws.foreverCreep && rand() < 0.05) {
      setTile(x, y, localGround(x, y));
    }
  }
}

// set by creatures2.js: whether a core of that creep kind still stands
function creepAlive(kind) { return typeof coreAlive === 'function' && coreAlive(kind); }

// what a biome does to a creature standing in it
function biomeEffect(u, r, biome) {
  if (!biome) return;
  if (biome === 'garlic' && r.undead && rand() < 0.05) hurt(u, 1, 'garlic');
  else if (biome === 'celestial' && !u.cursed && rand() < 0.0005) u.blessed = true;
  else if (biome === 'clover' && u.hp < maxHp(u) && rand() < 0.2) u.hp += 0.05;   // lucky
  else if (biome === 'infernal' && !r.flies && !u.traits?.includes('fireProof') && rand() < 0.01) hurt(u, 1, 'scorched by infernal ground');
  else if (biome === 'singularity' && rand() < 0.0008) {
    // reality hiccups and drops them somewhere else nearby
    const a = rand() * Math.PI * 2, d = 4 + rand() * 8, nx = u.x + Math.cos(a) * d, ny = u.y + Math.sin(a) * d;
    if (walkable(nx, ny)) { u.x = u.px = nx; u.y = u.py = ny; addEffect('ward', nx, ny - 0.5, 0.5, {}); }
  } else if (biome === 'paradox' && rand() < 0.02 && u.age > YEAR) u.age -= 2;   // grows younger
  else if (biome === 'arcane' && u.mana !== undefined) u.mana = Math.min(100, u.mana + 0.2);
  else if (biome === 'permafrost' && !r.flies && rand() < 0.002 && !u.traits?.includes('frostProof')) u.frozen = 20;
}

// Fertilizer: trees, plants and fresh growth in whatever biome is there.
function fertilize(x, y) {
  forEachInBrush(Math.floor(x), Math.floor(y), (tx, ty) => {
    const t = state.tiles[ty * state.W + tx];
    if (t === T.ASH) setTile(tx, ty, localGround(tx, ty));
    else if (isGround(t) && rand() < 0.15) {
      const b = BIOMES[biomeOf(t)];
      if (b.tree !== null && rand() < 0.6) setTile(tx, ty, b.tree);
      else if (isFertile(t)) setTile(tx, ty, pick([T.FLOWERS, T.BUSH]));
    }
  });
  sprinkle('puff', x, y, 4 + state.brush, 0.6);
}

// a few ore veins and special patches at world generation
// o: World Generator options (ores, rare, rareBiomes, plants; see GEN_DEFAULTS in game.js)
const RARE_BIOMES = ['mushroom', 'meadow', 'clover', 'crystal', 'candy', 'lemon', 'garlic', 'celestial', 'birch', 'maple'];
function decorateWorld(tiles, W, H, seed, o = GEN_DEFAULTS) {
  let s = seed;
  const rnd = () => hash2(s++, 31, seed);
  const veins = Math.round((W * H) / 1800 * o.ores);
  for (let v = 0; v < veins; v++) {
    let x = 0, y = 0, found = false;
    for (let tries = 0; tries < 60 && !found; tries++) {
      x = (rnd() * W) | 0; y = (rnd() * H) | 0;
      found = tiles[y * W + x] === T.HILLS || tiles[y * W + x] === T.MOUNTAIN;
    }
    if (!found) break;
    const r = rnd();
    const ore = r < 0.4 ? T.STONE_ORE : r < 0.7 ? T.IRON_ORE : r < 0.83 ? T.SILVER_ORE : r < 0.93 ? T.GOLD_ORE : r < 0.98 ? T.MYTHRIL : T.ADAMANTINE;
    for (let k = 0; k < 6 + rnd() * 10; k++) {
      const vx = x + Math.round((rnd() - 0.5) * 5), vy = y + Math.round((rnd() - 0.5) * 5);
      if (vx >= 0 && vy >= 0 && vx < W && vy < H && (tiles[vy * W + vx] === T.HILLS || tiles[vy * W + vx] === T.MOUNTAIN)) tiles[vy * W + vx] = ore;
    }
  }
  // a few rare biome patches (two by default), and bushes and flowers here and there
  const rare = o.rareBiomes && o.rareBiomes.length ? o.rareBiomes : o.rareBiomes ? [] : RARE_BIOMES;
  for (let p = 0; p < (rare.length ? o.rare : 0); p++) {
    const key = rare[(rnd() * rare.length) | 0];
    for (let tries = 0; tries < 200; tries++) {
      const cx = (rnd() * W) | 0, cy = (rnd() * H) | 0;
      if (!isPlant(tiles[cy * W + cx]) || biomeOf(tiles[cy * W + cx]) === key) continue;
      const r = 5 + rnd() * 5;
      for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H || Math.hypot(x - cx, y - cy) > r * (0.75 + rnd() * 0.4)) continue;
        const t = tiles[y * W + x];
        if (isPlant(t)) tiles[y * W + x] = inBiome(t, key);
      }
      break;
    }
  }
  for (let k = 0; k < (W * H) / 60 * o.plants; k++) {
    const i = (rnd() * W * H) | 0, t = tiles[i];
    if (t === T.GRASS || t === T.JUNGLE_FLOOR) tiles[i] = rnd() < 0.5 ? T.BUSH : T.FLOWERS;
    else if (t === T.SWAMP) tiles[i] = T.MUSHROOMS;
  }
}
