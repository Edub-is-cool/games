'use strict';

// Cities: special buildings, roads, building styles per race and tier,
// books, money (taxes, markets, trade ships), ruins, gear materials with named
// weapons and kill counts, and city walls. Loaded after traits2.js.

// ---------- Roads ----------
const ROAD = addTile('ROAD', { name: 'Road', color: 0xa08a64, group: 'Terrain', dots: [0.15, 0x8a7450] });
const onRoad = u => state.tiles[Math.floor(u.y) * state.W + Math.floor(u.x)] === T.ROAD;

// a straight road from a building to the hall, over open ground only
function layRoad(x0, y0, x1, y1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  for (let k = 0; k <= n; k++) {
    const x = Math.round(x0 + ((x1 - x0) * k) / n), y = Math.round(y0 + ((y1 - y0) * k) / n);
    if (!inBounds(x, y)) continue;
    const i = y * state.W + x, t = state.tiles[i];
    if (!life.bmap[i] && (isGround(t) || t === T.SAND || t === T.ASH)) setTile(x, y, T.ROAD);
  }
}

// ---------- Special buildings ----------
// need: what the village must have; cost: what it pays; size: footprint
const CITY_BUILDINGS = {
  bonfire:    { name: 'Bonfire',    size: [1, 1], need: v => true, cost: {} },
  well:       { name: 'Well',       size: [2, 2], need: v => v.pop >= 8, cost: { wood: 6 } },
  windmill:   { name: 'Windmill',   size: [2, 2], need: v => v.pop >= 10, cost: { wood: 8 } },
  watchtower: { name: 'Watchtower', size: [1, 1], need: v => v.pop >= 12, cost: { wood: 8 }, max: 2 },
  barracks:   { name: 'Barracks',   size: [3, 2], need: v => v.pop >= 15, cost: { wood: 10 } },
  temple:     { name: 'Temple',     size: [3, 3], need: v => v.pop >= 12 && !!v.religion, cost: { wood: 6, stone: 6 } },
  market:     { name: 'Market',     size: [3, 2], need: v => v.pop >= 18, cost: { wood: 10 } },
  library:    { name: 'Library',    size: [2, 2], need: v => v.pop >= 20, cost: { wood: 8, stone: 4 } },
  statue:     { name: 'Statue',     size: [1, 1], need: v => (v.gold || 0) >= 15, cost: { stone: 6, gold: 10 } },
};

function fits(v, x, y, w, h) {
  for (let dy = -1; dy <= h; dy++) {
    for (let dx = -1; dx <= w; dx++) {
      const tx = x + dx, ty = y + dy;
      if (!inBounds(tx, ty)) return false;
      const i = ty * state.W + tx;
      if (life.bmap[i]) return false;
      const edge = dx < 0 || dy < 0 || dx >= w || dy >= h;
      if (!edge && (life.owner[i] !== v.id || !buildable(state.tiles[i]))) return false;
    }
  }
  return true;
}

function findSpot(v, w, h) {
  for (let i = 0; i < 50; i++) {
    const a = rand() * Math.PI * 2, r = 2.5 + rand() * Math.max(1, v.radius - 2);
    const x = Math.floor(v.x + Math.cos(a) * r), y = Math.floor(v.y + Math.sin(a) * r);
    if (fits(v, x, y, w, h)) return { x, y };
  }
  return null;
}

const countOf = (v, type) => { let n = 0; for (const b of life.buildings.values()) if (b.village === v.id && b.type === type) n++; return n; };

// Runs with each village update: tiers, new buildings, building effects, money, walls.
function cityTick(v) {
  v.tier = v.pop < 10 ? 1 : v.pop < 25 ? 2 : 3;
  v.has = {};
  for (const b of life.buildings.values()) if (b.village === v.id) v.has[b.type] = (v.has[b.type] || 0) + 1;

  // build something new now and then
  if (!v.has.bonfire || rand() < 0.25) {
    for (const [type, spec] of Object.entries(CITY_BUILDINGS)) {
      if ((v.has[type] || 0) >= (spec.max || 1) || !spec.need(v)) continue;
      if (Object.entries(spec.cost).some(([res, n]) => (v[res] || 0) < n)) continue;
      const spot = findSpot(v, spec.size[0], spec.size[1]);
      if (!spot) continue;
      for (const [res, n] of Object.entries(spec.cost)) v[res] -= n;
      const b = addBuilding(v, type, spot.x, spot.y, spec.size[0], spec.size[1]);
      const hall = life.buildings.get(v.hall);
      if (hall && type !== 'bonfire') layRoad(spot.x, spot.y + spec.size[1], hall.x + 1, hall.y + 3);
      if (b && ['temple', 'library', 'market', 'barracks'].includes(type)) chronicle(`🏛 ${v.name} built a ${spec.name.toLowerCase()}`);
      break;
    }
  }
  if ((v.has.house || 0) > 0 && rand() < 0.05) {
    // houses get a road to the hall too
    const h = [...life.buildings.values()].find(b => b.village === v.id && b.type === 'house' && !b.road);
    const hall = life.buildings.get(v.hall);
    if (h && hall) { h.road = true; layRoad(h.x, h.y + 2, hall.x + 1, hall.y + 3); }
  }

  // money: people pay taxes, markets trade, the kingdom keeps a treasury
  const k = life.kingdoms.get(v.kingdom);
  v.gold = (v.gold || 0) + v.adults * 0.02 + (v.has.market ? 0.3 : 0);
  if (k) { const tax = v.gold * 0.01; v.gold -= tax; k.gold = (k.gold || 0) + tax; }

  // building effects
  const lift = (v.has.well ? 1 : 0) + (v.has.statue ? 2 : 0) + (v.has.temple ? 1 : 0);
  if (lift && rand() < 0.3) { const u = pickResident(v); if (u) u.happy = Math.min(100, (u.happy ?? 60) + lift); }
  if (v.has.barracks) { const u = pickResident(v, o => o.role === 'warrior'); if (u) u.xp = (u.xp || 0) + 1; }
  if (v.has.temple && v.religion && rand() < 0.01) {
    const o = nearestVillage(v.x, v.y, 40, o => o !== v && o.religion !== v.religion);
    if (o && rand() < 0.5) setReligion(o, v.religion);
  }
  if (v.has.library && rand() < 0.004) writeBook(v);
  if (v.has.library && life.books.length && rand() < 0.02) readBook(v);
  if (v.has.market && v.has.dock && rand() < 0.01) sendTrader(v);
  if (v.has.well) {
    for (const b of life.buildings.values()) {
      if (b.village !== v.id || b.type !== 'well') continue;
      forEachTile(b.x + 1, b.y + 1, 5, (x, y) => { const i = y * state.W + x; if (powers.fire[i] && rand() < 0.3) extinguish(i); });
    }
  }
  buildWalls(v);
}

// watchtowers shoot arrows at enemies and monsters
function towerTick() {
  if (state.tick % 15) return;
  for (const b of life.buildings.values()) {
    if (b.type !== 'watchtower') continue;
    const v = life.villages.get(b.village);
    if (!v) continue;
    const cx = b.x + 0.5, cy = b.y;
    const foe = nearest(cx, cy, 7, o => !o.dead && (atWar(v.kingdom, kingdomOf(o)) || RACES[o.race].monster || (RACES[o.race].prey && RACES[o.race].prey.includes(v.race))));
    if (!foe) continue;
    addEffect('beam', cx, cy - 1.5, 0.15, { x2: foe.x, y2: foe.y - 0.4, color: '#e8e0c8', w: 1 });
    hurt(foe, 8, `shot from the watchtower of ${v.name}`);
  }
}

// ---------- City walls ----------
// Big stone-rich cities ring themselves with walls, leaving gates. Their own
// people walk through them (see creatures.js moveToward); enemies must break them.
function buildWalls(v) {
  if (v.tier < 3 || (v.stone || 0) < 12 || rand() > 0.3) return;
  const k = life.kingdoms.get(v.kingdom);
  if (!(k && Object.keys(k.wars).length) && rand() > 0.2) return;
  const r = v.radius + 0.5;
  for (let n = 0; n < 4; n++) {
    const a = rand() * Math.PI * 2;
    const x = Math.floor(v.x + Math.cos(a) * r), y = Math.floor(v.y + Math.sin(a) * r);
    if (!inBounds(x, y)) continue;
    // gates every few tiles around the ring
    if (Math.floor((a * r) / 1.5) % 4 === 0) continue;
    const i = y * state.W + x, t = state.tiles[i];
    if (life.bmap[i] || isWater(t) || TILES[t].wall || t === T.ROAD || t === T.LAVA) continue;
    setTile(x, y, (v.stone || 0) >= 20 ? T.WALL_STONE : T.WALL_WOOD);
    life.owner[i] = v.id;
    v.stone -= 1;
  }
}

// can this creature pass a wall here? only its own kingdom's
function ownWall(u, x, y) {
  const tx = Math.floor(x), ty = Math.floor(y);
  if (!inBounds(tx, ty)) return false;
  const i = ty * state.W + tx;
  if (!TILES[state.tiles[i]].wall || !life.owner[i]) return false;
  const v = life.villages.get(life.owner[i]);
  return !!v && v.kingdom && v.kingdom === kingdomOf(u);
}

// ---------- Books ----------
const BOOK_IDEAS = ['wise', 'honest', 'peaceful', 'ambitious', 'content', 'strongMinded', 'greedy', 'paranoid', 'pacifist', 'bloodlust'];
const BOOK_KINDS = ['Tales of', 'The Book of', 'Songs of', 'On', 'The Lost', 'Chronicles of', 'Secrets of', 'The Way of'];

function writeBook(v) {
  const author = pickResident(v, o => isAdult(o) && RACES[o.race].civ);
  if (!author) return;
  const lang = life.languages.get(author.language) || languageOf(life.kingdoms.get(v.kingdom));
  const idea = (author.traits || []).find(t => BOOK_IDEAS.includes(t)) || pick(BOOK_IDEAS);
  const book = {
    id: life.nextId++, title: `${pick(BOOK_KINDS)} ${capitalize(pick(lang.words))}`, author: author.name,
    village: v.id, lang: lang.id, idea, year: yearOf(state.tick),
  };
  life.books.push(book);
  if (life.books.length > 300) life.books.shift();
  chronicle(`📖 ${author.name} of ${v.name} wrote "${book.title}"`);
}

// readers pick up the book's idea as a trait
function readBook(v) {
  const book = pick(life.books.filter(b => b.village === v.id || rand() < 0.2));
  const reader = book && pickResident(v, o => isAdult(o) && !has(o, book.idea));
  if (reader && rand() < 0.5) addTrait(reader, book.idea);
}

// ---------- Trade ships ----------
function sendTrader(v) {
  const o = nearestVillage(v.x, v.y, 140, o => o !== v && o.has && o.has.dock && !atWar(v.kingdom, o.kingdom));
  if (!o) return;
  const k = life.kingdoms.get(v.kingdom);
  life.traders.push({ x: v.x, y: v.y, from: v.id, to: o.id, tx: o.x, ty: o.y, color: k ? k.color : '#ffffff' });
}

function traderTick() {
  for (const t of life.traders) {
    const d = dist(t.x, t.y, t.tx, t.ty);
    if (d < 1) {
      t.done = true;
      for (const id of [t.from, t.to]) { const v = life.villages.get(id); if (v) { v.gold = (v.gold || 0) + 15; v.food += 5; } }
      for (let k = 0; k < 6; k++) addEffect('spark', t.x + (rand() - 0.5) * 2, t.y - rand(), 0.8, {});
      continue;
    }
    t.x += ((t.tx - t.x) / d) * 0.25;
    t.y += ((t.ty - t.y) / d) * 0.25;
  }
  life.traders = life.traders.filter(t => !t.done);
}

// ---------- Ruins ----------
function addRuin(b) {
  if (!state.tiles) return;
  life.ruins.push({ x: b.x, y: b.y, w: b.w, h: b.h, t: state.tick });
}

function ruinTick() {
  if (state.tick % 60) return;
  life.ruins = life.ruins.filter(r => state.tick - r.t < 10 * YEAR);
}

// ---------- Materials and named gear ----------
const MATERIALS = {
  copper:     { name: 'Copper', mult: 1 },
  bronze:     { name: 'Bronze', mult: 1.15 },
  iron:       { name: 'Iron', mult: 1.3 },
  silver:     { name: 'Silver', mult: 1.4 },
  mythril:    { name: 'Mythril', mult: 1.7 },
  adamantine: { name: 'Adamantine', mult: 2 },
};
const matMult = (u, slot) => MATERIALS[gearOf(u)[slot + 'Mat'] || 'copper'].mult;

function rollMaterial(lucky) {
  const r = rand() * (lucky ? 1 : 0.8);
  return r < 0.3 ? 'copper' : r < 0.55 ? 'bronze' : r < 0.75 ? 'iron' : r < 0.88 ? 'silver' : r < 0.96 ? 'mythril' : 'adamantine';
}

// the smithy uses the best metal the village has mined
function onCrafted(v, u, slot) {
  if (slot === 'tool') return;
  const metals = v.metals || {};
  const mat = ['adamantine', 'mythril', 'silver', 'iron'].find(m => metals[m] > 0) || ((v.stone || 0) > 10 ? 'bronze' : 'copper');
  if (metals[mat]) metals[mat]--;
  gearOf(u)[slot + 'Mat'] = mat;
  // fine weapons get a name
  if (slot === 'weapon' && MATERIALS[mat].mult >= 1.4) {
    const lang = life.languages.get(u.language);
    gearOf(u).weaponName = capitalize(lang ? pick(lang.words) : syllable()) + pick(['bane', 'fang', 'bite', 'song', 'fury', 'edge', 'brand', 'thorn']);
    chronicle(`⚒ The smiths of ${v.name} forged ${gearOf(u).weaponName}, a ${MATERIALS[mat].name.toLowerCase()} ${GEAR.weapon[gearOf(u).weapon].name.toLowerCase()}`);
  }
}

const _onKill = onKill;
onKill = function (killer, victim) {
  _onKill(killer, victim);
  if (killer && gearOf(killer).weapon !== 'none') gearOf(killer).weaponKills = (gearOf(killer).weaponKills || 0) + 1;
};

const _unitExtraRows = unitExtraRows;
unitExtraRows = function (u) {
  const rows = _unitExtraRows(u);
  const g = gearOf(u);
  if (g.weapon !== 'none') {
    const w = GEAR.weapon[g.weapon];
    rows.unshift(['Weapon', `${MATERIALS[g.weaponMat || 'copper'].name} ${w.name}${g.weaponName ? ` "${g.weaponName}"` : ''}${g.weaponKills ? ` · ${g.weaponKills} kills` : ''}`]);
  }
  if (g.armor !== 'none') rows.unshift(['Armor', `${MATERIALS[g.armorMat || 'copper'].name} ${GEAR.armor[g.armor].name}`]);
  return rows;
};

const _speedMult = speedMult;
speedMult = u => _speedMult(u) * (onRoad(u) ? 1.25 : 1);

// ---------- Building looks: race styles and tiers ----------
// tier 1 huts of straw, tier 2 the race's own colors, tier 3 stone
const HOUSE_STYLES = {
  human: ['...rr...', '..rrrr..', '.rrrrrr.', 'rrrrrrrr', '.wwwwww.', '.wkwwkw.', '.wwddww.', '.wwddww.'],
  elf: ['..rrrr..', '.rrrrrr.', 'rrrrrrrr', '.rwkwwr.', '..wwww..', '..wddw..', '..wddw..', '.nnnnnn.'],
  orc: ['...rr...', '..rrrr..', '..rrrr..', '.rrrrrr.', '.rrddrr.', 'rrrddrrr', 'rrrddrrr', 'r.r..r.r'],
  dwarf: ['........', '..wwww..', '.wwwwww.', 'wwwkkwww', 'wwwwwwww', 'wwwddwww', 'wwwddwww', 'wwwddwww'],
};
const CITY_ART = {
  bonfire: ['.y.', 'oyo', 'non'],
  well: ['.nnnn.', 'n....n', 'nbbbbn', 'wbbbbw', 'wwwwww', '.wwww.'],
  windmill: ['n.....n', '.n...n.', '..nwn..', '...w...', '..nwn..', '.nwwwn.', '.wwdww.', '.wwdww.'],
  watchtower: ['rrrr', 'wkkw', 'wwww', '.ww.', '.ww.', '.ww.', '.ww.', 'wwww'],
  barracks: ['rrrrrrrrrrrr', 'rrrrrrrrrrrr', '.wwwwwwwwww.', '.wkwwwwwwkw.', '.wwwwddwwww.', '.wwwwddwwww.'],
  temple: ['.....f.....', '....fff....', '...rrrrr...', '..rrrrrrr..', '.rrrrrrrrr.', 'rrrrrrrrrrr', '.w.w.w.w.w.', '.w.w.w.w.w.', '.w.wwdww.w.', 'wwwwwddwwww'],
  market: ['rwrwrwrwrwrw', 'rwrwrwrwrwrw', '.n...nn...n.', '.n.y.nn.y.n.', '.nnnnnnnnnn.', '.n........n.'],
  library: ['..rrrr..', '.rrrrrr.', 'rrrrrrrr', '.wkwwkw.', '.wbbbbw.', '.wwddww.'],
  statue: ['.ss.', '.ss.', 'ssss', '.ss.', 'kkkk'],
};
const TIER_COLORS = { 1: { r: '#b8a050', w: '#8a6a4a' }, 3: { w: '#b8b4ac' } };

const _buildingSprite = buildingSprite;
buildingSprite = function (type, race, flag, flash, tier = 2, symbolColor) {
  const style = RACES[race].sapientOf ? 'human' : race;
  return cached(`b2|${type}|${race}|${flag}|${flash}|${tier}|${symbolColor || ''}`, () => {
    const r = RACES[race];
    const tc = TIER_COLORS[tier] || {};
    const pal = { r: tc.r || r.roof, w: tc.w || r.wall, d: '#3b2a1f', k: '#ffd76a', p: '#3a2f2a', f: symbolColor || flag,
      n: '#7a5532', o: '#f08a1a', y: '#ffe060', b: '#3f74c9', s: '#c8c4bc' };
    if (flash) pal.w = pal.r = '#ffffff';
    const art = type === 'house' ? (HOUSE_STYLES[style] || HOUSE_STYLES.human) : CITY_ART[type] || BUILDING_ART[type];
    return refineSprite(makeSprite(art, pal, false));
  });
};

// ---------- Tick & draw ----------
function citiesTick() {
  towerTick();
  traderTick();
  ruinTick();
}

function drawCities(ox, oy, z) {
  // ruins under everything else
  for (const r of life.ruins) {
    ctx.fillStyle = 'rgba(90,84,76,0.85)';
    for (let k = 0; k < r.w * r.h * 3; k++) {
      const px = r.x + hash2(r.x * 7 + k, r.y, 3) * r.w, py = r.y + hash2(r.y * 7 + k, r.x, 5) * r.h;
      ctx.fillRect(ox + px * z, oy + py * z, Math.max(1, z * 0.35), Math.max(1, z * 0.35));
    }
  }
  for (const t of life.traders) {
    const spr = boatSprite(t.color, t.tx < t.x, false), s = Math.max(1, Math.round(z / 4)) / spr.res;
    ctx.drawImage(spr, Math.round(ox + t.x * z - spr.width * s / 2), Math.round(oy + t.y * z - spr.height * s), spr.width * s, spr.height * s);
  }
}
