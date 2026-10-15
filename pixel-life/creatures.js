'use strict';

// ---------- Races ----------
const YEAR = TICKS_PER_MONTH * 12;
const ADULT_AGE = 16;      // years, civilized races
const MAX_UNITS = 3500;
const MAX_ANIMALS = 650;    // leaves room for people to keep having children
const ANIMAL_SPREAD = 2;    // each species lives at most one per (cap * spread) tiles
const CELL = 8;            // spatial grid cell size in tiles

// what grazing animals run from; big ones only fear big hunters
const BIG_PREDATORS = ['wolf', 'bear', 'polarbear', 'crocodile', 'ghoul', 'hyena', 'darkmage'];
const PREDATORS = [...BIG_PREDATORS, 'fox', 'cat', 'dog', 'snake'];
const PEOPLE = ['human', 'elf', 'orc', 'dwarf'];

const RACES = {
  human: {
    name: 'Human', plural: 'Humans', civ: true, hp: 30, dmg: 5, speed: 1, life: 70, aggression: 1,
    home: [T.GRASS, T.FOREST, T.SAND, T.SAVANNA, T.TUNDRA], title: 'Kingdom',
    colors: { s: '#e9b98d', h: '#5a3a22' }, roof: '#a8432f', wall: '#dccaa3',
    art: ['.hhh.', '.sss.', 'scccs', '.ccc.', '.ccc.', '.l.l.', '.l.l.'],
  },
  elf: {
    name: 'Elf', plural: 'Elves', civ: true, hp: 26, dmg: 5, speed: 1.15, life: 220, aggression: 0.6,
    home: [T.FOREST, T.GRASS, T.ENCHANTED, T.FAIRYWOOD, T.JUNGLE_FLOOR, T.JUNGLE], title: 'Realm',
    colors: { s: '#f3d9b8', h: '#efd77a' }, roof: '#2f8a7a', wall: '#d6e6c8',
    art: ['.hhh.', 'sssss', 'hcccs', 'hccc.', '.ccc.', '.l.l.', '.l.l.'],
  },
  orc: {
    name: 'Orc', plural: 'Orcs', civ: true, hp: 40, dmg: 7, speed: 1, life: 55, aggression: 2,
    home: [T.SAVANNA, T.DESERT, T.GRASS, T.SAND, T.HILLS, T.SWAMP], title: 'Horde',
    colors: { s: '#6c9a3c', h: '#26221e' }, roof: '#5b3b26', wall: '#8a6a4a',
    art: ['hhhhh', 'sssss', 'scccs', 'scccs', '.ccc.', '.l.l.', 'll.ll'],
  },
  dwarf: {
    name: 'Dwarf', plural: 'Dwarves', civ: true, hp: 36, dmg: 6, speed: 0.85, life: 140, aggression: 0.9,
    home: [T.HILLS, T.MOUNTAIN, T.TUNDRA, T.TAIGA, T.GRASS], title: 'Hold',
    colors: { s: '#e3a878', h: '#b5522a' }, roof: '#5d6370', wall: '#aaa49a',
    art: ['.hhh.', '.sss.', 'hhhhh', 'shhhs', '.ccc.', '.l.l.'],
  },
  sheep: {
    name: 'Sheep', plural: 'Sheep', hp: 10, dmg: 0, speed: 0.6, life: 14,
    breed: 0.006, cap: 400, flees: PREDATORS, habitat: ['grassland'],
  },
  camel: {
    name: 'Camel', plural: 'Camels', hp: 18, dmg: 0, speed: 0.7, life: 30,
    breed: 0.003, cap: 800, flees: PREDATORS, habitat: ['desert', 'savanna'],
  },
  monkey: {
    name: 'Monkey', plural: 'Monkeys', hp: 8, dmg: 0, speed: 1.2, life: 20,
    breed: 0.006, cap: 900, flees: PREDATORS, habitat: ['jungle'],
  },
  unicorn: {
    name: 'Unicorn', plural: 'Unicorns', hp: 30, dmg: 6, speed: 1.3, life: 200,
    breed: 0.002, cap: 1500, flees: ['ghoul'], habitat: ['enchanted'],
  },
  wolf: {
    name: 'Wolf', plural: 'Wolves', hp: 20, dmg: 4, speed: 1.35, life: 16,
    breed: 0.005, cap: 1500, prey: ['sheep', 'camel', 'monkey', 'rabbit', 'chicken', 'penguin', 'cow'], habitat: ['tundra', 'grassland'],
  },
  bear: {
    name: 'Bear', plural: 'Bears', hp: 50, dmg: 9, speed: 0.9, life: 30,
    breed: 0.002, cap: 3000, prey: ['sheep', 'camel', 'cow', 'buffalo', 'rabbit', ...PEOPLE], habitat: ['grassland'],
  },
  polarbear: {
    name: 'Polar Bear', plural: 'Polar Bears', hp: 60, dmg: 10, speed: 0.9, life: 30,
    breed: 0.002, cap: 3000, prey: ['sheep', 'penguin', 'rabbit', ...PEOPLE], habitat: ['tundra'],
  },
  crocodile: {
    name: 'Crocodile', plural: 'Crocodiles', hp: 40, dmg: 8, speed: 0.7, life: 50,
    breed: 0.002, cap: 2500, prey: ['sheep', 'monkey', 'camel', 'frog', 'buffalo', 'turtle', ...PEOPLE], habitat: ['swamp'],
  },
  fox: {
    name: 'Fox', plural: 'Foxes', hp: 14, dmg: 3, speed: 1.4, life: 12,
    breed: 0.005, cap: 900, prey: ['rabbit', 'chicken', 'frog', 'rat'], flees: BIG_PREDATORS, habitat: ['grassland', 'tundra'],
  },
  // secret: born sapient, only appears after the easter egg (see gear.js)
  superfox: {
    name: 'Super Fox', plural: 'Super Foxes', civ: true, hp: 5000, dmg: 120, speed: 1.8, life: 500, aggression: 1,
    hero: true, hidden: true, maxPop: 30,
    home: [T.GRASS, T.FOREST, T.SAVANNA, T.TUNDRA, T.TAIGA, T.SAND], title: 'Den',
    roof: '#ff8c1a', wall: '#fff4d6',
    // an upright fox in a jeweled crown, Foxyite armor and a purple cape, Fang Blade in
    // paw; the gear is part of the drawing, so gearArt adds nothing (drawsGear)
    colors: { r: '#ff8c1a', w: '#fff4d6', d: '#2a2420', k: '#111111', y: '#ffd700', e: '#e0204a', s: '#ffe8b8', u: '#c8501a', p: '#7a2ad8', q: '#5a1aa8' },
    facesLeft: true, detail: 2, drawsGear: true,
    art: [
      '......y.y.y....',
      '......yyyyy....',
      '....d.yyeyy.d..',
      '....drrrrrrrd..',
      '....rrrrrrrrr..',
      '...rkrrrrrrrr..',
      '.drrrrrrrrrrr..',
      '...wwwwrrrrr...',
      '.s.....wwrr.pq.',
      '.s...uuuyuuuppq',
      '.s..ruuuyuuuppq',
      '.s.rruuuyuuuppq',
      'yyyrruuuyuuuppq',
      '.y...wwwwwwwppq',
      '.....rrrrrrrppq',
      '.....rrr.rrrpq.',
      '.....rr...rr.rr',
      '.....rr...rr.rw',
      '....ddd..ddd.ww',
    ],
  },
  rabbit: {
    name: 'Rabbit', plural: 'Rabbits', hp: 5, dmg: 0, speed: 1.3, life: 8,
    breed: 0.01, cap: 800, flees: PREDATORS, habitat: ['grassland', 'tundra', 'enchanted'],
  },
  chicken: {
    name: 'Chicken', plural: 'Chickens', hp: 4, dmg: 0, speed: 0.8, life: 8,
    breed: 0.008, cap: 800, flees: PREDATORS, habitat: ['grassland', 'savanna'],
  },
  cow: {
    name: 'Cow', plural: 'Cows', hp: 25, dmg: 0, speed: 0.6, life: 20,
    breed: 0.004, cap: 800, flees: BIG_PREDATORS, habitat: ['grassland'],
  },
  cat: {
    name: 'Cat', plural: 'Cats', hp: 8, dmg: 2, speed: 1.2, life: 15,
    breed: 0.004, cap: 1500, prey: ['rat', 'frog', 'chicken'], flees: BIG_PREDATORS, habitat: ['grassland'],
  },
  dog: {
    name: 'Dog', plural: 'Dogs', hp: 16, dmg: 4, speed: 1.3, life: 14,
    breed: 0.004, cap: 1500, prey: ['rabbit', 'rat', 'cat'], flees: ['bear', 'polarbear', 'crocodile', 'ghoul'], habitat: ['grassland'],
  },
  rat: {
    name: 'Rat', plural: 'Rats', hp: 3, dmg: 0, speed: 1.1, life: 4,
    breed: 0.012, cap: 900, flees: PREDATORS, habitat: ['swamp', 'corrupt', 'grassland'],
  },
  buffalo: {
    name: 'Buffalo', plural: 'Buffalo', hp: 45, dmg: 7, speed: 0.7, life: 25,
    breed: 0.003, cap: 1000, flees: ['crocodile', 'ghoul', 'darkmage'], habitat: ['savanna'],
  },
  rhino: {
    name: 'Rhino', plural: 'Rhinos', hp: 70, dmg: 10, speed: 0.75, life: 40,
    breed: 0.002, cap: 1200, flees: ['ghoul', 'darkmage'], habitat: ['savanna'],
  },
  hyena: {
    name: 'Hyena', plural: 'Hyenas', hp: 18, dmg: 5, speed: 1.3, life: 14,
    breed: 0.004, cap: 1200, prey: ['rabbit', 'chicken', 'camel', 'monkey', 'buffalo', 'rat'], habitat: ['savanna', 'desert'],
  },
  penguin: {
    name: 'Penguin', plural: 'Penguins', hp: 8, dmg: 0, speed: 0.6, life: 15,
    breed: 0.006, cap: 900, flees: PREDATORS, habitat: ['tundra', 'ice'],
  },
  frog: {
    name: 'Frog', plural: 'Frogs', hp: 3, dmg: 0, speed: 0.9, life: 6,
    breed: 0.01, cap: 900, flees: PREDATORS, habitat: ['swamp', 'jungle'],
  },
  snake: {
    name: 'Snake', plural: 'Snakes', hp: 12, dmg: 5, speed: 0.9, life: 15,
    breed: 0.003, cap: 1200, prey: ['rat', 'frog', 'rabbit', 'chicken', 'monkey'], flees: BIG_PREDATORS, habitat: ['jungle', 'desert', 'swamp'],
  },
  crab: {
    name: 'Crab', plural: 'Crabs', hp: 10, dmg: 2, speed: 0.6, life: 10,
    breed: 0.005, cap: 1000, flees: BIG_PREDATORS, habitat: ['beach'],
  },
  turtle: {
    name: 'Turtle', plural: 'Turtles', hp: 30, dmg: 0, speed: 0.35, life: 100,
    breed: 0.002, cap: 1500, flees: [], habitat: ['beach', 'swamp'],
  },
  zombie: {
    name: 'Zombie', plural: 'Zombies', hp: 25, dmg: 5, speed: 0.55, life: 60, monster: true,
    breed: 0, cap: 2000, prey: [...PEOPLE, 'sheep', 'cow', 'chicken', 'camel', 'monkey', 'dog', 'cat'], habitat: ['corrupt'], undead: true,
    colors: { g: '#7aa860', r: '#5a4a3a', e: '#e02020', b: '#3a5a8a' },
    art: ['.ggg.', '.geg.', 'gbbbg', '.bbb.', '.bbb.', '.r.r.', '.r.r.'],
  },
  skeleton: {
    name: 'Skeleton', plural: 'Skeletons', hp: 20, dmg: 6, speed: 0.9, life: 80, monster: true,
    breed: 0, cap: 2000, prey: [...PEOPLE, 'sheep', 'cow', 'dog'], undead: true,
    colors: { w: '#e8e4d8', k: '#202020', m: '#c9ced6' },
    art: ['.www.', '.kwk.', '..w.m', 'wwwwm', '.w.wm', '.www.', '.w.w.', '.w.w.'],
  },
  dragon: {
    name: 'Dragon', plural: 'Dragons', hp: 400, dmg: 25, speed: 1.1, life: 1000, monster: true, flies: true, breath: true,
    breed: 0, cap: 99999, prey: [...PEOPLE, 'sheep', 'cow', 'buffalo', 'rhino', 'camel', 'unicorn', 'bear'], habitat: ['mountain'], wildMax: 1, solo: true,
    colors: { r: '#b8282a', d: '#6a1414', y: '#f0c040', e: '#ffe060' },
    art: [
      '..........dd..',
      '.rr......dddd.',
      'rer.....dddddd',
      'yrrr...rrdddd.',
      '..rrrrrrrrr...',
      '...rrrrrrrrrr.',
      '...yyyyrr..rr.',
      '...r.r..r....r',
    ],
  },
  crabzilla: {
    name: 'Crabzilla', plural: 'Crabzillas', hp: 3000, dmg: 60, speed: 0.8, life: 5000, monster: true, swims: true, laser: true,
    breed: 0, cap: 99999, prey: [...PEOPLE, 'dragon', 'bear', 'rhino', 'buffalo', 'cow'],
    colors: { r: '#d8442a', d: '#9a2a1a', k: '#202020', y: '#ffe060' },
    art: [
      'rr..........rr',
      'rrr........rrr',
      '.rr..y..y..rr.',
      '..r..k..k..r..',
      '..rrrrrrrrrrr.',
      '.rrrrrrrrrrrrr',
      'rrddrrrrrrddrr',
      '.rrrrrrrrrrrr.',
      'r.r.r....r.r.r',
      'r..r......r..r',
    ],
  },
  whitemage: {
    name: 'Good Wizard', plural: 'Good Wizards', hp: 60, dmg: 4, speed: 0.9, life: 400, wizard: 'good',
    breed: 0, cap: 99999,
    colors: { w: '#f4f4f4', b: '#d8d8d8', s: '#f0c8a0', t: '#8a6a3a', o: '#7fe0ff' },
    art: ['..w..o', '.www.t', '.sss.t', '.bbb.t', 'wwwwwt', '.www.t', '.www.t', 'ww.ww.'],
  },
  doctor: {
    name: 'Plague Doctor', plural: 'Plague Doctors', hp: 35, dmg: 3, speed: 1, life: 70, wizard: 'doctor',
    breed: 0, cap: 99999,
    colors: { k: '#1e1e22', w: '#e8e0c8', g: '#3a3a40', b: '#6a4a2a' },
    art: ['.kkk..', 'kkkkk.', '.wkww.', '.www..', 'kkkkkb', '.kkk.b', '.kkk.b', '.k.k..'],
  },
  faerie: {
    name: 'Faerie', plural: 'Faeries', hp: 6, dmg: 0, speed: 1.4, life: 300, flies: true,
    breed: 0.004, cap: 1200, flees: PREDATORS, habitat: ['enchanted'],
    colors: { w: '#d8f4ff', s: '#f8d8f0', p: '#f0a0e0' },
    art: ['w.p.w', 'wwsww', '.wpw.', '..p..'],
  },
  darkmage: {
    name: 'Evil Wizard', plural: 'Evil Wizards', hp: 60, dmg: 4, speed: 0.9, life: 400, wizard: 'evil', monster: true,
    breed: 0, cap: 99999,
    colors: { w: '#3a2a4a', b: '#20142a', s: '#a8c0a0', t: '#4a3a2a', o: '#ff4040' },
    art: ['..w..o', '.www.t', '.sss.t', '.bbb.t', 'wwwwwt', '.www.t', '.www.t', 'ww.ww.'],
  },
  ghoul: {
    name: 'Ghoul', plural: 'Ghouls', hp: 30, dmg: 6, speed: 1, life: 40,
    breed: 0, cap: 2000, prey: [...PEOPLE, 'sheep', 'camel', 'monkey', 'unicorn', 'cow', 'rabbit'], habitat: ['corrupt'], undead: true,
    colors: { g: '#8e83a8', r: '#3b2f4a', e: '#ff4060' },
    art: ['.ggg.', '.ege.', 'rrrrr', 'grrrg', '.rrr.', '.r.r.', '.r.r.'],
  },
};

const WILD = Object.keys(RACES).filter(k => RACES[k].habitat);

const NAME_PARTS = {
  superfox: [['Ra', 'Vul', 'Ki', 'Fen', 'Sly', 'Am', 'Ze', 'Ru', 'Tod', 'Re'],
             ['nard', 'pin', 'tsu', 'ix', 'ber', 'ra', 'ko', 'vin']],
  human: [['Ar', 'Bel', 'Cor', 'Dun', 'Ed', 'Fal', 'Gar', 'Hal', 'Ost', 'Ro', 'Wil', 'Stan'],
          ['an', 'ford', 'ton', 'wick', 'mere', 'dale', 'bury', 'ric', 'win', 'ley']],
  elf:   [['Ae', 'Ela', 'Fae', 'Gil', 'Lae', 'Mir', 'Syl', 'Tha', 'Ili', 'Nae'],
          ['ndor', 'wyn', 'thas', 'riel', 'lith', 'las', 'ion', 'ara', 'eth', 'iel']],
  orc:   [['Gro', 'Kra', 'Mug', 'Ug', 'Zog', 'Gor', 'Bru', 'Dak', 'Rok', 'Thra'],
          ['g', 'nak', 'gash', 'rok', 'z', 'mash', 'gul', 'dar', 'tuk', 'zug']],
  dwarf: [['Bal', 'Dur', 'Gim', 'Kaz', 'Thor', 'Bro', 'Dvar', 'Kil', 'Nor', 'Grom'],
          ['in', 'ak', 'dum', 'grim', 'rek', 'ni', 'bar', 'dok', 'li', 'gar']],
};

const KINGDOM_COLORS = ['#e6194b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0',
  '#f032e6', '#ffffff', '#fabebe', '#008080', '#800000', '#000075', '#ffd8b1', '#9a6324'];

const rand = Math.random;
const pick = a => a[(rand() * a.length) | 0];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const makeName = race => pick(NAME_PARTS[race][0]) + pick(NAME_PARTS[race][1]);

// ---------- Sapient animals ----------
// Now and then a few animals wake up clever and become a new civilized race.
const MUTATION_CHANCE = 8e-8;   // per adult animal per tick, scaled by intellect
const SAPIENT_NAMES = [['Ba', 'Mo', 'Ru', 'Fi', 'Ka', 'Lo', 'Ne', 'Pi', 'Sa', 'Tu', 'Wo', 'Za'],
                       ['ba', 'mo', 'rk', 'ff', 'la', 'sh', 'nn', 'wl', 'py', 'zi']];
const SAPIENT_ROOFS = ['#8a4fa8', '#4f7aa8', '#a8784f', '#4fa87a', '#a84f6a'];

function makeSapientRace(base) {
  const key = base + '_folk';
  if (RACES[key]) return key;
  const b = RACES[base];
  const homeBiomes = b.habitat || ['grassland'];
  const home = [T.GRASS, T.FOREST];
  for (const h of homeBiomes) {
    if (h === 'beach') home.push(T.SAND);
    else if (BIOMES[h]) home.push(BIOMES[h].ground, ...(BIOMES[h].tree !== null ? [BIOMES[h].tree] : []));
  }
  // a cloak in the kingdom's color across the body
  const art = b.art.slice();
  const d = b.detail || 1;
  for (let row = art.length - 2 * d; row < art.length - d; row++) {   // the body, just above the legs
    let n = 0;
    art[row] = art[row].replace(/[^.]/g, ch => (++n > d && n <= 3 * d ? 'c' : ch));
  }
  const form = typeof SAPIENT_FORMS !== 'undefined' && SAPIENT_FORMS[base];
  RACES[key] = {
    name: form ? form[0] : `Sapient ${b.name}`, plural: form ? form[1] : `Sapient ${b.plural}`, civ: true, sapientOf: base,
    hp: Math.max(20, Math.round(b.hp * 1.3)), dmg: Math.max(4, b.dmg), speed: Math.max(0.8, b.speed),
    life: Math.max(60, b.life * 3), aggression: b.prey ? 1.6 : 0.7,
    home: [...new Set(home)], title: b.prey ? 'Pack' : 'Herd',
    colors: b.colors, facesLeft: b.facesLeft, detail: b.detail, art,
    roof: SAPIENT_ROOFS[Object.keys(RACES).indexOf(base) % SAPIENT_ROOFS.length], wall: '#cfc3a8',
  };
  NAME_PARTS[key] = SAPIENT_NAMES;
  return key;
}

function awaken(u) {
  if (RACES[u.race].hidden) return false;
  const group = [u];
  for (const o of life.units) {
    if (group.length >= 5) break;
    if (o !== u && !o.dead && o.race === u.race && isAdult(o) && dist(o.x, o.y, u.x, u.y) < 8) group.push(o);
  }
  if (group.length < 2) return false;   // needs company to start a people
  const base = u.race, key = makeSapientRace(base), r = RACES[key];
  for (const o of group) {
    o.race = key;
    o.name = makeName(key);
    o.hp = r.hp;
    o.age = 18 * YEAR;
    o.maxAge = Math.round(r.life * (0.75 + rand() * 0.5) * YEAR);
    o.hunger = 0;
    addEffect('spark', o.x, o.y - 0.5, 1.2, {});
  }
  chronicle(`🧠 ${group.length} ${RACES[base].plural.toLowerCase()} became sapient!`);
  renderPanel();
  return true;
}

// ---------- Monoliths ----------
// Ancient stones the player places. Every few months they pulse, and animals
// caught in the pulse may wake up as a new race.
const MONOLITH_RANGE = 14;      // tiles
const MONOLITH_PULSE = 40;      // ticks between pulses
const MONOLITH_CHANCE = 0.06;   // per adult animal per pulse, scaled by intellect

function placeMonolith(x, y) {
  const tx = Math.floor(x), ty = Math.floor(y);
  if (!inBounds(tx, ty)) return;
  const t = state.tiles[ty * state.W + tx];
  if (isWater(t) || t === T.LAVA) { toast('A monolith needs solid ground'); return; }
  if (life.monoliths.some(m => dist(m.x, m.y, tx, ty) < 4)) return;
  life.monoliths.push({ x: tx, y: ty, glow: 0 });
  addEffect('flash', tx + 0.5, ty + 0.5, 0.4, { r: 3 });
  powers.shake = Math.max(powers.shake, 4);
}

function removeMonolithsNear(x, y, r) {
  life.monoliths = life.monoliths.filter(m => dist(m.x + 0.5, m.y + 0.5, x, y) > r);
}

function monolithTick() {
  if (state.tick % MONOLITH_PULSE !== 0) return;
  // lava or rising water swallows a monolith
  life.monoliths = life.monoliths.filter(m => {
    const t = state.tiles[m.y * state.W + m.x];
    return !isWater(t) && t !== T.LAVA;
  });
  for (const m of life.monoliths) {
    const cx = m.x + 0.5, cy = m.y + 0.5;
    m.glow = 1;
    addEffect('pulse', cx, cy, 1.4, { r: MONOLITH_RANGE });
    for (const u of life.units) {
      if (u.dead || !isAdult(u) || dist(u.x, u.y, cx, cy) > MONOLITH_RANGE) continue;
      const r = RACES[u.race];
      if (r.civ || r.wizard) continue;
      if (rand() < MONOLITH_CHANCE * gene(u, 'intellect') ** 2) awaken(u);
    }
  }
}

// ---------- State ----------
const life = {
  units: [],
  byId: new Map(),
  villages: new Map(),
  kingdoms: new Map(),
  buildings: new Map(),
  owner: null,     // village id that owns each tile (0 = nobody)
  bmap: null,      // building id on each tile (0 = none)
  nextId: 1,
  grid: [], gridCols: 0, gridRows: 0,
  counts: {},
  animals: 0,
  selected: null,
  territoryDirty: true,
  sailing: new Set(),   // kingdoms with at least one dock
  books: [],
  subspecies: [],
  age: 'hope',
  traders: [],
  ruins: [],
  languages: new Map(),
  religions: new Map(),
  cultures: new Map(),
  history: [],
  stats: [],
  monoliths: [],
  geysers: [],     // { x, y, acid, cd, erupt }
};

let overlayCanvas, octx, oimg, opix;
let lastOverlay = 0;

function resetLife() {
  const n = state.W * state.H;
  life.units = [];
  life.byId = new Map();
  life.villages = new Map();
  life.kingdoms = new Map();
  life.buildings = new Map();
  life.languages = new Map();
  life.religions = new Map();
  life.cultures = new Map();
  life.history = [];
  life.books = [];
  life.subspecies = [];
  life.age = 'hope';
  life.clanTraits = {};
  life.traders = [];
  life.ruins = [];
  life.stats = [];
  held.clear();
  state.follow = 0;
  life.monoliths = [];
  life.structures = [];
  life.geysers = [];
  life.owner = new Int32Array(n);
  life.bmap = new Int32Array(n);
  life.nextId = 1;
  life.selected = null;
  control.id = 0;
  for (const k in RACES) if (RACES[k].sapientOf) { delete RACES[k]; delete NAME_PARTS[k]; }
  for (const r of Object.values(RACES)) if (r.defaultName !== undefined) { r.name = r.defaultName; r.plural = r.defaultPlural; }
  initOverlay();
}

function initOverlay() {
  overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = state.W * SUB;   // as fine as the ground (game.js)
  overlayCanvas.height = state.H * SUB;
  octx = overlayCanvas.getContext('2d');
  oimg = octx.createImageData(state.W * SUB, state.H * SUB);
  opix = new Uint32Array(oimg.data.buffer);
  life.territoryDirty = true;
}

// ---------- Helpers ----------
function inBounds(x, y) { return x >= 0 && y >= 0 && x < state.W && y < state.H; }
function buildable(t) { return !isWater(t) && t !== T.LAVA && t !== T.ICE && t !== T.GOO && !TILES[t].wall && !TILES[t].creep; }

// grass-like ground, hills, and woods that grow on fertile ground can become fields
function farmable(t) {
  return isFertile(t) || t === T.HILLS || (isTree(t) && isFertile(BIOMES[biomeOf(t)].ground));
}

function walkable(x, y) {
  const tx = Math.floor(x), ty = Math.floor(y);
  if (!inBounds(tx, ty)) return false;
  const t = state.tiles[ty * state.W + tx];
  return !isWater(t) && t !== T.LAVA && t !== T.GOO && !TILES[t].wall;
}

// blessed creatures are 50% tougher and stronger, cursed ones 40% weaker
const statMult = u => (u.blessed ? 1.5 : 1) * (u.cursed ? 0.6 : 1) * extraStatMult(u);   // levels, power-ups (traits2.js)
function maxHp(u) { return Math.round(RACES[u.race].hp * statMult(u) * gene(u, 'vitality')); }

function isAdult(u) { return u.age >= (RACES[u.race].civ ? ADULT_AGE : 1) * YEAR; }
function kingdomOf(u) { return u.village ? (life.villages.get(u.village)?.kingdom || 0) : u.kingdom; }
function atWar(a, b) { return !!a && !!b && a !== b && life.kingdoms.get(a)?.wars[b] !== undefined; }

function describe(u) {
  const r = RACES[u.race];
  return r.civ ? `${u.name} the ${r.name}` : r.wizard ? u.name : `a ${r.name.toLowerCase()}`;
}

function villagesOf(kid) {
  const out = [];
  for (const v of life.villages.values()) if (v.kingdom === kid) out.push(v);
  return out;
}

function nearestVillage(x, y, r, filter) {
  let best = null, bd = r;
  for (const v of life.villages.values()) {
    const d = dist(x, y, v.x, v.y);
    if (d < bd && filter(v)) { bd = d; best = v; }
  }
  return best;
}

function pickResident(v, filter = () => true) {
  const list = life.units.filter(u => !u.dead && u.village === v.id && filter(u));
  return list.length ? pick(list) : null;
}

// ---------- Units ----------
// races with a maxPop can never have more than that many alive at once
function atRaceCap(race) {
  const cap = RACES[race].maxPop;
  return !!cap && life.units.filter(u => !u.dead && u.race === race).length >= cap;
}

function spawnUnit(race, x, y, ageYears, parents) {
  if (life.units.length >= MAX_UNITS || atRaceCap(race)) return null;
  const r = RACES[race];
  const u = {
    id: life.nextId++, race, name: r.civ ? makeName(race) : r.wizard ? `${makeName('human')} the ${r.wizard === 'good' ? 'White' : 'Dark'}` : r.name,
    x, y, px: x, py: y, tx: null, ty: null, dir: rand() < 0.5 ? -1 : 1, wait: 0,
    hp: r.hp, age: Math.round(ageYears * YEAR), maxAge: Math.round(r.life * (0.75 + rand() * 0.5) * YEAR),
    village: 0, kingdom: 0, role: 'worker', task: null, carry: null,
    cd: 0, hunger: 0, stuck: 0, flash: 0, lastHitBy: 0, kills: 0,
    settleTravel: false, settleUntil: 0, warTarget: 0, noWarUntil: 0,
    sick: 0, immune: false, mad: 0, blessed: false, cursed: false, shield: 0, boat: false,
    dead: false, cause: '',
  };
  u.dna = parents ? inheritDna(parents[0], parents[1]) : randomDna();
  inheritTraits(u, parents);
  u.maxAge = Math.round(u.maxAge * gene(u, 'lifespan'));
  u.hp = maxHp(u);
  if (parents) {
    u.parents = parents.filter(Boolean).map(p => p.id);
    u.parentNames = parents.filter(Boolean).map(p => p.name);
  }
  if (r.undead || r.wizard) u.immune = true;
  if (r.onSpawn) r.onSpawn(u);
  life.units.push(u);
  life.byId.set(u.id, u);
  return u;
}

// things that happen when a creature dies (infections, death traits...)
const DEATH_HOOKS = [];

function killUnit(u, cause) {
  if (u.dead) return;
  u.dead = true;
  u.cause = cause;
  for (const f of DEATH_HOOKS) f(u, cause);
}

function spawnAt(race, x, y) {
  if (!walkable(x + 0.5, y + 0.5)) { toast(`${RACES[race].plural} can't live there`); return; }
  const u = spawnUnit(race, x + 0.5, y + 0.5, RACES[race].civ ? 18 + rand() * 6 : 2);
  if (!u) toast(atRaceCap(race) ? `Only ${RACES[race].maxPop} ${RACES[race].plural} can live at once` : 'The world is full');
}

// beaches and ice count as habitats too
const habitatOf = t => biomeOf(t) || (t === T.SAND ? 'beach' : t === T.ICE ? 'ice' : t === T.MOUNTAIN || t === T.SNOW ? 'mountain' : isWater(t) ? 'water' : null);

// Each biome slowly gets its own wild animals, a pair at a time, up to a few of each.
function spawnWildlife() {
  const { W, H, tiles } = state;
  if (!laws.wildlife || life.animals > MAX_ANIMALS - 50) return;
  const race = pick(WILD);
  const r = RACES[race];
  if (life.counts[race] >= (r.wildMax ?? Math.max(3, Math.round((W * H) / 14000)))) return;
  if (r.wildMax && rand() > 0.02) return;   // rare beasts take their time
  // look around for its habitat, so small biomes still get their animals
  for (let tries = 0; tries < 40; tries++) {
    const x = (rand() * W) | 0, y = (rand() * H) | 0;
    if (!r.habitat.includes(habitatOf(tiles[y * W + x]))) continue;
    for (let n = 0; n < (r.solo ? 1 : 2); n++) {
      const ax = x + 0.5 + (rand() - 0.5) * 2, ay = y + 0.5 + (rand() - 0.5) * 2;
      if ((r.aquatic ? sailable(ax, ay) : walkable(ax, ay) || r.flies) && spawnUnit(race, ax, ay, 2)) life.counts[race]++;
    }
    return;
  }
}

// ---------- Spatial grid ----------
function rebuildGrid() {
  const cols = Math.ceil(state.W / CELL), rows = Math.ceil(state.H / CELL);
  if (life.grid.length !== cols * rows) life.grid = Array.from({ length: cols * rows }, () => []);
  else for (const c of life.grid) c.length = 0;
  life.gridCols = cols;
  life.gridRows = rows;

  const counts = {};
  let animals = 0;
  for (const k in RACES) counts[k] = 0;
  for (const v of life.villages.values()) { v.pop = 0; v.adults = 0; v.warriors = 0; v.dock = false; }
  life.sailing.clear();
  for (const b of life.buildings.values()) {
    if (b.type !== 'dock') continue;
    const v = life.villages.get(b.village);
    if (v) { v.dock = true; life.sailing.add(v.kingdom); }
  }

  for (const u of life.units) {
    if (u.dead) continue;
    counts[u.race]++;
    if (!RACES[u.race].civ) animals++;
    const cx = Math.min(cols - 1, Math.max(0, (u.x / CELL) | 0));
    const cy = Math.min(rows - 1, Math.max(0, (u.y / CELL) | 0));
    life.grid[cy * cols + cx].push(u);
    const v = u.village && life.villages.get(u.village);
    if (v) {
      v.pop++;
      if (isAdult(u)) {
        v.adults++;
        if (u.role === 'warrior') v.warriors++;
      }
    }
  }
  life.counts = counts;
  life.animals = animals;
}

function nearest(x, y, r, filter) {
  const cols = life.gridCols, rows = life.gridRows;
  const x0 = Math.max(0, Math.floor((x - r) / CELL)), x1 = Math.min(cols - 1, Math.floor((x + r) / CELL));
  const y0 = Math.max(0, Math.floor((y - r) / CELL)), y1 = Math.min(rows - 1, Math.floor((y + r) / CELL));
  let best = null, bd = r * r;
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      for (const o of life.grid[cy * cols + cx]) {
        if (o.dead) continue;
        const d = (o.x - x) ** 2 + (o.y - y) ** 2;
        if (d < bd && filter(o)) { bd = d; best = o; }
      }
    }
  }
  return best;
}

// ---------- Movement ----------
// People whose kingdom has a dock can take a boat out onto the water.
function canSail(u) {
  return !!RACES[u.race].civ && isAdult(u) && (u.boat || life.sailing.has(kingdomOf(u)));
}

function sailable(x, y) {
  const tx = Math.floor(x), ty = Math.floor(y);
  return inBounds(tx, ty) && isWater(state.tiles[ty * state.W + tx]);
}

function moveToward(u, tx, ty) {
  const dx = tx - u.x, dy = ty - u.y;
  const d = Math.hypot(dx, dy);
  const step = u.boat ? 0.22 : 0.15 * RACES[u.race].speed * gene(u, 'speed') * (1 - (armorOf(u).slow || 0)) * speedMult(u);
  const sail = canSail(u);
  const rr = RACES[u.race];
  const ok = rr.aquatic ? sailable
    : rr.flies || rr.swims ? (x, y) => inBounds(Math.floor(x), Math.floor(y))
    : (x, y) => walkable(x, y) || (sail && sailable(x, y)) || ownWall(u, x, y);
  if (Math.abs(dx) > 0.05) u.dir = dx < 0 ? -1 : 1;
  if (d <= step) {
    if (ok(tx, ty)) { u.x = tx; u.y = ty; }
    u.boat = sailable(u.x, u.y);
    return true;
  }
  const nx = u.x + (dx / d) * step, ny = u.y + (dy / d) * step;
  if (ok(nx, ny)) { u.x = nx; u.y = ny; u.stuck = 0; }
  // slide along the coast before giving up
  else if (ok(nx, u.y)) { u.x = nx; u.stuck++; }
  else if (ok(u.x, ny)) { u.y = ny; u.stuck++; }
  else {
    u.stuck += 2;
    const wt = state.tiles[Math.floor(ny) * state.W + Math.floor(nx)];
    if (TILES[wt] && TILES[wt].spiked) hurt(u, 1, 'impaled on an iron wall');
  }
  u.boat = sailable(u.x, u.y);
  return false;
}

function wander(u, cx, cy, radius) {
  if (u.wait > 0) { u.wait--; return; }
  if (u.tx !== null && u.stuck < 8 && !moveToward(u, u.tx, u.ty)) return;
  if (u.tx !== null) u.wait = (rand() * 25) | 0;
  u.stuck = 0;
  u.tx = null;
  for (let i = 0; i < 8; i++) {
    const a = rand() * Math.PI * 2, r = rand() * radius;
    const tx = cx + Math.cos(a) * r, ty = cy + Math.sin(a) * r;
    const wr = RACES[u.race];
    if (wr.aquatic ? sailable(tx, ty) : walkable(tx, ty) || ((wr.flies || wr.swims) && inBounds(Math.floor(tx), Math.floor(ty)))) { u.tx = tx; u.ty = ty; return; }
  }
}

// Returns true once the target is in reach and the unit has swung at it.
function fight(u, t) {
  u.tx = null;
  const weapon = weaponOf(u);
  if (trySpell(u, t)) return true;
  if (dist(u.x, u.y, t.x, t.y) > (weapon.reach || 0.9)) { if (!tryDash(u, t)) moveToward(u, t.x, t.y); return false; }
  u.dir = t.x < u.x ? -1 : 1;
  if (u.cd > 0) return false;
  u.cd = 8;
  if (weapon.reach > 2) {
    addEffect('beam', u.x, u.y - 0.6, 0.15, { x2: t.x, y2: t.y - 0.4, color: weapon.magic ? '#7fe0ff' : '#e8e0c8', w: weapon.magic ? 3 : 1 });
  }
  const dmg = (RACES[u.race].dmg + (weapon.dmg || 0) * matMult(u, 'weapon')) * (0.7 + rand() * 0.6) * (u.role === 'warrior' ? 1.4 : 1) *
    statMult(u) * gene(u, 'strength') * cultureMult(u, 'warlike', 1.2) * (1 - Math.min(0.85, (armorOf(t).def || 0) * matMult(t, 'armor'))) * takenMult(t);
  const hit = defend(u, t, dmg, weapon.reach > 2);   // dodge, block, deflect (traits2.js)
  if (!t.shield) t.hp -= hit;
  afterHit(u, t, hit);
  familyDefends(t, u);
  t.lastHitBy = u.id;
  t.flash = 3;
  if (t.hp <= 0) {
    killUnit(t, `killed by ${describe(u)}`);
    u.kills++;
    onKill(u, t);
    // zombie bites raise the dead
    if (u.race === 'zombie' && !RACES[t.race].undead && !RACES[t.race].wizard) spawnUnit('zombie', t.x, t.y, 1);
  }
  return true;
}

// creatures held by the pick-up tool
const held = new Set();

// ---------- Possession ----------
// The player can take over one creature: WASD moves it, clicking a creature
// attacks it, clicking the ground walks there.
const control = { id: 0, dx: 0, dy: 0, dest: null, target: 0 };

function startControl(u) {
  control.id = u.id;
  control.dest = null;
  control.target = 0;
  u.task = null;
  u.tx = null;
  life.selected = { unit: u };
  if (!state.speed) setSpeed(state.lastSpeed);
  toast(`🎮 You are now ${describe(u)}`);
}

function stopControl(msg) {
  if (!control.id) return;
  control.id = 0;
  control.target = 0;
  control.dest = null;
  if (msg) toast(msg);
}

function controlled() {
  const u = control.id && life.byId.get(control.id);
  if (control.id && (!u || u.dead)) stopControl(u ? `☠ You died: ${u.cause}` : null);
  return control.id ? u : null;
}

function commandAt(wx, wy, sx, sy) {
  const u = controlled();
  if (!u) return;
  const o = unitAt(wx, wy, sx, sy);
  if (o && o !== u) { control.target = o.id; control.dest = null; addEffect('rage', o.x, o.y - 0.5, 0.5, {}); }
  else { control.dest = { x: wx, y: wy }; control.target = 0; }
}

function controlStep(u, r) {
  const target = control.target && life.byId.get(control.target);
  if (control.dx || control.dy) {
    // steering by keyboard overrides orders
    control.dest = null;
    control.target = 0;
    const len = Math.hypot(control.dx, control.dy);
    moveToward(u, u.x + (control.dx / len) * 2, u.y + (control.dy / len) * 2);
    return;
  }
  if (target && !target.dead) {
    if (r.breath && u.cd === 0 && dist(u.x, u.y, target.x, target.y) < 5) breatheFire(u, target);
    else if (r.laser && u.cd === 0 && dist(u.x, u.y, target.x, target.y) < 9) fireLaser(u, target);
    else if (r.wizard && !u.spell && dist(u.x, u.y, target.x, target.y) < 7) {
      u.spell = 30;
      addEffect('beam', u.x + 0.3, u.y - 1, 0.35, { x2: target.x, y2: target.y - 0.5, color: r.wizard === 'evil' ? '#ff4040' : '#bff4ff', w: 3 });
      hurt(target, 18, `struck down by ${u.name}`, u);
    } else fight(u, target);
    return;
  }
  control.target = 0;
  if (control.dest && moveToward(u, control.dest.x, control.dest.y)) control.dest = null;
  if (u.stuck > 12) { control.dest = null; u.stuck = 0; }
}

// ---------- Monsters & magic ----------
const isEvil = o => !!RACES[o.race].undead || RACES[o.race].wizard === 'evil' || !!RACES[o.race].evil || o.race === 'dragon' || (!!o.traits && o.traits.includes('evil'));

function hurt(u, dmg, cause, by) {
  if (u.dead || u.shield) return;
  u.hp -= dmg;
  u.flash = 3;
  if (by) u.lastHitBy = by.id;
  if (u.hp <= 0) { killUnit(u, cause); if (by) { by.kills++; onKill(by, u); } }
}

function breatheFire(u, prey) {
  u.cd = 25;
  u.dir = prey.x < u.x ? -1 : 1;
  addEffect('beam', u.x, u.y - 1, 0.4, { x2: prey.x, y2: prey.y, color: '#ff7a1f', w: 4 });
  for (let k = 0; k < 6; k++) ignite(Math.floor(prey.x + (rand() - 0.5) * 3), Math.floor(prey.y + (rand() - 0.5) * 3));
  for (const o of life.units) if (o !== u && dist(o.x, o.y, prey.x, prey.y) < 1.8) hurt(o, 20, 'burned by a dragon', u);
}

// Crabzilla's eye lasers: a burning line ending in a blast
function fireLaser(u, prey) {
  u.cd = 30;
  u.dir = prey.x < u.x ? -1 : 1;
  addEffect('beam', u.x, u.y - 2, 0.3, { x2: prey.x, y2: prey.y, color: '#ff2a2a', w: 5 });
  addEffect('explosion', prey.x, prey.y, 0.4, { r: 2 });
  for (const o of life.units) if (o !== u && dist(o.x, o.y, prey.x, prey.y) < 2.2) hurt(o, 80, 'lasered by Crabzilla', u);
  hitBuildingsNear(prey.x, prey.y, 1.5, 60, 'was lasered by Crabzilla');
  for (let k = 0; k < 4; k++) ignite(Math.floor(prey.x + (rand() - 0.5) * 3), Math.floor(prey.y + (rand() - 0.5) * 3));
  powers.shake = Math.max(powers.shake, 3);
}

function updateWizard(u, r) {
  if (u.spell > 0) u.spell--;
  const t = state.tiles[Math.floor(u.y) * state.W + Math.floor(u.x)];
  if (r.wizard === 'doctor') {
    // hunts down the plague: walks to the sick and cures them
    const patient = nearest(u.x, u.y, 20, o => o !== u && o.sick);
    if (patient) {
      if (dist(u.x, u.y, patient.x, patient.y) > 1.5) { moveToward(u, patient.x, patient.y); return; }
      if (!u.spell) {
        u.spell = 15;
        patient.sick = 0;
        patient.immune = true;
        addEffect('puff', patient.x, patient.y - 0.5, 0.8, {});
      }
      return;
    }
  } else if (r.wizard === 'good') {
    // purify the ground, smite evil, heal the hurt
    if (biomeOf(t) === 'corrupt' && rand() < 0.05) {
      for (let k = 0; k < 6; k++) {
        const x = Math.floor(u.x + (rand() - 0.5) * 4), y = Math.floor(u.y + (rand() - 0.5) * 4);
        if (inBounds(x, y) && biomeOf(state.tiles[y * state.W + x]) === 'corrupt') setTile(x, y, inBiome(state.tiles[y * state.W + x], 'grassland'));
      }
    }
    if (!u.spell) {
      const foe = nearest(u.x, u.y, 7, o => o !== u && isEvil(o));
      if (foe) {
        u.spell = 30;
        addEffect('beam', u.x + 0.3, u.y - 1, 0.35, { x2: foe.x, y2: foe.y - 0.5, color: '#bff4ff', w: 3 });
        hurt(foe, 18, `smitten by ${u.name}`, u);
        return;
      }
      const friend = nearest(u.x, u.y, 6, o => o !== u && !!RACES[o.race].civ && (o.sick || o.mad || o.cursed || o.hp < maxHp(o) * 0.6));
      if (friend) {
        u.spell = 40;
        friend.sick = 0; friend.mad = 0; friend.cursed = false; friend.hp = maxHp(friend);
        addEffect('beam', u.x + 0.3, u.y - 1, 0.35, { x2: friend.x, y2: friend.y - 0.5, color: '#ffd34d', w: 2 });
        addEffect('spark', friend.x, friend.y - 0.5, 0.8, {});
      } else if (rand() < 0.01) {
        const ally = nearest(u.x, u.y, 6, o => !!RACES[o.race].civ && !o.shield);
        if (ally) { ally.shield = YEAR; addEffect('ward', ally.x, ally.y - 0.5, 0.8, {}); u.spell = 60; }
      }
    }
  } else {
    // corrupt the ground, burn and curse the living, raise skeletons
    if (isPlant(t) && biomeOf(t) !== 'corrupt' && rand() < 0.02) setTile(Math.floor(u.x), Math.floor(u.y), inBiome(t, 'corrupt'));
    if (!u.spell) {
      const target = nearest(u.x, u.y, 8, o => o !== u && !isEvil(o));
      if (target) {
        u.spell = 45;
        if (rand() < 0.25) {
          target.cursed = true; target.blessed = false; target.hp = Math.min(target.hp, maxHp(target));
          addEffect('beam', u.x + 0.3, u.y - 1, 0.35, { x2: target.x, y2: target.y - 0.5, color: '#a050e0', w: 2 });
          addEffect('hex', target.x, target.y - 0.5, 0.8, {});
        } else {
          addEffect('beam', u.x + 0.3, u.y - 1, 0.35, { x2: target.x, y2: target.y, color: '#ff4040', w: 3 });
          addEffect('explosion', target.x, target.y, 0.4, { r: 1.5 });
          for (const o of life.units) if (o !== u && !isEvil(o) && dist(o.x, o.y, target.x, target.y) < 1.5) hurt(o, 12, `burned by ${u.name}`, u);
          hitBuildingsNear(target.x, target.y, 1, 15, 'was burned by dark magic');
          if (rand() < 0.5) ignite(Math.floor(target.x), Math.floor(target.y));
        }
        return;
      }
      if (rand() < 0.02 && (life.counts.skeleton || 0) < 40) {
        u.spell = 120;
        for (let k = 0; k < 2; k++) {
          const x = u.x + (rand() - 0.5) * 3, y = u.y + (rand() - 0.5) * 3;
          if (walkable(x, y)) { spawnUnit('skeleton', x, y, 1); addEffect('hex', x, y - 0.5, 0.8, {}); }
        }
      }
    }
  }
  wander(u, u.x, u.y, 12);
}

// ---------- Simulation ----------
function lifeTick() {
  for (const u of life.units) { u.px = u.x; u.py = u.y; }
  rebuildGrid();

  const count = life.units.length;   // units born this tick start next tick
  for (let i = 0; i < count; i++) {
    const u = life.units[i];
    if (!u.dead) updateUnit(u);
  }
  for (const v of [...life.villages.values()]) updateVillage(v);
  monolithTick();
  geyserTick();
  if (state.tick % 20 === 0) spawnWildlife();
  if (state.tick % 3 === 0) chatter();
  if (state.tick % 50 === 0) checkAchievements();
  worldTick();
  if (state.tick % 60 === 0) diplomacy();

  if (life.units.some(u => u.dead)) {
    life.units = life.units.filter(u => {
      if (u.dead) life.byId.delete(u.id);
      return !u.dead;
    });
  }
}

function updateUnit(u) {
  const r = RACES[u.race];
  u.age++;
  if (u.age > u.maxAge && laws.aging) return killUnit(u, 'old age');
  const t = state.tiles[Math.floor(u.y) * state.W + Math.floor(u.x)];
  // shielded creatures can't be hurt by anything but time and hunger
  if (u.shield > 0) u.shield--;
  // the land sank under someone who wasn't in a boat (fliers don't care)
  if (r.aquatic) { if (!isWater(t) && !held.has(u.id)) return killUnit(u, 'suffocated on land'); }
  else if (isWater(t) && !u.boat && !u.shield && !r.flies && !r.swims && !held.has(u.id)) return killUnit(u, 'drowned');
  if (t === T.GOO && !u.shield && !r.flies) return killUnit(u, 'consumed by grey goo');
  if (held.has(u.id)) return;   // dangling from the god's hand
  if (t === T.LAVA && !u.shield && !r.flies) return killUnit(u, 'burned in lava');
  if (u.cd > 0) u.cd--;
  if (u.flash > 0) u.flash--;
  if (powers.fire[Math.floor(u.y) * state.W + Math.floor(u.x)] && !u.shield) {
    u.hp -= 2;
    u.flash = 2;
    if (u.hp <= 0) return killUnit(u, 'burned to death');
  }
  if (u.mad > 0) u.mad--;
  // corrupted land drives creatures mad; enchanted land heals them
  const biome = biomeOf(t);
  if (biome === 'corrupt' && !r.undead && !r.monster && !u.blessed && !u.mad && rand() < 0.002) u.mad = YEAR;
  else if (biome === 'enchanted' && u.hp < maxHp(u)) u.hp = Math.min(maxHp(u), u.hp + 0.05);
  else biomeEffect(u, r, biome);
  if (u.traits && u.traits.includes('regenerates') && u.hp < maxHp(u)) u.hp = Math.min(maxHp(u), u.hp + TRAITS.regenerates.regen);
  if (u.sick) {
    u.sick++;
    if (!u.shield) u.hp -= 0.1;
    if (u.hp <= 0) return killUnit(u, 'the plague');
    if (rand() < 0.15) {
      const o = nearest(u.x, u.y, 2.5, o => o !== u && !o.sick && !o.immune && !!RACES[o.race].civ === !!r.civ);
      if (o) o.sick = 1;
    }
    if (u.sick > 200 && rand() < 0.008) { u.sick = 0; u.immune = true; }
  }
  // frozen in a block of ice, stunned or asleep: no thinking this tick
  if (u.frozen > 0) { u.frozen--; return; }
  if (u.stun > 0) { u.stun--; return; }
  if (statusTick(u, r)) return;   // sleep, eggs, poison, moods, auras, desires (traits2.js)
  if (control.id === u.id) return controlStep(u, r);
  if (r.civ) updateCiv(u, r);
  else if (r.wizard) updateWizard(u, r);
  else updateAnimal(u, r);
}

function updateAnimal(u, r) {
  if (r.special && SPECIALS[r.special](u, r)) return;   // monsters and magic folk with their own ways (creatures2.js)
  if (u.race === 'faerie' && rand() < 0.01) {
    const x = Math.floor(u.x), y = Math.floor(u.y), t = state.tiles[y * state.W + x];
    if (isPlant(t) && biomeOf(t) !== 'enchanted' && biomeOf(t) !== 'corrupt') setTile(x, y, inBiome(t, 'enchanted'));
    if (rand() < 0.3) addEffect('spark', u.x, u.y - 0.5, 0.6, {});
  }
  // clever animals (high intellect genes) are far more likely to awaken
  if (laws.sapience && isAdult(u) && rand() < MUTATION_CHANCE * gene(u, 'intellect') ** 4 && awaken(u)) return;
  if (u.mad && r.dmg) {
    const victim = nearest(u.x, u.y, 6, o => o !== u);
    if (victim) { fight(u, victim); return; }
  }
  if (r.prey && !laws.peacefulMonsters) {
    // monsters never starve and are always on the hunt
    if (!r.monster && !r.undead && !r.hero) u.hunger++;
    if (u.hunger > 4 * YEAR && laws.hunger) return killUnit(u, 'starvation');
    if (u.hunger > YEAR || r.monster || r.undead || r.hero) {
      let prey = u.preyId && life.byId.get(u.preyId);
      if (prey && (prey.dead || dist(u.x, u.y, prey.x, prey.y) > 18)) prey = null;
      if (!prey && (state.tick + u.id) % 4 === 0) prey = nearest(u.x, u.y, 16, o => o !== u && o.id !== u.ignore && r.prey.includes(o.race));
      u.preyId = prey ? prey.id : 0;
      if (prey && r.breath && u.cd === 0 && dist(u.x, u.y, prey.x, prey.y) < 5) { breatheFire(u, prey); return; }
      if (prey && r.laser && u.cd === 0 && dist(u.x, u.y, prey.x, prey.y) < 9) { fireLaser(u, prey); return; }
      if (prey) {
        if (fight(u, prey) && prey.dead) u.hunger = 0;
        if (u.stuck > 8) { u.ignore = prey.id; u.stuck = 0; }   // across water, give up on it
        return;
      }
    }
  }
  if (r.flees && r.flees.length) {
    let threat = u.threat && life.byId.get(u.threat);
    if (threat && (threat.dead || dist(u.x, u.y, threat.x, threat.y) > 5)) threat = null;
    if (!threat && (state.tick + u.id) % 3 === 0) threat = nearest(u.x, u.y, 4, o => r.flees.includes(o.race));
    u.threat = threat ? threat.id : 0;
    if (threat) {
      const dx = u.x - threat.x, dy = u.y - threat.y, d = Math.hypot(dx, dy) || 1;
      u.wait = 0;
      u.tx = u.x + (dx / d) * 5;
      u.ty = u.y + (dy / d) * 5;
      moveToward(u, u.tx, u.ty);
      return;
    }
  }
  if (isAdult(u) && u.hunger < YEAR && rand() < r.breed * gene(u, 'fertility') * breedSeason() && life.animals < MAX_ANIMALS &&
      life.counts[u.race] < (state.W * state.H) / (r.cap * ANIMAL_SPREAD)) {
    const mate = nearest(u.x, u.y, 10, o => o !== u && o.race === u.race && isAdult(o));
    if (mate && spawnUnit(u.race, u.x, u.y, 0, [u, mate])) life.counts[u.race]++;
  }
  wander(u, u.x, u.y, r.prey && u.hunger > YEAR ? 20 : 6);   // hungry hunters roam farther
}

function isHostile(u, k, o) {
  if (u.lastHitBy === o.id || u.mad || o.mad) return true;
  if (u.traits && u.traits.includes('pacifist')) return false;   // never starts a fight
  const r = RACES[o.race];
  if (r.wizard === 'evil') return true;
  if (RACES[u.race].hero && (r.monster || r.undead)) return true;
  if (!r.civ) return !laws.peacefulMonsters && !!r.prey && r.prey.includes(u.race);   // only fight animals that hunt people
  return atWar(k, kingdomOf(o));
}

function updateCiv(u, r) {
  const v = u.village ? life.villages.get(u.village) : null;
  if (u.village && !v) { u.village = 0; u.kingdom = 0; u.role = 'worker'; u.task = null; u.carry = null; }
  const adult = isAdult(u);
  const k = kingdomOf(u);

  if (adult) {
    const range = r.hero ? 16 : u.role === 'warrior' || u.mad || laws.angryVillagers ? 10 : 5;
    // keep fighting the same foe; look around for a new one only every few ticks
    let enemy = u.foe && life.byId.get(u.foe);
    if (enemy && (enemy.dead || dist(u.x, u.y, enemy.x, enemy.y) > range + 2 || !isHostile(u, k, enemy))) enemy = null;
    if (!enemy && (state.tick + u.id) % 3 === 0) enemy = nearest(u.x, u.y, range, o => o !== u && isHostile(u, k, o));
    u.foe = enemy ? enemy.id : 0;
    if (enemy) { fight(u, enemy); return; }
  }
  if (!v) return homeless(u, r);
  if (rand() < 0.0005) relearn(u, v);
  if (!adult) return wander(u, v.x, v.y, 4);
  if (u.role === 'warrior' && warMarch(u, k)) return;
  doJob(u, v);
}

function homeless(u, r) {
  if (!isAdult(u)) return wander(u, u.x, u.y, 5);
  // settlers keep their kingdom for a while as they look for a new home
  if (u.kingdom && (!life.kingdoms.has(u.kingdom) || state.tick > u.settleUntil)) {
    u.kingdom = 0;
    u.settleTravel = false;
  }
  if (!u.kingdom) {
    // anyone standing inside a city joins it, whatever its people; otherwise look for their own kind
    const here = life.villages.get(life.owner[Math.floor(u.y) * state.W + Math.floor(u.x)]);
    const v = here || nearestVillage(u.x, u.y, 14, o => o.race === u.race);
    if (v) { joinVillage(u, v); return; }
  }
  if (u.settleTravel) {
    if (moveToward(u, u.tx, u.ty) || u.stuck > 8) { u.settleTravel = false; u.tx = null; u.stuck = 0; }
    return;
  }
  const x = Math.floor(u.x), y = Math.floor(u.y);
  if (rand() < 0.05 && canFound(x, y, u.race)) { foundVillage(u, x, y); return; }
  wander(u, u.x, u.y, 10);
}

// ---------- Villages & kingdoms ----------
function createKingdom(race, x, y) {
  const used = new Set([...life.kingdoms.values()].map(k => k.color));
  const color = KINGDOM_COLORS.find(c => !used.has(c)) || pick(KINGDOM_COLORS);
  const lang = makeLanguage(race);
  const k = {
    id: life.nextId++, race, color, capital: 0, wars: {}, allies: {}, founded: state.tick,
    language: lang.id, name: `${RACES[race].title} of ${nameIn(lang)}`,
  };
  k.culture = makeCulture(race, lang, x, y).id;
  life.kingdoms.set(k.id, k);
  return k;
}

function destroyKingdom(k) {
  life.kingdoms.delete(k.id);
  forgetKingdom(k);
  chronicle(`The ${k.name} has fallen`);
}

function canFound(x, y, race) {
  const { W, H, tiles } = state;
  if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3) return false;
  if (!RACES[race].home.includes(tiles[y * W + x])) return false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const i = (y + dy) * W + x + dx;
      if (!buildable(tiles[i]) || life.bmap[i] || life.owner[i]) return false;
    }
  }
  for (let dy = -6; dy <= 6; dy += 2) {
    for (let dx = -6; dx <= 6; dx += 2) {
      if (inBounds(x + dx, y + dy) && life.owner[(y + dy) * W + x + dx]) return false;
    }
  }
  for (const v of life.villages.values()) if (dist(v.x, v.y, x, y) < 16) return false;
  return true;
}

function foundVillage(u, x, y) {
  let k = u.kingdom && life.kingdoms.get(u.kingdom);
  const isNew = !k;
  if (!k) k = createKingdom(u.race, x, y);
  const v = {
    id: life.nextId++, name: nameIn(languageOf(k)), race: u.race, kingdom: k.id, religion: religionOfKingdom(k),
    x: x + 0.5, y: y + 0.5, food: 8, wood: 6, stone: 0, radius: 5,
    houses: 0, hall: 0, empty: 0, pop: 0, adults: 0, warriors: 0, founded: state.tick,
  };
  life.villages.set(v.id, v);
  if (!k.capital) k.capital = v.id;
  v.hall = addBuilding(v, 'hall', x - 1, y - 1, 3, 3).id;
  claimTerritory(v);
  joinVillage(u, v);
  for (const o of life.units) {
    if (!o.dead && !o.village && !o.kingdom && o.race === u.race && dist(o.x, o.y, u.x, u.y) < 6) joinVillage(o, v);
  }
  chronicle(isNew ? `${u.name} founded the ${k.name}` : `Settlers founded ${v.name}`);
}

function joinVillage(u, v) {
  u.village = v.id;
  u.kingdom = v.kingdom;
  u.settleTravel = false;
  u.tx = null;
  u.task = null;
  u.role = rand() < 0.15 ? 'warrior' : 'worker';
  learnWays(u, v);
}

function addBuilding(v, type, x, y, w, h) {
  const hp = type === 'hall' ? 150 : 60;
  const b = { id: life.nextId++, type, village: v.id, x, y, w, h, hp, maxHp: hp, flash: 0 };
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) life.bmap[(y + dy) * state.W + x + dx] = b.id;
  life.buildings.set(b.id, b);
  if (type === 'house') v.houses++;
  return b;
}

function removeBuilding(b) {
  if (b.type !== 'bonfire') addRuin(b);
  for (let dy = 0; dy < b.h; dy++) {
    for (let dx = 0; dx < b.w; dx++) {
      const i = (b.y + dy) * state.W + b.x + dx;
      if (life.bmap[i] === b.id) life.bmap[i] = 0;
    }
  }
  life.buildings.delete(b.id);
  const v = life.villages.get(b.village);
  if (v && b.type === 'house') v.houses--;
}

function claimTerritory(v) {
  const { W, tiles } = state;
  const r = v.radius, cx = Math.floor(v.x), cy = Math.floor(v.y);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const x = cx + dx, y = cy + dy;
      if (!inBounds(x, y)) continue;
      const i = y * W + x;
      const prev = life.owner[i] && life.villages.get(life.owner[i]);
      // with Stealing Borders, cities grab land from enemies they're at war with
      if ((!life.owner[i] || (laws.stealingBorders && prev && atWar(v.kingdom, prev.kingdom))) && !isWater(tiles[i])) life.owner[i] = v.id;
    }
  }
  life.territoryDirty = true;
}

function destroyVillage(v, reason) {
  for (const b of [...life.buildings.values()]) if (b.village === v.id) removeBuilding(b);
  for (let i = 0; i < life.owner.length; i++) if (life.owner[i] === v.id) life.owner[i] = 0;
  life.villages.delete(v.id);
  life.territoryDirty = true;
  for (const u of life.units) {
    if (u.village !== v.id) continue;
    u.village = 0; u.kingdom = 0; u.role = 'worker'; u.task = null; u.carry = null;
  }
  chronicle(`${v.name} ${reason}`);
  const k = life.kingdoms.get(v.kingdom);
  if (!k) return;
  const rest = villagesOf(k.id);
  if (!rest.length) destroyKingdom(k);
  else if (k.capital === v.id) k.capital = rest[0].id;
}

// Taking a kingdom's capital takes the whole kingdom: every one of its cities
// changes hands and the old kingdom ends. Any other city changes hands alone.
function captureVillage(v, kid) {
  const oldK = life.kingdoms.get(v.kingdom), newK = life.kingdoms.get(kid);
  const wasCapital = oldK && oldK.capital === v.id;
  const taken = wasCapital ? villagesOf(oldK.id) : [v];
  if (wasCapital) rulersFlee(oldK, taken, kid);
  for (const c of taken) {
    const hall = life.buildings.get(c.hall);
    if (hall && c === v) hall.hp = hall.maxHp / 2;
    c.kingdom = kid;
    for (const u of life.units) {
      if (u.village !== c.id) continue;
      u.role = 'worker'; u.task = null; u.warTarget = 0; u.lastHitBy = 0;
    }
  }
  life.territoryDirty = true;
  chronicle(wasCapital && taken.length > 1
    ? `${newK.name} took the capital ${v.name}, and all ${taken.length} cities of the ${oldK.name} with it`
    : `${newK.name} captured ${v.name}`);
  if (!oldK) return;
  if (!villagesOf(oldK.id).length) destroyKingdom(oldK);
}

// When a capital falls, its ruler and the lords of its cities run to the nearest
// city of an allied kingdom (if there is one) and give up their titles. Their
// close families (the royal family, for the ruler) living in those cities go too.
function rulersFlee(oldK, taken, kid) {
  const allies = Object.keys(alliesOf(oldK)).map(id => life.kingdoms.get(+id)).filter(a => a && a.id !== kid);
  if (!allies.length) return;
  const inTaken = u => u && !u.dead && taken.some(c => c.id === u.village);
  const king = oldK.king && life.byId.get(oldK.king);
  const rulers = [king, ...taken.map(c => c.lord && life.byId.get(c.lord))]
    .filter((u, i, all) => inTaken(u) && all.indexOf(u) === i);
  const fled = new Set();
  for (const u of rulers) {
    if (fled.has(u)) continue;
    const refuge = nearestVillage(u.x, u.y, Infinity, o => allies.some(a => a.id === o.kingdom));
    if (!refuge) continue;
    const party = [u, ...closeFamily(u).filter(o => inTaken(o) && !fled.has(o))];
    for (const o of party) {
      for (const c of taken) if (c.lord === o.id) c.lord = 0;
      if (o === king) { oldK.king = 0; o.king = 0; }
      joinVillage(o, refuge);   // they walk (or sail) there
      o.role = 'worker';
      fled.add(o);
    }
    const kin = party.length - 1;
    chronicle(`🏃 ${u.name}${kin ? ` and ${kin} of ${u === king ? 'the royal family' : 'their family'}` : ''} fled the fall of the ${oldK.name} to ${refuge.name} in the ${life.kingdoms.get(refuge.kingdom).name}`);
  }
}

// partner, parents, children, grandchildren, brothers and sisters
function closeFamily(u) {
  const parents = u.parents || [];
  const kids = new Set(life.units.filter(o => !o.dead && o.parents && o.parents.includes(u.id)).map(o => o.id));
  return life.units.filter(o => !o.dead && o !== u && (
    o.id === u.love || o.love === u.id || parents.includes(o.id) || kids.has(o.id) ||
    (o.parents && o.parents.some(p => kids.has(p) || parents.includes(p)))));
}

function updateVillage(v) {
  if ((state.tick + v.id) % 10) return;
  const hall = life.buildings.get(v.hall);
  if (!hall) return destroyVillage(v, 'was destroyed');
  if (v.pop === 0) {
    v.empty += 10;
    if (v.empty > 2 * YEAR) destroyVillage(v, 'was abandoned');
    return;
  }
  v.empty = 0;

  // everyone eats one food a year
  v.food -= v.pop / 12;
  if (v.food < 0) {
    v.food = 0;
    const hungry = pickResident(v);
    if (hungry && laws.hunger && (hungry.hp -= 4) <= 0) killUnit(hungry, 'starvation');
  }
  if (hall.hp < hall.maxHp) hall.hp = Math.min(hall.maxHp, hall.hp + 2);
  updateFaith(v);
  craftGear(v);
  cityTick(v);   // special buildings, money, walls (cities.js)

  const capacity = Math.min(6 + v.houses * 4, laws.hundredPeople ? 100 : Infinity);
  const birthRate = laws.births * (life.kingdoms.get(v.kingdom)?.goldenUntil > state.tick ? 2 : 1);
  if (laws.civBabies && v.pop < capacity && v.adults >= 2 && v.food > 3 && rand() < Math.min(0.5, 0.05 * v.adults * birthRate)) {
    // in mixed cities babies take after their mother, and she looks for a father of her own kind
    const mom = pickResident(v, isAdult);
    const dad = mom && (pickResident(v, o => isAdult(o) && o !== mom && o.race === mom.race) || pickResident(v, o => isAdult(o) && o !== mom));
    const baby = spawnUnit(mom ? mom.race : v.race, v.x, v.y + 1.5, 0, [mom, dad]);
    if (baby) {
      joinVillage(baby, v);
      baby.role = 'worker';
      bornInto(baby, mom, dad);
      v.food -= 2;
      v.pop++;
    }
  }

  const houseCost = kingdomHas(v, 'builders') ? 5 : 8;
  if (v.pop >= capacity - 2 && (v.wood >= houseCost || v.stone >= houseCost)) {
    const spot = findHouseSpot(v);
    if (spot) {
      if (v.wood >= houseCost) v.wood -= houseCost; else v.stone -= houseCost;
      addBuilding(v, 'house', spot.x, spot.y, 2, 2);
      const r = Math.min(16, 5 + Math.floor(v.houses * 0.7));
      if (r > v.radius) { v.radius = r; claimTerritory(v); }
    }
  }

  if (!v.dock && v.pop >= (kingdomHas(v, 'seafarers') ? 4 : 8) && v.wood >= 10 && rand() < 0.2) {
    const spot = findDockSpot(v);
    if (spot) {
      v.wood -= 10;
      addBuilding(v, 'dock', spot.x, spot.y, 2, 2);
      v.dock = true;
    }
  }

  // keep a few guards in peacetime, raise an army in war
  const k = life.kingdoms.get(v.kingdom);
  const war = k && Object.keys(k.wars).length > 0;
  const want = Math.round(v.adults * (war ? 0.4 : 0.1));
  if (v.warriors < want) {
    const u = pickResident(v, o => isAdult(o) && o.role === 'worker');
    if (u) { u.role = 'warrior'; u.task = null; }
  } else if (v.warriors > want + 1) {
    const u = pickResident(v, o => o.role === 'warrior');
    if (u) u.role = 'worker';
  }

  if (v.pop >= 18 && v.food > 10 && rand() < 0.08) sendSettlers(v);
}

function houseFits(v, x, y) {
  const { W, tiles } = state;
  for (let dy = -1; dy <= 2; dy++) {
    for (let dx = -1; dx <= 2; dx++) {
      const tx = x + dx, ty = y + dy;
      if (!inBounds(tx, ty)) return false;
      const i = ty * W + tx;
      if (life.bmap[i]) return false;
      const edge = dx < 0 || dy < 0 || dx > 1 || dy > 1;
      if (!edge && (life.owner[i] !== v.id || !buildable(tiles[i]))) return false;
    }
  }
  return true;
}

function findHouseSpot(v) {
  let best = null, bd = Infinity;
  for (let i = 0; i < 40; i++) {
    const a = rand() * Math.PI * 2, r = 2.5 + rand() * Math.max(1, v.radius - 2);
    const x = Math.floor(v.x + Math.cos(a) * r), y = Math.floor(v.y + Math.sin(a) * r);
    if (!houseFits(v, x, y)) continue;
    const d = dist(v.x, v.y, x + 1, y + 1);
    if (d < bd) { bd = d; best = { x, y }; }
  }
  return best;
}

// A dock goes on the village's own shore, next to water big enough to sail.
function findDockSpot(v) {
  const { W, tiles } = state;
  for (let i = 0; i < 60; i++) {
    const a = rand() * Math.PI * 2, r = 2 + rand() * (v.radius + 1);
    const x = Math.floor(v.x + Math.cos(a) * r), y = Math.floor(v.y + Math.sin(a) * r);
    if (!houseFits(v, x, y)) continue;
    let deep = 0;
    for (let dy = -2; dy <= 3; dy++) {
      for (let dx = -2; dx <= 3; dx++) {
        if (inBounds(x + dx, y + dy) && isWater(tiles[(y + dy) * W + x + dx])) deep++;
      }
    }
    if (deep >= 6) return { x, y };
  }
  return null;
}

function sendSettlers(v) {
  if (!laws.expansion) return;
  const spots = [];
  for (let i = 0; i < 30 && spots.length < 8; i++) {
    // seafaring kingdoms look much farther, across the water
    const a = rand() * Math.PI * 2, r = 18 + rand() * (life.sailing.has(v.kingdom) ? 50 : 16);
    const x = Math.floor(v.x + Math.cos(a) * r), y = Math.floor(v.y + Math.sin(a) * r);
    if (inBounds(x, y) && walkable(x, y) && RACES[v.race].home.includes(state.tiles[y * state.W + x])) spots.push({ x: x + 0.5, y: y + 0.5 });
  }
  // settlers would rather live by a river (rivers.js)
  const target = spots.find(p => nearRiver(Math.floor(p.x), Math.floor(p.y), 4)) || spots[0];
  if (!target) return;
  let n = 0;
  for (const u of life.units) {
    if (n >= 3) break;
    if (u.dead || u.village !== v.id || !isAdult(u) || u.role === 'warrior') continue;
    u.village = 0;
    u.kingdom = v.kingdom;
    u.settleTravel = true;
    u.settleUntil = state.tick + 3 * YEAR;
    u.tx = target.x; u.ty = target.y;
    u.task = null; u.carry = null;
    n++;
  }
}

// ---------- Work ----------
// grazing animals villagers can hunt for meat
const isGame = o => { const r = RACES[o.race]; return !r.civ && !r.prey && !r.wizard && !r.monster && !r.undead && o.race !== 'unicorn' && o.race !== 'faerie'; };

function chooseTask(u, v) {
  // where farming is poor (desert, tundra, rock), people live by hunting
  const ground = biomeOf(state.tiles[Math.floor(v.y) * state.W + Math.floor(v.x)]);
  const poor = !ground || ground === 'desert' || ground === 'tundra' || ground === 'corrupt';
  if (v.food < v.pop * 2 && rand() < (poor ? 0.5 : 0.1)) {
    const prey = nearest(v.x, v.y, v.radius + 12, isGame);
    if (prey) return { type: 'hunt', prey: prey.id, time: 0 };
  }
  let type;
  if (v.food < v.pop * 1.5 + 4 && rand() < 0.75) type = 'farm';
  else if (v.wood < 16 && rand() < 0.7) type = 'wood';
  else if (u.race === 'dwarf' && rand() < 0.4) type = 'stone';
  else type = pick(['farm', 'farm', 'wood', 'stone', 'idle']);
  if (type !== 'idle') {
    const spot = findResource(v, type);
    if (spot) return { type, x: spot.x, y: spot.y, time: 0, work: 0 };
  }
  return { type: 'idle', time: 0 };
}

function findResource(v, type) {
  const { W, tiles } = state;
  const range = type === 'farm' ? v.radius : v.radius + 8;
  let best = null, bd = Infinity;
  for (let i = 0; i < 40; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * range;
    const x = Math.floor(v.x + Math.cos(a) * r), y = Math.floor(v.y + Math.sin(a) * r);
    if (!inBounds(x, y)) continue;
    const j = y * W + x, t = tiles[j], owner = life.owner[j];
    let d = dist(v.x, v.y, x, y);
    if (type === 'farm') {
      if (owner !== v.id || life.bmap[j]) continue;
      // prefer working existing fields, then clearing grass, then hills and forest
      if (isFertile(t)) d += 6;
      else if (farmable(t)) d += 12;
      else if (t !== T.FARM && t !== T.BUSH) continue;
    } else if (type === 'wood') {
      if (!isTree(t) || (owner && owner !== v.id)) continue;
    } else if (t !== T.HILLS && t !== T.MOUNTAIN && !TILES[t].ore || (owner && owner !== v.id)) continue;
    else if (TILES[t].ore) d -= 8;   // miners go for ore veins first
    if (d < bd) { bd = d; best = { x, y }; }
  }
  return best;
}

function doJob(u, v) {
  if (u.carry) {
    if (dist(u.x, u.y, v.x, v.y) < 2 || u.stuck > 8) {
      v[u.carry.type] += u.carry.n;
      u.carry = null;
      u.stuck = 0;
      return;
    }
    moveToward(u, v.x, v.y);
    return;
  }
  if (!u.task) u.task = chooseTask(u, v);
  const t = u.task;
  t.time++;
  if (t.time > 600 || u.stuck > 8) { u.task = null; u.stuck = 0; return; }
  if (t.type === 'hunt') {
    const prey = life.byId.get(t.prey);
    if (!prey || prey.dead) {
      u.task = null;
      if (prey && prey.cause.includes(u.name)) u.carry = { type: 'food', n: 6 };
      return;
    }
    fight(u, prey);
    return;
  }
  if (t.type === 'idle') {
    wander(u, v.x, v.y, v.radius);
    if (t.time > 60) u.task = null;
    return;
  }
  if (dist(u.x, u.y, t.x + 0.5, t.y + 0.5) > 0.8) { moveToward(u, t.x + 0.5, t.y + 0.5); return; }
  const tool = toolOf(u).job === t.type;
  if (++t.work < (tool ? 13 : 25) / (gene(u, 'intellect') * cultureMult(u, 'scholars', 1.25))) return;

  u.task = null;
  const tile = state.tiles[t.y * state.W + t.x];
  const bonus = tool ? 1.5 : 1;
  if (t.type === 'farm' && tile === T.BUSH) {
    // fruit bushes are picked, not plowed
    u.carry = { type: 'food', n: Math.round(4 * bonus) };
    if (rand() < 0.15) setTile(t.x, t.y, localGround(t.x, t.y));
  } else if (t.type === 'farm') {
    if (farmable(tile) && !life.bmap[t.y * state.W + t.x]) {
      setTile(t.x, t.y, T.FARM);
      u.carry = { type: 'food', n: 2 };
    }
    else if (tile === T.FARM) {
      const golden = life.kingdoms.get(v.kingdom)?.goldenUntil > state.tick ? 1.5 : 1;
      u.carry = { type: 'food', n: Math.round(7 * bonus * golden * harvestSeason() * cultureMult(u, 'farmers', 1.3) * (v.has && v.has.windmill ? 1.25 : 1)) };
    }
  } else if (t.type === 'wood' && isTree(tile)) {
    u.carry = { type: 'wood', n: Math.round(3 * bonus) };
    if (rand() < 0.35) setTile(t.x, t.y, BIOMES[biomeOf(tile)].ground);
  } else if (t.type === 'stone' && (tile === T.HILLS || tile === T.MOUNTAIN)) {
    u.carry = { type: 'stone', n: Math.round(2 * bonus) };
  } else if (t.type === 'stone' && TILES[tile].ore) {
    // ore veins give stone plus a metal for the smithy, and run out
    const metal = TILES[tile].ore;
    u.carry = { type: 'stone', n: Math.round(3 * bonus) };
    if (metal !== 'stone') (v.metals ||= {})[metal] = (v.metals[metal] || 0) + 1;
    if (rand() < 0.15) setTile(t.x, t.y, T.HILLS);
  }
}

// ---------- War ----------
function warMarch(u, k) {
  if (state.tick < u.noWarUntil) return false;
  if (armyOrders(u, k)) return true;   // gathering or marching with the army (politics.js)
  let target = u.warTarget && life.villages.get(u.warTarget);
  if (!target || !atWar(k, target.kingdom)) {
    target = nearestVillage(u.x, u.y, 90, o => atWar(k, o.kingdom));
    u.warTarget = target ? target.id : 0;
  }
  if (!target) return false;
  const hall = life.buildings.get(target.hall);
  if (!hall) return false;
  const hx = hall.x + 1.5, hy = hall.y + 1.5;
  if (dist(u.x, u.y, hx, hy) > 2.2) {
    moveToward(u, hx, hy);
    // a wall in the way: hack at it
    if (u.stuck > 4 && u.cd === 0) {
      const ax = Math.floor(u.x + Math.sign(hx - u.x)), ay = Math.floor(u.y + Math.sign(hy - u.y));
      for (const [wx, wy] of [[ax, Math.floor(u.y)], [Math.floor(u.x), ay], [ax, ay]]) {
        if (inBounds(wx, wy) && isWall(state.tiles[wy * state.W + wx])) { hitWall(wx, wy, RACES[u.race].dmg); u.cd = 8; u.stuck = 5; break; }
      }
    }
    if (u.stuck > 8) {
      // can't get there (another island) - go back to work for a while
      u.stuck = 0;
      u.warTarget = 0;
      u.noWarUntil = state.tick + 2 * YEAR;
    }
    return true;
  }
  if (u.cd === 0) {
    u.cd = 8;
    hall.hp -= RACES[u.race].dmg;
    hall.flash = 3;
    if (hall.hp <= 0) captureVillage(target, k);
  }
  return true;
}

// The terrain under buildings or territory changed (painting, chopping, lava).
function onTileChanged(x, y, t) {
  if (!life.bmap) return;
  const i = y * state.W + x;
  const b = life.bmap[i] && life.buildings.get(life.bmap[i]);
  if (b && !buildable(t)) {
    const v = life.villages.get(b.village);
    if (b.type === 'hall' && v) destroyVillage(v, 'was destroyed');
    else removeBuilding(b);
  }
  if (life.owner[i] && isWater(t)) {
    life.owner[i] = 0;
    life.territoryDirty = true;
  }
}

// ---------- Sprites ----------
const spriteCache = new Map();

function makeSprite(rows, palette, flip) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const color = palette[rows[y][x]];
      if (!color) continue;
      g.fillStyle = color;
      g.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
  }
  return c;
}

function cached(key, build) {
  let s = spriteCache.get(key);
  if (!s) { s = build(); spriteCache.set(key, s); }
  return s;
}

function unitSprite(race, cloth, gear, flip, flash) {
  return cached(`u|${race}|${cloth}|${gearKey(gear)}|${flip}|${flash}`, () => {
    const r = RACES[race];
    const pal = gearPalette({ ...r.colors, c: cloth, l: '#3a2f2a', m: '#c9ced6' }, gear);
    if (flash) for (const k in pal) pal[k] = '#ffffff';
    return detailed(refineSprite(makeSprite(r.drawsGear ? r.art : gearArt(r.art, gear), pal, flip)), r);
  });
}

// art drawn at higher detail (`detail` art pixels per old one) covers less screen per pixel
function detailed(spr, r) {
  spr.res *= r.detail || 1;
  return spr;
}

// Creatures are drawn with pixels half the size: the sprite is doubled with
// Scale2x (which rounds off staircase edges), then shaded with a highlight on
// top, a shadow underneath and a thin outline. `res` tells the drawing code
// how many sprite pixels make up one original art pixel.
function refineSprite(src, passes = 2) {
  let w = src.width, h = src.height;
  const s = src.getContext('2d').getImageData(0, 0, w, h);
  let p = new Uint32Array(s.data.buffer);
  // Scale2x, run `passes` times: each pass doubles the pixels and rounds off staircases
  for (let n = 0; n < passes; n++) {
    const q = p, qw = w, qh = h;
    const at = (x, y) => (x < 0 || y < 0 || x >= qw || y >= qh ? 0 : q[y * qw + x]);
    w = qw * 2; h = qh * 2;
    p = new Uint32Array(w * h);
    for (let y = 0; y < qh; y++) {
      for (let x = 0; x < qw; x++) {
        const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
        const o = y * 2 * w + x * 2;
        p[o] = C === A && C !== D && A !== B ? A : P;
        p[o + 1] = A === B && A !== C && B !== D ? B : P;
        p[o + w] = D === C && D !== B && C !== A ? C : P;
        p[o + w + 1] = B === D && B !== A && D !== C ? D : P;
      }
    }
  }
  const W = w + 2, H = h + 2;   // one pixel of room for the outline
  const out = new Uint32Array(W * H);
  for (let y = 0; y < h; y++) out.set(p.subarray(y * w, y * w + w), (y + 1) * W + 1);
  // shade: lit from above, darker underneath, outlined
  const solid = i => (out[i] >>> 24) > 0;
  const shaded = new Uint32Array(out);
  const tone = (c, f) => {
    const r = Math.min(255, (c & 255) * f), g = Math.min(255, ((c >>> 8) & 255) * f), b = Math.min(255, ((c >>> 16) & 255) * f);
    return ((c & 0xff000000) | (b << 16) | (g << 8) | r) >>> 0;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (solid(i)) {
        if (y > 0 && !solid(i - W)) shaded[i] = tone(out[i], 1.18);
        else if (y < H - 1 && !solid(i + W)) shaded[i] = tone(out[i], 0.72);
      } else if ((x > 0 && solid(i - 1)) || (x < W - 1 && solid(i + 1)) || (y > 0 && solid(i - W)) || (y < H - 1 && solid(i + W))) {
        shaded[i] = 0x8c141414;   // soft dark outline
      }
    }
  }
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  new Uint32Array(img.data.buffer).set(shaded);
  g.putImageData(img, 0, 0);
  c.res = 2 ** passes;
  return c;
}

const BOAT_ART = [
  '....m....',
  '...fm....',
  '..ffm....',
  '.fffm....',
  '....m....',
  'nhhhhhhhn',
  '.hhhhhhh.',
];

function boatSprite(sail, flip, flash) {
  return cached(`boat|${sail}|${flip}|${flash}`, () => {
    const pal = { m: '#3a2f2a', f: sail, h: '#6b4423', n: '#8a5a30' };
    if (flash) for (const k in pal) pal[k] = '#ffffff';
    return refineSprite(makeSprite(BOAT_ART, pal, flip));
  });
}

const BUILDING_ART = {
  hall: [
    '.....pff....',
    '.....pfff...',
    '.....p......',
    '....rrrr....',
    '...rrrrrr...',
    '..rrrrrrrr..',
    '.rrrrrrrrrr.',
    'rrrrrrrrrrrr',
    '.wwwwwwwwww.',
    '.wkwwwwwwkw.',
    '.wwwwddwwww.',
    '.wwwwddwwww.',
  ],
  dock: [
    '..rrrr..',
    '.rrrrrr.',
    'rrrrrrrr',
    '.wwddww.',
    '.wwddww.',
    'nnnnnnnn',
    'o.o.o.o.',
    'nnnnnnnn',
  ],
  house: [
    '...rr...',
    '..rrrr..',
    '.rrrrrr.',
    'rrrrrrrr',
    '.wwwwww.',
    '.wkwwkw.',
    '.wwddww.',
    '.wwddww.',
  ],
};

function buildingSprite(type, race, flag, flash) {
  return cached(`b|${type}|${race}|${flag}|${flash}`, () => {
    const r = RACES[race];
    const pal = { r: r.roof, w: r.wall, d: '#3b2a1f', k: '#ffd76a', p: '#3a2f2a', f: flag, n: '#7a5532', o: '#5a3d22' };
    if (flash) pal.w = pal.r = '#ffffff';
    return refineSprite(makeSprite(BUILDING_ART[type], pal, false));
  });
}

const MONOLITH_ART = [
  '..ss..',
  '.shhs.',
  '.shhs.',
  '.sgss.',
  '.shgs.',
  '.sgss.',
  '.shhs.',
  '.shgs.',
  '.sgss.',
  '.shhs.',
  'ssssss',
  'dddddd',
];

function monolithSprite(lit) {
  return cached(`monolith|${lit}`, () =>
    refineSprite(makeSprite(MONOLITH_ART, { s: '#2b2a33', h: '#45434f', g: lit ? '#bff4ff' : '#3f6f80', d: '#1a1920' }, false)));
}

const GEYSER_ART = [
  '..rrrr..',
  '.rppppr.',
  'rppddppr',
  '.rrrrrr.',
];

function geyserSprite(acid, lit) {
  const pool = acid ? (lit ? '#d4ff7a' : '#8fd630') : (lit ? '#bfe6ff' : '#4fa3e0');
  return cached(`geyser|${acid}|${lit}`, () =>
    refineSprite(makeSprite(GEYSER_ART, { r: '#6b6470', p: pool, d: acid ? '#4d7a12' : '#24618f' }, false)));
}

function raceIcon(race) {
  return cached(`icon|${race}`, () => {
    const r = RACES[race];
    return makeSprite(r.art, { ...r.colors, c: '#8d8d8d', l: '#3a2f2a' }, false);
  }).toDataURL();
}

// ---------- Rendering ----------
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rebuildOverlay() {
  const { W, H } = state;
  const owner = life.owner;
  // villages are grouped and colored by the current map layer (ui2.js)
  const kingdomOfVillage = new Map();
  const rgb = new Map();
  for (const v of life.villages.values()) {
    const g = overlayGroup(v);
    if (!g) continue;
    kingdomOfVillage.set(v.id, g[0]);
    if (!rgb.has(g[0])) rgb.set(g[0], hexToRgb(g[1]));
  }
  // which group owns each tile, smoothed with two Scale2x passes to SUB × SUB
  let w = W, h = H;
  let km = new Int32Array(W * H);
  for (let i = 0; i < W * H; i++) km[i] = owner[i] ? kingdomOfVillage.get(owner[i]) || 0 : 0;
  for (let n = 0; n < 2; n++) {
    const q = km, qw = w, qh = h;
    w *= 2; h *= 2;
    km = new Int32Array(w * h);
    for (let y = 0; y < qh; y++) {
      for (let x = 0; x < qw; x++) {
        const i = y * qw + x, P = q[i];
        const A = y > 0 ? q[i - qw] : P, D = y < qh - 1 ? q[i + qw] : P;
        const C = x > 0 ? q[i - 1] : P, B = x < qw - 1 ? q[i + 1] : P;
        const o = y * 2 * w + x * 2;
        km[o] = C === A && C !== D && A !== B ? A : P;
        km[o + 1] = A === B && A !== C && B !== D ? B : P;
        km[o + w] = D === C && D !== B && C !== A ? C : P;
        km[o + w + 1] = B === D && B !== A && D !== C ? D : P;
      }
    }
  }
  // a faint fill, and a border two fine pixels wide where the owner changes
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : km[y * w + x]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, k = km[i];
      const c = k && rgb.get(k);
      if (!c) { opix[i] = 0; continue; }
      const border = at(x - 1, y) !== k || at(x + 1, y) !== k || at(x, y - 1) !== k || at(x, y + 1) !== k ||
        at(x - 2, y) !== k || at(x + 2, y) !== k || at(x, y - 2) !== k || at(x, y + 2) !== k;
      const a = border ? 220 : 55;
      opix[i] = ((a << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
    }
  }
  octx.putImageData(oimg, 0, 0);
  life.territoryDirty = false;
  lastOverlay = performance.now();
}

function drawLife(ox, oy, z) {
  if (life.territoryDirty && performance.now() - lastOverlay > 150) rebuildOverlay();
  ctx.drawImage(overlayCanvas, ox, oy, state.W * z, state.H * z);

  const vx0 = -ox / z - 4, vy0 = -oy / z - 4;
  const vx1 = (view.width - ox) / z + 4, vy1 = (view.height - oy) / z + 4;
  const s = Math.max(1, Math.round(z / 4));     // screen pixels per sprite pixel

  for (const b of life.buildings.values()) {
    if (b.x + b.w < vx0 || b.x > vx1 || b.y + b.h < vy0 || b.y > vy1) continue;
    const v = life.villages.get(b.village);
    const k = v && life.kingdoms.get(v.kingdom);
    const spr = buildingSprite(b.type, v.race, k ? k.color : '#888888', b.flash > 0, v.tier, b.type === 'temple' ? life.religions.get(v.religion)?.color : undefined);
    if (b.flash > 0) b.flash--;
    const w = spr.width * s / (spr.res || 1), h = spr.height * s / (spr.res || 1);
    ctx.drawImage(spr, Math.round(ox + (b.x + b.w / 2) * z - w / 2), Math.round(oy + (b.y + b.h) * z - h), w, h);
  }

  for (const m of life.monoliths) {
    if (m.x < vx0 || m.x > vx1 || m.y < vy0 || m.y > vy1) continue;
    const spr = monolithSprite(m.glow > 0.3);
    m.glow = Math.max(0, m.glow - 0.02);
    const w = spr.width * s / (spr.res || 1), h = spr.height * s / (spr.res || 1);
    ctx.drawImage(spr, Math.round(ox + (m.x + 0.5) * z - w / 2), Math.round(oy + (m.y + 1) * z - h), w, h);
  }

  for (const g of life.geysers) {
    if (g.x < vx0 || g.x > vx1 || g.y < vy0 || g.y > vy1) continue;
    const spr = geyserSprite(g.acid, g.erupt > 0);
    const w = spr.width * s / (spr.res || 1), h = spr.height * s / (spr.res || 1);
    ctx.drawImage(spr, Math.round(ox + (g.x + 0.5) * z - w / 2), Math.round(oy + (g.y + 1) * z - h), w, h);
  }

  const a = state.speed > 0 ? simAlpha : 1;
  const list = [];
  for (const u of life.units) {
    if (u.dead) continue;
    const x = u.px + (u.x - u.px) * a, y = u.py + (u.y - u.py) * a;
    if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
    list.push({ u, x, y });
  }
  list.sort((p, q) => p.y - q.y);

  const sel = life.selected;
  for (const { u, x, y } of list) {
    const r = RACES[u.race];
    const k = r.civ && life.kingdoms.get(kingdomOf(u));
    const flip = r.facesLeft ? u.dir > 0 : u.dir < 0;
    const spr = u.boat && r.civ ? boatSprite(k ? k.color : '#e8e2d0', u.dir < 0, u.flash > 0)
      : unitSprite(u.race, k ? k.color : '#8d8d8d', gearOf(u), flip, u.flash > 0, subOf(u)?.tint);
    const sc = Math.max(1, Math.round((isAdult(u) ? s : s * 0.7) * sizeMult(u)));
    // refined sprites have several pixels per art pixel (spr.res), so each covers less screen
    const w = spr.width * sc / (spr.res || 1), h = spr.height * sc / (spr.res || 1);
    const sx = Math.round(ox + x * z - w / 2), sy = Math.round(oy + y * z - h);
    if (sel && sel.unit === u) {
      ctx.strokeStyle = '#ffd34d';
      ctx.lineWidth = Math.max(1, dpr);
      ctx.strokeRect(sx - 2 * dpr, sy - 2 * dpr, w + 4 * dpr, h + 4 * dpr);
    }
    ctx.drawImage(spr, sx, sy, w, h);
    hitboxes.set(u, [sx, sy, w, h]);
    if (u.shield) {
      ctx.strokeStyle = 'rgba(127,224,255,0.8)';
      ctx.lineWidth = Math.max(1, dpr);
      ctx.beginPath();
      ctx.arc(sx + w / 2, sy + h / 2, Math.max(w, h) * 0.75, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (control.id === u.id) {
      // a bouncing arrow over the creature you control
      const bob = Math.round(Math.sin(performance.now() / 150) * sc);
      ctx.fillStyle = '#ffd34d';
      ctx.beginPath();
      ctx.moveTo(sx + w / 2 - 3 * sc, sy - 7 * sc + bob);
      ctx.lineTo(sx + w / 2 + 3 * sc, sy - 7 * sc + bob);
      ctx.lineTo(sx + w / 2, sy - 3 * sc + bob);
      ctx.fill();
    }
    drawStatusIcons(u, sx, sy, w, h, sc);
    const status = u.mad ? '#ff3b3b' : u.sick ? '#7ee05a' : u.cursed ? '#a050e0' : u.blessed ? '#ffd34d' : null;
    if (status) {
      ctx.fillStyle = status;
      ctx.fillRect(sx + w / 2 - sc, sy - 3 * sc, 2 * sc, 2 * sc);
    }
  }

  drawSpeech(list, ox, oy, z, s);
  drawVillageLabels(ox, oy, z, s);
}

function drawSpeech(list, ox, oy, z, s) {
  if (s < 2) return;   // too far out to read
  const fs = Math.round(9 * dpr);
  ctx.font = `${fs}px ui-monospace, Menlo, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const { u, x, y } of list) {
    if (!u.say || state.tick > u.sayUntil) continue;
    const tw = ctx.measureText(u.say).width, pad = 3 * dpr;
    const bx = Math.round(ox + x * z - tw / 2 - pad), by = Math.round(oy + y * z - 12 * s - fs - pad * 3);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(bx, by, tw + pad * 2, fs + pad * 2);
    ctx.fillRect(Math.round(ox + x * z - dpr), by + fs + pad * 2, 2 * dpr, 2 * dpr);
    ctx.fillStyle = '#222';
    ctx.fillText(u.say, ox + x * z, by + pad + fs / 2 + dpr);
  }
}

function drawVillageLabels(ox, oy, z, s) {
  const fs = Math.round(11 * dpr);
  ctx.font = `bold ${fs}px ui-monospace, Menlo, monospace`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  for (const v of life.villages.values()) {
    const k = life.kingdoms.get(v.kingdom);
    const hall = life.buildings.get(v.hall);
    if (!k || !hall) continue;
    const rel = life.religions.get(v.religion);
    const text = `${rel ? rel.symbol + ' ' : ''}${v.name} ${v.pop}`;
    const tw = ctx.measureText(text).width;
    const chip = fs * 0.7, pad = 4 * dpr;
    const bw = tw + chip + pad * 3, bh = fs + pad;
    const cx = ox + (hall.x + 1.5) * z;
    const top = oy + (hall.y + 3) * z - 12 * s - bh - 2 * dpr;
    const bx = Math.round(cx - bw / 2), by = Math.round(top);
    if (bx > view.width || by > view.height || bx + bw < 0 || by + bh < 0) continue;
    const selected = life.selected && life.selected.village === v;
    ctx.fillStyle = 'rgba(10,12,20,0.78)';
    ctx.fillRect(bx, by, bw, bh);
    if (selected) {
      ctx.strokeStyle = '#ffd34d';
      ctx.lineWidth = Math.max(1, dpr);
      ctx.strokeRect(bx, by, bw, bh);
    }
    ctx.fillStyle = k.color;
    ctx.fillRect(bx + pad, by + (bh - chip) / 2, chip, chip);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, bx + pad * 2 + chip, by + bh / 2 + dpr);
  }
}

// ---------- Inspect ----------
// screen-space box each creature was last drawn in, for clicking on it
const hitboxes = new WeakMap();

// the creature under the pointer: its drawn sprite first, then whoever is closest
function unitAt(wx, wy, sx, sy) {
  let u = null;
  for (const o of life.units) {
    const b = !o.dead && hitboxes.get(o);
    const pad = 3 * dpr;
    if (b && sx >= b[0] - pad && sx <= b[0] + b[2] + pad && sy >= b[1] - pad && sy <= b[1] + b[3] + pad && (!u || o.y > u.y)) u = o;
  }
  if (u) return u;
  let bd = 1.5;
  for (const o of life.units) {
    const d = !o.dead && dist(o.x, o.y, wx, wy);
    if (d !== false && d < bd) { bd = d; u = o; }
  }
  return u;
}

function inspectAt(wx, wy, sx, sy) {
  const u = unitAt(wx, wy, sx, sy);
  if (u) { life.selected = { unit: u }; return; }
  const x = Math.floor(wx), y = Math.floor(wy);
  if (inBounds(x, y)) {
    const i = y * state.W + x;
    const b = life.bmap[i] && life.buildings.get(life.bmap[i]);
    const v = life.villages.get(b ? b.village : life.owner[i]);
    if (v) { life.selected = { village: v }; return; }
  }
  life.selected = null;
}

// the creature's own sprite (kingdom colors, gear, subspecies tint) as a picture
function portraitOf(u, k) {
  const spr = unitSprite(u.race, k ? k.color : '#8d8d8d', gearOf(u), false, false, typeof subOf === 'function' ? subOf(u)?.tint : undefined);
  return (spr.portrait ||= spr.toDataURL());
}

function infoHtml() {
  const sel = life.selected;
  if (!sel) return '';
  if (sel.achievements) return achievementsHtml();
  if (sel.history) return historyHtml();
  if (sel.stats) return statsHtml();
  if (sel.favorites) return favoritesHtml();
  if (sel.laws) return '<h3>⚖ World Laws</h3><p>Rules for how the world runs. They carry over to new worlds.</p>';
  if (sel.share) return '<h3>📤 Share Map</h3><p>Copy this code to share your terrain, or paste one to load it.</p>';
  if (sel.unit) {
    const u = sel.unit, r = RACES[u.race];
    if (u.dead) return `<h3>${u.name}</h3><p>Died: ${u.cause}.</p>`;
    const v = life.villages.get(u.village);
    const k = life.kingdoms.get(kingdomOf(u));
    const job = !r.civ ? (r.prey ? (u.hunger > YEAR ? 'Hunting' : 'Roaming') : 'Grazing')
      : !isAdult(u) ? 'Child'
      : u.boat ? (u.role === 'warrior' ? 'Sailing to war' : u.settleTravel ? 'Sailing to settle' : 'Sailing')
      : u.role === 'warrior' ? 'Warrior'
      : u.settleTravel ? 'Settler'
      : u.carry ? `Carrying ${u.carry.n} ${u.carry.type}`
      : u.task ? { farm: 'Farmer', wood: 'Woodcutter', stone: 'Miner', hunt: 'Hunter', idle: 'Resting' }[u.task.type]
      : v ? 'Villager' : 'Wanderer';
    // header: a portrait of the creature, its name, and a health bar
    const hp = Math.max(0, Math.ceil(u.hp)), max = maxHp(u), pct = Math.max(0, Math.min(100, (hp / max) * 100));
    return `<div class="unit-head"><img class="portrait" src="${portraitOf(u, k)}" alt="">
      <div class="unit-title"><h3>${u.name}${pen('unit', u.id)}</h3>
        <div class="hp-bar" title="Health"><i style="width:${pct}%;background:${pct > 50 ? '#3fae3a' : pct > 25 ? '#e0a020' : '#d8302a'}"></i></div>
        <small>❤️ ${hp} / ${max}</small></div></div>` + rows([
      ['Race', r.name + pen('race', u.race)],
      r.civ && ['Kingdom', k ? swatch(k.color) + k.name + pen('kingdom', k.id) : 'None'],
      r.civ && ['Village', v ? v.name + pen('village', v.id) : 'None'],
      r.civ && ['Language', life.languages.has(u.language) ? life.languages.get(u.language).name + pen('language', u.language) : 'Forgotten'],
      r.civ && ['Culture', life.cultures.has(u.culture) ? life.cultures.get(u.culture).name + pen('culture', u.culture) : 'Forgotten'],
      r.civ && ['Religion', u.religion ? religionLabel(u.religion) + pen('religion', u.religion) : 'None'],
      (r.civ || u.clan) && ['Family', u.clan ? `${u.clan} clan` + pen('clan', u.clan) : 'Forgotten'],
      u.parents && u.parents.length && ['Parents', u.parents.map((id, i) => unitLink(id, (u.parentNames || [])[i])).join(', ')],
      r.civ && ['Children', childrenOf(u)],
      ['Age', `${Math.floor(u.age / YEAR)} years`],
      ['Doing', job],
      ...unitExtraRows(u),
      u.traits && u.traits.length && ['Traits', u.traits.map(t => traitIcon(t) + ' ' + TRAITS[t].name).join(', ')],
      (u.sick || u.mad || u.blessed || u.cursed || u.shield || u.immune) && ['Status', [
        u.blessed && 'Blessed', u.cursed && 'Cursed', u.shield && 'Shielded', u.sick && 'Plague', u.immune && 'Immune', u.mad && 'Mad',
      ].filter(Boolean).join(', ')],
      u.kills && ['Kills', u.kills],
    ]);
  }
  const v = sel.village;
  if (!life.villages.has(v.id)) return `<h3>${v.name}</h3><p>This village is gone.</p>`;
  const k = life.kingdoms.get(v.kingdom);
  const wars = k ? Object.keys(k.wars).map(id => life.kingdoms.get(+id)?.name).filter(Boolean) : [];
  const hall = life.buildings.get(v.hall);
  return `<h3>${v.name}${pen('village', v.id)}</h3>` + rows([
    ['Kingdom', k ? swatch(k.color) + k.name + pen('kingdom', k.id) : 'None'],
    k && k.capital === v.id && ['Capital', 'Yes'],
    ['Race', RACES[v.race].plural + pen('race', v.race)],
    k && ['Language', languageOf(k).name + pen('language', languageOf(k).id)],
    k && ['Culture', `${cultureOf(k).name}${pen('culture', cultureOf(k).id)} (${cultureOf(k).traits.map(t => CULTURE_TRAITS[t].split(' ')[0]).join(', ')})`],
    ['Religion', v.religion ? religionLabel(v.religion) + pen('religion', v.religion) : 'None'],
    ['Population', `${v.pop} / ${6 + v.houses * 4}`],
    ['Warriors', v.warriors],
    ['Houses', v.houses],
    ['Size', ['', 'Hamlet (huts)', 'Town', 'City (stone)'][v.tier || 1]],
    ['Buildings', Object.entries(v.has || {}).filter(([t]) => CITY_BUILDINGS[t] || t === 'dock').map(([t, n]) => (CITY_BUILDINGS[t]?.name || 'Dock') + (n > 1 ? ' ×' + n : '')).join(', ') || 'None'],
    ['Gold', Math.floor(v.gold || 0)],
    k && ['Treasury', Math.floor(k.gold || 0)],
    k && kingOf(k) && ['Ruler', '👑 ' + unitLink(kingOf(k).id)],
    lordOf(v) && ['Lord', '🗡 ' + unitLink(v.lord)],
    k && ['Renown', Math.floor(k.renown || 0)],
    k && k.traits && k.traits.length && ['Kingdom traits', k.traits.map(t => META_TRAITS.kingdom[t].split(' (')[0]).join(', ')],
    k && k.army && ['Army', `${k.army.size || 0} warriors, ${k.army.state === 'march' ? 'marching on ' + (life.villages.get(k.army.target)?.name || '?') : 'gathering'}`],
    k && k.plot && ['Plotting', PLOTS[k.plot.type].name + ` (${Math.floor(k.plot.progress)}%)`],
    v.religion && life.religions.get(v.religion)?.traits?.length && ['Faith traits', life.religions.get(v.religion).traits.map(t => META_TRAITS.religion[t].split(' (')[0]).join(', ')],
    k && languageOf(k).traits?.length && ['Tongue traits', languageOf(k).traits.map(t => META_TRAITS.language[t].split(' (')[0]).join(', ')],
    v.has && v.has.library && ['Books', life.books.filter(b => b.village === v.id).length],
    ['Food', Math.floor(v.food)],
    ['Wood', Math.floor(v.wood)],
    ['Stone', Math.floor(v.stone)],
    hall && hall.hp < hall.maxHp && ['Hall', `${Math.ceil(hall.hp)} / ${hall.maxHp}`],
    ['At war with', wars.length ? wars.join(', ') : 'Nobody'],
    k && ['Allies', Object.keys(alliesOf(k)).map(id => life.kingdoms.get(+id)?.name).filter(Boolean).join(', ') || 'None'],
  ]);
}

// a clickable name (or a plain one if they've died)
function unitLink(id, fallback) {
  const o = life.byId.get(id);
  return o && !o.dead ? `<a data-unit="${o.id}">${o.name}</a>` : `${fallback || 'someone'} †`;
}

function childrenOf(u) {
  const kids = life.units.filter(o => !o.dead && o.parents && o.parents.includes(u.id));
  if (!kids.length) return 'None';
  return kids.slice(0, 8).map(o => unitLink(o.id)).join(', ') + (kids.length > 8 ? ` +${kids.length - 8}` : '');
}

// ---------- Renaming ----------
// A ✏️ next to a name in the Inspect panel lets the player rename it.
const pen = (kind, id) => ` <a class="rename" data-rename="${kind}" data-id="${encodeURIComponent(id)}" title="Rename">✏️</a>`;

const RENAMABLE = {
  unit: id => life.byId.get(+id),
  village: id => life.villages.get(+id),
  kingdom: id => life.kingdoms.get(+id),
  language: id => life.languages.get(+id),
  culture: id => life.cultures.get(+id),
  religion: id => life.religions.get(+id),
};

// An in-game name box (browser prompt() popups can be blocked). Calls done(name)
// with the cleaned-up name if the player saves one.
function askName(old, done, title = 'New name', max = 32) {
  const box = document.getElementById('nameBox'), input = document.getElementById('nameInput');
  document.getElementById('nameTitle').textContent = title;
  input.maxLength = max;
  input.value = old || '';
  box.hidden = false;
  input.focus();
  input.select();
  const close = () => { box.hidden = true; box.onsubmit = null; document.getElementById('nameCancel').onclick = null; };
  box.onsubmit = e => {
    e.preventDefault();
    const name = input.value.replace(/[<>&"]/g, '').trim().slice(0, max);
    close();
    if (name && name !== old) done(name);
  };
  document.getElementById('nameCancel').onclick = close;
  input.onkeydown = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
}

// called after something in RENAMABLE gets a new name (ui2.js records past names)
let onRenamed = (thing, old) => {};

function renameRace(key, name) {
  const r = RACES[key];
  if (r.defaultName === undefined) { r.defaultName = r.name; r.defaultPlural = r.plural; }
  r.plural = r.plural === r.name ? name : name + 's';
  r.name = name;
  // creatures named after their species (animals) follow the new name
  for (const u of life.units) if (u.race === key && !r.civ && !r.wizard) u.name = name;
}

document.getElementById('infoBody').addEventListener('click', e => {
  const a = e.target.closest('[data-rename]');
  if (!a) return;
  e.stopPropagation();
  const kind = a.dataset.rename, id = decodeURIComponent(a.dataset.id);
  const after = () => { life.territoryDirty = true; hudFrame = 0; };
  if (kind === 'race') {
    askName(RACES[id].name, name => { renameRace(id, name); renderPanel(); after(); });
  } else if (kind === 'clan') {
    askName(id, name => { for (const u of life.units) if (u.clan === id) u.clan = name; after(); });
  } else {
    const thing = RENAMABLE[kind](id);
    if (!thing) return;
    askName(thing.name, name => {
      const old = thing.name;
      thing.name = name;
      onRenamed(thing, old);
      if (kind === 'unit' && thing.race === 'fox' && name.toUpperCase() === 'EWAHLSTER') becomeSuperFox(thing);
      after();
    });
  }
});

function religionLabel(id) {
  const r = life.religions.get(id);
  return r ? `${r.symbol} ${r.name}` : 'None';
}

const swatch = c => `<span class="sw" style="background:${c}"></span> `;
const rows = list => '<dl>' + list.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('') + '</dl>';

function territoryName(x, y) {
  const v = life.villages.get(life.owner[y * state.W + x]);
  const k = v && life.kingdoms.get(v.kingdom);
  return v && k ? `${v.name}, ${k.name}` : '';
}

function civPopulation() {
  let n = 0;
  for (const u of life.units) if (!u.dead && RACES[u.race].civ) n++;
  return n;
}

// ---------- Save / load ----------
function serializeLife() {
  return {
    nextId: life.nextId,
    sapient: Object.values(RACES).filter(r => r.sapientOf).map(r => r.sapientOf),
    raceNames: Object.fromEntries(Object.entries(RACES).filter(([, r]) => r.defaultName !== undefined).map(([k, r]) => [k, r.name])),
    units: life.units.filter(u => !u.dead),
    villages: [...life.villages.values()],
    kingdoms: [...life.kingdoms.values()],
    buildings: [...life.buildings.values()],
    languages: [...life.languages.values()],
    religions: [...life.religions.values()],
    cultures: [...life.cultures.values()],
    history: life.history,
    books: life.books,
    subspecies: life.subspecies,
    age: life.age,
    clanTraits: life.clanTraits,
    ruins: life.ruins,
    stats: life.stats,
    monoliths: life.monoliths.map(m => ({ x: m.x, y: m.y })),
    geysers: life.geysers.map(g => ({ x: g.x, y: g.y, acid: g.acid })),
    structures: life.structures,
    owner: bytesToB64(new Uint8Array(life.owner.buffer)),
  };
}

function loadLife(data) {
  resetLife();
  if (!data) return;
  life.nextId = data.nextId;
  for (const base of data.sapient || []) makeSapientRace(base);
  for (const [key, name] of Object.entries(data.raceNames || {})) if (RACES[key]) renameRace(key, name);
  for (const u of data.units) { life.units.push(u); life.byId.set(u.id, u); }
  for (const v of data.villages) life.villages.set(v.id, v);
  for (const k of data.kingdoms) life.kingdoms.set(k.id, k);
  for (const l of data.languages || []) life.languages.set(l.id, l);
  for (const r of data.religions || []) life.religions.set(r.id, r);
  for (const c of data.cultures || []) life.cultures.set(c.id, c);
  life.history = data.history || [];
  life.books = data.books || [];
  life.subspecies = data.subspecies || [];
  life.age = data.age || 'hope';
  life.clanTraits = data.clanTraits || {};
  life.ruins = data.ruins || [];
  life.stats = data.stats || [];
  life.monoliths = (data.monoliths || []).map(m => ({ x: m.x, y: m.y, glow: 0 }));
  life.structures = data.structures || [];
  life.geysers = (data.geysers || []).map(g => ({ ...g, cd: 20, erupt: 0 }));
  for (const b of data.buildings) {
    life.buildings.set(b.id, b);
    for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) life.bmap[(b.y + dy) * state.W + b.x + dx] = b.id;
  }
  life.owner = new Int32Array(b64ToBytes(data.owner).buffer);
  life.territoryDirty = true;
}
