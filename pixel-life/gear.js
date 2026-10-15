'use strict';

// Equipment (weapons, armor, tools) and genetics (DNA), plus the editor that
// opens when you inspect a creature.

// ---------- Equipment ----------
// cost: what a village pays to make it (null = only the god can hand it out)
const GEAR = {
  weapon: {
    none:  { name: 'None' },
    club:  { name: 'Wooden Club', dmg: 2, cost: { wood: 3 } },
    spear: { name: 'Stone Spear', dmg: 3, reach: 1.6, cost: { wood: 2, stone: 2 } },
    bow:   { name: 'Bow', dmg: 3, reach: 4.5, cost: { wood: 4 } },
    axe:   { name: 'Battle Axe', dmg: 5, cost: { wood: 2, stone: 4 } },
    sword: { name: 'Sword', dmg: 6, cost: { stone: 6 } },
    staff: { name: 'Magic Staff', dmg: 9, reach: 5, magic: true, cost: null },
    foxyite: { name: 'Foxyite Fang Blade', dmg: 60, reach: 1.4, cost: null, secret: true },
  },
  armor: {
    none:      { name: 'None' },
    leather:   { name: 'Leather Armor', def: 0.2, cost: { food: 4 } },
    chain:     { name: 'Chainmail', def: 0.35, cost: { stone: 5 } },
    plate:     { name: 'Plate Armor', def: 0.5, slow: 0.12, cost: { stone: 9 } },
    enchanted: { name: 'Enchanted Armor', def: 0.7, cost: null },
    foxyite:   { name: 'Foxyite Armor', def: 0.9, cost: null, secret: true },
  },
  tool: {
    none:    { name: 'None' },
    hoe:     { name: 'Hoe', job: 'farm', cost: { wood: 2 } },
    woodaxe: { name: "Woodcutter's Axe", job: 'wood', cost: { wood: 1, stone: 1 } },
    pickaxe: { name: 'Pickaxe', job: 'stone', cost: { wood: 1, stone: 2 } },
    foxyite: { name: 'Foxyite Multitool', cost: null, secret: true },
  },
};

const gearOf = u => (u.gear ||= { weapon: 'none', armor: 'none', tool: 'none' });
const weaponOf = u => GEAR.weapon[gearOf(u).weapon] || GEAR.weapon.none;
const armorOf = u => GEAR.armor[gearOf(u).armor] || GEAR.armor.none;
const toolOf = u => GEAR.tool[gearOf(u).tool] || GEAR.tool.none;

function affordable(v, cost) {
  return cost && Object.entries(cost).every(([res, n]) => v[res] - n >= 6);   // keep a little in store
}

function pay(v, cost) {
  for (const [res, n] of Object.entries(cost)) v[res] -= n;
}

// best thing on the list the village can afford right now
function craft(v, u, slot, order) {
  for (const key of order) {
    const item = GEAR[slot][key];
    if (gearOf(u)[slot] === key) return false;    // already has this or better
    if (affordable(v, item.cost)) { pay(v, item.cost); gearOf(u)[slot] = key; onCrafted(v, u, slot); return true; }
  }
  return false;
}

// Called from updateVillage: the smithy equips warriors first, then workers.
function craftGear(v) {
  if (rand() > (kingdomHas(v, 'smiths') ? 0.4 : 0.2)) return;
  const warrior = pickResident(v, o => o.role === 'warrior' && isAdult(o) &&
    (gearOf(o).weapon === 'none' || gearOf(o).armor === 'none' || rand() < 0.2));
  if (warrior) {
    const weapons = rand() < 0.3 ? ['bow', 'club'] : ['sword', 'axe', 'spear', 'club'];
    if (!craft(v, warrior, 'weapon', weapons)) craft(v, warrior, 'armor', ['plate', 'chain', 'leather']);
    return;
  }
  const worker = pickResident(v, o => o.role === 'worker' && isAdult(o) && gearOf(o).tool === 'none');
  if (worker) craft(v, worker, 'tool', [pick(['hoe', 'woodaxe', 'pickaxe'])]);
}

// Sprite changes: a weapon (or tool) in the right hand, helmet and armor colors.
const GEAR_ART = {
  club:    ['.', 'n', 'n', '.'],
  spear:   ['m', 'n', 'n', 'n', 'n'],
  bow:     ['.', 'n', 'b', 'n'],
  axe:     ['.', 'a', 'n', 'n'],
  sword:   ['.', 'm', 'm', 'm'],
  staff:   ['o', 'n', 'n', 'n', 'n'],
  hoe:     ['.', '.', 'a', 'n'],
  woodaxe: ['.', '.', 'a', 'n'],
  pickaxe: ['.', '.', 'a', 'n'],
  foxyite: ['.', 'x', 'x', 'x', 'x'],
};
const ARMOR_COLORS = { leather: '#8a5a30', chain: '#9aa0a8', plate: '#d0d5dc', enchanted: '#7fe0ff', foxyite: '#ff6a00' };

function gearArt(art, gear) {
  const held = gear.weapon !== 'none' ? gear.weapon : gear.tool;
  const col = GEAR_ART[held];
  return art.map((row, y) => {
    if (gear.armor !== 'none' && y === 0) row = row.replace(/h/g, 'H');   // helmet
    return col ? row + (col[y] || '.') : row;
  });
}

function gearPalette(pal, gear) {
  const armor = ARMOR_COLORS[gear.armor];
  pal.H = armor ? (gear.armor === 'leather' ? '#6a4020' : armor) : pal.h;
  if (armor && gear.armor !== 'leather') pal.c = armor;
  pal.n = '#7a5532';
  pal.a = '#8e959e';
  pal.b = '#e8e0c8';
  pal.x = '#ff6a00';   // foxyite
  pal.o = gear.weapon === 'staff' ? '#7fe0ff' : pal.o;
  return pal;
}

const gearKey = g => `${g.weapon}.${g.armor}.${g.tool}`;

// ---------- Genetics ----------
// Genes are inherited numbers (1 = average). Traits are named mutations on
// top of them. A trait can only be edited in once it has been discovered:
// natural traits by a creature being born with one, legendary ones through
// achievements. Discoveries are kept across worlds.
const GENES = {
  strength:  { label: 'Strength' },
  vitality:  { label: 'Vitality' },
  speed:     { label: 'Speed' },
  lifespan:  { label: 'Lifespan' },
  fertility: { label: 'Fertility' },
  intellect: { label: 'Intellect' },
};
const GENE_MIN = 0.4, GENE_MAX = 2.5;
const clampGene = n => Math.min(GENE_MAX, Math.max(GENE_MIN, Math.round(n * 100) / 100));

// mods multiply genes; opposite traits can't be carried together
const TRAITS = {
  strong:      { name: 'Strong',      mods: { strength: 1.25 }, opposite: 'weak' },
  weak:        { name: 'Weak',        mods: { strength: 0.75 }, opposite: 'strong' },
  tough:       { name: 'Tough',       mods: { vitality: 1.3 }, opposite: 'frail' },
  frail:       { name: 'Frail',       mods: { vitality: 0.7 }, opposite: 'tough' },
  swift:       { name: 'Swift',       mods: { speed: 1.2 }, opposite: 'slow' },
  slow:        { name: 'Slow',        mods: { speed: 0.8 }, opposite: 'swift' },
  longLived:   { name: 'Long-lived',  mods: { lifespan: 1.4 }, opposite: 'shortLived' },
  shortLived:  { name: 'Short-lived', mods: { lifespan: 0.6 }, opposite: 'longLived' },
  fertile:     { name: 'Fertile',     mods: { fertility: 1.6 }, opposite: 'barren' },
  barren:      { name: 'Barren',      mods: { fertility: 0.3 }, opposite: 'fertile' },
  clever:      { name: 'Clever',      mods: { intellect: 1.25 }, opposite: 'dim' },
  dim:         { name: 'Dim',         mods: { intellect: 0.75 }, opposite: 'clever' },
  titan:       { name: 'Titan',       mods: { strength: 2, vitality: 2 }, legendary: 'empire' },
  immortal:    { name: 'Immortal',    mods: { lifespan: 10 }, legendary: 'elder' },
  genius:      { name: 'Genius',      mods: { intellect: 2 }, legendary: 'awakening' },
  regenerates: { name: 'Regenerating', mods: {}, regen: 0.15, legendary: 'destroyer' },
  lightning:   { name: 'Lightning Reflexes', mods: { speed: 1.8 }, legendary: 'sailor' },
};
const NATURAL_TRAITS = Object.keys(TRAITS).filter(t => !TRAITS[t].legendary);

const ACHIEVEMENTS = {
  empire:    { name: 'Empire Builder', desc: 'A kingdom rules 8 villages' },
  elder:     { name: 'Elder', desc: 'A creature lives to 150 years old' },
  awakening: { name: 'Awakening', desc: 'Animals become sapient' },
  destroyer: { name: 'Destroyer', desc: 'Drop 3 nukes' },
  sailor:    { name: 'Age of Sail', desc: '8 boats at sea at once' },
  crowded:   { name: 'Crowded World', desc: '600 people alive at once' },
};

// player progress, kept across worlds
const PROGRESS_KEY = 'pixellife-progress-v1';
const progress = { traits: [], achievements: [], nukes: 0, unlocked: [] };
try { Object.assign(progress, JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}); } catch { /* no storage */ }
function saveProgress() {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch { /* no storage */ }
}

const traitUnlocked = t => progress.traits.includes(t) ||
  (TRAITS[t].legendary && progress.achievements.includes(TRAITS[t].legendary));

function discover(t) {
  if (progress.traits.includes(t) || TRAITS[t].legendary) return;
  progress.traits.push(t);
  saveProgress();
  toast(`🧬 Trait discovered: ${TRAITS[t].name}! You can now edit it into creatures.`);
}

function achieve(id) {
  if (progress.achievements.includes(id)) return;
  progress.achievements.push(id);
  saveProgress();
  const t = Object.keys(TRAITS).find(k => TRAITS[k].legendary === id);
  toast(`🏆 ${ACHIEVEMENTS[id].name}!${t ? ` Legendary trait unlocked: ${TRAITS[t].name}` : ''}`);
  if (state.tab === 'world') renderPanel();
}

// checked every few seconds of game time
function checkAchievements() {
  if (life.villages.size && [...life.kingdoms.values()].some(k => villagesOf(k.id).length >= 8)) achieve('empire');
  if (life.units.some(u => !u.dead && u.age >= 150 * YEAR)) achieve('elder');
  if (Object.values(RACES).some(r => r.sapientOf)) achieve('awakening');
  if (progress.nukes >= 3) achieve('destroyer');
  if (life.units.filter(u => u.boat && !u.dead).length >= 8) achieve('sailor');
  if (civPopulation() >= 600) achieve('crowded');
}

function addTrait(u, t) {
  if ((u.traits ||= []).includes(t)) return;
  if (TRAITS[t].opposite) removeTrait(u, TRAITS[t].opposite);
  u.traits.push(t);
}
function removeTrait(u, t) { if (u.traits) u.traits = u.traits.filter(x => x !== t); }

function randomDna() {
  const dna = {};
  for (const g in GENES) dna[g] = clampGene(1 + (rand() - 0.5) * 0.2);
  return dna;
}

// children average their parents, with small drift and the odd real mutation
function inheritDna(a, b) {
  const dna = {};
  for (const g in GENES) {
    const pa = a ? dnaOf(a)[g] : 1, pb = b ? dnaOf(b)[g] : pa;
    let n = (pa + pb) / 2 + (rand() - 0.5) * 0.04;
    if (rand() < (laws.mutants ? 0.4 : 0.08)) n += (rand() - 0.5) * (laws.mutants ? 0.8 : 0.4);
    dna[g] = clampGene(n);
  }
  return dna;
}

// Traits pass down from either parent half the time, and now and then a new
// natural one turns up. Legendary traits are passed on too, but never appear
// on their own.
// some traits run in the blood of a race and every one of them has them
const RACE_TRAITS = {
  human: ['fertile'], elf: ['swift', 'longLived'], orc: ['strong'], dwarf: ['tough'],
  rabbit: ['fertile', 'swift'], rat: ['fertile'], turtle: ['longLived', 'slow'], monkey: ['clever'],
  fox: ['swift'], bear: ['strong'], polarbear: ['strong', 'tough'], rhino: ['tough'], cow: ['slow'],
  zombie: ['slow', 'dim'], skeleton: ['frail'], faerie: ['frail', 'swift'], dragon: ['strong', 'tough', 'longLived'],
  unicorn: ['swift'], whitemage: ['clever'], darkmage: ['clever'], crocodile: ['tough'],
};
const raceTraits = race => RACE_TRAITS[race] || RACE_TRAITS[RACES[race].sapientOf] || [];

function inheritTraits(u, parents) {
  u.traits = [];
  if (parents) for (const p of parents) for (const t of (p && p.traits) || []) if (rand() < 0.5) addTrait(u, t);
  if (rand() < (parents ? 0.03 : 0.06) * (laws.mutants ? 8 : 1)) addTrait(u, pick(NATURAL_TRAITS));
  for (const t of raceTraits(u.race)) addTrait(u, t);
  for (const t of u.traits) discover(t);
}

const dnaOf = u => (u.dna ||= randomDna());

// a gene's value with the creature's traits applied
function gene(u, g) {
  let n = dnaOf(u)[g];
  if (u.traits) for (const t of u.traits) n *= TRAITS[t].mods[g] || 1;
  return n;
}

// four bases per gene, so it reads like a real sequence
function dnaString(u) {
  const bases = 'ACGT';
  return Object.keys(GENES).map(g => {
    const n = Math.round(((dnaOf(u)[g] - GENE_MIN) / (GENE_MAX - GENE_MIN)) * 255);
    let s = '';
    for (let k = 3; k >= 0; k--) s += bases[(n >> (k * 2)) & 3];
    return s;
  }).join(' ');
}

function achievementsHtml() {
  const list = Object.entries(ACHIEVEMENTS).map(([id, a]) => {
    const done = progress.achievements.includes(id);
    const t = Object.keys(TRAITS).find(k => TRAITS[k].legendary === id);
    return `<dt>${done ? '🏆' : '🔒'}</dt><dd><b>${a.name}</b><br>${a.desc}${t ? `<br><small>Unlocks: ${TRAITS[t].name}</small>` : ''}</dd>`;
  }).join('');
  return `<h3>Achievements</h3><dl>${list}</dl><p style="margin-top:8px">Traits discovered: ${progress.traits.length} / ${NATURAL_TRAITS.length}</p>`;
}

// ---------- Editor ----------
const infoEdit = document.getElementById('infoEdit');
let editing = null;

function refreshEditor(force) {
  if (refreshWorldPanel()) return;
  const u = life.selected && life.selected.unit;
  if (!force && u === editing && !(u && u.dead)) return;
  editing = u && !u.dead ? u : null;
  infoEdit.textContent = '';
  if (!editing) return;

  const head = text => {
    const h = document.createElement('h4');
    h.textContent = text;
    infoEdit.append(h);
  };

  const bar = document.createElement('div');
  bar.className = 'edit-actions';
  const follow = document.createElement('button');
  follow.textContent = state.follow === editing.id ? '👁 Following' : '👁 Follow';
  follow.onclick = () => { state.follow = state.follow === editing.id ? 0 : editing.id; refreshEditor(true); };
  const fav = document.createElement('button');
  fav.textContent = editing.fav ? '★ Favorite' : '☆ Favorite';
  fav.onclick = () => { editing.fav = !editing.fav; refreshEditor(true); };
  const ctl = document.createElement('button');
  ctl.textContent = '🎮 Control';
  ctl.onclick = () => startControl(editing);
  bar.append(follow, fav, ctl);
  infoEdit.append(bar);

  head('Equipment');
  for (const slot of ['weapon', 'armor', 'tool']) {
    const label = document.createElement('label');
    label.className = 'edit-row';
    label.append(slot[0].toUpperCase() + slot.slice(1));
    const sel = document.createElement('select');
    for (const [key, item] of Object.entries(GEAR[slot])) {
      if (!item.secret || editing.race === 'superfox') sel.add(new Option(item.name, key));
    }
    sel.value = gearOf(editing)[slot];
    sel.onchange = () => { gearOf(editing)[slot] = sel.value; };
    label.append(sel);
    infoEdit.append(label);
    if (slot === 'tool') continue;
    // what it's made of (cities.js)
    const mrow = document.createElement('label');
    mrow.className = 'edit-row';
    mrow.append('  made of');
    const msel = document.createElement('select');
    for (const [key, m] of Object.entries(MATERIALS)) msel.add(new Option(m.name, key));
    msel.value = gearOf(editing)[slot + 'Mat'] || 'copper';
    msel.onchange = () => { gearOf(editing)[slot + 'Mat'] = msel.value; };
    mrow.append(msel);
    infoEdit.append(mrow);
  }

  head('DNA');
  const seq = document.createElement('div');
  seq.className = 'dna';
  seq.textContent = dnaString(editing);
  infoEdit.append(seq);
  const bars = document.createElement('div');
  bars.className = 'genes';
  for (const [g, info] of Object.entries(GENES)) {
    const n = gene(editing, g);
    bars.insertAdjacentHTML('beforeend',
      `<span>${info.label}</span><span class="bar"><i style="width:${Math.min(100, (n / 2.5) * 100)}%"></i></span><span>${n.toFixed(2)}</span>`);
  }
  infoEdit.append(bars);

  head('Traits');
  let chips = null, lastCat = null;
  for (const [t, info] of Object.entries(TRAITS)) {
    const has = (editing.traits || []).includes(t);
    if (info.title && !has) continue;   // titles are earned, not handed out
    // one row of chips per category
    if (info.cat !== lastCat) {
      lastCat = info.cat;
      if (info.cat) { const sub = document.createElement('div'); sub.className = 'trait-cat'; sub.textContent = info.cat; infoEdit.append(sub); }
      chips = document.createElement('div');
      chips.className = 'traits';
      infoEdit.append(chips);
    }
    const open = traitUnlocked(t);
    const b = document.createElement('button');
    b.className = 'chip' + (has ? ' on' : '') + (info.legendary ? ' legendary' : '');
    b.textContent = open ? info.name : '🔒 ???';
    b.title = open ? (has ? 'Click to remove' : 'Click to add')
      : info.legendary ? `Locked: earn the "${ACHIEVEMENTS[info.legendary].name}" achievement`
      : 'Locked: discover it by having a creature born with it';
    b.disabled = !open && !has;
    b.onclick = () => {
      if (!open) return;
      const u = editing, oldLife = gene(u, 'lifespan'), oldVit = gene(u, 'vitality');
      if (has) removeTrait(u, t); else addTrait(u, t);
      u.maxAge = Math.round((u.maxAge * gene(u, 'lifespan')) / oldLife);
      u.hp = Math.min(maxHp(u), (u.hp * gene(u, 'vitality')) / oldVit);
      refreshEditor(true);
    };
    chips.append(b);
  }
}

// ---------- Easter egg: the Super Fox ----------
// Rename a fox EWAHLSTER and it turns into a Super Fox, which also unlocks it
// in the Creatures tab. Super Foxes are born sapient (a civilized race that
// founds Dens), far cleverer than anything else, blessed, in a full set of
// Foxyite (which nothing else can have), and they hunt monsters on sight.
const SUPERFOX_INTELLECT = 10;   // everyone else tops out at GENE_MAX (2.5)
RACE_TRAITS.superfox = ['genius', 'clever', 'swift'];

RACES.superfox.onSpawn = u => {
  u.dna.intellect = SUPERFOX_INTELLECT;
  u.blessed = true;
  u.immune = true;
  u.gear = { weapon: 'foxyite', armor: 'foxyite', tool: 'foxyite' };
  u.hp = maxHp(u);
};

// only the first fox ever renamed transforms; after that Super Foxes come from the Creatures tab
function becomeSuperFox(u) {
  const r = RACES.superfox;
  if (progress.unlocked.includes('superfox')) return;
  if (atRaceCap('superfox')) { toast(`There are already ${r.maxPop} Super Foxes`); return; }
  u.race = 'superfox';
  u.age = 18 * YEAR;
  u.maxAge = Math.round(r.life * (0.75 + rand() * 0.5) * YEAR);
  u.hunger = 0;
  u.traits = [...new Set([...(u.traits || []), ...RACE_TRAITS.superfox])];
  r.onSpawn(u);
  addEffect('flash', u.x, u.y, 0.5, { r: 3 });
  for (let i = 0; i < 8; i++) addEffect('spark', u.x + (rand() - 0.5) * 2, u.y - 0.5 + (rand() - 0.5) * 2, 1.2, {});
  progress.unlocked.push('superfox');
  saveProgress();
  toast(`🦊 ${u.name} awakens as a SUPER FOX! (now in the Creatures tab)`);
  renderPanel();
}
