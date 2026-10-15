'use strict';

// Personality, body, elemental and death traits; kill titles and levels;
// combat moves; statuses; happiness; mana and spells; and the life powers
// (status rains, clone rain, Smooth Jazz, trait and loot rains, desire
// objects, brains, living plants and houses). Loaded after powers.js.

// ---------- Traits ----------
// cat groups them in the editor. mods multiply genes (see gear.js).
const NEW_TRAITS = {
  // mind
  ambitious:   { cat: 'Mind', name: 'Ambitious' },
  content:     { cat: 'Mind', name: 'Content' },
  greedy:      { cat: 'Mind', name: 'Greedy' },
  honest:      { cat: 'Mind', name: 'Honest', opposite: 'deceitful' },
  deceitful:   { cat: 'Mind', name: 'Deceitful', opposite: 'honest' },
  paranoid:    { cat: 'Mind', name: 'Paranoid' },
  pacifist:    { cat: 'Mind', name: 'Pacifist', opposite: 'bloodlust' },
  bloodlust:   { cat: 'Mind', name: 'Bloodlust', opposite: 'pacifist', mods: { strength: 1.15 } },
  peaceful:    { cat: 'Mind', name: 'Peaceful' },
  psychopath:  { cat: 'Mind', name: 'Psychopath' },
  hotheaded:   { cat: 'Mind', name: 'Hotheaded' },
  thief:       { cat: 'Mind', name: 'Thief' },
  wise:        { cat: 'Mind', name: 'Wise', mods: { intellect: 1.15 } },
  strongMinded:{ cat: 'Mind', name: 'Strong-minded' },
  evil:        { cat: 'Mind', name: 'Evil' },
  gifted:      { cat: 'Mind', name: 'Magic-gifted' },
  // body
  giant:       { cat: 'Body', name: 'Giant', opposite: 'tiny', mods: { vitality: 1.5, strength: 1.3, speed: 0.9 }, size: 1.5 },
  tiny:        { cat: 'Body', name: 'Tiny', opposite: 'giant', mods: { vitality: 0.6, strength: 0.7, speed: 1.1 }, size: 0.7 },
  fat:         { cat: 'Body', name: 'Fat', mods: { vitality: 1.2, speed: 0.85 } },
  agile:       { cat: 'Body', name: 'Agile', mods: { speed: 1.1 } },
  attractive:  { cat: 'Body', name: 'Attractive', opposite: 'ugly' },
  ugly:        { cat: 'Body', name: 'Ugly', opposite: 'attractive' },
  oneEyed:     { cat: 'Body', name: 'One-eyed', mods: { strength: 0.9 } },
  goldenTooth: { cat: 'Body', name: 'Golden Tooth' },
  eagleEyed:   { cat: 'Body', name: 'Eagle-eyed', opposite: 'shortSighted' },
  shortSighted:{ cat: 'Body', name: 'Short-sighted', opposite: 'eagleEyed' },
  hardSkin:    { cat: 'Body', name: 'Hard Skin', opposite: 'softSkin' },
  softSkin:    { cat: 'Body', name: 'Soft Skin', opposite: 'hardSkin' },
  // elemental and auras
  fireBlood:   { cat: 'Elemental', name: 'Fire Blood' },
  acidBlood:   { cat: 'Elemental', name: 'Acid Blood' },
  fireProof:   { cat: 'Elemental', name: 'Fire Proof' },
  frostProof:  { cat: 'Elemental', name: 'Frost Proof' },
  acidProof:   { cat: 'Elemental', name: 'Acid Proof' },
  poisonImmune:{ cat: 'Elemental', name: 'Poison Immune' },
  venomous:    { cat: 'Elemental', name: 'Venomous' },
  thorns:      { cat: 'Elemental', name: 'Thorns' },
  coldAura:    { cat: 'Elemental', name: 'Cold Aura' },
  burningFeet: { cat: 'Elemental', name: 'Burning Feet' },
  healingAura: { cat: 'Elemental', name: 'Healing Aura' },
  bubbleDefense:{ cat: 'Elemental', name: 'Bubble Defense' },
  sunblessed:  { cat: 'Elemental', name: 'Sunblessed' },
  heliophobia: { cat: 'Elemental', name: 'Heliophobia' },
  // death and chaos
  deathBomb:   { cat: 'Chaos', name: 'Death Bomb' },
  deathNuke:   { cat: 'Chaos', name: 'Death Nuke', legendary: 'destroyer' },
  energized:   { cat: 'Chaos', name: 'Energized' },
  megaHeartbeat:{ cat: 'Chaos', name: 'Mega Heartbeat' },
  whirlwind:   { cat: 'Chaos', name: 'Whirlwind' },
  markOfDeath: { cat: 'Chaos', name: 'Mark of Death' },
  pyromaniac:  { cat: 'Chaos', name: 'Pyromaniac' },
  bomberman:   { cat: 'Chaos', name: 'Bomberman' },
  // titles, earned by deeds (never inherited or rained)
  veteran:     { cat: 'Titles', name: 'Veteran', mods: { strength: 1.1 }, title: true },
  kingslayer:  { cat: 'Titles', name: 'Kingslayer', title: true },
  dragonslayer:{ cat: 'Titles', name: 'Dragonslayer', mods: { strength: 1.2 }, title: true },
  mageslayer:  { cat: 'Titles', name: 'Mageslayer', title: true },
};
for (const [k, t] of Object.entries(NEW_TRAITS)) TRAITS[k] = { mods: {}, ...t };
for (const t of Object.keys(TRAITS)) if (!TRAITS[t].cat) TRAITS[t].cat = TRAITS[t].legendary ? 'Legendary' : 'Genetic';
for (const [k, t] of Object.entries(NEW_TRAITS)) if (!t.legendary && !t.title && !NATURAL_TRAITS.includes(k)) NATURAL_TRAITS.push(k);
const has = (u, t) => !!u.traits && u.traits.includes(t);

// more racial traits
Object.assign(RACE_TRAITS, {
  dragon: ['strong', 'tough', 'longLived', 'fireProof', 'giant'], demon: ['fireProof', 'evil'], fireelemental: ['fireProof', 'burningFeet'],
  fireskull: ['fireProof'], coldone: ['frostProof', 'coldAura'], snowman: ['frostProof'], penguin: ['frostProof'], polarbear: ['strong', 'tough', 'frostProof'],
  scorpion: ['venomous'], snake: ['venomous'], acidblob: ['acidProof', 'acidBlood'], crabzilla: ['giant', 'hardSkin'], rhino: ['tough', 'hardSkin'],
  turtle: ['longLived', 'slow', 'hardSkin'], dwarf: ['tough', 'frostProof'], elf: ['swift', 'longLived', 'agile'], orc: ['strong', 'hotheaded'],
  angle: ['healingAura'], necromancer: ['evil', 'gifted'], darkmage: ['clever', 'evil', 'gifted'], whitemage: ['clever', 'gifted', 'healingAura'],
  druid: ['wise', 'gifted'], ghost: ['frostProof'], cat: ['agile'], fox: ['swift', 'agile'],
});
// creatures that hatch from eggs
const EGG_LAYERS = new Set(['chicken', 'snake', 'turtle', 'crocodile', 'ostrich', 'dragon', 'penguin', 'frog', 'bee', 'scorpion']);

// ---------- Levels, titles and kills ----------
const levelOf = u => 1 + Math.floor(Math.sqrt((u.xp || 0) / 10));

function extraStatMult(u) {
  return (1 + (levelOf(u) - 1) * 0.05) * (u.powerup > 0 ? 1.5 : 1);
}

function onKill(killer, victim) {
  if (!killer || killer.dead === undefined) return;
  killer.xp = (killer.xp || 0) + 5 + Math.round(RACES[victim.race].hp / 10);
  const grant = t => { if (!has(killer, t)) { addTrait(killer, t); if (RACES[killer.race].civ) chronicle(`🏅 ${killer.name} became a ${TRAITS[t].name}`); } };
  if (killer.kills >= 10) grant('veteran');
  if (victim.race === 'dragon' || victim.race === 'crabzilla') grant('dragonslayer');
  if (RACES[victim.race].wizard || victim.race === 'necromancer' || victim.race === 'druid') grant('mageslayer');
  if (victim.king) grant('kingslayer');
  if (has(killer, 'bloodlust')) killer.happy = Math.min(100, (killer.happy ?? 60) + 5);
}

// ---------- Combat ----------
function takenMult(t) {
  return (has(t, 'hardSkin') ? 0.8 : 1) * (has(t, 'softSkin') ? 1.25 : 1) * (t.powerup > 0 ? 0.8 : 1);
}

// dodge, block and deflect, paid for with stamina
function defend(u, t, dmg, ranged) {
  if (t.stamina === undefined) t.stamina = 100;
  if (t.sleep > 0) { t.sleep = 0; return dmg * 1.5; }   // caught asleep
  if (t.stamina >= 20) {
    if (ranged && (has(t, 'agile') || has(t, 'eagleEyed')) && rand() < 0.2) { t.stamina -= 20; addEffect('ward', t.x, t.y - 0.5, 0.3, {}); return 0; }
    if (rand() < (has(t, 'agile') ? 0.22 : 0.05)) { t.stamina -= 20; return 0; }
    if (t.role === 'warrior' && armorOf(t).def && rand() < 0.15) { t.stamina -= 15; return dmg * 0.5; }
  }
  return dmg;
}

// jump the last few tiles to a target
function tryDash(u, t) {
  if (u.stamina === undefined) u.stamina = 100;
  const d = dist(u.x, u.y, t.x, t.y);
  if (d < 1.2 || d > 3.5 || u.stamina < 35 || rand() > 0.15 || !walkable(t.x, t.y)) return false;
  u.stamina -= 35;
  u.x += ((t.x - u.x) / d) * (d - 0.8);
  u.y += ((t.y - u.y) / d) * (d - 0.8);
  addEffect('puff', u.x, u.y, 0.3, {});
  return true;
}

function afterHit(u, t, dmg) {
  if (dmg <= 0) return;
  if (has(t, 'thorns')) hurt(u, dmg * 0.25, 'pricked by thorns', t);
  if ((has(u, 'venomous') || RACES[u.race].venom) && !has(t, 'poisonImmune')) t.poison = Math.max(t.poison || 0, 60);
  if (has(u, 'whirlwind')) for (const o of life.units) if (o !== u && o !== t && !o.dead && dist(o.x, o.y, u.x, u.y) < 1.4 && isHostile(u, kingdomOf(u), o)) hurt(o, dmg * 0.5, 'caught in a whirlwind', u);
  if (has(t, 'hotheaded')) t.angry = 120;
  if (has(t, 'bubbleDefense') && !t.bubbled && t.hp < maxHp(t) * 0.3) { t.bubbled = true; t.shield = 60; }
  t.happy = Math.max(0, (t.happy ?? 60) - 1);
}

// ---------- Mana and spells ----------
const isCaster = u => has(u, 'gifted') || !!RACES[u.race].wizard;

function trySpell(u, t) {
  if (!isCaster(u)) return false;
  if (u.mana === undefined) u.mana = 50;
  const d = dist(u.x, u.y, t.x, t.y);
  if (u.mana >= 25 && d < 6 && d > 1.5 && rand() < 0.3) {
    u.mana -= 25;
    addEffect('beam', u.x, u.y - 0.6, 0.3, { x2: t.x, y2: t.y, color: '#ff7a1f', w: 3 });
    addEffect('explosion', t.x, t.y, 0.3, { r: 1 });
    for (const o of life.units) if (o !== u && !o.dead && dist(o.x, o.y, t.x, t.y) < 1.2) hurt(o, 14, `hit by ${u.name}'s fireball`, u);
    ignite(Math.floor(t.x), Math.floor(t.y));
    return true;
  }
  if (u.mana >= 40 && d < 7 && rand() < 0.1) {
    u.mana -= 40;
    lightning(t.x, t.y);
    return true;
  }
  if (u.mana >= 30 && u.hp < maxHp(u) * 0.25 && u.village) {
    // blink home to safety
    const v = life.villages.get(u.village);
    if (v) { u.mana -= 30; u.x = u.px = v.x; u.y = u.py = v.y + 1; addEffect('ward', u.x, u.y - 0.5, 0.6, {}); return true; }
  }
  if (u.mana >= 50 && has(u, 'evil') && rand() < 0.05) {
    u.mana -= 50;
    for (let k = 0; k < 2; k++) spawnUnit('skeleton', u.x + (rand() - 0.5) * 2, u.y + 1, 1);
    return true;
  }
  return false;
}

// ---------- Statuses and moods ----------
function speedMult(u) {
  return (u.coffee > 0 ? 1.5 : 1) * (u.slow > 0 ? 0.5 : 1) * (u.angry > 0 ? 1.2 : 1);
}

function sizeMult(u) {
  let s = 1;
  if (u.traits) for (const t of u.traits) if (TRAITS[t]?.size) s *= TRAITS[t].size;
  return s * (u.powerup > 0 ? 1.3 : 1);
}

// Runs every tick for every creature; returns true to skip its normal thinking.
function statusTick(u, r) {
  if (u.stamina !== undefined && u.stamina < 100) u.stamina += 0.5;
  if (u.mana !== undefined && u.mana < 100) u.mana += 0.15;
  for (const k of ['coffee', 'powerup', 'slow', 'angry', 'festive', 'coughing', 'crying', 'tantrum', 'pregnant', 'inspired']) if (u[k] > 0) u[k]--;
  if (u.poison > 0) { u.poison--; if (state.tick % 4 === 0) hurt(u, 0.5, 'poisoned'); }
  if (u.burning > 0) { u.burning--; if (!has(u, 'fireProof')) hurt(u, 0.3, 'burned'); }

  // hatching: eggs sit still until they crack
  if (u.egg > 0) { u.egg--; if (!u.egg) addEffect('spark', u.x, u.y - 0.3, 0.5, {}); return true; }

  // sleeping: woken by damage (see defend), dreams shift the mood
  if (u.sleep > 0) {
    u.sleep--;
    if (state.tick % 30 === 0) u.happy = Math.min(100, Math.max(0, (u.happy ?? 60) + (rand() < 0.7 ? 2 : -4)));
    return true;
  }

  // auras and odd bodies
  if (has(u, 'burningFeet') && rand() < 0.05) ignite(Math.floor(u.x), Math.floor(u.y));
  if (has(u, 'healingAura') && state.tick % 20 === 0) for (const o of life.units) if (!o.dead && o !== u && dist(o.x, o.y, u.x, u.y) < 3 && o.hp < maxHp(o) && !isHostile(u, kingdomOf(u), o)) o.hp = Math.min(maxHp(o), o.hp + 2);
  if (has(u, 'coldAura') && rand() < 0.01) { const o = nearest(u.x, u.y, 2.5, o => o !== u && isHostile(u, kingdomOf(u), o)); if (o && !has(o, 'frostProof')) o.frozen = 30; }
  if (has(u, 'megaHeartbeat') && state.tick % 90 === 0) { for (const o of life.units) if (o !== u && !o.dead && dist(o.x, o.y, u.x, u.y) < 3) o.stun = 15; addEffect('flash', u.x, u.y, 0.3, { r: 3 }); }
  if (has(u, 'sunblessed') && u.hp < maxHp(u)) u.hp = Math.min(maxHp(u), u.hp + 0.02);
  if (has(u, 'heliophobia') && biomeOf(state.tiles[Math.floor(u.y) * state.W + Math.floor(u.x)]) === 'desert' && rand() < 0.02) hurt(u, 1, 'sunburn');
  if (has(u, 'markOfDeath') && rand() < 0.0005) { killUnit(u, 'claimed by the mark of death'); return true; }
  if (has(u, 'psychopath') && !u.mad && rand() < 0.0005) u.mad = 60;
  if (has(u, 'pyromaniac') && rand() < 0.003) {
    const b = [...life.buildings.values()].find(b => dist(b.x + 1, b.y + 1, u.x, u.y) < 5);
    const tx = b ? b.x + 1 : u.x + (rand() - 0.5) * 6, ty = b ? b.y + 1 : u.y + (rand() - 0.5) * 6;
    addEffect('beam', u.x, u.y - 0.6, 0.3, { x2: tx, y2: ty, color: '#ff9a2a', w: 2 });
    ignite(Math.floor(tx), Math.floor(ty));
  }
  if (has(u, 'bomberman') && rand() < 0.0015) {
    const o = nearest(u.x, u.y, 6, o => o !== u && isHostile(u, kingdomOf(u), o));
    if (o && dist(o.x, o.y, u.x, u.y) > 2.5) grenade(o.x, o.y);
  }
  if (has(u, 'thief') && RACES[u.race].civ && rand() < 0.001) {
    // pockets food from a neighboring village
    const v = nearestVillage(u.x, u.y, 10, o => o.id !== u.village && o.food > 4);
    if (v) { v.food -= 3; const home = life.villages.get(u.village); if (home) home.food += 3; }
  }

  // happiness drifts back to normal; unhappy people cry and throw tantrums
  if (RACES[u.race].civ) {
    if (u.happy === undefined) u.happy = 60;
    if (state.tick % 20 === 0) {
      const target = has(u, 'content') ? 70 : 60;
      u.happy += Math.sign(target - u.happy);
      const v = life.villages.get(u.village);
      if (v && v.food <= 0) u.happy -= 2;
      if (u.festive > 0 || u.love) u.happy += 1;
      u.happy = Math.max(0, Math.min(100, u.happy));
    }
    if (u.happy < 15 && !u.crying && rand() < 0.002) u.crying = 120;
    if (u.happy < 8 && !u.tantrum && rand() < 0.002) {
      u.tantrum = 60;
      const b = [...life.buildings.values()].find(b => b.village === u.village && dist(b.x + 1, b.y + 1, u.x, u.y) < 3);
      if (b) damageBuilding(b, 5, 'was wrecked in a tantrum');
    }
    // falling in love: lovers stay together and are happier
    if (!u.love && isAdult(u) && rand() < (has(u, 'attractive') ? 0.0006 : 0.0002)) {
      const o = nearest(u.x, u.y, 3, o => o !== u && o.race === u.race && !o.love && isAdult(o) && !has(o, 'ugly'));
      if (o) { u.love = o.id; o.love = u.id; u.happy = Math.min(100, u.happy + 15); o.happy = Math.min(100, o.happy + 15); addEffect('heart', u.x, u.y - 1, 1, {}); }
    }
  }

  // desires: drop everything and head for the object
  if (u.desire) {
    const s = life.structures.find(s => s.kind === u.desire);
    if (!s) { u.desire = null; return false; }
    if (dist(u.x, u.y, s.x, s.y) > 1.5) { moveToward(u, s.x, s.y); if (u.stuck > 30) u.desire = null; return true; }
    fulfillDesire(u, s);
    return true;
  }
  return false;
}

// a relative's death makes the family grieve
DEATH_HOOKS.push((u) => {
  const kin = life.units.filter(o => !o.dead && ((u.parents && u.parents.includes(o.id)) || (o.parents && o.parents.includes(u.id)) || o.love === u.id));
  for (const o of kin) { o.happy = Math.max(0, (o.happy ?? 60) - 20); o.crying = 150; if (o.love === u.id) o.love = 0; }
  // death traits
  if (has(u, 'deathNuke')) boom(u.x, u.y, 12, { crater: 2, fire: 0.1, ash: true, cause: 'caught in a death nuke' });
  else if (has(u, 'deathBomb')) boom(u.x, u.y, 2.5, { crater: 1, fire: 0.2, cause: 'caught in a death bomb' });
  if (has(u, 'energized')) setTimeout(() => lightning(u.x, u.y), 0);
  if (has(u, 'fireBlood')) for (let k = 0; k < 6; k++) ignite(Math.floor(u.x + (rand() - 0.5) * 3), Math.floor(u.y + (rand() - 0.5) * 3));
  if (has(u, 'acidBlood')) for (let k = 0; k < 4; k++) { const ax = Math.floor(u.x + (rand() - 0.5) * 3), ay = Math.floor(u.y + (rand() - 0.5) * 3); if (inBounds(ax, ay)) acidOn(ax, ay); }
});

// newborns of egg-laying kinds start as eggs; pregnancy shows on the mother
const _spawnUnit = spawnUnit;
spawnUnit = function (race, x, y, ageYears, parents) {
  const u = _spawnUnit(race, x, y, ageYears, parents);
  if (u && parents && ageYears === 0) {
    if (EGG_LAYERS.has(race) || EGG_LAYERS.has(RACES[race].sapientOf)) u.egg = Math.round(YEAR / 3);
    if (parents[0] && RACES[race].civ) parents[0].pregnant = 40;
  }
  return u;
};

// ---------- Drawing ----------
const STATUS_ICONS = [
  ['frozen', '❄'], ['sleep', 'z'], ['egg', '◯'], ['poison', '☠'], ['stun', '✦'], ['love', '♥'], ['crying', '💧'],
  ['angry', '!'], ['tantrum', '!!'], ['festive', '♪'], ['coffee', '☕'], ['powerup', '▲'], ['pregnant', '+'], ['desire', '?'],
];

function drawStatusIcons(u, sx, sy, w, h, sc) {
  if (u.frozen > 0) { ctx.fillStyle = 'rgba(180,230,255,0.55)'; ctx.fillRect(sx - sc, sy - sc, w + 2 * sc, h + 2 * sc); }
  if (u.egg > 0) { ctx.fillStyle = '#f4ecd8'; ctx.beginPath(); ctx.ellipse(sx + w / 2, sy + h - 2 * sc, 2.5 * sc, 3 * sc, 0, 0, Math.PI * 2); ctx.fill(); }
  if (sc < 2) return;
  const icon = STATUS_ICONS.find(([k]) => u[k] && u[k] !== 0);
  if (!icon) return;
  ctx.font = `${Math.round(5 * Math.min(sc, 2.5))}px ui-monospace, Menlo, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = icon[0] === 'love' ? '#ff7ab0' : icon[0] === 'poison' ? '#7ee05a' : '#ffffff';
  ctx.fillText(icon[1], sx + w / 2 + 4 * sc, sy);
}

function unitExtraRows(u) {
  const rows = [];
  if (u.xp) rows.push(['Level', `${levelOf(u)} (${u.xp} xp)`]);
  if (RACES[u.race].civ) rows.push(['Mood', moodLabel(u.happy ?? 60)]);
  if (u.mana !== undefined) rows.push(['Mana', `${Math.floor(u.mana)} / 100`]);
  const st = STATUS_ICONS.filter(([k]) => u[k] && u[k] !== 0 && !['love', 'desire'].includes(k)).map(([k]) => k);
  if (u.love) { const o = life.byId.get(u.love); if (o && !o.dead) rows.push(['In love with', unitLink(o.id)]); }
  if (u.desire) rows.push(['Desires', STRUCTURES[u.desire]?.name || u.desire]);
  if (st.length) rows.push(['Feeling', st.join(', ')]);
  return rows;
}

const moodLabel = h => h > 85 ? '😄 Joyful' : h > 65 ? '🙂 Happy' : h > 40 ? '😐 Fine' : h > 15 ? '😟 Unhappy' : '😭 Miserable';

// ---------- Desire objects and brains ----------
Object.assign(STRUCTURES, {
  goldenEgg:   { name: 'Golden Egg', hp: 999, art: 'egg', color: '#f8d040' },
  harp:        { name: 'Ethereal Harp', hp: 999, art: 'harp', color: '#c8e8ff' },
  alienMold:   { name: 'Alien Mold', hp: 200, art: 'core', color: '#7ae05a' },
  evilComputer:{ name: 'Evil Computer', hp: 300, art: 'computer', color: '#4a4a5a' },
  goldenBrain: { name: 'Golden Brain', hp: 999, art: 'brain', color: '#f8d040' },
  corruptBrain:{ name: 'Corrupted Brain', hp: 300, art: 'brain', color: '#8a3aa8' },
});
Object.assign(STRUCTURE_ART, {
  egg: ['...pp...', '..pppp..', '.pppppp.', '.ppkppp.', 'pppppppp', 'pppppkpp', '.pppppp.', '..pppp..'],
  harp: ['.pppp...', 'p...pp..', 'p.k.k.p.', 'p.k.k..p', 'p.k.k..p', 'p.k.k.p.', 'p....p..', 'pppppp..'],
  computer: ['pppppppp', 'pkkkkkkp', 'pkdkkdkp', 'pkkddkkp', 'pkkkkkkp', 'pppppppp', '...pp...', '.pppppp.'],
  brain: ['..pppp..', '.pkppkp.', 'ppppkppp', 'pkpppppp', 'ppppkpkp', '.pkpppp.', '..pppp..', '...pp...'],
});

function fulfillDesire(u, s) {
  u.desire = null;
  addEffect('spark', u.x, u.y - 0.5, 0.8, {});
  if (s.kind === 'goldenEgg') { u.blessed = true; addTrait(u, 'goldenTooth'); u.happy = 100; }
  else if (s.kind === 'harp') { u.hp = maxHp(u); u.happy = 100; u.inspired = 2 * YEAR; addTrait(u, 'healingAura'); }
  else if (s.kind === 'alienMold') { const a = spawnUnit('alien', u.x, u.y, 20); if (a) { u.dead = true; u.cause = 'became an alien'; } }
  else if (s.kind === 'evilComputer') { addTrait(u, 'evil'); u.mad = 3 * YEAR; u.servant = s.id; }
}

// the golden brain calls zombies to it; the corrupted brain spreads madness
function brainTick() {
  for (const s of life.structures) {
    if (s.kind === 'goldenBrain') {
      for (const u of life.units) if (!u.dead && u.race === 'zombie' && dist(u.x, u.y, s.x, s.y) < 40 && dist(u.x, u.y, s.x, s.y) > 2) { u.task = null; moveToward(u, s.x, s.y); }
    } else if (s.kind === 'corruptBrain' && state.tick % 40 === 0) {
      for (const u of life.units) if (!u.dead && !u.blessed && !has(u, 'strongMinded') && dist(u.x, u.y, s.x, s.y) < 10 && rand() < 0.2) u.mad = YEAR;
      addEffect('flash', s.x, s.y, 0.4, { r: 10 });
    }
  }
}

function desireBrush(kind) {
  return (x, y) => {
    if (!life.structures.some(s => s.kind === kind)) { toast(`Place a ${STRUCTURES[kind].name} first`); return; }
    unitsInBrush(x, y, u => { if (!has(u, 'strongMinded')) u.desire = kind; });
    sprinkle('heart', x, y, 5 + state.brush, 0.6);
  };
}

// ---------- Life powers ----------
function statusBrush(fn, effect) {
  return (x, y) => { unitsInBrush(x, y, fn); sprinkle(effect, x, y, 5 + state.brush, 0.6); };
}

function bloodRain(x, y) {
  unitsInBrush(x, y, u => { u.hp = Math.min(maxHp(u), u.hp + maxHp(u) * 0.2); u.burning = 0; });
  forEachInBrush(Math.floor(x), Math.floor(y), (tx, ty) => { const i = ty * state.W + tx; if (powers.fire[i]) extinguish(i); });
  for (let k = 0; k < 6 + state.brush * 2; k++) addEffect('drop', x + (rand() - 0.5) * state.brush * 2, y + (rand() - 0.5) * state.brush * 2, 0.4, { color: '#c8202a' });
}

function cloneRain(x, y) {
  let n = 0;
  unitsInBrush(x, y, u => {
    if (n > 20 || rand() > 0.3) return;
    const c = spawnUnit(u.race, u.x + 0.4, u.y, u.age / YEAR);
    if (!c) return;
    c.dna = { ...dnaOf(u) };
    c.traits = [...(u.traits || [])];
    c.gear = { ...gearOf(u) };
    if (u.village) { const v = life.villages.get(u.village); if (v) joinVillage(c, v); }
    n++;
  });
  sprinkle('ward', x, y, 5 + state.brush, 0.6);
}

function smoothJazz(x, y) {
  unitsInBrush(x, y, u => {
    if (!isAdult(u) || u.love) return;
    const o = nearest(u.x, u.y, 3, o => o !== u && o.race === u.race && !o.love && isAdult(o));
    if (o) { u.love = o.id; o.love = u.id; u.happy = Math.min(100, (u.happy ?? 60) + 20); }
    // animals in love have babies on the spot
    if (o && !RACES[u.race].civ && life.animals < MAX_ANIMALS) spawnUnit(u.race, u.x, u.y, 0, [u, o]);
  });
  sprinkle('heart', x, y, 8 + state.brush, 1);
}

// trait rains: one random trait from the set for each creature hit
const RAIN_SETS = {
  gamma: ['strong', 'tough', 'swift', 'clever', 'agile', 'hardSkin', 'wise', 'attractive', 'eagleEyed', 'healingAura', 'longLived', 'fertile'],
  omega: ['weak', 'frail', 'slow', 'dim', 'softSkin', 'ugly', 'shortSighted', 'oneEyed', 'shortLived', 'barren', 'heliophobia', 'markOfDeath'],
  delta: ['giant', 'tiny', 'deathBomb', 'energized', 'burningFeet', 'pyromaniac', 'whirlwind', 'psychopath', 'bomberman', 'fireBlood', 'acidBlood', 'megaHeartbeat', 'coldAura', 'thorns', 'venomous'],
};

function traitRain(set) {
  return (x, y) => {
    unitsInBrush(x, y, u => {
      const t = pick(RAIN_SETS[set]);
      const oldLife = gene(u, 'lifespan');
      addTrait(u, t);
      u.maxAge = Math.round((u.maxAge * gene(u, 'lifespan')) / oldLife);
      discover(t);
    });
    for (let k = 0; k < 6 + state.brush * 2; k++) addEffect('drop', x + (rand() - 0.5) * state.brush * 2, y + (rand() - 0.5) * state.brush * 2, 0.4, { color: set === 'gamma' ? '#7ee0b0' : set === 'omega' ? '#a050e0' : '#ffd34d' });
  };
}

function lootRain(x, y) {
  unitsInBrush(x, y, u => {
    const slot = pick(['weapon', 'armor', 'tool']);
    const keys = Object.keys(GEAR[slot]).filter(k => k !== 'none');
    gearOf(u)[slot] = pick(keys);
    if (typeof rollMaterial === 'function') gearOf(u).material = rollMaterial(true);
  });
  for (let k = 0; k < 6 + state.brush * 2; k++) addEffect('drop', x + (rand() - 0.5) * state.brush * 2, y + (rand() - 0.5) * state.brush * 2, 0.4, { color: '#ffd34d' });
}

// trees and houses come alive and walk off
Object.assign(RACES, {
  treant: { name: 'Living Tree', plural: 'Living Trees', hp: 60, dmg: 7, speed: 0.4, life: 200, monster: true, mythic: true,
    prey: [...PEOPLE], colors: { b: '#6a4a2a', g: '#3f8a2e', k: '#202020' }, art: ['.ggg.', 'ggggg', 'gkgkg', '.bbb.', 'bbbbb', 'b.b.b'] },
  livinghouse: { name: 'Living House', plural: 'Living Houses', hp: 80, dmg: 8, speed: 0.4, life: 200, monster: true, mythic: true,
    prey: [...PEOPLE], colors: { r: '#a8432f', w: '#dccaa3', k: '#202020' }, art: ['..rr..', '.rrrr.', 'rrrrrr', '.wkwk.', '.wwww.', '.w..w.'] },
});

function livingPlants(x, y) {
  let n = 0;
  forEachInBrush(Math.floor(x), Math.floor(y), (tx, ty) => {
    const t = state.tiles[ty * state.W + tx];
    if (isTree(t) && n < 8 && rand() < 0.3) { setTile(tx, ty, BIOMES[biomeOf(t)].ground); spawnUnit('treant', tx + 0.5, ty + 0.5, 5); n++; }
  });
}

function livingHouses(x, y) {
  for (const b of [...life.buildings.values()]) {
    if (b.type !== 'house' || dist(b.x + 1, b.y + 1, x, y) > brushRadius() + 1) continue;
    removeBuilding(b);
    spawnUnit('livinghouse', b.x + 1, b.y + 1.5, 5);
  }
}

Object.assign(POWERS, {
  coffee:       { label: '☕ Coffee',       brush: true, repeat: 150, use: statusBrush(u => { u.coffee = YEAR; }, 'spark') },
  powerup:      { label: '🍄 Power-up',     brush: true, repeat: 150, use: statusBrush(u => { u.powerup = YEAR; }, 'spark') },
  sleepPower:   { label: '💤 Sleep',        brush: true, repeat: 150, use: statusBrush(u => { u.sleep = 300; }, 'ward') },
  dispel:       { label: '🚫 Dispel',       brush: true, repeat: 150, use: statusBrush(u => { Object.assign(u, { blessed: false, cursed: false, shield: 0, mad: 0, powerup: 0, coffee: 0, frozen: 0, sleep: 0, desire: null }); }, 'mist') },
  bloodRain:    { label: '🩸 Blood Rain',   brush: true, repeat: 100, use: bloodRain },
  divineLight:  { label: '🌟 Divine Light', brush: true, repeat: 150, use: statusBrush(u => { u.sick = 0; u.mad = 0; u.infection = null; u.cursed = false; u.poison = 0; }, 'spark') },
  cloneRain:    { label: '👯 Clone Rain',   brush: true, repeat: 200, use: cloneRain },
  smoothJazz:   { label: '🎷 Smooth Jazz',  brush: true, repeat: 150, use: smoothJazz },
  gammaRain:    { label: '🟢 Gamma Rain',   brush: true, repeat: 150, use: traitRain('gamma') },
  omegaRain:    { label: '🟣 Omega Rain',   brush: true, repeat: 150, use: traitRain('omega') },
  deltaRain:    { label: '🟡 Delta Rain',   brush: true, repeat: 150, use: traitRain('delta') },
  lootRain:     { label: '🎁 Loot Rain',    brush: true, repeat: 150, use: lootRain },
  goldenEgg:    { label: '🥚 Golden Egg',   radius: 1, repeat: 0, use: placeStructure('goldenEgg') },
  harp:         { label: '🎵 Ethereal Harp', radius: 1, repeat: 0, use: placeStructure('harp') },
  alienMold:    { label: '🟢 Alien Mold',   radius: 1, repeat: 0, use: placeStructure('alienMold') },
  evilComputer: { label: '💻 Evil Computer', radius: 1, repeat: 0, use: placeStructure('evilComputer') },
  desireEgg:    { label: '💛 Desire: Egg',  brush: true, repeat: 150, use: desireBrush('goldenEgg') },
  desireHarp:   { label: '💙 Desire: Harp', brush: true, repeat: 150, use: desireBrush('harp') },
  desireMold:   { label: '💚 Desire: Mold', brush: true, repeat: 150, use: desireBrush('alienMold') },
  desireComputer:{ label: '🖤 Desire: Computer', brush: true, repeat: 150, use: desireBrush('evilComputer') },
  goldenBrain:  { label: '🧠 Golden Brain', radius: 1, repeat: 0, use: placeStructure('goldenBrain') },
  corruptBrain: { label: '🧠 Corrupted Brain', radius: 10, repeat: 0, use: placeStructure('corruptBrain') },
  livingPlants: { label: '🌳 Living Plants', brush: true, repeat: 200, use: livingPlants },
  livingHouses: { label: '🏠 Living Houses', brush: true, repeat: 200, use: livingHouses },
});
Object.assign(POWER_GROUPS, {
  'Life': ['coffee', 'powerup', 'sleepPower', 'dispel', 'bloodRain', 'divineLight', 'cloneRain', 'smoothJazz', 'gammaRain', 'omegaRain', 'deltaRain', 'lootRain'],
  'Desires': ['goldenEgg', 'harp', 'alienMold', 'evilComputer', 'desireEgg', 'desireHarp', 'desireMold', 'desireComputer', 'goldenBrain', 'corruptBrain', 'livingPlants', 'livingHouses'],
});
