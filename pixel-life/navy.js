'use strict';

// Naval battles. Kingdoms at war build warships at their docks (6 wood, or 20
// gold from the treasury; up to two per docked city). Warships hunt enemy warships, enemy boats and
// enemy trade ships with cannon fire, shell enemy buildings near the shore,
// and patrol near home in peacetime. They're kept in saves (life.warships).

const WARSHIP_HP = 60, WARSHIP_RANGE = 6, WARSHIP_SIGHT = 26, WARSHIP_SPEED = 0.2;

const WARSHIP_ART = [
  '.....f......',
  '....ffd.....',
  '...fffd.f...',
  '..ffffd.ff..',
  '..ffffd.fff.',
  '......d.....',
  'hhhhhhhhhhhh',
  '.hkhkhkhkhh.',
  '..hhhhhhhh..',
];
function warshipSprite(sail, flip, flash) {
  return cached(`warship|${sail}|${flip}|${flash}`, () => {
    const pal = flash ? { f: '#fff', d: '#fff', h: '#fff', k: '#fff' } : { f: sail, d: '#3a2a1e', h: '#5a3a22', k: '#141414' };
    return refineSprite(makeSprite(WARSHIP_ART, pal, flip));
  });
}

// ---------- Building ----------
function buildWarships(v) {
  const k = life.kingdoms.get(v.kingdom);
  if (!k || !Object.keys(k.wars).length || !v.has || !v.has.dock) return;
  const byWood = (v.wood || 0) >= 6;
  if (!byWood && (k.gold || 0) < 20) return;
  const fleet = life.warships.filter(s => s.kid === k.id).length;
  if (fleet >= villagesOf(k.id).filter(o => o.has && o.has.dock).length * 2) return;
  const dock = [...life.buildings.values()].find(b => b.village === v.id && b.type === 'dock');
  if (!dock) return;
  for (let dy = -2; dy <= 3; dy++) for (let dx = -2; dx <= 3; dx++) {
    const x = dock.x + dx + 0.5, y = dock.y + dy + 0.5;
    if (!sailable(x, y)) continue;
    if (byWood) v.wood -= 6; else k.gold -= 20;
    life.warships.push({ id: life.nextId++, kid: k.id, home: v.id, x, y, hp: WARSHIP_HP, cd: 0, tx: x, ty: y, dir: 1, flash: 0 });
    if (fleet === 0) chronicle(`⚓ The ${k.name} launched its first warship from ${v.name}`);
    return;
  }
}

// ---------- Sailing and fighting ----------
function navyTick() {
  if (state.tick % 30 === 0) for (const v of life.villages.values()) buildWarships(v);
  for (const s of life.warships) {
    if (!life.kingdoms.has(s.kid) || s.hp <= 0) { sinkShip(s); continue; }
    if (s.cd > 0) s.cd--;
    if (s.flash > 0) s.flash--;
    if ((state.tick + s.id) % 2) continue;
    const foe = findNavalTarget(s);
    if (foe && foe.d <= WARSHIP_RANGE) { fireAt(s, foe); continue; }
    if (foe) { s.tx = foe.x; s.ty = foe.y; }
    else if (dist(s.x, s.y, s.tx, s.ty) < 1 || rand() < 0.01) patrol(s);
    sailToward(s);
  }
  life.warships = life.warships.filter(s => !s.sunk);
}

// the nearest enemy warship, boat or trade ship; else an enemy building near the shore
function findNavalTarget(s) {
  let best = null;
  const consider = (x, y, kind, ref) => {
    const d = dist(s.x, s.y, x, y);
    if (d < WARSHIP_SIGHT && (!best || d < best.d)) best = { x, y, d, kind, ref };
  };
  for (const o of life.warships) if (o !== s && !o.sunk && atWar(s.kid, o.kid)) consider(o.x, o.y, 'ship', o);
  for (const t of life.traders) {
    const from = life.villages.get(t.from);
    if (from && atWar(s.kid, from.kingdom)) consider(t.x, t.y, 'trader', t);
  }
  for (const u of life.units) if (u.boat && !u.dead && atWar(s.kid, kingdomOf(u))) consider(u.x, u.y, 'boat', u);
  if (best) return best;
  // nothing afloat: shell enemy buildings within cannon range
  for (const b of life.buildings.values()) {
    const v = life.villages.get(b.village);
    if (!v || !atWar(s.kid, v.kingdom)) continue;
    const d = dist(s.x, s.y, b.x + b.w / 2, b.y + b.h / 2);
    if (d <= WARSHIP_RANGE && (!best || d < best.d)) best = { x: b.x + b.w / 2, y: b.y + b.h / 2, d, kind: 'building', ref: b };
  }
  return best;
}

function fireAt(s, foe) {
  s.dir = foe.x < s.x ? -1 : 1;
  if (s.cd > 0) return;
  s.cd = 10;
  addEffect('beam', s.x, s.y - 0.3, 0.2, { x2: foe.x, y2: foe.y - 0.2, color: '#2a2a2a', w: 3 });
  addEffect('spark', foe.x, foe.y - 0.4, 0.6, {});
  if (typeof sfx === 'function') sfx('cannon', s.x, s.y);
  if (rand() < 0.25) return;   // a miss
  if (foe.kind === 'ship') { foe.ref.hp -= 15; foe.ref.flash = 3; }
  else if (foe.kind === 'trader') { foe.ref.done = true; addEffect('drop', foe.x, foe.y, 0.6, { color: '#bfe6ff' }); }
  else if (foe.kind === 'boat') hurt(foe.ref, 25, 'sunk by a warship');
  else if (foe.kind === 'building') damageBuilding(foe.ref, 10, 'was shelled by warships');
}

function sinkShip(s) {
  if (s.sunk) return;
  s.sunk = true;
  for (let k = 0; k < 8; k++) addEffect('spark', s.x + (rand() - 0.5) * 1.5, s.y - rand(), 0.8, {});
  const k = life.kingdoms.get(s.kid);
  if (k && s.hp <= 0) toast(`🌊 A warship of the ${k.name} was sunk`);
}

// wander the water near the home dock
function patrol(s) {
  const home = life.villages.get(s.home);
  const cx = home ? home.x : s.x, cy = home ? home.y : s.y;
  for (let tries = 0; tries < 12; tries++) {
    const x = cx + (rand() - 0.5) * 28, y = cy + (rand() - 0.5) * 28;
    if (sailable(x, y)) { s.tx = x; s.ty = y; return; }
  }
}

// straight at the target, sliding along coasts when land is in the way
function sailToward(s) {
  const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy);
  if (d < 0.2) return;
  const sx = (dx / d) * WARSHIP_SPEED, sy = (dy / d) * WARSHIP_SPEED;
  if (Math.abs(dx) > 0.05) s.dir = dx < 0 ? -1 : 1;
  for (const [mx, my] of [[sx, sy], [sx, 0], [0, sy], [-sy, sx], [sy, -sx]]) {
    if (sailable(s.x + mx, s.y + my)) { s.x += mx; s.y += my; return; }
  }
  patrol(s);   // boxed in: pick somewhere else
}

// ---------- Hooks ----------
const _resetLifeNavy = resetLife;
resetLife = function () { _resetLifeNavy(); life.warships = []; };
const _serializeLifeNavy = serializeLife;
serializeLife = function () { return { ..._serializeLifeNavy(), warships: life.warships.map(({ sunk, ...s }) => s) }; };
const _loadLifeNavy = loadLife;
loadLife = function (data) { _loadLifeNavy(data); life.warships = (data && data.warships) || []; };
life.warships ||= [];

const _citiesTickNavy = citiesTick;
citiesTick = function () { _citiesTickNavy(); navyTick(); };

const _drawCitiesNavy = drawCities;
drawCities = function (ox, oy, z) {
  _drawCitiesNavy(ox, oy, z);
  for (const s of life.warships) {
    const k = life.kingdoms.get(s.kid);
    const spr = warshipSprite(k ? k.color : '#888', s.dir < 0, s.flash > 0), sc = Math.max(1, Math.round(z / 4)) / spr.res;
    const w = spr.width * sc, h = spr.height * sc;
    ctx.drawImage(spr, Math.round(ox + s.x * z - w / 2), Math.round(oy + s.y * z - h * 0.8), w, h);
  }
};
