'use strict';

// Cataclysms, explosives, the god's hands, cleanup tools, terrain-drawing
// critters (automata) and extra clouds. Loaded after powers.js; it registers
// its own POWERS and POWER_GROUPS entries at the bottom. Moving things and
// placed objects live in `disasters` and aren't saved (like fire).

const disasters = {
  tornadoes: [], volcanoes: [], holes: [], ufos: [], objects: [], walkers: [], cells: null,
  heat: null, fuse: null, fuseLit: new Set(),
};

function resetDisasters() {
  Object.assign(disasters, { tornadoes: [], volcanoes: [], holes: [], ufos: [], objects: [], walkers: [] });
  disasters.cells = new Map();                    // Game of Life cells: index -> 'pink' | 'green'
  disasters.heat = new Uint8Array(state.W * state.H);
  disasters.fuse = new Uint8Array(state.W * state.H);
  disasters.fuseLit = new Set();
}

// ---------- Shared ----------
function forEachTile(cx, cy, r, fn) {
  const x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r), y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!inBounds(x, y)) continue;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= r) fn(x, y, state.tiles[y * state.W + x], d);
    }
  }
}

const tileAt = (x, y) => state.tiles[Math.floor(y) * state.W + Math.floor(x)];

// a blast that also sets off any explosives caught in it
function boom(x, y, r, opts) {
  blast(x, y, r, opts);
  addEffect('explosion', x, y, 0.5, { r: r * 0.9 });
  powers.shake = Math.max(powers.shake, Math.min(14, r * 1.2));
  for (const o of disasters.objects) if (o.armed && dist(o.x, o.y, x, y) <= r + 0.5) o.fuseTime = Math.min(o.fuseTime ?? 99, 2);
}

// ---------- Tornado ----------
function summonTornado(x, y) {
  const a = rand() * Math.PI * 2;
  disasters.tornadoes.push({ x, y, dx: Math.cos(a) * 0.15, dy: Math.sin(a) * 0.15, life: 350, r: 2.5 });
  chronicle('🌪 A tornado touched down');
}

function tornadoTick(t) {
  t.dx += (rand() - 0.5) * 0.04;
  t.dy += (rand() - 0.5) * 0.04;
  const sp = Math.hypot(t.dx, t.dy) || 1;
  t.dx = (t.dx / sp) * 0.15;
  t.dy = (t.dy / sp) * 0.15;
  t.x += t.dx; t.y += t.dy;
  if (t.x < 1 || t.x > state.W - 1) t.dx *= -1;
  if (t.y < 1 || t.y > state.H - 1) t.dy *= -1;
  t.life--;
  for (const u of life.units) {
    if (u.dead || u.shield || held.has(u.id) || dist(u.x, u.y, t.x, t.y) > t.r) continue;
    throwUnit(u, 3 + rand() * 5, 6, 'thrown by a tornado');
  }
  if (state.tick % 3 === 0) hitBuildingsNear(t.x, t.y, t.r, 6, 'was torn apart by a tornado');
  forEachTile(t.x, t.y, t.r, (x, y, tile) => {
    if (isTree(tile) && rand() < 0.08) setTile(x, y, BIOMES[biomeOf(tile)].ground);
    const i = y * state.W + x;
    if (powers.fire[i] && rand() < 0.3) extinguish(i);
  });
}

// toss a creature some distance in a random direction
function throwUnit(u, d, dmg, cause) {
  const a = rand() * Math.PI * 2;
  u.x = u.px = Math.min(state.W - 0.5, Math.max(0.5, u.x + Math.cos(a) * d));
  u.y = u.py = Math.min(state.H - 0.5, Math.max(0.5, u.y + Math.sin(a) * d));
  u.boat = false;
  u.task = null;
  u.tx = null;
  hurt(u, dmg, cause);
}

// ---------- Volcano ----------
function summonVolcano(x, y) {
  const cx = Math.floor(x), cy = Math.floor(y);
  if (!inBounds(cx, cy) || isWater(state.tiles[cy * state.W + cx])) { toast('A volcano needs solid ground'); return; }
  forEachTile(cx + 0.5, cy + 0.5, 5, (tx, ty, tile, d) => {
    if (d < 1.5) setTile(tx, ty, T.LAVA);
    else if (d < 3.2) setTile(tx, ty, T.MOUNTAIN);
    else if (!isWater(tile) && TILES[tile].level < 4) setTile(tx, ty, T.HILLS);
  });
  disasters.volcanoes.push({ x: cx + 0.5, y: cy + 0.5, life: 5 * YEAR });
  powers.shake = Math.max(powers.shake, 6);
  chronicle('🌋 A volcano rose from the earth');
}

function volcanoTick(v) {
  v.life--;
  if (state.tick % 20 === 0) setTile(Math.floor(v.x), Math.floor(v.y), T.LAVA);
  if (rand() > 0.06) return;
  const a = rand() * Math.PI * 2, d = 2 + rand() * 6;
  const lx = v.x + Math.cos(a) * d, ly = v.y + Math.sin(a) * d;
  addEffect('explosion', lx, ly, 0.35, { r: 1 });
  const tx = Math.floor(lx), ty = Math.floor(ly);
  if (!inBounds(tx, ty)) return;
  if (!isWater(state.tiles[ty * state.W + tx])) setTile(tx, ty, T.LAVA);
  for (let k = 0; k < 3; k++) ignite(tx + ((rand() * 3) | 0) - 1, ty + ((rand() * 3) | 0) - 1);
  for (const u of life.units) if (dist(u.x, u.y, lx, ly) < 1.5) hurt(u, 25, 'buried in volcanic rock');
}

// ---------- Black hole ----------
function summonBlackHole(x, y) {
  disasters.holes.push({ x, y, life: 260, r: 1 });
  chronicle('🕳 A black hole tore open the sky');
}

function holeTick(h) {
  h.life--;
  h.r = Math.min(7, h.r + 0.03);
  const pull = h.r * 2.5;
  for (const u of life.units) {
    if (u.dead || held.has(u.id)) continue;
    const d = dist(u.x, u.y, h.x, h.y);
    if (d > pull) continue;
    if (d < 1.2) { if (!u.shield) killUnit(u, 'swallowed by a black hole'); continue; }
    u.x += ((h.x - u.x) / d) * 0.25;
    u.y += ((h.y - u.y) / d) * 0.25;
    u.boat = isWater(tileAt(u.x, u.y));
  }
  if (state.tick % 4 === 0) {
    forEachTile(h.x, h.y, h.r, (x, y, tile) => { if (TILES[tile].level > 0 && rand() < 0.15) lowerTile(x, y, 1); });
    hitBuildingsNear(h.x, h.y, h.r, 40, 'was swallowed by a black hole');
  }
}

// ---------- UFO ----------
function summonUfo(x, y) {
  disasters.ufos.push({ x, y, tx: x, ty: y, life: 900, cd: 0 });
  chronicle('🛸 A UFO appeared in the sky');
}

function ufoTick(o) {
  o.life--;
  if (o.cd > 0) o.cd--;
  const target = nearest(o.x, o.y, 6, u => !!RACES[u.race].civ && !u.shield);
  if (target && o.cd === 0) {
    o.cd = 45;
    addEffect('beam', o.x, o.y - 2, 0.5, { x2: target.x, y2: target.y, color: '#9dff7a', w: 6 });
    killUnit(target, 'abducted by aliens');
    return;
  }
  if (o.cd === 0 && rand() < 0.03) {
    o.cd = 30;
    const lx = o.x + (rand() - 0.5) * 6, ly = o.y + 1 + rand() * 4;
    addEffect('beam', o.x, o.y - 2, 0.3, { x2: lx, y2: ly, color: '#ff4040', w: 3 });
    hitBuildingsNear(lx, ly, 2, 40, 'was zapped by a UFO');
    ignite(Math.floor(lx), Math.floor(ly));
    // now and then it drops off a little green landing party
    if (RACES.alien && rand() < 0.25 && walkable(lx, ly)) spawnUnit('alien', lx, ly, 20);
  }
  if (dist(o.x, o.y, o.tx, o.ty) < 1) {
    const v = nearestVillage(o.x, o.y, 150, () => true);
    o.tx = v ? v.x + (rand() - 0.5) * 8 : rand() * state.W;
    o.ty = v ? v.y + (rand() - 0.5) * 8 : rand() * state.H;
  }
  const d = dist(o.x, o.y, o.tx, o.ty) || 1;
  o.x += ((o.tx - o.x) / d) * 0.3;
  o.y += ((o.ty - o.y) / d) * 0.3;
}

// ---------- Heat ray ----------
// Held over the land, it heats tiles until they melt.
function heatRay(x, y) {
  forEachInBrush(Math.floor(x), Math.floor(y), (tx, ty) => {
    const i = ty * state.W + tx, t = state.tiles[i];
    disasters.heat[i] = Math.min(255, disasters.heat[i] + 1);
    const h = disasters.heat[i];
    if (t === T.SNOW && h > 2) setTile(tx, ty, T.MOUNTAIN);
    else if (t === T.ICE && h > 1) setTile(tx, ty, T.SHALLOW);
    else if (t === T.DEEP && h > 6) setTile(tx, ty, T.SHALLOW);
    else if (t === T.SHALLOW && h > 8) setTile(tx, ty, T.SAND);
    else if (!isWater(t) && t !== T.LAVA && h > 4) setTile(tx, ty, T.LAVA);
    else if (h > 1 && rand() < 0.3) ignite(tx, ty);
  });
  addEffect('beam', x, y - 30, 0.12, { x2: x, y2: y, color: '#ff5a1f', w: 4 });
  for (const u of life.units) if (dist(u.x, u.y, x, y) < brushRadius() + 0.5) hurt(u, 4, 'melted by a heat ray');
}

// ---------- Explosives ----------
const grenade = (x, y) => boom(x, y, 2, { crater: 1, fire: 0.1, cause: 'blown up by a grenade' });

function napalm(x, y) {
  for (let k = 0; k < 8; k++) {
    const bx = x - 7 + k * 2, by = y + (rand() - 0.5);
    addEffect('explosion', bx, by, 0.25 + k * 0.06, {
      r: 1.6,
      onEnd: () => {
        forEachTile(bx, by, 2.2, (tx, ty) => { if (rand() < 0.8) ignite(tx, ty); });
        for (const u of life.units) if (dist(u.x, u.y, bx, by) < 2) hurt(u, 20, 'burned by napalm');
        hitBuildingsNear(bx, by, 1.5, 30, 'burned in a napalm strike');
      },
    });
  }
  powers.shake = Math.max(powers.shake, 3);
}

// erases everything in a sphere: no fire, just a hole in the sea
function antimatter(x, y) {
  forEachTile(x, y, 6, (tx, ty) => setTile(tx, ty, T.DEEP));
  for (const u of life.units) if (dist(u.x, u.y, x, y) < 6.5 && !u.shield) killUnit(u, 'annihilated');
  hitBuildingsNear(x, y, 6, 9999, 'was annihilated');
  addEffect('flash', x, y, 0.5, { r: 8 });
  powers.shake = Math.max(powers.shake, 8);
}

function tsarBomba(x, y) {
  addEffect('flash', x, y, 1.2, { r: 60 });
  addEffect('mushroom', x, y, 3, { r: 18 });
  boom(x, y, 34, { crater: 3, fire: 0.08, ash: true, cause: 'vaporized by the Tsar Bomba' });
  progress.nukes++;
  saveProgress();
  chronicle('☢ The Tsar Bomba was dropped');
}

function crabBomb(x, y) {
  boom(x, y, 3, { crater: 1, cause: 'blown up' });
  for (let k = 0; k < 7; k++) {
    const cx = x + (rand() - 0.5) * 4, cy = y + (rand() - 0.5) * 4;
    if (walkable(cx, cy)) spawnUnit('crab', cx, cy, 2);
  }
}

// placed explosives and toys: { type, x, y, armed, fuseTime }
const OBJECT_TYPES = {
  tnt:       { label: 'TNT', color: '#d83a2a', r: 4 },
  timedTnt:  { label: 'Timed TNT', color: '#e8902a', r: 4, timer: 60 },
  waterBomb: { label: 'Water Bomb', color: '#3f74c9', r: 5 },
  landmine:  { label: 'Landmine', color: '#5a5f66', r: 2.5 },
  fireworks: { label: 'Fireworks', color: '#f0a0e0', timer: 25 },
  bowling:   { label: 'Bowling Ball', color: '#2a2a3a' },
};

function placeObject(type) {
  return (x, y) => {
    const o = { type, x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5, armed: true, fuseTime: OBJECT_TYPES[type].timer ?? null };
    if (type === 'bowling') { const a = rand() * Math.PI * 2; o.dx = Math.cos(a) * 0.5; o.dy = Math.sin(a) * 0.5; o.life = 90; }
    disasters.objects.push(o);
  };
}

function objectTick(o) {
  const i = Math.floor(o.y) * state.W + Math.floor(o.x);
  const spec = OBJECT_TYPES[o.type];
  if (o.type === 'bowling') {
    o.x += o.dx; o.y += o.dy; o.life--;
    if (!inBounds(Math.floor(o.x), Math.floor(o.y)) || o.life <= 0) { o.armed = false; return; }
    for (const u of life.units) if (!u.dead && !u.shield && dist(u.x, u.y, o.x, o.y) < 1) killUnit(u, 'flattened by a bowling ball');
    hitBuildingsNear(o.x, o.y, 0.8, 9999, 'was flattened by a bowling ball');
    if (isTree(state.tiles[i])) setTile(Math.floor(o.x), Math.floor(o.y), BIOMES[biomeOf(state.tiles[i])].ground);
    return;
  }
  // set off by fire, a burning fuse, water, a footstep or the timer
  if (powers.fire[i] || disasters.fuseLit.has(i)) o.fuseTime = Math.min(o.fuseTime ?? 99, 3);
  if (o.type === 'waterBomb' && isWater(state.tiles[i])) o.fuseTime = 0;
  if (o.type === 'landmine' && life.units.some(u => !u.dead && !RACES[u.race].flies && dist(u.x, u.y, o.x, o.y) < 0.7)) o.fuseTime = 0;
  if (o.fuseTime === null) return;
  if (o.fuseTime-- > 0) return;
  o.armed = false;
  if (o.type === 'fireworks') {
    const colors = ['#ff5050', '#ffd34d', '#7fe0ff', '#9dff7a', '#f0a0e0'];
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2, d = 1.5 + rand() * 2;
      addEffect('beam', o.x, o.y - 8, 0.8, { x2: o.x + Math.cos(a) * d, y2: o.y - 8 + Math.sin(a) * d, color: pick(colors), w: 2 });
    }
    for (const u of life.units) if (dist(u.x, u.y, o.x, o.y) < 8 && RACES[u.race].civ) u.festive = 2 * YEAR;
    return;
  }
  if (o.type === 'waterBomb') {
    // a splash that scoops out a pond
    forEachTile(o.x, o.y, spec.r, (tx, ty, t, d) => { if (d < spec.r * 0.6 && !isWater(t)) setTile(tx, ty, T.SHALLOW); if (powers.fire[ty * state.W + tx]) extinguish(ty * state.W + tx); });
    hurtUnitsNear(o.x, o.y, spec.r, 10, 'swept away');
    return;
  }
  boom(o.x, o.y, spec.r, { crater: 1, fire: 0.25, cause: `blown up by ${spec.label.toLowerCase()}` });
}

// Fuses: painted lines that burn along, lighting explosives they reach.
function paintFuse(x, y) {
  forEachInBrush(Math.floor(x), Math.floor(y), (tx, ty) => {
    const t = state.tiles[ty * state.W + tx];
    if (!isWater(t)) disasters.fuse[ty * state.W + tx] = 1;
  });
}

function fuseTick() {
  const { W, H } = state;
  // fire lights fuses
  if (state.tick % 2 === 0) for (const i of powers.burning) if (disasters.fuse[i] === 1) { disasters.fuse[i] = 2; disasters.fuseLit.add(i); }
  if (state.tick % 3) return;
  for (const i of [...disasters.fuseLit]) {
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of NEIGHBORS) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx;
      if (disasters.fuse[n] === 1) { disasters.fuse[n] = 2; disasters.fuseLit.add(n); }
    }
    disasters.fuse[i] = 0;
    disasters.fuseLit.delete(i);
    addEffect('spark', x + 0.5, y + 0.5, 0.3, {});
  }
}

// ---------- Infinity coin ----------
function infinityCoin() {
  const alive = life.units.filter(u => !u.dead);
  let n = 0;
  for (const u of alive) if (rand() < 0.5) { killUnit(u, 'turned to dust'); n++; }
  addEffect('flash', state.W / 2, state.H / 2, 1, { r: Math.max(state.W, state.H) });
  chronicle(`🪙 The Infinity Coin was flipped. ${n} creatures turned to dust`);
}

// ---------- The god's hands ----------
function force(x, y) {
  for (const u of life.units) {
    const d = dist(u.x, u.y, x, y);
    if (u.dead || d > 8 || held.has(u.id)) continue;
    const k = (8 - d) / 8 * 4 / (d || 1);
    u.x = Math.min(state.W - 0.5, Math.max(0.5, u.x + (u.x - x) * k));
    u.y = Math.min(state.H - 0.5, Math.max(0.5, u.y + (u.y - y) * k));
    u.px = u.x; u.py = u.y;
    u.boat = false;
    hurt(u, 3, 'knocked flying');
  }
  hitBuildingsNear(x, y, 4, 15, 'was knocked down');
  addEffect('flash', x, y, 0.3, { r: 8 });
}

function flick(x, y) {
  const u = unitAt(x, y, -1, -1);
  if (!u) { toast('Click right on a creature to flick it'); return; }
  throwUnit(u, 20 + rand() * 20, 15, 'flicked across the world');
  addEffect('spark', u.x, u.y - 0.5, 0.8, {});
}

// the finger smears tiles in the direction you drag; the vortex swirls them
const fingerDrag = { x: 0, y: 0, dx: 0, dy: 0 };
view.addEventListener('pointermove', e => {
  const w = screenToWorld(e.clientX * dpr, e.clientY * dpr);
  fingerDrag.dx = w.x - fingerDrag.x;
  fingerDrag.dy = w.y - fingerDrag.y;
  fingerDrag.x = w.x;
  fingerDrag.y = w.y;
});

function finger(x, y) {
  const len = Math.hypot(fingerDrag.dx, fingerDrag.dy);
  if (len < 0.05) return;
  const ux = fingerDrag.dx / len, uy = fingerDrag.dy / len;
  const copy = [];
  forEachInBrush(Math.floor(x), Math.floor(y), (tx, ty) => {
    const sx = Math.round(tx - ux * 1.5), sy = Math.round(ty - uy * 1.5);
    if (inBounds(sx, sy)) copy.push(tx, ty, state.tiles[sy * state.W + sx]);
  });
  for (let k = 0; k < copy.length; k += 3) setTile(copy[k], copy[k + 1], copy[k + 2]);
}

function vortex(x, y) {
  const copy = [], a = 0.35;
  forEachInBrush(Math.floor(x), Math.floor(y), (tx, ty) => {
    const rx = tx + 0.5 - x, ry = ty + 0.5 - y;
    const sx = Math.floor(x + rx * Math.cos(a) - ry * Math.sin(a)), sy = Math.floor(y + rx * Math.sin(a) + ry * Math.cos(a));
    if (inBounds(sx, sy)) copy.push(tx, ty, state.tiles[sy * state.W + sx]);
  });
  for (let k = 0; k < copy.length; k += 3) setTile(copy[k], copy[k + 1], copy[k + 2]);
}

// hot melts and thaws, cold freezes
const WARMER = { [T.SNOW]: T.MOUNTAIN, [T.ICE]: T.SHALLOW, [T.TUNDRA]: T.GRASS, [T.TAIGA]: T.FOREST, [T.GRASS]: T.SAVANNA, [T.FOREST]: T.ACACIA };
const COLDER = { [T.SHALLOW]: T.ICE, [T.GRASS]: T.TUNDRA, [T.FOREST]: T.TAIGA, [T.MOUNTAIN]: T.SNOW, [T.SAVANNA]: T.GRASS, [T.DESERT]: T.TUNDRA, [T.LAVA]: T.MOUNTAIN };

function temperature(table, freeze) {
  return (x, y) => {
    forEachInBrush(Math.floor(x), Math.floor(y), (tx, ty) => {
      const t = state.tiles[ty * state.W + tx];
      if (table[t] !== undefined && rand() < 0.25) setTile(tx, ty, table[t]);
      const i = ty * state.W + tx;
      if (freeze && powers.fire[i]) extinguish(i);
    });
    unitsInBrush(x, y, u => {
      if (freeze) { if (!u.traits?.includes('frostProof')) u.frozen = 60; u.burning = 0; }
      else { u.frozen = 0; }
    });
    sprinkle(freeze ? 'ward' : 'spark', x, y, 4 + state.brush, 0.5);
  };
}

// ---------- Cleanup tools ----------
const CLEANUP = {
  sponge: (tx, ty, t, i) => {     // burnt land, goo, creep and ruins; fires and tornadoes
    if (t === T.ASH || t === T.GOO || TILES[t].creep) setTile(tx, ty, localGround(tx, ty));
    if (powers.fire[i]) extinguish(i);
    disasters.fuse[i] = 0;
  },
  sickle: (tx, ty, t) => { if (isTree(t) || TILES[t].plant) setTile(tx, ty, isTree(t) ? BIOMES[biomeOf(t)].ground : localGround(tx, ty)); },
  bucket: (tx, ty, t) => { if (isWater(t) || t === T.LAVA || t === T.ICE) setTile(tx, ty, t === T.LAVA ? T.MOUNTAIN : T.SAND); },
  pickaxe: (tx, ty, t) => { if (TILES[t].ore) setTile(tx, ty, TILES[t].level >= 5 ? T.MOUNTAIN : T.HILLS); },
  spade: (tx, ty, t) => { if (isPlant(t) && biomeOf(t) !== 'grassland') setTile(tx, ty, inBiome(t, 'grassland')); },
  axe: (tx, ty, t) => { if (isTree(t)) setTile(tx, ty, BIOMES[biomeOf(t)].ground); },
  demolish: (tx, ty, t, i) => {
    const b = life.bmap[i] && life.buildings.get(life.bmap[i]);
    if (b) damageBuilding(b, 99999, 'was demolished');
    if (TILES[t].wall) setTile(tx, ty, localGround(tx, ty));
  },
};

function cleanup(kind) {
  return (x, y) => {
    forEachInBrush(Math.floor(x), Math.floor(y), (tx, ty) => {
      const i = ty * state.W + tx;
      CLEANUP[kind](tx, ty, state.tiles[i], i);
    });
    if (kind === 'sponge') {
      disasters.tornadoes = disasters.tornadoes.filter(t => dist(t.x, t.y, x, y) > brushRadius() + 2);
      if (life.ruins) life.ruins = life.ruins.filter(r => dist(r.x, r.y, x, y) > brushRadius() + 1);
    }
    sprinkle('mist', x, y, 3 + state.brush, 0.4);
  };
}

// removes creatures without a trace
function lifeEraser(x, y) {
  unitsInBrush(x, y, u => { u.dead = true; u.cause = 'erased'; });
  sprinkle('mist', x, y, 4 + state.brush, 0.4);
}

// ---------- Automata ----------
// Little critters that rewrite the terrain by simple rules.
const ANTS = {
  blue:  { on: T.SAND, off: T.SHALLOW, color: '#3f74c9' },
  green: { on: T.GRASS, off: T.ASH, color: '#5fa83a' },
  black: { on: T.MOUNTAIN, off: T.HILLS, color: '#202020' },
  red:   { on: T.FARM, off: T.SAND, color: '#d83a2a' },
};
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

function placeWalker(kind, extra) {
  return (x, y) => disasters.walkers.push({ kind, x: Math.floor(x), y: Math.floor(y), dir: (rand() * 4) | 0, life: 0, ...extra });
}

function walkerTick(w) {
  const steps = w.kind === 'printer' ? 3 : 2;
  for (let s = 0; s < steps; s++) {
    w.life++;
    if (!inBounds(w.x, w.y)) { w.done = true; return; }
    const i = w.y * state.W + w.x, t = state.tiles[i];
    if (w.kind === 'ant') {
      // Langton's ant: turn right on "on" tiles and flip them, left on anything else
      const a = ANTS[w.color];
      if (t === a.on) { w.dir = (w.dir + 1) % 4; setTile(w.x, w.y, a.off); }
      else { w.dir = (w.dir + 3) % 4; setTile(w.x, w.y, a.on); }
      w.x += DIRS[w.dir][0]; w.y += DIRS[w.dir][1];
      if (w.life > 6000) w.done = true;
    } else if (w.kind === 'spider') {
      setTile(w.x, w.y, T.SAND);
      if (rand() < 0.3) w.dir = (rand() * 4) | 0;
      w.x += DIRS[w.dir][0]; w.y += DIRS[w.dir][1];
      if (w.life > 500) w.done = true;
    } else if (w.kind === 'worm') {
      // churns the ground: raises some, sinks some
      if (rand() < 0.5) lowerTile(w.x, w.y, 1);
      else { const lv = TILES[t].level + 1; if (lv < LEVEL_TILE.length) setTile(w.x, w.y, lv === 3 ? localGround(w.x, w.y) : LEVEL_TILE[lv]); }
      if (rand() < 0.25) w.dir = (w.dir + (rand() < 0.5 ? 1 : 3)) % 4;
      w.x += DIRS[w.dir][0]; w.y += DIRS[w.dir][1];
      if (w.life > 700) w.done = true;
    } else if (w.kind === 'printer') {
      const p = w.points[w.step++];
      if (!p) { w.done = true; return; }
      w.x = p[0]; w.y = p[1];
      if (!inBounds(w.x, w.y)) continue;
      const cur = state.tiles[w.y * state.W + w.x];
      if (w.shape === 'crater') lowerTile(w.x, w.y, 2);
      else setTile(w.x, w.y, isWater(cur) ? T.SAND : T.MOUNTAIN);
    }
  }
}

// printer shapes: lists of points around (cx, cy)
const PRINTS = {
  heart: (cx, cy, s) => outline(t => [16 * Math.sin(t) ** 3, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))], cx, cy, s / 16),
  star: (cx, cy, s) => outline(t => { const k = Math.floor(t / (Math.PI / 5)), f = t / (Math.PI / 5) - k, r0 = k % 2 ? 0.4 : 1, r1 = k % 2 ? 1 : 0.4, r = r0 + (r1 - r0) * f; return [Math.sin(t) * r, -Math.cos(t) * r]; }, cx, cy, s),
  spiral: (cx, cy, s) => { const pts = []; for (let t = 0; t < 6 * Math.PI; t += 0.02) pts.push([Math.round(cx + Math.cos(t) * t * s / 19), Math.round(cy + Math.sin(t) * t * s / 19)]); return dedupe(pts); },
  crater: (cx, cy, s) => outline(t => [Math.cos(t), Math.sin(t)], cx, cy, s * 0.7),
  skull: (cx, cy, s) => [
    ...outline(t => [Math.cos(t), Math.sin(t) * 0.85 - 0.2], cx, cy, s),
    ...outline(t => [Math.cos(t) * 0.25 - 0.4, Math.sin(t) * 0.25 - 0.2], cx, cy, s),
    ...outline(t => [Math.cos(t) * 0.25 + 0.4, Math.sin(t) * 0.25 - 0.2], cx, cy, s),
    ...line(cx - s * 0.4, cy + s * 0.75, cx + s * 0.4, cy + s * 0.75),
  ],
  labyrinth: (cx, cy, s) => maze(cx, cy, Math.max(4, Math.round(s / 2))),
};

function outline(f, cx, cy, sc) {
  const pts = [];
  for (let t = 0; t < Math.PI * 2; t += 0.01) { const [px, py] = f(t); pts.push([Math.round(cx + px * sc), Math.round(cy + py * sc)]); }
  return dedupe(pts);
}

function line(x0, y0, x1, y1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)), pts = [];
  for (let k = 0; k <= n; k++) pts.push([Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n)]);
  return pts;
}

function dedupe(pts) {
  const seen = new Set();
  return pts.filter(([x, y]) => { const k = x + ',' + y; if (seen.has(k)) return false; seen.add(k); return true; });
}

// a random maze of n by n cells, drawn as walls two tiles apart
function maze(cx, cy, n) {
  const open = new Set(), stack = [[0, 0]], seen = new Set(['0,0']);
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const next = DIRS.map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n && !seen.has(a + ',' + b));
    if (!next.length) { stack.pop(); continue; }
    const [a, b] = pick(next);
    seen.add(a + ',' + b);
    open.add(`${x * 2 + 1 + (a - x)},${y * 2 + 1 + (b - y)}`);
    stack.push([a, b]);
  }
  const pts = [], size = n * 2 + 1, x0 = cx - n, y0 = cy - n;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = x % 2 === 1 && y % 2 === 1;
      if (!cell && !open.has(`${x},${y}`)) pts.push([x0 + x, y0 + y]);
    }
  }
  return pts;
}

function placePrinter(shape) {
  return (x, y) => {
    const s = 6 + state.brush * 1.2;
    disasters.walkers.push({ kind: 'printer', shape, x: Math.floor(x), y: Math.floor(y), step: 0, life: 0, points: PRINTS[shape](Math.floor(x), Math.floor(y), s) });
  };
}

// Conway's Game of Life cells that eat (pink) or grow (green) the land
function placeLife(kind) {
  return (x, y) => {
    forEachInBrush(Math.floor(x), Math.floor(y), (tx, ty) => { if (rand() < 0.45) disasters.cells.set(ty * state.W + tx, kind); });
  };
}

function lifeCellsTick() {
  if (!disasters.cells.size || state.tick % 4) return;
  const { W, H } = state, counts = new Map();
  for (const [i] of disasters.cells) {
    const x = i % W, y = (i / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx;
      counts.set(n, (counts.get(n) || 0) + 1);
    }
  }
  const next = new Map();
  for (const [n, c] of counts) {
    const alive = disasters.cells.get(n);
    if (c === 3 || (c === 2 && alive)) {
      // newborn cells take the kind of a neighbor
      let kind = alive;
      if (!kind) { const x = n % W, y = (n / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { kind = disasters.cells.get((y + dy) * W + x + dx); if (kind) break; } }
      next.set(n, kind || 'pink');
    }
  }
  disasters.cells = next.size > 6000 ? new Map() : next;
  for (const [i, kind] of disasters.cells) {
    const x = i % W, y = (i / W) | 0, t = state.tiles[i];
    if (kind === 'pink') { if (TILES[t].level > 0 && rand() < 0.2) lowerTile(x, y, 1); }
    else if (!isWater(t) && !isPlant(t) && t !== T.LAVA && rand() < 0.3) setTile(x, y, localGround(x, y));
  }
}

// ---------- Extra clouds ----------
Object.assign(CLOUDS, {
  thunder: { color: '#3a3d4a', drop: '#c8d8ff' },
  hell:    { color: '#5a1a14', drop: '#ff7a1f' },
  lava:    { color: '#7a3a20', drop: '#ff5a1f' },
  ash:     { color: '#6a6660', drop: '#9a948c' },
  magic:   { color: '#b08cff', drop: '#f0d0ff' },
  snow:    { color: '#f4f8ff', drop: '#ffffff' },
});

// called from cloudTick for the kinds above
function extraCloudTick(c, x, y, tx, ty, inside) {
  switch (c.kind) {
    case 'thunder':
      if (inside && rand() < 0.08) lightning(x, y);
      break;
    case 'hell':
      if (inside && rand() < 0.3) ignite(tx, ty);
      for (const u of life.units) if (!u.dead && dist(u.x, u.y, c.x, c.y) <= CLOUD_R && rand() < 0.05) hurt(u, 3, 'rained on by hellfire');
      break;
    case 'lava':
      if (inside && rand() < 0.04 && !isWater(state.tiles[ty * state.W + tx])) { setTile(tx, ty, T.LAVA); addEffect('explosion', x, y, 0.3, { r: 0.8 }); }
      break;
    case 'ash':
      if (inside && isGround(state.tiles[ty * state.W + tx]) && rand() < 0.05) setTile(tx, ty, T.ASH);
      for (const u of life.units) if (!u.dead && dist(u.x, u.y, c.x, c.y) <= CLOUD_R && rand() < 0.01) { u.coughing = YEAR; hurt(u, 1, 'ash fever'); }
      break;
    case 'magic':
      for (const u of life.units) {
        if (u.dead || dist(u.x, u.y, c.x, c.y) > CLOUD_R || rand() > 0.004) continue;
        pick([() => { u.blessed = true; }, () => { u.shield = YEAR; }, () => { u.hp = maxHp(u); }, () => { u.cursed = true; }, () => { u.mad = YEAR / 2; }])();
        addEffect('spark', u.x, u.y - 0.5, 0.6, {});
      }
      break;
    case 'snow':
      for (let n = 0; n < 3; n++) {
        const [px, py] = cloudPoint(c), ix = px | 0, iy = py | 0;
        if (!inBounds(ix, iy)) continue;
        const t = state.tiles[iy * state.W + ix];
        if (COLDER[t] !== undefined && rand() < 0.15) setTile(ix, iy, COLDER[t]);
      }
      for (const u of life.units) if (!u.dead && dist(u.x, u.y, c.x, c.y) <= CLOUD_R && rand() < 0.01 && !u.traits?.includes('frostProof')) u.frozen = 40;
      break;
  }
}

// ---------- Tick & draw ----------
function disasterTick() {
  for (const t of disasters.tornadoes) tornadoTick(t);
  for (const v of disasters.volcanoes) volcanoTick(v);
  for (const h of disasters.holes) holeTick(h);
  for (const o of disasters.ufos) ufoTick(o);
  for (const o of disasters.objects) if (o.armed) objectTick(o);
  for (const w of disasters.walkers) if (!w.done) walkerTick(w);
  fuseTick();
  lifeCellsTick();
  disasters.tornadoes = disasters.tornadoes.filter(t => t.life > 0);
  disasters.volcanoes = disasters.volcanoes.filter(v => v.life > 0);
  disasters.holes = disasters.holes.filter(h => h.life > 0);
  disasters.ufos = disasters.ufos.filter(o => o.life > 0);
  disasters.objects = disasters.objects.filter(o => o.armed);
  disasters.walkers = disasters.walkers.filter(w => !w.done);
}

function drawDisasters(ox, oy, z) {
  const now = performance.now() / 1000;
  const { W } = state;
  // fuses and life cells sit on the tiles
  if (z >= 2) {
    for (const i of disasters.fuseLit) { ctx.fillStyle = '#ffd34d'; ctx.fillRect(ox + (i % W) * z, oy + ((i / W) | 0) * z, z, z); }
  }
  for (const [i, kind] of disasters.cells) {
    ctx.fillStyle = kind === 'pink' ? 'rgba(255,120,200,0.8)' : 'rgba(120,255,140,0.8)';
    ctx.fillRect(ox + (i % W) * z, oy + ((i / W) | 0) * z, z, z);
  }
  ctx.fillStyle = 'rgba(40,30,20,0.85)';
  if (z >= 3) for (let i = 0; i < disasters.fuse.length; i++) if (disasters.fuse[i] === 1) ctx.fillRect(ox + (i % W) * z + z * 0.35, oy + ((i / W) | 0) * z + z * 0.35, z * 0.3, z * 0.3);

  for (const o of disasters.objects) {
    const s = Math.max(4, z * 0.8), cx = ox + o.x * z, cy = oy + o.y * z;
    ctx.fillStyle = OBJECT_TYPES[o.type].color;
    if (o.type === 'bowling' || o.type === 'landmine') { ctx.beginPath(); ctx.arc(cx, cy, s / 2, 0, Math.PI * 2); ctx.fill(); }
    else ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
    if (o.fuseTime !== null && o.type !== 'landmine' && Math.floor(now * 6) % 2) { ctx.fillStyle = '#ffe060'; ctx.fillRect(cx - 1, cy - s / 2 - 3, 2, 3); }
  }
  for (const w of disasters.walkers) {
    ctx.fillStyle = w.kind === 'ant' ? ANTS[w.color].color : w.kind === 'spider' ? '#c8a050' : w.kind === 'worm' ? '#d88a9a' : '#e0e0e0';
    const s = Math.max(3, z * 0.7);
    ctx.fillRect(ox + (w.x + 0.5) * z - s / 2, oy + (w.y + 0.5) * z - s / 2, s, s);
  }
  for (const t of disasters.tornadoes) {
    const cx = ox + t.x * z, cy = oy + t.y * z;
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = '#c8ccd8';
    ctx.lineWidth = Math.max(1, z * 0.25);
    for (let k = 0; k < 7; k++) {
      const w = (0.5 + k * 0.45) * z, yy = cy - k * z * 0.9;
      ctx.beginPath();
      ctx.ellipse(cx + Math.sin(now * 8 + k) * z * 0.4, yy, w, w * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  for (const h of disasters.holes) {
    const cx = ox + h.x * z, cy = oy + h.y * z, r = Math.max(3, h.r * z);
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#b06cff';
    ctx.lineWidth = Math.max(2, z * 0.4);
    ctx.beginPath();
    ctx.arc(cx, cy, r * (1.3 + Math.sin(now * 5) * 0.1), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#05010a';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const o of disasters.ufos) {
    const cx = ox + o.x * z, cy = oy + o.y * z - z * 2, w = Math.max(6, z * 2.2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#9aa3b5';
    ctx.beginPath();
    ctx.ellipse(cx, cy, w, w * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#bfefff';
    ctx.beginPath();
    ctx.ellipse(cx, cy - w * 0.22, w * 0.45, w * 0.3, 0, Math.PI, 0);
    ctx.fill();
    for (let k = -2; k <= 2; k++) {
      ctx.fillStyle = (Math.floor(now * 6) + k) % 2 ? '#ffe060' : '#ff5050';
      ctx.fillRect(cx + k * w * 0.35 - 1.5, cy - 1.5, 3, 3);
    }
  }
  ctx.globalAlpha = 1;
}

// ---------- Registration ----------
Object.assign(POWERS, {
  tornado:      { label: '🌪️ Tornado',      radius: 2.5, repeat: 0, use: summonTornado },
  volcano:      { label: '🌋 Volcano',      radius: 5, repeat: 0, use: summonVolcano },
  blackHole:    { label: '🕳️ Black Hole',   radius: 7, repeat: 0, use: summonBlackHole },
  ufo:          { label: '🛸 UFO',          radius: 6, repeat: 0, use: summonUfo },
  heatRay:      { label: '🔆 Heat Ray',     brush: true, repeat: 80, use: heatRay },
  infinityCoin: { label: '🪙 Infinity Coin', radius: 0, repeat: 0, use: infinityCoin },
  grenade:      { label: '🍍 Grenade',      radius: 2, repeat: 200, use: grenade },
  napalm:       { label: '🔥 Napalm',       radius: 8, repeat: 0, use: napalm },
  antimatter:   { label: '⚫ Antimatter',   radius: 6, repeat: 0, use: antimatter },
  tsarBomba:    { label: '☢️ Tsar Bomba',   radius: 34, repeat: 0, use: tsarBomba },
  crabBomb:     { label: '🦀 Crab Bomb',    radius: 3, repeat: 300, use: crabBomb },
  bowling:      { label: '🎳 Bowling Ball', radius: 1, repeat: 0, use: placeObject('bowling') },
  tnt:          { label: '🧨 TNT',          radius: 4, repeat: 200, use: placeObject('tnt') },
  timedTnt:     { label: '⏲️ Timed TNT',    radius: 4, repeat: 200, use: placeObject('timedTnt') },
  waterBomb:    { label: '💧 Water Bomb',   radius: 5, repeat: 200, use: placeObject('waterBomb') },
  landmine:     { label: '💥 Landmine',     radius: 2.5, repeat: 150, use: placeObject('landmine') },
  fuse:         { label: '〰️ Fuse',         brush: true, repeat: 40, use: paintFuse },
  fireworks:    { label: '🎆 Fireworks',    radius: 1, repeat: 200, use: placeObject('fireworks') },
  force:        { label: '💨 Force',        radius: 8, repeat: 300, use: force },
  flick:        { label: '👉 Flick',        radius: 1, repeat: 0, use: flick },
  finger:       { label: '☝️ Finger',       brush: true, repeat: 30, use: finger },
  vortex:       { label: '🌀 Vortex',       brush: true, repeat: 60, use: vortex },
  hot:          { label: '🌡️ Heat',         brush: true, repeat: 80, use: temperature(WARMER, false) },
  cold:         { label: '❄️ Cold',         brush: true, repeat: 80, use: temperature(COLDER, true) },
  sponge:       { label: '🧽 Sponge',       brush: true, repeat: 60, use: cleanup('sponge') },
  sickle:       { label: '🌾 Sickle',       brush: true, repeat: 60, use: cleanup('sickle') },
  bucket:       { label: '🪣 Bucket',       brush: true, repeat: 60, use: cleanup('bucket') },
  pickaxeTool:  { label: '⛏️ Pickaxe',      brush: true, repeat: 60, use: cleanup('pickaxe') },
  spade:        { label: '🪏 Spade',        brush: true, repeat: 60, use: cleanup('spade') },
  axeTool:      { label: '🪓 Axe',          brush: true, repeat: 60, use: cleanup('axe') },
  demolish:     { label: '🏚️ Demolish',     brush: true, repeat: 60, use: cleanup('demolish') },
  eraser:       { label: '🧼 Life Eraser',  brush: true, repeat: 60, use: lifeEraser },
  antBlue:      { label: '🐜 Blue Ant',     radius: 0.5, repeat: 0, use: placeWalker('ant', { color: 'blue' }) },
  antGreen:     { label: '🐜 Green Ant',    radius: 0.5, repeat: 0, use: placeWalker('ant', { color: 'green' }) },
  antBlack:     { label: '🐜 Black Ant',    radius: 0.5, repeat: 0, use: placeWalker('ant', { color: 'black' }) },
  antRed:       { label: '🐜 Red Ant',      radius: 0.5, repeat: 0, use: placeWalker('ant', { color: 'red' }) },
  sandSpider:   { label: '🕷️ Sand Spider',  radius: 0.5, repeat: 0, use: placeWalker('spider') },
  worm:         { label: '🪱 Worm',         radius: 0.5, repeat: 0, use: placeWalker('worm') },
  lifePink:     { label: '🟪 Pink Life',    brush: true, repeat: 0, use: placeLife('pink') },
  lifeGreen:    { label: '🟩 Green Life',   brush: true, repeat: 0, use: placeLife('green') },
  printHeart:   { label: '❤️ Heart Printer', radius: 1, repeat: 0, use: placePrinter('heart') },
  printSkull:   { label: '💀 Skull Printer', radius: 1, repeat: 0, use: placePrinter('skull') },
  printSpiral:  { label: '🌀 Spiral Printer', radius: 1, repeat: 0, use: placePrinter('spiral') },
  printStar:    { label: '⭐ Star Printer', radius: 1, repeat: 0, use: placePrinter('star') },
  printMaze:    { label: '🧩 Labyrinth Printer', radius: 1, repeat: 0, use: placePrinter('labyrinth') },
  printCrater:  { label: '🕳️ Crater Printer', radius: 1, repeat: 0, use: placePrinter('crater') },
  thunderCloud: { label: '🌩️ Thunder Cloud', radius: CLOUD_R, repeat: 400, use: placeCloud('thunder') },
  hellCloud:    { label: '🔥 Hell Cloud',   radius: CLOUD_R, repeat: 400, use: placeCloud('hell') },
  lavaCloud:    { label: '🌋 Lava Cloud',   radius: CLOUD_R, repeat: 400, use: placeCloud('lava') },
  ashCloud:     { label: '🌫️ Ash Cloud',    radius: CLOUD_R, repeat: 400, use: placeCloud('ash') },
  magicCloud:   { label: '🔮 Magic Cloud',  radius: CLOUD_R, repeat: 400, use: placeCloud('magic') },
  snowCloud:    { label: '🌨️ Snow Cloud',   radius: CLOUD_R, repeat: 400, use: placeCloud('snow') },
});

POWERS.fertilizer = { label: '🌱 Fertilizer', brush: true, repeat: 100, use: fertilize };
POWER_GROUPS['Nature'].push('fertilizer');
POWER_GROUPS['Weather'].push('thunderCloud', 'hellCloud', 'lavaCloud', 'ashCloud', 'magicCloud', 'snowCloud');
Object.assign(POWER_GROUPS, {
  'Cataclysms': ['tornado', 'volcano', 'blackHole', 'ufo', 'heatRay', 'infinityCoin'],
  'Explosives': ['grenade', 'napalm', 'antimatter', 'tsarBomba', 'crabBomb', 'bowling', 'tnt', 'timedTnt', 'waterBomb', 'landmine', 'fuse', 'fireworks'],
  'Hands of God': ['force', 'flick', 'finger', 'vortex', 'hot', 'cold'],
  'Cleanup': ['sponge', 'sickle', 'bucket', 'pickaxeTool', 'spade', 'axeTool', 'demolish', 'eraser'],
  'Automata': ['antBlue', 'antGreen', 'antBlack', 'antRed', 'sandSpider', 'worm', 'lifePink', 'lifeGreen',
    'printHeart', 'printSkull', 'printSpiral', 'printStar', 'printMaze', 'printCrater'],
});
