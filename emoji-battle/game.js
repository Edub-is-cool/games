// ============================================================
// Emoji Battle — Real-time Strategy with Bot + Local + Online
// ============================================================

const GRID_COLS = 20;
const GRID_ROWS = 10;
const CELL_PX = 56;
const DIVIDER_COL = GRID_COLS / 2;

// Timing
const INCOME_INTERVAL = 10;    // seconds between gold ticks
const UNIT_MOVE_INTERVAL = 1.5; // seconds between unit steps
const UNIT_ATTACK_INTERVAL = 1; // seconds between attacks
const TOWER_ATTACK_INTERVAL = 1.5;
const BOT_ACTION_INTERVAL = 3;  // seconds between bot decisions

// --- Definitions ---
const BUILDINGS = {
  castle:   { emoji: '🏰', name: 'Castle',   cost: 0,  hp: 50, income: 0,  desc: 'Your HQ — lose it and you lose!' },
  house:    { emoji: '🏠', name: 'House',     cost: 30, hp: 10, income: 5,  desc: '+5 💰 per tick' },
  wall:     { emoji: '🧱', name: 'Wall',      cost: 15, hp: 25, income: 0,  desc: 'Blocks enemies' },
  tower:    { emoji: '🗼', name: 'Tower',     cost: 50, hp: 15, income: 0,  desc: 'Shoots nearby enemies (2 dmg)', range: 2, attack: 2 },
  barracks: { emoji: '⚔️',  name: 'Barracks',  cost: 40, hp: 15, income: 0,  desc: 'Required to train soldiers' },
  farm:     { emoji: '🌾', name: 'Farm',      cost: 25, hp: 8,  income: 3,  desc: '+3 💰 per tick' },
  mine:     { emoji: '⛏️',  name: 'Mine',      cost: 60, hp: 10, income: 10, desc: '+10 💰 per tick' },
};

const UNITS = {
  swordsman: { emoji: '🗡️', name: 'Swordsman', cost: 20, hp: 8,  attack: 3, speed: 1, desc: 'Basic melee fighter' },
  archer:    { emoji: '🏹', name: 'Archer',    cost: 30, hp: 5,  attack: 2, speed: 1, desc: 'Ranged (2 tiles)', range: 2 },
  cavalry:   { emoji: '🐴', name: 'Cavalry',   cost: 45, hp: 10, attack: 4, speed: 2, desc: 'Fast & strong' },
  knight:    { emoji: '🛡️', name: 'Knight',    cost: 55, hp: 18, attack: 2, speed: 1, desc: 'Tanky defender' },
  wizard:    { emoji: '🧙', name: 'Wizard',    cost: 70, hp: 6,  attack: 6, speed: 1, desc: 'High damage caster', range: 3 },
};

// --- State ---
let game = null;
let net = { peer: null, conn: null, isHost: false, myIndex: 0, roomCode: null };

function createPlayer(id) {
  return { id, gold: 100, income: 5, buildings: [], units: [] };
}

function initGame(mode, difficulty) {
  game = {
    mode,           // 'bot' | 'pvp' | 'online'
    difficulty,
    players: [createPlayer(1), createPlayer(2)],
    phase: 'play',
    selected: null,
    grid: [],
    effects: [],
    log: [],
    winner: null,
    // Real-time timers (in seconds, counting down)
    startTime: performance.now(),
    lastIncome: 0,       // last time income was given (game-seconds)
    lastUnitMove: 0,
    lastUnitAttack: 0,
    lastTowerAttack: 0,
    lastBotAction: 0,
  };

  for (let r = 0; r < GRID_ROWS; r++) {
    game.grid[r] = [];
    for (let c = 0; c < GRID_COLS; c++) game.grid[r][c] = null;
  }

  placeBuilding(0, 'castle', Math.floor(GRID_ROWS / 2), 1);
  placeBuilding(1, 'castle', Math.floor(GRID_ROWS / 2), GRID_COLS - 2);

  if (mode === 'bot') {
    game.log = ['Game started! Build fast — the bot is coming! 🤖'];
  } else if (mode === 'online') {
    game.log = [net.isHost ? 'Connected! You are 🔵 (left).' : 'Connected! You are 🔴 (right).'];
  } else {
    game.log = ['Game started! Both players go at the same time!'];
  }
}

// ============================================================
// GRID
// ============================================================

function inBounds(r, c) { return r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS; }
function playerTerritory(pi, col) { return pi === 0 ? col < DIVIDER_COL : col >= DIVIDER_COL; }
function cellOccupied(r, c) { return game.grid[r][c] !== null; }

function rebuildGrid() {
  for (let r = 0; r < GRID_ROWS; r++)
    for (let c = 0; c < GRID_COLS; c++)
      game.grid[r][c] = null;

  for (let p = 0; p < 2; p++) {
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

function spawnUnit(pi, type) {
  const def = UNITS[type];
  const castle = game.players[pi].buildings.find(b => b.type === 'castle' && b.hp > 0);
  if (!castle) return null;

  const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
  for (const [dr, dc] of dirs) {
    const nr = castle.row + dr, nc = castle.col + dc;
    if (inBounds(nr, nc) && !cellOccupied(nr, nc) && playerTerritory(pi, nc)) {
      const u = {
        type, row: nr, col: nc,
        hp: def.hp, maxHp: def.hp,
        attack: def.attack, speed: def.speed,
        range: def.range || 1,
      };
      game.players[pi].units.push(u);
      rebuildGrid();
      return u;
    }
  }
  return null;
}

// ============================================================
// REAL-TIME GAME LOOP LOGIC
// ============================================================

function gameTime() {
  return (performance.now() - game.startTime) / 1000;
}

function tickGame() {
  if (!game || game.phase !== 'play') return;

  const t = gameTime();

  // Income tick every INCOME_INTERVAL seconds
  if (t - game.lastIncome >= INCOME_INTERVAL) {
    game.lastIncome = t;
    for (let p = 0; p < 2; p++) {
      game.players[p].gold += game.players[p].income;
    }
    addLog(`💰 Income! +${game.players[0].income} / +${game.players[1].income}`);
    // Flash gold in UI
    document.getElementById('p1-gold')?.classList.add('gold-flash');
    document.getElementById('p2-gold')?.classList.add('gold-flash');
    setTimeout(() => {
      document.getElementById('p1-gold')?.classList.remove('gold-flash');
      document.getElementById('p2-gold')?.classList.remove('gold-flash');
    }, 400);
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
  }

  // Bot AI
  if (game.mode === 'bot' && t - game.lastBotAction >= BOT_ACTION_INTERVAL) {
    game.lastBotAction = t;
    botTick();
  }

  // Cleanup dead
  cleanupDead();

  // Online: host broadcasts state periodically (every 500ms via separate timer)
}

function moveAllUnits() {
  for (let p = 0; p < 2; p++) {
    const dir = p === 0 ? 1 : -1;
    // Sort so leading units move first
    const sorted = game.players[p].units
      .filter(u => u.hp > 0)
      .sort((a, b) => (b.col - a.col) * dir);

    for (const u of sorted) {
      // Check if there's an enemy adjacent — if so, don't move (stay and fight)
      if (hasAdjacentEnemy(u, p)) continue;

      for (let step = 0; step < u.speed; step++) {
        const nc = u.col + dir;
        if (inBounds(u.row, nc) && !cellOccupied(u.row, nc)) {
          u.col = nc;
          rebuildGrid();
        } else {
          for (const dr of [-1, 1]) {
            const nr = u.row + dr;
            if (inBounds(nr, nc) && !cellOccupied(nr, nc)) {
              u.row = nr;
              u.col = nc;
              rebuildGrid();
              break;
            }
          }
          break;
        }
      }
    }
  }
}

function hasAdjacentEnemy(u, playerIdx) {
  const enemy = 1 - playerIdx;
  for (const eu of game.players[enemy].units) {
    if (eu.hp > 0 && dist(u.row, u.col, eu.row, eu.col) <= 1) return true;
  }
  for (const eb of game.players[enemy].buildings) {
    if (eb.hp > 0 && dist(u.row, u.col, eb.row, eb.col) <= 1) return true;
  }
  return false;
}

function allUnitAttacks() {
  for (let p = 0; p < 2; p++) {
    const enemy = game.players[1 - p];
    for (const u of game.players[p].units) {
      if (u.hp <= 0) continue;
      const range = u.range || 1;

      let target = null, targetType = null, targetDist = Infinity;

      for (const eu of enemy.units) {
        if (eu.hp <= 0) continue;
        const d = dist(u.row, u.col, eu.row, eu.col);
        if (d <= range && d < targetDist) { target = eu; targetType = 'unit'; targetDist = d; }
      }
      for (const eb of enemy.buildings) {
        if (eb.hp <= 0) continue;
        const d = dist(u.row, u.col, eb.row, eb.col);
        if (d <= range && d < targetDist) { target = eb; targetType = 'building'; targetDist = d; }
      }

      if (target) {
        target.hp -= u.attack;
        addEffect('💥', target.row, target.col);
        if (target.hp <= 0) {
          const emoji = targetType === 'unit' ? UNITS[target.type].emoji : BUILDINGS[target.type].emoji;
          addLog(`${pLabel(p)} ${UNITS[u.type].emoji} destroyed ${emoji}!`);
          if (targetType === 'building' && target.type === 'castle') {
            game.phase = 'over';
            game.winner = p;
          }
          if (targetType === 'building') {
            const def = BUILDINGS[target.type];
            if (def.income > 0) game.players[1 - p].income -= def.income;
          }
        }
      }
    }
  }
}

function allTowerAttacks() {
  for (let p = 0; p < 2; p++) {
    const enemy = game.players[1 - p];
    for (const b of game.players[p].buildings) {
      if (b.hp <= 0) continue;
      const def = BUILDINGS[b.type];
      if (!def.attack) continue;
      let closest = null, cd = Infinity;
      for (const eu of enemy.units) {
        if (eu.hp <= 0) continue;
        const d = dist(b.row, b.col, eu.row, eu.col);
        if (d <= def.range && d < cd) { closest = eu; cd = d; }
      }
      if (closest) {
        closest.hp -= def.attack;
        addEffect('💥', closest.row, closest.col);
        if (closest.hp <= 0) addLog(`${pLabel(p)} Tower destroyed ${UNITS[closest.type].emoji}!`);
      }
    }
  }
}

function cleanupDead() {
  for (let p = 0; p < 2; p++) {
    game.players[p].units = game.players[p].units.filter(u => u.hp > 0);
  }
  rebuildGrid();

  if (game.phase === 'over') showWinScreen();
}

function dist(r1, c1, r2, c2) { return Math.abs(r1 - r2) + Math.abs(c1 - c2); }

function pLabel(idx) {
  if (game.mode === 'bot') return idx === 0 ? '🔵' : '���';
  return idx === 0 ? '🔵' : '🔴';
}

function addEffect(emoji, row, col) { game.effects.push({ emoji, row, col, ttl: 15 }); }

function addLog(msg) {
  game.log.unshift(msg);
  if (game.log.length > 10) game.log.pop();
}

// ============================================================
// BOT AI (real-time)
// ============================================================

function botTick() {
  const bot = game.players[1];
  const diff = game.difficulty;
  const aggression = diff === 'easy' ? 0.3 : diff === 'medium' ? 0.55 : 0.75;

  // Build phase
  if (!hasBarracks(1) && bot.gold >= 40) {
    botBuild('barracks');
  } else if (Math.random() < 0.5) {
    // Economy
    const econOrder = shuffle(['house', 'farm', 'mine', 'house', 'farm']);
    for (const type of econOrder) {
      if (bot.gold >= BUILDINGS[type].cost) { botBuild(type); break; }
    }
  } else {
    // Defense
    const defOrder = shuffle(['tower', 'wall', 'tower']);
    for (const type of defOrder) {
      if (bot.gold >= BUILDINGS[type].cost) { botBuild(type); break; }
    }
  }

  // Train units
  if (hasBarracks(1) && Math.random() < aggression) {
    const priority = getUnitPriority(diff);
    for (const type of priority) {
      if (bot.gold >= UNITS[type].cost) {
        const unit = spawnUnit(1, type);
        if (unit) {
          bot.gold -= UNITS[type].cost;
          addLog(`🤖 Trained ${UNITS[type].emoji}`);
        }
        break;
      }
    }
  }
}

function botBuild(type) {
  const bot = game.players[1];
  const def = BUILDINGS[type];
  if (bot.gold < def.cost) return;
  const cell = findBotBuildCell(type);
  if (cell) {
    placeBuilding(1, type, cell.row, cell.col);
    bot.gold -= def.cost;
    addLog(`🤖 Built ${def.emoji}`);
  }
}

function getUnitPriority(diff) {
  if (diff === 'easy') return shuffle(['swordsman', 'swordsman', 'archer']);
  if (diff === 'medium') return shuffle(['swordsman', 'archer', 'cavalry', 'knight']);
  const eu = game.players[0].units.filter(u => u.hp > 0).length;
  if (eu > 5) return ['knight', 'wizard', 'cavalry'];
  return ['cavalry', 'swordsman', 'wizard', 'archer', 'knight'];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function findBotBuildCell(type) {
  const castle = game.players[1].buildings.find(b => b.type === 'castle' && b.hp > 0);
  if (!castle) return null;
  const isDefense = type === 'wall' || type === 'tower';
  const candidates = [];

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = DIVIDER_COL; c < GRID_COLS; c++) {
      if (cellOccupied(r, c)) continue;
      const dc = dist(r, c, castle.row, castle.col);
      const df = c - DIVIDER_COL;
      let score;
      if (isDefense) {
        score = 100 - df * 10 + Math.random() * 5;
        if (type === 'wall' && df <= 2) score += 20;
        if (type === 'tower' && df >= 1 && df <= 3) score += 15;
      } else {
        score = 100 - dc * 5 + df * 3 + Math.random() * 5;
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

function netSend(data) {
  if (net.conn && net.conn.open) net.conn.send(JSON.stringify(data));
}

function getSerializableState() {
  return {
    players: game.players.map(p => ({
      id: p.id, gold: p.gold, income: p.income,
      buildings: p.buildings.map(b => ({ type: b.type, row: b.row, col: b.col, hp: b.hp, maxHp: b.maxHp })),
      units: p.units.map(u => ({
        type: u.type, row: u.row, col: u.col,
        hp: u.hp, maxHp: u.maxHp, attack: u.attack, speed: u.speed, range: u.range,
      })),
    })),
    phase: game.phase, winner: game.winner, log: game.log,
    lastIncome: game.lastIncome,
  };
}

function applyState(state) {
  game.players = state.players;
  game.phase = state.phase;
  game.winner = state.winner;
  game.log = state.log;
  game.lastIncome = state.lastIncome;
  game.selected = null;
  rebuildGrid();
  if (game.phase === 'over') showWinScreen();
}

function broadcastState() {
  netSend({ type: 'state', state: getSerializableState() });
}

let broadcastTimer = null;

function startBroadcasting() {
  if (broadcastTimer) clearInterval(broadcastTimer);
  broadcastTimer = setInterval(() => {
    if (game && game.phase === 'play' && net.isHost) broadcastState();
  }, 500);
}

function stopBroadcasting() {
  if (broadcastTimer) { clearInterval(broadcastTimer); broadcastTimer = null; }
}

function handleNetMessage(raw) {
  let data;
  try { data = JSON.parse(raw); } catch { return; }

  if (data.type === 'state' && !net.isHost) {
    applyState(data.state);
  }

  if (data.type === 'action' && net.isHost) {
    handleRemoteAction(data.action, 1);
  }

  if (data.type === 'start') {
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    initGame('online');
    resizeCanvas();
    updateUI();
    if (!animFrameId) startGameLoop();
  }

  if (data.type === 'disconnect') {
    addLog('Opponent disconnected!');
  }
}

function handleRemoteAction(action, fromPlayer) {
  if (game.phase !== 'play') return;
  const player = game.players[fromPlayer];

  if (action.kind === 'build') {
    const def = BUILDINGS[action.type];
    if (playerTerritory(fromPlayer, action.col) && !cellOccupied(action.row, action.col) && player.gold >= def.cost) {
      placeBuilding(fromPlayer, action.type, action.row, action.col);
      player.gold -= def.cost;
      addLog(`${pLabel(fromPlayer)} Built ${def.emoji} ${def.name}`);
    }
  }

  if (action.kind === 'train') {
    const def = UNITS[action.type];
    if (player.gold >= def.cost && hasBarracks(fromPlayer)) {
      const unit = spawnUnit(fromPlayer, action.type);
      if (unit) {
        player.gold -= def.cost;
        addLog(`${pLabel(fromPlayer)} Trained ${def.emoji} ${def.name}`);
      }
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
  net.roomCode = roomCode;
  net.isHost = true;
  net.myIndex = 0;

  showLobbyError('');
  document.getElementById('lobby-choices').classList.add('hidden');
  document.getElementById('host-waiting').classList.remove('hidden');
  document.getElementById('room-code-text').textContent = roomCode;
  document.getElementById('lobby-status').textContent = 'Creating room...';

  net.peer = new Peer('emojibattle-' + roomCode.toLowerCase());

  net.peer.on('open', () => {
    document.getElementById('lobby-status').textContent = 'Waiting for opponent...';
  });

  net.peer.on('connection', (conn) => {
    setupConnection(conn);
    conn.on('open', () => {
      document.getElementById('lobby-screen').classList.add('hidden');
      document.getElementById('game-screen').classList.remove('hidden');
      initGame('online');
      resizeCanvas();
      updateUI();
      if (!animFrameId) startGameLoop();
      startBroadcasting();
      netSend({ type: 'start' });
      setTimeout(() => broadcastState(), 300);
    });
  });

  net.peer.on('error', (err) => {
    if (err.type === 'unavailable-id') showLobbyError('Room code in use. Try again.');
    else showLobbyError('Error: ' + err.message);
  });
}

function joinGame(code) {
  net.roomCode = code.toUpperCase();
  net.isHost = false;
  net.myIndex = 1;

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
    conn.on('error', (err) => {
      showLobbyError('Could not connect: ' + err.message);
      resetJoinUI();
    });
    setTimeout(() => {
      if (!conn.open) {
        showLobbyError('Room not found. Check the code.');
        resetJoinUI();
        if (net.peer) { net.peer.destroy(); net.peer = null; }
      }
    }, 10000);
  });

  net.peer.on('error', (err) => {
    showLobbyError('Error: ' + err.message);
    resetJoinUI();
  });
}

function resetJoinUI() {
  document.getElementById('join-waiting').classList.add('hidden');
  document.getElementById('join-loader').classList.add('hidden');
  document.getElementById('join-connect-btn').disabled = false;
}

function showLobbyError(msg) {
  const el = document.getElementById('lobby-error');
  if (msg) { el.textContent = msg; el.classList.remove('hidden'); }
  else el.classList.add('hidden');
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

function cellSize() { return canvas.width / GRID_COLS; }

function drawGrid() {
  const cs = cellSize();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const x = c * cs, y = r * cs;
      const light = (r + c) % 2 === 0;
      if (c < DIVIDER_COL) {
        ctx.fillStyle = light ? 'rgba(30, 80, 200, 0.12)' : 'rgba(30, 80, 200, 0.06)';
      } else {
        ctx.fillStyle = light ? 'rgba(200, 40, 40, 0.12)' : 'rgba(200, 40, 40, 0.06)';
      }
      ctx.fillRect(x, y, cs, cs);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cs, cs);
    }
  }

  // Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(DIVIDER_COL * cs, 0);
  ctx.lineTo(DIVIDER_COL * cs, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Highlight valid placement
  if (game.selected && game.selected.kind === 'shop_building') {
    const pi = game.mode === 'online' ? net.myIndex : (game.mode === 'bot' ? 0 : game.selected.forPlayer || 0);
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (playerTerritory(pi, c) && !cellOccupied(r, c)) {
          ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
          ctx.fillRect(c * cs, r * cs, cs, cs);
        }
      }
    }
  }

  // Entities
  const fontSize = Math.floor(cs * 0.6);
  ctx.font = `${fontSize}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let p = 0; p < 2; p++) {
    game.players[p].buildings.forEach(b => {
      if (b.hp <= 0) return;
      ctx.fillText(BUILDINGS[b.type].emoji, b.col * cs + cs / 2, b.row * cs + cs / 2);
      drawHpBar(b.col * cs, b.row * cs + cs - 6, cs, 4, b.hp, b.maxHp, p);
    });

    game.players[p].units.forEach(u => {
      if (u.hp <= 0) return;
      ctx.fillText(UNITS[u.type].emoji, u.col * cs + cs / 2, u.row * cs + cs / 2);
      drawHpBar(u.col * cs, u.row * cs + cs - 6, cs, 4, u.hp, u.maxHp, p);
      ctx.fillStyle = p === 0 ? '#4488ff' : '#ff4444';
      ctx.beginPath();
      ctx.arc(u.col * cs + 6, u.row * cs + 6, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Effects
  for (let i = game.effects.length - 1; i >= 0; i--) {
    const e = game.effects[i];
    ctx.globalAlpha = e.ttl / 15;
    ctx.font = `${Math.floor(cs * 0.4)}px serif`;
    ctx.fillText(e.emoji, e.col * cs + cs / 2, e.row * cs + cs * 0.3);
    ctx.globalAlpha = 1;
    e.ttl--;
    if (e.ttl <= 0) game.effects.splice(i, 1);
  }
}

function drawHpBar(x, y, w, h, hp, maxHp, pi) {
  const pct = Math.max(0, hp / maxHp);
  const barW = w * 0.8, barX = x + (w - barW) / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(barX, y, barW, h);
  ctx.fillStyle = pct > 0.5 ? '#4f4' : pct > 0.25 ? '#ff4' : '#f44';
  ctx.fillRect(barX, y, barW * pct, h);
  ctx.strokeStyle = pi === 0 ? 'rgba(30,100,255,0.5)' : 'rgba(255,50,50,0.5)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(barX, y, barW, h);
}

function render() {
  drawGrid();
  tickGame();
  updateHUD();
  animFrameId = requestAnimationFrame(render);
}

function startGameLoop() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = null;
  render();
}

// ============================================================
// UI
// ============================================================

function updateHUD() {
  if (!game) return;
  const p1 = game.players[0], p2 = game.players[1];
  document.getElementById('p1-gold').textContent = p1.gold;
  document.getElementById('p1-income').textContent = p1.income;
  document.getElementById('p2-gold').textContent = p2.gold;
  document.getElementById('p2-income').textContent = p2.income;

  // Timer
  const elapsed = Math.floor(gameTime());
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  document.getElementById('game-timer').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

  // Next income countdown
  const nextIn = Math.max(0, Math.ceil(INCOME_INTERVAL - (gameTime() - game.lastIncome)));
  document.getElementById('next-income').textContent = nextIn;

  // Labels
  if (game.mode === 'bot') {
    document.getElementById('p1-label').textContent = '🔵 You';
    document.getElementById('p2-label').textContent = '🤖 Bot';
  } else if (game.mode === 'online') {
    document.getElementById('p1-label').innerHTML = net.myIndex === 0
      ? '🔵 You <span class="you-tag">YOU</span>' : '🔵 Opponent';
    document.getElementById('p2-label').innerHTML = net.myIndex === 1
      ? '🔴 You <span class="you-tag">YOU</span>' : '🔴 Opponent';
  } else {
    document.getElementById('p1-label').textContent = '🔵 Player 1';
    document.getElementById('p2-label').textContent = '🔴 Player 2';
  }

  updateLog();
}

function updateUI() {
  updateHUD();
  buildShop();
}

function myPlayerIndex() {
  if (game.mode === 'online') return net.myIndex;
  if (game.mode === 'bot') return 0;
  return null; // PvP local — handled per click
}

function buildShop() {
  const container = document.getElementById('shop-items');
  container.innerHTML = '';

  // In PvP local, show both sides. In bot/online, show only your side.
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
      el.innerHTML = `
        <span class="shop-emoji">${def.emoji}</span>
        <span class="shop-name">${def.name}</span>
        <span class="shop-cost">💰 ${def.cost}</span>
      `;
      if (canAfford) {
        el.addEventListener('click', () => selectShopItem('shop_building', key, playerIdx));
      }
      container.appendChild(el);
    }

    const sep = document.createElement('div');
    sep.style.cssText = 'width:2px;background:rgba(255,255,255,0.15);align-self:stretch;margin:0 0.3rem;';
    container.appendChild(sep);

    const canTrain = hasBarracks(playerIdx);
    for (const [key, def] of Object.entries(UNITS)) {
      const canAfford = player.gold >= def.cost;
      const disabled = !canAfford || !canTrain;
      const el = document.createElement('div');
      el.className = 'shop-item' + (disabled ? ' disabled' : '');
      el.innerHTML = `
        <span class="shop-emoji">${def.emoji}</span>
        <span class="shop-name">${def.name}${!canTrain ? ' (⚔️)' : ''}</span>
        <span class="shop-cost">💰 ${def.cost}</span>
      `;
      if (!disabled) {
        el.addEventListener('click', () => selectShopItem('shop_unit', key, playerIdx));
      }
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
    game.selected = null;
    updateSelectedInfo();
    return;
  }

  game.selected = { kind, type, forPlayer: playerIdx };
  updateSelectedInfo();

  if (kind === 'shop_unit') {
    const player = game.players[playerIdx];
    const def = UNITS[type];

    if (game.mode === 'online' && !net.isHost) {
      netSend({ type: 'action', action: { kind: 'train', type } });
    } else {
      const unit = spawnUnit(playerIdx, type);
      if (unit) {
        player.gold -= def.cost;
        addLog(`${pLabel(playerIdx)} Trained ${def.emoji}`);
        if (game.mode === 'online') broadcastState();
      } else {
        addLog('No space near castle!');
      }
    }

    game.selected = null;
    buildShop();
    updateSelectedInfo();
  }
}

function updateSelectedInfo() {
  const info = document.getElementById('selected-info');
  if (!game.selected || game.selected.kind === 'shop_unit') {
    info.classList.add('hidden');
    return;
  }
  info.classList.remove('hidden');
  const def = BUILDINGS[game.selected.type];
  document.getElementById('selected-name').textContent = `${def.emoji} ${def.name}`;
  document.getElementById('selected-desc').textContent = def.desc + ' — Click your territory to place.';
}

function updateLog() {
  const el = document.getElementById('log-entries');
  if (game) el.innerHTML = game.log.slice(0, 3).map(l => `<span class="log-entry">${l}</span>`).join('');
}

// ============================================================
// INPUT
// ============================================================

canvas.addEventListener('click', (e) => {
  if (!game || game.phase !== 'play') return;

  const rect = canvas.getBoundingClientRect();
  const cs = cellSize();
  const col = Math.floor((e.clientX - rect.left) / cs);
  const row = Math.floor((e.clientY - rect.top) / cs);
  if (!inBounds(row, col)) return;

  if (game.selected && game.selected.kind === 'shop_building') {
    const pi = game.selected.forPlayer;
    const player = game.players[pi];
    const type = game.selected.type;
    const def = BUILDINGS[type];

    if (!playerTerritory(pi, col)) { addLog("Can't build on enemy territory!"); return; }
    if (cellOccupied(row, col)) { addLog('Cell is occupied!'); return; }
    if (player.gold < def.cost) { addLog('Not enough gold!'); return; }

    if (game.mode === 'online' && !net.isHost) {
      netSend({ type: 'action', action: { kind: 'build', type, row, col } });
    } else {
      placeBuilding(pi, type, row, col);
      player.gold -= def.cost;
      addLog(`${pLabel(pi)} Built ${def.emoji} ${def.name}`);
      if (game.mode === 'online') broadcastState();
    }

    game.selected = null;
    buildShop();
    updateSelectedInfo();
    return;
  }

  // Click on unit for info
  const cell = game.grid[row][col];
  if (cell && cell.entityType === 'unit') {
    const u = game.players[cell.player].units[cell.entityIdx];
    const def = UNITS[u.type];
    addLog(`${def.emoji} ${def.name} — HP: ${u.hp}/${u.maxHp}, ATK: ${u.attack}`);
  }
  if (cell && cell.entityType === 'building') {
    const b = game.players[cell.player].buildings[cell.entityIdx];
    const def = BUILDINGS[b.type];
    addLog(`${def.emoji} ${def.name} — HP: ${b.hp}/${b.maxHp}`);
  }
});

document.getElementById('cancel-btn').addEventListener('click', () => {
  if (game) { game.selected = null; updateSelectedInfo(); }
});

// ============================================================
// SCREENS
// ============================================================

function showWinScreen() {
  document.getElementById('game-screen').classList.add('hidden');
  document.getElementById('win-screen').classList.remove('hidden');
  stopBroadcasting();
  const w = game.winner;
  let msg;
  if (game.mode === 'bot') msg = w === 0 ? '🎉 You Win!' : '🤖 Bot Wins!';
  else if (game.mode === 'online') msg = w === net.myIndex ? '🎉 You Win!' : '😔 You Lost!';
  else msg = `${w === 0 ? '🔵' : '🔴'} Player ${w + 1} Wins! 🎉`;
  document.getElementById('win-message').textContent = msg;
}

function startNewGame(mode, difficulty) {
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('lobby-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  initGame(mode, difficulty || 'medium');
  resizeCanvas();
  updateUI();
  startGameLoop();
}

function backToTitle() {
  cleanupNet();
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  document.getElementById('win-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.add('hidden');
  document.getElementById('lobby-screen').classList.add('hidden');
  document.getElementById('title-screen').classList.remove('hidden');
  document.getElementById('difficulty-select').classList.add('hidden');
}

// --- Event Listeners ---
document.getElementById('start-bot-btn').addEventListener('click', () => {
  document.getElementById('difficulty-select').classList.remove('hidden');
});

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

document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => startNewGame('bot', btn.dataset.diff));
});

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

document.getElementById('join-code-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('join-connect-btn').click();
});

document.getElementById('copy-code-btn').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('room-code-text').textContent).then(() => {
    const btn = document.getElementById('copy-code-btn');
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 2000);
  });
});

document.getElementById('lobby-back-btn').addEventListener('click', () => { cleanupNet(); backToTitle(); });
document.getElementById('restart-btn').addEventListener('click', backToTitle);
window.addEventListener('resize', () => { if (game) resizeCanvas(); });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && game) {
    game.selected = null;
    updateSelectedInfo();
  }
});
