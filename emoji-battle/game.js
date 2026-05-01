// ============================================================
// Emoji Battle — Real-time Strategy: Bot + Local PvP + Online
// ============================================================

const GRID_COLS = 36;
const GRID_ROWS = 20;
const CELL_PX = 48;
const DIVIDER_COL = GRID_COLS / 2;

// Timing (seconds)
const INCOME_INTERVAL = 8;
const UNIT_MOVE_INTERVAL = 1.2;
const UNIT_ATTACK_INTERVAL = 0.9;
const TOWER_ATTACK_INTERVAL = 1.4;
const BOT_ACTION_INTERVAL = 1.8;

// --- Terrain ---
const TERRAIN = {
  grass:    { emoji: '', color: '#2d5a1b', name: 'Grass' },
  water:    { emoji: '🌊', color: '#1a3a6b', name: 'Water', blocked: true },
  mountain: { emoji: '⛰️', color: '#4a4a4a', name: 'Mountain', blocked: true },
  snow:     { emoji: '', color: '#c8d8e8', name: 'Snow' },
  desert:   { emoji: '', color: '#c4a44a', name: 'Desert' },
  forest:   { emoji: '🌲', color: '#1a4a1a', name: 'Forest' },
};

let terrainMap = [];

function generateTerrain() {
  terrainMap = [];
  // Simple noise-based terrain using multiple random seeds
  const seed1 = Math.random() * 1000;
  const seed2 = Math.random() * 1000;

  for (let r = 0; r < GRID_ROWS; r++) {
    terrainMap[r] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      // Simple pseudo-noise
      const nx = Math.sin(seed1 + c * 0.4 + r * 0.1) * Math.cos(seed2 + r * 0.3 + c * 0.05);
      const ny = Math.cos(seed1 + r * 0.5 + c * 0.2) * Math.sin(seed2 + c * 0.4 + r * 0.15);
      const val = (nx + ny) / 2;

      // Keep cells near castles as grass (starting areas)
      const spawns = game.spawns || [{ row: Math.floor(GRID_ROWS / 2), col: 2 }, { row: Math.floor(GRID_ROWS / 2), col: GRID_COLS - 3 }];
      let nearSpawn = false;
      for (const s of spawns) {
        if (Math.abs(r - s.row) + Math.abs(c - s.col) <= 4) { nearSpawn = true; break; }
      }
      if (nearSpawn) {
        terrainMap[r][c] = 'grass';
        continue;
      }

      if (val < -0.6) terrainMap[r][c] = 'water';
      else if (val < -0.35) terrainMap[r][c] = 'desert';
      else if (val > 0.6) terrainMap[r][c] = 'mountain';
      else if (val > 0.4) terrainMap[r][c] = 'snow';
      else if (val > 0.2 && Math.random() < 0.4) terrainMap[r][c] = 'forest';
      else terrainMap[r][c] = 'grass';
    }
  }
}

function terrainAt(r, c) {
  if (!terrainMap[r]) return TERRAIN.grass;
  return TERRAIN[terrainMap[r][c]] || TERRAIN.grass;
}

function terrainBlocks(r, c) {
  return terrainAt(r, c).blocked === true;
}

// --- Definitions ---
const BUILDINGS = {
  castle:   { emoji: '🏰', name: 'Castle',   cost: 0,  hp: 50, income: 0,  desc: 'Your HQ — lose it and you lose!' },
  house:    { emoji: '🏠', name: 'House',     cost: 30, hp: 10, income: 5,  desc: '+5 💰 per tick' },
  wall:     { emoji: '🧱', name: 'Wall',      cost: 15, hp: 25, income: 0,  desc: 'Blocks enemies' },
  tower:    { emoji: '🗼', name: 'Tower',     cost: 50, hp: 15, income: 0,  desc: 'Shoots nearby enemies (2 dmg)', range: 2, attack: 2 },
  fortress: { emoji: '🏯', name: 'Fortress',  cost: 90, hp: 30, income: 0,  desc: 'Strong tower (4 dmg, 3 range)', range: 3, attack: 4 },
  barracks: { emoji: '⚔️',  name: 'Barracks',  cost: 40, hp: 15, income: 0,  desc: 'Required to train soldiers' },
  stable:   { emoji: '🐎', name: 'Stable',    cost: 55, hp: 12, income: 0,  desc: 'Required for cavalry & chariots' },
  farm:     { emoji: '🌾', name: 'Farm',      cost: 25, hp: 8,  income: 3,  desc: '+3 💰 per tick' },
  mine:     { emoji: '⛏️',  name: 'Mine',      cost: 60, hp: 10, income: 10, desc: '+10 💰 per tick' },
  market:   { emoji: '🏪', name: 'Market',    cost: 45, hp: 10, income: 7,  desc: '+7 💰 per tick' },
  temple:   { emoji: '⛪', name: 'Temple',    cost: 75, hp: 12, income: 0,  desc: 'Heals nearby units each tick', healRange: 2, healAmount: 2 },
  workshop: { emoji: '🔨', name: 'Workshop',  cost: 65, hp: 12, income: 0,  desc: 'Required for siege units' },
};

const UNITS = {
  swordsman: { emoji: '🗡️', name: 'Swordsman', cost: 20, hp: 8,  attack: 3, speed: 1, desc: 'Basic melee fighter', requires: 'barracks' },
  archer:    { emoji: '🏹', name: 'Archer',    cost: 30, hp: 5,  attack: 2, speed: 1, desc: 'Ranged (2 tiles)', range: 2, requires: 'barracks' },
  cavalry:   { emoji: '🐴', name: 'Cavalry',   cost: 45, hp: 10, attack: 4, speed: 2, desc: 'Fast & strong', requires: 'stable' },
  knight:    { emoji: '🛡️', name: 'Knight',    cost: 55, hp: 18, attack: 2, speed: 1, desc: 'Tanky defender', requires: 'barracks' },
  wizard:    { emoji: '🧙', name: 'Wizard',    cost: 70, hp: 6,  attack: 6, speed: 1, desc: 'High damage caster', range: 3, requires: 'barracks' },
  assassin:  { emoji: '🥷', name: 'Assassin',  cost: 50, hp: 5,  attack: 7, speed: 2, desc: 'Fast & deadly, fragile', requires: 'barracks' },
  berserker: { emoji: '🪓', name: 'Berserker', cost: 35, hp: 12, attack: 5, speed: 1, desc: 'Raging fighter', requires: 'barracks' },
  healer:    { emoji: '💚', name: 'Healer',    cost: 40, hp: 4,  attack: 0, speed: 1, desc: 'Heals nearby allies (no attack)', range: 2, heals: 2, requires: 'temple' },
  chariot:   { emoji: '🏇', name: 'Chariot',   cost: 65, hp: 14, attack: 5, speed: 2, desc: 'Armored fast unit', requires: 'stable' },
  catapult:  { emoji: '💣', name: 'Catapult',  cost: 80, hp: 8,  attack: 8, speed: 1, desc: 'Siege — huge damage, slow', range: 4, requires: 'workshop' },
  dragon:    { emoji: '🐉', name: 'Dragon',    cost: 120, hp: 20, attack: 7, speed: 1, desc: 'Flying beast, ignores terrain', range: 2, flying: true, requires: 'workshop' },
};

// --- Player Colors ---
const PLAYER_COLORS = [
  { name: '🔵', color: '#4488ff', bg: 'rgba(30,80,200,' },
  { name: '🔴', color: '#ff4444', bg: 'rgba(200,40,40,' },
  { name: '🟢', color: '#44cc44', bg: 'rgba(40,180,40,' },
  { name: '🟡', color: '#ffcc00', bg: 'rgba(200,180,0,' },
];

// --- State ---
let game = null;
let net = { peer: null, conn: null, isHost: false, myIndex: 0, roomCode: null };

function createPlayer(id) {
  return { id, gold: 100, income: 5, buildings: [], units: [], alive: true, alliances: {}, attackTarget: null, username: null };
}

function isRealTime() { return game && game.mode !== 'pvp'; }

// Diplomacy: check if two players are allied
function areAllied(pi1, pi2) {
  if (pi1 === pi2) return true;
  if (!game) return false;
  return game.players[pi1].alliances[pi2] === 'ally' && game.players[pi2].alliances[pi1] === 'ally';
}

function isEnemy(pi1, pi2) {
  return pi1 !== pi2 && !areAllied(pi1, pi2);
}

function generateSpawnPositions(numPlayers) {
  const spawns = [];
  const MIN_DIST = 6;
  const margin = 2;

  for (let i = 0; i < numPlayers; i++) {
    let attempts = 0;
    let pos;
    while (attempts < 200) {
      let row, col;
      if (numPlayers === 2) {
        // 2 players: left vs right
        row = margin + Math.floor(Math.random() * (GRID_ROWS - margin * 2));
        col = i === 0
          ? margin + Math.floor(Math.random() * 5)
          : GRID_COLS - margin - 1 - Math.floor(Math.random() * 5);
      } else if (numPlayers === 3) {
        // 3 players: corners + side
        if (i === 0) { row = margin + Math.floor(Math.random() * 4); col = margin + Math.floor(Math.random() * 4); }
        else if (i === 1) { row = margin + Math.floor(Math.random() * 4); col = GRID_COLS - margin - 1 - Math.floor(Math.random() * 4); }
        else { row = GRID_ROWS - margin - 1 - Math.floor(Math.random() * 4); col = Math.floor(GRID_COLS / 2) - 2 + Math.floor(Math.random() * 4); }
      } else {
        // 4 players: corners
        if (i === 0) { row = margin + Math.floor(Math.random() * 4); col = margin + Math.floor(Math.random() * 4); }
        else if (i === 1) { row = margin + Math.floor(Math.random() * 4); col = GRID_COLS - margin - 1 - Math.floor(Math.random() * 4); }
        else if (i === 2) { row = GRID_ROWS - margin - 1 - Math.floor(Math.random() * 4); col = margin + Math.floor(Math.random() * 4); }
        else { row = GRID_ROWS - margin - 1 - Math.floor(Math.random() * 4); col = GRID_COLS - margin - 1 - Math.floor(Math.random() * 4); }
      }

      // Ensure minimum distance from all other spawns
      let valid = true;
      for (const s of spawns) {
        if (Math.abs(s.row - row) + Math.abs(s.col - col) < MIN_DIST) { valid = false; break; }
      }
      if (valid) { pos = { row, col }; break; }
      attempts++;
    }
    if (!pos) {
      // Fallback positions
      const fallbacks = [
        { row: 3, col: 3 }, { row: 3, col: GRID_COLS - 4 },
        { row: GRID_ROWS - 4, col: 3 }, { row: GRID_ROWS - 4, col: GRID_COLS - 4 }
      ];
      pos = fallbacks[i];
    }
    spawns.push(pos);
  }
  return spawns;
}

function initGame(mode, difficulty, numPlayers) {
  const playerCount = numPlayers || 2;
  const players = [];
  for (let i = 0; i < playerCount; i++) players.push(createPlayer(i + 1));

  game = {
    mode, difficulty,
    players,
    numPlayers: playerCount,
    phase: 'play',
    selected: null,
    grid: [],
    effects: [],
    log: [],
    winner: null,
    diplomacyOffers: [], // pending alliance offers
    // Real-time state
    startTime: performance.now(),
    lastIncome: 0,
    lastUnitMove: 0,
    lastUnitAttack: 0,
    lastTowerAttack: 0,
    lastBotAction: 0,
    lastShopRefresh: 0,
    // Turn-based state (pvp only)
    currentPlayer: 0,
    turn: 1,
  };

  for (let r = 0; r < GRID_ROWS; r++) {
    game.grid[r] = [];
    for (let c = 0; c < GRID_COLS; c++) game.grid[r][c] = null;
  }

  // Random spawn positions with minimum 6 blocks apart
  const spawns = generateSpawnPositions(playerCount);
  game.spawns = spawns;

  generateTerrain();

  for (let i = 0; i < playerCount; i++) {
    placeBuilding(i, 'castle', spawns[i].row, spawns[i].col);
  }

  if (mode === 'bot' || mode === 'tutorial') game.log = [`Game started! ${playerCount > 2 ? playerCount + ' players! ' : ''}Build fast — the bots are coming! 🤖`];
  else if (mode === 'online') game.log = [net.isHost ? 'Connected! You are 🔵.' : `Connected! You are ${PLAYER_COLORS[net.myIndex].name}.`];
  else game.log = ['Game started! 🔵 Player 1 goes first.'];

  // Show/hide HUD elements based on mode
  const rt = mode !== 'pvp';
  document.getElementById('timer-label').classList.toggle('hidden', !rt);
  document.getElementById('next-income-label').classList.toggle('hidden', !rt);
  document.getElementById('turn-label').classList.toggle('hidden', rt);
  document.getElementById('current-player').classList.toggle('hidden', rt);
  document.getElementById('end-turn-btn').classList.toggle('hidden', rt);
  document.getElementById('p1-income-unit').textContent = rt ? '/tick' : '/turn';
  document.getElementById('p2-income-unit').textContent = rt ? '/tick' : '/turn';
  document.getElementById('shop-panel').classList.remove('not-my-turn');
  // Show/hide extra player HUDs
  const p3hud = document.getElementById('p3-hud');
  const p4hud = document.getElementById('p4-hud');
  if (p3hud) p3hud.classList.toggle('hidden', playerCount < 3);
  if (p4hud) p4hud.classList.toggle('hidden', playerCount < 4);
  // Show diplomacy panel in multiplayer
  const diploPanel = document.getElementById('diplomacy-panel');
  if (diploPanel) diploPanel.classList.toggle('hidden', playerCount < 3);
}

// ============================================================
// GRID
// ============================================================

function inBounds(r, c) { return r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS; }
function playerTerritory(pi, col, row) {
  if (!game || game.numPlayers <= 2) {
    return pi === 0 ? col < DIVIDER_COL : col >= DIVIDER_COL;
  }
  // Multi-player: territory is closest to your castle
  const spawn = game.spawns[pi];
  const myDist = Math.abs(row - spawn.row) + Math.abs(col - spawn.col);
  for (let i = 0; i < game.numPlayers; i++) {
    if (i === pi || !game.players[i].alive) continue;
    const other = game.spawns[i];
    if (Math.abs(row - other.row) + Math.abs(col - other.col) < myDist) return false;
  }
  return true;
}
function cellOccupied(r, c) { return game.grid[r][c] !== null || terrainBlocks(r, c); }

// Returns true if a unit owned by playerIdx can move into (r,c)
function cellBlocksUnit(r, c, playerIdx, unit) {
  if (terrainBlocks(r, c) && !(unit && unit.flying)) return true;
  const cell = game.grid[r][c];
  if (!cell) return false;
  if (cell.entityType === 'unit') return true;
  return cell.player !== playerIdx;
}

function rebuildGrid() {
  for (let r = 0; r < GRID_ROWS; r++)
    for (let c = 0; c < GRID_COLS; c++)
      game.grid[r][c] = null;
  for (let p = 0; p < game.numPlayers; p++) {
    game.players[p].buildings.forEach((b, i) => {
      if (b.hp > 0) game.grid[b.row][b.col] = { player: p, entityType: 'building', entityIdx: i };
    });
    game.players[p].units.forEach((u, i) => {
      if (u.hp > 0) game.grid[u.row][u.col] = { player: p, entityType: 'unit', entityIdx: i };
    });
  }
}

// ============================================================
// BUILDINGS & UNITS
// ============================================================

const BUILD_RADIUS = 3;

function canBuildAt(pi, row, col) {
  // Must be within BUILD_RADIUS of an existing building
  for (const b of game.players[pi].buildings) {
    if (b.hp <= 0) continue;
    if (dist(row, col, b.row, b.col) <= BUILD_RADIUS) return true;
  }
  return false;
}

function placeBuilding(pi, type, row, col) {
  const def = BUILDINGS[type];
  const b = { type, row, col, hp: def.hp, maxHp: def.hp };
  game.players[pi].buildings.push(b);
  game.grid[row][col] = { player: pi, entityType: 'building', entityIdx: game.players[pi].buildings.length - 1 };
  if (def.income > 0) game.players[pi].income += def.income;
  return b;
}

function countBuildings(pi, type) {
  return game.players[pi].buildings.filter(b => b.type === type && b.hp > 0).length;
}

function hasBarracks(pi) { return countBuildings(pi, 'barracks') > 0; }
function hasBuilding(pi, type) { return countBuildings(pi, type) > 0; }
function canTrainUnit(pi, unitType) {
  const req = UNITS[unitType].requires;
  if (!req) return hasBarracks(pi);
  return countBuildings(pi, req) > 0;
}

// spawnUnit: spawns near a specific building, or if none given, picks a random one of the required type
function spawnUnit(pi, type, spawnBuilding) {
  const def = UNITS[type];
  const reqType = def.requires || 'barracks';
  if (!spawnBuilding) {
    const candidates = game.players[pi].buildings.filter(b => b.type === reqType && b.hp > 0);
    if (candidates.length === 0) return null;
    spawnBuilding = candidates[Math.floor(Math.random() * candidates.length)];
  }
  const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
  for (const [dr, dc] of dirs) {
    const nr = spawnBuilding.row + dr, nc = spawnBuilding.col + dc;
    if (inBounds(nr, nc) && !cellBlocksUnit(nr, nc, pi, def)) {
      const u = {
        type, row: nr, col: nc,
        hp: def.hp, maxHp: def.hp,
        attack: def.attack, speed: def.speed,
        range: def.range || 1,
        flying: def.flying || false,
        heals: def.heals || 0,
      };
      game.players[pi].units.push(u);
      rebuildGrid();
      return u;
    }
  }
  return null;
}

// ============================================================
// REAL-TIME GAME TICK
// ============================================================

function gameTime() { return (performance.now() - game.startTime) / 1000; }

function dist(r1, c1, r2, c2) { return Math.abs(r1 - r2) + Math.abs(c1 - c2); }

function pLabel(idx) {
  if ((game.mode === 'bot' || game.mode === 'tutorial') && idx !== 0) return '🤖';
  return PLAYER_COLORS[idx] ? PLAYER_COLORS[idx].name : '⬜';
}

function addEffect(emoji, row, col) { game.effects.push({ emoji, row, col, ttl: 15 }); }

function addLog(msg) {
  game.log.unshift(msg);
  if (game.log.length > 10) game.log.pop();
}

function tickGame() {
  if (!game || game.phase !== 'play') return;

  // PvP is turn-based — no real-time ticks
  if (game.mode === 'pvp') return;

  const t = gameTime();

  // Income
  if (t - game.lastIncome >= INCOME_INTERVAL) {
    game.lastIncome = t;
    for (let p = 0; p < game.numPlayers; p++) if (game.players[p].alive) game.players[p].gold += game.players[p].income;
    addLog(`💰 Income tick!`);
  }

  // Move units
  if (t - game.lastUnitMove >= UNIT_MOVE_INTERVAL) {
    game.lastUnitMove = t;
    moveAllUnits();
  }

  // Unit attacks
  if (t - game.lastUnitAttack >= UNIT_ATTACK_INTERVAL) {
    game.lastUnitAttack = t;
    allUnitAttacks();
  }

  // Tower attacks
  if (t - game.lastTowerAttack >= TOWER_ATTACK_INTERVAL) {
    game.lastTowerAttack = t;
    allTowerAttacks();
    healTick();
  }

  // Bot(s)
  if ((game.mode === 'bot' || game.mode === 'tutorial') && t - game.lastBotAction >= BOT_ACTION_INTERVAL) {
    game.lastBotAction = t;
    if (game.mode === 'bot') {
      for (let bp = 1; bp < game.numPlayers; bp++) {
        if (game.players[bp].alive) botTickFor(bp);
      }
    } else tutorialBotTick();
  }

  // Refresh shop every 2 seconds so affordability updates with income
  if (t - game.lastShopRefresh >= 2) {
    game.lastShopRefresh = t;
    buildShop();
  }

  cleanupDead();
}

// ============================================================
// PVP TURN LOGIC
// ============================================================

function pvpEndTurn() {
  if (!game || game.mode !== 'pvp' || game.phase !== 'play') return;
  const pi = game.currentPlayer;

  // Towers fire
  allTowerAttacksFor(pi);
  // Soldiers move
  moveUnitsFor(pi);
  // Soldiers attack
  allUnitAttacksFor(pi);
  cleanupDead();

  if (game.phase === 'over') return;

  // Switch player (cycle through alive players)
  let nextP = (game.currentPlayer + 1) % game.numPlayers;
  while (!game.players[nextP].alive && nextP !== game.currentPlayer) {
    nextP = (nextP + 1) % game.numPlayers;
  }
  game.currentPlayer = nextP;
  if (game.currentPlayer === 0) game.turn++;

  // Income for next player
  const next = game.players[game.currentPlayer];
  next.gold += next.income;
  game.selected = null;

  addLog(`Turn ${game.turn}: ${PLAYER_COLORS[game.currentPlayer].name} Player ${game.currentPlayer + 1}'s turn (+${next.income} 💰)`);
  updatePvpUI();
  buildShop();
}

function moveUnitsFor(pi) {
  const units = game.players[pi].units.filter(u => u.hp > 0);
  for (const u of units) {
    if (u.heals > 0 && !hasAdjacentEnemy(u, pi)) continue;
    if (hasAdjacentEnemy(u, pi)) continue;
    moveUnitTowardEnemy(u, pi);
  }
}

function allUnitAttacksFor(pi) {
  for (const u of game.players[pi].units) {
    if (u.hp <= 0) continue;
    if (u.heals > 0) continue; // healers don't attack
    const range = u.range || 1;
    let target = null, tt = null, td = Infinity, targetPi = -1;
    for (let ep = 0; ep < game.numPlayers; ep++) {
      if (!isEnemy(pi, ep)) continue;
      for (const eu of game.players[ep].units) {
        if (eu.hp <= 0) continue;
        const d = dist(u.row, u.col, eu.row, eu.col);
        if (d <= range && d < td) { target = eu; tt = 'unit'; td = d; targetPi = ep; }
      }
      for (const eb of game.players[ep].buildings) {
        if (eb.hp <= 0) continue;
        const d = dist(u.row, u.col, eb.row, eb.col);
        if (d <= range && d < td) { target = eb; tt = 'building'; td = d; targetPi = ep; }
      }
    }
    if (target) {
      target.hp -= u.attack;
      addEffect('💥', target.row, target.col);
      if (target.hp <= 0) {
        const emoji = tt === 'unit' ? UNITS[target.type].emoji : BUILDINGS[target.type].emoji;
        addLog(`${pLabel(pi)} ${UNITS[u.type].emoji} destroyed ${emoji}!`);
        if (tt === 'building' && target.type === 'castle') { eliminatePlayer(targetPi, pi); }
        if (tt === 'building' && BUILDINGS[target.type].income > 0) game.players[targetPi].income -= BUILDINGS[target.type].income;
      }
    }
  }
}

function allTowerAttacksFor(pi) {
  for (const b of game.players[pi].buildings) {
    if (b.hp <= 0) continue;
    const def = BUILDINGS[b.type];
    if (!def.attack) continue;
    let closest = null, cd = Infinity;
    for (let ep = 0; ep < game.numPlayers; ep++) {
      if (!isEnemy(pi, ep)) continue;
      for (const eu of game.players[ep].units) {
        if (eu.hp <= 0) continue;
        const d = dist(b.row, b.col, eu.row, eu.col);
        if (d <= def.range && d < cd) { closest = eu; cd = d; }
      }
    }
    if (closest) {
      closest.hp -= def.attack;
      addEffect('💥', closest.row, closest.col);
      if (closest.hp <= 0) addLog(`${pLabel(pi)} Tower destroyed ${UNITS[closest.type].emoji}!`);
    }
  }
}

function updatePvpUI() {
  const cp = game.currentPlayer;
  document.getElementById('turn-num').textContent = game.turn;
  document.getElementById('current-player').textContent = `${cp === 0 ? '🔵' : '🔴'} Player ${cp + 1}'s Turn`;
  document.getElementById('shop-panel').classList.remove('not-my-turn');
}

function hasAdjacentEnemy(u, pi) {
  for (let ep = 0; ep < game.numPlayers; ep++) {
    if (!isEnemy(pi, ep)) continue;
    for (const eu of game.players[ep].units)
      if (eu.hp > 0 && dist(u.row, u.col, eu.row, eu.col) <= 1) return true;
    for (const eb of game.players[ep].buildings)
      if (eb.hp > 0 && dist(u.row, u.col, eb.row, eb.col) <= 1) return true;
  }
  return false;
}

// Get the target enemy for a player (can be set via attack target selector)
function getAttackTarget(p) {
  const target = game.players[p].attackTarget;
  // If target is set and alive, use it
  if (target != null && target !== p && game.players[target] && game.players[target].alive && isEnemy(p, target)) {
    return target;
  }
  // Otherwise find nearest enemy
  let nearest = -1, nearestDist = Infinity;
  for (let ep = 0; ep < game.numPlayers; ep++) {
    if (!isEnemy(p, ep) || !game.players[ep].alive) continue;
    const castle = game.players[ep].buildings.find(b => b.type === 'castle' && b.hp > 0);
    if (castle) {
      const spawn = game.spawns[p];
      const d = dist(spawn.row, spawn.col, castle.row, castle.col);
      if (d < nearestDist) { nearestDist = d; nearest = ep; }
    }
  }
  return nearest >= 0 ? nearest : -1;
}

// Move a single unit toward the target enemy's castle
function moveUnitTowardEnemy(u, p) {
  const targetPi = getAttackTarget(p);
  if (targetPi < 0) return;

  // Find the target castle or nearest enemy building
  let goal = game.players[targetPi].buildings.find(b => b.type === 'castle' && b.hp > 0);
  if (!goal) goal = game.players[targetPi].buildings.find(b => b.hp > 0);
  if (!goal) {
    // No buildings left, target enemy units
    const eu = game.players[targetPi].units.find(eu => eu.hp > 0);
    if (eu) goal = eu;
    else return;
  }

  for (let step = 0; step < u.speed; step++) {
    const dr = goal.row > u.row ? 1 : goal.row < u.row ? -1 : 0;
    const dc = goal.col > u.col ? 1 : goal.col < u.col ? -1 : 0;

    // Try to move in the best direction toward goal
    const moves = [];
    if (dc !== 0) moves.push({ r: u.row, c: u.col + dc });
    if (dr !== 0) moves.push({ r: u.row + dr, c: u.col });
    if (dc !== 0 && dr !== 0) moves.push({ r: u.row + dr, c: u.col + dc });
    // Sideways fallbacks
    if (dc === 0) { moves.push({ r: u.row, c: u.col + 1 }); moves.push({ r: u.row, c: u.col - 1 }); }
    if (dr === 0) { moves.push({ r: u.row + 1, c: u.col }); moves.push({ r: u.row - 1, c: u.col }); }

    let moved = false;
    for (const m of moves) {
      if (inBounds(m.r, m.c) && !cellBlocksUnit(m.r, m.c, p, u)) {
        u.row = m.r;
        u.col = m.c;
        rebuildGrid();
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }
}

function moveAllUnits() {
  for (let p = 0; p < game.numPlayers; p++) {
    if (!game.players[p].alive) continue;
    const units = game.players[p].units.filter(u => u.hp > 0);
    for (const u of units) {
      if (u.heals > 0 && !hasAdjacentEnemy(u, p)) continue;
      if (hasAdjacentEnemy(u, p)) continue;
      moveUnitTowardEnemy(u, p);
    }
  }
}

function allUnitAttacks() {
  for (let p = 0; p < game.numPlayers; p++) {
    if (!game.players[p].alive) continue;
    allUnitAttacksFor(p);
  }
}

function allTowerAttacks() {
  for (let p = 0; p < game.numPlayers; p++) {
    if (!game.players[p].alive) continue;
    allTowerAttacksFor(p);
  }
}

function eliminatePlayer(pi, killerPi) {
  game.players[pi].alive = false;
  addLog(`${pLabel(killerPi)} destroyed ${pLabel(pi)}'s Castle! ${pLabel(pi)} eliminated!`);
  // Check if only one player (or one alliance) remains
  const alivePlayers = game.players.filter(p => p.alive);
  if (alivePlayers.length <= 1) {
    game.phase = 'over';
    game.winner = killerPi;
  } else if (game.numPlayers > 2) {
    // Check if all remaining alive players are allied with each other
    const aliveIndices = game.players.map((p, i) => p.alive ? i : -1).filter(i => i >= 0);
    let allAllied = true;
    for (let i = 0; i < aliveIndices.length && allAllied; i++) {
      for (let j = i + 1; j < aliveIndices.length && allAllied; j++) {
        if (!areAllied(aliveIndices[i], aliveIndices[j])) allAllied = false;
      }
    }
    if (allAllied) { game.phase = 'over'; game.winner = killerPi; }
  }
}

function healTick() {
  for (let p = 0; p < game.numPlayers; p++) {
    if (!game.players[p].alive) continue;
    // Temple healing
    for (const b of game.players[p].buildings) {
      if (b.hp <= 0 || !BUILDINGS[b.type].healRange) continue;
      const range = BUILDINGS[b.type].healRange;
      const amount = BUILDINGS[b.type].healAmount;
      for (const u of game.players[p].units) {
        if (u.hp <= 0 || u.hp >= u.maxHp) continue;
        if (dist(b.row, b.col, u.row, u.col) <= range) {
          u.hp = Math.min(u.maxHp, u.hp + amount);
          addEffect('💚', u.row, u.col);
        }
      }
    }
    // Healer units
    for (const u of game.players[p].units) {
      if (u.hp <= 0 || !u.heals) continue;
      for (const ally of game.players[p].units) {
        if (ally === u || ally.hp <= 0 || ally.hp >= ally.maxHp) continue;
        if (dist(u.row, u.col, ally.row, ally.col) <= (u.range || 1)) {
          ally.hp = Math.min(ally.maxHp, ally.hp + u.heals);
          addEffect('💚', ally.row, ally.col);
        }
      }
    }
  }
}

function cleanupDead() {
  for (let p = 0; p < game.numPlayers; p++)
    game.players[p].units = game.players[p].units.filter(u => u.hp > 0);
  rebuildGrid();
  if (game.phase === 'over') showWinScreen();
}

// ============================================================
// BOT AI
// ============================================================

function botTick() { botTickFor(1); }

function botTickFor(botIdx) {
  const bot = game.players[botIdx];
  if (!bot.alive) return;
  const diff = game.difficulty;
  const aggression = diff === 'easy' ? 0.4 : diff === 'medium' ? 0.7 : 0.9;
  const multiTrain = diff === 'easy' ? 1 : diff === 'medium' ? 2 : 3;

  // Hard bot gets gold bonus
  if (diff === 'hard') bot.gold += 5;
  if (diff === 'medium') bot.gold += 2;

  // Strategic building priorities
  if (!hasBarracks(botIdx) && bot.gold >= 40) {
    botBuildFor(botIdx, 'barracks');
  } else if (countBuildings(botIdx, 'barracks') < 2 && diff !== 'easy' && bot.gold >= 40) {
    botBuildFor(botIdx, 'barracks');
  } else if (!hasBuilding(botIdx, 'stable') && bot.gold >= 55 && diff !== 'easy') {
    botBuildFor(botIdx, 'stable');
  } else if (!hasBuilding(botIdx, 'workshop') && bot.gold >= 65 && diff !== 'easy') {
    botBuildFor(botIdx, 'workshop');
  } else if (!hasBuilding(botIdx, 'temple') && bot.gold >= 75 && diff === 'hard') {
    botBuildFor(botIdx, 'temple');
  } else if (Math.random() < 0.5) {
    const econ = diff === 'hard'
      ? ['mine', 'market', 'mine', 'house', 'farm']
      : ['house', 'farm', 'mine', 'market', 'house', 'farm'];
    for (const type of shuffle(econ)) {
      if (bot.gold >= BUILDINGS[type].cost) { botBuildFor(botIdx, type); break; }
    }
  } else {
    const defense = diff === 'hard'
      ? ['fortress', 'tower', 'fortress', 'wall', 'temple']
      : ['tower', 'wall', 'fortress', 'tower', 'temple'];
    for (const type of shuffle(defense)) {
      if (bot.gold >= BUILDINGS[type].cost) { botBuildFor(botIdx, type); break; }
    }
  }

  // Train multiple units per tick at higher difficulties
  for (let i = 0; i < multiTrain; i++) {
    if (Math.random() < aggression) {
      const priority = getUnitPriority(diff);
      for (const type of priority) {
        if (bot.gold >= UNITS[type].cost && canTrainUnit(botIdx, type)) {
          const unit = spawnUnit(botIdx, type);
          if (unit) { bot.gold -= UNITS[type].cost; addLog(`🤖 Trained ${UNITS[type].emoji}`); }
          break;
        }
      }
    }
  }

  // Bot diplomacy: hard bots may ally with each other against the human in 3+ player games
  if (diff === 'hard' && game.numPlayers > 2 && Math.random() < 0.1) {
    for (let other = 1; other < game.numPlayers; other++) {
      if (other === botIdx || !game.players[other].alive) continue;
      if (other === 0) continue; // don't ally with human
      if (!areAllied(botIdx, other)) {
        game.players[botIdx].alliances[other] = 'ally';
        game.players[other].alliances[botIdx] = 'ally';
        addLog(`🤖 Bots ${pLabel(botIdx)} & ${pLabel(other)} formed an alliance!`);
        break;
      }
    }
  }
}

function tutorialBotTick() {
  const bot = game.players[1];
  // Very simple bot for tutorial — slow and predictable
  if (!hasBarracks(1) && bot.gold >= 40) {
    botBuild('barracks');
  } else if (hasBarracks(1) && bot.gold >= 20 && Math.random() < 0.3) {
    const unit = spawnUnit(1, 'swordsman');
    if (unit) { bot.gold -= 20; addLog(`🤖 Trained 🗡️`); }
  } else if (bot.gold >= 30 && Math.random() < 0.2) {
    botBuild('house');
  }
}

function botBuild(type) { botBuildFor(1, type); }

function botBuildFor(botIdx, type) {
  const bot = game.players[botIdx];
  if (bot.gold < BUILDINGS[type].cost) return;
  const cell = findBotBuildCellFor(botIdx, type);
  if (cell) { placeBuilding(botIdx, type, cell.row, cell.col); bot.gold -= BUILDINGS[type].cost; addLog(`🤖 Built ${BUILDINGS[type].emoji}`); }
}

function getUnitPriority(diff) {
  if (diff === 'easy') return shuffle(['swordsman', 'swordsman', 'archer', 'berserker']);
  if (diff === 'medium') return shuffle(['swordsman', 'archer', 'cavalry', 'knight', 'assassin', 'chariot', 'berserker']);
  // Hard bot: smart composition based on game state
  const botUnits = game.players[1].units.filter(u => u.hp > 0);
  const eu = game.players[0].units.filter(u => u.hp > 0).length;
  const hasTanks = botUnits.filter(u => u.type === 'knight' || u.type === 'chariot').length;
  const hasDps = botUnits.filter(u => u.type === 'wizard' || u.type === 'dragon' || u.type === 'catapult').length;

  // Prioritize siege if enemy has lots of buildings
  const enemyBuildings = game.players[0].buildings.filter(b => b.hp > 0).length;
  if (enemyBuildings > 6) return ['catapult', 'dragon', 'cavalry', 'assassin', 'knight'];
  // Need tanks to soak damage
  if (hasTanks < 2) return ['knight', 'chariot', 'cavalry', 'berserker', 'wizard'];
  // Need DPS behind tanks
  if (hasDps < 2) return ['dragon', 'wizard', 'catapult', 'assassin', 'cavalry'];
  // Overwhelm with numbers if enemy has few units
  if (eu < 3) return ['cavalry', 'assassin', 'berserker', 'chariot', 'swordsman'];
  // Default balanced composition
  return shuffle(['dragon', 'cavalry', 'assassin', 'wizard', 'catapult', 'knight', 'chariot', 'berserker']);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function findBotBuildCell(type) { return findBotBuildCellFor(1, type); }

function findBotBuildCellFor(botIdx, type) {
  const castle = game.players[botIdx].buildings.find(b => b.type === 'castle' && b.hp > 0);
  if (!castle) return null;
  const isDefense = type === 'wall' || type === 'tower' || type === 'fortress';
  const candidates = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (cellOccupied(r, c) || terrainBlocks(r, c)) continue;
      if (!playerTerritory(botIdx, c, r)) continue;
      if (!canBuildAt(botIdx, r, c)) continue;
      const dc = dist(r, c, castle.row, castle.col);
      let score;
      if (isDefense) {
        // Place defenses between castle and nearest enemy
        score = 100 - dc * 3 + Math.random() * 5;
        if (dc <= 3) score += 20;
      } else {
        score = 100 - dc * 5 + Math.random() * 5;
      }
      candidates.push({ row: r, col: c, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

// ============================================================
// NETWORKING (PeerJS)
// ============================================================

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function netSend(data) { if (net.conn && net.conn.open) net.conn.send(JSON.stringify(data)); }

function getSerializableState() {
  return {
    players: game.players.map(p => ({
      id: p.id, gold: p.gold, income: p.income,
      buildings: p.buildings.map(b => ({ type: b.type, row: b.row, col: b.col, hp: b.hp, maxHp: b.maxHp })),
      units: p.units.map(u => ({ type: u.type, row: u.row, col: u.col, hp: u.hp, maxHp: u.maxHp, attack: u.attack, speed: u.speed, range: u.range, flying: u.flying, heals: u.heals })),
    })),
    phase: game.phase, winner: game.winner, log: game.log, lastIncome: game.lastIncome,
    terrainMap: terrainMap,
  };
}

function applyState(state) {
  game.players = state.players;
  game.phase = state.phase;
  game.winner = state.winner;
  game.log = state.log;
  game.lastIncome = state.lastIncome;
  if (state.terrainMap) terrainMap = state.terrainMap;
  game.selected = null;
  rebuildGrid();
  if (game.phase === 'over') showWinScreen();
}

function broadcastState() { netSend({ type: 'state', state: getSerializableState() }); }

let broadcastTimer = null;
function startBroadcasting() { if (broadcastTimer) clearInterval(broadcastTimer); broadcastTimer = setInterval(() => { if (game && game.phase === 'play' && net.isHost) broadcastState(); }, 500); }
function stopBroadcasting() { if (broadcastTimer) { clearInterval(broadcastTimer); broadcastTimer = null; } }

function handleNetMessage(raw) {
  let data; try { data = JSON.parse(raw); } catch { return; }
  if (data.type === 'state' && !net.isHost) applyState(data.state);
  if (data.type === 'action' && net.isHost) handleRemoteAction(data.action, 1);
  if (data.type === 'start') {
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    const myUsername = (document.getElementById('username-input').value || '').trim() || 'Guest';
    initGame('online'); resizeCanvas(); buildShop(); if (!animFrameId) startRenderLoop();
    game.players[1].username = myUsername; // I am player 1 (joiner)
    if (data.username) game.players[0].username = data.username; // Host's name
    netSend({ type: 'username', username: myUsername });
  }
  if (data.type === 'username' && net.isHost && game) {
    game.players[1].username = data.username;
    addLog(`${PLAYER_COLORS[1].name} ${data.username} joined!`);
  }
}

function handleRemoteAction(action, fromPlayer) {
  if (game.phase !== 'play') return;
  const player = game.players[fromPlayer];
  if (action.kind === 'build') {
    const def = BUILDINGS[action.type];
    if (playerTerritory(fromPlayer, action.col, action.row) && !cellOccupied(action.row, action.col) && canBuildAt(fromPlayer, action.row, action.col) && player.gold >= def.cost) {
      placeBuilding(fromPlayer, action.type, action.row, action.col);
      player.gold -= def.cost; addLog(`${pLabel(fromPlayer)} Built ${def.emoji}`);
    }
  }
  if (action.kind === 'train') {
    const def = UNITS[action.type];
    if (player.gold >= def.cost && canTrainUnit(fromPlayer, action.type)) {
      // Find the barracks at the specified location, or pick any
      let barracks = null;
      if (action.barracksRow != null && action.barracksCol != null) {
        barracks = player.buildings.find(b => b.type === 'barracks' && b.hp > 0 && b.row === action.barracksRow && b.col === action.barracksCol);
      }
      const unit = spawnUnit(fromPlayer, action.type, barracks);
      if (unit) { player.gold -= def.cost; addLog(`${pLabel(fromPlayer)} Trained ${def.emoji}`); }
    }
  }
}

function setupConnection(conn) {
  net.conn = conn;
  conn.on('data', handleNetMessage);
  conn.on('close', () => { if (game && game.phase === 'play') addLog('Opponent disconnected!'); });
  conn.on('error', (err) => showLobbyError('Connection lost: ' + err.message));
}

function hostGame() {
  const roomCode = generateRoomCode();
  net.roomCode = roomCode; net.isHost = true; net.myIndex = 0;
  showLobbyError('');
  document.getElementById('lobby-choices').classList.add('hidden');
  document.getElementById('host-waiting').classList.remove('hidden');
  document.getElementById('room-code-text').textContent = roomCode;
  document.getElementById('lobby-status').textContent = 'Creating room...';
  net.peer = new Peer('emojibattle-' + roomCode.toLowerCase());
  net.peer.on('open', () => { document.getElementById('lobby-status').textContent = 'Waiting for opponent...'; });
  net.peer.on('connection', (conn) => {
    setupConnection(conn);
    conn.on('open', () => {
      document.getElementById('lobby-screen').classList.add('hidden');
      document.getElementById('game-screen').classList.remove('hidden');
      const username = (document.getElementById('username-input').value || '').trim() || 'Host';
      initGame('online'); resizeCanvas(); buildShop(); if (!animFrameId) startRenderLoop();
      game.players[0].username = username;
      startBroadcasting(); netSend({ type: 'start', username }); setTimeout(() => broadcastState(), 300);
    });
  });
  net.peer.on('error', (err) => { if (err.type === 'unavailable-id') showLobbyError('Room code in use.'); else showLobbyError('Error: ' + err.message); });
}

function joinGame(code) {
  net.roomCode = code.toUpperCase(); net.isHost = false; net.myIndex = 1;
  showLobbyError('');
  document.getElementById('join-waiting').classList.remove('hidden');
  document.getElementById('join-loader').classList.remove('hidden');
  document.getElementById('join-connect-btn').disabled = true;
  net.peer = new Peer('emojibattle-guest-' + Math.random().toString(36).slice(2, 8));
  net.peer.on('open', () => {
    const conn = net.peer.connect('emojibattle-' + code.toLowerCase(), { reliable: true });
    conn.on('open', () => {
      setupConnection(conn);
      document.getElementById('join-waiting').textContent = 'Connected! Starting...';
      document.getElementById('join-waiting').classList.add('connected-text');
      document.getElementById('join-loader').classList.add('hidden');
    });
    conn.on('error', (err) => { showLobbyError('Could not connect: ' + err.message); resetJoinUI(); });
    setTimeout(() => { if (!conn.open) { showLobbyError('Room not found.'); resetJoinUI(); if (net.peer) { net.peer.destroy(); net.peer = null; } } }, 10000);
  });
  net.peer.on('error', (err) => { showLobbyError('Error: ' + err.message); resetJoinUI(); });
}

function resetJoinUI() {
  document.getElementById('join-waiting').classList.add('hidden');
  document.getElementById('join-loader').classList.add('hidden');
  document.getElementById('join-connect-btn').disabled = false;
}

function showLobbyError(msg) {
  const el = document.getElementById('lobby-error');
  if (msg) { el.textContent = msg; el.classList.remove('hidden'); } else el.classList.add('hidden');
}

function cleanupNet() {
  stopBroadcasting();
  if (net.conn) { net.conn.close(); net.conn = null; }
  if (net.peer) { net.peer.destroy(); net.peer = null; }
  net.isHost = false; net.myIndex = 0; net.roomCode = null;
}

// ============================================================
// RENDERING
// ============================================================

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let animFrameId = null;

function resizeCanvas() {
  const wrapper = document.getElementById('grid-wrapper');
  const maxW = wrapper.clientWidth - 16, maxH = wrapper.clientHeight - 16;
  const scale = Math.min(maxW / (GRID_COLS * CELL_PX), maxH / (GRID_ROWS * CELL_PX), 1);
  canvas.width = Math.floor(GRID_COLS * CELL_PX * scale);
  canvas.height = Math.floor(GRID_ROWS * CELL_PX * scale);
  canvas.style.width = canvas.width + 'px';
  canvas.style.height = canvas.height + 'px';
}

function cellSize() { return canvas.width / GRID_COLS; }

function drawGrid() {
  const cs = cellSize();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const x = c * cs, y = r * cs, light = (r + c) % 2 === 0;
      const terrain = terrainAt(r, c);

      // Base terrain color
      ctx.fillStyle = terrain.color;
      ctx.globalAlpha = light ? 0.85 : 0.7;
      ctx.fillRect(x, y, cs, cs);
      ctx.globalAlpha = 1;

      // Territorial overlay — color by nearest player
      if (game && game.spawns) {
        const teamAlpha = light ? 0.08 : 0.04;
        let closestP = 0, closestD = Infinity;
        for (let pi = 0; pi < game.numPlayers; pi++) {
          if (!game.players[pi].alive) continue;
          const s = game.spawns[pi];
          const d = Math.abs(r - s.row) + Math.abs(c - s.col);
          if (d < closestD) { closestD = d; closestP = pi; }
        }
        ctx.fillStyle = (PLAYER_COLORS[closestP].bg || 'rgba(100,100,100,') + teamAlpha + ')';
        ctx.fillRect(x, y, cs, cs);
      }

      // Draw terrain emoji for blocking/notable terrain
      if (terrain.emoji) {
        ctx.font = `${Math.floor(cs * 0.4)}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.6;
        ctx.fillText(terrain.emoji, x + cs / 2, y + cs / 2);
        ctx.globalAlpha = 1;
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.5; ctx.strokeRect(x, y, cs, cs);
    }
  }

  if (game && game.numPlayers <= 2) {
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(DIVIDER_COL * cs, 0); ctx.lineTo(DIVIDER_COL * cs, canvas.height); ctx.stroke(); ctx.setLineDash([]);
  }

  if (game && game.selected) {
    if (game.selected.kind === 'shop_building') {
      const pi = game.selected.forPlayer;
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const inTerritory = playerTerritory(pi, c, r);
          const inRange = canBuildAt(pi, r, c);
          if (inTerritory && inRange && !cellOccupied(r, c)) {
            ctx.fillStyle = 'rgba(255,215,0,0.15)';
            ctx.fillRect(c * cs, r * cs, cs, cs);
          } else if (inTerritory && !inRange && !cellOccupied(r, c)) {
            // Show build radius border — dim cells outside range
            ctx.fillStyle = 'rgba(255,50,50,0.08)';
            ctx.fillRect(c * cs, r * cs, cs, cs);
          }
        }
      }
      // Draw build radius border outline
      ctx.strokeStyle = 'rgba(255,215,0,0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (!canBuildAt(pi, r, c)) continue;
          // Draw border edges where adjacent cell is NOT in range
          const x = c * cs, y = r * cs;
          if (c === 0 || !canBuildAt(pi, r, c - 1)) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + cs); ctx.stroke(); }
          if (c === GRID_COLS - 1 || !canBuildAt(pi, r, c + 1)) { ctx.beginPath(); ctx.moveTo(x + cs, y); ctx.lineTo(x + cs, y + cs); ctx.stroke(); }
          if (r === 0 || !canBuildAt(pi, r - 1, c)) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cs, y); ctx.stroke(); }
          if (r === GRID_ROWS - 1 || !canBuildAt(pi, r + 1, c)) { ctx.beginPath(); ctx.moveTo(x, y + cs); ctx.lineTo(x + cs, y + cs); ctx.stroke(); }
        }
      }
      ctx.setLineDash([]);
    }
    if (game.selected.kind === 'shop_unit') {
      // Highlight the required building type the player can click
      const pi = game.selected.forPlayer;
      const reqType = UNITS[game.selected.type].requires || 'barracks';
      game.players[pi].buildings.forEach(b => {
        if (b.type === reqType && b.hp > 0) {
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 3;
          ctx.strokeRect(b.col * cs + 2, b.row * cs + 2, cs - 4, cs - 4);
          ctx.fillStyle = 'rgba(255,215,0,0.15)';
          ctx.fillRect(b.col * cs, b.row * cs, cs, cs);
        }
      });
    }
  }

  if (!game) return;

  const fontSize = Math.floor(cs * 0.6);
  ctx.font = `${fontSize}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  for (let p = 0; p < game.numPlayers; p++) {
    game.players[p].buildings.forEach(b => {
      if (b.hp <= 0) return;
      ctx.fillText(BUILDINGS[b.type].emoji, b.col * cs + cs / 2, b.row * cs + cs / 2);
      drawHpBar(b.col * cs, b.row * cs + cs - 6, cs, 4, b.hp, b.maxHp, p);
    });
    game.players[p].units.forEach(u => {
      if (u.hp <= 0) return;
      ctx.fillText(UNITS[u.type].emoji, u.col * cs + cs / 2, u.row * cs + cs / 2);
      drawHpBar(u.col * cs, u.row * cs + cs - 6, cs, 4, u.hp, u.maxHp, p);
      ctx.fillStyle = PLAYER_COLORS[p] ? PLAYER_COLORS[p].color : '#888';
      ctx.beginPath(); ctx.arc(u.col * cs + 6, u.row * cs + 6, 3, 0, Math.PI * 2); ctx.fill();
    });
  }

  for (let i = game.effects.length - 1; i >= 0; i--) {
    const e = game.effects[i];
    ctx.globalAlpha = e.ttl / 15; ctx.font = `${Math.floor(cs * 0.4)}px serif`;
    ctx.fillText(e.emoji, e.col * cs + cs / 2, e.row * cs + cs * 0.3); ctx.globalAlpha = 1;
    if (--e.ttl <= 0) game.effects.splice(i, 1);
  }
}

function drawHpBar(x, y, w, h, hp, maxHp, pi) {
  const pct = Math.max(0, hp / maxHp), barW = w * 0.8, barX = x + (w - barW) / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(barX, y, barW, h);
  ctx.fillStyle = pct > 0.5 ? '#4f4' : pct > 0.25 ? '#ff4' : '#f44'; ctx.fillRect(barX, y, barW * pct, h);
  const pc = PLAYER_COLORS[pi];
  ctx.strokeStyle = pc ? pc.color + '80' : 'rgba(128,128,128,0.5)'; ctx.lineWidth = 0.5; ctx.strokeRect(barX, y, barW, h);
}

function render() { drawGrid(); tickGame(); updateHUD(); animFrameId = requestAnimationFrame(render); }
function startRenderLoop() { if (animFrameId) cancelAnimationFrame(animFrameId); render(); }

// ============================================================
// UI
// ============================================================

function updateHUD() {
  if (!game) return;
  document.getElementById('p1-gold').textContent = game.players[0].gold;
  document.getElementById('p1-income').textContent = game.players[0].income;
  document.getElementById('p2-gold').textContent = game.players[1].gold;
  document.getElementById('p2-income').textContent = game.players[1].income;

  // Extra player HUDs
  const p3hud = document.getElementById('p3-hud');
  const p4hud = document.getElementById('p4-hud');
  if (p3hud && game.numPlayers >= 3) {
    document.getElementById('p3-gold').textContent = game.players[2].gold;
    document.getElementById('p3-income').textContent = game.players[2].income;
    document.getElementById('p3-label').textContent = game.players[2].alive ? '🟢 Bot 2' : '🟢 Dead';
  }
  if (p4hud && game.numPlayers >= 4) {
    document.getElementById('p4-gold').textContent = game.players[3].gold;
    document.getElementById('p4-income').textContent = game.players[3].income;
    document.getElementById('p4-label').textContent = game.players[3].alive ? '🟡 Bot 3' : '🟡 Dead';
  }

  if (game.mode === 'pvp') {
    document.getElementById('turn-num').textContent = game.turn;
    const cp = game.currentPlayer;
    document.getElementById('current-player').textContent = `${PLAYER_COLORS[cp].name} Player ${cp + 1}'s Turn`;
  } else {
    const elapsed = Math.floor(gameTime());
    document.getElementById('game-timer').textContent = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
    document.getElementById('next-income').textContent = Math.max(0, Math.ceil(INCOME_INTERVAL - (gameTime() - game.lastIncome)));
  }

  const p1Name = game.players[0].username || 'Player 1';
  const p2Name = game.players[1].username || 'Player 2';
  if (game.mode === 'bot' || game.mode === 'tutorial') {
    document.getElementById('p1-label').textContent = `🔵 ${game.players[0].username || 'You'}`;
    document.getElementById('p2-label').textContent = game.players[1].alive ? '🔴 Bot 1' : '🔴 Dead';
  } else if (game.mode === 'online') {
    document.getElementById('p1-label').innerHTML = net.myIndex === 0 ? `🔵 ${p1Name} <span class="you-tag">YOU</span>` : `🔵 ${p1Name}`;
    document.getElementById('p2-label').innerHTML = net.myIndex === 1 ? `🔴 ${p2Name} <span class="you-tag">YOU</span>` : `🔴 ${p2Name}`;
  } else {
    document.getElementById('p1-label').textContent = `🔵 ${p1Name}`;
    document.getElementById('p2-label').textContent = `🔴 ${p2Name}`;
  }

  // Update diplomacy panel
  updateDiplomacyPanel();
  updateLog();
}

function updateDiplomacyPanel() {
  const panel = document.getElementById('diplomacy-panel');
  if (!panel || !game || game.numPlayers < 3) return;
  panel.classList.remove('hidden');
  const pi = myPlayerIndex();
  if (pi === null) return;

  const content = document.getElementById('diplomacy-content');
  if (!content) return;
  content.innerHTML = '';

  // Attack target selector
  const targetHeader = document.createElement('div');
  targetHeader.className = 'diplo-row';
  targetHeader.innerHTML = '<span><strong>Attack Target:</strong></span>';
  content.appendChild(targetHeader);

  for (let i = 0; i < game.numPlayers; i++) {
    if (i === pi || !game.players[i].alive) continue;
    const isTarget = game.players[pi].attackTarget === i;
    const status = areAllied(pi, i) ? 'Allied' : 'Enemy';
    const color = PLAYER_COLORS[i].name;
    const pName = game.players[i].username || `Player ${i + 1}`;
    const row = document.createElement('div');
    row.className = 'diplo-row';
    row.innerHTML = `<span>${color} ${pName}: <strong>${status}</strong>${isTarget ? ' 🎯' : ''}</span>`;

    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = '0.3rem';

    // Attack button
    if (isEnemy(pi, i)) {
      const atkBtn = document.createElement('button');
      atkBtn.className = 'btn btn-small';
      atkBtn.textContent = isTarget ? '🎯 Target' : 'Attack';
      atkBtn.style.background = isTarget ? '#c44' : '#666';
      atkBtn.addEventListener('click', () => { game.players[pi].attackTarget = i; addLog(`${pLabel(pi)} targeting ${pLabel(i)}! 🎯`); });
      btnGroup.appendChild(atkBtn);
    }

    // Diplomacy button
    if (!areAllied(pi, i)) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-small';
      btn.textContent = 'Ally';
      btn.style.background = '#3a3';
      btn.addEventListener('click', () => offerAlliance(pi, i));
      btnGroup.appendChild(btn);
    } else {
      const btn = document.createElement('button');
      btn.className = 'btn btn-small';
      btn.textContent = 'Break';
      btn.style.background = '#a33';
      btn.addEventListener('click', () => breakAlliance(pi, i));
      btnGroup.appendChild(btn);
    }
    row.appendChild(btnGroup);
    content.appendChild(row);
  }
}

function offerAlliance(from, to) {
  if (!game) return;
  // In bot mode, bots decide randomly whether to accept
  if (game.mode === 'bot' && to !== 0) {
    const accept = Math.random() < 0.5;
    if (accept) {
      game.players[from].alliances[to] = 'ally';
      game.players[to].alliances[from] = 'ally';
      addLog(`${pLabel(from)} & ${pLabel(to)} formed an alliance! 🤝`);
    } else {
      addLog(`${pLabel(to)} rejected the alliance offer!`);
    }
  } else {
    game.players[from].alliances[to] = 'ally';
    // In PvP the other player needs to accept too
    if (game.players[to].alliances[from] === 'ally') {
      addLog(`${pLabel(from)} & ${pLabel(to)} formed an alliance! 🤝`);
    } else {
      addLog(`${pLabel(from)} offered alliance to ${pLabel(to)}...`);
    }
  }
}

function breakAlliance(from, to) {
  if (!game) return;
  game.players[from].alliances[to] = null;
  game.players[to].alliances[from] = null;
  addLog(`${pLabel(from)} broke their alliance with ${pLabel(to)}! ⚔️`);
}

function updateLog() {
  const el = document.getElementById('log-entries');
  if (game) el.innerHTML = game.log.slice(0, 4).map(l => `<span class="log-entry">${l}</span>`).join('');
}

function myPlayerIndex() {
  if (game.mode === 'online') return net.myIndex;
  if (game.mode === 'bot' || game.mode === 'tutorial') return 0;
  if (game.mode === 'pvp') return game.currentPlayer;
  return null;
}

function buildShop() {
  const container = document.getElementById('shop-items');
  container.innerHTML = '';
  const pi = myPlayerIndex();
  const showFor = pi !== null ? [pi] : [0, 1];

  for (const playerIdx of showFor) {
    const player = game.players[playerIdx];
    if (showFor.length > 1) {
      const label = document.createElement('div');
      label.style.cssText = 'font-size:0.75rem;color:#aaa;align-self:center;padding:0 0.3rem;white-space:nowrap;';
      label.textContent = playerIdx === 0 ? '🔵' : '🔴';
      container.appendChild(label);
    }

    for (const [key, def] of Object.entries(BUILDINGS)) {
      if (key === 'castle') continue;
      const canAfford = player.gold >= def.cost;
      const el = document.createElement('div');
      el.className = 'shop-item' + (!canAfford ? ' disabled' : '');
      el.innerHTML = `<span class="shop-emoji">${def.emoji}</span><span class="shop-name">${def.name}</span><span class="shop-cost">💰 ${def.cost}</span>`;
      if (canAfford) el.addEventListener('click', () => selectShopItem('shop_building', key, playerIdx));
      container.appendChild(el);
    }

    const sep = document.createElement('div');
    sep.style.cssText = 'width:2px;background:rgba(255,255,255,0.15);align-self:stretch;margin:0 0.3rem;';
    container.appendChild(sep);

    for (const [key, def] of Object.entries(UNITS)) {
      const canAfford = player.gold >= def.cost;
      const canTrain = canTrainUnit(playerIdx, key);
      const disabled = !canAfford || !canTrain;
      const reqEmoji = def.requires ? BUILDINGS[def.requires].emoji : '⚔️';
      const el = document.createElement('div');
      el.className = 'shop-item' + (disabled ? ' disabled' : '');
      el.innerHTML = `<span class="shop-emoji">${def.emoji}</span><span class="shop-name">${def.name}${!canTrain ? ' (' + reqEmoji + ')' : ''}</span><span class="shop-cost">💰 ${def.cost}</span>`;
      if (!disabled) el.addEventListener('click', () => selectShopItem('shop_unit', key, playerIdx));
      container.appendChild(el);
    }

    if (showFor.length > 1 && playerIdx === 0) {
      const div = document.createElement('div');
      div.style.cssText = 'width:3px;background:rgba(255,215,0,0.3);align-self:stretch;margin:0 0.5rem;';
      container.appendChild(div);
    }
  }
}

function selectShopItem(kind, type, playerIdx) {
  if (game.selected && game.selected.kind === kind && game.selected.type === type && game.selected.forPlayer === playerIdx) {
    game.selected = null; updateSelectedInfo(); return;
  }
  game.selected = { kind, type, forPlayer: playerIdx };
  updateSelectedInfo();
  // For units, player must now click a barracks on the grid to spawn
}

function updateSelectedInfo() {
  const info = document.getElementById('selected-info');
  if (!game || !game.selected) { info.classList.add('hidden'); return; }
  info.classList.remove('hidden');
  if (game.selected.kind === 'shop_building') {
    const def = BUILDINGS[game.selected.type];
    document.getElementById('selected-name').textContent = `${def.emoji} ${def.name}`;
    document.getElementById('selected-desc').textContent = def.desc + ' — Click your territory to place.';
  } else if (game.selected.kind === 'shop_unit') {
    const def = UNITS[game.selected.type];
    const reqType = def.requires || 'barracks';
    const reqDef = BUILDINGS[reqType];
    document.getElementById('selected-name').textContent = `${def.emoji} ${def.name}`;
    document.getElementById('selected-desc').textContent = def.desc + ` — Click a ${reqDef.emoji} ${reqDef.name} to train here.`;
  }
}

// ============================================================
// INPUT
// ============================================================

let lastTapTime = 0;
function handleCanvasTap(e) {
  // Prevent double-fire from touch + click
  const now = Date.now();
  if (e.type === 'click' && now - lastTapTime < 400) return;
  if (e.type === 'touchstart') { lastTapTime = now; e.preventDefault(); }

  if (!game || game.phase !== 'play') return;
  let cx, cy;
  if (e.touches) {
    cx = e.touches[0].clientX; cy = e.touches[0].clientY;
  } else {
    cx = e.clientX; cy = e.clientY;
  }
  const rect = canvas.getBoundingClientRect(), cs = cellSize();
  const col = Math.floor((cx - rect.left) / cs), row = Math.floor((cy - rect.top) / cs);
  if (!inBounds(row, col)) return;

  // Placing a building
  if (game.selected && game.selected.kind === 'shop_building') {
    const pi = game.selected.forPlayer, player = game.players[pi];
    const type = game.selected.type, def = BUILDINGS[type];
    if (!playerTerritory(pi, col, row)) { addLog("Can't build on enemy territory!"); return; }
    if (cellOccupied(row, col)) { addLog(terrainBlocks(row, col) ? "Can't build on this terrain!" : 'Cell is occupied!'); return; }
    if (!canBuildAt(pi, row, col)) { addLog("Too far! Must build within 3 tiles of a building."); return; }
    if (player.gold < def.cost) { addLog('Not enough gold!'); return; }

    if (game.mode === 'online' && !net.isHost) {
      netSend({ type: 'action', action: { kind: 'build', type, row, col } });
    } else {
      placeBuilding(pi, type, row, col);
      player.gold -= def.cost;
      addLog(`${pLabel(pi)} Built ${def.emoji} ${def.name}`);
      if (game.mode === 'online') broadcastState();
    }
    game.selected = null; buildShop(); updateSelectedInfo();
    return;
  }

  // Training a unit — click on a required building to spawn there
  if (game.selected && game.selected.kind === 'shop_unit') {
    const pi = game.selected.forPlayer, player = game.players[pi];
    const unitType = game.selected.type, def = UNITS[unitType];
    const reqType = def.requires || 'barracks';
    const reqEmoji = BUILDINGS[reqType].emoji;
    const cell = game.grid[row][col];

    // Must click on one of your required buildings
    if (!cell || cell.player !== pi || cell.entityType !== 'building') {
      addLog(`Click one of your ${reqEmoji} ${BUILDINGS[reqType].name} to train there!`);
      return;
    }
    const building = player.buildings[cell.entityIdx];
    if (building.type !== reqType || building.hp <= 0) {
      addLog(`Click one of your ${reqEmoji} ${BUILDINGS[reqType].name} to train there!`);
      return;
    }
    if (player.gold < def.cost) { addLog('Not enough gold!'); return; }

    if (game.mode === 'online' && !net.isHost) {
      netSend({ type: 'action', action: { kind: 'train', type: unitType, barracksRow: row, barracksCol: col } });
    } else {
      const unit = spawnUnit(pi, unitType, building);
      if (unit) {
        player.gold -= def.cost;
        addLog(`${pLabel(pi)} Trained ${def.emoji} at barracks`);
        if (game.mode === 'online') broadcastState();
      } else {
        addLog('No space around that barracks!');
      }
    }
    game.selected = null; buildShop(); updateSelectedInfo();
    return;
  }

  // Info click
  const infoCell = game.grid[row][col];
  if (infoCell && infoCell.entityType === 'unit') {
    const u = game.players[infoCell.player].units[infoCell.entityIdx], def = UNITS[u.type];
    addLog(`${def.emoji} ${def.name} — HP: ${u.hp}/${u.maxHp}, ATK: ${u.attack}`);
  } else if (infoCell && infoCell.entityType === 'building') {
    const b = game.players[infoCell.player].buildings[infoCell.entityIdx], def = BUILDINGS[b.type];
    addLog(`${def.emoji} ${def.name} — HP: ${b.hp}/${b.maxHp}`);
  }
}

// Use both click and touchstart for maximum compatibility
canvas.addEventListener('click', handleCanvasTap);
canvas.addEventListener('touchstart', handleCanvasTap, { passive: false });

document.getElementById('end-turn-btn').addEventListener('click', pvpEndTurn);
document.getElementById('cancel-btn').addEventListener('click', () => {
  if (game) { game.selected = null; updateSelectedInfo(); }
});

// ============================================================
// SCREENS
// ============================================================

function showWinScreen() {
  document.getElementById('game-screen').classList.add('hidden');
  document.getElementById('win-screen').classList.remove('hidden');
  document.getElementById('tutorial-overlay').classList.add('hidden');
  stopBroadcasting();
  const w = game.winner;
  let msg;
  if (game.mode === 'bot' || game.mode === 'tutorial') msg = w === 0 ? '🎉 You Win!' : `🤖 ${pLabel(w)} Bot Wins!`;
  else if (game.mode === 'online') msg = w === net.myIndex ? '🎉 You Win!' : '😔 You Lost!';
  else msg = `${PLAYER_COLORS[w].name} Player ${w + 1} Wins! 🎉`;
  document.getElementById('win-message').textContent = msg;
}

function startNewGame(mode, difficulty, numPlayers) {
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('lobby-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  initGame(mode, difficulty || 'medium', numPlayers || 2);

  // Set username for player 0
  const usernameEl = document.getElementById('bot-username-input') || document.getElementById('username-input');
  const username = usernameEl ? usernameEl.value.trim() : '';
  if (username) game.players[0].username = username;

  resizeCanvas(); buildShop();
  if (!animFrameId) startRenderLoop();
}

function backToTitle() {
  cleanupNet();
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  tutorial.active = false;
  document.getElementById('tutorial-overlay').classList.add('hidden');
  game = null;
  document.getElementById('win-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.add('hidden');
  document.getElementById('lobby-screen').classList.add('hidden');
  document.getElementById('title-screen').classList.remove('hidden');
  document.getElementById('difficulty-select').classList.add('hidden');
}

// --- Event Listeners ---
document.getElementById('start-bot-btn').addEventListener('click', () => document.getElementById('difficulty-select').classList.remove('hidden'));
document.getElementById('start-pvp-btn').addEventListener('click', () => startNewGame('pvp'));
document.getElementById('start-online-btn').addEventListener('click', () => {
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('lobby-screen').classList.remove('hidden');
  document.getElementById('lobby-choices').classList.remove('hidden');
  document.getElementById('host-waiting').classList.add('hidden');
  document.getElementById('join-form').classList.add('hidden');
  document.getElementById('lobby-status').textContent = 'Choose an option';
  showLobbyError('');
});
let selectedPlayerCount = 2;
document.querySelectorAll('.pcount-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pcount-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedPlayerCount = parseInt(btn.dataset.count);
  });
});
document.querySelectorAll('.diff-btn').forEach(btn => { btn.addEventListener('click', () => startNewGame('bot', btn.dataset.diff, selectedPlayerCount)); });
document.getElementById('host-btn').addEventListener('click', hostGame);
document.getElementById('join-btn').addEventListener('click', () => {
  document.getElementById('lobby-choices').classList.add('hidden');
  document.getElementById('join-form').classList.remove('hidden');
  document.getElementById('lobby-status').textContent = 'Join a room';
  document.getElementById('join-code-input').focus();
});
document.getElementById('join-connect-btn').addEventListener('click', () => {
  const code = document.getElementById('join-code-input').value.trim();
  if (!code || code.length < 3) { showLobbyError('Enter a valid room code.'); return; }
  joinGame(code);
});
document.getElementById('join-code-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('join-connect-btn').click(); });
document.getElementById('copy-code-btn').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('room-code-text').textContent).then(() => {
    const btn = document.getElementById('copy-code-btn'); btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 2000);
  });
});
document.getElementById('lobby-back-btn').addEventListener('click', () => { cleanupNet(); backToTitle(); });
document.getElementById('restart-btn').addEventListener('click', backToTitle);
window.addEventListener('resize', () => { if (game) resizeCanvas(); });
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && game && game.mode === 'pvp' && game.phase === 'play') {
    if (document.activeElement?.tagName === 'INPUT') return;
    e.preventDefault();
    pvpEndTurn();
  }
  if (e.key === 'Escape' && game) { game.selected = null; updateSelectedInfo(); }
});

// ============================================================
// TUTORIAL
// ============================================================

const TUTORIAL_STEPS = [
  { title: 'Welcome to Emoji Battle!', text: 'This tutorial will teach you how to build a base, train an army, and crush your enemy. Everything happens in <strong>real-time</strong> — no waiting for turns!', highlight: null, allowClick: false },
  { title: 'The Battlefield', text: 'The grid is split in two. Your territory is the <strong>blue left side</strong>. The enemy is on the <strong>red right side</strong>. The dashed line is the border — your soldiers can cross it!', highlight: '#game-canvas', allowClick: false },
  { title: 'Your Castle 🏰', text: 'You start with a Castle on your side. If the enemy destroys it, <strong>you lose!</strong> Protect it at all costs.', highlight: '#game-canvas', allowClick: false },
  { title: 'Gold & Income 💰', text: 'You start with <strong>100 gold</strong>. Every <strong>8 seconds</strong>, you earn income from your buildings. Check your gold and income in the top-left HUD.', highlight: '#p1-hud', allowClick: false },
  { title: 'The Shop 🛒', text: 'The shop at the bottom has <strong>buildings</strong> (left) and <strong>soldiers</strong> (right). Click an item to buy it. Greyed-out items cost more than you can afford.', highlight: '#shop-panel', allowClick: false },
  { title: 'Step 1: Build a House 🏠', text: 'Houses give you <strong>+5 gold per income tick</strong>. Click the 🏠 House in the shop, then click an empty cell on <strong>your blue side</strong> to place it. Try it now!', highlight: '#shop-panel', allowClick: true, waitFor: 'build_house' },
  { title: 'Nice! More income!', text: 'Your income went up! More buildings = more gold. Farms 🌾 and Mines ⛏️ also generate income.', highlight: '#p1-hud', allowClick: false },
  { title: 'Step 2: Build Barracks ⚔️', text: 'You need <strong>Barracks</strong> before you can train soldiers. Click ⚔️ in the shop and place it on your side.', highlight: '#shop-panel', allowClick: true, waitFor: 'build_barracks' },
  { title: 'Step 3: Train a Soldier 🗡️', text: 'Now click 🗡️ Swordsman in the shop, then <strong>click your ⚔️ Barracks</strong> on the grid to spawn the soldier there. Try it now!', highlight: '#shop-panel', allowClick: true, waitFor: 'train_unit' },
  { title: 'Soldiers March Automatically!', text: 'Your soldiers march toward the enemy <strong>in real-time</strong>. They\'ll attack any enemy they get close to — units and buildings alike!', highlight: '#game-canvas', allowClick: false },
  { title: 'Defense: Walls & Towers', text: '🧱 <strong>Walls</strong> block enemies with high HP. 🗼 <strong>Towers</strong> automatically shoot enemies within 2 tiles. Use them to protect your Castle!', highlight: '#shop-panel', allowClick: false },
  { title: 'Unit Types', text: '🗡️ <strong>Swordsman</strong> — cheap melee<br>🏹 <strong>Archer</strong> — ranged<br>🐴 <strong>Cavalry</strong> — fast (needs Stable)<br>🛡️ <strong>Knight</strong> — tanky<br>🧙 <strong>Wizard</strong> — high damage<br>🥷 <strong>Assassin</strong> — deadly & fast<br>🪓 <strong>Berserker</strong> — raging fighter<br>💣 <strong>Catapult</strong> — siege (needs Workshop)<br>🐉 <strong>Dragon</strong> — flies over terrain!', highlight: null, allowClick: false },
  { title: 'How to Win 🏆', text: 'Destroy the enemy\'s 🏰 <strong>Castle</strong>! Build economy early, train a big army, and overwhelm your opponent. The game never pauses — act fast! Good luck!', highlight: null, allowClick: false },
];

let tutorial = { active: false, step: 0, onAction: null };

function startTutorial() {
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  initGame('tutorial', 'easy');
  resizeCanvas(); buildShop();
  if (!animFrameId) startRenderLoop();
  tutorial.active = true; tutorial.step = 0; tutorial.onAction = null;
  showTutorialStep();
}

function showTutorialStep() {
  const overlay = document.getElementById('tutorial-overlay');
  overlay.classList.remove('hidden');
  const step = TUTORIAL_STEPS[tutorial.step];
  document.getElementById('tutorial-step-num').textContent = `Step ${tutorial.step + 1} of ${TUTORIAL_STEPS.length}`;
  document.getElementById('tutorial-title').textContent = step.title;
  document.getElementById('tutorial-text').innerHTML = step.text;
  document.getElementById('tutorial-prev').style.display = tutorial.step > 0 ? '' : 'none';
  const nextBtn = document.getElementById('tutorial-next');
  if (step.waitFor) { nextBtn.style.display = 'none'; }
  else { nextBtn.style.display = ''; nextBtn.textContent = tutorial.step === TUTORIAL_STEPS.length - 1 ? 'Start Playing!' : 'Next'; }

  const hl = document.getElementById('tutorial-highlight');
  if (step.highlight) {
    const target = document.querySelector(step.highlight);
    if (target) {
      const rect = target.getBoundingClientRect();
      hl.style.top = (rect.top - 4) + 'px'; hl.style.left = (rect.left - 4) + 'px';
      hl.style.width = (rect.width + 8) + 'px'; hl.style.height = (rect.height + 8) + 'px';
      hl.classList.add('visible');
    } else hl.classList.remove('visible');
  } else hl.classList.remove('visible');

  overlay.classList.toggle('allow-click', !!step.allowClick);
  tutorial.onAction = step.waitFor || null;
}

function tutorialNext() {
  if (tutorial.step < TUTORIAL_STEPS.length - 1) { tutorial.step++; showTutorialStep(); }
  else endTutorial();
}

function tutorialPrev() { if (tutorial.step > 0) { tutorial.step--; showTutorialStep(); } }

function endTutorial() {
  tutorial.active = false; tutorial.onAction = null;
  document.getElementById('tutorial-overlay').classList.add('hidden');
  game.mode = 'bot'; game.difficulty = 'easy';
  addLog('Tutorial complete! Now playing vs Easy Bot. Good luck!');
}

function tutorialAction(actionType) {
  if (!tutorial.active || tutorial.onAction !== actionType) return;
  tutorial.onAction = null;
  setTimeout(() => { if (tutorial.active) tutorialNext(); }, 600);
}

// Hook placeBuilding and spawnUnit for tutorial triggers
const _origPlaceBuilding = placeBuilding;
placeBuilding = function(pi, type, row, col) {
  const result = _origPlaceBuilding(pi, type, row, col);
  if (pi === 0 && type === 'house') tutorialAction('build_house');
  if (pi === 0 && type === 'barracks') tutorialAction('build_barracks');
  return result;
};

const _origSpawnUnit = spawnUnit;
spawnUnit = function(pi, type, building) {
  const result = _origSpawnUnit(pi, type, building);
  if (pi === 0 && result) tutorialAction('train_unit');
  return result;
};

document.getElementById('start-tutorial-btn').addEventListener('click', startTutorial);
document.getElementById('tutorial-next').addEventListener('click', tutorialNext);
document.getElementById('tutorial-prev').addEventListener('click', tutorialPrev);
document.getElementById('tutorial-skip').addEventListener('click', endTutorial);
