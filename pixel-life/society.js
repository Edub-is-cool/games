'use strict';

// Languages, religions and alliances. Kingdoms speak a language and take
// their capital's religion; both shape who goes to war and who allies.

// ---------- Languages ----------
const CONSONANTS = ['b', 'd', 'f', 'g', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z', 'th', 'sh', 'kr', 'gr', 'dr'];
const VOWELS = ['a', 'e', 'i', 'o', 'u', 'ae', 'ia', 'ou'];
const syllable = () => pick(CONSONANTS) + pick(VOWELS) + (rand() < 0.4 ? pick(CONSONANTS) : '');
const capitalize = w => w.charAt(0).toUpperCase() + w.slice(1);

// A new language grows from its race's naming sounds (or from a parent
// language, for dialects), with some sounds swapped out.
function makeLanguage(race, parent) {
  const base = parent ? parent.parts : NAME_PARTS[race] || SAPIENT_NAMES;
  const parts = base.map(list => list.map(p => (rand() < 0.35 ? capitalize(syllable()).slice(0, 4) : p)));
  parts[1] = parts[1].map(p => p.toLowerCase());
  const root = pick(parts[0]) + pick(parts[1]);
  const lang = {
    id: life.nextId++, race, parent: parent ? parent.id : 0,
    name: (parent ? pick(['New ', 'Low ', 'High ', 'Old ']) : '') + root + pick(['ish', 'ic', 'an', 'ese', 'i', 'ar']),
    parts,
    words: Array.from({ length: 24 }, () => syllable() + (rand() < 0.5 ? syllable() : '')),
  };
  life.languages.set(lang.id, lang);
  return lang;
}

function languageOf(k) {
  if (!k) return null;
  let lang = life.languages.get(k.language);
  if (!lang) { lang = makeLanguage(k.race); k.language = lang.id; }
  return lang;
}

const nameIn = lang => pick(lang.parts[0]) + pick(lang.parts[1]);

function phrase(lang) {
  const n = 1 + ((rand() * 3) | 0);
  const words = Array.from({ length: n }, () => pick(lang.words));
  return capitalize(words.join(' ')) + pick(['!', '.', '?', '...', '!']);
}

// a few villagers chatting at any moment
function chatter() {
  for (let n = 0; n < 2; n++) {
    const u = life.units[(rand() * life.units.length) | 0];
    if (!u || u.dead || !RACES[u.race].civ || !isAdult(u)) continue;
    const lang = life.languages.get(u.language);
    u.say = lang ? phrase(lang) : pick(['...?', 'Uhh...', '?!', 'Mmh?']);
    u.sayUntil = state.tick + 25;
  }
}

// ---------- Religions ----------
const DEITIES = ['the Sun', 'the Moon', 'the Deep', 'the Flame', 'the Stars', 'the Green Mother', 'the Storm',
  'the Mountain', 'the Void', 'the Harvest', 'the Great Sheep', 'the Old Tree', 'the Iron Father', 'the Tides'];
const FAITHS = ['Church', 'Cult', 'Order', 'Faith', 'Temple', 'Path', 'Brotherhood', 'Way'];
const SYMBOLS = ['☀', '☾', '✦', '✚', '☯', '♆', '⚚', '✿', '⛤', '❖', '⚘', '☄'];

function foundReligion(v) {
  const used = new Set([...life.religions.values()].map(r => r.symbol));
  const rel = {
    id: life.nextId++,
    name: `${pick(FAITHS)} of ${rand() < 0.3 ? nameIn(languageOf(life.kingdoms.get(v.kingdom)) || { parts: SAPIENT_NAMES }) : pick(DEITIES)}`,
    symbol: SYMBOLS.find(s => !used.has(s)) || pick(SYMBOLS),
    color: pick(KINGDOM_COLORS),
    founded: state.tick,
    origin: v.name,
  };
  life.religions.set(rel.id, rel);
  setReligion(v, rel.id);
  chronicle(`📿 A prophet in ${v.name} founded the ${rel.name}`);
}

// the whole village takes up a faith together
function setReligion(v, id) {
  v.religion = id;
  for (const u of life.units) if (u.village === v.id && !u.dead) u.religion = id;
}

function religionOfKingdom(k) {
  const capital = k && life.villages.get(k.capital);
  return capital ? capital.religion || 0 : 0;
}

// Called from updateVillage: prophets, missionaries and the capital's pull.
function updateFaith(v) {
  if (!v.religion) {
    if (v.pop >= 10 && rand() < 0.002) foundReligion(v);
  }
  if (rand() > 0.004) return;
  const k = life.kingdoms.get(v.kingdom);
  const capRel = religionOfKingdom(k);
  if (capRel && capRel !== v.religion && rand() < 0.6) {
    setReligion(v, capRel);
    return;
  }
  // a missionary from a nearby village
  const o = nearestVillage(v.x, v.y, 35, o => o !== v && o.religion && o.religion !== v.religion);
  if (o && rand() < 0.5) setReligion(v, o.religion);
}

// ---------- Alliances & diplomacy ----------
const alliesOf = k => (k.allies ||= {});
const allied = (a, b) => alliesOf(a)[b.id] !== undefined;

function kingdomsNear(a, b) {
  const va = villagesOf(a.id), vb = villagesOf(b.id);
  return va.some(x => vb.some(y => dist(x.x, x.y, y.x, y.y) < 45));
}

function declareWar(a, b, reason) {
  if (a.wars[b.id] !== undefined) return;
  a.wars[b.id] = b.wars[a.id] = state.tick;
  chronicle(`⚔ The ${a.name} declared ${reason || 'war'} on the ${b.name}`);
}

function diplomacy() {
  const ks = [...life.kingdoms.values()];
  for (let i = 0; i < ks.length; i++) {
    for (let j = i + 1; j < ks.length; j++) {
      const a = ks[i], b = ks[j];
      const ra = religionOfKingdom(a), rb = religionOfKingdom(b);
      const sameFaith = ra && ra === rb, otherFaith = ra && rb && ra !== rb;
      const sameTongue = a.language && a.language === b.language;

      if (a.wars[b.id] !== undefined) {
        if (state.tick - a.wars[b.id] > 4 * YEAR && rand() < 0.1) {
          delete a.wars[b.id];
          delete b.wars[a.id];
          chronicle(`The ${a.name} and the ${b.name} made peace`);
        }
        continue;
      }
      if (allied(a, b)) {
        if (rand() < (otherFaith ? 0.02 : 0.006)) {
          delete alliesOf(a)[b.id];
          delete alliesOf(b)[a.id];
          chronicle(`The alliance between the ${a.name} and the ${b.name} has ended`);
        }
        continue;
      }
      if (!kingdomsNear(a, b)) continue;

      let war = 0.02 * RACES[a.race].aggression * RACES[b.race].aggression * laws.war;
      if (a.race !== b.race) war *= 2;
      if (sameFaith) war *= 0.4;
      if (otherFaith) war *= 1.5;
      if (sameTongue) war *= 0.6;
      let ally = 0.006 / Math.max(RACES[a.race].aggression, RACES[b.race].aggression);
      if (a.race === b.race) ally *= 2;
      if (sameFaith) ally *= 3;
      if (sameTongue) ally *= 2;
      if (!laws.alliances) ally = 0;

      const roll = rand();
      if (roll < war) {
        declareWar(a, b, otherFaith ? 'a holy war' : 'war');
        callAllies(a, b);
      } else if (roll < war + ally) {
        alliesOf(a)[b.id] = alliesOf(b)[a.id] = state.tick;
        chronicle(`🤝 The ${a.name} and the ${b.name} formed an alliance`);
      }
    }
  }
  checkHeritage();
  // the odd kingdom changes its tongue over time
  for (const k of ks) {
    if (state.tick - k.founded > 20 * YEAR && villagesOf(k.id).length >= 3 && rand() < 0.003) {
      const old = k.language, lang = makeLanguage(k.race, languageOf(k));
      k.language = lang.id;
      for (const u of life.units) if (kingdomOf(u) === k.id && u.language === old) u.language = lang.id;
      chronicle(`🗣 The ${k.name} now speak ${lang.name}`);
    }
  }
}

// allies on both sides join the fight
function callAllies(a, b) {
  for (const id of Object.keys(alliesOf(a))) {
    const c = life.kingdoms.get(+id);
    if (c && c !== b && !allied(c, b)) declareWar(c, b, 'war (as an ally)');
  }
  for (const id of Object.keys(alliesOf(b))) {
    const d = life.kingdoms.get(+id);
    if (d && d !== a && !allied(d, a)) declareWar(d, a, 'war (as an ally)');
  }
}

function forgetKingdom(k) {
  for (const o of life.kingdoms.values()) {
    delete o.wars[k.id];
    delete alliesOf(o)[k.id];
  }
}

// ---------- Cultures ----------
const CULTURE_TRAITS = {
  warlike:   'Warlike (+20% damage)',
  farmers:   'Farmers (+30% harvest)',
  scholars:  'Scholars (work 25% faster)',
  builders:  'Builders (cheaper houses)',
  seafarers: 'Seafarers (build docks early)',
  smiths:    'Smiths (make gear twice as often)',
};

// the land a people starts on shapes their ways
const BIOME_CULTURE = {
  grassland: 'farmers', savanna: 'warlike', desert: 'smiths', jungle: 'scholars', swamp: 'farmers',
  tundra: 'builders', corrupt: 'warlike', enchanted: 'scholars',
};

function makeCulture(race, lang, x, y) {
  const traits = Object.keys(CULTURE_TRAITS).sort(() => rand() - 0.5).slice(0, 2);
  if (x !== undefined && inBounds(x, y)) {
    let coast = false;
    for (let dy = -5; dy <= 5 && !coast; dy++) for (let dx = -5; dx <= 5; dx++) if (inBounds(x + dx, y + dy) && isWater(state.tiles[(y + dy) * state.W + x + dx])) { coast = true; break; }
    const fromLand = coast && rand() < 0.5 ? 'seafarers' : BIOME_CULTURE[biomeOf(state.tiles[y * state.W + x])];
    if (fromLand && !traits.includes(fromLand)) traits[0] = fromLand;
  }
  if (race === 'orc' && !traits.includes('warlike')) traits[1] = 'warlike';
  const c = { id: life.nextId++, race, name: capitalize(nameIn(lang).toLowerCase()) + pick(['ian', 'ite', 'ese', 'ic']), traits };
  life.cultures.set(c.id, c);
  return c;
}

function cultureOf(k) {
  if (!k) return null;
  let c = life.cultures.get(k.culture);
  if (!c) { c = makeCulture(k.race, languageOf(k)); k.culture = c.id; }
  return c;
}

// bonus from the creature's own culture (nothing if they've forgotten it)
function cultureMult(u, trait, mult) {
  const c = u.culture && life.cultures.get(u.culture);
  return c && c.traits.includes(trait) ? mult : 1;
}

// village-wide bonus from the kingdom's culture
function kingdomHas(v, trait) {
  const c = cultureOf(life.kingdoms.get(v.kingdom));
  return !!c && c.traits.includes(trait);
}

// ---------- Families ----------
const CLAN_ENDINGS = ['son', 'wood', 'helm', 'foot', 'born', 'ard', 'ling', 'mane', 'stone', 'vale'];
const newClan = lang => capitalize((lang ? nameIn(lang) : syllable()).toLowerCase()) + pick(CLAN_ENDINGS);

// a newborn learns the village's ways and takes a parent's family name
function bornInto(baby, mom, dad) {
  const k = life.kingdoms.get(kingdomOf(baby));
  baby.clan = (mom && mom.clan) || (dad && dad.clan) || newClan(languageOf(k));
}

// someone joining a village picks up its language, culture and faith
function learnWays(u, v) {
  const k = life.kingdoms.get(v.kingdom);
  if (!k) return;
  u.language = languageOf(k).id;
  u.culture = cultureOf(k).id;
  u.religion = v.religion || 0;
  u.clan ||= newClan(languageOf(k));
}

// Forgotten ways come back slowly from the people around them, and
// villagers drift into their village's faith.
function relearn(u, v) {
  const k = life.kingdoms.get(v.kingdom);
  if (!k) return;
  if (!u.language) u.language = languageOf(k).id;
  else if (!u.culture) u.culture = cultureOf(k).id;
  else if (u.religion !== (v.religion || 0)) u.religion = v.religion || 0;
}

// family members stand up for each other
function familyDefends(victim, attacker) {
  if (!victim.clan || victim.dead) return;
  const kin = nearest(victim.x, victim.y, 5, o => o !== victim && o !== attacker && o.clan === victim.clan && isAdult(o));
  if (kin && kin.clan !== attacker.clan) kin.lastHitBy = attacker.id;
}

// A kingdom whose capital mostly forgot its language, culture or faith
// loses it; the remaining speakers carry the new one forward.
function checkHeritage() {
  for (const k of life.kingdoms.values()) {
    const capV = life.villages.get(k.capital);
    if (!capV || capV.pop < 3) continue;
    const people = life.units.filter(u => !u.dead && u.village === capV.id);
    const share = test => people.filter(test).length / people.length;
    if (share(u => u.language === k.language) < 0.3) {
      const old = k.language, lang = makeLanguage(k.race);
      k.language = lang.id;
      // the ones who forgot make up a new tongue together
      for (const u of life.units) if (kingdomOf(u) === k.id && (u.language === old || !u.language)) u.language = lang.id;
      chronicle(`🗣 The ${k.name} forgot their tongue and now speak ${lang.name}`);
    }
    if (share(u => u.culture === k.culture) < 0.3) {
      const old = k.culture, c = makeCulture(k.race, languageOf(k));
      k.culture = c.id;
      for (const u of life.units) if (kingdomOf(u) === k.id && (u.culture === old || !u.culture)) u.culture = c.id;
      chronicle(`🎭 The ${k.name} lost their old ways and became ${c.name}`);
    }
  }
  for (const v of life.villages.values()) {
    if (!v.religion || v.pop < 3) continue;
    const believers = life.units.filter(u => !u.dead && u.village === v.id && u.religion === v.religion).length;
    if (believers < v.pop * 0.3) {
      chronicle(`🕯 ${v.name} has forgotten the ${life.religions.get(v.religion)?.name || 'old faith'}`);
      v.religion = 0;
    }
  }
}
