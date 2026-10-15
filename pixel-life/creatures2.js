'use strict';

// More creatures: extra animals, biome creatures, monsters and magic folk with
// special behaviors, monster cores and towers (structures), infections, and the
// names of each animal's sapient form. Loaded after creatures.js.

// ---------- More animals ----------
Object.assign(RACES, {
  armadillo: { name: 'Armadillo', plural: 'Armadillos', hp: 18, dmg: 0, speed: 0.6, life: 15, breed: 0.004, cap: 900, flees: PREDATORS,
    habitat: ['desert', 'savanna'], colors: { a: '#a08a6a', d: '#6a5a40' }, facesLeft: true, art: ['a.....', 'aadda.', '.adadd', '.a..a.'] },
  raccoon: { name: 'Raccoon', plural: 'Raccoons', hp: 10, dmg: 2, speed: 1, life: 10, breed: 0.006, cap: 800, flees: BIG_PREDATORS,
    habitat: ['grassland', 'birch', 'maple'], colors: { g: '#8a8a8e', k: '#202022', w: '#e8e8e8' }, facesLeft: true, art: ['gg....', 'kwggkg', '.ggggk', '.g..g.'] },
  alpaca: { name: 'Alpaca', plural: 'Alpacas', hp: 20, dmg: 0, speed: 0.7, life: 20, breed: 0.004, cap: 800, flees: BIG_PREDATORS,
    habitat: ['mountain', 'tundra', 'rocklands'], colors: { w: '#f0e6d0', d: '#5a4a3a' }, facesLeft: true, art: ['ww....', 'dw....', '.wwww.', '.wwww.', '.w..w.'] },
  capybara: { name: 'Capybara', plural: 'Capybaras', hp: 18, dmg: 0, speed: 0.6, life: 12, breed: 0.005, cap: 800, flees: BIG_PREDATORS,
    habitat: ['swamp', 'jungle'], colors: { b: '#8a6a4a', d: '#4a3a2a' }, facesLeft: true, art: ['bb....', 'dbbbbb', '.bbbbb', '.b..b.'] },
  goat: { name: 'Goat', plural: 'Goats', hp: 16, dmg: 3, speed: 0.9, life: 15, breed: 0.005, cap: 700, flees: BIG_PREDATORS,
    habitat: ['mountain', 'rocklands'], colors: { w: '#e8e4d8', h: '#5a4a3a' }, facesLeft: true, art: ['h.....', 'ww....', 'wwwww.', '.wwww.', '.w..w.'] },
  ostrich: { name: 'Ostrich', plural: 'Ostriches', hp: 22, dmg: 4, speed: 1.6, life: 30, breed: 0.003, cap: 900, flees: BIG_PREDATORS,
    habitat: ['savanna', 'desert'], colors: { k: '#2a2a2a', p: '#e8b0a0', w: '#f4f4f4' }, facesLeft: true, art: ['p...', 'p...', 'pkk.', 'kkkw', '.p.p', '.p.p'] },
  scorpion: { name: 'Scorpion', plural: 'Scorpions', hp: 10, dmg: 5, speed: 0.9, life: 8, breed: 0.004, cap: 900, venom: true,
    prey: ['rat', 'grasshopper', 'beetle', 'fly'], flees: BIG_PREDATORS, habitat: ['desert', 'arcane', 'rocklands'],
    colors: { o: '#c88a2a', d: '#6a4a1a' }, art: ['o...o.', '.oo.o.', 'odooo.', 'o.o.o.'] },
  piranha: { name: 'Piranha', plural: 'Piranhas', hp: 8, dmg: 6, speed: 1.3, life: 10, breed: 0.006, cap: 600, aquatic: true,
    prey: [...PEOPLE, 'sheep', 'cow', 'capybara', 'seal'], habitat: ['water'], colors: { r: '#c83a3a', g: '#7a8a9a' }, facesLeft: true, art: ['.ggg.', 'rgggg', '.ggg.'] },
  seal: { name: 'Seal', plural: 'Seals', hp: 20, dmg: 2, speed: 0.6, life: 25, breed: 0.004, cap: 900, swims: true, flees: ['polarbear', 'crocodile'],
    habitat: ['beach', 'ice'], colors: { g: '#7a7a82', k: '#202020' }, facesLeft: true, art: ['kg.....', 'ggggg..', '.gggggg'] },
  beetle: { name: 'Beetle', plural: 'Beetles', hp: 4, dmg: 1, speed: 0.6, life: 4, breed: 0.008, cap: 700, flees: PREDATORS,
    habitat: ['grassland', 'jungle', 'birch', 'maple'], colors: { k: '#2a3a2a', g: '#3a8a5a' }, art: ['k.k', 'ggg', 'kgk'] },
  bee: { name: 'Bee', plural: 'Bees', hp: 2, dmg: 1, speed: 1.3, life: 3, breed: 0.012, cap: 500, flies: true, flees: [],
    habitat: ['meadow', 'grassland', 'enchanted'], special: 'bee', colors: { y: '#f0c830', k: '#202020', w: '#e0f0ff' }, art: ['.w.', 'yky', '.y.'] },
  butterfly: { name: 'Butterfly', plural: 'Butterflies', hp: 1, dmg: 0, speed: 1.1, life: 2, breed: 0.012, cap: 500, flies: true, flees: [],
    habitat: ['meadow', 'enchanted', 'grassland', 'clover'], colors: { p: '#f08ac0', k: '#202020' }, art: ['p.p', 'pkp', 'p.p'] },
  grasshopper: { name: 'Grasshopper', plural: 'Grasshoppers', hp: 1, dmg: 0, speed: 1.2, life: 2, breed: 0.014, cap: 400, flees: PREDATORS,
    habitat: ['savanna', 'grassland'], special: 'grasshopper', colors: { g: '#7ab83a' }, facesLeft: true, art: ['g...', 'gggg', 'g.g.'] },
  fly: { name: 'Fly', plural: 'Flies', hp: 1, dmg: 0, speed: 1.4, life: 1, breed: 0.015, cap: 500, flies: true, flees: [],
    habitat: ['swamp', 'corrupt'], colors: { k: '#202020', w: '#c8d8f0' }, art: ['w.w', '.k.'] },

  // biome creatures: each has a civilized form when it awakens (see SAPIENT_FORMS)
  flowerbud: { name: 'Flower Bud', plural: 'Flower Buds', hp: 8, dmg: 0, speed: 0.5, life: 20, breed: 0.006, cap: 700, flees: PREDATORS,
    habitat: ['meadow'], colors: { g: '#4aa03a', p: '#f090c0', y: '#f8e070' }, art: ['.p.', 'pyp', '.g.', 'ggg'] },
  crystalsword: { name: 'Crystal Sword', plural: 'Crystal Swords', hp: 30, dmg: 6, speed: 0.8, life: 200, breed: 0.002, cap: 1500,
    habitat: ['crystal'], prey: ['rat', 'beetle'], colors: { c: '#7ae8f8', w: '#ffffff' }, art: ['.w.', '.c.', '.c.', 'ccc', '.c.'] },
  bitba: { name: 'Bitba', plural: 'Bitbas', hp: 8, dmg: 0, speed: 0.9, life: 15, breed: 0.006, cap: 700, flees: PREDATORS,
    habitat: ['lemon'], colors: { y: '#f8e040', g: '#6a9a2a', k: '#202020' }, art: ['.g.', 'yyy', 'yky', 'yyy'] },
  garl: { name: 'Garl', plural: 'Garls', hp: 10, dmg: 0, speed: 0.6, life: 15, breed: 0.006, cap: 700, flees: PREDATORS,
    habitat: ['garlic'], colors: { w: '#f4f4ec', g: '#b8c888', k: '#202020' }, art: ['.g.', 'www', 'wkw', 'www'] },
  smore: { name: 'Smore', plural: 'Smores', hp: 8, dmg: 0, speed: 0.7, life: 15, breed: 0.006, cap: 700, flees: PREDATORS,
    habitat: ['candy'], colors: { b: '#8a5a3a', w: '#fff4f0', k: '#202020' }, art: ['bbb', 'www', 'wkw', 'bbb'] },
  acidblob: { name: 'Acid Blob', plural: 'Acid Blobs', hp: 15, dmg: 4, speed: 0.6, life: 30, breed: 0.004, cap: 900, special: 'acid',
    habitat: ['singularity', 'infernal'], prey: ['rat', 'fly', 'beetle'], colors: { g: '#9cff3a', k: '#203a10' }, art: ['.ggg.', 'gkgkg', 'ggggg'] },
});

// what each animal is called once it becomes a people: [singular, plural]
const SAPIENT_FORMS = {
  cat: ['Meowmorph', 'Meowmorphs'], dog: ['Barkfolk', 'Barkfolk'], cow: ['Mootaur', 'Mootaurs'], crocodile: ['Reptiloid', 'Reptiloids'],
  seal: ['Navy Seal', 'Navy Seals'], unicorn: ['Punkcorn', 'Punkcorns'], beetle: ['Dunglord', 'Dunglords'], sheep: ['Woolfolk', 'Woolfolk'],
  wolf: ['Lycan', 'Lycans'], bear: ['Ursan', 'Ursans'], monkey: ['Simian', 'Simians'], rabbit: ['Hopkin', 'Hopkins'], fox: ['Kitsune', 'Kitsune'],
  chicken: ['Cluckfolk', 'Cluckfolk'], frog: ['Froglodyte', 'Froglodytes'], rat: ['Ratkin', 'Ratkin'], snake: ['Naga', 'Nagas'],
  camel: ['Humpfolk', 'Humpfolk'], penguin: ['Pengwing', 'Pengwings'], crab: ['Crabkin', 'Crabkin'], turtle: ['Shellfolk', 'Shellfolk'],
  buffalo: ['Minotaur', 'Minotaurs'], rhino: ['Rhinox', 'Rhinoxes'], hyena: ['Gnoll', 'Gnolls'], capybara: ['Capyfolk', 'Capyfolk'],
  goat: ['Satyr', 'Satyrs'], ostrich: ['Struthian', 'Struthians'], raccoon: ['Trashkin', 'Trashkin'], armadillo: ['Rollfolk', 'Rollfolk'],
  alpaca: ['Alpacan', 'Alpacans'], scorpion: ['Scorpid', 'Scorpids'], polarbear: ['Frostursan', 'Frostursans'], faerie: ['Fae', 'Fae'],
  flowerbud: ['Lulliar', 'Lulliars'], crystalsword: ['Crystal Golem', 'Crystal Golems'], bitba: ['Lemon Man', 'Lemon Men'],
  garl: ['Garlic Man', 'Garlic Men'], smore: ['Candy Man', 'Candy Men'], acidblob: ['Acid Gentleman', 'Acid Gentlemen'],
  bee: ['Beeling', 'Beelings'], piranha: ['Piranhan', 'Piranhans'],
};

// ---------- Monsters and magic folk ----------
Object.assign(RACES, {
  coldone: { name: 'Cold One', plural: 'Cold Ones', hp: 40, dmg: 7, speed: 0.8, life: 200, monster: true, evil: true, special: 'cold',
    prey: [...PEOPLE, 'sheep', 'cow', 'penguin'], habitat: ['permafrost'], wildMax: 3, colors: { b: '#a8d8f0', w: '#ffffff', k: '#2a4a6a' },
    art: ['.bbb.', '.kbk.', 'bbbbb', 'wbbbw', '.bbb.', '.b.b.', '.b.b.'] },
  demon: { name: 'Demon', plural: 'Demons', hp: 50, dmg: 9, speed: 1, life: 300, monster: true, evil: true, special: 'demon',
    prey: [...PEOPLE, 'sheep', 'cow', 'unicorn'], habitat: ['infernal'], wildMax: 3, colors: { r: '#c82a2a', k: '#2a0a0a', y: '#ffd34d' },
    art: ['r...r', 'rrrrr', 'ryryr', '.rrr.', 'rkkkr', '.r.r.', 'r...r'] },
  angle: { name: 'Angle', plural: 'Angles', hp: 45, dmg: 8, speed: 1.2, life: 500, flies: true, special: 'angle',
    habitat: ['celestial'], wildMax: 3, colors: { w: '#ffffff', y: '#ffe060', s: '#f0d0b0' },
    art: ['.yyy.', 'w.s.w', 'wwsww', '.www.', '.w.w.'] },
  alien: { name: 'Alien', plural: 'Aliens', hp: 30, dmg: 6, speed: 1, life: 100, monster: true, special: 'alien',
    prey: [...PEOPLE, 'cow'], colors: { g: '#7ae05a', k: '#101010', s: '#9aa3b5' },
    art: ['.ggg.', 'gkgkg', '.ggg.', 'sssss', '.sss.', '.s.s.'] },
  snowman: { name: 'Snowman', plural: 'Snowmen', hp: 25, dmg: 2, speed: 0.5, life: 60, special: 'snowman',
    habitat: ['permafrost', 'tundra'], wildMax: 2, colors: { w: '#ffffff', k: '#202020', o: '#f08a2a' },
    art: ['.kkk.', '.www.', '.kow.', 'wwwww', 'wwkww', 'wwwww'] },
  fireelemental: { name: 'Fire Elemental', plural: 'Fire Elementals', hp: 60, dmg: 10, speed: 0.9, life: 150, monster: true, evil: true, special: 'fire',
    prey: [...PEOPLE, 'sheep', 'cow'], habitat: ['infernal'], wildMax: 2, colors: { r: '#f05a1a', y: '#ffe060', o: '#ff9a2a' },
    art: ['..y..', '.yoy.', 'yorory', '.ooo.', 'oyryo', '.o.o.'] },
  fireskull: { name: 'Fire Skull', plural: 'Fire Skulls', hp: 20, dmg: 6, speed: 1.4, life: 80, monster: true, evil: true, flies: true, special: 'fire',
    prey: [...PEOPLE], colors: { w: '#f4f0e0', k: '#202020', r: '#ff6a1a' }, art: ['r.r.r', 'wwwww', 'wkwkw', '.www.', '.w.w.'] },
  rudeskull: { name: 'Rude Skull', plural: 'Rude Skulls', hp: 30, dmg: 5, speed: 2, life: 80, monster: true, special: 'bounce',
    colors: { w: '#f4f0e0', k: '#202020' }, art: ['wwwww', 'wkwkw', 'wwwww', '.kwk.'] },
  ghost: { name: 'Ghost', plural: 'Ghosts', hp: 25, dmg: 3, speed: 0.8, life: 150, monster: true, undead: true, flies: true, special: 'ghost',
    prey: [...PEOPLE], colors: { w: '#e8f0ff', k: '#4a5a7a' }, art: ['.www.', 'wkwkw', 'wwwww', 'wwwww', 'w.w.w'] },
  greg: { name: 'Greg', plural: 'Gregs', hp: 50, dmg: 0, speed: 0.7, life: 999, special: 'greg',
    colors: { p: '#f0a0c8', k: '#202020' }, art: ['.ppp.', 'pkpkp', 'ppppp', '.p.p.'] },
  necromancer: { name: 'Necromancer', plural: 'Necromancers', hp: 50, dmg: 4, speed: 0.9, life: 400, monster: true, evil: true, special: 'necro',
    colors: { w: '#1a1a20', b: '#3a1a4a', s: '#b8c8b0', t: '#4a3a2a', o: '#7aff6a' },
    art: ['..w..o', '.www.t', '.sss.t', '.bbb.t', 'wwwwwt', '.www.t', '.www.t', 'ww.ww.'] },
  druid: { name: 'Druid', plural: 'Druids', hp: 50, dmg: 4, speed: 0.9, life: 400, special: 'druid',
    colors: { w: '#3a7a3a', b: '#c8c0a0', s: '#e8c8a0', t: '#6a4a2a', o: '#9aff6a' },
    art: ['..w..o', '.www.t', '.sss.t', '.bbb.t', 'wwwwwt', '.www.t', '.www.t', 'ww.ww.'] },
  bandit: { name: 'Bandit', plural: 'Bandits', hp: 30, dmg: 6, speed: 1, life: 60, monster: true, special: 'bandit',
    prey: [...PEOPLE], colors: { s: '#e9b98d', k: '#202020', c: '#5a4a3a', r: '#a8302a' },
    art: ['.kkk.', '.rrr.', 'scccs', '.ccc.', '.ccc.', '.k.k.', '.k.k.'] },
  santa: { name: 'Robot Santa', plural: 'Robot Santas', hp: 300, dmg: 10, speed: 1, life: 600, monster: true, flies: true, special: 'santa',
    colors: { r: '#d02a2a', w: '#ffffff', s: '#9aa3b5', y: '#ffd34d' },
    art: ['..rr..', '.rrrr.', '.wsw..', 'rrrrrr', 'rwyywr', 'ssssss', 's....s'] },
  godfinger: { name: 'God Finger', plural: 'God Fingers', hp: 999, dmg: 0, speed: 0.7, life: 400, special: 'finger', flies: true,
    colors: { s: '#f0c8a0', n: '#f8e8e0' }, art: ['.n.', '.s.', '.s.', 'sss', 'sss', '.s.'] },
  // monster core minions
  tumormonster: { name: 'Tumor Monster', plural: 'Tumor Monsters', hp: 25, dmg: 5, speed: 0.8, life: 60, monster: true, evil: true, special: 'minion',
    prey: [...PEOPLE, 'sheep', 'cow'], colors: { p: '#c86a7a', d: '#8a2a3a' }, art: ['.ppp.', 'pdpdp', 'ppppp', 'p.p.p'] },
  bioblob: { name: 'Bioblob', plural: 'Bioblobs', hp: 20, dmg: 4, speed: 0.9, life: 60, monster: true, special: 'minion',
    prey: [...PEOPLE, 'sheep'], colors: { g: '#6a8a3a', d: '#3a5a1a' }, art: ['.ggg.', 'gdgdg', 'ggggg'] },
  lilpumpkin: { name: 'Lil Pumpkin', plural: 'Lil Pumpkins', hp: 18, dmg: 4, speed: 1, life: 60, monster: true, special: 'minion',
    prey: [...PEOPLE, 'sheep'], colors: { o: '#f08a1a', k: '#202020', g: '#4a8a2a' }, art: ['..g..', '.ooo.', 'okoko', '.ooo.'] },
  assimilator: { name: 'Assimilator', plural: 'Assimilators', hp: 30, dmg: 6, speed: 1, life: 80, monster: true, special: 'minion',
    prey: [...PEOPLE], colors: { s: '#5a6a7a', c: '#4af0f8', k: '#202020' }, art: ['.sss.', 'scscs', '.sss.', 's.s.s', 's...s'] },
  mushmonster: { name: 'Mush', plural: 'Mushes', hp: 22, dmg: 4, speed: 0.6, life: 80, monster: true, special: 'minion',
    prey: [...PEOPLE, 'sheep'], habitat: ['mushroom'], wildMax: 4, colors: { r: '#d8504a', w: '#f4f0e8', k: '#202020' },
    art: ['.rrr.', 'rwrwr', '.www.', '.wkw.', '.w.w.'] },
});
for (const k of ['angle', 'snowman', 'greg', 'druid', 'godfinger', 'santa', 'crystalsword', 'acidblob']) RACES[k].mythic = true;
for (const k of ['coldone', 'demon', 'fireelemental', 'necromancer', 'bandit', 'alien', 'tumormonster', 'mushmonster']) PREDATORS.push(k);
for (const k of Object.keys(RACES)) if (RACES[k].habitat && !WILD.includes(k)) WILD.push(k);

// ---------- Special behaviors ----------
// Each returns true when it took the creature's turn.
const SPECIALS = {
  bee(u) {
    // pollinates: flowers spread where bees go
    if (rand() < 0.01) {
      const x = Math.floor(u.x), y = Math.floor(u.y), t = state.tiles[y * state.W + x];
      if (isGround(t) && isFertile(t)) setTile(x, y, T.FLOWERS);
    }
    return false;
  },
  grasshopper(u) {
    if (rand() < 0.01) {
      const x = Math.floor(u.x), y = Math.floor(u.y);
      if (state.tiles[y * state.W + x] === T.FARM) setTile(x, y, localGround(x, y));   // eats the crops
    }
    return false;
  },
  acid(u) {
    if (rand() < 0.005) acidOn(Math.floor(u.x), Math.floor(u.y));
    return false;
  },
  cold(u) {
    // frost follows them; their touch freezes
    if (rand() < 0.03) { const x = Math.floor(u.x), y = Math.floor(u.y), t = state.tiles[y * state.W + x]; if (COLDER[t] !== undefined) setTile(x, y, COLDER[t]); }
    const v = nearest(u.x, u.y, 1.2, o => o !== u && !RACES[o.race].monster && !o.frozen);
    if (v && rand() < 0.05) v.frozen = 50;
    return false;
  },
  demon(u) {
    if (rand() < 0.02) ignite(Math.floor(u.x), Math.floor(u.y));
    return false;
  },
  fire(u) {
    const x = Math.floor(u.x), y = Math.floor(u.y);
    if (isWater(state.tiles[y * state.W + x]) && !RACES[u.race].flies) { killUnit(u, 'put out by water'); return true; }
    if (rand() < 0.1) ignite(x, y);
    return false;
  },
  angle(u) {
    // smites evil, blesses the faithful
    if (u.cd === 0) {
      const foe = nearest(u.x, u.y, 7, o => o !== u && isEvil(o));
      if (foe) {
        u.cd = 25;
        addEffect('beam', u.x, u.y - 1, 0.35, { x2: foe.x, y2: foe.y - 0.5, color: '#fff4b0', w: 3 });
        hurt(foe, 20, 'smitten by an Angle', u);
        return true;
      }
    }
    if (rand() < 0.003) { const o = nearest(u.x, u.y, 4, o => !!RACES[o.race].civ); if (o) { o.blessed = true; addEffect('spark', o.x, o.y - 0.5, 0.6, {}); } }
    return false;
  },
  alien(u) {
    // ray gun: shoots from a few tiles away
    if (u.cd === 0) {
      const t = nearest(u.x, u.y, 4, o => o !== u && !!RACES[o.race].civ);
      if (t) {
        u.cd = 15;
        addEffect('beam', u.x, u.y - 0.6, 0.15, { x2: t.x, y2: t.y - 0.4, color: '#9dff7a', w: 2 });
        hurt(t, 8, 'shot by an alien', u);
        return true;
      }
    }
    return false;
  },
  snowman(u) {
    const x = Math.floor(u.x), y = Math.floor(u.y), t = state.tiles[y * state.W + x], b = biomeOf(t);
    if (b === 'desert' || b === 'savanna' || b === 'infernal' || t === T.LAVA || powers.fire[y * state.W + x]) { killUnit(u, 'melted'); return true; }
    if (rand() < 0.02 && COLDER[t] !== undefined) setTile(x, y, COLDER[t]);
    return false;
  },
  bounce(u) {
    // a rude skull ricochets around, knocking into anyone in the way
    if (u.vx === undefined) { const a = rand() * Math.PI * 2; u.vx = Math.cos(a) * 0.35; u.vy = Math.sin(a) * 0.35; }
    let nx = u.x + u.vx, ny = u.y + u.vy;
    if (!walkable(nx, u.y)) { u.vx *= -1; nx = u.x; }
    if (!walkable(u.x, ny)) { u.vy *= -1; ny = u.y; }
    u.x = nx; u.y = ny;
    u.dir = u.vx < 0 ? -1 : 1;
    const o = nearest(u.x, u.y, 0.8, o => o !== u);
    if (o && u.cd === 0) { u.cd = 6; hurt(o, RACES[u.race].dmg, 'knocked over by a rude skull', u); throwUnit(o, 2, 0, 'bounced'); }
    return true;
  },
  ghost(u) {
    // drifts through walls; its chill touch drains life
    const o = nearest(u.x, u.y, 1, o => o !== u && !!RACES[o.race].civ);
    if (o && rand() < 0.1) hurt(o, 1, 'haunted to death', u);
    return false;
  },
  greg(u) {
    // Greg brings joy to everyone near
    if (rand() < 0.02) {
      const o = nearest(u.x, u.y, 4, o => !!RACES[o.race].civ);
      if (o) { o.happy = Math.min(100, (o.happy ?? 50) + 10); addEffect('heart', o.x, o.y - 1, 0.8, {}); }
    }
    wander(u, u.x, u.y, 8);
    return true;
  },
  necro(u) {
    if (u.cd === 0) {
      const t = nearest(u.x, u.y, 7, o => o !== u && !isEvil(o) && !!RACES[o.race].civ);
      if (t) {
        u.cd = 40;
        addEffect('beam', u.x + 0.3, u.y - 1, 0.35, { x2: t.x, y2: t.y - 0.5, color: '#7aff6a', w: 3 });
        hurt(t, 14, 'drained by a necromancer', u);
        return true;
      }
    }
    wander(u, u.x, u.y, 12);
    return true;
  },
  druid(u) {
    // grows trees and plants, heals animals
    if (rand() < 0.05) {
      const x = Math.floor(u.x + (rand() - 0.5) * 8), y = Math.floor(u.y + (rand() - 0.5) * 8);
      if (inBounds(x, y)) {
        const t = state.tiles[y * state.W + x];
        if (t === T.ASH) setTile(x, y, localGround(x, y));
        else if (isGround(t) && BIOMES[biomeOf(t)].tree !== null) setTile(x, y, rand() < 0.7 ? BIOMES[biomeOf(t)].tree : T.FLOWERS);
      }
    }
    if (rand() < 0.02) { const a = nearest(u.x, u.y, 6, o => !RACES[o.race].civ && o.hp < maxHp(o)); if (a) { a.hp = maxHp(a); addEffect('puff', a.x, a.y - 0.5, 0.6, {}); } }
    if (rand() < 0.001) { const kind = pick(['sheep', 'rabbit', 'fox', 'cow', 'bee']); spawnUnit(kind, u.x + 1, u.y, 2); }
    wander(u, u.x, u.y, 12);
    return true;
  },
  bandit(u) {
    // lobs TNT at villagers from a distance
    if (u.cd === 0 && rand() < 0.05) {
      const t = nearest(u.x, u.y, 6, o => !!RACES[o.race].civ);
      if (t && dist(u.x, u.y, t.x, t.y) > 2) {
        u.cd = 80;
        disasters.objects.push({ type: 'tnt', x: Math.floor(t.x) + 0.5, y: Math.floor(t.y) + 0.5, armed: true, fuseTime: 15 });
        addEffect('beam', u.x, u.y - 0.6, 0.3, { x2: t.x, y2: t.y, color: '#d83a2a', w: 1 });
        return true;
      }
    }
    return false;
  },
  santa(u) {
    // flies over villages dropping presents that go boom
    if (u.cd === 0 && rand() < 0.04) {
      const v = nearestVillage(u.x, u.y, 12, () => true);
      if (v) { u.cd = 60; grenade(u.x + (rand() - 0.5) * 2, u.y + 3.5); }   // dropped well below, not on its own head
    }
    if (dist(u.x, u.y, u.tx ?? u.x, u.ty ?? u.y) < 1 || u.tx === null) {
      const v = nearestVillage(u.x, u.y, 200, () => true);
      u.tx = v ? v.x + (rand() - 0.5) * 10 : rand() * state.W;
      u.ty = v ? v.y + (rand() - 0.5) * 10 : rand() * state.H;
    }
    moveToward(u, u.tx, u.ty);
    return true;
  },
  finger(u) {
    // wanders the world casting random powers, untouched by its own magic
    u.shield = 10;
    if (u.cd === 0 && rand() < 0.02) {
      u.cd = 100;
      const choices = Object.keys(POWERS).filter(k => !['infinityCoin', 'tsarBomba', 'nuke', 'flick', 'finger', 'vortex'].includes(k) && !k.startsWith('print'));
      const id = pick(choices);
      try { usePower(id, u.x + (rand() - 0.5) * 6, u.y + (rand() - 0.5) * 6); } catch { /* some powers need a pointer */ }
      addEffect('spark', u.x, u.y - 2, 0.8, {});
    }
    wander(u, u.x, u.y, 20);
    return true;
  },
  minion(u) {
    // core minions guard their core
    const home = u.home && life.structures.find(s => s.id === u.home);
    if (home && dist(u.x, u.y, home.x, home.y) > 14) { moveToward(u, home.x, home.y); return true; }
    return false;
  },
};

// ---------- Structures: monster cores and towers ----------
// { id, kind, x, y, hp, cd, r } in life.structures (saved)
const STRUCTURES = {
  tumorCore:   { name: 'Tumor Core', hp: 200, creep: T.TUMOR, minion: 'tumormonster', art: 'core', color: '#c86a7a' },
  biomassCore: { name: 'Biomass Core', hp: 200, creep: T.BIOMASS, minion: 'bioblob', art: 'core', color: '#6a8a3a' },
  pumpkinCore: { name: 'Super Pumpkin', hp: 250, creep: T.PUMPKIN, minion: 'lilpumpkin', art: 'pumpkin', color: '#f08a1a' },
  cyberCore:   { name: 'Cybercore', hp: 300, creep: T.CYBER, minion: 'assimilator', art: 'core', color: '#4af0f8' },
  iceTower:    { name: 'Ice Tower', hp: 250, minion: 'coldone', art: 'tower', color: '#a8d8f0' },
  flameTower:  { name: 'Flame Tower', hp: 250, minion: 'demon', art: 'tower', color: '#d83a2a' },
  angleTower:  { name: 'Angle Tower', hp: 250, minion: 'angle', art: 'tower', color: '#ffe060' },
};
// the ones villagers will attack
const HOSTILE_STRUCTURES = new Set(['tumorCore', 'biomassCore', 'pumpkinCore', 'cyberCore', 'iceTower', 'flameTower', 'alienMold', 'evilComputer', 'corruptBrain']);
const CREEP_KIND = { tumorCore: 'tumor', biomassCore: 'biomass', pumpkinCore: 'pumpkin', cyberCore: 'cyber' };

function placeStructure(kind) {
  return (x, y) => {
    const tx = Math.floor(x), ty = Math.floor(y);
    if (!inBounds(tx, ty) || isWater(state.tiles[ty * state.W + tx])) { toast('That needs solid ground'); return; }
    life.structures.push({ id: life.nextId++, kind, x: tx + 0.5, y: ty + 0.5, hp: STRUCTURES[kind].hp, cd: 30, r: 1 });
    chronicle(`👾 A ${STRUCTURES[kind].name} appeared`);
  };
}

const coreAlive = kind => life.structures.some(s => CREEP_KIND[s.kind] === kind);

function structureTick(s) {
  const spec = STRUCTURES[s.kind];
  const tx = Math.floor(s.x), ty = Math.floor(s.y), i = ty * state.W + tx;
  // fire, lava and water wear them down
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const j = (ty + dy) * state.W + tx + dx;
    if (inBounds(tx + dx, ty + dy) && powers.fire[j]) s.hp -= s.kind === 'flameTower' ? 0 : 1;
  }
  const t = state.tiles[i];
  if (isWater(t) || t === T.LAVA) s.hp -= 5;
  // warriors and heroes hack at monster structures they reach
  for (const u of life.units) {
    if (!u.dead && RACES[u.race].civ && isAdult(u) && dist(u.x, u.y, s.x, s.y) < 1.6 && u.cd === 0 && HOSTILE_STRUCTURES.has(s.kind)) {
      u.cd = 8; s.hp -= RACES[u.race].dmg;
    }
  }
  if (s.hp <= 0) { s.dead = true; chronicle(`💥 The ${spec.name} was destroyed`); addEffect('explosion', s.x, s.y, 0.6, { r: 2 }); return; }
  if (s.cd > 0) { s.cd--; return; }
  s.cd = 12;
  // creep grows outward
  if (spec.creep !== undefined) {
    s.r = Math.min(14, s.r + 0.08);
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2, d = rand() * s.r, cx = Math.floor(s.x + Math.cos(a) * d), cy = Math.floor(s.y + Math.sin(a) * d);
      if (inBounds(cx, cy)) { const ct = state.tiles[cy * state.W + cx]; if (!isWater(ct) && ct !== T.LAVA && !TILES[ct].wall) setTile(cx, cy, spec.creep); }
    }
  }
  // towers change the land around them
  if (s.kind === 'iceTower') forEachTile(s.x, s.y, 8, (x, y, tile) => { if (COLDER[tile] !== undefined && rand() < 0.05) setTile(x, y, COLDER[tile]); });
  if (s.kind === 'flameTower') {
    const foe = nearest(s.x, s.y, 9, o => !!RACES[o.race].civ);
    if (foe) { addEffect('beam', s.x, s.y - 3, 0.3, { x2: foe.x, y2: foe.y, color: '#ff6a1a', w: 3 }); hurt(foe, 15, 'hit by a fireball'); ignite(Math.floor(foe.x), Math.floor(foe.y)); }
  }
  if (s.kind === 'angleTower') for (const u of life.units) if (!u.dead && RACES[u.race].civ && dist(u.x, u.y, s.x, s.y) < 8 && rand() < 0.01) u.blessed = true;
  // and spawn their creatures
  if (!spec.minion) return;
  const minions = life.units.filter(u => !u.dead && u.home === s.id).length;
  if (minions < 6 && rand() < 0.3) {
    const m = spawnUnit(spec.minion, s.x + (rand() - 0.5) * 3, s.y + 1 + rand(), 5);
    if (m) m.home = s.id;
  }
}

// ---------- Infections ----------
// Infected creatures spread it to their neighbors; when they die, they rise as monsters.
const INFECTIONS = { zombie: 'zombie', mush: 'mushmonster', tumor: 'tumormonster' };

function infect(kind) {
  return (x, y) => {
    unitsInBrush(x, y, u => { if (!RACES[u.race].undead && !RACES[u.race].monster) u.infection = kind; });
    sprinkle(kind === 'zombie' ? 'puff' : kind === 'mush' ? 'hex' : 'rage', x, y, 6 + state.brush, 0.7);
  };
}

DEATH_HOOKS.push((u) => {
  if (u.infection && INFECTIONS[u.infection]) {
    const m = spawnUnit(INFECTIONS[u.infection], u.x, u.y, 1);
    if (m) addEffect('hex', u.x, u.y - 0.5, 0.8, {});
  }
  // necromancers raise the fallen near them
  if (!RACES[u.race].undead && rand() < 0.4) {
    const n = nearest(u.x, u.y, 10, o => o.race === 'necromancer');
    if (n && (life.counts.skeleton || 0) < 60) { spawnUnit('skeleton', u.x, u.y, 1); addEffect('hex', u.x, u.y - 0.5, 0.8, {}); }
  }
});

function creaturesExtraTick() {
  for (const s of life.structures) if (!s.dead) structureTick(s);
  if (life.structures.some(s => s.dead)) life.structures = life.structures.filter(s => !s.dead);
  // infections creep from creature to creature
  if (state.tick % 5 === 0) {
    for (const u of life.units) {
      if (u.dead || !u.infection || rand() > 0.05) continue;
      const o = nearest(u.x, u.y, 2, o => o !== u && !o.infection && !RACES[o.race].undead && !RACES[o.race].monster);
      if (o) o.infection = u.infection;
      if (u.infection === 'mush' && rand() < 0.002) hurt(u, 3, 'mush spores');
    }
  }
}

// ---------- Drawing ----------
const STRUCTURE_ART = {
  core: ['...pp...', '..pppp..', '.pppppp.', 'pppdpppp', 'ppppdppp', '.pppppp.', '..pdpp..', '.pp..pp.'],
  pumpkin: ['....g...', '...g....', '.oooooo.', 'oooooooo', 'okkookko', 'oooooooo', 'okkkkkko', '.oooooo.'],
  tower: ['..pppp..', '..p..p..', '..pppp..', '...pp...', '..pppp..', '..pdpp..', '..pppp..', '..pdpp..', '.pppppp.', 'pppppppp'],
};

function drawStructures(ox, oy, z) {
  const s = Math.max(1, Math.round(z / 4));
  for (const st of life.structures) {
    const spec = STRUCTURES[st.kind];
    const spr = cached(`st|${st.kind}`, () => makeSprite(STRUCTURE_ART[spec.art], { p: spec.color, d: '#202020', o: '#f08a1a', g: '#4a8a2a', k: '#ffe060' }, false));
    const w = spr.width * s * 1.5, h = spr.height * s * 1.5;
    ctx.drawImage(spr, Math.round(ox + st.x * z - w / 2), Math.round(oy + st.y * z - h + z / 2), w, h);
  }
}

// ---------- Powers ----------
Object.assign(POWERS, {
  tumorCore:    { label: '🫀 Tumor',          radius: 2, repeat: 0, use: placeStructure('tumorCore') },
  biomassCore:  { label: '🦠 Biomass',        radius: 2, repeat: 0, use: placeStructure('biomassCore') },
  pumpkinCore:  { label: '🎃 Super Pumpkin',  radius: 2, repeat: 0, use: placeStructure('pumpkinCore') },
  cyberCore:    { label: '🤖 Cybercore',      radius: 2, repeat: 0, use: placeStructure('cyberCore') },
  iceTower:     { label: '🧊 Ice Tower',      radius: 8, repeat: 0, use: placeStructure('iceTower') },
  flameTower:   { label: '🗼 Flame Tower',    radius: 9, repeat: 0, use: placeStructure('flameTower') },
  angleTower:   { label: '👼 Angle Tower',    radius: 8, repeat: 0, use: placeStructure('angleTower') },
  zombieVirus:  { label: '🧟 Zombie Infection', brush: true, repeat: 150, use: infect('zombie') },
  mushSpores:   { label: '🍄 Mush Spores',    brush: true, repeat: 150, use: infect('mush') },
  tumorInfect:  { label: '🫀 Tumor Infection', brush: true, repeat: 150, use: infect('tumor') },
});
Object.assign(POWER_GROUPS, {
  'Monster Nests': ['tumorCore', 'biomassCore', 'pumpkinCore', 'cyberCore', 'iceTower', 'flameTower', 'angleTower'],
  'Infections': ['zombieVirus', 'mushSpores', 'tumorInfect'],
});
