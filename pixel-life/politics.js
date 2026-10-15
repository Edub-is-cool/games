'use strict';

// Kingdom politics and the shape of history: kings, renown, armies with
// captains, plots, religious rites, traits on cultures/languages/religions/
// clans/kingdoms, subspecies, world ages, natural invasions, the Rat King,
// diplomacy powers, and many more world laws. Loaded after cities.js.

// ---------- More world laws ----------
const MORE_LAWS = {
  hundredPeople:  { group: 'Civilization', label: '100 People', desc: 'Cities stop growing at 100 people', value: false },
  expansion:      { group: 'Civilization', label: 'Kingdom expansion', desc: 'Kingdoms send settlers to found new villages', value: true },
  stealingBorders:{ group: 'Civilization', label: 'Stealing borders', desc: 'Growing cities take land from enemies at war', value: false },
  terramorphing:  { group: 'Civilization', label: 'Terramorphing', desc: "Cities slowly turn the land into their race's biome", value: false },
  angryVillagers: { group: 'Civilization', label: 'Angry villagers', desc: 'Ordinary villagers fight invaders too', value: false },
  armies:         { group: 'Civilization', label: 'Armies', desc: 'Warriors gather under captains before marching', value: true },
  plots:          { group: 'Civilization', label: 'Plots', desc: 'Kings scheme alliances, wars and rebellions', value: true },
  magicRites:     { group: 'Civilization', label: 'Magic rites', desc: 'Religions perform rites against their enemies', value: true },
  handsomeMigrants:{ group: 'Civilization', label: 'Handsome migrants', desc: 'Attractive migrants arrive at small villages', value: false },
  civBabies:      { group: 'Life', label: 'People babies', desc: 'People have children', value: true },
  animalBabies:   { group: 'Life', label: 'Animal babies', desc: 'Animals breed', value: true },
  hunger:         { group: 'Life', label: 'Hunger', desc: 'Creatures can starve', value: true },
  peacefulMonsters:{ group: 'Life', label: 'Peaceful monsters', desc: 'Animals and monsters never attack', value: false },
  evolution:      { group: 'Life', label: 'Evolution events', desc: 'New subspecies appear over time', value: true },
  geneSpaghetti:  { group: 'Life', label: 'Gene Spaghetti', desc: 'New subspecies get scrambled genes', value: false },
  mutantBox:      { group: 'Life', label: 'Mutant Box', desc: 'New subspecies get random traits', value: false },
  glitchedNoosphere:{ group: 'Life', label: 'Glitched Noosphere', desc: 'New cultures, languages, religions and clans get 3–6 random traits', value: false },
  lifeClouds:     { group: 'Life', label: 'Clouds of life', desc: 'Life clouds drift by now and then, seeding creatures', value: false },
  naturalDisasters:{ group: 'Disasters', label: 'Natural disasters', desc: 'Tornadoes, volcanoes and meteors strike on their own', value: false },
  invasions:      { group: 'Disasters', label: 'Invasions', desc: 'Dragons, aliens, hellspawn and other horrors arrive', value: true },
  gaia:           { group: 'Disasters', label: "Gaia's Covenant", desc: 'Fire and explosions never damage the land', value: false },
  foreverCreep:   { group: 'Disasters', label: 'Forever creep', desc: 'Creep stays after its core is destroyed', value: false },
  eternalLava:    { group: 'Disasters', label: 'Eternal lava', desc: 'Lava never cools', value: false },
  foreverCold:    { group: 'Disasters', label: 'Forever cold', desc: 'Snow clouds keep coming', value: false },
  highFlora:      { group: 'Nature', label: 'High flora', desc: 'Trees and plants grow much faster', value: false },
  erosion:        { group: 'Nature', label: 'Erosion', desc: 'Soil by the water slowly turns to sand', value: false },
  minerals:       { group: 'Nature', label: 'Minerals', desc: 'Ore veins slowly grow back in the hills', value: false },
  biomeOvergrowth:{ group: 'Nature', label: 'Biome overgrowth', desc: 'Biomes slowly spread into each other', value: false },
  entanglewood:   { group: 'Nature', label: 'Entanglewood', desc: 'Forests slow creatures down', value: false },
  barkBites:      { group: 'Nature', label: 'Bark bites back', desc: 'Chopped trees sometimes come alive and attack', value: false },
  rootPranks:     { group: 'Nature', label: 'Root pranks', desc: 'Roots trip creatures in forests', value: false },
  nectarNap:      { group: 'Nature', label: 'Nectar nap', desc: 'Flowers make creatures doze off', value: false },
  explodingMushrooms:{ group: 'Nature', label: 'Exploding mushrooms', desc: 'Mushroom patches explode when stepped on', value: false },
};
for (const l of Object.values(LAWS)) l.group ||= 'World';
Object.assign(LAWS, MORE_LAWS);
for (const [k, l] of Object.entries(MORE_LAWS)) if (laws[k] === undefined) laws[k] = l.value;

// ---------- Traits on languages, religions, clans, kingdoms and cultures ----------
const META_TRAITS = {
  language: { doomedGlyphs: 'Doomed glyphs (reading it calls meteors)', beautifulScript: 'Beautiful script (books make readers happy)', simple: 'Simple (spreads fast)', ancient: 'Ancient (books teach wisdom)' },
  religion: { zealous: 'Zealous (converts twice as fast)', pacifistFaith: 'Pacifist (believers rarely war)', bloodCult: 'Blood cult (sacrifices for blessings)', healing: 'Healing (temples heal the sick)', crusader: 'Crusader (holy wars are common)' },
  clan: { warriorClan: 'Warrior clan (+20% damage)', longLivedClan: 'Long-lived clan', fertileClan: 'Fertile clan', cursedBlood: 'Cursed blood (unlucky)' },
  kingdom: { expansionist: 'Expansionist (settles far and often)', isolationist: 'Isolationist (no alliances)', mercantile: 'Mercantile (double gold)', militarist: 'Militarist (more warriors)' },
};
Object.assign(CULTURE_TRAITS, {
  xenophobic: 'Xenophobic (razes foreign cities)', xenophile: 'Xenophile (welcomes other races)', joinOrDie: 'Join or die (conquers relentlessly)',
});

function giveTraits(obj, table) {
  const keys = Object.keys(table);
  const n = laws.glitchedNoosphere ? 3 + ((rand() * 4) | 0) : rand() < 0.6 ? 1 : 0;
  obj.traits = keys.sort(() => rand() - 0.5).slice(0, Math.min(n, keys.length));
}

const _makeLanguage = makeLanguage;
makeLanguage = function (race, parent) { const l = _makeLanguage(race, parent); giveTraits(l, META_TRAITS.language); return l; };
const _foundReligion = foundReligion;
foundReligion = function (v) { _foundReligion(v); const r = life.religions.get(v.religion); if (r) giveTraits(r, META_TRAITS.religion); };
const _makeCulture = makeCulture;
makeCulture = function (race, lang, x, y) {
  const c = _makeCulture(race, lang, x, y);
  if (laws.glitchedNoosphere) {
    for (const t of Object.keys(CULTURE_TRAITS).sort(() => rand() - 0.5).slice(0, 3)) if (!c.traits.includes(t)) c.traits.push(t);
  } else if (rand() < 0.2) c.traits.push(pick(['xenophobic', 'xenophile', 'joinOrDie']));
  return c;
};
const _createKingdom = createKingdom;
createKingdom = function (race, x, y) {
  const k = _createKingdom(race, x, y);
  giveTraits(k, META_TRAITS.kingdom);
  k.renown = 0;
  return k;
};
const metaHas = (obj, t) => !!obj && !!obj.traits && obj.traits.includes(t);

// clans get their traits the first time anyone looks
function clanTraits(clan) {
  if (!clan) return [];
  life.clanTraits ||= {};
  if (!life.clanTraits[clan]) { const o = {}; giveTraits(o, META_TRAITS.clan); life.clanTraits[clan] = o.traits; }
  return life.clanTraits[clan];
}

// ---------- Kings and renown ----------
function kingOf(k) {
  let king = k.king && life.byId.get(k.king);
  if (king && !king.dead && kingdomOf(king) === k.id) return king;
  // crown the most renowned adult of the capital (or anywhere in the kingdom)
  const cap = life.villages.get(k.capital);
  const pool = life.units.filter(u => !u.dead && isAdult(u) && RACES[u.race].civ && (cap ? u.village === cap.id : kingdomOf(u) === k.id));
  king = pool.sort((a, b) => (levelOf(b) - levelOf(a)) || (b.age - a.age))[0];
  if (king) {
    // only bigger kingdoms' coronations make the history books
    if (k.king && k.crowned && villagesOf(k.id).length >= 3) chronicle(`👑 ${king.name} was crowned ruler of the ${k.name}`);
    k.king = king.id;
    k.crowned = true;
    king.king = k.id;
    king.role = 'worker';
  }
  return king || null;
}

// how a king's personality tilts war and peace
function kingMood(k) {
  const king = kingOf(k);
  let war = 1, ally = 1;
  if (king) {
    if (has(king, 'bloodlust') || has(king, 'ambitious')) war *= 1.6;
    if (has(king, 'peaceful') || has(king, 'pacifist')) war *= 0.4;
    if (has(king, 'honest')) ally *= 1.5;
    if (has(king, 'paranoid')) ally *= 0.4;
  }
  if (metaHas(k, 'militarist') || metaHas(cultureOf(k), 'joinOrDie')) war *= 1.5;
  if (metaHas(k, 'isolationist')) ally = 0;
  const rel = life.religions.get(religionOfKingdom(k));
  if (metaHas(rel, 'pacifistFaith')) war *= 0.5;
  if (metaHas(rel, 'crusader')) war *= 1.5;
  return { war, ally };
}

// ---------- Armies ----------
// At war, a kingdom's warriors gather at the capital under a captain, then march together.
function armyTick() {
  if (!laws.armies || state.tick % 20) return;
  for (const k of life.kingdoms.values()) {
    const wars = Object.keys(k.wars);
    if (!wars.length) { k.army = null; continue; }
    const cap = life.villages.get(k.capital);
    if (!cap) continue;
    const warriors = life.units.filter(u => !u.dead && u.role === 'warrior' && isAdult(u) && kingdomOf(u) === k.id);
    if (!warriors.length) { k.army = null; continue; }
    let army = k.army;
    if (!army) {
      const target = nearestVillage(cap.x, cap.y, 200, o => atWar(k.id, o.kingdom));
      if (!target) continue;
      army = k.army = { state: 'gather', target: target.id, since: state.tick, captain: 0 };
      if (villagesOf(k.id).length >= 3) chronicle(`🚩 The ${k.name} raised an army against ${target.name}`);
    }
    let captain = life.byId.get(army.captain);
    if (!captain || captain.dead) {
      captain = warriors.sort((a, b) => levelOf(b) - levelOf(a))[0];
      army.captain = captain.id;
    }
    const target = life.villages.get(army.target);
    if (!target || !atWar(k.id, target.kingdom)) { k.army = null; continue; }
    if (army.state === 'gather') {
      const near = warriors.filter(u => dist(u.x, u.y, cap.x, cap.y) < 8).length;
      if (near >= Math.min(8, warriors.length) || state.tick - army.since > YEAR) {
        army.state = 'march';
      }
    }
    army.size = warriors.length;
  }
}

// called from warMarch: true when the army has this warrior's turn
function armyOrders(u, k) {
  const kd = life.kingdoms.get(k);
  const army = kd && kd.army;
  if (!laws.armies || !army) return false;
  const cap = life.villages.get(kd.capital), captain = life.byId.get(army.captain), target = life.villages.get(army.target);
  if (!cap || !target) return false;
  if (army.state === 'gather') { if (dist(u.x, u.y, cap.x, cap.y) > 4) moveToward(u, cap.x, cap.y); else wander(u, cap.x, cap.y, 3); return true; }
  // march in formation behind the captain until close, then the usual attack
  if (captain && captain !== u && dist(captain.x, captain.y, target.x, target.y) > 12) {
    if (dist(u.x, u.y, captain.x, captain.y) > 2.5) moveToward(u, captain.x + (rand() - 0.5) * 2, captain.y + (rand() - 0.5) * 2);
    return true;
  }
  if (captain === u) { u.warTarget = target.id; }
  return false;
}

// ---------- Plots ----------
// Kings with enough renown and gold scheme; the plot takes time, then happens.
const PLOTS = {
  alliance:  { name: 'an alliance', renown: 5, gold: 10, pick: (k, king) => has(king, 'honest') || rand() < 0.3 },
  war:       { name: 'a war', renown: 10, gold: 20, pick: (k, king) => has(king, 'ambitious') || has(king, 'bloodlust') },
  peace:     { name: 'peace', renown: 0, gold: 5, pick: (k, king) => Object.keys(k.wars).length && (has(king, 'peaceful') || rand() < 0.4) },
  rebellion: { name: 'a rebellion abroad', renown: 20, gold: 30, pick: (k, king) => has(king, 'deceitful') },
};

function plotTick() {
  if (!laws.plots || state.tick % 60 !== 45) return;
  for (const k of [...life.kingdoms.values()]) {
    const king = kingOf(k);
    if (!king) continue;
    if (!k.plot) {
      if (has(king, 'paranoid') || rand() > 0.15) continue;
      const choice = Object.entries(PLOTS).find(([, p]) => (k.renown || 0) >= p.renown && (k.gold || 0) >= p.gold && p.pick(k, king));
      if (!choice) continue;
      const others = [...life.kingdoms.values()].filter(o => o !== k && kingdomsNear(k, o));
      const target = choice[0] === 'peace' ? life.kingdoms.get(+Object.keys(k.wars)[0]) : pick(others);
      if (!target) continue;
      k.gold -= choice[1].gold;
      k.plot = { type: choice[0], target: target.id, progress: 0 };
      continue;
    }
    k.plot.progress += 10 * gene(king, 'intellect');
    if (k.plot.progress < 100) continue;
    const p = k.plot, target = life.kingdoms.get(p.target);
    k.plot = null;
    if (!target) continue;
    if (p.type === 'alliance' && !allied(k, target) && !atWar(k.id, target.id)) { alliesOf(k)[target.id] = alliesOf(target)[k.id] = state.tick; chronicle(`🕵 ${king.name}'s scheming won an alliance with the ${target.name}`); }
    else if (p.type === 'war' && !allied(k, target)) { declareWar(k, target, 'a schemed war'); callAllies(k, target); }
    else if (p.type === 'peace' && atWar(k.id, target.id)) { delete k.wars[target.id]; delete target.wars[k.id]; chronicle(`🕊 ${king.name} brokered peace with the ${target.name}`); }
    else if (p.type === 'rebellion') { const v = villagesOf(target.id).find(o => o.id !== target.capital); if (v) { chronicle(`🕵 Agents of the ${k.name} stirred up ${v.name}`); rebel(v, target); } }
  }
}

// ---------- Magic rites ----------
function riteTick() {
  if (!laws.magicRites || state.tick % (2 * YEAR) !== 70) return;
  for (const rel of life.religions.values()) {
    const vs = [...life.villages.values()].filter(v => v.religion === rel.id);
    const temple = vs.find(v => v.has && v.has.temple);
    if (vs.length < 2 || !temple || rand() > 0.25) continue;
    const enemy = [...life.villages.values()].find(o => o.religion !== rel.id && atWar(temple.kingdom, o.kingdom));
    const rite = pick(enemy ? ['madness', 'vines', 'rebellion', 'quake', 'hell', 'ascension'] : ['ascension']);
    if (rite === 'ascension') { for (const u of life.units) if (!u.dead && u.religion === rel.id && rand() < 0.3) u.blessed = true; }
    else if (rite === 'madness') { for (const u of life.units) if (u.village === enemy.id && rand() < 0.4) u.mad = YEAR; }
    else if (rite === 'vines') { for (const u of life.units) if (kingdomOf(u) === enemy.kingdom && u.role === 'warrior') u.slow = YEAR; }
    else if (rite === 'rebellion') { const k = life.kingdoms.get(enemy.kingdom); if (k && enemy.id !== k.capital) rebel(enemy, k); }
    else if (rite === 'quake') usePower('earthquake', enemy.x, enemy.y);
    else if (rite === 'hell') placeCloud('hell')(enemy.x, enemy.y);
    chronicle(`🔮 The ${rel.name} performed the Rite of ${{ madness: 'Madness', vines: 'Vines', rebellion: 'Rebellion', quake: 'the Quake', hell: 'Hellfire', ascension: 'Ascension' }[rite]}${enemy && rite !== 'ascension' ? ` against ${enemy.name}` : ''}`);
  }
}

// ---------- Subspecies ----------
// Now and then a birth starts a new subspecies with its own look and adaptation.
const ADAPTATIONS = { desert: 'heliophobia', tundra: 'frostProof', permafrost: 'frostProof', infernal: 'fireProof', swamp: 'poisonImmune', jungle: 'agile', grassland: 'fertile', mountain: 'tough', corrupt: 'evil', enchanted: 'healingAura' };
const SUB_WORDS = ['Northern', 'Southern', 'Great', 'Lesser', 'Pale', 'Dusky', 'Red', 'Golden', 'Spotted', 'Shadow', 'Highland', 'River', 'Ashen', 'Striped'];
const TINTS = [[1.2, 1, 0.8], [0.8, 0.9, 1.2], [1.1, 1.1, 1.1], [0.75, 0.75, 0.75], [1.2, 0.8, 0.8], [0.9, 1.2, 0.9], [1.15, 1.05, 0.7]];

function maybeSubspecies(u, parents) {
  if (!laws.evolution || !parents || !parents[0]) return;
  u.sub = parents[0].sub || 0;
  if (rand() > (laws.mutantBox ? 0.01 : 0.002)) return;
  const biome = habitatOf(state.tiles[Math.floor(u.y) * state.W + Math.floor(u.x)]);
  const sub = { id: life.nextId++, race: u.race, name: `${pick(SUB_WORDS)} ${RACES[u.race].name}`, tint: pick(TINTS), traits: [], year: yearOf(state.tick) };
  if (ADAPTATIONS[biome]) sub.traits.push(ADAPTATIONS[biome]);
  if (laws.mutantBox) for (let n = 0; n < 2; n++) sub.traits.push(pick(NATURAL_TRAITS));
  life.subspecies.push(sub);
  if (life.subspecies.length > 400) life.subspecies.shift();
  u.sub = sub.id;
  for (const t of sub.traits) addTrait(u, t);
  if (laws.geneSpaghetti) u.dna = Object.fromEntries(Object.keys(GENES).map(g => [g, clampGene(0.5 + rand() * 1.5)]));
  if (RACES[u.race].civ || rand() < 0.2) chronicle(`🧬 A new subspecies appeared: the ${sub.name}`);
}

const subOf = u => u.sub && life.subspecies.find(s => s.id === u.sub);

const _spawnUnit2 = spawnUnit;
spawnUnit = function (race, x, y, ageYears, parents) {
  if (parents && !RACES[race].civ && !laws.animalBabies) return null;
  const u = _spawnUnit2(race, x, y, ageYears, parents);
  if (u) maybeSubspecies(u, parents);
  return u;
};

// subspecies wear a tint over their race's colors
const _unitSprite = unitSprite;
unitSprite = function (race, cloth, gear, flip, flash, tint) {
  if (!tint) return _unitSprite(race, cloth, gear, flip, flash);
  return cached(`ut|${race}|${cloth}|${gearKey(gear)}|${flip}|${flash}|${tint}`, () => {
    const r = RACES[race];
    const pal = gearPalette({ ...r.colors, c: cloth, l: '#3a2f2a', m: '#c9ced6' }, gear);
    for (const k of Object.keys(r.colors)) {
      const n = parseInt(pal[k].slice(1), 16);
      const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.min(255, Math.round(v * tint[i])));
      pal[k] = '#' + ((ch[0] << 16) | (ch[1] << 8) | ch[2]).toString(16).padStart(6, '0');
    }
    if (flash) for (const k in pal) pal[k] = '#ffffff';
    return detailed(refineSprite(makeSprite(r.drawsGear ? r.art : gearArt(r.art, gear), pal, flip)), r);
  });
};

// ---------- World ages ----------
const AGES = {
  hope:    { name: 'Age of Hope', tint: null },
  sun:     { name: 'Age of Sun', tint: 'rgba(255,230,150,0.08)' },
  dark:    { name: 'Age of Darkness', tint: 'rgba(10,10,40,0.35)' },
  tears:   { name: 'Age of Tears', tint: 'rgba(90,120,180,0.15)' },
  moon:    { name: 'Age of the Moon', tint: 'rgba(60,70,140,0.25)' },
  chaos:   { name: 'Age of Chaos', tint: 'rgba(160,40,60,0.15)' },
  wonders: { name: 'Age of Wonders', tint: 'rgba(200,140,255,0.12)' },
  ice:     { name: 'Age of Ice', tint: 'rgba(200,230,255,0.22)' },
  ash:     { name: 'Age of Ash', tint: 'rgba(90,80,70,0.3)' },
  despair: { name: 'Age of Despair', tint: 'rgba(40,30,30,0.3)' },
};
const AGE_YEARS = 50;

function currentAge() { return AGES[life.age] ? life.age : 'hope'; }

function ageTick() {
  if (state.tick % (AGE_YEARS * YEAR) === 0 && state.tick > 0) {
    life.age = pick(Object.keys(AGES).filter(a => a !== life.age));
    chronicle(`🌗 The ${AGES[life.age].name} has begun`);
  }
  const age = currentAge();
  if (state.tick % 30) return;
  const x = rand() * state.W, y = rand() * state.H;
  // each age has its weather and its moods
  if (age === 'tears' && rand() < 0.15) placeCloud('rain')(x, y);
  else if ((age === 'ice' || laws.foreverCold) && rand() < 0.15) placeCloud('snow')(x, y);
  else if (age === 'ash' && rand() < 0.15) placeCloud('ash')(x, y);
  else if (age === 'wonders' && rand() < 0.1) placeCloud('magic')(x, y);
  else if (age === 'chaos' && rand() < 0.05) { const u = pick(life.units); if (u && !u.blessed) u.mad = YEAR / 2; }
  if (laws.lifeClouds && rand() < 0.02) placeCloud('life')(x, y);
  if (laws.naturalDisasters && rand() < 0.008) {
    if (!isWater(state.tiles[Math.floor(y) * state.W + Math.floor(x)])) pick([() => summonTornado(x, y), () => summonVolcano(x, y), () => usePower('meteor', x, y), () => usePower('earthquake', x, y)])();
  }
  for (const u of life.units) {
    if (!RACES[u.race].civ || rand() > 0.02) continue;
    if (age === 'hope' || age === 'sun') u.happy = Math.min(100, (u.happy ?? 60) + 1);
    else if (age === 'despair' || age === 'dark') u.happy = Math.max(0, (u.happy ?? 60) - 1);
  }
}

function drawAge() {
  const tint = AGES[currentAge()].tint;
  if (!tint) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, view.width, view.height);
}

// ---------- Natural invasions ----------
function edgePoint() {
  const side = (rand() * 4) | 0;
  return side === 0 ? [2, rand() * state.H] : side === 1 ? [state.W - 2, rand() * state.H] : side === 2 ? [rand() * state.W, 2] : [rand() * state.W, state.H - 2];
}

const INVASIONS = {
  wildMage() { const v = pick([...life.villages.values()]); if (v) { spawnUnit('darkmage', v.x + 8, v.y, 40); chronicle(`🧙 A wild mage wandered toward ${v.name}`); } },
  farDragon() { const [x, y] = edgePoint(); spawnUnit('dragon', x, y, 100); chronicle('🐉 A dragon flew in from far lands'); },
  aliens() { const v = pick([...life.villages.values()]); if (v) { summonUfo(v.x + 10, v.y - 10); chronicle('👽 An alien invasion began'); } },
  hellspawn() {
    const v = pick([...life.villages.values()]);
    if (!v) return;
    placeStructure('flameTower')(v.x + 12, v.y + 4);
    for (let k = 0; k < 4; k++) spawnUnit('demon', v.x + 12 + rand() * 2, v.y + 4 + rand() * 2, 20);
    chronicle(`😈 Hellspawn erupted near ${v.name}`);
  },
  necromancer() {
    const v = [...life.villages.values()].find(v => v.has && (v.stone || 0) > 0) || pick([...life.villages.values()]);
    if (v) { spawnUnit('necromancer', v.x + 6, v.y + 6, 60); chronicle(`💀 A necromancer crawled out of the mines of ${v.name}`); }
  },
  gardenSurprise() {
    const v = [...life.villages.values()].find(v => v.has && v.has.windmill);
    if (!v) return;
    for (let k = 0; k < 3; k++) spawnUnit('treant', v.x + (rand() - 0.5) * 8, v.y + (rand() - 0.5) * 8, 5);
    chronicle(`🌳 The gardens of ${v.name} came alive`);
  },
  ashBandits() {
    const [x, y] = edgePoint();
    const v = nearestVillage(x, y, 400, () => true);
    const bx = v ? v.x + 12 : x, by = v ? v.y : y;
    for (let k = 0; k < 5; k++) if (walkable(bx + k * 0.5, by)) spawnUnit('bandit', bx + k * 0.5, by, 25);
    chronicle('🏴 A band of ash bandits appeared');
  },
  moonHorrors() { for (let k = 0; k < 5; k++) { const [x, y] = edgePoint(); spawnUnit('ghost', x, y, 10); } chronicle('🌕 Moon horrors drifted out of the night'); },
  iceOnes() { const v = pick([...life.villages.values()]); if (v) { placeStructure('iceTower')(v.x - 12, v.y); chronicle(`🧊 Ice Ones descended near ${v.name}`); } },
  snowman() { const v = pick([...life.villages.values()]); if (v) { spawnUnit('snowman', v.x + 3, v.y + 3, 1); chronicle(`⛄ A snowman suddenly appeared in ${v.name}`); } },
  madThoughts() { const v = pick([...life.villages.values()]); if (v) { for (const u of life.units) if (u.village === v.id && !has(u, 'strongMinded')) u.mad = YEAR; chronicle(`🌀 ${v.name} was gripped by mad thoughts`); } },
};

function invasionTick() {
  if (!laws.invasions || state.tick % (5 * YEAR) !== 200 || !life.villages.size || rand() > 0.5) return;
  const age = currentAge();
  const pool = Object.keys(INVASIONS);
  // the age leans on which horrors come
  const kind = age === 'moon' ? 'moonHorrors' : age === 'ice' ? 'iceOnes' : age === 'ash' ? 'ashBandits' : age === 'chaos' ? 'madThoughts' : pick(pool);
  INVASIONS[kind]();
}

// ---------- The Rat King ----------
function ratKingTick() {
  if (state.tick % 120) return;
  const rats = life.units.filter(u => !u.dead && u.race === 'rat');
  if (rats.length < 20) return;
  for (const r of rats) {
    const pack = rats.filter(o => !o.dead && dist(o.x, o.y, r.x, r.y) < 4);
    if (pack.length < 20) continue;
    for (const o of pack) killUnit(o, 'merged into the Rat King');
    for (const u of life.units) if (!u.dead && !u.immune && dist(u.x, u.y, r.x, r.y) < 10 && rand() < 0.5) u.sick = 1;
    chronicle('🐀 A Rat King formed and spread the plague');
    return;
  }
}

// ---------- Laws that act every tick ----------
function lawTick() {
  if (state.tick % 15) return;
  const { W, H, tiles } = state;
  for (let k = 0; k < 40; k++) {
    const i = (rand() * W * H) | 0, t = tiles[i], x = i % W, y = (i / W) | 0;
    if (laws.erosion && isGround(t)) { for (const [dx, dy] of NEIGHBORS) { const nx = x + dx, ny = y + dy; if (inBounds(nx, ny) && isWater(tiles[ny * W + nx]) && rand() < 0.1) { setTile(x, y, T.SAND); break; } } }
    if (laws.highFlora && isGround(t) && BIOMES[biomeOf(t)].tree !== null && rand() < 0.2) setTile(x, y, BIOMES[biomeOf(t)].tree);
    if (laws.minerals && t === T.HILLS && rand() < 0.02) setTile(x, y, pick([T.STONE_ORE, T.IRON_ORE, T.IRON_ORE, T.SILVER_ORE, T.GOLD_ORE]));
    if (laws.biomeOvergrowth && isPlant(t)) { const [dx, dy] = pick(NEIGHBORS), nx = x + dx, ny = y + dy; if (inBounds(nx, ny) && isPlant(tiles[ny * W + nx]) && rand() < 0.3) setTile(nx, ny, inBiome(tiles[ny * W + nx], biomeOf(t))); }
  }
  if (laws.terramorphing) {
    const RACE_BIOME = { human: 'grassland', elf: 'enchanted', orc: 'savanna', dwarf: 'rocklands' };
    for (const v of life.villages.values()) {
      const b = RACE_BIOME[v.race];
      if (!b || rand() > 0.3) continue;
      const x = Math.floor(v.x + (rand() - 0.5) * v.radius * 2), y = Math.floor(v.y + (rand() - 0.5) * v.radius * 2);
      if (inBounds(x, y) && isPlant(tiles[y * W + x])) setTile(x, y, inBiome(tiles[y * W + x], b));
    }
  }
  if (laws.handsomeMigrants && state.tick % (2 * YEAR) === 0) {
    const v = [...life.villages.values()].find(v => v.pop < 10);
    if (v) for (let n = 0; n < 2; n++) { const m = spawnUnit(v.race, v.x + 1, v.y + 1, 20); if (m) { addTrait(m, 'attractive'); joinVillage(m, v); } }
  }
}

// creature-level law effects, from statusTick
function lawCreatureEffects(u, r) {
  const t = state.tiles[Math.floor(u.y) * state.W + Math.floor(u.x)];
  if (laws.entanglewood && isTree(t) && !r.flies) u.slow = Math.max(u.slow || 0, 3);
  if (laws.rootPranks && isTree(t) && !r.flies && rand() < 0.001) u.stun = 20;
  if (laws.nectarNap && t === T.FLOWERS && rand() < 0.001) u.sleep = 100;
  if (laws.explodingMushrooms && t === T.MUSHROOMS && !r.flies && rand() < 0.05) {
    const x = Math.floor(u.x), y = Math.floor(u.y);
    setTile(x, y, localGround(x, y));
    boom(u.x, u.y, 1.5, { cause: 'blown up by a mushroom' });
  }
}

// ---------- Diplomacy powers ----------
function kingdomAt(x, y) {
  const tx = Math.floor(x), ty = Math.floor(y);
  if (!inBounds(tx, ty)) return null;
  const v = life.villages.get(life.owner[ty * state.W + tx]) || nearestVillage(x, y, 6, () => true);
  return v ? { v, k: life.kingdoms.get(v.kingdom) } : null;
}

function diplomacyPower(fn) {
  return (x, y) => {
    const hit = kingdomAt(x, y);
    if (!hit || !hit.k) { toast('Click on a kingdom'); return; }
    fn(hit.k, hit.v);
  };
}

const DIPLOMACY = {
  spite: (k) => { for (const o of life.kingdoms.values()) if (o !== k && kingdomsNear(o, k) && !atWar(o.id, k.id)) { delete alliesOf(o)[k.id]; delete alliesOf(k)[o.id]; declareWar(o, k, 'war out of spite'); } },
  friendship: (k) => { for (const id of Object.keys(k.wars)) { const o = life.kingdoms.get(+id); if (o) { delete o.wars[k.id]; } } k.wars = {}; chronicle(`🕊 A wave of friendship washed over the ${k.name}; its wars are over`); },
  inspiration: (k, v) => { if (v.id === k.capital) { toast('The capital is already its own master'); return; } rebel(v, k); },
  whisperOfWar: (k) => { const o = [...life.kingdoms.values()].filter(o => o !== k && !atWar(o.id, k.id)).sort((a, b) => kingdomsNear(k, a) ? -1 : 1)[0]; if (o) { delete alliesOf(o)[k.id]; delete alliesOf(k)[o.id]; declareWar(k, o, 'a whispered war'); } },
  discord: (k) => { for (const id of Object.keys(alliesOf(k))) { const o = life.kingdoms.get(+id); if (o) delete alliesOf(o)[k.id]; } k.allies = {}; chronicle(`💔 Discord tore the ${k.name} out of its alliances`); },
  unity: (k) => { const o = [...life.kingdoms.values()].find(o => o !== k && kingdomsNear(k, o) && !allied(k, o)); if (o) { delete k.wars[o.id]; delete o.wars[k.id]; alliesOf(k)[o.id] = alliesOf(o)[k.id] = state.tick; chronicle(`🤝 Unity bound the ${k.name} and the ${o.name} together`); } },
};

Object.assign(POWERS, {
  spite:        { label: '😠 Spite',          radius: 1, repeat: 0, use: diplomacyPower(DIPLOMACY.spite) },
  friendship:   { label: '🕊️ Friendship',     radius: 1, repeat: 0, use: diplomacyPower(DIPLOMACY.friendship) },
  inspiration:  { label: '💡 Inspiration',    radius: 1, repeat: 0, use: diplomacyPower(DIPLOMACY.inspiration) },
  whisperOfWar: { label: '🗡️ Whisper of War', radius: 1, repeat: 0, use: diplomacyPower(DIPLOMACY.whisperOfWar) },
  discord:      { label: '💔 Discord',        radius: 1, repeat: 0, use: diplomacyPower(DIPLOMACY.discord) },
  unity:        { label: '🤝 Unity',          radius: 1, repeat: 0, use: diplomacyPower(DIPLOMACY.unity) },
});
POWER_GROUPS['Diplomacy'] = ['spite', 'friendship', 'inspiration', 'whisperOfWar', 'discord', 'unity'];

// ---------- Wrappers around older systems ----------
// conquest: renown for the winner, grief for the losers, and xenophobes raze
const _captureVillage = captureVillage;
captureVillage = function (v, kid) {
  const winner = life.kingdoms.get(kid), loser = life.kingdoms.get(v.kingdom);
  if (winner) winner.renown = (winner.renown || 0) + 10;
  for (const u of life.units) if (u.village === v.id) u.happy = Math.max(0, (u.happy ?? 60) - 30);
  if (loser && loser.capital === v.id) for (const u of life.units) if (kingdomOf(u) === loser.id) u.happy = Math.max(0, (u.happy ?? 60) - 15);
  if (winner && metaHas(cultureOf(winner), 'xenophobic') && winner.race !== v.race) { destroyVillage(v, `was razed by the ${winner.name}`); return; }
  _captureVillage(v, kid);
};

// regicide: whoever slays a ruler from another kingdom takes the whole realm for
// their own kingdom and becomes lord of its old capital (v.lord)
const _onKillRegicide = onKill;
onKill = function (killer, victim) {
  _onKillRegicide(killer, victim);
  const k = victim.king && life.kingdoms.get(victim.king);
  if (!k || k.king !== victim.id || !killer || killer.dead || !RACES[killer.race].civ) return;
  const mine = life.kingdoms.get(kingdomOf(killer));
  if (!mine || mine.id === k.id) return;
  const cap = life.villages.get(k.capital);
  chronicle(`🗡 ${killer.name} of the ${mine.name} slew ${victim.name}, ruler of the ${k.name}, and took the realm`);
  mine.renown = (mine.renown || 0) + 25;
  if (cap) _captureVillage(cap, mine.id);   // taking the capital takes every city and ends the old kingdom
  for (const v of villagesOf(k.id)) _captureVillage(v, mine.id);   // (only if it somehow had no capital)
  if (cap && life.villages.has(cap.id)) {
    joinVillage(killer, cap);
    killer.role = 'worker';
    cap.lord = killer.id;
  }
};

// a village's lord, if they're still alive and living there
function lordOf(v) {
  const u = v.lord && life.byId.get(v.lord);
  return u && !u.dead && u.village === v.id ? u : null;
}

const _statusTick = statusTick;
statusTick = function (u, r) {
  if (_statusTick(u, r)) return true;
  lawCreatureEffects(u, r);
  return false;
};

const _extraStatMult = extraStatMult;
extraStatMult = u => _extraStatMult(u) * (u.clan && clanTraits(u.clan).includes('warriorClan') ? 1.2 : 1);

const _updateFaith = updateFaith;
updateFaith = function (v) {
  _updateFaith(v);
  const rel = life.religions.get(v.religion);
  if (metaHas(rel, 'zealous')) _updateFaith(v);
  if (metaHas(rel, 'healing') && v.has && v.has.temple) { const u = pickResident(v, o => o.sick); if (u) { u.sick = 0; u.immune = true; } }
  if (metaHas(rel, 'bloodCult') && rand() < 0.001) {
    const victim = pickResident(v, isAdult);
    if (victim) { killUnit(victim, `sacrificed to the ${rel.name}`); for (const u of life.units) if (u.village === v.id && rand() < 0.5) u.blessed = true; }
  }
};

const _readBook = readBook;
readBook = function (v) {
  _readBook(v);
  const book = life.books.find(b => b.village === v.id);
  const lang = book && life.languages.get(book.lang);
  if (metaHas(lang, 'doomedGlyphs') && rand() < 0.05) { usePower('meteor', v.x + (rand() - 0.5) * 6, v.y + (rand() - 0.5) * 6); chronicle(`☄ Someone in ${v.name} read the doomed glyphs aloud`); }
  if (metaHas(lang, 'beautifulScript')) { const u = pickResident(v); if (u) u.happy = Math.min(100, (u.happy ?? 60) + 5); }
  if (metaHas(lang, 'ancient')) { const u = pickResident(v, isAdult); if (u && rand() < 0.1) addTrait(u, 'wise'); }
};

const _drawStatusIcons = drawStatusIcons;
drawStatusIcons = function (u, sx, sy, w, h, sc) {
  _drawStatusIcons(u, sx, sy, w, h, sc);
  if (u.king && life.kingdoms.get(u.king)?.king === u.id) {
    ctx.fillStyle = '#ffd34d';
    const cx = sx + w / 2, top = sy - 2 * sc;
    ctx.fillRect(cx - 2 * sc, top, 4 * sc, sc);
    ctx.fillRect(cx - 2 * sc, top - sc, sc, sc);
    ctx.fillRect(cx - sc / 2, top - sc, sc, sc);
    ctx.fillRect(cx + sc, top - sc, sc, sc);
  }
};

const _unitExtraRows2 = unitExtraRows;
unitExtraRows = function (u) {
  const rows = _unitExtraRows2(u);
  const sub = subOf(u);
  if (sub) rows.unshift(['Subspecies', sub.name]);
  if (u.king && life.kingdoms.get(u.king)?.king === u.id) rows.unshift(['Title', `👑 Ruler of the ${life.kingdoms.get(u.king).name}`]);
  else if (u.village && lordOf(life.villages.get(u.village) || {}) === u) rows.unshift(['Title', `🗡 Lord of ${life.villages.get(u.village).name}`]);
  if (u.clan && clanTraits(u.clan).length) rows.push(['Clan traits', clanTraits(u.clan).map(t => META_TRAITS.clan[t].split(' (')[0]).join(', ')]);
  return rows;
};

// ---------- Tick & draw ----------
function politicsTick() {
  armyTick();
  plotTick();
  riteTick();
  ageTick();
  invasionTick();
  ratKingTick();
  lawTick();
  if (state.tick % 60 === 15) {
    for (const k of life.kingdoms.values()) {
      kingOf(k);
      // renown: grows with size, fades slowly
      k.renown = Math.max(0, (k.renown || 0) * 0.99 + villagesOf(k.id).length * 0.2);
      if (metaHas(k, 'mercantile')) k.gold = (k.gold || 0) + villagesOf(k.id).length * 0.5;
    }
  }
}

// arrows from army captains to their targets, crowns on kings
function drawPolitics(ox, oy, z) {
  for (const k of life.kingdoms.values()) {
    const a = k.army;
    const captain = a && life.byId.get(a.captain), target = a && life.villages.get(a.target);
    if (!captain || captain.dead || !target || a.state !== 'march') continue;
    ctx.strokeStyle = k.color;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = Math.max(1, z * 0.3);
    ctx.setLineDash([z, z * 0.6]);
    ctx.beginPath();
    ctx.moveTo(ox + captain.x * z, oy + captain.y * z);
    ctx.lineTo(ox + target.x * z, oy + target.y * z);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}
