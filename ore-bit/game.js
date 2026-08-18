(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // Viewport in CSS pixels. The backing store is this times the device pixel
  // ratio, so thin hull lines and starfield don't turn to mush on retina.
  const view = { w: window.innerWidth, h: window.innerHeight, dpr: 1 };

  // ===== Data =====
  const ORE_TYPES = {
    iron:       { color: '#b8b8c8', value: 5,    weight: 1, label: 'Iron' },
    copper:     { color: '#e08555', value: 12,   weight: 1, label: 'Copper' },
    gold:       { color: '#ffd76a', value: 35,   weight: 2, label: 'Gold' },
    crystal:    { color: '#9be8ff', value: 90,   weight: 3, label: 'Crystal' },
    titanium:   { color: '#a8ffba', value: 50,   weight: 2, label: 'Titanium' },
    plasma:     { color: '#c878ff', value: 130,  weight: 3, label: 'Plasma' },
    palladium:  { color: '#bde0e0', value: 240,  weight: 3, label: 'Palladium',  unlock: 6 },
    darkmatter: { color: '#7a4ad0', value: 320,  weight: 4, label: 'Dark Matter' },
    iridium:    { color: '#e8eef4', value: 540,  weight: 4, label: 'Iridium',    unlock: 12 },
    antimatter: { color: '#ff8fb8', value: 800,  weight: 5, label: 'Antimatter' },
    neutronium: { color: '#9070ff', value: 1400, weight: 6, label: 'Neutronium', unlock: 20 },
    quantum:    { color: '#7fffd4', value: 2400, weight: 4, label: 'Quantum',    unlock: 30 },
  };

  const ZONES = [
    {
      name: 'Inner Belt',
      inner: 200,
      outer: 1500,
      ores: ['iron', 'iron', 'iron', 'copper', 'copper', 'gold', 'crystal'],
      shieldRequired: 0,
      hazardDps: 0,
      asteroidCount: 90,
      sizeRange: [28, 80],
      color: 'rgba(90, 208, 255, 0.12)',
    },
    {
      name: 'Mid Reach',
      inner: 1500,
      outer: 2900,
      ores: ['titanium', 'titanium', 'copper', 'plasma', 'crystal', 'palladium', 'palladium'],
      shieldRequired: 1,
      hazardDps: 9,
      asteroidCount: 80,
      sizeRange: [40, 100],
      color: 'rgba(168, 255, 186, 0.10)',
    },
    {
      name: 'Deep Void',
      inner: 2900,
      outer: 4500,
      ores: ['darkmatter', 'darkmatter', 'plasma', 'antimatter', 'iridium', 'iridium', 'neutronium', 'quantum'],
      shieldRequired: 2,
      hazardDps: 22,
      asteroidCount: 60,
      sizeRange: [55, 120],
      color: 'rgba(200, 120, 255, 0.10)',
    },
  ];

  const UPGRADES = {
    hull: {
      label: 'Hull Plating',
      desc: 'More max hull',
      tiers: [100, 160, 240, 360],
      costs: [120, 350, 900],
      extend: { step: 50, costMult: 1.7 },
    },
    cargo: {
      label: 'Cargo Hold',
      desc: 'Carry more ore',
      tiers: [30, 55, 90, 140],
      costs: [80, 280, 700],
      extend: { step: 25, costMult: 1.7 },
    },
    laser: {
      label: 'Mining Laser',
      desc: 'Mine faster',
      tiers: [1, 1.5, 2.2, 3.2],
      costs: [140, 380, 950],
      extend: { step: 0.4, costMult: 1.8 },
    },
    thrust: {
      label: 'Thrusters',
      desc: 'Faster acceleration',
      tiers: [220, 280, 360, 460],
      costs: [120, 320, 800],
      extend: { step: 40, costMult: 1.7 },
    },
    shield: {
      label: 'Shielding',
      desc: 'Survive deeper zones',
      tiers: [0, 1, 2],
      costs: [600, 2200],
    },
    magnet: {
      label: 'Magnet',
      desc: 'Pull ore from farther away',
      tiers: [160, 250, 360, 500],
      costs: [80, 220, 550],
      extend: { step: 60, costMult: 1.6 },
    },
    repair: {
      label: 'Auto-Repair',
      desc: 'Regen hull when out of combat',
      tiers: [0, 0.5, 1.2, 2.5],
      costs: [220, 700, 1800],
      extend: { step: 0.6, costMult: 1.7 },
    },
    refinery: {
      label: 'Refinery',
      desc: 'Higher ore sale value',
      tiers: [1, 1.10, 1.20, 1.35],
      costs: [300, 900, 2400],
      extend: { step: 0.08, costMult: 1.7 },
    },
    sensor: {
      label: 'Sensor Array',
      desc: 'Extends mining laser range',
      tiers: [1, 1.20, 1.40, 1.65],
      costs: [180, 500, 1400],
      extend: { step: 0.12, costMult: 1.6 },
    },
  };

  function tierValue(key, lvl) {
    const u = UPGRADES[key];
    const maxIdx = u.tiers.length - 1;
    if (lvl <= maxIdx) return u.tiers[lvl];
    if (!u.extend) return u.tiers[maxIdx];
    return u.tiers[maxIdx] + u.extend.step * (lvl - maxIdx);
  }

  function tierCost(key, lvl) {
    const u = UPGRADES[key];
    if (lvl < u.costs.length) return u.costs[lvl];
    if (!u.extend) return null;
    const lastCost = u.costs[u.costs.length - 1];
    const extra = lvl - (u.costs.length - 1);
    return Math.round(lastCost * Math.pow(u.extend.costMult, extra));
  }

  function formatCredits(n) {
    return n.toLocaleString('en-US');
  }

  function totalUpgrades() {
    let t = 0;
    for (const k in state.upgrades) t += state.upgrades[k];
    return t;
  }

  function damageHull(amount) {
    if (amount <= 0) return;
    state.hull -= amount;
    state.lastDamageT = performance.now();
    if (state.hull <= 0 && !state.over) gameOver();
  }

  const DIFFICULTIES = {
    easy:   { label: 'Easy',   pirateCapMult: 0.5, pirateSpawnMult: 1.7, pirateDmgMult: 0.6, hazardMult: 0.5, oreValueMult: 1.25 },
    normal: { label: 'Normal', pirateCapMult: 1,   pirateSpawnMult: 1,   pirateDmgMult: 1,   hazardMult: 1,   oreValueMult: 1 },
    hard:   { label: 'Hard',   pirateCapMult: 1.5, pirateSpawnMult: 0.65, pirateDmgMult: 1.5, hazardMult: 1.6, oreValueMult: 0.9 },
  };

  const PIRATES = {
    raider:      { hp: 30,  dmg: 7,  speed: 200, color: '#ff7a8c', credits: 45,   fireRate: 1.4, bulletSpeed: 540, size: 1,    bulletSize: 3 },
    corsair:     { hp: 60,  dmg: 11, speed: 320, color: '#ff9a3c', credits: 110,  fireRate: 0.75, bulletSpeed: 600, size: 0.95, bulletSize: 3, unlock: 8 },
    marauder:    { hp: 80,  dmg: 14, speed: 240, color: '#c878ff', credits: 160,  fireRate: 1.0, bulletSpeed: 620, size: 1.05, bulletSize: 3.2 },
    dreadnought: { hp: 260, dmg: 26, speed: 160, color: '#ff4d40', credits: 520,  fireRate: 0.55, bulletSpeed: 700, size: 1.6,  bulletSize: 5, unlock: 16 },
  };

  // Pirate cap per zone index (0=inner, 1=mid, 2=deep)
  const PIRATE_CAPS = [0, 3, 4];

  const WORLD_RADIUS = 4500;
  const STATION_RADIUS = 50;
  const DOCK_RANGE = 130;
  const SAVE_KEY = 'orebit-save-v1';

  // ===== State =====
  const state = {
    ship: null,
    asteroids: [],
    particles: [],
    ore: [],
    laser: { active: false, target: null, targetType: null },
    pirates: [],
    bullets: [],
    bounties: [],
    pirateTimer: 6,
    keys: new Set(),
    camera: { x: 0, y: 0 },
    credits: 0,
    cargo: emptyCargo(),
    hull: 0,
    upgrades: { hull: 0, cargo: 0, laser: 0, thrust: 0, shield: 0, magnet: 0, repair: 0, refinery: 0, sensor: 0 },
    difficulty: 'normal',
    over: false,
    docked: false,
    nearStation: false,
    stars: [],
    deepStars: [],
    nebulae: [],
    zoneIdx: 0,
    lastDamageT: 0,
    lightDir: { x: -0.62, y: -0.78 },
  };

  function emptyCargo() {
    const c = {};
    for (const t in ORE_TYPES) c[t] = 0;
    return c;
  }

  // ===== Save / load =====
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.credits === 'number') state.credits = s.credits;
      if (s.upgrades) Object.assign(state.upgrades, s.upgrades);
      if (s.difficulty && DIFFICULTIES[s.difficulty]) state.difficulty = s.difficulty;
    } catch (e) { /* ignore */ }
  }
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        credits: state.credits,
        upgrades: state.upgrades,
        difficulty: state.difficulty,
      }));
    } catch (e) { /* ignore */ }
  }

  // ===== Derived stats =====
  const maxHull   = () => tierValue('hull', state.upgrades.hull);
  const maxCargo  = () => tierValue('cargo', state.upgrades.cargo);
  const laserMult = () => tierValue('laser', state.upgrades.laser);
  const thrustPow = () => tierValue('thrust', state.upgrades.thrust);
  const shieldTier = () => tierValue('shield', state.upgrades.shield);
  const magnetRange = () => tierValue('magnet', state.upgrades.magnet);
  const repairRate = () => tierValue('repair', state.upgrades.repair);
  const refineryMult = () => tierValue('refinery', state.upgrades.refinery);
  const sensorMult = () => tierValue('sensor', state.upgrades.sensor);
  const diff = (key) => DIFFICULTIES[state.difficulty][key];
  const oreSellValue = (type) => Math.round(ORE_TYPES[type].value * diff('oreValueMult') * refineryMult());

  function cargoWeight() {
    let w = 0;
    for (const t in state.cargo) w += state.cargo[t] * ORE_TYPES[t].weight;
    return w;
  }
  function cargoValue() {
    let v = 0;
    for (const t in state.cargo) v += state.cargo[t] * oreSellValue(t);
    return v;
  }
  function tryAddCargo(type) {
    if (cargoWeight() + ORE_TYPES[type].weight > maxCargo()) return false;
    state.cargo[type]++;
    return true;
  }

  // ===== Helpers =====
  const rand = (a, b) => a + Math.random() * (b - a);
  const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
  const distOrigin = (x, y) => Math.hypot(x, y);

  function pickOre(zoneIdx, radius) {
    const tot = totalUpgrades();
    const pool = ZONES[zoneIdx].ores.filter(o => (ORE_TYPES[o].unlock || 0) <= tot);
    if (!pool.length) return ZONES[zoneIdx].ores[0]; // safety fallback
    let type = pool[Math.floor(Math.random() * pool.length)];
    // Bigger rocks slightly bias toward rarer ore in the zone
    if (radius > 80 && Math.random() < 0.25) {
      const rare = pool.filter(o => ORE_TYPES[o].value >= ORE_TYPES[type].value);
      if (rare.length) type = rare[rand(0, rare.length) | 0];
    }
    return type;
  }

  function getZoneIdx(x, y) {
    const d = distOrigin(x, y);
    for (let i = 0; i < ZONES.length; i++) {
      if (d <= ZONES[i].outer) return i;
    }
    return ZONES.length - 1;
  }

  // ===== World =====
  function makeAsteroid(x, y, radius, zoneIdx) {
    const verts = [];
    const n = Math.floor(rand(8, 14));
    for (let i = 0; i < n; i++) {
      verts.push({ a: (i / n) * Math.PI * 2, r: radius * rand(0.78, 1.1) });
    }
    const craters = [];
    const cn = Math.floor(rand(2, 5));
    for (let i = 0; i < cn; i++) {
      const ang = rand(0, Math.PI * 2);
      const dist = radius * rand(0.15, 0.6);
      craters.push({
        x: Math.cos(ang) * dist,
        y: Math.sin(ang) * dist,
        r: radius * rand(0.08, 0.18),
      });
    }
    const veins = [];
    const vn = Math.floor(rand(3, 7));
    for (let i = 0; i < vn; i++) {
      const ang = rand(0, Math.PI * 2);
      const dist = radius * rand(0.05, 0.55);
      veins.push({
        x: Math.cos(ang) * dist,
        y: Math.sin(ang) * dist,
        r: radius * rand(0.04, 0.09),
      });
    }
    const baseShade = rand(0.85, 1.15);
    return {
      x, y,
      vx: rand(-12, 12), vy: rand(-12, 12),
      radius,
      angle: rand(0, Math.PI * 2),
      spin: rand(-0.4, 0.4),
      health: radius * 1.6,
      maxHealth: radius * 1.6,
      verts,
      craters,
      veins,
      baseShade,
      ore: pickOre(zoneIdx, radius),
      zoneIdx,
    };
  }

  function spawnAsteroidsInZone(zoneIdx) {
    const z = ZONES[zoneIdx];
    for (let i = 0; i < z.asteroidCount; i++) {
      let x, y, ok = false, tries = 0;
      while (!ok && tries++ < 30) {
        const r = rand(z.inner, z.outer);
        const a = rand(0, Math.PI * 2);
        x = Math.cos(a) * r;
        y = Math.sin(a) * r;
        ok = dist2(x, y, 0, 0) > 220 * 220; // keep clear of station
      }
      const radius = rand(z.sizeRange[0], z.sizeRange[1]);
      state.asteroids.push(makeAsteroid(x, y, radius, zoneIdx));
    }
  }

  function spawnStars() {
    const tints = ['#ffffff', '#ffffff', '#ffffff', '#cfe0ff', '#cfe0ff', '#ffd9b3', '#ffb0b0'];
    const make = (n, bMin, bMax, sMin, sMax) => {
      const out = [];
      for (let i = 0; i < n; i++) {
        out.push({
          x: rand(-WORLD_RADIUS, WORLD_RADIUS),
          y: rand(-WORLD_RADIUS, WORLD_RADIUS),
          b: rand(bMin, bMax),
          size: rand(sMin, sMax),
          phase: rand(0, Math.PI * 2),
          tw: rand(0.6, 1.8),
          color: tints[Math.floor(Math.random() * tints.length)],
        });
      }
      return out;
    };
    state.stars = make(700, 0.25, 1, 0.4, 2.0);
    // Distant field, drawn at a fraction of the camera offset so it drifts
    // slowly behind everything else and sells the sense of motion.
    state.deepStars = make(520, 0.12, 0.45, 0.3, 1.1);
  }

  function spawnNebulae() {
    state.nebulae = [];
    const palette = [
      ['rgba(120, 60, 200, 0.18)', 'rgba(120, 60, 200, 0)'],
      ['rgba(60, 120, 220, 0.16)', 'rgba(60, 120, 220, 0)'],
      ['rgba(220, 80, 140, 0.14)', 'rgba(220, 80, 140, 0)'],
      ['rgba(80, 200, 180, 0.14)', 'rgba(80, 200, 180, 0)'],
    ];
    for (let i = 0; i < 6; i++) {
      const ang = rand(0, Math.PI * 2);
      const r = rand(900, WORLD_RADIUS - 500);
      const c = palette[Math.floor(Math.random() * palette.length)];
      state.nebulae.push({
        x: Math.cos(ang) * r,
        y: Math.sin(ang) * r,
        r: rand(700, 1400),
        c0: c[0],
        c1: c[1],
      });
    }
  }

  function reset(fullReset = false) {
    state.ship = { x: 0, y: 220, vx: 0, vy: 0, angle: -Math.PI / 2, thrusting: false };
    state.asteroids = [];
    state.particles = [];
    state.ore = [];
    state.pirates = [];
    state.bullets = [];
    state.bounties = [];
    state.pirateTimer = 8;
    state.cargo = emptyCargo();
    state.hull = maxHull();
    state.lastDamageT = performance.now();
    state.over = false;
    state.docked = false;
    if (fullReset) {
      state.credits = 0;
      for (const k in UPGRADES) state.upgrades[k] = 0;
      state.hull = maxHull();
      save();
    }
    for (let z = 0; z < ZONES.length; z++) spawnAsteroidsInZone(z);
    spawnStars();
    spawnNebulae();
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('shop').classList.add('hidden');
  }

  // ===== Input =====
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    state.keys.add(k);
    if (k === ' ') e.preventDefault();
    if (k === 'r' && state.over) reset();
    if (k === 'e') {
      if (state.docked) undock();
      else if (state.nearStation && !state.over) dock();
    }
  });
  window.addEventListener('keyup', (e) => state.keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => state.keys.clear());

  // ===== Ship =====
  function updateShip(dt) {
    const ship = state.ship;
    const k = state.keys;
    const rotateSpeed = 3.2;
    const thrust = thrustPow();
    const maxSpeed = 480;

    if (k.has('a') || k.has('arrowleft'))  ship.angle -= rotateSpeed * dt;
    if (k.has('d') || k.has('arrowright')) ship.angle += rotateSpeed * dt;

    ship.thrusting = k.has('w') || k.has('arrowup');
    if (ship.thrusting) {
      ship.vx += Math.cos(ship.angle) * thrust * dt;
      ship.vy += Math.sin(ship.angle) * thrust * dt;
      const sp = Math.hypot(ship.vx, ship.vy);
      if (sp > maxSpeed) {
        ship.vx = (ship.vx / sp) * maxSpeed;
        ship.vy = (ship.vy / sp) * maxSpeed;
      }
      const ex = ship.x - Math.cos(ship.angle) * 12;
      const ey = ship.y - Math.sin(ship.angle) * 12;
      state.particles.push({
        x: ex, y: ey,
        vx: -Math.cos(ship.angle) * 80 + rand(-30, 30),
        vy: -Math.sin(ship.angle) * 80 + rand(-30, 30),
        life: 0.4, max: 0.4, color: '#ff9a3c', size: 2.5,
      });
    } else {
      ship.vx *= Math.pow(0.85, dt);
      ship.vy *= Math.pow(0.85, dt);
    }

    // Brake — bleed speed without changing direction
    if (k.has('s') || k.has('arrowdown')) {
      const sp = Math.hypot(ship.vx, ship.vy);
      if (sp > 1) {
        const decel = thrust * 1.3 * dt;
        const newSp = Math.max(0, sp - decel);
        ship.vx = (ship.vx / sp) * newSp;
        ship.vy = (ship.vy / sp) * newSp;
        // small puff particles to either side of the nose
        if (Math.random() < dt * 30) {
          const sideAngle = ship.angle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
          state.particles.push({
            x: ship.x + Math.cos(ship.angle) * 8,
            y: ship.y + Math.sin(ship.angle) * 8,
            vx: Math.cos(sideAngle) * 90 + rand(-20, 20),
            vy: Math.sin(sideAngle) * 90 + rand(-20, 20),
            life: 0.3, max: 0.3, color: '#9fb4ff', size: 2,
          });
        }
      }
    }

    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;

    // soft world boundary — bounce off the outer edge
    const d = distOrigin(ship.x, ship.y);
    if (d > WORLD_RADIUS) {
      const nx = ship.x / d, ny = ship.y / d;
      ship.x = nx * WORLD_RADIUS;
      ship.y = ny * WORLD_RADIUS;
      const vDot = ship.vx * nx + ship.vy * ny;
      ship.vx -= 1.6 * vDot * nx;
      ship.vy -= 1.6 * vDot * ny;
    }

    state.zoneIdx = getZoneIdx(ship.x, ship.y);
  }

  // ===== Laser =====
  function updateLaser(dt) {
    const firing = state.keys.has(' ');
    const ship = state.ship;
    state.laser.active = firing;
    if (!firing) { state.laser.target = null; state.laser.targetType = null; return; }

    const range = 380 * sensorMult();
    const coneCos = Math.cos(0.45);
    let best = null, bestType = null, bestDist = range * range;

    function consider(obj, type, radius) {
      const dx = obj.x - ship.x, dy = obj.y - ship.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > bestDist) return;
      const d = Math.sqrt(d2);
      const dot = (dx * Math.cos(ship.angle) + dy * Math.sin(ship.angle)) / d;
      if (dot < coneCos) return;
      bestDist = d2;
      best = obj;
      bestType = type;
    }

    for (const p of state.pirates) consider(p, 'pirate', 12);
    for (const a of state.asteroids) consider(a, 'asteroid', a.radius);

    state.laser.target = best;
    state.laser.targetType = bestType;
    if (!best) return;

    const dmg = 45 * laserMult() * dt;
    if (bestType === 'asteroid') {
      best.health -= dmg;
      if (Math.random() < 0.6) {
        state.particles.push({
          x: best.x + rand(-best.radius, best.radius) * 0.5,
          y: best.y + rand(-best.radius, best.radius) * 0.5,
          vx: rand(-40, 40), vy: rand(-40, 40),
          life: 0.4, max: 0.4,
          color: ORE_TYPES[best.ore].color, size: 2,
        });
      }
      if (best.health <= 0) breakAsteroid(best);
    } else {
      best.hp -= dmg;
      if (Math.random() < 0.5) {
        state.particles.push({
          x: best.x + rand(-8, 8), y: best.y + rand(-8, 8),
          vx: rand(-60, 60), vy: rand(-60, 60),
          life: 0.35, max: 0.35,
          color: '#ff6a8c', size: 2,
        });
      }
      if (best.hp <= 0) killPirate(best);
    }
  }

  function breakAsteroid(a) {
    const idx = state.asteroids.indexOf(a);
    if (idx >= 0) state.asteroids.splice(idx, 1);

    for (let i = 0; i < 14; i++) {
      state.particles.push({
        x: a.x, y: a.y,
        vx: rand(-120, 120), vy: rand(-120, 120),
        life: 0.7, max: 0.7,
        color: ORE_TYPES[a.ore].color, size: 3,
      });
    }

    const drops = a.radius > 70 ? 4 : a.radius > 50 ? 3 : a.radius > 35 ? 2 : 1;
    for (let i = 0; i < drops; i++) {
      state.ore.push({
        x: a.x + rand(-10, 10), y: a.y + rand(-10, 10),
        vx: rand(-60, 60), vy: rand(-60, 60),
        type: a.ore, life: 14,
      });
    }

    if (a.radius > 45) {
      const chunks = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < chunks; i++) {
        const r = a.radius / 2 + rand(-4, 4);
        const child = makeAsteroid(a.x, a.y, Math.max(20, r), a.zoneIdx);
        const ang = rand(0, Math.PI * 2);
        child.vx = Math.cos(ang) * 60 + a.vx;
        child.vy = Math.sin(ang) * 60 + a.vy;
        child.ore = a.ore;
        state.asteroids.push(child);
      }
    }
  }

  // ===== Asteroids =====
  function updateAsteroids(dt) {
    for (const a of state.asteroids) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.angle += a.spin * dt;
      // keep them roughly within the world
      const d = distOrigin(a.x, a.y);
      if (d > WORLD_RADIUS - 20) {
        const nx = a.x / d, ny = a.y / d;
        a.vx -= 2 * (a.vx * nx + a.vy * ny) * nx;
        a.vy -= 2 * (a.vx * nx + a.vy * ny) * ny;
      }
    }

    // collisions vs ship
    const ship = state.ship;
    for (const a of state.asteroids) {
      const d2 = dist2(ship.x, ship.y, a.x, a.y);
      const r = a.radius + 9;
      if (d2 < r * r) {
        const d = Math.sqrt(d2) || 1;
        const nx = (ship.x - a.x) / d, ny = (ship.y - a.y) / d;
        ship.x = a.x + nx * r;
        ship.y = a.y + ny * r;
        const vDot = ship.vx * nx + ship.vy * ny;
        ship.vx -= 1.6 * vDot * nx;
        ship.vy -= 1.6 * vDot * ny;
        const impact = Math.min(20, Math.hypot(ship.vx, ship.vy) * 0.06);
        damageHull(impact);
      }
    }
  }

  // ===== Ore drops =====
  function updateOre(dt) {
    const ship = state.ship;
    for (let i = state.ore.length - 1; i >= 0; i--) {
      const o = state.ore[i];
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.vx *= Math.pow(0.5, dt);
      o.vy *= Math.pow(0.5, dt);
      o.life -= dt;
      const dx = ship.x - o.x, dy = ship.y - o.y;
      const d2 = dx * dx + dy * dy;
      const cargoFull = cargoWeight() + ORE_TYPES[o.type].weight > maxCargo();
      const range = magnetRange();
      if (!cargoFull && d2 < range * range) {
        const d = Math.sqrt(d2) || 1;
        o.vx += (dx / d) * 240 * dt;
        o.vy += (dy / d) * 240 * dt;
      }
      if (d2 < 14 * 14 && tryAddCargo(o.type)) {
        state.ore.splice(i, 1);
        continue;
      }
      if (o.life <= 0) state.ore.splice(i, 1);
    }
  }

  // ===== Particles =====
  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }

  // ===== Pirates =====
  function pickPirateType(zoneIdx) {
    const t = totalUpgrades();
    if (zoneIdx === 1) {
      if (t >= 8 && Math.random() < 0.35) return 'corsair';
      return 'raider';
    }
    // deep void
    if (t >= 16 && Math.random() < 0.30) return 'dreadnought';
    if (t >= 10 && Math.random() < 0.25) return 'corsair';
    return 'marauder';
  }

  function spawnPirate(zoneIdx) {
    const z = ZONES[zoneIdx];
    const a = rand(0, Math.PI * 2);
    const distAway = rand(700, 900);
    let x = state.ship.x + Math.cos(a) * distAway;
    let y = state.ship.y + Math.sin(a) * distAway;
    // keep within zone band
    const d = distOrigin(x, y);
    if (d < z.inner || d > z.outer) {
      const target = (z.inner + z.outer) / 2;
      const ang = Math.atan2(y, x);
      x = Math.cos(ang) * target;
      y = Math.sin(ang) * target;
    }
    const type = pickPirateType(zoneIdx);
    const spec = PIRATES[type];
    state.pirates.push({
      type, spec,
      x, y, vx: 0, vy: 0,
      angle: Math.atan2(state.ship.y - y, state.ship.x - x),
      hp: spec.hp, maxHp: spec.hp,
      cooldown: rand(0.6, 1.6),
    });
  }

  function updatePirateSpawn(dt) {
    state.pirateTimer -= dt;
    if (state.pirateTimer > 0) return;
    state.pirateTimer = rand(7, 13);
    // Only spawn in mid/deep zones, capped per zone, and only if player is at least at that zone
    for (let z = ZONES.length - 1; z >= 1; z--) {
      if (state.zoneIdx < z) continue;
      const here = state.pirates.filter(p => getZoneIdx(p.x, p.y) === z).length;
      if (here >= PIRATE_CAPS[z]) continue;
      spawnPirate(z);
      return;
    }
  }

  function updatePirates(dt) {
    const ship = state.ship;
    for (let i = state.pirates.length - 1; i >= 0; i--) {
      const p = state.pirates[i];
      const dx = ship.x - p.x, dy = ship.y - p.y;
      const dist = Math.hypot(dx, dy);
      const targetAngle = Math.atan2(dy, dx);
      let diff = targetAngle - p.angle;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      const turnRate = 2.6;
      p.angle += Math.max(-turnRate * dt, Math.min(turnRate * dt, diff));

      // accelerate toward player when far, drift when close
      if (dist > 220) {
        p.vx += Math.cos(p.angle) * p.spec.speed * dt;
        p.vy += Math.sin(p.angle) * p.spec.speed * dt;
      } else {
        p.vx *= Math.pow(0.5, dt);
        p.vy *= Math.pow(0.5, dt);
      }
      const sp = Math.hypot(p.vx, p.vy);
      const maxSp = p.spec.speed * 0.85;
      if (sp > maxSp) {
        p.vx = (p.vx / sp) * maxSp;
        p.vy = (p.vy / sp) * maxSp;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // fire bullets when reasonably aligned and in range
      p.cooldown -= dt;
      if (p.cooldown <= 0 && dist < 600 && Math.abs(diff) < 0.35) {
        state.bullets.push({
          x: p.x + Math.cos(p.angle) * 14,
          y: p.y + Math.sin(p.angle) * 14,
          vx: Math.cos(p.angle) * p.spec.bulletSpeed + p.vx * 0.5,
          vy: Math.sin(p.angle) * p.spec.bulletSpeed + p.vy * 0.5,
          life: 1.6, dmg: p.spec.dmg, color: p.spec.color, from: 'pirate',
          size: p.spec.bulletSize || 3,
        });
        p.cooldown = p.spec.fireRate * rand(0.85, 1.15);
      }

      // ramming damage
      const ramR = 18 + (p.spec.size || 1) * 6;
      if (dist < ramR) {
        damageHull(p.spec.dmg * 1.3 * dt);
        const nx = -dx / (dist || 1), ny = -dy / (dist || 1);
        p.vx += nx * 60;
        p.vy += ny * 60;
      }
    }
  }

  function killPirate(p) {
    const idx = state.pirates.indexOf(p);
    if (idx >= 0) state.pirates.splice(idx, 1);
    for (let i = 0; i < 18; i++) {
      state.particles.push({
        x: p.x, y: p.y,
        vx: rand(-160, 160), vy: rand(-160, 160),
        life: 0.8, max: 0.8,
        color: i % 3 === 0 ? '#ff9a3c' : p.spec.color, size: 3,
      });
    }
    // drop a bounty token (auto-collect)
    state.bounties.push({
      x: p.x, y: p.y,
      vx: rand(-30, 30), vy: rand(-30, 30),
      value: p.spec.credits, life: 18,
    });
  }

  // ===== Bullets =====
  function updateBullets(dt) {
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) { state.bullets.splice(i, 1); continue; }

      if (b.from === 'pirate') {
        const dx = b.x - state.ship.x, dy = b.y - state.ship.y;
        if (dx * dx + dy * dy < 12 * 12) {
          damageHull(b.dmg);
          state.bullets.splice(i, 1);
          for (let k = 0; k < 6; k++) {
            state.particles.push({
              x: b.x, y: b.y,
              vx: rand(-80, 80), vy: rand(-80, 80),
              life: 0.3, max: 0.3, color: '#ff5577', size: 2,
            });
          }
        }
      }
    }
  }

  // ===== Bounty pickups =====
  function updateBounties(dt) {
    const ship = state.ship;
    for (let i = state.bounties.length - 1; i >= 0; i--) {
      const b = state.bounties[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vx *= Math.pow(0.5, dt);
      b.vy *= Math.pow(0.5, dt);
      b.life -= dt;
      const dx = ship.x - b.x, dy = ship.y - b.y;
      const d2 = dx * dx + dy * dy;
      const range = magnetRange() * 1.4;
      if (d2 < range * range) {
        const d = Math.sqrt(d2) || 1;
        b.vx += (dx / d) * 280 * dt;
        b.vy += (dy / d) * 280 * dt;
      }
      if (d2 < 14 * 14) {
        state.credits += b.value;
        save();
        state.bounties.splice(i, 1);
        continue;
      }
      if (b.life <= 0) state.bounties.splice(i, 1);
    }
  }

  // ===== Auto-repair =====
  function updateRegen(dt) {
    const rate = repairRate();
    if (rate <= 0) return;
    const sinceDmg = (performance.now() - state.lastDamageT) / 1000;
    if (sinceDmg < 2.5) return;
    state.hull = Math.min(maxHull(), state.hull + rate * dt);
  }

  // ===== Hazard =====
  function updateHazard(dt) {
    const z = ZONES[state.zoneIdx];
    if (shieldTier() >= z.shieldRequired) return;
    damageHull(z.hazardDps * dt);
    // sparks
    if (Math.random() < dt * 8) {
      state.particles.push({
        x: state.ship.x + rand(-10, 10),
        y: state.ship.y + rand(-10, 10),
        vx: rand(-40, 40), vy: rand(-40, 40),
        life: 0.4, max: 0.4, color: '#ff5577', size: 2,
      });
    }
  }

  // ===== Station / Shop =====
  function updateStation() {
    const d = distOrigin(state.ship.x, state.ship.y);
    state.nearStation = d < DOCK_RANGE && !state.over;
    document.getElementById('dock-prompt').classList.toggle(
      'hidden', !(state.nearStation && !state.docked)
    );
  }

  function dock() {
    state.docked = true;
    // gentle stop
    state.ship.vx *= 0.2;
    state.ship.vy *= 0.2;
    document.getElementById('shop').classList.remove('hidden');
    renderShop();
  }
  function undock() {
    state.docked = false;
    document.getElementById('shop').classList.add('hidden');
    // nudge ship outward so we don't immediately re-trigger dock prompt
    const d = distOrigin(state.ship.x, state.ship.y) || 1;
    state.ship.x = (state.ship.x / d) * (DOCK_RANGE + 10);
    state.ship.y = (state.ship.y / d) * (DOCK_RANGE + 10);
  }

  function renderShop() {
    document.getElementById('shop-credits').textContent = formatCredits(state.credits);
    // cargo
    const cargoList = document.getElementById('cargo-list');
    cargoList.innerHTML = '';
    let any = false;
    for (const t in state.cargo) {
      if (!state.cargo[t]) continue;
      any = true;
      const o = ORE_TYPES[t];
      const row = document.createElement('div');
      row.className = 'cargo-row';
      row.innerHTML = `
        <span class="swatch" style="background:${o.color}"></span>
        <span class="name">${o.label}</span>
        <span class="qty">×${state.cargo[t]}</span>
        <span class="value">${formatCredits(state.cargo[t] * oreSellValue(t))}¢</span>
      `;
      cargoList.appendChild(row);
    }
    if (!any) {
      const empty = document.createElement('div');
      empty.className = 'cargo-empty';
      empty.textContent = 'Cargo hold is empty.';
      cargoList.appendChild(empty);
    }
    document.getElementById('sell-all').disabled = !any;

    // upgrades
    const upList = document.getElementById('upgrade-list');
    upList.innerHTML = '';
    for (const key in UPGRADES) {
      const u = UPGRADES[key];
      const lvl = state.upgrades[key];
      const maxIdx = u.tiers.length - 1;
      const row = document.createElement('div');
      row.className = 'upgrade-row';
      const pips = u.tiers.map((_, i) =>
        `<span class="pip ${i <= Math.min(lvl, maxIdx) ? 'filled' : ''}"></span>`
      ).join('');
      const overflow = lvl > maxIdx ? `<span class="lv-badge">+${lvl - maxIdx}</span>` : '';
      const cost = tierCost(key, lvl);
      const btnHtml = cost === null
        ? `<button disabled>MAX</button>`
        : `<button data-upgrade="${key}" ${state.credits < cost ? 'disabled' : ''}>${formatCredits(cost)}¢</button>`;
      row.innerHTML = `
        <span class="name">${u.label}<br><small style="color:var(--muted);font-weight:400">${u.desc}</small></span>
        <span class="level">${pips}${overflow}</span>
        ${btnHtml}
      `;
      upList.appendChild(row);
    }
  }

  document.getElementById('sell-all').addEventListener('click', () => {
    state.credits += cargoValue();
    state.cargo = emptyCargo();
    save();
    renderShop();
  });

  document.getElementById('upgrade-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-upgrade]');
    if (!btn) return;
    const key = btn.dataset.upgrade;
    const lvl = state.upgrades[key];
    const cost = tierCost(key, lvl);
    if (cost === null) return;
    if (state.credits < cost) return;
    state.credits -= cost;
    state.upgrades[key]++;
    if (key === 'hull') state.hull = maxHull(); // top up to new max on purchase
    save();
    renderShop();
  });

  document.getElementById('undock').addEventListener('click', undock);
  document.getElementById('restart-btn').addEventListener('click', () => reset());

  function gameOver() {
    state.over = true;
    document.getElementById('final-credits').textContent = formatCredits(state.credits);
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('dock-prompt').classList.add('hidden');
    document.getElementById('hazard-warning').classList.add('hidden');
  }

  // ===== Render =====
  function render() {
    const w = view.w, h = view.h;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    const ship = state.ship;
    const cam = state.camera;
    cam.x += (ship.x - cam.x) * 0.12;
    cam.y += (ship.y - cam.y) * 0.12;

    ctx.fillStyle = '#05060d';
    ctx.fillRect(0, 0, w, h);

    const t = performance.now() / 1000;
    drawStarLayer(state.deepStars, 0.38, cam, w, h, t);

    ctx.save();
    ctx.translate(w / 2 - cam.x, h / 2 - cam.y);

    // nebulae
    const camLeft = cam.x - w / 2, camRight = cam.x + w / 2;
    const camTop = cam.y - h / 2,  camBot   = cam.y + h / 2;
    for (const n of state.nebulae) {
      if (n.x + n.r < camLeft || n.x - n.r > camRight) continue;
      if (n.y + n.r < camTop  || n.y - n.r > camBot)   continue;
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.c0);
      g.addColorStop(1, n.c1);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // stars (twinkle) — near field, moves with the world
    for (const s of state.stars) {
      if (s.x < camLeft - 2 || s.x > camRight + 2 || s.y < camTop - 2 || s.y > camBot + 2) continue;
      const tw = 0.65 + 0.35 * Math.sin(t * s.tw + s.phase);
      ctx.globalAlpha = s.b * tw;
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, s.y, s.size, s.size);
      // The brightest few get a cheap four-point flare.
      if (s.size > 1.55 && s.b > 0.8) {
        ctx.globalAlpha = s.b * tw * 0.32;
        const f = s.size * 2.6;
        ctx.fillRect(s.x - f, s.y + s.size / 2 - 0.25, f * 2 + s.size, 0.5);
        ctx.fillRect(s.x + s.size / 2 - 0.25, s.y - f, 0.5, f * 2 + s.size);
      }
    }
    ctx.globalAlpha = 1;

    // zone rings
    ctx.setLineDash([6, 12]);
    ctx.lineWidth = 1;
    for (const z of ZONES) {
      ctx.strokeStyle = z.color;
      ctx.beginPath();
      ctx.arc(0, 0, z.outer, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // station
    drawStation();

    // asteroids (cull off-screen)
    const pad = 120;
    for (const a of state.asteroids) {
      if (a.x + a.radius < camLeft - pad || a.x - a.radius > camRight + pad) continue;
      if (a.y + a.radius < camTop - pad  || a.y - a.radius > camBot   + pad) continue;
      drawAsteroid(a);
    }

    // ore drops
    for (const o of state.ore) {
      ctx.fillStyle = ORE_TYPES[o.type].color;
      ctx.globalAlpha = Math.min(1, o.life / 2);
      ctx.beginPath();
      ctx.arc(o.x, o.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // bounty tokens
    for (const b of state.bounties) {
      const pulse = 0.7 + 0.3 * Math.sin(performance.now() / 200 + b.x);
      ctx.globalAlpha = Math.min(1, b.life / 3);
      ctx.fillStyle = '#ffe066';
      ctx.shadowColor = '#ffe066';
      ctx.shadowBlur = 8 * pulse;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // pirates
    for (const p of state.pirates) drawPirate(p);

    // bullets — glowing core with halo
    for (const b of state.bullets) {
      const sz = b.size || 3;
      ctx.fillStyle = b.color || '#ff7a8c';
      ctx.shadowColor = b.color || '#ff7a8c';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(b.x, b.y, sz, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // hot white core
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(b.x, b.y, Math.max(1, sz * 0.45), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // particles (shrink + fade)
    for (const p of state.particles) {
      const k = p.life / p.max;
      ctx.globalAlpha = k;
      ctx.fillStyle = p.color;
      const sz = p.size * (0.4 + 0.6 * k);
      ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;

    // laser — colored halo + hot white core
    if (state.laser.active && state.laser.target) {
      const tgt = state.laser.target;
      const x0 = ship.x + Math.cos(ship.angle) * 10;
      const y0 = ship.y + Math.sin(ship.angle) * 10;
      ctx.strokeStyle = '#ff6a8c';
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 6;
      ctx.shadowColor = '#ff6a8c';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.stroke();
      // impact flash
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(performance.now() / 40);
      ctx.beginPath();
      ctx.arc(tgt.x, tgt.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ship
    drawShip(ship);

    ctx.restore();

    // off-screen indicators
    drawStationCompass(w, h, cam);
    drawPirateCompass(w, h, cam);

    drawVignette(w, h);
  }

  // Parallax star pass. Drawn outside the camera transform so each layer can
  // move at its own fraction of the camera.
  function drawStarLayer(list, p, cam, w, h, t) {
    if (!list || !list.length) return;
    const ox = w / 2 - cam.x * p;
    const oy = h / 2 - cam.y * p;
    const left = cam.x * p - w / 2, right = cam.x * p + w / 2;
    const top = cam.y * p - h / 2, bot = cam.y * p + h / 2;
    for (const s of list) {
      if (s.x < left - 2 || s.x > right + 2 || s.y < top - 2 || s.y > bot + 2) continue;
      const tw = 0.7 + 0.3 * Math.sin(t * s.tw + s.phase);
      ctx.globalAlpha = s.b * tw;
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x + ox, s.y + oy, s.size, s.size);
    }
    ctx.globalAlpha = 1;
  }

  let vignetteCache = null;
  function drawVignette(w, h) {
    if (!vignetteCache || vignetteCache.w !== w || vignetteCache.h !== h) {
      const gr = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.36,
                                          w / 2, h / 2, Math.max(w, h) * 0.75);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(0,0,0,0.55)');
      vignetteCache = { w, h, gr };
    }
    ctx.fillStyle = vignetteCache.gr;
    ctx.fillRect(0, 0, w, h);
  }

  function drawPirateCompass(w, h, cam) {
    for (const p of state.pirates) {
      const sx = p.x - cam.x + w / 2;
      const sy = p.y - cam.y + h / 2;
      if (sx >= -20 && sy >= -20 && sx <= w + 20 && sy <= h + 20) continue;
      const cx = w / 2, cy = h / 2;
      const dx = sx - cx, dy = sy - cy;
      const ang = Math.atan2(dy, dx);
      const margin = 36;
      const ix = cx + Math.cos(ang) * (Math.min(w, h) / 2 - margin);
      const iy = cy + Math.sin(ang) * (Math.min(w, h) / 2 - margin);
      ctx.save();
      ctx.translate(ix, iy);
      ctx.rotate(ang);
      ctx.fillStyle = p.spec.color;
      ctx.shadowColor = p.spec.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(-4, -4);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawStation() {
    ctx.save();
    ctx.strokeStyle = 'rgba(90, 208, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, DOCK_RANGE, 0, Math.PI * 2);
    ctx.stroke();

    // outer ring
    ctx.strokeStyle = '#5ad0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, STATION_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(26, 36, 64, 0.9)';
    ctx.fill();

    // spokes
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
      ctx.lineTo(Math.cos(a) * STATION_RADIUS, Math.sin(a) * STATION_RADIUS);
    }
    ctx.stroke();

    // core
    ctx.fillStyle = '#ffe066';
    ctx.shadowColor = '#ffe066';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawAsteroid(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.angle);

    // outline path
    ctx.beginPath();
    for (let i = 0; i < a.verts.length; i++) {
      const v = a.verts[i];
      const x = Math.cos(v.a) * v.r;
      const y = Math.sin(v.a) * v.r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();

    // lit/shadow fill — light from upper-left in world space, but we're rotated,
    // so rotate the light direction the opposite way.
    const lx = state.lightDir.x * Math.cos(-a.angle) - state.lightDir.y * Math.sin(-a.angle);
    const ly = state.lightDir.x * Math.sin(-a.angle) + state.lightDir.y * Math.cos(-a.angle);
    const damaged = 1 - a.health / a.maxHealth;
    const g = ctx.createRadialGradient(
      lx * a.radius * 0.5, ly * a.radius * 0.5, a.radius * 0.1,
      0, 0, a.radius * 1.1
    );
    const shade = a.baseShade;
    const lit = Math.floor(140 * shade), litG = Math.floor(150 * shade), litB = Math.floor(170 * shade);
    const dark = Math.floor(28 * shade), darkG = Math.floor(32 * shade), darkB = Math.floor(46 * shade);
    g.addColorStop(0, `rgb(${lit},${litG},${litB})`);
    g.addColorStop(0.55, `rgb(${Math.floor(lit*0.55)},${Math.floor(litG*0.55)},${Math.floor(litB*0.6)})`);
    g.addColorStop(1, `rgb(${dark},${darkG},${darkB})`);
    ctx.fillStyle = g;
    ctx.fill();

    // ore-tinted rim
    ctx.strokeStyle = ORE_TYPES[a.ore].color;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // craters — clip to asteroid shape so they sit on the surface
    ctx.save();
    ctx.clip();
    for (const c of a.craters) {
      const cg = ctx.createRadialGradient(c.x - lx * c.r * 0.3, c.y - ly * c.r * 0.3, 0, c.x, c.y, c.r);
      cg.addColorStop(0, 'rgba(10, 12, 20, 0.65)');
      cg.addColorStop(1, 'rgba(10, 12, 20, 0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // ore veins — small glowing pockets
    const oreColor = ORE_TYPES[a.ore].color;
    for (const v of a.veins) {
      const vg = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, v.r * 1.6);
      vg.addColorStop(0, oreColor);
      vg.addColorStop(0.6, oreColor + '80');
      vg.addColorStop(1, oreColor + '00');
      ctx.fillStyle = vg;
      ctx.globalAlpha = 0.55 + damaged * 0.35;
      ctx.beginPath();
      ctx.arc(v.x, v.y, v.r * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.restore();
  }

  function drawPirate(p) {
    const s = p.spec.size || 1;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.scale(s, s);

    // engine glow trail
    const eg = ctx.createRadialGradient(-8, 0, 0, -8, 0, 12);
    eg.addColorStop(0, p.spec.color);
    eg.addColorStop(1, p.spec.color + '00');
    ctx.fillStyle = eg;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(-8, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // hull gradient
    const hg = ctx.createLinearGradient(13, -9, -7, 9);
    hg.addColorStop(0, '#3a2230');
    hg.addColorStop(0.6, '#1c1018');
    hg.addColorStop(1, '#0a0509');
    ctx.fillStyle = hg;
    ctx.strokeStyle = p.spec.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(-7, -9);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-7, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // cockpit
    ctx.fillStyle = p.spec.color;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(4, 0, 3, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // dreadnought gets gun barrels
    if (p.type === 'dreadnought') {
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(8, -4); ctx.lineTo(14, -4);
      ctx.moveTo(8, 4);  ctx.lineTo(14, 4);
      ctx.stroke();
    }
    ctx.restore();

    // health bar above
    if (p.hp < p.maxHp) {
      const w = 24 * s;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(p.x - w / 2, p.y - 18 * s, w, 3);
      ctx.fillStyle = p.spec.color;
      ctx.fillRect(p.x - w / 2, p.y - 18 * s, w * (p.hp / p.maxHp), 3);
    }
  }

  function drawShip(ship) {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    // engine flame
    if (ship.thrusting) {
      const flameLen = 16 + Math.random() * 6;
      const fg = ctx.createRadialGradient(-10, 0, 0, -10 - flameLen / 2, 0, flameLen);
      fg.addColorStop(0, '#fff7d0');
      fg.addColorStop(0.4, '#ff9a3c');
      fg.addColorStop(1, 'rgba(255, 80, 0, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(-8, -5);
      ctx.lineTo(-10 - flameLen, 0);
      ctx.lineTo(-8, 5);
      ctx.closePath();
      ctx.fill();
    }

    // shield ring if equipped
    if (shieldTier() > 0) {
      const sc = shieldTier() > 1 ? 'rgba(200, 120, 255, ' : 'rgba(168, 255, 186, ';
      const sg = ctx.createRadialGradient(0, 0, 10, 0, 0, 16);
      sg.addColorStop(0, sc + '0)');
      sg.addColorStop(0.7, sc + '0.18)');
      sg.addColorStop(1, sc + '0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = sc + '0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();
    }

    // hull gradient (lit on top-front)
    const lg = ctx.createLinearGradient(8, -7, -6, 7);
    lg.addColorStop(0, '#f4f8ff');
    lg.addColorStop(0.55, '#a8b8d8');
    lg.addColorStop(1, '#48586e');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#5ad0ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // cockpit
    const cg = ctx.createRadialGradient(5, 0, 0, 5, 0, 3);
    cg.addColorStop(0, '#bff0ff');
    cg.addColorStop(1, '#1a4060');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(5, 0, 2.5, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // engine port glow
    ctx.fillStyle = '#5ad0ff';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(-7, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  function drawStationCompass(w, h, cam) {
    const sx = -cam.x + w / 2;
    const sy = -cam.y + h / 2;
    if (sx >= 0 && sy >= 0 && sx <= w && sy <= h) return;
    const cx = w / 2, cy = h / 2;
    const dx = sx - cx, dy = sy - cy;
    const ang = Math.atan2(dy, dx);
    const margin = 50;
    const ix = cx + Math.cos(ang) * (Math.min(w, h) / 2 - margin);
    const iy = cy + Math.sin(ang) * (Math.min(w, h) / 2 - margin);
    ctx.save();
    ctx.translate(ix, iy);
    ctx.rotate(ang);
    ctx.fillStyle = '#ffe066';
    ctx.shadowColor = '#ffe066';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-4, -5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ===== HUD =====
  function updateHud() {
    document.getElementById('credits').textContent = formatCredits(state.credits);
    document.getElementById('hull-bar').style.width = Math.max(0, state.hull / maxHull() * 100) + '%';
    document.getElementById('cargo-bar').style.width = (cargoWeight() / maxCargo() * 100) + '%';
    document.getElementById('zone-name').textContent = ZONES[state.zoneIdx].name;
    const z = ZONES[state.zoneIdx];
    const danger = shieldTier() < z.shieldRequired;
    document.getElementById('hazard-warning').classList.toggle('hidden', !danger || state.over || state.docked);
  }

  // ===== Main loop =====
  function resize() {
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    canvas.style.width = view.w + 'px';
    canvas.style.height = view.h + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 60;
  function loop(now) {
    const frameDt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!state.over && !state.docked) {
      acc += frameDt;
      while (acc >= STEP) {
        updateShip(STEP);
        updateAsteroids(STEP);
        updatePirateSpawn(STEP);
        updatePirates(STEP);
        updateBullets(STEP);
        updateBounties(STEP);
        updateLaser(STEP);
        updateOre(STEP);
        updateParticles(STEP);
        updateHazard(STEP);
        updateRegen(STEP);
        updateStation();
        acc -= STEP;
      }
    } else {
      acc = 0;
    }
    render();
    updateHud();
    requestAnimationFrame(loop);
  }

  loadSave();
  reset();
  requestAnimationFrame(loop);
})();
