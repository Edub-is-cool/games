'use strict';

// ---------- Fire ----------
// how likely fire is to jump onto a neighboring tile each tick
const SPREAD = {
  [T.FOREST]: 0.035, [T.GRASS]: 0.008, [T.FARM]: 0.02,
  [T.SAVANNA]: 0.016, [T.ACACIA]: 0.04, [T.JUNGLE_FLOOR]: 0.005, [T.JUNGLE]: 0.028,
  [T.MANGROVE]: 0.012, [T.TUNDRA]: 0.004, [T.TAIGA]: 0.04,
  [T.CORRUPT]: 0.008, [T.DEADWOOD]: 0.05, [T.ENCHANTED]: 0.005, [T.FAIRYWOOD]: 0.02,
};   // desert sand and swamp mud don't burn
for (let t = 0; t < TILES.length; t++) if (TILES[t].burn) SPREAD[t] = TILES[t].burn;   // terrain2.js tiles
const flammable = t => SPREAD[t] !== undefined;

const powers = {
  fire: null,          // ticks left burning on each tile (0 = not burning)
  burning: new Set(),  // indices of burning tiles
  effects: [],         // visual effects, in world coordinates, run in real time
  shake: 0,
  clouds: [],          // drifting weather clouds (not saved, like fire)
  wind: 0,             // direction clouds drift, in radians
};

function resetPowers() {
  powers.fire = new Uint8Array(state.W * state.H);
  powers.goo = new Uint8Array(state.W * state.H);
  resetDisasters();
  powers.gooFront = new Set();
  powers.burning = new Set();
  powers.effects = [];
  powers.shake = 0;
  powers.clouds = [];
  powers.wind = rand() * Math.PI * 2;
}

function ignite(x, y) {
  if (!inBounds(x, y)) return;
  const i = y * state.W + x, t = state.tiles[i];
  if (t === T.ICE) { setTile(x, y, T.SHALLOW); return; }
  if (isWater(t) || powers.fire[i]) return;
  // bare ground only flickers briefly; plants and buildings really burn
  powers.fire[i] = flammable(t) || life.bmap[i] ? 25 + ((rand() * 15) | 0) : 5;
  powers.burning.add(i);
}

function extinguish(i) {
  powers.fire[i] = 0;
  powers.burning.delete(i);
}

function damageBuilding(b, dmg, reason) {
  b.hp -= dmg;
  b.flash = 3;
  if (b.hp > 0) return;
  const v = life.villages.get(b.village);
  if (b.type === 'hall' && v) destroyVillage(v, reason);
  else removeBuilding(b);
}

function fireTick() {
  const { W, H, tiles } = state;
  for (const i of [...powers.burning]) {
    const t = tiles[i];
    if (isWater(t)) { extinguish(i); continue; }
    const x = i % W, y = (i / W) | 0;

    const b = life.bmap[i] && life.buildings.get(life.bmap[i]);
    if (b) damageBuilding(b, 1.5, 'burned down');

    for (const [dx, dy] of NEIGHBORS) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx;
      if (powers.fire[n]) continue;
      const p = life.bmap[n] ? 0.05 : SPREAD[tiles[n]];
      if (p && rand() < p) ignite(nx, ny);
    }

    if (--powers.fire[i] <= 0) {
      powers.burning.delete(i);
      if (flammable(tiles[i]) && !laws.gaia) setTile(x, y, T.ASH);
    }
  }
}

// ---------- Grey goo ----------
// A spreading wave that eats land, trees and buildings. Each new patch has one
// less "generation" than the one it came from, so a blob grows to a big
// circle of wasteland and then burns out.
const GOO_GENERATIONS = 45;

function startGoo(x, y) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) spreadGoo(Math.floor(x) + dx, Math.floor(y) + dy, GOO_GENERATIONS);
  chronicle('🦠 Grey goo was released into the world');
}

function spreadGoo(x, y, gen) {
  if (!inBounds(x, y)) return;
  const i = y * state.W + x, t = state.tiles[i];
  if (isWater(t) || t === T.GOO) return;
  setTile(x, y, T.GOO);
  powers.goo[i] = gen;
  if (gen > 0) powers.gooFront.add(i);
}

function gooTick() {
  const { W } = state;
  for (const i of [...powers.gooFront]) {
    if (state.tiles[i] !== T.GOO) { powers.gooFront.delete(i); continue; }
    if (rand() > 0.12) continue;
    const x = i % W, y = (i / W) | 0;
    const [dx, dy] = NEIGHBORS[(rand() * 4) | 0];
    spreadGoo(x + dx, y + dy, powers.goo[i] - 1);
    if (rand() < 0.3) { powers.gooFront.delete(i); powers.goo[i] = 0; }
  }
}

// ---------- Explosions ----------
function lowerTile(x, y, drop) {
  const t = state.tiles[y * state.W + x];
  const level = Math.max(0, TILES[t].level - drop);
  if (level < TILES[t].level) setTile(x, y, level === 3 ? localGround(x, y) : LEVEL_TILE[level]);
}

function hurtUnitsNear(x, y, r, dmg, cause) {
  for (const u of life.units) {
    if (u.dead || dist(u.x, u.y, x, y) > r || u.shield) continue;
    u.hp -= dmg;
    u.flash = 3;
    if (u.hp <= 0) killUnit(u, cause);
  }
}

function hitBuildingsNear(x, y, r, dmg, reason) {
  for (const b of [...life.buildings.values()]) {
    if (!life.buildings.has(b.id)) continue;   // a destroyed hall takes its houses with it
    if (dist(b.x + b.w / 2, b.y + b.h / 2, x, y) <= r + b.w / 2) damageBuilding(b, dmg, reason);
  }
}

function blast(cx, cy, r, { crater = 0, fire = 0, lava = 0, ash = false, cause = 'blown up' }) {
  const ri = Math.ceil(r);
  const tx = Math.floor(cx), ty = Math.floor(cy);
  for (let dy = -ri; dy <= ri; dy++) {
    for (let dx = -ri; dx <= ri; dx++) {
      const x = tx + dx, y = ty + dy;
      if (!inBounds(x, y)) continue;
      const d = Math.hypot(dx, dy) / r;
      if (d > 1) continue;
      if (crater && !laws.gaia) lowerTile(x, y, Math.round(crater * (1 - d)));
      const t = state.tiles[y * state.W + x];
      if (laws.gaia) { /* the land is protected */ }
      else if (d < lava && !isWater(t)) setTile(x, y, T.LAVA);
      else if (ash && (flammable(t) || t === T.SAND)) setTile(x, y, T.ASH);
      if (rand() < fire) ignite(x, y);
    }
  }
  hurtUnitsNear(cx, cy, r, 999, cause);
  hurtUnitsNear(cx, cy, r * 1.4, 15, cause);
  hitBuildingsNear(cx, cy, r, 9999, 'was destroyed');
  removeMonolithsNear(cx, cy, r * 0.6);
  removeGeysersNear(cx, cy, r * 0.6);
}

// ---------- Powers ----------
function lightning(x, y) {
  const pts = [[x + (rand() - 0.5) * 6, y - 45]];
  for (let i = 1; i < 10; i++) {
    const p = i / 10;
    pts.push([pts[0][0] + (x - pts[0][0]) * p + (rand() - 0.5) * 2.5, pts[0][1] + (y - pts[0][1]) * p]);
  }
  pts.push([x, y]);
  addEffect('bolt', x, y, 0.3, { pts });
  addEffect('flash', x, y, 0.35, { r: 4 });
  hurtUnitsNear(x, y, 1.5, 60, 'struck by lightning');
  hitBuildingsNear(x, y, 0.5, 60, 'was struck by lightning');
  if (rand() < 0.8) ignite(Math.floor(x), Math.floor(y));
  powers.shake = Math.max(powers.shake, 4);
}

function meteor(x, y) {
  addEffect('meteor', x, y, 0.7, {
    onEnd: () => {
      blast(x, y, 5, { crater: 3, fire: 0.5, lava: 0.35, cause: 'crushed by a meteor' });
      addEffect('explosion', x, y, 0.7, { r: 7 });
      powers.shake = Math.max(powers.shake, 14);
    },
  });
}

function bomb(x, y) {
  blast(x, y, 4, { crater: 1, fire: 0.4, cause: 'blown up' });
  addEffect('explosion', x, y, 0.5, { r: 5 });
  powers.shake = Math.max(powers.shake, 8);
}

function nuke(x, y) {
  progress.nukes++;
  saveProgress();
  blast(x, y, 16, { crater: 2, fire: 0.12, ash: true, cause: 'vaporized' });
  addEffect('flash', x, y, 0.8, { r: 30 });
  addEffect('explosion', x, y, 1.2, { r: 18 });
  addEffect('mushroom', x, y, 3, {});
  powers.shake = Math.max(powers.shake, 30);
}

function earthquake(cx, cy) {
  const R = 18;
  for (let c = 0; c < 7; c++) {
    let x = cx + (rand() - 0.5) * R, y = cy + (rand() - 0.5) * R;
    let a = rand() * Math.PI * 2;
    const len = 8 + rand() * 14;
    for (let s = 0; s < len; s++) {
      const tx = Math.floor(x), ty = Math.floor(y);
      if (inBounds(tx, ty) && !isWater(state.tiles[ty * state.W + tx])) lowerTile(tx, ty, rand() < 0.3 ? 2 : 1);
      x += Math.cos(a);
      y += Math.sin(a);
      a += (rand() - 0.5) * 0.7;
    }
  }
  for (const b of [...life.buildings.values()]) {
    if (!life.buildings.has(b.id) || dist(b.x, b.y, cx, cy) > R) continue;
    if (b.type === 'hall') damageBuilding(b, 70, 'collapsed in an earthquake');
    else if (rand() < 0.4) damageBuilding(b, 9999, 'collapsed');
  }
  hurtUnitsNear(cx, cy, R, 8, 'killed in an earthquake');
  powers.shake = Math.max(powers.shake, 22);
}

function unitsInBrush(x, y, fn) {
  const r = brushRadius() + 0.5, shape = BRUSH_SHAPES[state.brushShape];
  for (const u of life.units) if (!u.dead && shape.dist(u.x - x, u.y - y) <= r) fn(u);
}

function sprinkle(kind, x, y, count, dur) {
  const r = brushRadius();
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * r;
    addEffect(kind, x + Math.cos(a) * d, y + Math.sin(a) * d, dur * (0.7 + rand() * 0.6), {});
  }
}

function fireBrush(x, y) {
  forEachInBrush(Math.floor(x), Math.floor(y), (tx, ty) => { if (rand() < 0.35) ignite(tx, ty); });
}

function rainOn(tx, ty) {
  const i = ty * state.W + tx, t = state.tiles[i];
  if (powers.fire[i]) extinguish(i);
  if (t === T.LAVA && rand() < 0.3) setTile(tx, ty, T.MOUNTAIN);
  else if (t === T.ASH && rand() < 0.25) setTile(tx, ty, localGround(tx, ty));
  else if (t === T.DESERT && rand() < 0.03) setTile(tx, ty, T.SAVANNA);    // rain greens the desert
  else if (isGround(t) && BIOMES[biomeOf(t)].tree !== null && rand() < 0.01) setTile(tx, ty, BIOMES[biomeOf(t)].tree);
}

function rain(x, y) {
  forEachInBrush(Math.floor(x), Math.floor(y), rainOn);
  sprinkle('drop', x, y, 4 + state.brush * 2, 0.35);
}

// acid burns plants down to ash and melts ice
function acidOn(tx, ty) {
  const t = state.tiles[ty * state.W + tx];
  if (t === T.ICE) setTile(tx, ty, T.SHALLOW);
  else if (isPlant(t) && rand() < 0.4) setTile(tx, ty, T.ASH);
}

// ---------- Geysers ----------
// Placed vents that erupt every so often. Water geysers rain on the land
// around them; acid geysers burn it and anyone standing there.
const GEYSER_RANGE = 7;
const CLOUD_R = 5;   // cloud radius, used by the Weather powers below

function placeGeyser(acid) {
  return (x, y) => {
    const tx = Math.floor(x), ty = Math.floor(y);
    if (!inBounds(tx, ty)) return;
    const t = state.tiles[ty * state.W + tx];
    if (isWater(t) || t === T.LAVA) { toast('A geyser needs solid ground'); return; }
    if (life.geysers.some(g => dist(g.x, g.y, tx, ty) < 3)) return;
    life.geysers.push({ x: tx, y: ty, acid, cd: 10, erupt: 0 });
    addEffect('flash', tx + 0.5, ty + 0.5, 0.3, { r: 2 });
  };
}

function removeGeysersNear(x, y, r) {
  life.geysers = life.geysers.filter(g => dist(g.x + 0.5, g.y + 0.5, x, y) > r);
}

function geyserTick() {
  life.geysers = life.geysers.filter(g => {
    const t = state.tiles[g.y * state.W + g.x];
    return !isWater(t) && t !== T.LAVA;
  });
  for (const g of life.geysers) {
    if (g.erupt <= 0) {
      if (--g.cd > 0) continue;
      g.erupt = 8 + ((rand() * 8) | 0);
      g.cd = 30 + ((rand() * 50) | 0);
    }
    g.erupt--;
    const cx = g.x + 0.5, cy = g.y + 0.5;
    for (let n = 0; n < 6; n++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * GEYSER_RANGE;
      const lx = cx + Math.cos(a) * d, ly = cy + Math.sin(a) * d;
      addEffect('jet', cx, cy - 0.5, 0.6 + rand() * 0.4,
        { x2: lx, y2: ly, h: 4 + rand() * 6, color: g.acid ? '#9cff3a' : '#9cd8ff' });
      const tx = Math.floor(lx), ty = Math.floor(ly);
      if (!inBounds(tx, ty)) continue;
      if (g.acid) acidOn(tx, ty);
      else rainOn(tx, ty);
    }
    if (g.acid) {
      hurtUnitsNear(cx, cy, GEYSER_RANGE, 1.5, 'acid');
      hitBuildingsNear(cx, cy, GEYSER_RANGE, 1, 'dissolved in acid');
    }
  }
}

function plague(x, y) {
  unitsInBrush(x, y, u => { if (!u.immune && !u.sick) u.sick = 1; });
  sprinkle('puff', x, y, 6 + state.brush, 0.7);
}

function blessing(x, y) {
  unitsInBrush(x, y, u => {
    u.blessed = true;
    u.cursed = false;
    u.sick = 0;
    u.mad = 0;
    u.hp = maxHp(u);
  });
  // blessing purifies corrupted land
  forEachInBrush(Math.floor(x), Math.floor(y), (tx, ty) => {
    const t = state.tiles[ty * state.W + tx];
    if (biomeOf(t) === 'corrupt' && rand() < 0.3) setTile(tx, ty, inBiome(t, 'grassland'));
  });
  sprinkle('spark', x, y, 6 + state.brush, 0.8);
}

function curse(x, y) {
  unitsInBrush(x, y, u => {
    u.cursed = true;
    u.blessed = false;
    u.hp = Math.min(u.hp, maxHp(u));
  });
  sprinkle('hex', x, y, 6 + state.brush, 0.8);
}

function shield(x, y) {
  unitsInBrush(x, y, u => { u.shield = 2 * YEAR; });
  sprinkle('ward', x, y, 6 + state.brush, 0.8);
}

// heals the sick, the mad and the wounded
function cure(x, y) {
  unitsInBrush(x, y, u => {
    if (u.sick) u.immune = true;
    u.sick = 0;
    u.mad = 0;
    u.hp = maxHp(u);
  });
  sprinkle('puff', x, y, 6 + state.brush, 0.7);
}

// wipes every special effect, good or bad
function clearEffects(x, y) {
  unitsInBrush(x, y, u => {
    u.blessed = u.cursed = u.immune = false;
    u.sick = u.mad = u.shield = 0;
    u.hp = Math.min(u.hp, maxHp(u));
  });
  sprinkle('ward', x, y, 4 + state.brush, 0.5);
}

// Forgetting powers: each wipes one part of who a creature is
const FORGET = {
  language: u => { u.language = 0; },
  culture:  u => { u.culture = 0; },
  religion: u => { u.religion = 0; },
  family:   u => { u.clan = ''; u.parents = []; },
};

function forget(parts) {
  return (x, y) => {
    unitsInBrush(x, y, u => {
      if (u.traits && u.traits.includes('strongMinded')) return;   // a strong mind keeps its memories
      for (const p of parts) FORGET[p](u);
      if (parts.length > 1) { u.lastHitBy = 0; u.warTarget = 0; }   // total amnesia forgets grudges too
    });
    sprinkle('mist', x, y, 6 + state.brush, 0.8);
  };
}

function madness(x, y) {
  unitsInBrush(x, y, u => { if (!u.blessed && !(u.traits && u.traits.includes('strongMinded'))) u.mad = 2 * YEAR; });
  sprinkle('rage', x, y, 6 + state.brush, 0.7);
}

// repeat = ms between uses while the button is held (0 = once per click)
const POWERS = {
  goo:        { label: '🦠 Grey Goo',   radius: 2, repeat: 0, use: startGoo },
  lightning:  { label: '⚡ Lightning',  radius: 1.5, repeat: 120, use: lightning },
  fire:       { label: '🔥 Fire',       brush: true, repeat: 60, use: fireBrush },
  rain:       { label: '🌧️ Rain',       brush: true, repeat: 60, use: rain },
  meteor:     { label: '☄️ Meteor',     radius: 5, repeat: 400, use: meteor },
  bomb:       { label: '💣 Bomb',       radius: 4, repeat: 250, use: bomb },
  nuke:       { label: '☢️ Nuke',       radius: 16, repeat: 0, use: nuke },
  earthquake: { label: '🌋 Earthquake', radius: 18, repeat: 0, use: earthquake },
  plague:     { label: '☣️ Plague',     brush: true, repeat: 150, use: plague },
  blessing:   { label: '✨ Blessing',   brush: true, repeat: 150, use: blessing },
  madness:    { label: '😡 Madness',    brush: true, repeat: 150, use: madness },
  curse:      { label: '💀 Curse',      brush: true, repeat: 150, use: curse },
  shield:     { label: '🛡️ Shield',     brush: true, repeat: 150, use: shield },
  cure:       { label: '💊 Cure',       brush: true, repeat: 150, use: cure },
  clear:      { label: '🧹 Clear Effects', brush: true, repeat: 150, use: clearEffects },
  forgetLanguage: { label: '🔇 Forget Language', brush: true, repeat: 150, use: forget(['language']) },
  forgetCulture:  { label: '🎭 Forget Culture',  brush: true, repeat: 150, use: forget(['culture']) },
  forgetReligion: { label: '🕯️ Forget Religion', brush: true, repeat: 150, use: forget(['religion']) },
  forgetFamily:   { label: '👪 Forget Family',   brush: true, repeat: 150, use: forget(['family']) },
  amnesia:        { label: '🌀 Total Amnesia',   brush: true, repeat: 150, use: forget(['language', 'culture', 'religion', 'family']) },
  monolith:       { label: '🗿 Monolith', radius: 14, repeat: 0, use: placeMonolith },
  geyser:         { label: '⛲ Geyser',      radius: GEYSER_RANGE, repeat: 0, use: placeGeyser(false) },
  acidGeyser:     { label: '🧪 Acid Geyser', radius: GEYSER_RANGE, repeat: 0, use: placeGeyser(true) },
  rainCloud:      { label: '☁️ Rain Cloud',  radius: CLOUD_R, repeat: 400, use: placeCloud('rain') },
  stormCloud:     { label: '⛈️ Storm Cloud', radius: CLOUD_R, repeat: 400, use: placeCloud('storm') },
  acidCloud:      { label: '🟢 Acid Cloud',  radius: CLOUD_R, repeat: 400, use: placeCloud('acid') },
  rageCloud:      { label: '😡 Rage Cloud',  radius: CLOUD_R, repeat: 400, use: placeCloud('rage') },
  lifeCloud:      { label: '🐣 Life Cloud',  radius: CLOUD_R, repeat: 400, use: placeCloud('life') },
};

function usePower(id, x, y) {
  POWERS[id].use(x, y);
}

// ---------- Clouds ----------
// Clouds drift with the wind for a couple of years, acting on what's under them.
const CLOUDS = {
  rain:  { color: '#d6dce6', drop: '#9cc8ff' },
  storm: { color: '#5c6170', drop: '#9cc8ff' },
  acid:  { color: '#a9d36a', drop: '#9cff3a' },
  rage:  { color: '#d65a5a', drop: '#ff3b3b' },
  life:  { color: '#fff1c4', drop: '#ffd34d' },
};

function placeCloud(kind) {
  return (x, y) => {
    const puffs = [];
    for (let i = 0; i < 7; i++) {
      const a = rand() * Math.PI * 2, d = rand() * CLOUD_R * 0.6;
      puffs.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.5, r: 1.8 + rand() * 1.6 });
    }
    powers.clouds.push({ kind, x, y, age: 0, life: 2 * YEAR + rand() * YEAR, puffs, speed: 0.03 + rand() * 0.03 });
  };
}

// anything that lives somewhere: animals, people, monsters and magic folk
function randomBeing() {
  const list = Object.keys(RACES).filter(k => !RACES[k].sapientOf && !RACES[k].hidden && k !== 'dragon');
  return pick(list);
}

function cloudPoint(c) {
  const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * CLOUD_R;
  return [c.x + Math.cos(a) * d, c.y + Math.sin(a) * d];
}

function cloudTick() {
  powers.wind += (rand() - 0.5) * 0.02;
  for (const c of powers.clouds) {
    c.age++;
    c.x += Math.cos(powers.wind) * c.speed;
    c.y += Math.sin(powers.wind) * c.speed;
    const d = CLOUDS[c.kind];
    for (let n = 0; n < 2; n++) {
      const [x, y] = cloudPoint(c);
      addEffect('drop', x, y, 0.35, { color: d.drop });
    }
    const [x, y] = cloudPoint(c), tx = Math.floor(x), ty = Math.floor(y);
    const inside = inBounds(tx, ty);
    switch (c.kind) {
      case 'rain':
        for (let n = 0; n < 4; n++) { const [px, py] = cloudPoint(c); if (inBounds(px | 0, py | 0)) rainOn(px | 0, py | 0); }
        break;
      case 'storm':
        for (let n = 0; n < 4; n++) { const [px, py] = cloudPoint(c); if (inBounds(px | 0, py | 0)) rainOn(px | 0, py | 0); }
        if (inside && rand() < 0.03) lightning(x, y);
        break;
      case 'acid':
        for (let n = 0; n < 3; n++) { const [px, py] = cloudPoint(c); if (inBounds(px | 0, py | 0)) acidOn(px | 0, py | 0); }
        hurtUnitsNear(c.x, c.y, CLOUD_R, 0.6, 'acid rain');
        hitBuildingsNear(c.x, c.y, CLOUD_R, 0.4, 'dissolved in acid rain');
        break;
      case 'rage':
        for (const u of life.units) if (!u.dead && !u.blessed && !u.mad && dist(u.x, u.y, c.x, c.y) <= CLOUD_R) u.mad = YEAR;
        break;
      case 'life':
        if (inside && rand() < 0.006) {
          const race = randomBeing(), r = RACES[race];
          if ((walkable(x, y) || r.flies) && spawnUnit(race, x, y, r.civ ? 18 + rand() * 6 : 2)) addEffect('spark', x, y - 0.5, 1, {});
        }
        break;
      default:
        extraCloudTick(c, x, y, tx, ty, inside);   // thunder, hell, lava, ash, magic, snow (disasters.js)
    }
  }
  powers.clouds = powers.clouds.filter(c => c.age < c.life &&
    c.x > -CLOUD_R * 2 && c.y > -CLOUD_R * 2 && c.x < state.W + CLOUD_R * 2 && c.y < state.H + CLOUD_R * 2);
}

function drawClouds(ox, oy, z) {
  for (const c of powers.clouds) {
    const fade = Math.min(1, c.age / 20, (c.life - c.age) / 40);
    const color = CLOUDS[c.kind].color;
    // shadow on the ground, cloud floating above it
    ctx.globalAlpha = 0.18 * fade;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(ox + c.x * z, oy + c.y * z, CLOUD_R * z, CLOUD_R * 0.55 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.85 * fade;
    ctx.fillStyle = color;
    for (const p of c.puffs) {
      ctx.beginPath();
      ctx.arc(ox + (c.x + p.dx) * z, oy + (c.y + p.dy - 6) * z, p.r * z, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ---------- Effects ----------
function addEffect(kind, x, y, dur, extra) {
  powers.effects.push({ kind, x, y, t: 0, dur, ...extra });
}

function updateEffects(dt) {
  const s = dt / 1000;
  for (const e of powers.effects) {
    e.t += s;
    if (e.t >= e.dur && e.onEnd) { e.onEnd(); e.onEnd = null; }
  }
  powers.effects = powers.effects.filter(e => e.t < e.dur);
  powers.shake *= Math.pow(0.02, s);   // fades out over about a second
  if (powers.shake < 0.3) powers.shake = 0;
}

const FIRE_COLORS = ['#ff3b1f', '#ff7a1f', '#ffb21f', '#ffd34d'];

function drawPowers(ox, oy, z) {
  const { W } = state;
  const vx0 = -ox / z - 1, vy0 = -oy / z - 1;
  const vx1 = (view.width - ox) / z + 1, vy1 = (view.height - oy) / z + 1;

  // flames
  for (const i of powers.burning) {
    const x = i % W, y = (i / W) | 0;
    if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
    ctx.fillStyle = FIRE_COLORS[(rand() * FIRE_COLORS.length) | 0];
    const inset = z * 0.15 * rand();
    ctx.fillRect(ox + x * z + inset, oy + y * z + inset, z - inset * 2, z - inset * 2);
    if (z >= 6 && rand() < 0.5) {
      ctx.fillStyle = '#ffe9a0';
      ctx.fillRect(ox + (x + 0.35) * z, oy + (y + 0.1) * z, z * 0.3, z * 0.3);
    }
  }

  for (const e of powers.effects) {
    const p = Math.max(0, Math.min(1, e.t / e.dur));
    const sx = ox + e.x * z, sy = oy + e.y * z;
    switch (e.kind) {
      case 'bolt': {
        ctx.globalAlpha = 1 - p;
        ctx.lineJoin = 'round';
        for (const [w, color] of [[6, 'rgba(160,190,255,0.5)'], [2, '#ffffff']]) {
          ctx.strokeStyle = color;
          ctx.lineWidth = w * dpr;
          ctx.beginPath();
          e.pts.forEach(([x, y], k) => (k ? ctx.lineTo : ctx.moveTo).call(ctx, ox + x * z, oy + y * z));
          ctx.stroke();
        }
        break;
      }
      case 'beam': {
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = (e.w || 2) * dpr;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ox + e.x2 * z, oy + e.y2 * z);
        ctx.stroke();
        break;
      }
      case 'flash':
        ctx.globalAlpha = 0.8 * (1 - p);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx, sy, e.r * z * (0.5 + p), 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'explosion': {
        const r = e.r * z * (0.3 + 0.7 * p);
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = p < 0.3 ? '#fff3b0' : '#ff7a1f';
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffd34d';
        ctx.lineWidth = 3 * dpr;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 1.25, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'meteor': {
        const fx = e.x + 25 * (1 - p), fy = e.y - 35 * (1 - p);
        const hx = ox + fx * z, hy = oy + fy * z;
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,140,40,0.7)';
        ctx.lineWidth = 3 * dpr;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx + 6 * z, hy - 8.4 * z);
        ctx.stroke();
        ctx.fillStyle = '#ffd34d';
        ctx.beginPath();
        ctx.arc(hx, hy, Math.max(3 * dpr, 1.2 * z), 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'mushroom': {
        const rise = p * 14;
        ctx.globalAlpha = 0.85 * (1 - p * p);
        ctx.fillStyle = '#6b5a4e';
        ctx.fillRect(sx - 1.5 * z, sy - rise * z, 3 * z, rise * z);
        ctx.fillStyle = p < 0.4 ? '#ff8a3d' : '#8a7a6e';
        ctx.beginPath();
        ctx.ellipse(sx, sy - rise * z, (5 + p * 6) * z, (3 + p * 3) * z, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'pulse':
        ctx.globalAlpha = 0.7 * (1 - p);
        ctx.strokeStyle = '#7fe0ff';
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.arc(sx, sy, e.r * z * p, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'jet': {
        // a droplet arcing from the vent to where it lands
        const jx = e.x + (e.x2 - e.x) * p, jy = e.y + (e.y2 - e.y) * p - e.h * 4 * p * (1 - p);
        const size = Math.max(2 * dpr, z * 0.3);
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = e.color;
        ctx.fillRect(ox + jx * z - size / 2, oy + jy * z - size / 2, size, size);
        break;
      }
      case 'drop':
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = e.color || '#9cc8ff';
        ctx.lineWidth = Math.max(1, dpr);
        ctx.beginPath();
        ctx.moveTo(sx, sy - (1 - p) * 3 * z);
        ctx.lineTo(sx, sy - (1 - p) * 3 * z + 0.8 * z);
        ctx.stroke();
        break;
      case 'spark':
      case 'puff':
      case 'rage':
      case 'hex':
      case 'ward':
      case 'mist':
      case 'heart': {
        const color = { spark: '#ffd34d', puff: '#7ee05a', rage: '#ff3b3b', hex: '#a050e0', ward: '#7fe0ff', mist: '#c8c8e0', heart: '#ff7ab0' }[e.kind];
        const size = Math.max(2 * dpr, z * 0.35);
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = color;
        ctx.fillRect(sx - size / 2, sy - p * 2 * z - size / 2, size, size);
        break;
      }
    }
  }
  ctx.globalAlpha = 1;
  drawClouds(ox, oy, z);
}

const POWER_GROUPS = {
  'Destruction': ['lightning', 'fire', 'meteor', 'bomb', 'nuke', 'earthquake', 'goo'],
  'Nature': ['rain', 'plague', 'geyser', 'acidGeyser'],
  'Weather': ['rainCloud', 'stormCloud', 'acidCloud', 'rageCloud', 'lifeCloud'],
  'Blessings & Curses': ['blessing', 'curse', 'shield', 'cure', 'madness', 'clear'],
  'Ancient': ['monolith'],
  'Mind': ['forgetLanguage', 'forgetCulture', 'forgetReligion', 'forgetFamily', 'amnesia'],
};

// tools whose area follows the brush size and shape
function usesBrush(tool) {
  return tool.startsWith('power:') ? !!POWERS[tool.slice(6)].brush : isBrushTool(tool);
}

function toolRadius(tool) {
  if (tool.startsWith('power:')) {
    const p = POWERS[tool.slice(6)];
    return p.brush ? brushRadius() : p.radius;
  }
  return isBrushTool(tool) ? brushRadius() : 0;
}
