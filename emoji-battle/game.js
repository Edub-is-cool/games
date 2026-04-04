// ============================================================
// Emoji Battle — A 2-player turn-based strategy game
// ============================================================

// --- Constants ---
const GRID_COLS = 20;
const GRID_ROWS = 10;
const CELL_PX = 56;
const DIVIDER_COL = GRID_COLS / 2; // column 10 is the border

// --- Building / Unit Definitions ---
const BUILDINGS = {
  castle:   { emoji: '🏰', name: 'Castle',   cost: 0,  hp: 50, income: 0,  desc: 'Your HQ — lose it and you lose!', limit: 1 },
  house:    { emoji: '🏠', name: 'House',     cost: 30, hp: 10, income: 5,  desc: '+5 💰 per turn', limit: 5 },
  wall:     { emoji: '🧱', name: 'Wall',      cost: 15, hp: 25, income: 0,  desc: 'Blocks enemies', limit: 12 },
  tower:    { emoji: '🗼', name: 'Tower',     cost: 50, hp: 15, income: 0,  desc: 'Shoots nearby enemies (2 dmg)', limit: 4, range: 2, attack: 2 },
  barracks: { emoji: '⚔️',  name: 'Barracks',  cost: 40, hp: 15, income: 0,  desc: 'Required to train soldiers', limit: 3 },
  farm:     { emoji: '🌾', name: 'Farm',      cost: 25, hp: 8,  income: 3,  desc: '+3 💰 per turn', limit: 6 },
  mine:     { emoji: '⛏️',  name: 'Mine',      cost: 60, hp: 10, income: 10, desc: '+10 💰 per turn', limit: 2 },
};

const UNITS = {
  swordsman: { emoji: '🗡️', name: 'Swordsman', cost: 20, hp: 8,  attack: 3, speed: 1, desc: 'Basic melee fighter' },
  archer:    { emoji: '🏹', name: 'Archer',    cost: 30, hp: 5,  attack: 2, speed: 1, desc: 'Ranged (2 tiles)', range: 2 },
  cavalry:   { emoji: '🐴', name: 'Cavalry',   cost: 45, hp: 10, attack: 4, speed: 2, desc: 'Fast & strong' },
  knight:    { emoji: '🛡️', name: 'Knight',    cost: 55, hp: 18, attack: 2, speed: 1, desc: 'Tanky defender' },
  wizard:    { emoji: '🧙', name: 'Wizard',    cost: 70, hp: 6,  attack: 6, speed: 1, desc: 'High damage caster', range: 3 },
};

// --- Game State ---
let game = null;

function createPlayer(id) {
  return {
    id,
    gold: 100,
    income: 5,
    buildings: [],  // { type, row, col, hp, maxHp }
    units: [],      // { type, row, col, hp, maxHp, attack, speed, moved, attacked, range }
  };
}

function initGame() {
  game = {
    players: [createPlayer(1), createPlayer(2)],
    currentPlayer: 0,  // index into players
    turn: 1,
    phase: 'play',     // 'play' | 'animating' | 'over'
    selected: null,    // { kind: 'shop_building'|'shop_unit', type } or { kind: 'unit', unitIdx }
    grid: [],          // 2D array [row][col] = null | { player, entityType, entityIdx }
    effects: [],       // visual effects: { emoji, row, col, ttl }
    log: [],
  };

  // Init empty grid
  for (let r = 0; r < GRID_ROWS; r++) {
    game.grid[r] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      game.grid[r][c] = null;
    }
  }

  // Place castles
  placeBuilding(0, 'castle', Math.floor(GRID_ROWS / 2), 1);
  placeBuilding(1, 'castle', Math.floor(GRID_ROWS / 2), GRID_COLS - 2);

  game.log = ['Game started! Player 1 goes first.'];
}

// --- Grid helpers ---
function inBounds(r, c) {
  return r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS;
}

function playerTerritory(playerIdx, col) {
  return playerIdx === 0 ? col < DIVIDER_COL : col >= DIVIDER_COL;
}

function cellOccupied(r, c) {
  return game.grid[r][c] !== null;
}

function rebuildGrid() {
  // Clear
  for (let r = 0; r < GRID_ROWS; r++)
    for (let c = 0; c < GRID_COLS; c++)
      game.grid[r][c] = null;

  // Place buildings
  for (let p = 0; p < 2; p++) {
    game.players[p].buildings.forEach((b, i) => {
      if (b.hp > 0) {
        game.grid[b.row][b.col] = { player: p, entityType: 'building', entityIdx: i };
      }
    });
    game.players[p].units.forEach((u, i) => {
      if (u.hp > 0) {
        game.grid[u.row][u.col] = { player: p, entityType: 'unit', entityIdx: i };
      }
    });
  }
}

// --- Building Placement ---
function placeBuilding(playerIdx, type, row, col) {
  const def = BUILDINGS[type];
  const b = { type, row, col, hp: def.hp, maxHp: def.hp };
  game.players[playerIdx].buildings.push(b);
  game.grid[row][col] = { player: playerIdx, entityType: 'building', entityIdx: game.players[playerIdx].buildings.length - 1 };
  if (def.income > 0) {
    game.players[playerIdx].income += def.income;
  }
  return b;
}

function countBuildings(playerIdx, type) {
  return game.players[playerIdx].buildings.filter(b => b.type === type && b.hp > 0).length;
}

function hasBarracks(playerIdx) {
  return countBuildings(playerIdx, 'barracks') > 0;
}

// --- Unit Spawning ---
function spawnUnit(playerIdx, type) {
  const def = UNITS[type];
  // Find an open cell near the castle
  const castle = game.players[playerIdx].buildings.find(b => b.type === 'castle' && b.hp > 0);
  if (!castle) return null;

  // Search adjacent cells
  const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
  for (const [dr, dc] of dirs) {
    const nr = castle.row + dr;
    const nc = castle.col + dc;
    if (inBounds(nr, nc) && !cellOccupied(nr, nc) && playerTerritory(playerIdx, nc)) {
      const u = {
        type, row: nr, col: nc,
        hp: def.hp, maxHp: def.hp,
        attack: def.attack, speed: def.speed,
        range: def.range || 1,
        moved: true, attacked: true, // can't act on spawn turn
      };
      game.players[playerIdx].units.push(u);
      rebuildGrid();
      return u;
    }
  }
  return null;
}

// --- Combat ---
function dist(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

function towerAttackPhase(playerIdx) {
  const player = game.players[playerIdx];
  const enemy = game.players[1 - playerIdx];
  player.buildings.forEach(b => {
    if (b.hp <= 0) return;
    const def = BUILDINGS[b.type];
    if (!def.attack) return;
    // Find closest enemy unit in range
    let closest = null, closestDist = Infinity;
    enemy.units.forEach(u => {
      if (u.hp <= 0) return;
      const d = dist(b.row, b.col, u.row, u.col);
      if (d <= def.range && d < closestDist) {
        closest = u;
        closestDist = d;
      }
    });
    if (closest) {
      closest.hp -= def.attack;
      addEffect('💥', closest.row, closest.col);
      if (closest.hp <= 0) {
        addLog(`${player.id === 1 ? '🔵' : '🔴'} Tower destroyed ${UNITS[closest.type].emoji}!`);
      }
    }
  });
}

function moveUnits(playerIdx) {
  const player = game.players[playerIdx];
  const dir = playerIdx === 0 ? 1 : -1; // P1 moves right, P2 moves left

  // Sort units by column (leading units move first)
  const sortedIndices = player.units
    .map((u, i) => i)
    .filter(i => player.units[i].hp > 0 && !player.units[i].moved)
    .sort((a, b) => (player.units[b].col - player.units[a].col) * dir);

  for (const idx of sortedIndices) {
    const u = player.units[idx];
    if (u.hp <= 0 || u.moved) continue;

    for (let step = 0; step < u.speed; step++) {
      const nc = u.col + dir;

      // Try to move forward
      if (inBounds(u.row, nc) && !cellOccupied(u.row, nc)) {
        u.col = nc;
        rebuildGrid();
      } else {
        // Try diagonal movement
        const diagDirs = [-1, 1];
        let moved = false;
        for (const dr of diagDirs) {
          const nr = u.row + dr;
          if (inBounds(nr, nc) && !cellOccupied(nr, nc)) {
            u.row = nr;
            u.col = nc;
            rebuildGrid();
            moved = true;
            break;
          }
        }
        if (!moved) break; // blocked
      }
    }
    u.moved = true;
  }
}

function unitAttackPhase(playerIdx) {
  const player = game.players[playerIdx];
  const enemy = game.players[1 - playerIdx];

  for (const u of player.units) {
    if (u.hp <= 0 || u.attacked) continue;

    // Find target in range
    let target = null, targetType = null, targetDist = Infinity;

    // Check enemy units
    for (const eu of enemy.units) {
      if (eu.hp <= 0) continue;
      const d = dist(u.row, u.col, eu.row, eu.col);
      if (d <= u.range && d < targetDist) {
        target = eu; targetType = 'unit'; targetDist = d;
      }
    }

    // Check enemy buildings
    for (const eb of enemy.buildings) {
      if (eb.hp <= 0) continue;
      const d = dist(u.row, u.col, eb.row, eb.col);
      if (d <= u.range && d < targetDist) {
        target = eb; targetType = 'building'; targetDist = d;
      }
    }

    if (target) {
      target.hp -= u.attack;
      addEffect('💥', target.row, target.col);
      u.attacked = true;

      if (target.hp <= 0) {
        const emoji = targetType === 'unit' ? UNITS[target.type].emoji : BUILDINGS[target.type].emoji;
        addLog(`${player.id === 1 ? '🔵' : '🔴'} ${UNITS[u.type].emoji} destroyed ${emoji}!`);
        if (targetType === 'building' && target.type === 'castle') {
          game.phase = 'over';
          game.winner = playerIdx;
        }
        if (targetType === 'building') {
          const def = BUILDINGS[target.type];
          if (def.income > 0) {
            enemy.income -= def.income;
          }
        }
      }
    }
  }
}

// --- Effects ---
function addEffect(emoji, row, col) {
  game.effects.push({ emoji, row, col, ttl: 15 });
}

function addLog(msg) {
  game.log.unshift(msg);
  if (game.log.length > 10) game.log.pop();
}

// --- Turn Logic ---
function endTurn() {
  if (game.phase !== 'play') return;

  const pi = game.currentPlayer;
  const player = game.players[pi];

  // 1. Tower attack phase
  towerAttackPhase(pi);

  // 2. Move units
  moveUnits(pi);

  // 3. Unit attack phase
  unitAttackPhase(pi);

  // Clean up dead units/buildings
  cleanupDead();

  if (game.phase === 'over') {
    showWinScreen();
    return;
  }

  // Switch players
  game.currentPlayer = 1 - game.currentPlayer;
  const nextPlayer = game.players[game.currentPlayer];

  if (game.currentPlayer === 0) {
    game.turn++;
  }

  // Collect income
  nextPlayer.gold += nextPlayer.income;

  // Reset unit move/attack flags
  nextPlayer.units.forEach(u => {
    u.moved = false;
    u.attacked = false;
  });

  game.selected = null;

  addLog(`Turn ${game.turn}: Player ${nextPlayer.id}'s turn (+${nextPlayer.income} 💰)`);

  updateUI();
}

function cleanupDead() {
  for (let p = 0; p < 2; p++) {
    game.players[p].units = game.players[p].units.filter(u => u.hp > 0);
    // Don't remove buildings from array (preserve indices), just mark dead
  }
  rebuildGrid();
}

// ============================================================
// RENDERING
// ============================================================

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let animFrameId = null;

function resizeCanvas() {
  const wrapper = document.getElementById('grid-wrapper');
  const maxW = wrapper.clientWidth - 16;
  const maxH = wrapper.clientHeight - 16;
  const scaleX = maxW / (GRID_COLS * CELL_PX);
  const scaleY = maxH / (GRID_ROWS * CELL_PX);
  const scale = Math.min(scaleX, scaleY, 1);
  canvas.width = Math.floor(GRID_COLS * CELL_PX * scale);
  canvas.height = Math.floor(GRID_ROWS * CELL_PX * scale);
  canvas.style.width = canvas.width + 'px';
  canvas.style.height = canvas.height + 'px';
}

function cellSize() {
  return canvas.width / GRID_COLS;
}

function drawGrid() {
  const cs = cellSize();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw territory backgrounds
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const x = c * cs;
      const y = r * cs;

      // Checkerboard with territory tint
      const light = (r + c) % 2 === 0;
      if (c < DIVIDER_COL) {
        ctx.fillStyle = light ? 'rgba(30, 80, 200, 0.12)' : 'rgba(30, 80, 200, 0.06)';
      } else {
        ctx.fillStyle = light ? 'rgba(200, 40, 40, 0.12)' : 'rgba(200, 40, 40, 0.06)';
      }
      ctx.fillRect(x, y, cs, cs);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cs, cs);
    }
  }

  // Divider line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(DIVIDER_COL * cs, 0);
  ctx.lineTo(DIVIDER_COL * cs, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Highlight valid placement cells if something is selected from shop
  if (game.selected && (game.selected.kind === 'shop_building' || game.selected.kind === 'shop_unit')) {
    const pi = game.currentPlayer;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (playerTerritory(pi, c) && !cellOccupied(r, c)) {
          ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
          ctx.fillRect(c * cs, r * cs, cs, cs);
        }
      }
    }
  }

  // Draw entities
  const fontSize = Math.floor(cs * 0.6);
  ctx.font = `${fontSize}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let p = 0; p < 2; p++) {
    // Buildings
    game.players[p].buildings.forEach(b => {
      if (b.hp <= 0) return;
      const def = BUILDINGS[b.type];
      const x = b.col * cs + cs / 2;
      const y = b.row * cs + cs / 2;
      ctx.fillText(def.emoji, x, y);
      drawHpBar(b.col * cs, b.row * cs + cs - 6, cs, 4, b.hp, b.maxHp, p);
    });

    // Units
    game.players[p].units.forEach(u => {
      if (u.hp <= 0) return;
      const def = UNITS[u.type];
      const x = u.col * cs + cs / 2;
      const y = u.row * cs + cs / 2;
      ctx.fillText(def.emoji, x, y);
      drawHpBar(u.col * cs, u.row * cs + cs - 6, cs, 4, u.hp, u.maxHp, p);

      // Player dot indicator
      ctx.fillStyle = p === 0 ? '#4488ff' : '#ff4444';
      ctx.beginPath();
      ctx.arc(u.col * cs + 6, u.row * cs + 6, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Draw effects
  for (let i = game.effects.length - 1; i >= 0; i--) {
    const e = game.effects[i];
    const alpha = e.ttl / 15;
    ctx.globalAlpha = alpha;
    const effectSize = Math.floor(cs * 0.4);
    ctx.font = `${effectSize}px serif`;
    ctx.fillText(e.emoji, e.col * cs + cs / 2, e.row * cs + cs * 0.3);
    ctx.globalAlpha = 1;
    e.ttl--;
    if (e.ttl <= 0) game.effects.splice(i, 1);
  }
}

function drawHpBar(x, y, w, h, hp, maxHp, playerIdx) {
  const pct = Math.max(0, hp / maxHp);
  const barW = w * 0.8;
  const barX = x + (w - barW) / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(barX, y, barW, h);

  const color = pct > 0.5 ? '#4f4' : pct > 0.25 ? '#ff4' : '#f44';
  ctx.fillStyle = color;
  ctx.fillRect(barX, y, barW * pct, h);

  // Thin border colored by player
  ctx.strokeStyle = playerIdx === 0 ? 'rgba(30,100,255,0.5)' : 'rgba(255,50,50,0.5)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(barX, y, barW, h);
}

function gameLoop() {
  drawGrid();
  animFrameId = requestAnimationFrame(gameLoop);
}

// ============================================================
// UI
// ============================================================

function updateUI() {
  const p1 = game.players[0], p2 = game.players[1];

  document.getElementById('p1-gold').textContent = p1.gold;
  document.getElementById('p1-income').textContent = p1.income;
  document.getElementById('p2-gold').textContent = p2.gold;
  document.getElementById('p2-income').textContent = p2.income;
  document.getElementById('turn-num').textContent = game.turn;

  const cp = game.currentPlayer;
  const icon = cp === 0 ? '🔵' : '🔴';
  document.getElementById('current-player').textContent = `${icon} Player ${cp + 1}'s Turn`;

  // Active player HUD highlight
  document.getElementById('p1-hud').classList.toggle('active', cp === 0);
  document.getElementById('p2-hud').classList.toggle('active', cp === 1);

  buildShop();
  updateLog();
}

function buildShop() {
  const container = document.getElementById('shop-items');
  container.innerHTML = '';
  const pi = game.currentPlayer;
  const player = game.players[pi];

  // Buildings
  for (const [key, def] of Object.entries(BUILDINGS)) {
    if (key === 'castle') continue; // can't buy castles
    const count = countBuildings(pi, key);
    const canAfford = player.gold >= def.cost;
    const atLimit = count >= def.limit;
    const disabled = !canAfford || atLimit;

    const el = document.createElement('div');
    el.className = 'shop-item' + (disabled ? ' disabled' : '');
    el.innerHTML = `
      <span class="shop-emoji">${def.emoji}</span>
      <span class="shop-name">${def.name} (${count}/${def.limit})</span>
      <span class="shop-cost">💰 ${def.cost}</span>
    `;
    if (!disabled) {
      el.addEventListener('click', () => selectShopItem('shop_building', key));
    }
    container.appendChild(el);
  }

  // Divider
  const sep = document.createElement('div');
  sep.style.cssText = 'width:2px;background:rgba(255,255,255,0.15);align-self:stretch;margin:0 0.3rem;';
  container.appendChild(sep);

  // Units
  const canTrain = hasBarracks(pi);
  for (const [key, def] of Object.entries(UNITS)) {
    const canAfford = player.gold >= def.cost;
    const disabled = !canAfford || !canTrain;

    const el = document.createElement('div');
    el.className = 'shop-item' + (disabled ? ' disabled' : '');
    el.innerHTML = `
      <span class="shop-emoji">${def.emoji}</span>
      <span class="shop-name">${def.name}${!canTrain ? ' (need ⚔️)' : ''}</span>
      <span class="shop-cost">💰 ${def.cost}</span>
    `;
    if (!disabled) {
      el.addEventListener('click', () => selectShopItem('shop_unit', key));
    }
    container.appendChild(el);
  }
}

function selectShopItem(kind, type) {
  if (game.selected && game.selected.kind === kind && game.selected.type === type) {
    game.selected = null;
    updateSelectedInfo();
    // Deselect visual
    document.querySelectorAll('.shop-item').forEach(el => el.classList.remove('selected'));
    return;
  }

  game.selected = { kind, type };
  updateSelectedInfo();

  // Highlight shop item
  document.querySelectorAll('.shop-item').forEach(el => el.classList.remove('selected'));
  const items = document.querySelectorAll('.shop-item');
  const allKeys = [...Object.keys(BUILDINGS).filter(k => k !== 'castle'), ...Object.keys(UNITS)];
  const idx = allKeys.indexOf(type);
  if (idx >= 0 && items[idx]) items[idx].classList.add('selected');

  if (kind === 'shop_unit') {
    // Auto-spawn unit near castle
    const pi = game.currentPlayer;
    const player = game.players[pi];
    const def = UNITS[type];
    const unit = spawnUnit(pi, type);
    if (unit) {
      player.gold -= def.cost;
      addLog(`${pi === 0 ? '🔵' : '🔴'} Trained ${def.emoji} ${def.name}`);
      game.selected = null;
      updateUI();
    } else {
      addLog('No space near castle to spawn unit!');
      game.selected = null;
      updateUI();
    }
  }
}

function updateSelectedInfo() {
  const info = document.getElementById('selected-info');
  if (!game.selected || game.selected.kind === 'shop_unit') {
    info.classList.add('hidden');
    return;
  }
  info.classList.remove('hidden');
  const def = game.selected.kind === 'shop_building' ? BUILDINGS[game.selected.type] : UNITS[game.selected.type];
  document.getElementById('selected-name').textContent = `${def.emoji} ${def.name}`;
  document.getElementById('selected-desc').textContent = def.desc + ' — Click on your territory to place.';
}

function updateLog() {
  const el = document.getElementById('log-entries');
  el.innerHTML = game.log.slice(0, 3).map(l => `<span class="log-entry">${l}</span>`).join('');
}

// ============================================================
// INPUT
// ============================================================

canvas.addEventListener('click', (e) => {
  if (game.phase !== 'play') return;

  const rect = canvas.getBoundingClientRect();
  const cs = cellSize();
  const col = Math.floor((e.clientX - rect.left) / cs);
  const row = Math.floor((e.clientY - rect.top) / cs);
  if (!inBounds(row, col)) return;

  const pi = game.currentPlayer;
  const player = game.players[pi];

  // Placing a building
  if (game.selected && game.selected.kind === 'shop_building') {
    const type = game.selected.type;
    const def = BUILDINGS[type];

    if (!playerTerritory(pi, col)) {
      addLog("Can't build on enemy territory!");
      updateLog();
      return;
    }
    if (cellOccupied(row, col)) {
      addLog('Cell is occupied!');
      updateLog();
      return;
    }
    if (player.gold < def.cost) {
      addLog('Not enough gold!');
      updateLog();
      return;
    }
    if (countBuildings(pi, type) >= def.limit) {
      addLog(`${def.name} limit reached!`);
      updateLog();
      return;
    }

    placeBuilding(pi, type, row, col);
    player.gold -= def.cost;
    addLog(`${pi === 0 ? '🔵' : '🔴'} Built ${def.emoji} ${def.name}`);
    game.selected = null;
    updateUI();
    return;
  }

  // Clicking on own unit to select it (for info only for now)
  const cell = game.grid[row][col];
  if (cell && cell.player === pi && cell.entityType === 'unit') {
    const u = player.units[cell.entityIdx];
    const def = UNITS[u.type];
    addLog(`Selected ${def.emoji} ${def.name} — HP: ${u.hp}/${u.maxHp}, ATK: ${u.attack}`);
    updateLog();
  }
});

document.getElementById('end-turn-btn').addEventListener('click', endTurn);
document.getElementById('cancel-btn').addEventListener('click', () => {
  game.selected = null;
  updateSelectedInfo();
  document.querySelectorAll('.shop-item').forEach(el => el.classList.remove('selected'));
});

// ============================================================
// SCREENS
// ============================================================

function showWinScreen() {
  document.getElementById('game-screen').classList.add('hidden');
  document.getElementById('win-screen').classList.remove('hidden');
  const winner = game.winner;
  const icon = winner === 0 ? '🔵' : '🔴';
  document.getElementById('win-message').textContent = `${icon} Player ${winner + 1} Wins! 🎉`;
}

document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  initGame();
  resizeCanvas();
  updateUI();
  gameLoop();
});

document.getElementById('restart-btn').addEventListener('click', () => {
  document.getElementById('win-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  initGame();
  resizeCanvas();
  updateUI();
});

window.addEventListener('resize', () => {
  if (game) resizeCanvas();
});

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    if (game && game.phase === 'play') {
      endTurn();
    }
  }
  if (e.key === 'Escape') {
    if (game) {
      game.selected = null;
      updateSelectedInfo();
      document.querySelectorAll('.shop-item').forEach(el => el.classList.remove('selected'));
    }
  }
});
